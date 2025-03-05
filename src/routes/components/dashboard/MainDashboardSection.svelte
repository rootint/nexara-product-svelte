<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import { Check, Copy, Eye, RefreshCcw } from 'lucide-svelte';

	let isKeyShown = false;
	let isKeyCopied = false;
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

	onMount(async () => {
		payments = new cp.CloudPayments({
			language: 'ru-RU'
		});
		authStore.initialize();
		if ($authStore.isAuthenticated) {
			let loaded = await dashboardStore.loadDashboardData();
			if (!loaded) {
				authStore.logout();
			}
		} else {
			goto('/login');
		}
	});

	function toggleShowKey() {
		isKeyShown = !isKeyShown;
	}

	async function handleCreateApiKey() {
		try {
			await dashboardStore.createApiKey();
			await dashboardStore.loadDashboardData();
		} catch (error) {
			// Handle UI-specific error presentation
			console.error('Failed to create API key:', error);
		}
	}

	async function handleCopyKey() {
		if ($dashboardStore.apiKey) {
			try {
				await navigator.clipboard.writeText($dashboardStore.apiKey);
				// Optional: Show a success message or change the button text briefly
				console.log('API Key copied to clipboard!');
				isKeyCopied = true;
			} catch (err) {
				console.error('Failed to copy API Key:', err);
			}
		}
	}

	async function handleChangeKey() {
		// Use the browser's built-in confirm() function for a simple OK/Cancel dialog.
		const confirmChange = confirm(
			'Вы уверены, что хотите изменить API-ключ? Это действие необратимо.'
		); // Russian prompt

		if (confirmChange) {
			// User clicked "OK"
			if ($dashboardStore.apiKey) {
				// This check is likely redundant now, but keeps original logic
				try {
					await dashboardStore.changeApiKey();
					await dashboardStore.loadDashboardData();
				} catch (error) {
					// Handle UI-specific error presentation
					console.error('Failed to change API key:', error);
					// Consider showing a more user-friendly error message in the UI.
					alert('Ошибка при смене API-ключа. Пожалуйста, попробуйте еще раз.'); // Russian error alert.
				}
			}
		} else {
			// User clicked "Cancel" - do nothing
			console.log('API key change cancelled.');
		}
	}

	async function handleGetCredits() {
		try {
			if (inputCredits >= 200) {
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
				throw Error('Минимальная сумма пополнения - 200 рублей');
			}
		} catch (error) {
			// Handle UI-specific error presentation
			console.error(error);
		}
	}
</script>

