<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import MainDashboardSection from '../components/dashboard/MainDashboardSection.svelte';

	function storeQueryParamsInLocalStorage() {
		if (browser && $page?.url?.searchParams) {
			const queryParams = {};
			const searchParams = $page.url.searchParams;
			
			for (const [key, value] of searchParams.entries()) {
				queryParams[key] = value;
			}
			
			if (Object.keys(queryParams).length > 0) {
				const timestamp = new Date().toISOString();
				const paramsWithMetadata = {
					params: queryParams,
					timestamp: timestamp,
					url: $page.url.href
				};
				
				localStorage.setItem('landing_page_metrics', JSON.stringify(paramsWithMetadata));
				console.log('Stored query parameters for metrics:', paramsWithMetadata);
			}
		}
	}

	onMount(() => {
		storeQueryParamsInLocalStorage();
	});
</script>

<svelte:head>
	<title>Nexara</title>
	<meta name="description" content="Nexara" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Golos+Text:wght@400..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- <Sidebar></Sidebar> -->
<MainDashboardSection></MainDashboardSection>

<!-- <div style="height: 1200px"></div> -->

<style>
	/* .dashboard {
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: row;
		width: 100%;
	} */
</style>
