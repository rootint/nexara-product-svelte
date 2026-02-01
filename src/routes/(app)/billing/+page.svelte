<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import BalanceCard from '../../components/dashboard/cards/BalanceCard.svelte';
	import UsageCard from '../../components/dashboard/cards/UsageCard.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
</script>

<svelte:head>
	<title>Nexara Биллинг</title>
	<meta name="description" content="Nexara" />
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
			<div class="card-col">
				<BalanceCard />
				<UsageCard />
			</div>
			<div class="card-col">
				<div class="card referral-card">
					<p class="card-title">{m.referral_title()}</p>
					<p>
						{m.referral_content()}
						<a
							href={languageTag() === 'ru'
								? 'https://t.me/RND_RandoM'
								: 'https://discord.gg/wuj8dwQKrv'}>{m.referral_discord()}</a
						>.
					</p>
				</div>
				<div class="card referral-card">
					<p class="card-title">Диаризация</p>
					<p>
						Обратите внимание, что если вы используете диаризацию, то каждая минута тарифицируется
						как две.
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
	}

	.card-title {
		color: rgba(250, 250, 250, 0.5) !important;
		margin-bottom: 24px;
	}

	.referral-card p {
		color: rgba(250, 250, 250, 1);
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
