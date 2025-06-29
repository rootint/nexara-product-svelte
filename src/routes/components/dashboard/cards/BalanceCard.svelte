<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';

	let inputCredits = null;
	let payments = null;
	let subtitleText = m.db_billing_form_subtitle_min();
	let isButtonDisabled = false;

	$: isButtonDisabled =
		inputCredits < (languageTag() === 'ru' ? 200 : 10) ||
		inputCredits === null ||
		inputCredits === '' ||
		inputCredits + $dashboardStore.credits > 99999999;
	$: subtitleText =
		inputCredits + $dashboardStore.credits > 99999999
			? m.db_billing_form_subtitle_max()
			: isButtonDisabled
				? m.db_billing_form_subtitle_min()
				: '~ ' +
					(inputCredits / ($dashboardStore.personalPrice * 60)).toFixed(0) +
					' ' +
					m.db_billing_min();

	onMount(async () => {
		payments = new cp.CloudPayments({
			language: languageTag() === 'ru' ? 'ru-RU' : 'en-US'
		});
	});

	async function handleGetCredits() {
		try {
			if (languageTag() === 'ru') {
				if (inputCredits >= 200) {
					var receipt = {
						items: [
							//товарные позициии
							{
								label: 'Минуты для транскрибации речи', //тег-1030 наименование товара или услуги
								price: $dashboardStore.personalPrice * 60, //тег-1079 цена
								quantity: Number(inputCredits / ($dashboardStore.personalPrice * 60)), //тег-1023 количество
								amount: Number(inputCredits), //тег-1043 сумма
								vat: 0 //тег-1199 ставка НДС
							}
						],
                        taxationSystem: 1,
					};
					payments.pay(
						'auth', // или 'charge'
						{
							//options
							publicId: 'pk_a0f7faa18429d6e52516616de8747', //id из личного кабинета
							description: 'Пополнение баланса на nexara.ru', //назначение
							amount: Number(inputCredits), //сумма
							currency: 'RUB',
							skin: 'modern', //дизайн виджета (необязательно)
							data: {
								userId: $dashboardStore.userId,
								CloudPayments: {
									CustomerReceipt: receipt,
								}
							}
						},
						{
							onSuccess: function (options) {
								console.log('success');
							},
							onFail: function (reason, options) {
								// fail
								console.log('fail');
							},
							onComplete: async function (paymentResult, options) {
								console.log('complete');
								await dashboardStore.loadDashboardData();
							}
						}
					);
				} else {
					throw Error(m.db_billing_form_subtitle_min());
				}
			} else {
				if (inputCredits >= 10) {
					payments.pay(
						'auth', // или 'charge'
						{
							//options
							publicId: 'pk_a0f7faa18429d6e52516616de8747', //id из личного кабинета
							description: 'Pay with card on nexara.ru', //назначение
							amount: Number(inputCredits), //сумма
							currency: 'EUR', //валюта
							skin: 'modern', //дизайн виджета (необязательно)
							data: {
								userId: $dashboardStore.userId
							}
						},
						{
							onSuccess: function (options) {
								console.log('success');
							},
							onFail: function (reason, options) {
								// fail
								console.log('fail');
							},
							onComplete: async function (paymentResult, options) {
								console.log('complete');
								await dashboardStore.loadDashboardData();
							}
						}
					);
				} else {
					throw Error(m.db_billing_form_subtitle_min());
				}
			}
		} catch (error) {
			// Handle UI-specific error presentation
			console.error(error);
		}
	}
</script>

