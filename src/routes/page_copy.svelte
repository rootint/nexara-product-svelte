<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import icon from '$lib/assets/icon.png';

	let inputCredits = null;

	let payments = null;
	let isKeyShown = false;
	let copied = false;

	onMount(async () => {
		payments = new cp.CloudPayments({
			language: 'ru-RU',
			email: '',
			applePaySupport: false,
			googlePaySupport: false,
			yandexPaySupport: false,
			tinkoffPaySupport: false,
			tinkoffInstallmentSupport: false,
			sbpSupport: true
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

	async function handleCreateApiKey() {
		try {
			await dashboardStore.createApiKey();
			await dashboardStore.loadDashboardData();
		} catch (error) {
			// Handle UI-specific error presentation
			console.error('Failed to create API key:', error);
		}
	}

	async function handleLogout() {
		try {
			await authStore.logout();
		} catch (error) {
			console.error('Failed to logout', error);
		}
	}

	function toggleShowKey() {
		isKeyShown = !isKeyShown;
	}

	async function handleCopyKey() {
		if ($dashboardStore.apiKey) {
			try {
				await navigator.clipboard.writeText($dashboardStore.apiKey);
				// Optional: Show a success message or change the button text briefly
				console.log('API Key copied to clipboard!');
				copied = true;
			} catch (err) {
				console.error('Failed to copy API Key:', err);
			}
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

<svelte:head>
	<title>Панель Nexara</title>
	<meta name="description" content="Nexara" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Golos+Text:wght@400..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if $authStore.isAuthenticated}
	<div class="dashboard">
		<div class="sidebar">
			<div class="top-row">
				<img src={icon} width="21" alt="logo" />
				<div style="width: 12px"></div>
				<p class="logo">Nexara</p>
			</div>
			<div style="height: 32px;"></div>
			<a href="/">Мой аккаунт</a>
			<div style="height: 64px;"></div>
			<a href="https://docs.nexara.ru/docs/quick-start">Документация</a>
			<div style="height: 64px;"></div>
			<button on:click={handleLogout}><p class="btn-text">Выйти</p></button>
		</div>
		{#if $dashboardStore.isLoading}
			<p>Loading...</p>
		{:else if $dashboardStore.error}
			<p class="error">{$dashboardStore.error}</p>
		{:else}
			<div class="content">
				<h2>Мой аккаунт {$dashboardStore.userId}</h2>
				<div class="card">
					<p class="card-title">Баланс</p>
					{#if !$dashboardStore.apiKey}
						<p>Создайте API ключ перед оплатой</p>
					{:else}
						<div class="credits">
							Баланс: {$dashboardStore.credits}₽
						</div>
						<p class="minutes-text">
							{($dashboardStore.credits / ($dashboardStore.personalPrice * 60)).toFixed(2)} минут транскрибации
						</p>
						<div style="height: 32px;"></div>
						<form on:submit|preventDefault={handleGetCredits}>
							<input type="text" bind:value={inputCredits} placeholder="1000₽" />
							<button type="submit"><p class="btn-text">Пополнить</p></button>
						</form>
						<div style="height: 4px;"></div>
						<p class="minutes-text">Минимальная сумма - 200₽</p>
					{/if}
				</div>
				<div style="height: 32px;"></div>
				<div class="card">
					<p class="card-title">Ключи</p>
					<div style="height: 24px;"></div>
					<div class="api-keys">
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
								{#if isKeyShown}
									<button on:click={handleCopyKey}><p class="btn-text">Скопировать</p></button>
								{/if}
							</div>
							{#if copied}
								<p>Ключ скопирован в буфер обмена!</p>
							{/if}
							<div style="height: 16px;"></div>
							<button on:click={toggleShowKey}
								><p class="btn-text">
									{#if isKeyShown}
										Скрыть ключ
									{:else}
										Показать ключ
									{/if}
								</p></button
							>
						{:else}
							<p>У вас пока нет API ключей.</p>
							<div style="height: 16px;"></div>
							<button on:click={handleCreateApiKey}><p class="btn-text">Создать ключ</p></button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<p>Загрузка...</p>
{/if}

<style>
	.api-keys {
		width: 100%;
	}
	.key-row {
		display: flex;
		gap: 16px;
		width: 100%;
	}
	.monospace {
		font-family: monospace;
	}
	.key {
		border-radius: 12px;
		padding: 16px;
		background-color: #111;
	}
	button {
		background-color: #fff;
		padding: 16px 32px;
		border-radius: 12px;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-text {
		margin-bottom: 0;
		color: #111;
		font-weight: 450;
		font-size: 16px;
		background-color: none;
	}
	form {
		display: flex;
		gap: 32px;
		width: 100%;
	}
	input {
		background-color: rgba(255, 255, 255, 0.02);
		border: solid 1px rgba(255, 255, 255, 0.11);
		border-radius: 12px;
		padding: 16px 16px;
		outline: none;
	}
	input:focus {
		border: 1px solid #ffffff;
	}
	.minutes-text {
		padding: 0;
		margin: 0;
		margin-top: 4px;
		color: #ddd;
	}
	.credits {
		margin: 0;
		padding: 0;
		margin-top: 24px;
		font-size: 24px;
		font-weight: 400;
	}
	.card-title {
		color: #777;
	}
	.card {
		width: 100%;
	}
	h2 {
		font-size: 24px;
		font-weight: 500;
		margin: 0;
		padding: 0;
		margin-bottom: 32px;
	}
	.content {
		padding: 32px;
		padding-right: 16px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: start;
	}
	.top-row {
		display: flex;
		align-items: center;
	}
	.dashboard {
		padding: 0;
		display: flex;
		height: 100vh;
		width: 100wv;
	}
	.sidebar {
		position: relative;
		/* margin-top: 16px; */
		/* margin-bottom: 16px; */
		border-radius: 12px;
		width: 280px;
		/* height: 100vh; */
		padding: 32px;
		display: flex;
		flex-direction: column;
		align-items: start;
		box-sizing: border-box;
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(24px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
	}

	.sidebar::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 1px; /* Thickness of the border */
		border-radius: 12px;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.14));
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		pointer-events: none; /* Prevents interaction with the pseudo-element */
	}
</style>
