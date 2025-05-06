<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import BalanceCard from '../../components/dashboard/cards/BalanceCard.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';

	onMount(async () => {
		authStore.initialize();
		if ($authStore.isAuthenticated) {
			let loaded = await dashboardStore.loadDashboardData();
			if (!loaded) {
				authStore.logout(); // Consider redirecting after logout as well
			}
		} else {
			if (languageTag() === 'ru') {
				goto('/login');
			} else {
				goto('/en/login');
			}
		}
	});
</script>

{#if !$authStore.isAuthenticated}
	<div class="main-container">
		<div class="card-cols">Loading...</div>
	</div>
{:else}
	<div class="main-container">
		<div class="card-cols">
			<div class="card-col">
				<BalanceCard />
			</div>
			<div class="card-col">
				<div class="card referral-card">
					<h2 class="card-title">Referral Program</h2>
					<p>
						If you refer a friend, and they become a paying customer, you are eligible for a 5%
						discount. For more details, write to @rnd_random in our <a
							href="https://discord.gg/wuj8dwQKrv">Discord channel</a
						>.
					</p>
				</div>
			</div>
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
	.card-col {
		display: flex;
		flex-direction: column;
		gap: 32px;
		width: 50%;
	}

	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		border: 1px solid rgba(255, 255, 255, 0.11); /* Added border like other cards */
	}

	.referral-card h2 {
		margin-bottom: 16px; /* Added space below title */
		font-size: 24px;
		color: rgb(250, 250, 250);
	}

	.referral-card p {
		color: rgba(250, 250, 250, 0.75);
		line-height: 1.6; /* Improved readability */
	}

	@media (max-width: 1300px) {
		.card-cols {
			flex-direction: column;
		}
		.card-col {
			width: 100%;
		}
	}
</style>
