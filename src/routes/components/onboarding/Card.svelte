<script>
	// Props can be added here if needed, e.g., for title, padding variations, etc.
</script>

<div class="card">
	<slot />
</div>

<style>
	.card {
		/* background-color: #191919; */
        background-color: var(--bg);
		border-radius: var(--border-radius);
		padding: 24px;
		/* border: 1px solid rgba(0, 0, 0, 0.1); */
        border: 1px solid var(--border-color);
		min-width: 500px;
        max-width: 500px;
	}
</style>
