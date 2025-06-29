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

	async function handleSubmit() {
		try {
			await authStore.login(email, password);
			// Success - authStore will handle navigation
		} catch (e) {
			error = 'Неправильный логин или пароль';
		}
	}

	// TODO: redirect to dashboard if the user is already logged on,
	// but also check for token expiration
	onMount(() => {
		if ($authStore.isAuthenticated) {
			if (languageTag === 'ru') {
				goto('/');
			} else {
				goto('/en');
			}
		}
	});
</script>

<svelte:head>
	<title>Nexara Dashboard</title>
</svelte:head>

<Header></Header>

<section class="login">
	<div class="card">
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
			<!-- <MainButton text="Войти" ></MainButton> -->
		</form>
	</div>
</section>

<style>
	.register-text {
		width: 100%;
		text-align: center;
		color: #777;
	}
	a {
		color: var(--primary);
	}
	button {
		background-color: var(--primary);
		padding: 16px 42px;
		border-radius: var(--border-radius);
		border: none;
		cursor: pointer;
		min-width: 274px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-text {
		margin-bottom: 0;
		color: var(--btn-text);
		font-weight: 450;
		font-size: 16px;
		background-color: none;
	}
	.error {
		color: #ca2a2a;
	}
	input {
		width: 100%;
		/* background-color: rgba(255, 255, 255, 0.02); */
		background-color: var(--card-bg-color);
		border: 1px solid var(--border-color);
		/* border: solid 1px rgba(255, 255, 255, 0.11); */
		border-radius: var(--border-radius);
		padding: 16px 16px;
		margin-bottom: 24px;
		outline: none;
	}
	input:focus {
		/* border: 1px solid #ffffff; */
		border: 1px solid var(--primary);
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
		background-color: var(--card-bg-color);
	}
	form {
		display: flex;
		flex-direction: column;
		width: 100%;
		margin-bottom: 24px;
	}
</style>
