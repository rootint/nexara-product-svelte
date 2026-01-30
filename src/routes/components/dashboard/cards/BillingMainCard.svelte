<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
</script>

<div class="card">
	<div class="top-row">
		<p class="card-title">{m.db_balance_title()}</p>
		<!-- <div class="personal-rate">
			{#if languageTag() === 'ru'}
				{($dashboardStore.personalPrice * 60).toLocaleString('ru-RU')} ₽ / мин
			{:else}
				€{($dashboardStore.personalPrice * 60).toLocaleString('en-GB', {
					minimumFractionDigits: 4,
					maximumFractionDigits: 4
				})} / min
			{/if}
		</div> -->
	</div>
	<div class="balance-amount-row">
		<h2 class="balance-amount">
			{#if languageTag() === 'ru'}
				{$dashboardStore.credits.toLocaleString('ru-RU', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				})} ₽
			{:else}
				€{$dashboardStore.credits.toLocaleString('en-GB', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				})}
			{/if}
		</h2>
		<a href="/billing"><button class="fast-button"> {m.db_billing_go_to_billing()}</button></a>
	</div>
</div>

<style>
	.balance-amount-row {
		width: 100%;
		display: flex;
		gap: 16px;
		justify-content: space-between;
		align-items: center;
	}
	.fast-buttons-subtitle {
		color: rgb(250, 250, 250, 0.5);
		margin-bottom: 16px;
		padding: 0;
		margin: 0;
	}
	.fast-buttons-row {
		display: flex;
		gap: 16px;
		justify-content: center;
		align-items: center;
	}

	.fast-button {
		border-radius: 12px;
		padding: 12px 16px;
		background-color: rgb(250, 250, 250, 0.05);
		font-size: 16px;
		border: 1px solid rgba(250, 250, 250, 0.11);
		cursor: pointer;
		outline: none;
		min-width: 0;
		flex-shrink: 0;
	}
	.fast-button:hover {
		background-color: rgb(250, 250, 250, 0.1);
	}
	.buy-btn-text {
		color: #111;
		font-size: 16px;
		font-weight: 500;
	}
	.form-subtitle {
		margin-top: 8px;
		font-size: 14px;
		color: rgb(250, 250, 250, 0.5);
		margin-bottom: 16px;
	}
	.buy-btn {
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgb(250, 250, 250);
		font-size: 16px;
		cursor: pointer;
		outline: none;
		min-width: 0;
		border: none;
		flex-shrink: 0;
	}
	.buy-btn.disabled {
		background-color: rgba(250, 250, 250, 0.2);
		cursor: not-allowed;
		outline: none;
	}
	input {
		border: 1px solid rgba(250, 250, 250, 0.11);
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgba(250, 250, 250, 0.03);
		font-size: 16px;
		outline: none;
		flex-grow: 1;
		min-width: 0;
	}
	.buy-form {
		width: 100%;
		display: flex;
		gap: 24px;
	}
	.subtitle {
		color: rgba(250, 250, 250, 0.75);
		margin-bottom: 24px;
		margin-top: 0;
		padding: 0;
	}
	.balance-amount {
		font-size: 32px;
		font-weight: 550;
		margin-bottom: 4px;
	}
	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
	}
	.card-title {
		color: rgba(250, 250, 250, 0.5);
		margin-bottom: 24px;
	}
	.top-row {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
	.personal-rate {
		padding: 12px 16px;
		border-radius: 12px;
		border: 1px solid rgba(250, 250, 250, 0.11);
	}
</style>
