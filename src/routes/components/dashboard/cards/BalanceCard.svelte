<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import { onMount } from 'svelte';

	let inputCredits = null;
	let payments = null;
	let subtitleText = 'Минимальная сумма - 200 ₽';
	let isButtonDisabled = false;

	$: isButtonDisabled =
		inputCredits < 200 ||
		inputCredits === null ||
		inputCredits === '' ||
		inputCredits + $dashboardStore.credits > 99999999;
	$: subtitleText =
		inputCredits + $dashboardStore.credits > 99999999
			? 'Максимальный размер кошелька - 99 999 999 ₽'
			: isButtonDisabled
				? 'Минимальная сумма - 200 ₽'
				: '~ ' +
					(inputCredits / ($dashboardStore.personalPrice * 60)).toFixed(0) +
					' мин транскрибации';

	onMount(() => {
		// Ensure CloudPayments is loaded before initializing
		if (typeof cp !== 'undefined' && cp.CloudPayments) {
			payments = new cp.CloudPayments({
				language: 'ru-RU'
			});
		} else {
			console.error('CloudPayments script not loaded!');
			// Handle the error appropriately, maybe disable the payment form
		}
	});

	async function handleGetCredits() {
		if (!payments) {
			console.error('CloudPayments not initialized.');
			alert('Ошибка инициализации платежной системы. Попробуйте перезагрузить страницу.');
			return;
		}
		try {
			if (inputCredits >= 200 && $dashboardStore.userId) {
				payments.pay(
					'auth', // или 'charge'
					{
						//options
						publicId: 'pk_a0f7faa18429d6e52516616de8747', //id из личного кабинета
						description: 'Пополнение баланса на nexara.ru', //назначение
						amount: Number(inputCredits), //сумма
						currency: 'RUB', //валюта
						skin: 'modern', //дизайн виджета (необязательно)
						data: {
							userId: $dashboardStore.userId // Pass userId here
						}
					},
					{
						onSuccess: function (options) {
							console.log('Payment success');
							// No need to reload data here, parent component handles it via store subscription
						},
						onFail: function (reason, options) {
							console.log('Payment fail', reason);
							// alert('Ошибка платежа: ' + reason);
						},
						onComplete: async function (paymentResult, options) {
							console.log('Payment complete');
							// Force data reload after payment completion
							await dashboardStore.loadDashboardData();
						}
					}
				);
			} else {
				throw Error('Минимальная сумма пополнения - 200 рублей');
			}
		} catch (error) {
			console.error('Error initiating payment:', error);
			alert(error.message || 'Произошла ошибка при попытке пополнения.');
		}
	}
</script>

<div class="card">
	<div class="top-row">
		<p class="card-title">Баланс</p>
		{#if $dashboardStore.personalPrice !== null}
			<div class="personal-rate">
				{($dashboardStore.personalPrice * 60).toLocaleString('ru-RU')} ₽ / мин
			</div>
		{/if}
	</div>

	{#if $dashboardStore.credits !== null}
		<h2 class="money-left">
			{$dashboardStore.credits.toLocaleString('ru-RU', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			})} ₽
		</h2>
		{#if $dashboardStore.personalPrice !== null && $dashboardStore.personalPrice > 0}
			<p class="subtitle">
				~{($dashboardStore.credits / ($dashboardStore.personalPrice * 60)).toFixed(0)} мин транскрибации
			</p>
		{/if}

		<form on:submit|preventDefault={handleGetCredits} class="buy-form">
			<input
				type="number"
				bind:value={inputCredits}
				placeholder="Сумма, ₽"
				min="200"
				step="1"
				required
			/>
			<button type="submit" class="buy-btn" disabled={isButtonDisabled}>
				<span class="btn-text">Пополнить</span>
			</button>
		</form>
		<p class="form-subtitle">{subtitleText}</p>

		{#if $dashboardStore.personalPrice !== null && $dashboardStore.personalPrice > 0}
			<div class="fast-buttons-row">
				<button
					class="fast-button"
					on:click={() => {
						inputCredits = Math.ceil(1000 * $dashboardStore.personalPrice * 60);
					}}>1000 мин</button
				>
				<button
					class="fast-button"
					on:click={() => {
						inputCredits = Math.ceil(5000 * $dashboardStore.personalPrice * 60);
					}}>5000 мин</button
				>
				<button
					class="fast-button"
					on:click={() => {
						inputCredits = Math.ceil(10000 * $dashboardStore.personalPrice * 60);
					}}>10000 мин</button
				>
			</div>
		{/if}
	{:else}
		<p class="loading-placeholder">Загрузка данных баланса...</p>
	{/if}
</div>

<style>
	/* Styles moved from MainDashboardSection.svelte */
	.card {
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(24px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		color: #fff;
		min-height: 250px; /* Ensure a minimum height */
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-bottom: 16px; /* Add space below top row */
	}

	.card-title {
		font-size: 16px;
		color: #777;
		margin: 0;
	}

	.personal-rate {
		padding: 8px 12px; /* Slightly smaller padding */
		border-radius: 8px; /* Smaller radius */
		border: 1px solid rgba(255, 255, 255, 0.11);
		font-size: 14px; /* Smaller font */
	}

	.money-left {
		font-size: 32px;
		font-weight: 500;
		margin-bottom: 4px;
		color: #eee;
	}

	.subtitle {
		color: #aaa;
		margin-bottom: 24px;
		font-size: 14px;
	}

	.buy-form {
		display: flex;
		width: 100%;
		gap: 16px; /* Reduced gap */
	}

	input {
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		padding: 12px 16px;
		background-color: rgba(255, 255, 255, 0.05);
		font-size: 16px;
		color: #fff;
		outline: none;
		flex-grow: 1;
		min-width: 100px; /* Prevent input from becoming too small */
		transition: border-color 0.2s ease;
	}
	input::placeholder {
		color: #666;
	}
	input:focus {
		border-color: rgba(255, 255, 255, 0.8);
	}

	.buy-btn {
		flex-shrink: 0;
		border-radius: 8px;
		background: #fff;
		padding: 12px 24px;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	button.buy-btn:disabled {
		background: rgba(255, 255, 255, 0.2);
		cursor: not-allowed;
	}
	button.buy-btn:disabled .btn-text {
		color: #777;
	}

	.btn-text {
		color: #111;
		font-size: 15px;
		font-weight: 500;
		line-height: 1; /* Ensure text vertical alignment */
	}

	.form-subtitle {
		margin-top: 8px;
		font-size: 13px;
		color: #777;
		margin-bottom: 16px;
		min-height: 1.2em; /* Prevent layout shift */
	}

	.fast-buttons-row {
		display: flex;
		gap: 12px; /* Reduced gap */
		flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
	}

	.fast-button {
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		padding: 8px 12px;
		background-color: rgba(255, 255, 255, 0.08);
		font-size: 14px;
		color: #ccc;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}
	.fast-button:hover {
		background-color: rgba(255, 255, 255, 0.15);
	}

	.loading-placeholder {
		color: #aaa;
		font-size: 14px;
		margin-top: 16px;
	}
</style> 