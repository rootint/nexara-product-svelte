<script>
	export let child;
</script>

<div class="card">
	{child}
</div>

<style>
	.card {
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(24px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
	}
</style>
