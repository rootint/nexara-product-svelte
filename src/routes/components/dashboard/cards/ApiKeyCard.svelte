<script>
	import { onMount } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy, Eye, RefreshCcw, UploadCloud } from 'lucide-svelte';
	let isKeyShown = false;
	let isKeyCopied = false;

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
</script>

<div class="card">
	<div class="card-header">
		<p class="card-title">API-ключ</p>
	</div>
	{#if $dashboardStore.apiKey}
		<div class="key-row">
			<div class="key">
				<p class="monospace">
					{#if isKeyShown}
						{$dashboardStore.apiKey}
					{:else}
						nx-••••••••••••••••••••••••
					{/if}
				</p>
			</div>
			<button class="key-btn" on:click={handleCopyKey}>
				{#if isKeyCopied}
					<Check></Check>
				{:else}
					<Copy></Copy>
				{/if}
			</button>
			<button class="key-btn" on:click={toggleShowKey}>
				<Eye></Eye>
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

<style>
	.key-row {
		margin-top: 24px;
		display: flex;
		width: 100%;
		gap: 16px;
	}
	.monospace {
		font-family: monospace;
	}
	.key {
		flex-grow: 1;
		border-radius: 12px;
		padding: 12px 16px;
		background-color: rgb(250, 250, 250, 0.01);
		font-size: 16px;
		border: 1px solid rgba(250, 250, 250, 0.11);
		outline: none;
	}
	.key-btn {
		outline: none;
		border: 1px solid rgba(250, 250, 250, 0.11);
		background-color: rgb(250, 250, 250, 0.05);
		padding: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		flex-shrink: 0;
		cursor: pointer;
	}
	.key-btn:hover {
		background-color: rgb(250, 250, 250, 0.1);
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
	.top-row {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
</style>
