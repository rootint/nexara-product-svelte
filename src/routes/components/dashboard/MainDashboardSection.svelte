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
	.fast-button {
		border: 1px solid rgba(250, 250, 250, 0.15);
		border-radius: 12px;
		padding: 12px 16px;
		background-color: rgba(250, 250, 250, 0.08);
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
		background: rgba(250, 250, 250, 0.2);
		cursor: not-allowed;
	}
	.btn-text {
		color: #111;
		font-size: 16px;
		font-weight: 500;
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
	input:focus {
		border: 1px solid rgba(250, 250, 250, 1);
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
		border: 1px solid rgba(250, 250, 250, 0.11);
	}
	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
	}
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
</style>
