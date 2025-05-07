<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import Sidebar from '../components/dashboard/Sidebar.svelte';
	import MainDashboardSection from '../components/dashboard/MainDashboardSection.svelte';
	// import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';

	onMount(async () => {
		authStore.initialize();
		if ($authStore.isAuthenticated) {
			let loaded = await dashboardStore.loadDashboardData();
			if (!loaded) {
				authStore.logout();
			}
		} else {
			if (languageTag === 'ru') {
				goto('/login');
			} else {
				goto('/en/login');
			}
		}
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
