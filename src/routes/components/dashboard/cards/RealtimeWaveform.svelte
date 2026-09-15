<script>
	/**
	 * Bar waveform for the realtime card. Two modes share one drawing:
	 *   - file:   `bars` is the whole file (precomputed), `progress` (0..1) is the
	 *             playhead — bars behind it are lit, the one under it pulses with
	 *             `level`, the rest stay dim. Reads as "playing back".
	 *   - mic:    `bars` is a rolling window of recent levels (newest on the
	 *             right), `progress` is null and everything is lit.
	 * The parent drives the values from its own animation loop; this component
	 * just repaints whenever they change.
	 */
	let { bars = [], progress = null, level = 0, count = 96 } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const cssW = canvas.clientWidth;
		const cssH = canvas.clientHeight;
		if (!cssW || !cssH) return;
		if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
			canvas.width = Math.round(cssW * dpr);
			canvas.height = Math.round(cssH * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, cssW, cssH);

		const gap = 2;
		const barWidth = Math.max(1, (cssW - (count - 1) * gap) / count);
		const radius = Math.min(barWidth / 2, 1.6);
		const supportsRound = typeof ctx.roundRect === 'function';
		const playhead = progress === null ? count : Math.floor(progress * count);

		for (let i = 0; i < count; i++) {
			const x = i * (barWidth + gap);
			let v = bars[i] ?? 0;
			if (progress !== null && i === playhead) {
				// The bar under the playhead breathes with the live signal.
				v = Math.max(v, level);
				ctx.fillStyle = 'rgba(250, 250, 250, 0.95)';
			} else if (i < playhead) {
				ctx.fillStyle = 'rgba(250, 250, 250, 0.85)';
			} else {
				ctx.fillStyle = 'rgba(250, 250, 250, 0.22)';
			}
			const h = Math.max(2, v * cssH);
			const y = (cssH - h) / 2;
			if (supportsRound) {
				ctx.beginPath();
				ctx.roundRect(x, y, barWidth, h, Math.min(radius, h / 2));
				ctx.fill();
			} else {
				ctx.fillRect(x, y, barWidth, h);
			}
		}
	}

	$effect(() => {
		// Touch every input so any change schedules a repaint.
		bars;
		progress;
		level;
		count;
		draw();
	});
</script>

<canvas bind:this={canvas} class="waveform" aria-hidden="true"></canvas>

<style>
	.waveform {
		display: block;
		width: 100%;
		height: 48px;
	}
</style>
