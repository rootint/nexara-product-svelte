<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
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
	import UsageCard from './cards/UsageCard.svelte';

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

	onMount(() => {
		payments = new cp.CloudPayments({
			language: languageTag() === 'ru' ? 'ru-RU' : 'en-US'
		});
	});
</script>

{#if $dashboardStore.isLoading}
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
					<!-- <ApiKeyCard /> -->
					<UsageCard />
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
