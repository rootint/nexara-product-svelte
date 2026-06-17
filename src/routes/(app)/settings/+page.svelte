<script>
	import { authStore } from '$lib/stores/auth';

	let currentPassword = '';
	let newPassword = '';
	let error = '';
	let success = false;
	let loading = false;

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
</script>

<svelte:head>
	<title>Nexara — Настройки</title>
	<meta name="description" content="Nexara Settings" />
</svelte:head>

<div class="main-container">
	<div class="card-cols">
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
	form {
		display: flex;
		flex-direction: column;
	}
	.label {
		margin-bottom: 8px;
	}
	input {
		width: 480px; /* adjust to taste */
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
</style>
