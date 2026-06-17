<script>
	import { authStore } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Header from '../components/Header.svelte';
	import { languageTag } from '$lib/paraglide/runtime.js';

	let password = '';
	let passwordConfirm = '';
	let error = '';
	let status = '';
	let loading = false;

	$: token = $page.url.searchParams.get('token') ?? '';

	async function handleSubmit() {
		error = '';
		if (password !== passwordConfirm) {
			error = 'Пароли не совпадают';
			return;
		}
		if (!token) {
			error = 'Недействительная ссылка для сброса пароля';
			return;
		}
		loading = true;
		try {
			await authStore.resetPassword(token, password);
			status = 'ok';
		} catch (e) {
			error = 'Ссылка недействительна или истекла. Запросите новую.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Nexara — Сброс пароля</title>
	<meta name="description" content="Nexara" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Golos+Text:wght@400..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<Header></Header>

<section class="login">
	<div class="card">
		{#if status === 'ok'}
			<h2>Пароль изменён</h2>
			<p class="hint">Вы можете войти с новым паролем.</p>
			<button type="button" on:click={() => goto(languageTag === 'ru' ? '/login' : '/en/login')}>
				<p class="btn-text">Войти</p>
			</button>
		{:else}
			<h2>Новый пароль</h2>
			<form on:submit|preventDefault={handleSubmit}>
				<p>Новый пароль</p>
				<input type="password" bind:value={password} placeholder="Введите новый пароль" required />
				<p>Подтвердите пароль</p>
				<input type="password" bind:value={passwordConfirm} placeholder="Повторите пароль" required />
				{#if error}
					<p class="error">{error}</p>
				{/if}
				<button type="submit" disabled={loading}>
					<p class="btn-text">{loading ? 'Сохранение...' : 'Сохранить пароль'}</p>
				</button>
			</form>
		{/if}
	</div>
</section>

<style>
	.hint {
		color: #aaa;
		margin-bottom: 24px;
	}
	.error {
		color: #ca2a2a;
	}
	button {
		background-color: #fff;
		padding: 16px 42px;
		border-radius: 12px;
		border: none;
		cursor: pointer;
		min-width: 274px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-text {
		margin-bottom: 0;
		color: #111;
		font-weight: 450;
		font-size: 16px;
	}
	input {
		width: 100%;
		background-color: rgba(255, 255, 255, 0.02);
		border: solid 1px rgba(255, 255, 255, 0.11);
		border-radius: 12px;
		padding: 16px 16px;
		margin-bottom: 24px;
		outline: none;
	}
	input:focus {
		border: 1px solid #ffffff;
	}
	p {
		margin-bottom: 8px;
	}
	section {
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.card {
		max-width: 500px;
	}
	form {
		display: flex;
		flex-direction: column;
		width: 100%;
		margin-bottom: 24px;
	}
</style>
