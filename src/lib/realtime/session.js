/**
 * Streams audio — the microphone or a decoded audio file — to the Nexara
 * realtime API (streaming.nexara.ru, protocol v1) and reports transcript
 * events as words are recognised. See docs.nexara.ru/realtime for the wire
 * protocol; the short version:
 *
 *   - `GET /v1/transcribe?encoding=…&sample_rate=…&delay_ms=…&diarize=…` with a
 *     WebSocket upgrade. Browsers cannot set headers on a WebSocket, so the
 *     API key travels as a subprotocol: `new WebSocket(url, ['nexara-key', key])`.
 *     The key is checked before the upgrade; a rejection (401/402/429) surfaces
 *     in the browser as an opaque `error` event with no status.
 *   - First server message is `{ type: 'session.created', session_id, … }`.
 *   - Client streams binary frames of raw int16 LE PCM at 16 kHz mono in
 *     ~80 ms chunks (static/pcm-worklet.js does the float -> int16 packing).
 *   - Server sends `{ type: 'transcript', text, words: [{ text, start, end,
 *     speaker? }], speaker? }` per group of finalised words. Text is NEVER
 *     revised; `start`/`end` are integer ms on the audio clock (80 ms grid).
 *   - End of audio: client sends `{ type: 'input_audio.end' }`; the server
 *     flushes the model's delay line, sends the remaining transcripts, then
 *     `{ type: 'session.ended', text, audio_duration_ms, billed_ms, … }` and
 *     closes with 1000. Just closing the socket loses the last `delay_ms`.
 *   - `{ type: 'error', code, message }` is followed by a close with a
 *     matching code (4003 session_full, 4008 idle_timeout, 4402
 *     insufficient_balance, 1012 service_restart, …). Everything finalised
 *     before an error close has already been delivered.
 *
 * A file source is decoded with the Web Audio API and *played* through the
 * same graph the microphone uses, at 1× speed, so the words arrive with the
 * same timing a live caller would see. Playback is muted by default; the gain
 * can be opened with `setMuted(false)` to listen along.
 */

import { env } from '$env/dynamic/public';

/** Host only — the path and query are appended in the constructor. */
export const REALTIME_URL = env.PUBLIC_REALTIME_URL ?? 'wss://streaming.nexara.ru';
export const WORKLET_URL = '/pcm-worklet.js';
export const SAMPLE_RATE = 16000;

const OPEN_TIMEOUT_MS = 10_000;
const HELLO_TIMEOUT_MS = 10_000;
/** Worklet chunks are posted from the render thread; give the last one a
 *  moment to land before `input_audio.end` when a file plays out naturally. */
const END_FLUSH_MS = 200;

/**
 * @typedef {'idle' | 'preparing' | 'connecting' | 'streaming' | 'finalizing' | 'done' | 'error'} SessionState
 * @typedef {{ text: string, start: number, end: number, speaker: number | null }} Word
 * @typedef {{ text: string, speaker: number | null, words: Word[] }} Transcript
 * @typedef {{ text: string, audio_duration_ms: number, billed_ms: number, channels_transcribed: number }} Ended
 * @typedef {{ kind: 'mic' } | { kind: 'file', file: File }} Source
 */

/** A session failure with a machine-readable `reason` (a protocol close
 *  reason such as `session_full`, or a client one: `mic_denied`, `mic_missing`,
 *  `decode_failed`, `connect_failed`, `connection_lost`). */
export class RealtimeSessionError extends Error {
	/** @param {string} reason @param {string} [message] @param {number | null} [code] */
	constructor(reason, message = reason, code = null) {
		super(message);
		this.name = 'RealtimeSessionError';
		this.reason = reason;
		this.code = code;
	}
}

