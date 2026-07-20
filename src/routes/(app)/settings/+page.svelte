<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';

	// --- Local transcription retention (this browser only) ---
	let retention = 'never';
	let retentionSaved = false;
	let retentionSavedTimer;
	onMount(() => {
		retention = dashboardStore.getTranscriptRetention();
	});
	function handleRetentionChange() {
		dashboardStore.setTranscriptRetention(retention);
		retentionSaved = true;
		clearTimeout(retentionSavedTimer);
		retentionSavedTimer = setTimeout(() => (retentionSaved = false), 2500);
	}

	let currentPassword = '';
	let newPassword = '';
	let error = '';
	let success = false;
	let loading = false;

	// --- Low-balance notification ---
	let notifyEnabled = false;
	let notifyAmount = '';
	let notifyError = '';
	let notifySuccess = false;
	let notifyLoading = false;
	// Track which threshold value we've synced from the store so we don't clobber
	// the user's edits on every store update.
	let syncedThreshold;

	$: currency = $dashboardStore.location === 'ru' ? '₽' : '€';

	// Initialise the form from the loaded account data once it's available.
	$: if ($dashboardStore.dataLoaded && $dashboardStore.notify_threshold !== syncedThreshold) {
		syncedThreshold = $dashboardStore.notify_threshold;
		notifyEnabled = syncedThreshold !== null;
		notifyAmount = syncedThreshold === null ? '' : String(syncedThreshold);
	}

	async function handleChangePassword() {
		error = '';
		success = false;
		loading = true;
		try {
			await authStore.changePassword(currentPassword, newPassword);
			success = true;
			currentPassword = '';
			newPassword = '';
		} catch (e) {
			error = 'Неверный текущий пароль или ошибка сервера';
		} finally {
			loading = false;
		}
	}

	async function handleSaveNotify() {
		notifyError = '';
		notifySuccess = false;

		let threshold = null;
		if (notifyEnabled) {
			const value = Number(notifyAmount);
			if (notifyAmount === '' || Number.isNaN(value) || value < 0) {
				notifyError = 'Введите корректную сумму (число не меньше 0)';
				return;
			}
			threshold = value;
		}

		notifyLoading = true;
		try {
			await dashboardStore.updateNotifyThreshold(threshold);
			syncedThreshold = threshold;
			notifySuccess = true;
		} catch (e) {
			notifyError = 'Не удалось сохранить настройку';
		} finally {
			notifyLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Nexara — Настройки</title>
	<meta name="description" content="Nexara Settings" />
</svelte:head>

<div class="main-container">
	<div class="card-cols">
		<div class="card-col">
			<div class="card">
				<div class="card-header">
					<p class="card-title">Смена пароля</p>
				</div>
				<form on:submit|preventDefault={handleChangePassword}>
					<p class="label">Текущий пароль</p>
					<input
						type="password"
						bind:value={currentPassword}
						placeholder="Введите текущий пароль"
						required
					/>
					<p class="label">Новый пароль</p>
					<input
						type="password"
						bind:value={newPassword}
						placeholder="Введите новый пароль"
						required
					/>
					{#if error}
						<p class="error">{error}</p>
					{/if}
					{#if success}
						<p class="success">Пароль успешно изменён</p>
					{/if}
					<button type="submit" class="save-btn" disabled={loading}>
						<p class="btn-text">{loading ? 'Сохранение...' : 'Сменить пароль'}</p>
					</button>
				</form>
			</div>

			<div class="card">
				<div class="card-header">
					<p class="card-title">Хранение транскрибаций</p>
				</div>
				<p class="hint">
					Результаты транскрибаций из дашборда сохраняются локально в этом браузере, чтобы вы могли
					открывать их даже после того, как сервер удалит их (через 12 часов). Здесь можно настроить
					автоматическое удаление локальной копии. Настройка хранится только на этом устройстве и не
					влияет на другие браузеры.
				</p>
				<p class="label">Автоматически удалять</p>
				<select bind:value={retention} on:change={handleRetentionChange}>
					<option value="1d">Через 1 день</option>
					<option value="7d">Через 7 дней</option>
					<option value="30d">Через 30 дней</option>
					<option value="never">Никогда</option>
				</select>
				{#if retentionSaved}
					<p class="success">Настройка сохранена</p>
				{/if}
			</div>
		</div>

		<div class="card-col">
			<div class="card">
				<div class="card-header">
					<p class="card-title">Уведомление о низком балансе</p>
				</div>
				<form on:submit|preventDefault={handleSaveNotify}>
					<p class="balance">
						Текущий баланс: {$dashboardStore.credits.toLocaleString(
							$dashboardStore.location === 'ru' ? 'ru-RU' : 'en-GB',
							{ minimumFractionDigits: 0, maximumFractionDigits: 2 }
						)}
						{currency}
					</p>
					<p class="hint">
						{#if syncedThreshold === null}
							Уведомления сейчас выключены.
						{:else}
							Уведомление придёт, когда баланс опустится до {syncedThreshold} {currency}.
						{/if}
					</p>

					<label class="checkbox-row">
						<input type="checkbox" bind:checked={notifyEnabled} />
						<span>Уведомлять по email при низком балансе</span>
					</label>

					<p class="label">Порог ({currency})</p>
					<input
						type="number"
						min="0"
						step="any"
						bind:value={notifyAmount}
						placeholder="Например, 500"
						disabled={!notifyEnabled}
					/>

					{#if notifyError}
						<p class="error">{notifyError}</p>
					{/if}
					{#if notifySuccess}
						<p class="success">Настройка сохранена</p>
					{/if}
					<button type="submit" class="save-btn" disabled={notifyLoading}>
						<p class="btn-text">{notifyLoading ? 'Сохранение...' : 'Сохранить'}</p>
					</button>
				</form>
			</div>
		</div>
	</div>
</div>

<style>
	.main-container {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	.card-cols {
		display: flex;
		gap: 32px;
		align-items: flex-start;
	}
	.card-col {
		display: flex;
		flex-direction: column;
		gap: 32px;
		width: 50%;
	}
	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
	}
	.card-header {
		margin-bottom: 24px;
	}
	.card-title {
		color: rgba(250, 250, 250, 0.5);
	}
	form {
		display: flex;
		flex-direction: column;
		/* The card uses align-items: start, so the form shrink-wraps to its widest
		   child (the 480px input). Cap it to the card width so it (and the
		   full-width submit button) can't overflow on narrow screens; on desktop
		   the form still sizes to the 480px inputs. */
		max-width: 100%;
	}
	.label {
		margin-bottom: 8px;
	}
	.balance {
		margin-bottom: 4px;
	}
	.hint {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
		margin-bottom: 16px;
	}
	.checkbox-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
		cursor: pointer;
	}
	.checkbox-row input {
		width: 18px;
		height: 18px;
		margin: 0;
		padding: 0;
		cursor: pointer;
		flex-shrink: 0;
	}
	input {
		width: 480px; /* adjust to taste */
		max-width: 100%;
		border: 1px solid rgba(250, 250, 250, 0.11);
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgba(250, 250, 250, 0.03);
		font-size: 16px;
		outline: none;
		margin-bottom: 16px;
		box-sizing: border-box;
	}
	input:focus {
		border-color: rgba(250, 250, 250, 0.3);
	}
	select {
		width: 480px;
		max-width: 100%;
		border: 1px solid rgba(250, 250, 250, 0.11);
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgba(250, 250, 250, 0.03);
		color: inherit;
		font-size: 16px;
		outline: none;
		margin-bottom: 16px;
		box-sizing: border-box;
		cursor: pointer;
	}
	select:focus {
		border-color: rgba(250, 250, 250, 0.3);
	}
	select option {
		color: #111;
	}
	input:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.save-btn {
		margin-top: 8px;
		background-color: rgba(250, 250, 250);
		border-radius: 12px;
		padding: 12px 20px;
		border: none;
		outline: none;
		cursor: pointer;
	}
	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-text {
		color: #111;
		font-size: 16px;
		margin: 0;
	}
	.error {
		color: rgba(255, 100, 100, 0.9);
		font-size: 14px;
		margin-bottom: 8px;
	}
	.success {
		color: rgba(100, 220, 100, 0.9);
		font-size: 14px;
		margin-bottom: 8px;
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
