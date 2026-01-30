<script>
	// Props can be added here if needed, e.g., for title, padding variations, etc.
</script>

<div class="card">
	<slot />
</div>

<style>
	.card {
		background-color: #191919;
		border-radius: 12px;
		padding: 24px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		min-width: 500px;
        max-width: 500px;
	}
	@media (max-width: 800px) {
		.card {
			min-width: 100%;
			max-width: 100%;
		}
	}
</style>
