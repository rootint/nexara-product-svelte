<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';

	let usageData = null;
	let fromCache = false;
	let cachedAt = null;
	let isLoading = true;
	let error = null;
	let hasFetched = false;

	async function fetchHistory() {
		if (hasFetched) return;

		try {
			isLoading = true;
			error = null;
			const result = await dashboardStore.getHistory(30);
			usageData = result.data;
			fromCache = result.fromCache;
			cachedAt = result.cachedAt;
			hasFetched = true;
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	$: if ($dashboardStore.apiKeys && $dashboardStore.apiKeys.length > 0 && !hasFetched) {
		fetchHistory();
	}

	onMount(async () => {
		await fetchHistory();
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
	{:else if usageData}
		<div class="stats-container">
			<div class="stat-item">
				<p class="stat-label">{m.db_usage_minutes_label()}</p>
				<h2 class="stat-value">
					{usageData.total_minutes.toLocaleString(languageTag() === 'ru' ? 'ru-RU' : 'en-GB', {
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
					{#if usageData.currency === 'RUB'}
						{usageData.total_cost.toLocaleString('ru-RU', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})} ₽
					{:else}
						€{usageData.total_cost.toLocaleString('en-GB', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					{/if}
				</h2>
				<p class="stat-subtitle">{m.db_usage_money_subtitle()}</p>
			</div>
		</div>

		{#if fromCache && cachedAt}
			<div class="period-info">
				<p>{m.db_usage_cached()}</p>
			</div>
		{/if}
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

	.period-info {
		padding-top: 16px;
		border-top: 1px solid rgba(250, 250, 250, 0.11);
		width: 100%;
		display: flex;
	}

	.period-info p {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
		margin: 0;
		text-align: center;
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
