<script>
	import { onMount } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy, Eye, RefreshCcw, UploadCloud } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import * as m from '$lib/paraglide/messages.js';

	function handleGoToPlayground() {
		if (languageTag() === 'ru') {
			goto('/playground');
		} else {
			goto('/en/playground');
		}
	}
</script>

<div class="card">
	<div class="card-header">
		<p class="card-title">{m.db_transcribe_title()}</p>
	</div>
	<div style="height: 24px;"></div>
	<button class="buy-btn" on:click={handleGoToPlayground}>
		<p class="btn-text">{m.db_transcribe_go_to_playground()}</p>
	</button>
</div>

<style>
	.btn-text {
		color: #111;
		font-size: 16px;
	}
	.buy-btn {
		background-color: rgba(250, 250, 250);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
		padding: 12px 20px;
		border: none;
		outline: none;
		cursor: pointer;
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
	}
</style>
