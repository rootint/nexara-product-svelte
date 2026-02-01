<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy, Plus, X, Trash2 } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	export let historyData = null;
	export let historyLoading = false;

	let copiedKey = null;
	let showModal = false;
	let newKeyName = '';
	let isCreating = false;
	let newlyCreatedKey = null;

	let showDeleteModal = false;
	let keyToDelete = null;
	let isDeleting = false;

	function getKeyUsage(apiKey) {
		if (!historyData || !historyData.keys) return null;
		return historyData.keys.find((k) => k.key_id === apiKey.id || k.key_name === apiKey.name);
	}

	function formatCost(cost) {
		const currency = historyData?.currency || 'RUB';
		if (currency === 'RUB') {
			return `${cost.toFixed(2)} ₽`;
		}
		return `€${cost.toFixed(2)}`;
	}

	function formatMinutes(minutes) {
		return `${minutes.toFixed(2)} ${m.db_api_keys_minutes_suffix?.() || 'min'}`;
	}

	async function copyKey(key, index) {
		try {
			await navigator.clipboard.writeText(key);
			copiedKey = index;
			setTimeout(() => {
				copiedKey = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy API Key:', err);
		}
	}

	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function maskKey(key) {
		if (!key) return '-';
		if (key.length <= 7) return key;
		return key.slice(0, 7) + '••••••••••••';
	}

	function openModal() {
		showModal = true;
		newKeyName = '';
	}

	async function closeModal() {
		if (newlyCreatedKey) {
			await dashboardStore.loadDashboardData();
		}
		showModal = false;
		newKeyName = '';
		newlyCreatedKey = null;
	}

	async function handleCreateKey() {
		if (!newKeyName.trim()) return;

		isCreating = true;
		try {
			const result = await dashboardStore.createApiKey($dashboardStore.location, newKeyName.trim());
			if (result.api_key) {
				newlyCreatedKey = result.api_key;
			} else {
				await dashboardStore.loadDashboardData();
				closeModal();
			}
		} catch (error) {
			console.error('Failed to create API key:', error);
		} finally {
			isCreating = false;
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			if (showDeleteModal) {
				closeDeleteModal();
			} else if (showModal) {
				closeModal();
			}
		} else if (
			showModal &&
			event.key === 'Enter' &&
			newKeyName.trim() &&
			!isCreating &&
			!newlyCreatedKey
		) {
			handleCreateKey();
		}
	}

	function openDeleteModal(apiKey) {
		keyToDelete = apiKey;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		keyToDelete = null;
	}

	async function handleDeleteKey() {
		if (!keyToDelete) return;

		isDeleting = true;
		try {
			await dashboardStore.deleteApiKey(keyToDelete.id);
			closeDeleteModal();
		} catch (error) {
			console.error('Failed to delete API key:', error);
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="card">
	<div class="card-header">
		<p class="card-title">{m.db_api_keys_title()}</p>
	</div>

	{#if $dashboardStore.isLoading}
		<p class="loading-text">{m.db_api_keys_loading()}</p>
	{:else if $dashboardStore.apiKeysError}
		<p class="error-text">{$dashboardStore.apiKeysError}</p>
	{:else if $dashboardStore.apiKeys && $dashboardStore.apiKeys.length > 0}
		<div class="keys-list">
			<div class="list-header">
				<span class="col-name">{m.db_api_keys_name()}</span>
				<span class="col-key">{m.db_api_keys_key()}</span>
				<span class="col-usage">{m.db_api_keys_usage()}</span>
				<span class="col-created">{m.db_api_keys_created()}</span>
				<span class="col-actions"></span>
			</div>
			{#each $dashboardStore.apiKeys as apiKey, index}
				{@const usage = getKeyUsage(apiKey)}
				<div class="key-item">
					<span class="col-name">{apiKey.name || '-'}</span>
					<span class="col-key monospace">
						{maskKey(apiKey.api_key)}
					</span>
					<span class="col-usage">
						{#if historyLoading}
							<span class="usage-loading">...</span>
						{:else if usage}
							<span class="usage-value">{formatCost(usage.cost)}</span>
							<span class="usage-minutes">{formatMinutes(usage.minutes)}</span>
						{:else}
							<span class="usage-empty">-</span>
						{/if}
					</span>
					<span class="col-created">{formatDate(apiKey.created_at)}</span>
					<span class="col-actions">
						<button
							class="action-btn"
							on:click={() => copyKey(apiKey.api_key, index)}
							title="Copy full key"
						>
							{#if copiedKey === index}
								<Check size={16} />
							{:else}
								<Copy size={16} />
							{/if}
						</button>
						<button
							class="action-btn delete-btn"
							on:click={() => openDeleteModal(apiKey)}
							title={m.db_api_keys_delete()}
						>
							<Trash2 size={16} />
						</button>
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="empty-text">{m.db_api_keys_empty()}</p>
	{/if}

	<button class="buy-btn" on:click={openModal}>
		<span class="btn-text">{m.db_api_keys_create()}</span>
	</button>
</div>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="modal-container">
		<button class="modal-backdrop" on:click={closeModal} type="button" aria-label="Close modal"
		></button>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h3>
					{newlyCreatedKey
						? m.db_api_keys_created_title?.() || 'API Key Created'
						: m.db_api_keys_create_title()}
				</h3>
				<button class="close-btn" on:click={closeModal} type="button">
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				{#if newlyCreatedKey}
					<p class="key-warning">
						{m.db_api_keys_copy_warning?.() ||
							"Copy your API key now. You won't be able to see it again!"}
					</p>
					<div class="new-key-display">
						<span class="monospace">{newlyCreatedKey}</span>
						<button
							class="action-btn"
							on:click={() => copyKey(newlyCreatedKey, 'new')}
							type="button"
						>
							{#if copiedKey === 'new'}
								<Check size={16} />
							{:else}
								<Copy size={16} />
							{/if}
						</button>
					</div>
				{:else}
					<input
						type="text"
						bind:value={newKeyName}
						placeholder={m.db_api_keys_name_placeholder()}
						class="name-input"
					/>
				{/if}
			</div>
			<div class="modal-footer">
				{#if newlyCreatedKey}
					<button class="submit-btn" on:click={closeModal} type="button">
						{m.db_api_keys_done?.() || 'Done'}
					</button>
				{:else}
					<button class="cancel-btn" on:click={closeModal} type="button">
						{m.db_api_keys_cancel()}
					</button>
					<button
						class="submit-btn"
						on:click={handleCreateKey}
						disabled={!newKeyName.trim() || isCreating}
						type="button"
					>
						{isCreating ? m.db_api_keys_creating() : m.db_api_keys_create()}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if showDeleteModal}
	<div class="modal-container">
		<button
			class="modal-backdrop"
			on:click={closeDeleteModal}
			type="button"
			aria-label="Close modal"
		></button>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h3>{m.db_api_keys_delete_title()}</h3>
				<button class="close-btn" on:click={closeDeleteModal} type="button">
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<p class="delete-warning">
					{m.db_api_keys_delete_confirm({ keyName: keyToDelete?.name || '-' })}
				</p>
			</div>
			<div class="modal-footer">
				<button class="cancel-btn" on:click={closeDeleteModal} type="button">
					{m.db_api_keys_cancel()}
				</button>
				<button
					class="delete-confirm-btn"
					on:click={handleDeleteKey}
					disabled={isDeleting}
					type="button"
				>
					{isDeleting ? m.db_api_keys_deleting() : m.db_api_keys_delete()}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.btn-text {
		color: #111;
		font-size: 16px;
	}
	.buy-btn {
        margin-top: 24px;
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
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.card-header {
		margin-bottom: 24px;
	}

	.card-title {
		color: rgba(250, 250, 250, 0.5);
	}

	.loading-text,
	.error-text,
	.empty-text {
		color: rgba(250, 250, 250, 0.7);
		text-align: center;
		padding: 24px 0;
	}

	.error-text {
		color: rgba(255, 100, 100, 0.8);
	}

	.keys-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.list-header {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 80px;
		gap: 16px;
		padding: 12px 16px;
		font-size: 14px;
		color: rgba(250, 250, 250, 0.5);
		border-bottom: 1px solid rgba(250, 250, 250, 0.1);
	}

	.key-item {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1fr 80px;
		gap: 16px;
		padding: 12px 16px;
		background-color: rgba(250, 250, 250, 0.02);
		border-radius: 12px;
		align-items: center;
		width: 100%;
	}

	.key-item:hover {
		background-color: rgba(250, 250, 250, 0.04);
	}

	.col-name {
		font-weight: 450;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-key {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-created {
		color: rgba(250, 250, 250, 0.7);
		font-size: 14px;
	}

	.col-usage {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.usage-value {
		font-weight: 500;
		color: rgba(250, 250, 250, 0.9);
	}

	.usage-minutes {
		font-size: 12px;
		color: rgba(250, 250, 250, 0.5);
	}

	.usage-loading,
	.usage-empty {
		color: rgba(250, 250, 250, 0.4);
	}

	.col-actions {
		display: flex;
		gap: 8px;
	}

	.monospace {
		font-family: 'Fira Code', monospace;
		font-size: 14px;
	}

	.action-btn {
		outline: none;
		border: 1px solid rgba(250, 250, 250, 0.11);
		background-color: rgba(250, 250, 250, 0.05);
		padding: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		cursor: pointer;
		color: rgba(250, 250, 250, 0.8);
	}

	.action-btn:hover {
		background-color: rgba(250, 250, 250, 0.1);
	}

	.action-btn.delete-btn:hover {
		background-color: rgba(255, 100, 100, 0.15);
		border-color: rgba(255, 100, 100, 0.3);
		color: rgba(255, 100, 100, 0.9);
	}

	.create-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 24px;
		padding: 12px 24px;
		background-color: rgba(250, 250, 250, 1);
		color: #111;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		align-self: flex-start;
	}

	.create-btn:hover {
		background-color: rgba(250, 250, 250, 0.9);
	}

	.modal-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-backdrop {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		border: none;
		cursor: default;
	}

	.modal {
		position: relative;
		background-color: #1a1a1a;
		border-radius: 12px;
		padding: 24px;
		min-width: 400px;
		max-width: 90vw;
		border: 1px solid rgba(250, 250, 250, 0.1);
		z-index: 1;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 500;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(250, 250, 250, 0.7);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: rgba(250, 250, 250, 1);
	}

	.modal-body {
		margin-bottom: 24px;
	}

	.name-input {
		width: 100%;
		padding: 12px 16px;
		background-color: rgba(250, 250, 250, 0.05);
		border: 1px solid rgba(250, 250, 250, 0.1);
		border-radius: 12px;
		color: #fafafa;
		font-size: 16px;
		outline: none;
		box-sizing: border-box;
	}

	.name-input:focus {
		border-color: rgba(250, 250, 250, 0.3);
	}

	.name-input::placeholder {
		color: rgba(250, 250, 250, 0.4);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.cancel-btn {
		padding: 12px 24px;
		background-color: transparent;
		border: 1px solid rgba(250, 250, 250, 0.2);
		border-radius: 12px;
		color: #fafafa;
		font-size: 16px;
		cursor: pointer;
	}

	.cancel-btn:hover {
		background-color: rgba(250, 250, 250, 0.05);
	}

	.submit-btn {
		padding: 12px 24px;
		background-color: rgba(250, 250, 250, 1);
		border: none;
		border-radius: 12px;
		color: #111;
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
	}

	.submit-btn:hover:not(:disabled) {
		background-color: rgba(250, 250, 250, 0.9);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.key-warning {
		color: rgba(255, 180, 100, 0.9);
		font-size: 14px;
		margin-bottom: 16px;
	}

	.delete-warning {
		color: rgba(250, 250, 250, 0.8);
		font-size: 14px;
		line-height: 1.5;
	}

	.delete-confirm-btn {
		padding: 12px 24px;
		background-color: rgba(255, 100, 100, 0.9);
		border: none;
		border-radius: 12px;
		color: #fff;
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
	}

	.delete-confirm-btn:hover:not(:disabled) {
		background-color: rgba(255, 80, 80, 1);
	}

	.delete-confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.new-key-display {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background-color: rgba(250, 250, 250, 0.05);
		border: 1px solid rgba(250, 250, 250, 0.1);
		border-radius: 12px;
	}

	.new-key-display span {
		flex: 1;
		word-break: break-all;
	}

	@media (max-width: 768px) {
		.list-header {
			display: none;
		}

		.key-item {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.col-name::before {
			content: 'Name: ';
			color: rgba(250, 250, 250, 0.5);
		}

		.col-key::before {
			content: 'Key: ';
			color: rgba(250, 250, 250, 0.5);
		}

		.col-usage {
			flex-direction: row;
			gap: 8px;
			align-items: center;
		}

		.col-usage::before {
			content: 'Usage: ';
			color: rgba(250, 250, 250, 0.5);
		}

		.col-created::before {
			content: 'Created: ';
			color: rgba(250, 250, 250, 0.5);
		}

		.col-actions {
			justify-content: flex-start;
		}
	}
</style>
