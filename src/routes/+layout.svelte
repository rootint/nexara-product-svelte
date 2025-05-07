<script>
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { dashboardStore } from '$lib/stores/dashboard';

	import './styles.css';
	import Parallax from './components/Parallax.svelte';

	$: {
		if (browser && $dashboardStore.location && $page.url.pathname) {
			const currentLocation = $dashboardStore.location;
			const currentPath = $page.url.pathname;

			// User is Russian, but on an English page
			if (currentLocation === 'ru' && currentPath.startsWith('/en')) {
				const newPath = currentPath.replace(/^\/en/, '') || '/'; // Remove /en prefix, default to root
				goto(newPath, { replaceState: true });
			}
			// User is Rest of World (row), but on a Russian page (not starting with /en)
			else if (currentLocation === 'row' && !currentPath.startsWith('/en')) {
				const newPath = '/en' + currentPath;
				goto(newPath, { replaceState: true });
			}
		}
	}
</script>

<ParaglideJS {i18n}>
	<Parallax></Parallax>

	<div class="app">
		<!-- <ScrollableHeader></ScrollableHeader>
	<Header></Header> -->
		<main>
			<slot />
		</main>
		<!-- <Footer /> -->
	</div>
</ParaglideJS>
