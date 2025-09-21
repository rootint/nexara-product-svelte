<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import { sidebarOpen } from '$lib/stores/ui.js';

	import '../styles.css';
	import Parallax from '../components/Parallax.svelte';
	import Sidebar from '../components/dashboard/Sidebar.svelte';
	import Topbar from '../components/dashboard/Topbar.svelte';
	import Onboarding from '../components/onboarding/Onboarding.svelte';
    import { languageTag } from '$lib/paraglide/runtime.js';

	onMount(async () => {
		authStore.initialize();
		if ($authStore.isAuthenticated) {
			let loaded = await dashboardStore.loadDashboardData();
			if (!loaded) {
				// Optionally handle the case where loading fails, maybe redirect or show error
				// For now, logging out as before
				authStore.logout();
				if (languageTag() === 'ru') {
					goto('/login');
				} else {
					goto('/en/login');
				}
			}
		} else {
			if (languageTag() === 'ru') {
				goto('/login');
			} else {
				goto('/en/login');
			}
		}
	});

	function handleSidebarClick(event) {
		if (window.innerWidth < 800) {
			const target = event.target.closest('a, button');
			if (target) {
				sidebarOpen.set(false);
			}
		}
	}

	function closeSidebar() {
		sidebarOpen.set(false);
	}
</script>

<Onboarding />

<ParaglideJS {i18n}>
	<Parallax></Parallax>

	<div class="app-container">
		<div
			class="sidebar"
			class:open={$sidebarOpen}
			on:click={handleSidebarClick}
			on:keydown={(e) => e.key === 'Enter' && handleSidebarClick(e)}
			role="button"
			tabindex="0"
		>
			<Sidebar></Sidebar>
		</div>

		{#if $sidebarOpen}
			<div
				class="overlay"
				on:click={closeSidebar}
				on:keydown={(e) => e.key === 'Enter' && closeSidebar()}
				role="button"
				tabindex="0"
				aria-label="Close sidebar"
			></div>
		{/if}

		<div class="right-panel">
			<!-- <div class="top-bar">Home</div> -->
			<Topbar></Topbar>
			<main class="main-content">
				<slot />
			</main>
		</div>
	</div>
</ParaglideJS>

<style>
	/* Moved global body styles to root layout */

	.app-container {
		display: grid;
		/* Sidebar width fixed, right panel takes remaining space */
		grid-template-columns: 254px 1fr;
		height: 100vh;
		overflow: hidden;
	}

	.sidebar {
		grid-column: 1 / 2;
		padding: 0px;
		/* background-color: rgba(255, 255, 255, 0.015); */
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		height: 100vh;
		width: 254px;
		display: flex;
		flex-direction: column;
		top: 0; /* Stick to the top of the viewport */
		overflow-y: auto;
		box-sizing: border-box;
		/* flex-direction: column; */
		grid-template-rows: auto 1fr auto;
		border-right: 1px solid rgba(255, 255, 255, 0.11);
		flex-shrink: 0;
	}

	.right-panel {
		grid-column: 2 / 3; /* Place in second grid column */
		display: flex;
		flex-direction: column;
		height: 100vh; /* Take full height of the grid row */
		overflow: hidden; /* Prevent this panel from scrolling */
	}

	.main-content {
		/* Removed margins */
		padding: 32px;
		overflow-y: auto; /* Allow ONLY this container to scroll */
		flex-grow: 1; /* Take remaining vertical space in right-panel */
		box-sizing: border-box;
	}

	.overlay {
		display: none;
	}

	@media (max-width: 800px) {
		.app-container {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: -254px; /* Start off-screen */
			height: 100vh;
			z-index: 100;
			transition: transform 0.3s ease-in-out;
			transform: translateX(0);
		}

		.sidebar.open {
			transform: translateX(254px); /* Slide in */
		}

		.overlay {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.2);
			z-index: 99;
		}

		.main-content {
			padding: 16px;
		}
	}
</style>
