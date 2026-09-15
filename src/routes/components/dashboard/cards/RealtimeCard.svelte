<script>
	import { onDestroy } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { RealtimeSession } from '$lib/realtime/session.js';
	import RealtimeWaveform from './RealtimeWaveform.svelte';
	import {
		Mic,
		FileAudio,
		Square,
		Volume2,
		VolumeX,
		Copy,
		Download,
		Check,
		ChevronDown,
		AlertTriangle,
		X
	} from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Same palette as the batch playground so a speaker looks the same on both pages.
	const SPEAKER_COLORS = [
		{ fg: '#a78bfa', bg: 'rgba(167, 139, 250, 0.14)' },
		{ fg: '#f0a868', bg: 'rgba(240, 168, 104, 0.14)' },
		{ fg: '#5ecfd0', bg: 'rgba(94, 207, 208, 0.14)' },
		{ fg: '#f28ab2', bg: 'rgba(242, 138, 178, 0.14)' },
		{ fg: '#b6d97a', bg: 'rgba(182, 217, 122, 0.14)' },
		{ fg: '#8fa8ff', bg: 'rgba(143, 168, 255, 0.14)' }
	];

	const LATENCIES = [80, 160, 480, 960];
	const DIARIZE_LATENCY = 960;
	const DEFAULT_LATENCY = 480;
	const ACCEPT = '.mp3, .m4a, .mp4, .wav, .ogg, .oga, .opus, .aac, .flac, .webm, .mov';
	const MAX_FILE_SIZE_MB = 100;

	// Waveform: a rolling window of recent levels for the mic, the whole file
	// (precomputed) with a playhead for a file.
	const NUM_BARS = 96;
	const BAR_INTERVAL_MS = 100;

	// Words are final and never revised, so segments only ever grow: a new one
	// starts on a speaker change, after a pause, or once a long run reaches a
	// sentence end. Timestamps are on the audio clock (ms since the first sample).
	const GAP_MS = 1500;
	const MAX_SEGMENT_MS = 20_000;

	// ── setup ────────────────────────────────────────────────
	let selectedApiKeyId = $state(null);
	/** @type {'mic' | 'file'} */
	let sourceKind = $state('mic');
	/** @type {File | null} */
	let selectedFile = $state(null);
	let fileError = $state('');
	/** @type {HTMLInputElement | undefined} */
	let fileInput = $state();
	let delayMs = $state(DEFAULT_LATENCY);
	let diarize = $state(false);
	// Diarization pins the delay to 960 ms; remember what the user had so
	// unticking the box gives it back.
	let delayBeforeDiarize = DEFAULT_LATENCY;

	const apiKeys = $derived($dashboardStore.apiKeys ?? []);
	const hasValidApiKey = $derived(apiKeys.length > 0);
	const selectedApiKey = $derived(
		apiKeys.find((k) => k.id === selectedApiKeyId)?.api_key || $dashboardStore.apiKey || null
	);
	$effect(() => {
		if (apiKeys.length > 0 && !selectedApiKeyId) selectedApiKeyId = apiKeys[0].id;
	});
	function onDiarizeChange(e) {
		diarize = e.currentTarget.checked;
		if (diarize) {
			delayBeforeDiarize = delayMs;
			delayMs = DIARIZE_LATENCY;
		} else {
			delayMs = delayBeforeDiarize;
		}
	}
	const canStart = $derived(!!selectedApiKey && (sourceKind === 'mic' || !!selectedFile));

	// ── session ──────────────────────────────────────────────
	/** 'setup' before a session; otherwise the session's own state. */
	let phase = $state('setup');
	/** @type {RealtimeSession | null} */
	let session = null;
	/** @type {Array<{ id: number, speaker: number | null, start: number, end: number, lastStart: number, words: string[] }>} */
	let segments = $state([]);
	let nextSegmentId = 0;
	/** Raw `text` of every transcript event, in order (leading spaces included). */
	let eventTexts = $state([]);
	/** Decoded file length in seconds; null for the mic. */
	let duration = $state(null);
	let wordCount = $state(0);
	let ended = $state(null);
	/** @type {import('$lib/realtime/session.js').RealtimeSessionError | null} */
	let sessionError = $state(null);
	let elapsedSeconds = $state(0);
	let muted = $state(true);
	let copied = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let listEl = $state();

	let bars = $state(Array(NUM_BARS).fill(0));
	/** @type {number | null} */
	let progress = $state(null);
	let level = $state(0);
	/** @type {number | undefined} */
	let raf;

	const isFile = $derived(sourceKind === 'file');
	const isLive = $derived(phase === 'streaming' || phase === 'finalizing');
	const isBusy = $derived(phase === 'preparing' || phase === 'connecting' || isLive);
	const isOver = $derived(phase === 'done' || phase === 'error');
	const fullText = $derived.by(() => {
		const streamed = eventTexts.join('').trim();
		const final = ended?.text;
		return typeof final === 'string' && final.length > streamed.length ? final.trim() : streamed;
	});
	const speakerCount = $derived(
		new Set(segments.map((s) => s.speaker).filter((s) => s !== null)).size
	);

	function fmtMSS(totalSeconds) {
		const s = Math.max(0, Math.floor(totalSeconds));
		const mm = String(Math.floor(s / 60)).padStart(2, '0');
		const ss = String(s % 60).padStart(2, '0');
		return `${mm}:${ss}`;
	}

	function speakerColor(speaker) {
		return SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];
	}

	function latencyHint(ms) {
		switch (ms) {
			case 80:
				return m.db_realtime_latency_fastest();
			case 160:
				return m.db_realtime_latency_fast();
			case 480:
				return m.db_realtime_latency_balanced();
			default:
				return m.db_realtime_latency_accurate();
		}
	}

	function statusLabel() {
		switch (phase) {
			case 'preparing':
				return m.db_realtime_status_preparing();
			case 'connecting':
				return m.db_realtime_status_connecting();
			case 'streaming':
				return m.db_realtime_status_live();
			case 'finalizing':
				return m.db_realtime_status_finalizing();
			case 'done':
				return m.db_realtime_status_done();
			default:
				return '';
		}
	}

	function errorMessage(err) {
		switch (err?.reason) {
			case 'mic_denied':
				return m.db_realtime_err_mic_denied();
			case 'mic_missing':
				return m.db_realtime_err_mic_missing();
			case 'decode_failed':
				return m.db_realtime_err_decode();
			case 'connect_failed':
			case 'unauthorized':
				return m.db_realtime_err_connect();
			case 'session_full':
				return m.db_realtime_err_session_full();
			case 'insufficient_balance':
				return m.db_realtime_err_insufficient_balance();
			case 'idle_timeout':
				return m.db_realtime_err_idle_timeout();
			case 'audio_backlog':
				return m.db_realtime_err_audio_backlog();
			case 'service_restart':
			case 'session_expired':
			case 'billing_unavailable':
				return m.db_realtime_err_restart();
			case 'invalid_config':
			case 'invalid_message':
				return m.db_realtime_err_invalid_config();
			default:
				return err?.message || m.db_realtime_err_generic();
		}
	}

	// ── file picking ─────────────────────────────────────────
	function pickFile(file) {
		fileError = '';
		if (!file) return;
		if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
			fileError = m.db_realtime_file_too_large({ mb: MAX_FILE_SIZE_MB });
			return;
		}
		selectedFile = file;
	}

	function onFileChange(e) {
		pickFile(e.currentTarget.files?.[0] ?? null);
		e.currentTarget.value = '';
	}

	function clearFile() {
		selectedFile = null;
		fileError = '';
	}

	// ── transcript assembly ──────────────────────────────────
	function pushTranscript(event) {
		eventTexts.push(event.text);
		for (const w of event.words) {
			const speaker = event.speaker ?? w.speaker ?? null;
			const cur = segments[segments.length - 1];
			// `null` = the diarizer could not tell (short words after a pause),
			// not a distinct speaker: it continues the current segment.
			const speakerChanged =
				cur && speaker !== null && cur.speaker !== null && cur.speaker !== speaker;
			const paused = cur && w.start - cur.lastStart >= GAP_MS;
			const endsSentence = cur && /[.!?…]$/.test(cur.words[cur.words.length - 1]);
			const tooLong = cur && endsSentence && w.start - cur.start >= MAX_SEGMENT_MS;
			if (!cur || speakerChanged || paused || tooLong) {
				segments.push({
					id: nextSegmentId++,
					speaker,
					start: w.start,
					end: w.end,
					lastStart: w.start,
					words: [w.text]
				});
			} else {
				cur.words.push(w.text);
				cur.end = w.end;
				cur.lastStart = w.start;
				// Back-fill a segment that started before the diarizer had a label.
				if (cur.speaker === null && speaker !== null) cur.speaker = speaker;
			}
			wordCount++;
		}
	}

	// ── waveform / clock loop ────────────────────────────────
	function fileBars(buffer) {
		const out = new Array(NUM_BARS).fill(0);
		const len = buffer.length;
		const per = Math.max(1, Math.floor(len / NUM_BARS));
		const channels = [];
		for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
		let max = 0;
		for (let i = 0; i < NUM_BARS; i++) {
			const from = i * per;
			const to = Math.min(len, from + per);
			let sumSq = 0;
			// Every 4th sample is plenty for a 96-bar overview and keeps long files quick.
			for (let j = from; j < to; j += 4) {
				let s = 0;
				for (const ch of channels) s += ch[j];
				s /= channels.length;
				sumSq += s * s;
			}
			const rms = Math.sqrt(sumSq / Math.max(1, (to - from) / 4));
			out[i] = rms;
			if (rms > max) max = rms;
		}
		return out.map((v) => (max > 0 ? Math.max(0.04, v / max) : 0.04));
	}

	function startLoop() {
		cancelLoop();
		let peak = 0;
		let lastBarAt = performance.now();
		const tick = () => {
			if (!session) return;
			const analyser = session.getAnalyser();
			let rms = 0;
			if (analyser) {
				const data = new Uint8Array(analyser.fftSize);
				analyser.getByteTimeDomainData(data);
				let sumSq = 0;
				for (let i = 0; i < data.length; i++) {
					const n = (data[i] - 128) / 128;
					sumSq += n * n;
				}
				rms = Math.min(1, Math.sqrt(sumSq / data.length) * 2.6);
			}
			level = rms;
			const pos = session.position;
			elapsedSeconds = Math.floor(pos);
			if (session.duration) {
				progress = Math.min(1, pos / session.duration);
			} else {
				if (rms > peak) peak = rms;
				const now = performance.now();
				if (now - lastBarAt >= BAR_INTERVAL_MS) {
					bars = [...bars.slice(1), peak];
					peak = 0;
					lastBarAt = now;
				}
			}
			// The analyser disappears when audio stops; one last frame then rest.
			raf = analyser ? requestAnimationFrame(tick) : undefined;
		};
		tick();
	}

	function cancelLoop() {
		if (raf !== undefined) cancelAnimationFrame(raf);
		raf = undefined;
	}

	// ── lifecycle ────────────────────────────────────────────
	async function startSession() {
		if (!canStart || isBusy) return;
		segments = [];
		nextSegmentId = 0;
		eventTexts = [];
		wordCount = 0;
		ended = null;
		duration = null;
		sessionError = null;
		elapsedSeconds = 0;
		muted = true;
		copied = false;
		level = 0;
		bars = Array(NUM_BARS).fill(0);
		progress = isFile ? 0 : null;
		phase = 'preparing';

		session = new RealtimeSession({
			apiKey: selectedApiKey,
			delayMs,
			diarize,
			onTranscript: pushTranscript,
			onEnded: (e) => {
				ended = e;
				// The session was billed: refresh the balance in the sidebar cards.
				dashboardStore.loadDashboardData();
			},
			onState: (s) => {
				phase = s;
				if (s === 'streaming') {
					duration = session?.duration ?? null;
					if (session?.buffer) bars = fileBars(session.buffer);
					startLoop();
				}
				if (s === 'done' || s === 'error') {
					if (session?.duration) progress = Math.min(1, session.position / session.duration);
					level = 0;
				}
			},
			onError: (err) => {
				sessionError = err;
				phase = 'error';
				cancelLoop();
			}
		});
		await session.start(isFile ? { kind: 'file', file: selectedFile } : { kind: 'mic' });
	}

	function stopSession() {
		session?.stop();
	}

	function toggleMute() {
		muted = !muted;
		session?.setMuted(muted);
	}

	function resetSession() {
		session?.destroy();
		session = null;
		cancelLoop();
		phase = 'setup';
	}

	async function copyText() {
		try {
			await navigator.clipboard.writeText(fullText);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (e) {
			console.error('copy failed', e);
		}
	}

	function downloadText() {
		const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const base = selectedFile && isFile ? selectedFile.name.replace(/\.[^.]+$/, '') : 'realtime';
		a.href = url;
		a.download = `${base}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Keep the newest words in view as they stream in.
	$effect(() => {
		segments.length;
		wordCount;
		if (listEl && isLive) listEl.scrollTop = listEl.scrollHeight;
	});

	onDestroy(() => {
		session?.destroy();
		session = null;
		cancelLoop();
	});
</script>

<div class="realtime-card">
	<div class="top-row">
		<p class="card-title">{m.db_realtime_title()}</p>
		{#if isOver && fullText}
			<div class="action-buttons">
				<button
					class="action-btn"
					title={m.db_transcribe_download_txt_title()}
					onclick={downloadText}
				>
					<Download size="16" /> TXT
				</button>
				<button class="action-btn" title={m.db_transcribe_copy_title()} onclick={copyText}>
					{#if copied}<Check size="16" /> {m.db_transcribe_copied()}{:else}<Copy size="16" />
						{m.db_transcribe_copy()}{/if}
				</button>
			</div>
		{/if}
	</div>

	{#if !hasValidApiKey}
		<div class="api-key-required">
			<AlertTriangle size={32} color="#aaa" />
			<p>{m.db_realtime_api_key_needed()}</p>
			<p>{m.db_transcribe_check_api_key()}</p>
		</div>
	{:else if phase === 'setup'}
		<!-- ── Setup ─────────────────────────────────────────── -->
		<div class="setup">
			{#if apiKeys.length > 1}
				<div class="setup-section">
					<label class="setup-label" for="rt-api-key">{m.db_transcribe_api_key_label()}</label>
					<div class="select-wrapper">
						<select id="rt-api-key" bind:value={selectedApiKeyId}>
							{#each apiKeys as key (key.id)}
								<option value={key.id}>
									{key.name || 'Unnamed'} ({key.api_key ? key.api_key.slice(0, 7) + '••••' : '...'})
								</option>
							{/each}
						</select>
						<ChevronDown size={16} class="select-icon" />
					</div>
				</div>
			{/if}

			<div class="setup-section">
				<div class="setup-label">{m.db_realtime_source_label()}</div>
				<div class="source-toggle" role="radiogroup" aria-label={m.db_realtime_source_label()}>
					<button
						type="button"
						class="source-btn"
						class:active={sourceKind === 'mic'}
						role="radio"
						aria-checked={sourceKind === 'mic'}
						onclick={() => (sourceKind = 'mic')}
					>
						<Mic size={18} />
						{m.db_realtime_source_mic()}
					</button>
					<button
						type="button"
						class="source-btn"
						class:active={sourceKind === 'file'}
						role="radio"
						aria-checked={sourceKind === 'file'}
						onclick={() => (sourceKind = 'file')}
					>
						<FileAudio size={18} />
						{m.db_realtime_source_file()}
					</button>
				</div>
				{#if sourceKind === 'file'}
					<input
						type="file"
						bind:this={fileInput}
						onchange={onFileChange}
						accept={ACCEPT}
						style="display: none;"
						aria-hidden="true"
					/>
					{#if selectedFile}
						<div class="file-row">
							<FileAudio size={20} color="#ccc" />
							<span class="file-name" title={selectedFile.name}>{selectedFile.name}</span>
							<span class="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
							<button
								class="clear-file-btn"
								onclick={clearFile}
								title={m.db_transcribe_cancel_selection_title()}
							>
								<X size="16" />
							</button>
						</div>
					{:else}
						<button type="button" class="select-file-btn" onclick={() => fileInput?.click()}>
							{m.db_realtime_choose_file()}
						</button>
					{/if}
					{#if fileError}
						<p class="setup-error">{fileError}</p>
					{/if}
					<p class="setup-hint">{m.db_realtime_file_hint()}</p>
				{/if}
			</div>

			<div class="setup-section">
				<div class="setup-label">{m.db_realtime_latency_label()}</div>
				<div class="latency-group" role="radiogroup" aria-label={m.db_realtime_latency_label()}>
					{#each LATENCIES as ms (ms)}
						<label class="latency-option" class:active={delayMs === ms} class:disabled={diarize}>
							<input
								type="radio"
								name="rt-latency"
								value={ms}
								bind:group={delayMs}
								disabled={diarize}
							/>
							<span class="latency-ms">{ms} ms</span>
							<span class="latency-hint">{latencyHint(ms)}</span>
						</label>
					{/each}
				</div>
				{#if diarize}
					<p class="setup-hint">{m.db_realtime_latency_pinned()}</p>
				{/if}
			</div>

			<label class="checkbox-label">
				<input type="checkbox" checked={diarize} onchange={onDiarizeChange} />
				{m.db_realtime_diarize()}
			</label>

			<button class="start-btn" onclick={startSession} disabled={!canStart}>
				{m.db_realtime_start()}
			</button>
		</div>
	{:else}
		<!-- ── Session ───────────────────────────────────────── -->
		<div class="stage">
			<div class="wave-row">
				<div class="wave-box" class:muted-wave={!isLive && !isOver}>
					<RealtimeWaveform {bars} {progress} {level} count={NUM_BARS} />
				</div>
				{#if isFile && isLive}
					<button
						class="round-btn"
						class:active={!muted}
						onclick={toggleMute}
						title={muted ? m.db_realtime_unmute() : m.db_realtime_mute()}
						aria-label={muted ? m.db_realtime_unmute() : m.db_realtime_mute()}
					>
						{#if muted}<VolumeX size={18} />{:else}<Volume2 size={18} />{/if}
					</button>
				{/if}
				{#if phase === 'streaming'}
					<button
						class="round-btn stop"
						onclick={stopSession}
						title={m.db_realtime_stop()}
						aria-label={m.db_realtime_stop()}
					>
						<Square size={16} fill="currentColor" />
					</button>
				{/if}
			</div>

			<div class="status-row">
				<span
					class="status-pill"
					class:live={phase === 'streaming'}
					class:done={phase === 'done'}
					class:error={phase === 'error'}
				>
					{#if phase === 'streaming'}<span class="live-dot"></span>{/if}
					{phase === 'error' ? m.db_realtime_status_error() : statusLabel()}
				</span>
				<span class="status-time">
					{fmtMSS(elapsedSeconds)}{#if duration}
						/ {fmtMSS(duration)}{/if}
				</span>
				{#if isFile && selectedFile}
					<span class="status-file" title={selectedFile.name}>{selectedFile.name}</span>
				{/if}
				<span class="status-meta">
					{delayMs} ms{#if diarize}
						· {m.db_realtime_diarize_short()}{/if}
				</span>
			</div>

			<div class="segment-list" bind:this={listEl}>
				{#each segments as segment (segment.id)}
					<div
						class="segment-card"
						class:has-speaker={segment.speaker !== null}
						style={segment.speaker !== null
							? `--speaker-fg: ${speakerColor(segment.speaker).fg}; --speaker-bg: ${speakerColor(segment.speaker).bg}`
							: ''}
					>
						<div class="segment-header">
							{#if segment.speaker !== null}
								<span class="speaker-chip">
									<span class="speaker-dot"></span>
									{m.db_transcribe_speaker_n({ n: segment.speaker })}
								</span>
							{/if}
							<span class="segment-time">
								{fmtMSS(segment.start / 1000)}<span class="separator">–</span>{fmtMSS(
									segment.end / 1000
								)}
							</span>
						</div>
						<p class="segment-text">{segment.words.join(' ')}</p>
					</div>
				{/each}
				{#if segments.length === 0}
					<p class="placeholder">
						{#if phase === 'streaming'}
							{isFile ? m.db_realtime_waiting_for_words() : m.db_realtime_waiting_for_speech()}
						{:else if phase === 'preparing' || phase === 'connecting'}
							{statusLabel()}
						{:else if phase === 'done'}
							{m.db_realtime_no_words()}
						{/if}
					</p>
				{/if}
			</div>

			{#if sessionError}
				<div class="session-error">
					<AlertTriangle size={18} color="#ff6b6b" />
					<span>{errorMessage(sessionError)}</span>
				</div>
			{/if}

			{#if ended}
				<div class="summary">
					<span
						><b>{m.db_realtime_summary_audio()}</b> {fmtMSS(ended.audio_duration_ms / 1000)}</span
					>
					<span><b>{m.db_realtime_summary_billed()}</b> {fmtMSS(ended.billed_ms / 1000)}</span>
					<span><b>{m.db_realtime_summary_words()}</b> {wordCount}</span>
					{#if diarize}
						<span><b>{m.db_realtime_summary_speakers()}</b> {speakerCount}</span>
					{/if}
				</div>
			{/if}

			{#if isOver}
				<div class="stage-actions">
					<button class="select-file-btn" onclick={resetSession}
						>{m.db_realtime_new_session()}</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.realtime-card {
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		color: #fff;
		min-height: 360px;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 10px;
	}

	.card-title {
		font-size: 16px;
		color: #777;
		margin: 0;
		flex-shrink: 0;
	}

	/* The global `* { color: var(--text) }` rule paints every <svg> — and every
	   <path> inside it, where `stroke: currentColor` is actually resolved —
	   white, so icons must explicitly follow their button's colour (dark on the
	   white Unmute button, red on Stop). Same for the currentColor dots. */
	.realtime-card button :global(svg),
	.realtime-card button :global(svg *),
	.speaker-dot,
	.live-dot {
		color: inherit;
	}

	.action-buttons {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: #bbb;
		cursor: pointer;
		font-size: 13px;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease;
		white-space: nowrap;
	}
	.action-btn:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.4);
		color: #eee;
	}

	.api-key-required {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 8px;
		color: #aaa;
	}
	.api-key-required p {
		margin: 0;
		font-size: 14px;
	}

	/* ── Setup ─────────────────────────────────────────────── */
	.setup {
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 520px;
		width: 100%;
		align-self: center;
		padding: 8px 0;
	}

	.setup-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.setup-label {
		font-size: 14px;
		color: #999;
		font-weight: 500;
	}

	.setup-hint {
		margin: 0;
		font-size: 13px;
		color: #777;
		line-height: 1.4;
	}

	.setup-error {
		margin: 0;
		font-size: 13px;
		color: #ff8080;
	}

	.select-wrapper {
		position: relative;
		width: 100%;
	}
	.select-wrapper select {
		width: 100%;
		padding: 10px 36px 10px 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
		color: #eee;
		font-size: 14px;
		cursor: pointer;
		appearance: none;
	}
	.select-wrapper select:hover {
		border-color: rgba(255, 255, 255, 0.3);
	}
	.select-wrapper select:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.4);
	}
	.select-wrapper :global(.select-icon) {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: #888;
	}

	.source-toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.source-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 14px 16px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.04);
		color: #ccc;
		font-size: 14px;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease;
	}
	.source-btn:hover {
		border-color: rgba(255, 255, 255, 0.3);
		color: #fff;
	}
	.source-btn.active {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.5);
		color: #fff;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		min-width: 0;
	}
	.file-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		color: #eee;
	}
	.file-size {
		font-size: 12px;
		color: #888;
		white-space: nowrap;
	}

	.clear-file-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #ccc;
		border-radius: 50%;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}
	.clear-file-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
	}

	.select-file-btn {
		align-self: flex-start;
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: transparent;
		color: #ccc;
		cursor: pointer;
		font-size: 14px;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}
	.select-file-btn:hover {
		background-color: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.latency-group {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}
	.latency-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 10px 6px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.04);
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}
	.latency-option input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}
	.latency-option:hover:not(.disabled) {
		border-color: rgba(255, 255, 255, 0.3);
	}
	.latency-option.active {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.5);
	}
	.latency-option.disabled {
		cursor: default;
		opacity: 0.55;
	}
	.latency-option.disabled.active {
		opacity: 1;
	}
	.latency-ms {
		font-size: 14px;
		color: #eee;
		font-weight: 500;
		font-family: 'JetBrains Mono', monospace;
	}
	.latency-hint {
		font-size: 11px;
		color: #888;
		text-align: center;
	}

	.checkbox-label {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		font-size: 14px;
		color: #ccc;
	}
	.checkbox-label:hover {
		color: #fff;
	}

	.start-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		align-self: flex-start;
		border-radius: 8px;
		background: #fff;
		padding: 12px 24px;
		border: none;
		cursor: pointer;
		color: #111;
		font-size: 15px;
		font-weight: 500;
		line-height: 1;
		transition: background-color 0.2s ease;
	}
	.start-btn:hover:not(:disabled) {
		background-color: #eee;
	}
	.start-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Session ───────────────────────────────────────────── */
	.stage {
		display: flex;
		flex-direction: column;
		gap: 14px;
		flex-grow: 1;
		min-height: 0;
	}

	.wave-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.wave-box {
		flex: 1;
		min-width: 0;
		padding: 8px 12px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.wave-box.muted-wave {
		opacity: 0.5;
	}

	.round-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.06);
		color: #ccc;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			border-color 0.2s ease;
	}
	.round-btn:hover {
		background: rgba(255, 255, 255, 0.14);
		color: #fff;
	}
	.round-btn.active {
		background: rgba(255, 255, 255, 0.9);
		color: #111;
		border-color: transparent;
	}
	.round-btn.stop {
		color: #ff6b6b;
		border-color: rgba(255, 107, 107, 0.4);
	}
	.round-btn.stop:hover {
		background: rgba(255, 107, 107, 0.18);
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 13px;
		color: #888;
	}
	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 4px 11px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		color: #aaa;
		background: rgba(255, 255, 255, 0.08);
	}
	.status-pill.live {
		color: #ff6b6b;
		background: rgba(255, 107, 107, 0.14);
	}
	.status-pill.done {
		color: #6ddf9c;
		background: rgba(109, 223, 156, 0.16);
	}
	.status-pill.error {
		color: #ff6b6b;
		background: rgba(255, 107, 107, 0.14);
	}
	.live-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse 1.2s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
	.status-time {
		font-family: 'JetBrains Mono', monospace;
		color: #ccc;
	}
	.status-file {
		min-width: 0;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status-meta {
		margin-left: auto;
		font-family: 'JetBrains Mono', monospace;
	}

	.segment-list {
		flex-grow: 1;
		min-height: 160px;
		max-height: 55vh;
		overflow-y: auto;
		padding-right: 8px;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
	}
	.segment-list::-webkit-scrollbar {
		width: 6px;
	}
	.segment-list::-webkit-scrollbar-thumb {
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	.placeholder {
		margin: 24px 0;
		text-align: center;
		color: #666;
		font-size: 14px;
	}

	.segment-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		margin-bottom: 10px;
		padding: 12px 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		background-color: rgba(255, 255, 255, 0.025);
	}
	.segment-card.has-speaker {
		border-left: 3px solid var(--speaker-fg);
	}
	.segment-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}
	.speaker-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 4px 11px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.3;
		white-space: nowrap;
		color: var(--speaker-fg);
		background-color: var(--speaker-bg);
	}
	.speaker-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: currentColor;
		flex-shrink: 0;
	}
	.segment-time {
		margin-left: auto;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: #6f6f6f;
		white-space: nowrap;
	}
	.segment-time:first-child {
		margin-left: 0;
	}
	.segment-time .separator {
		margin: 0 5px;
	}
	.segment-text {
		color: #ddd;
		min-width: 0;
		overflow-wrap: break-word;
		line-height: 1.55;
		margin: 0;
		font-size: 15px;
	}

	.session-error {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid rgba(255, 107, 107, 0.3);
		background: rgba(255, 107, 107, 0.08);
		color: #ffb3b3;
		font-size: 14px;
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		font-size: 13px;
		color: #aaa;
	}
	.summary b {
		font-weight: 500;
		color: #777;
		margin-right: 4px;
	}

	.stage-actions {
		display: flex;
		justify-content: center;
	}

	@media (max-width: 640px) {
		.latency-group {
			grid-template-columns: repeat(2, 1fr);
		}
		.status-meta {
			margin-left: 0;
		}
	}
</style>