export class RealtimeSession {
	/**
	 * @param {{
	 *   apiKey: string,
	 *   delayMs: number,
	 *   diarize?: boolean,
	 *   url?: string,
	 *   onTranscript?: (event: Transcript) => void,
	 *   onEnded?: (ended: Ended) => void,
	 *   onState?: (state: SessionState) => void,
	 *   onError?: (err: RealtimeSessionError) => void
	 * }} options
	 */
	constructor({
		apiKey,
		delayMs,
		diarize = false,
		url = REALTIME_URL,
		onTranscript,
		onEnded,
		onState,
		onError
	}) {
		const params = new URLSearchParams({
			encoding: 'pcm_s16le',
			sample_rate: String(SAMPLE_RATE),
			channels: '1',
			delay_ms: String(delayMs),
			diarize: diarize ? 'true' : 'false',
			client_id: 'nexara-dashboard'
		});
		this.url = `${url.replace(/\/+$/, '')}/v1/transcribe?${params}`;
		this.apiKey = apiKey;
		this.onTranscript = onTranscript;
		this.onEnded = onEnded;
		this.onState = onState;
		this.onError = onError;

		/** @type {SessionState} */
		this.state = 'idle';
		/** From `session.created` (for correlating with server logs). */
		this.sessionId = null;
		/** Decoded length in seconds for a file source; null for the mic. */
		this.duration = null;
		/** The `session.ended` summary once it has arrived. */
		this.ended = null;

		/** @type {WebSocket | null} */
		this.ws = null;
		/** @type {AudioContext | null} */
		this.audioContext = null;
		/** @type {AudioWorkletNode | null} */
		this.workletNode = null;
		/** @type {AnalyserNode | null} */
		this.analyser = null;
		/** Mic: the MediaStreamSource. File: the AudioBufferSourceNode. */
		this.source = null;
		/** @type {MediaStream | null} */
		this.stream = null;
		/** @type {AudioBuffer | null} */
		this.buffer = null;
		/** File only: the gain between the buffer source and the speakers. */
		this.gain = null;
		/** `audioContext.currentTime` when audio started flowing. */
		this._startedAt = 0;
		/** Frozen position once audio stopped, so the UI doesn't keep counting. */
		this._stoppedAt = null;
		/** False once `input_audio.end` has been sent: late worklet chunks
		 *  must not follow it. */
		this._sendingAudio = false;
		/** Human message from an `error` frame, reported on the close that follows. */
		this._pendingError = null;
	}

	/** Prepare the audio source, open the socket, wait for `session.created`
	 *  and start streaming. Resolves once streaming (or after reporting an error). */
	async start(/** @type {Source} */ source) {
		if (this.state !== 'idle') return;
		this._setState('preparing');

		try {
			// 1) Audio first — permission prompt / file decode can take a while,
			// and the server's 30 s idle timer starts at the upgrade.
			this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
			await this.audioContext.audioWorklet.addModule(WORKLET_URL);
			if (source.kind === 'mic') {
				await this._prepareMic();
			} else {
				await this._prepareFile(source.file);
			}

			// 2) WebSocket + session.created handshake.
			this._setState('connecting');
			this.ws = new WebSocket(this.url, ['nexara-key', this.apiKey]);
			this.ws.binaryType = 'arraybuffer';
			await this._waitForOpen();
			const hello = await this._waitForHello();
			if (hello?.type === 'error') {
				throw new RealtimeSessionError(hello.code || 'connect_failed', hello.message);
			}
			if (hello?.type !== 'session.created') {
				throw new RealtimeSessionError('connect_failed', 'unexpected first message');
			}
			this.sessionId = hello.session_id ?? null;

			// 3) Wire the graph: source -> worklet (chunks to the socket) and
			// source -> analyser (waveform). Mono is forced at the worklet input
			// so a stereo file is downmixed by the graph.
			this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-worklet', {
				channelCount: 1,
				channelCountMode: 'explicit',
				channelInterpretation: 'speakers'
			});
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 1024;
			this.analyser.smoothingTimeConstant = 0.6;

			this._sendingAudio = true;
			this.workletNode.port.onmessage = (event) => {
				if (this._sendingAudio && this.ws?.readyState === WebSocket.OPEN) {
					this.ws.send(event.data);
				}
			};
			this.source.connect(this.workletNode);
			this.source.connect(this.analyser);

			this.ws.addEventListener('message', this._onMessage);
			this.ws.addEventListener('close', this._onClose);