<div class="card">
	<div class="top-row">
		<p class="card-title">{m.db_billing_title()}</p>
		<div class="personal-rate">
			{#if languageTag() === 'ru'}
				{($dashboardStore.personalPrice * 60).toLocaleString('ru-RU')} ₽ / мин
			{:else}
				€{($dashboardStore.personalPrice * 60).toLocaleString('en-GB', {
					minimumFractionDigits: 4,
					maximumFractionDigits: 4
				})} / min
			{/if}
		</div>
	</div>
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
	<p class="subtitle">
		~ {($dashboardStore.credits / ($dashboardStore.personalPrice * 60)).toFixed(0)}
		{m.db_billing_min()}
	</p>
	<form on:submit|preventDefault={handleGetCredits} class="buy-form">
		<input
			type="number"
			bind:value={inputCredits}
			placeholder={m.db_billing_form_placeholder()}
			min="0"
			step="0.1"
		/>
		<button type="submit" class="buy-btn {isButtonDisabled ? 'disabled' : ''}"
			><p class="buy-btn-text {isButtonDisabled ? 'disabled' : ''}">{m.db_billing_pay_button()}</p>
		</button>
	</form>
	<p class="form-subtitle">{subtitleText}</p>
	<div class="fast-buttons-row">
		<button
			class="fast-button"
			on:click={() => {
				inputCredits =
					languageTag() === 'ru'
						? 1000 * $dashboardStore.personalPrice * 60
						: 50 * 60 * $dashboardStore.personalPrice * 60;
			}}>{m.db_billing_fast_button_1()}</button
		>
		<button
			class="fast-button"
			on:click={() => {
				inputCredits =
					languageTag() === 'ru'
						? 5000 * $dashboardStore.personalPrice * 60
						: 100 * 60 * $dashboardStore.personalPrice * 60;
			}}>{m.db_billing_fast_button_2()}</button
		>
		<button
			class="fast-button"
			on:click={() => {
				inputCredits =
					languageTag() === 'ru'
						? 10000 * $dashboardStore.personalPrice * 60
						: (500 * 60 * $dashboardStore.personalPrice * 60).toFixed(0);
			}}>{m.db_billing_fast_button_3()}</button
		>
	</div>
</div>

<style>
	.fast-buttons-subtitle {
		/* color: rgb(250, 250, 250, 0.5); */
        color: var(--text-2);
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
		border-radius: var(--border-radius);
		padding: 12px 16px;
		background-color: var(--secondary-button);
		font-size: 16px;
		border: 1px solid var(--border-color);
		cursor: pointer;
		outline: none;
		min-width: 0;
		flex-shrink: 0;
	}
	.fast-button:hover {
		background-color: var(--secondary-button-hover);
	}
	.buy-btn-text {
		/* color: #111; */
        color: var(--btn-text);
		font-size: 16px;
		font-weight: 500;
	}
    .buy-btn-text.disabled {
		/* color: #111; */
        color: var(--text-2);
		font-size: 16px;
		font-weight: 500;
	}
	.form-subtitle {
		margin-top: 8px;
		font-size: 14px;
		/* color: rgb(250, 250, 250, 0.5); */
        color: var(--text-2);
		margin-bottom: 16px;
	}
	.buy-btn {
		border-radius: var(--border-radius);
		padding: 16px 24px;
		/* background-color: rgb(250, 250, 250); */
        background-color: var(--primary);
		font-size: 16px;
		cursor: pointer;
		outline: none;
		min-width: 0;
		border: none;
		flex-shrink: 0;
	}
	.buy-btn.disabled {
		/* background-color: rgba(250, 250, 250, 0.2); */
        background-color: var(--card-bg-color);
        border: 1px solid var(--border-color);
		cursor: not-allowed;
		outline: none;
	}
	input {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 16px 24px;
		/* background-color: rgba(250, 250, 250, 0.03); */
        background-color: var(--card-bg-color);
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
		/* color: rgba(250, 250, 250, 0.75); */
        color: var(--text-2);
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
		background-color: var(--card-bg-color);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: var(--border-radius);
	}
	.card-title {
		/* color: rgba(250, 250, 250, 0.5); */
        color: var(--text);
	}
	.top-row {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
	.personal-rate {
		padding: 12px 16px;
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
        background-color: var(--card-bg-color);
	}
</style>
