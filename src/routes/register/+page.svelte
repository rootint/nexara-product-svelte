<script lang="js">
	import { authStore } from '$lib/stores/auth';
	import Header from '../components/Header.svelte';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let error = '';

	async function handleSubmit() {
		try {
			if (password === confirmPassword) {
				await authStore.register(email, password);
			} else {
				throw Error('Пароли не совпадают');
			}
			// goto('/');
		} catch (e) {
			error = e.message;
		}
	}
</script>

<svelte:head>
	<title>Зарегистрироваться в Nexara</title>
</svelte:head>

<Header></Header>

<!-- 
{#if error}
	<p style="color: red;">{error}</p>
{/if}

<form on:submit|preventDefault={handleSubmit}>
	<div>
		<label for="email">Email:</label>
		<input type="email" id="email" bind:value={email} required />
	</div>
	<div>
		<label for="password">Password:</label>
		<input type="password" id="password" bind:value={password} required />
	</div>
	<div>
		<label for="confirm-password">Confirm Password:</label>
		<input type="password" id="confirm-password" bind:value={confirmPassword} required />
	</div>
	<button type="submit">Register</button>
</form>
<a href="/login">Login</a> -->

<section class="login">
	<div class="card">
		<h2>Зарегистрироваться</h2>
		<form on:submit|preventDefault={handleSubmit}>
			<p>Email</p>
			<input type="email" bind:value={email} placeholder="test@mail.ru" />
			<p>Пароль</p>
			<input type="password" bind:value={password} placeholder="password" />
            <p>Подтвердите пароль</p>
			<input type="password" bind:value={confirmPassword} placeholder="password" />
			{#if error}
				<p class="error">{error}</p>
			{/if}
			<button type="submit"><p class="btn-text">Зарегистрироваться</p></button>
			<!-- <MainButton text="Войти" ></MainButton> -->
		</form>
		<p class="register-text">Уже есть аккаунт? <a href="/login">Войти</a></p>
	</div>
</section>

<style>
	.register-text {
		width: 100%;
		text-align: center;
		color: #777;
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