			// 4) Go. A suspended context (autoplay policy) would silently send
			// nothing, so resume explicitly — start() is called from a click.
			await this.audioContext.resume();
			this._startedAt = this.audioContext.currentTime;
			if (this.buffer) {
				this.source.onended = () => {
					// Played out: finish the same way Stop does, after the last
					// worklet chunk has had time to arrive.
					if (this.state === 'streaming') setTimeout(() => this.stop(), END_FLUSH_MS);
				};
				this.source.start();
			}
			this._setState('streaming');
		} catch (err) {
			this._cleanup();
			this._setState('error');
			this.onError?.(this._normalizeError(err));
		}
	}

	async _prepareMic() {
		this.stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true
			}
		});
		this.source = this.audioContext.createMediaStreamSource(this.stream);
	}

	async _prepareFile(/** @type {File} */ file) {
		const bytes = await file.arrayBuffer();
		try {
			// Decoded at the context rate (16 kHz), channels preserved.
			this.buffer = await this.audioContext.decodeAudioData(bytes);
		} catch {
			throw new RealtimeSessionError('decode_failed');
		}
		this.duration = this.buffer.duration;
		this.source = this.audioContext.createBufferSource();
		this.source.buffer = this.buffer;
		// Muted by default; setMuted(false) opens it so the user can listen along.
		this.gain = this.audioContext.createGain();
		this.gain.gain.value = 0;
		this.source.connect(this.gain);
		this.gain.connect(this.audioContext.destination);
	}

	/**
	 * Stop sending audio and tell the server we're done. The server flushes its
	 * delay line, sends the last transcripts, then `session.ended`. Works the
	 * same for the mic and a file (a file simply stops playing where it is).
	 */
	stop() {
		if (this.state !== 'streaming') return;
		this._setState('finalizing');
		this._sendingAudio = false;
		this._stoppedAt = this.position;

		if (this.ws?.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(JSON.stringify({ type: 'input_audio.end' }));
			} catch {
				/* socket may have died — the close handler reports it */
			}
		}
		this._stopAudio();
	}

	/** Tear down everything (used on unmount or hard cancel). */
	destroy() {
		this._cleanup();
	}

	/** File only: open/close the gain to the speakers. */
	setMuted(/** @type {boolean} */ muted) {
		if (!this.gain || !this.audioContext) return;
		// A short ramp avoids a click when toggling mid-word.
		this.gain.gain.setTargetAtTime(muted ? 0 : 1, this.audioContext.currentTime, 0.02);
	}

	/** Returns the live AnalyserNode for waveform rendering, if any. */
	getAnalyser() {
		return this.analyser;
	}

	/** Seconds of audio sent so far (the audio clock the word timestamps use). */
	get position() {
		if (this._stoppedAt !== null) return this._stoppedAt;
		if (!this.audioContext || !this._startedAt) return 0;
		const p = this.audioContext.currentTime - this._startedAt;
		return this.duration !== null ? Math.min(this.duration, p) : p;
	}

	// ─── internals ────────────────────────────────────────────

	_onMessage = (/** @type {MessageEvent} */ event) => {
		if (typeof event.data !== 'string') return;
		let payload;
		try {
			payload = JSON.parse(event.data);
		} catch {
			return;
		}
		switch (payload?.type) {
			case 'transcript': {
				const text = typeof payload.text === 'string' ? payload.text : '';
				if (!text) return;
				const words = Array.isArray(payload.words)
					? payload.words.map((w) => ({
							text: String(w?.text ?? ''),
							start: Number(w?.start) || 0,
							end: Number(w?.end) || 0,
							speaker: Number.isInteger(w?.speaker) ? w.speaker : null
						}))
					: [];
				this.onTranscript?.({
					text,
					speaker: Number.isInteger(payload.speaker) ? payload.speaker : null,
					words
				});
				break;
			}
			case 'session.ended': {
				this.ended = {
					text: typeof payload.text === 'string' ? payload.text : '',
					audio_duration_ms: Number(payload.audio_duration_ms) || 0,
					billed_ms: Number(payload.billed_ms) || 0,
					channels_transcribed: Number(payload.channels_transcribed) || 1
				};
				this.onEnded?.(this.ended);
				this._setState('done');
				this._closeWs();
				break;
			}
			case 'error':
				// The close frame follows; act there, once the socket is down.
				this._pendingError = new RealtimeSessionError(
					payload.code || 'connection_lost',
					payload.message || undefined
				);
				break;
			// session.created / session.updated / unknown: ignore
		}
	};

	_onClose = (/** @type {CloseEvent} */ event) => {
		const state = this.state;
		this._cleanup();
		if (state === 'done' || state === 'error') return;
		let err = this._pendingError;
		if (!err && event && event.code !== 1000 && event.code !== 1005) {
			err = new RealtimeSessionError(event.reason || 'connection_lost', undefined, event.code);
		}
		if (err) {
			if (err.code === null && event) err.code = event.code;
			this._setState('error');
			this.onError?.(err);
			return;
		}
		if (state === 'finalizing') {
			// Closed cleanly before session.ended: what streamed is still the
			// transcript — finish normally rather than show an error.
			this._setState('done');
			return;
		}
		this._setState('error');
		this.onError?.(new RealtimeSessionError('connection_lost'));
	};

	_closeWs() {
		try {
			this.ws?.close();
		} catch {
			/* noop */
		}
	}

	_waitForOpen() {
		return new Promise((resolve, reject) => {
			const ws = this.ws;
			if (!ws) return reject(new RealtimeSessionError('connect_failed'));
			const timer = setTimeout(() => {
				cleanup();
				reject(new RealtimeSessionError('connect_failed', 'timeout'));
			}, OPEN_TIMEOUT_MS);
			const onOpen = () => {
				cleanup();
				resolve(undefined);
			};
			const onError = () => {
				cleanup();
				// A rejected handshake (bad key, no balance, session limit)
				// lands here: browsers hide the HTTP status.
				reject(new RealtimeSessionError('connect_failed'));
			};
			const cleanup = () => {
				clearTimeout(timer);
				ws.removeEventListener('open', onOpen);
				ws.removeEventListener('error', onError);
			};
			ws.addEventListener('open', onOpen);
			ws.addEventListener('error', onError);
		});
	}

	_waitForHello() {
		return new Promise((resolve, reject) => {
			const ws = this.ws;
			if (!ws) return reject(new RealtimeSessionError('connect_failed'));
			const timer = setTimeout(() => {
				cleanup();
				reject(new RealtimeSessionError('connect_failed', 'no session.created'));
			}, HELLO_TIMEOUT_MS);
			const onMsg = (/** @type {MessageEvent} */ event) => {
				cleanup();
				if (typeof event.data !== 'string') return resolve(null);
				try {
					resolve(JSON.parse(event.data));
				} catch {
					resolve(null);
				}
			};
			const onClose = (/** @type {CloseEvent} */ event) => {
				cleanup();
				reject(new RealtimeSessionError(event.reason || 'connect_failed', undefined, event.code));
			};
			const cleanup = () => {
				clearTimeout(timer);
				ws.removeEventListener('message', onMsg);
				ws.removeEventListener('close', onClose);
			};
			ws.addEventListener('message', onMsg);
			ws.addEventListener('close', onClose);
		});
	}

	_stopAudio() {
		this._sendingAudio = false;
		if (this.source && this.buffer) {
			this.source.onended = null;
			try {
				this.source.stop();
			} catch {
				/* not started */
			}
		}
		for (const node of [this.workletNode, this.source, this.analyser, this.gain]) {
			try {
				node?.disconnect();
			} catch {
				/* noop */
			}
		}
		try {
			this.stream?.getTracks().forEach((t) => t.stop());
		} catch {
			/* noop */
		}
		try {
			this.audioContext?.close();
		} catch {
			/* noop */
		}
		this.workletNode = null;
		this.source = null;
		this.analyser = null;
		this.gain = null;
		this.stream = null;
		this.buffer = null;
		this.audioContext = null;
	}

	_cleanup() {
		if (this._stoppedAt === null && this._startedAt) this._stoppedAt = this.position;
		this._stopAudio();
		if (this.ws) {
			this.ws.removeEventListener('message', this._onMessage);
			this.ws.removeEventListener('close', this._onClose);
			this._closeWs();
			this.ws = null;
		}
	}

	_normalizeError(err) {
		if (err instanceof RealtimeSessionError) return err;
		if (err && typeof err === 'object' && 'name' in err) {
			if (err.name === 'NotAllowedError') return new RealtimeSessionError('mic_denied');
			if (err.name === 'NotFoundError') return new RealtimeSessionError('mic_missing');
		}
		return new RealtimeSessionError('connect_failed', String(err?.message ?? err ?? ''));
	}

	_setState(/** @type {SessionState} */ next) {
		this.state = next;
		this.onState?.(next);
	}
}
