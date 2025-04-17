<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy, Eye, RefreshCcw } from 'lucide-svelte';
	import { tick } from 'svelte';

	let isKeyShown = false;
	let isKeyCopied = false;

	function toggleShowKey() {
		isKeyShown = !isKeyShown;
	}

	async function handleCreateApiKey() {
		try {
			await dashboardStore.createApiKey();
			// Data reload is handled by the parent component via store subscription
			// await dashboardStore.loadDashboardData(); // Removed
			isKeyShown = true; // Show the newly created key
		} catch (error) {
			console.error('Failed to create API key:', error);
			alert('Ошибка при создании API-ключа: ' + (error.message || 'Неизвестная ошибка'));
		}
	}

	async function handleCopyKey() {
		if ($dashboardStore.apiKey) {
			try {
				await navigator.clipboard.writeText($dashboardStore.apiKey);
				isKeyCopied = true;
				await tick(); // Wait for the DOM to update
				setTimeout(() => {
					isKeyCopied = false;
				}, 1500); // Reset icon after 1.5 seconds
			} catch (err) {
				console.error('Failed to copy API Key:', err);
				alert('Не удалось скопировать API-ключ. Возможно, ваш браузер не поддерживает эту функцию или доступ запрещен.');
			}
		}
	}

	async function handleChangeKey() {
		const confirmChange = confirm(
			'Вы уверены, что хотите изменить API-ключ? Старый ключ перестанет работать. Это действие необратимо.'
		);

		if (confirmChange) {
			try {
				await dashboardStore.changeApiKey();
				// Data reload is handled by the parent component via store subscription
				// await dashboardStore.loadDashboardData(); // Removed
				isKeyShown = true; // Show the new key
				isKeyCopied = false; // Reset copy icon
			} catch (error) {
				console.error('Failed to change API key:', error);
				alert('Ошибка при смене API-ключа: ' + (error.message || 'Неизвестная ошибка'));
			}
		}
	}
</script>

<div class="card">
	<div class="top-row">
		<p class="card-title">API ключ</p>
		<!-- Placeholder for potential top-right elements if needed -->
	</div>

	{#if $dashboardStore.apiKey === undefined}<!-- Loading state -->
		<div class="loading-placeholder">Загрузка ключа...</div>
	{:else if $dashboardStore.apiKey}
		<!-- Key exists state -->
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
			<button class="key-btn" on:click={toggleShowKey} aria-label={isKeyShown ? 'Скрыть ключ' : 'Показать ключ'} title={isKeyShown ? 'Скрыть ключ' : 'Показать ключ'}>
				<Eye size={18} />
			</button>
			<button class="key-btn" on:click={handleCopyKey} aria-label="Скопировать ключ" title="Скопировать ключ" disabled={isKeyCopied}>
				{#if isKeyCopied}
					<Check size={18} color="#4ade80" /> <!-- Green check -->
				{:else}
					<Copy size={18} />
				{/if}
			</button>
			<button class="key-btn refresh-btn" on:click={handleChangeKey} aria-label="Сгенерировать новый ключ" title="Сгенерировать новый ключ">
				<RefreshCcw size={18} />
			</button>
		</div>
	{:else}
		<!-- No key exists state -->
		<div class="no-key-container">
			<p class="no-key-text">API ключ еще не создан.</p>
			<button class="create-key-btn" on:click={handleCreateApiKey}>
				<span class="btn-text">Создать ключ</span>
			</button>
		</div>
	{/if}
</div>

<style>
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
		min-height: 150px; /* Adjust as needed */
		justify-content: space-between; /* Push content vertically */
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-bottom: 20px; /* Space below title */
	}

	.card-title {
		font-size: 16px;
		color: #777;
		margin: 0;
	}

	.key-row {
		display: flex;
		gap: 12px; /* Reduced gap */
		align-items: center;
		width: 100%;
	}

	.key {
		padding: 10px 14px; /* Adjusted padding */
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		flex-grow: 1;
		overflow: hidden; /* Prevent key overflow */
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.monospace {
		font-family: 'JetBrains Mono', monospace; /* Example monospace font */
		color: #eee;
		font-size: 14px; /* Slightly smaller key font */
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.4; /* Adjust line height for better centering */
		margin: 0;
	}

	.key-btn {
		display: flex; /* Center icon */
		align-items: center;
		justify-content: center;
		width: 36px; /* Fixed width */
		height: 36px; /* Fixed height */
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		padding: 0;
		background-color: rgba(255, 255, 255, 0.08);
		color: #ccc;
		cursor: pointer;
		flex-shrink: 0;
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}
	.key-btn:hover {
		background-color: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}
	.key-btn:disabled {
		cursor: default;
		opacity: 0.7;
	}
	.key-btn.refresh-btn:hover {
		color: #ff8787; /* Reddish tint on hover for refresh */
	}

	.no-key-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		flex-grow: 1; /* Take remaining space */
		padding: 16px 0;
	}

	.no-key-text {
		color: #aaa;
		margin-bottom: 16px;
		font-size: 14px;
	}

	.create-key-btn {
		border-radius: 8px;
		background: #fff;
		padding: 10px 20px;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}
	.create-key-btn:hover {
		background-color: #eee;
	}

	.btn-text {
		color: #111;
		font-size: 15px;
		font-weight: 500;
		line-height: 1;
	}

	.loading-placeholder {
		color: #aaa;
		font-size: 14px;
		text-align: center;
		flex-grow: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style> 