<!-- TODO: new account api button creation -->
{#if !$authStore.isAuthenticated}
	<div class="main-container">
		<div class="top-bar">
			<h3>Главная</h3>
		</div>
		<div class="card-grid">Загрузка...</div>
	</div>
{:else}
	<div class="main-container">
		<div class="top-bar">
			<h3>{$dashboardStore.email}</h3>
			<p class="user-id">User ID : {$dashboardStore.userId}</p>
		</div>
		<div class="card-grid">
			<div class="card">
				<div class="top-row">
					<p class="card-title">Баланс</p>
					<div class="personal-rate">
						{($dashboardStore.personalPrice * 60).toLocaleString('ru-RU')} ₽ / мин
					</div>
				</div>
				{#if $dashboardStore.apiKey}
					<h2 class="money-left">
						{$dashboardStore.credits.toLocaleString('ru-RU', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})} ₽
					</h2>
					<p class="subtitle">
						{($dashboardStore.credits / ($dashboardStore.personalPrice * 60)).toFixed(0)} мин транскрибации
					</p>
					<form on:submit|preventDefault={handleGetCredits} class="buy-form">
						<input
							type="number"
							bind:value={inputCredits}
							placeholder="10000 ₽"
							min="0"
							step="0.01"
						/>
						<button type="submit" class="buy-btn {isButtonDisabled ? 'disabled' : ''}">
							<p class="btn-text">Пополнить</p>
						</button>
					</form>
					<p class="form-subtitle">{subtitleText}</p>
					<div class="fast-buttons-row">
						<button
							class="fast-button"
							on:click={() => {
								inputCredits = 1000 * $dashboardStore.personalPrice * 60;
							}}>1000 мин</button
						>
						<button
							class="fast-button"
							on:click={() => {
								inputCredits = 5000 * $dashboardStore.personalPrice * 60;
							}}>5000 мин</button
						>
						<button
							class="fast-button"
							on:click={() => {
								inputCredits = 10000 * $dashboardStore.personalPrice * 60;
							}}>10000 мин</button
						>
					</div>
				{/if}
			</div>
			<div class="card">
				<div class="top-row">
					<p class="card-title">API ключ</p>
				</div>
				{#if $dashboardStore.apiKey}
					<div class="key-row">
						<div class="key">
							<p class="monospace">
								{#if isKeyShown}
									{$dashboardStore.apiKey}
								{:else}
									nx-xxxxxxxxxxxxxxxxxxxxxxxx
								{/if}
							</p>
						</div>
						<button class="key-btn" on:click={toggleShowKey}>
							<Eye></Eye>
						</button>
						<button class="key-btn" on:click={handleCopyKey}>
							{#if isKeyCopied}
								<Check></Check>
							{:else}
								<Copy></Copy>
							{/if}
						</button>
						<button class="key-btn" on:click={handleChangeKey}>
							<RefreshCcw></RefreshCcw>
						</button>
					</div>
				{:else}
					<div style="height: 24px;"></div>
					<button class="buy-btn" on:click={handleCreateApiKey}>
						<p class="btn-text">Создать ключ</p>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.key-btn {
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 12px;
		padding-bottom: 7px;
		background-color: rgba(255, 255, 255, 0.08);
		cursor: pointer;
		flex-shrink: 0;
	}
	.monospace {
		font-family: monospace;
		color: #fff;
		font-size: 16px;
	}
	.key {
		padding: 12px 16px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		flex-grow: 1;
	}
	.key-row {
		display: flex;
		gap: 16px;
		margin-top: 24px;
		width: 100%;
	}
	.fast-button {
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 12px 16px;
		background-color: rgba(255, 255, 255, 0.08);
		font-size: 16px;
		cursor: pointer;
	}
	.fast-buttons-row {
		display: flex;
		gap: 24px;
	}
	.form-subtitle {
		margin-top: 8px;
		font-size: 14px;
		color: #777;
		margin-bottom: 16px;
	}
	.buy-btn {
		flex-shrink: 0;
		border-radius: 12px;
		background: #fff;
		padding: 16px 32px;
		border: none;
		cursor: pointer;
	}

	button.buy-btn.disabled {
		background: rgba(255, 255, 255, 0.2);
		cursor: not-allowed;
	}
	.btn-text {
		color: #111;
		font-size: 16px;
		font-weight: 500;
	}
	input {
		border: 1px solid rgba(255, 255, 255, 0.11);
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgba(255, 255, 255, 0.03);
		font-size: 16px;
		outline: none;
		flex-grow: 1;
		min-width: 0;
	}
	input:focus {
		border: 1px solid rgba(255, 255, 255, 1);
		outline: none;
	}
	.buy-form {
		display: flex;
		width: 100%;
		gap: 24px;
	}
	.subtitle {
		color: #ddd;
		margin-bottom: 24px;
	}
	.money-left {
		font-size: 32px;
		font-weight: 500;
		margin-bottom: 4px;
	}
	.top-row {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
	.card-title {
		font-size: 16px;
		color: #777;
	}
	.personal-rate {
		padding: 12px 16px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.11);
	}
	.card {
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(24px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
	}
	.user-id {
		color: #777;
	}
	.card-grid {
		padding: 32px;
		display: grid;
		gap: 32px;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	}
	h3 {
		font-weight: 450;
		font-size: 16px;
		color: #fff;
		margin: 0;
		padding: 0;
	}
	.main-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		flex-grow: 1;
	}
	.top-bar {
		display: flex;
		justify-content: space-between;
		padding: 24px 32px;
		width: 100%;
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(24px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-bottom: 1px solid rgba(255, 255, 255, 0.11);
	}
	@media (max-width: 1200px) {
		.card-grid {
			grid-template-columns: 1fr; /* Single column layout */
		}
	}
</style>
