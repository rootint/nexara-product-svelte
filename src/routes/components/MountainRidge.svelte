<script>
	// Cinematic mountain-ridge backdrop, baked from the landing page hero's
	// WaveField (a noise-displaced point cloud rendered in WebGL, then exported
	// to a static image). Anchored to the bottom of the viewport so the ridges
	// sit along the bottom edge; a scrim above it blends the crests up into the
	// page background so foreground content stays legible.
	import heroWavesPng from '$lib/assets/hero-waves.png';
	import heroWavesWebp from '$lib/assets/hero-waves.webp';
	import heroWavesAvif from '$lib/assets/hero-waves.avif';
</script>

<div class="ridge-bg" aria-hidden="true">
	<picture>
		<source srcset={heroWavesAvif} type="image/avif" />
		<source srcset={heroWavesWebp} type="image/webp" />
		<img
			class="ridge-img"
			src={heroWavesPng}
			alt=""
			width="2560"
			height="1440"
			decoding="async"
		/>
	</picture>
	<div class="ridge-scrim"></div>
</div>

<style>
	.ridge-bg {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
		background: var(--bg);
		animation: simpleFadeIn 0.7s ease;
	}

	picture {
		display: contents;
	}

	/* Fill the viewport, anchored bottom-centre so the ridges hug the bottom
	   edge and the image cover-crops symmetrically across aspect ratios. */
	.ridge-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center bottom;
		opacity: 0.6;
	}

	/* Fade the crests up into the page background so content above stays clean. */
	.ridge-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgb(22 22 22 / 0) 0%,
			rgb(22 22 22 / 0.4) 42%,
			rgb(22 22 22 / 0.8) 68%,
			var(--bg) 100%
		);
	}

	@media (max-width: 960px) {
		.ridge-img {
			opacity: 0.45;
		}
	}

	@media (max-width: 640px) {
		.ridge-img {
			opacity: 0.32;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ridge-bg {
			animation: none;
		}
	}
</style>
