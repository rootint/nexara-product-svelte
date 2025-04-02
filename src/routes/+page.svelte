<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import icon from '$lib/assets/icon.png';
	import { BookOpen, LayoutPanelLeft, LogOut } from 'lucide-svelte';
	import Sidebar from './components/dashboard/Sidebar.svelte';
	import MainDashboardSection from './components/dashboard/MainDashboardSection.svelte';

	let inputCredits = null;

	let payments = null;
	let isKeyShown = false;
	let copied = false;

	onMount(async () => {
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
			console.error('Failed to create API key:', error);
		}
	}

	async function handleGetCredits() {
		try {
			if (inputCredits >= 200) {
				var payments = new cp.CloudPayments({
					language: 'ru-RU',
					email: '',
					applePaySupport: true,
					googlePaySupport: true,
					yandexPaySupport: true,
					tinkoffPaySupport: true,
					tinkoffInstallmentSupport: true,
					sbpSupport: true
				});

				payments
					.pay('charge', {
						publicId: 'pk_a0f7faa18429d6e52516616de8747',
						description: 'Тестовая оплата',
						amount: 100,
						currency: 'RUB',
						invoiceId: '123',
						accountId: '123',
						email: '',
						skin: 'modern',
						requireEmail: false
					})
					.then(function (widgetResult) {
						console.log('result', widgetResult);
					})
					.catch(function (error) {
						console.log('error', error);
					});
				payments = new cp.CloudPayments();
				payments.pay(
					'charge',
					{
						publicId: 'pk_a0f7faa18429d6e52516616de8747',
						description: 'Пополнение баланса на nexara.ru',
						// amount: Number(inputCredits),
						amount: 100,
						invoiceId: crypto.randomUUID(),
						accountId: $dashboardStore.userId,
						currency: 'RUB',
						skin: 'modern',
						data: {
							userId: $dashboardStore.userId
						}
					},
					{
						onSuccess: function (options) {},
						onFail: function (reason, options) {},
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

<section class="dashboard">
	<Sidebar></Sidebar>
	<MainDashboardSection></MainDashboardSection>
	<!-- <div style="height: 1200px"></div> -->
</section>

<style>
	.dashboard {
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: row;
		min-height: 100vh;
		width: 100%;
	}
</style>
