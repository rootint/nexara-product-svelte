<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';

	let stats = null;
	let isLoading = true;
	let error = null;
	let hasFetched = false;

	// Days counted in the viewer's own timezone, matching the Usage page.
	const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	async function fetchStats() {
		if (hasFetched) return;
		// Claim the fetch synchronously so onMount and the reactive trigger can't
		// both fire it, and a failure doesn't re-fire it on every store update.
		hasFetched = true;

		try {
			isLoading = true;
			error = null;
			// Backend defaults to the last 30 days. Same source as the Usage tab,
			// so these totals match it (frozen request_cost, not live pricing).
			stats = await dashboardStore.getUsageStats({ tz: userTimeZone });
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	$: if ($dashboardStore.apiKeys && $dashboardStore.apiKeys.length > 0 && !hasFetched) {
		fetchStats();
	}

	onMount(async () => {
		await fetchStats();
	});
</script>

<div class="card">
	<div class="top-row">
		<p class="card-title">{m.db_usage_title()}</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<p>{m.db_usage_loading()}</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-text">{m.db_usage_error()}</p>
			<p class="error-detail">{error}</p>
		</div>
	{:else if stats}
		<div class="stats-container">
			<div class="stat-item">
				<p class="stat-label">{m.db_usage_minutes_label()}</p>
				<h2 class="stat-value">
					{stats.totals.minutes.toLocaleString(languageTag() === 'ru' ? 'ru-RU' : 'en-GB', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					})}
				</h2>
				<p class="stat-subtitle">{m.db_usage_minutes_subtitle()}</p>
			</div>

			<div class="stat-divider"></div>

			<div class="stat-item">
				<p class="stat-label">{m.db_usage_money_label()}</p>
				<h2 class="stat-value">
					{#if stats.currency === 'EUR'}
						€{stats.totals.cost.toLocaleString('en-GB', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					{:else}
						{stats.totals.cost.toLocaleString('ru-RU', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})} ₽
					{/if}
				</h2>
				<p class="stat-subtitle">{m.db_usage_money_subtitle()}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		min-height: 200px;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.card-title {
		color: rgba(250, 250, 250, 0.5);
		margin: 0;
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex-grow: 1;
		padding: 32px 0;
	}

	.error-text {
		color: rgba(255, 100, 100, 0.9);
		margin-bottom: 8px;
		font-weight: 500;
	}

	.error-detail {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
	}

	.stats-container {
		display: flex;
		gap: 32px;
		justify-content: space-between;
		align-items: start;
		margin-bottom: 24px;
	}

	.stat-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.stat-label {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
		margin: 0 0 12px 0;
	}

	.stat-value {
		font-size: 32px;
		font-weight: 550;
		margin: 0 0 8px 0;
		color: rgba(250, 250, 250, 1);
	}

	.stat-subtitle {
		color: rgba(250, 250, 250, 0.75);
		font-size: 14px;
		margin: 0;
	}

	.stat-divider {
		width: 1px;
		height: 80px;
		background-color: rgba(250, 250, 250, 0.11);
	}

	@media (max-width: 768px) {
		.stats-container {
			flex-direction: column;
			gap: 24px;
		}

		.stat-divider {
			width: 100%;
			height: 1px;
		}
	}
</style>
