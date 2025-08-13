<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { goto } from '$app/navigation';
	import {
		Check,
		Copy,
		Eye,
		RefreshCcw,
		UploadCloud,
		File as FileIcon,
		Loader2,
		AlertTriangle,
		X
	} from 'lucide-svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { parseSrt, formatDurationHMS } from '$lib/utils/subtitles';
	import TranscriptionCard from './cards/TranscriptionCard.svelte';
	import BillingMainCard from './cards/BillingMainCard.svelte';
	import ApiKeyCard from './cards/ApiKeyCard.svelte';
	import GuideCard from './cards/GuideCard.svelte';
	import TranscriptionMainCard from './cards/TranscriptionMainCard.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';

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
			language: languageTag() === 'ru' ? 'ru-RU' : 'en-US'
		});
		authStore.initialize();
		if ($authStore.isAuthenticated) {
			let loaded = await dashboardStore.loadDashboardData();
			if (!loaded) {
				authStore.logout();
			}
		} else {
			if (languageTag() === 'ru') {
				goto('/login');
			} else {
				goto('/en/login');
			}
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

{#if !$authStore.isAuthenticated}
	<div class="main-container">
		<div class="card-grid">Загрузка...</div>
	</div>
{:else}
	<div class="main-container">
		<div class="card-cols">
			<div class="card-col">
				<div id="onboarding-balance">
					<BillingMainCard />
				</div>
				<div id="onboarding-apikey">
					<ApiKeyCard />
				</div>
				<div id="onboarding-transcription">
					<TranscriptionMainCard />
				</div>
			</div>
			<div class="card-col">
				<div id="onboarding-guide">
					<GuideCard />
				</div>
				<!-- <Billing /> -->
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

	@media (max-width: 1300px) {
		.card-cols {
			flex-direction: column;
		}
		.card-col {
			width: 100%;
		}
	}
	@media (max-width: 800px) {
		.card-cols {
			flex-direction: column;
			gap: 16px;
		}
		.card-col {
			width: 100%;
			gap: 16px;
		}
	}
</style>
