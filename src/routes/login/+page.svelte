<script>
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import { goto } from '$app/navigation';
	import { on } from 'svelte/events';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';

	let email = '';
	let password = '';
	let error = '';
	let forgotMode = false;
	let forgotEmail = '';
	let forgotStatus = '';
	let forgotLoading = false;

	async function handleSubmit() {
		try {
			await authStore.login(email, password);
			// Success - authStore will handle navigation
		} catch (e) {
			error = 'Неправильный логин или пароль';
		}
	}

	async function handleForgotPassword() {
		forgotLoading = true;
		forgotStatus = '';
		try {
			await authStore.forgotPassword(forgotEmail);
			forgotStatus = 'ok';
		} catch (e) {
			forgotStatus = 'error';
		} finally {
			forgotLoading = false;
		}
	}

	// Redirect to the dashboard if the user is already logged in. initialize()
	// hydrates the store from the persisted token — without it, isAuthenticated
	// is always false here (it's only initialized inside the app layout).
	onMount(() => {
		authStore.initialize();
		if ($authStore.isAuthenticated) {
			if (languageTag() === 'ru') {
				goto('/');
			} else {
				goto('/en');
			}
		}
	});
</script>

<svelte:head>
	<title>Nexara Dashboard</title>
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
		{#if forgotMode}
			<h2>Восстановление пароля</h2>
			{#if forgotStatus === 'ok'}
				<p class="hint">Если этот email зарегистрирован, мы отправили на него ссылку для сброса пароля.</p>
				<button type="button" on:click={() => { forgotMode = false; forgotStatus = ''; }}>
					<p class="btn-text">Вернуться ко входу</p>
				</button>
			{:else}
				<form on:submit|preventDefault={handleForgotPassword}>
					<p>Email</p>
					<input type="email" bind:value={forgotEmail} placeholder={m.auth_email_placeholder()} required />
					{#if forgotStatus === 'error'}
						<p class="error">Произошла ошибка. Попробуйте позже.</p>
					{/if}
					<button type="submit" disabled={forgotLoading}>
						<p class="btn-text">{forgotLoading ? 'Отправка...' : 'Отправить ссылку'}</p>
					</button>
				</form>
				<p class="register-text">
					<a href="/" on:click|preventDefault={() => { forgotMode = false; forgotStatus = ''; }}>Вернуться ко входу</a>
				</p>
			{/if}
		{:else}
			<h2>{m.auth_login_title()}</h2>
			<form on:submit|preventDefault={handleSubmit}>
				<p>Email</p>
				<input type="email" id="email" bind:value={email} placeholder={m.auth_email_placeholder()} />
				<p>{m.auth_password_label()}</p>
				<input type="password" id="password" bind:value={password} placeholder="password" />
				{#if error}
					<p class="error">{error}</p>
				{/if}
				<button type="submit"><p class="btn-text">{m.auth_login_title()}</p></button>
			</form>
			<p class="forgot-text">
				<a href="/" on:click|preventDefault={() => { forgotMode = true; forgotEmail = email; }}>Забыли пароль?</a>
			</p>
			<p class="register-text">
				{m.auth_no_account()} <a href="/register">{m.auth_register_title()}</a>
			</p>
		{/if}
	</div>
</section>

<style>
	.register-text,
	.forgot-text {
		width: 100%;
		text-align: center;
		color: #777;
	}
	.forgot-text {
		margin-bottom: 12px;
	}
	.hint {
		color: #aaa;
		margin-bottom: 24px;
	}
	a {
		color: #aaa;
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
	.btn-text {
		margin-bottom: 0;
		color: #111;
		font-weight: 450;
		font-size: 16px;
		background-color: none;
	}
	.error {
		color: #ca2a2a;
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
