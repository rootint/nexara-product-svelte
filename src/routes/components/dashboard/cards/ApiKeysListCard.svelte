<script>
	import { onMount } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy, Eye, EyeOff, Plus, X } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let visibleKeys = {};
	let copiedKey = null;
	let showModal = false;
	let newKeyName = '';
	let isCreating = false;

	onMount(async () => {
		try {
			await dashboardStore.fetchApiKeys();
		} catch (error) {
			console.error('Failed to fetch API keys:', error);
		}
	});

	function toggleKeyVisibility(index) {
		visibleKeys[index] = !visibleKeys[index];
		visibleKeys = visibleKeys;
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
		if (!key) return '';
		if (key.length <= 8) return '••••••••';
		return key.substring(0, 4) + '••••••••••••••••' + key.substring(key.length - 4);
	}

	function openModal() {
		showModal = true;
		newKeyName = '';
	}

	function closeModal() {
		showModal = false;
		newKeyName = '';
	}

	async function handleCreateKey() {
		if (!newKeyName.trim()) return;
		
		isCreating = true;
		try {
			await dashboardStore.createApiKey($dashboardStore.location, newKeyName.trim());
			await dashboardStore.fetchApiKeys();
			closeModal();
		} catch (error) {
			console.error('Failed to create API key:', error);
		} finally {
			isCreating = false;
		}
	}

	function handleKeydown(event) {
		if (!showModal) return;
		if (event.key === 'Escape') {
			closeModal();
		} else if (event.key === 'Enter' && newKeyName.trim() && !isCreating) {
			handleCreateKey();
		}
	}
</script>

<div class="card">
	<div class="card-header">
		<p class="card-title">{m.db_api_keys_title()}</p>
	</div>

	{#if $dashboardStore.apiKeysLoading}
		<p class="loading-text">{m.db_api_keys_loading()}</p>
	{:else if $dashboardStore.apiKeysError}
		<p class="error-text">{$dashboardStore.apiKeysError}</p>
	{:else if $dashboardStore.apiKeys && $dashboardStore.apiKeys.length > 0}
		<div class="keys-list">
			<div class="list-header">
				<span class="col-name">{m.db_api_keys_name()}</span>
				<span class="col-key">{m.db_api_keys_key()}</span>
				<span class="col-created">{m.db_api_keys_created()}</span>
				<span class="col-actions"></span>
			</div>
			{#each $dashboardStore.apiKeys as apiKey, index}
				<div class="key-item">
					<span class="col-name">{apiKey.name || '-'}</span>
					<span class="col-key monospace">
						{visibleKeys[index] ? apiKey.api_key : maskKey(apiKey.api_key)}
					</span>
					<span class="col-created">{formatDate(apiKey.created_at)}</span>
					<span class="col-actions">
						<button class="action-btn" on:click={() => copyKey(apiKey.api_key, index)}>
							{#if copiedKey === index}
								<Check size={16} />
							{:else}
								<Copy size={16} />
							{/if}
						</button>
						<button class="action-btn" on:click={() => toggleKeyVisibility(index)}>
							{#if visibleKeys[index]}
								<EyeOff size={16} />
							{:else}
								<Eye size={16} />
							{/if}
						</button>
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="empty-text">{m.db_api_keys_empty()}</p>
	{/if}

	<button class="create-btn" on:click={openModal}>
		<Plus size={18} />
		<span>{m.db_api_keys_create()}</span>
	</button>
</div>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="modal-container">
		<button class="modal-backdrop" on:click={closeModal} type="button" aria-label="Close modal"></button>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h3>{m.db_api_keys_create_title()}</h3>
				<button class="close-btn" on:click={closeModal} type="button">
					<X size={20} />
				</button>
			</div>
			<div class="modal-body">
				<input
					type="text"
					bind:value={newKeyName}
					placeholder={m.db_api_keys_name_placeholder()}
					class="name-input"
				/>
			</div>
			<div class="modal-footer">
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
			</div>
		</div>
	</div>
{/if}

<style>
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
	}

	.list-header {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr auto;
		gap: 16px;
		padding: 12px 16px;
		font-size: 14px;
		color: rgba(250, 250, 250, 0.5);
		border-bottom: 1px solid rgba(250, 250, 250, 0.1);
	}

	.key-item {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr auto;
		gap: 16px;
		padding: 12px 16px;
		background-color: rgba(250, 250, 250, 0.02);
		border-radius: 12px;
		align-items: center;
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

		.col-created::before {
			content: 'Created: ';
			color: rgba(250, 250, 250, 0.5);
		}

		.col-actions {
			justify-content: flex-start;
		}
	}
</style>
