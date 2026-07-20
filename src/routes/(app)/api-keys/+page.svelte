<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import ApiKeysListCard from '../../components/dashboard/cards/ApiKeysListCard.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';

	let historyData = null;
	let historyLoading = false;
	let historyFromCache = false;
	let historyFetched = false;

	onMount(async () => {
		if ($dashboardStore.apiKeys && $dashboardStore.apiKeys.length > 0) {
			await fetchHistory();
		}
	});

	$: if ($dashboardStore.apiKeys && $dashboardStore.apiKeys.length > 0 && !historyFetched) {
		fetchHistory();
	}

	async function fetchHistory() {
		if (historyFetched) return;
		// Claim synchronously so onMount and the reactive trigger can't both fire,
		// and a failed fetch doesn't re-fire on every store update (retry storm).
		historyFetched = true;
		historyLoading = true;
		try {
			const result = await dashboardStore.getHistory(30);
			historyData = result.data;
			historyFromCache = result.fromCache;
		} catch (error) {
			console.error('Failed to fetch history:', error);
		} finally {
			historyLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Nexara {m.db_sidebar_api_keys()}</title>
	<meta name="description" content="Nexara API Keys" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Golos+Text:wght@400..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if $dashboardStore.isLoading}
	<div class="main-container">
		<div class="card-cols">Loading...</div>
	</div>
{:else}
	<div class="main-container">
		<div class="card-cols">
			<ApiKeysListCard {historyData} {historyLoading} />
		</div>
	</div>
{/if}

<style>
	.main-container {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	.card-cols {
		display: flex;
		gap: 32px;
	}
</style>
