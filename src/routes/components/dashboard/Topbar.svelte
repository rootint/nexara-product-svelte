<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import { tick } from 'svelte'; // Import tick for potential UI updates
	import { sidebarOpen } from '$lib/stores/ui';
	import { Menu } from 'lucide-svelte';

	let copyText = `User ID : ${$dashboardStore.userId}`;
	let copied = false;

	async function copyUserId() {
		if (!$dashboardStore.userId) return; // Don't copy if userId is not available
		try {
			await navigator.clipboard.writeText($dashboardStore.userId);
			copyText = `Copied! ${$dashboardStore.userId}`;
			copied = true;
			// Reset text after a short delay
			setTimeout(async () => {
				// Use tick to ensure reactivity updates before resetting
				await tick();
				copyText = `User ID : ${$dashboardStore.userId}`;
				copied = false;
			}, 1500); // Reset after 1.5 seconds
		} catch (err) {
			console.error('Failed to copy: ', err);
			copyText = 'Failed to copy';
			// Optionally reset after delay on failure too
			setTimeout(async () => {
				await tick();
				copyText = `User ID : ${$dashboardStore.userId}`;
			}, 1500);
		}
	}

	// Keep copyText updated if userId changes
	$: if (!copied) {
		copyText = `User ID : ${$dashboardStore.userId}`;
	}
</script>

<div class="top-bar">
	<div class="top-bar-left">
		<button
			class="burger"
			on:click={() => sidebarOpen.update((n) => !n)}
			aria-label="Toggle sidebar"
		>
			<Menu color="white" />
		</button>
		<h3>{$dashboardStore.email}</h3>
	</div>
	<div
		class="user-id-container"
		on:click={copyUserId}
		on:keydown={(e) => e.key === 'Enter' && copyUserId()}
		role="button"
		tabindex="0"
		title="Click to copy User ID"
	>
		<p class="user-id">{copyText}</p>
	</div>
</div>

<style>
	.top-bar-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	h3 {
		font-weight: 450;
		font-size: 16px;
		color: #fafafa;
		margin: 0;
		padding: 0;
	}
	.user-id {
		color: rgba(250, 250, 250, 0.5);
		transition: color 0.2s ease-in-out; /* Smooth transition for text color */
	}
	.user-id-container {
		padding: 8px 12px;
		border-radius: 12px;
		border: rgba(250, 250, 250, 0.11) solid 1px;
		cursor: pointer; /* Add pointer cursor */
		transition: background-color 0.2s ease-in-out; /* Smooth transition for background */
	}
	.user-id-container:hover {
		background-color: rgba(250, 250, 250, 0.05); /* Slight background change on hover */
	}
	.top-bar {
		/* Removed position: fixed */
		/* Width is now 100% of the right-panel */
		/* height: 50px; */
		align-items: center;
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-bottom: 1px solid rgba(255, 255, 255, 0.11);
		display: flex;
		justify-content: space-between;
		padding: 16px 32px;
		box-sizing: border-box;
		z-index: 10;
		flex-shrink: 0;
	}

	.burger {
		display: none;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	@media (max-width: 800px) {
		.burger {
			display: block;
			z-index: 101;
		}

		.top-bar {
			flex-wrap: wrap;
			row-gap: 16px;
			justify-content: space-between;
		}
		.user-id-container {
			flex-basis: 100%;
		}
	}
</style>
