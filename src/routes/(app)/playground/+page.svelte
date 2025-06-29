<script>
	import TranscriptionCard from '../../components/dashboard/cards/TranscriptionCard.svelte';
</script>

<svelte:head>
	<title>Nexara</title>
	<meta name="description" content="Nexara" />
	<!-- <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Golos+Text:wght@400..900&display=swap"
		rel="stylesheet"
	/>
    <link rel="preconnect" href="https://fonts.googleapis.com"> -->
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
		rel="stylesheet"
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
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
