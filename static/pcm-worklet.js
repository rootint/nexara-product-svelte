/**
 * AudioWorklet processor for the Nexara realtime endpoint.
 * Repackages 128-sample Float32 blocks from the audio graph into 1280-sample
 * (≈80 ms at 16 kHz) chunks, converts them to int16 little-endian PCM
 * (`pcm_s16le`, half the bytes of float) and posts them to the main thread.
 */
class PcmWorklet extends AudioWorkletProcessor {
	constructor() {
		super();
		this._chunkSize = 1280; // 80 ms @ 16 kHz
		this._buffer = new Int16Array(this._chunkSize);
		this._offset = 0;
	}

	process(inputs) {
		const input = inputs[0];
		if (!input || !input[0]) return true;
		const channel = input[0];

		for (let i = 0; i < channel.length; i++) {
			// Clamp to [-1, 1] and scale; the graph can overshoot slightly on loud input.
			const s = Math.max(-1, Math.min(1, channel[i]));
			this._buffer[this._offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;

			if (this._offset >= this._chunkSize) {
				// Int16Array is little-endian on every platform browsers run on.
				const out = new Int16Array(this._buffer);
				this.port.postMessage(out.buffer, [out.buffer]);
				this._offset = 0;
			}
		}
		return true;
	}
}

registerProcessor('pcm-worklet', PcmWorklet);
