<script>
	import TranscriptionCard from '../../components/dashboard/cards/TranscriptionCard.svelte';
</script>

<svelte:head>
	<title>Nexara Транскрибация</title>
	<meta name="description" content="Nexara" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Golos+Text:wght@400..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="playground-container">
	<TranscriptionCard />
</div>

<style>
	.playground-container {
		width: 100%;
		box-sizing: border-box;
	}
</style>
