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

<svelte:head>
	<title>Биллинг Nexara</title>
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
				<!-- <div class="card referral-card">
					<p class="card-title">{m.referral_title()}</p>
					<p>
						{m.referral_content()}
						<a
							href={languageTag() === 'ru'
								? 'https://t.me/RND_RandoM'
								: 'https://discord.gg/wuj8dwQKrv'}>{m.referral_discord()}</a
						>.
					</p>
				</div> -->
				<div class="card referral-card">
					<p class="card-title">Диаризация</p>
					<p>
						Обратите внимание, что если вы используете диаризацию, то каждая минута тарифицируется как две.
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
		/* background-color: rgba(250, 250, 250, 0.01); */
        background-color: var(--card-bg-color);
		backdrop-filter: blur(16px);
		border-radius: var(--border-radius);
		padding: 24px;
		display: flex;
		flex-direction: column;
	}

	.card-title {
		/* color: rgba(250, 250, 250, 0.5) !important; */
        color: var(--text) !important;
        font-weight: 500 !important;
		margin-bottom: 24px;
	}

	.referral-card p {
		/* color: rgba(250, 250, 250, 1); */
        color: var(--text-2);
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
