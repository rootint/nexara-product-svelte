<script lang="js">
	import { authStore } from '$lib/stores/auth';
	import { dashboardStore } from '$lib/stores/dashboard';
	import Header from '../components/Header.svelte';
	// Optional: Import goto for navigation after successful registration
	// import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let error = '';
	// Initialize location to match the placeholder option value
	let location = ''; // <-- Changed initial value

	async function handleSubmit() {
		// Reset error on new submission
		error = '';
		try {
			// --- Location Validation ---
			if (!location) {
				// Check if location is still the default empty string
				throw new Error('Пожалуйста, выберите ваш регион.');
			}

			// --- Password Validation ---
			if (password !== confirmPassword) {
				throw new Error('Пароли не совпадают.');
			}

			// --- API Calls ---
			// Wait for registration to complete successfully
			await authStore.register(email, password);

			// Only create API key if registration was successful
			// authStore.register should ideally throw an error on failure
			// which would be caught by the catch block below.
			await dashboardStore.createApiKey(location); // location is 'ru' or 'row'

			// --- Success Navigation (Optional) ---
			// Clear form fields?
			// email = ''; password = ''; confirmPassword = ''; location = '';
			// await goto('/dashboard'); // Or wherever you want to redirect
		} catch (e) {
			// Check if error object has a specific detail field from API response
			if (e.response && e.response.data && e.response.data.detail) {
				error = e.response.data.detail;
			} else if (e.message) {
				error = e.message; // Use message from thrown Error or other generic errors
			} else {
				error = 'Произошла неизвестная ошибка при регистрации.'; // Fallback error
			}
		}
	}
</script>

<svelte:head>
	<title>Зарегистрироваться в Nexara</title>
</svelte:head>

<Header></Header>

<section class="login">
	<div class="card">
		<h2>Зарегистрироваться</h2>
		<form on:submit|preventDefault={handleSubmit}>
			<p>Email</p>
			<input type="email" bind:value={email} placeholder="test@mail.ru" required />
			<p>Пароль</p>
			<input type="password" bind:value={password} placeholder="password" required />
			<p>Подтвердите пароль</p>
			<input type="password" bind:value={confirmPassword} placeholder="password" required />

			<!-- Location Dropdown -->
			<p>Регион</p>
			<select bind:value={location} required>
				<option value="" disabled selected>-- Выберите регион --</option>
				<option value="ru">Россия</option>
				<option value="row">Другая страна</option>
			</select>
			<!-- End Location Dropdown -->

			{#if error}
				<p class="error">{error}</p>
			{/if}
			<button type="submit"><p class="btn-text">Зарегистрироваться</p></button>
		</form>
		<p class="register-text">Уже есть аккаунт? <a href="/login">Войти</a></p>
	</div>
</section>

<style>
	/* Existing styles */
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
		margin-top: 16px; /* Added margin */
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
		margin-top: 10px;
		text-align: center;
	}
	input,
	select {
		/* Apply input styles to select */
		width: 100%;
		background-color: rgba(255, 255, 255, 0.02);
		border: solid 1px rgba(255, 255, 255, 0.11);
		border-radius: 12px;
		padding: 16px 16px;
		margin-bottom: 24px;
		outline: none;
		color: #fff; /* Ensure text is visible */
		/* Add appearance reset for better cross-browser consistency if needed */
		/* -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none; */
	}
	/* Style the placeholder option */
	select option[disabled] {
		color: #777;
	}
	/* Style the actual options */
	select option {
		background-color: #222; /* Dark background for dropdown */
		color: #fff;
	}
	input:focus,
	select:focus {
		/* Apply focus styles to select */
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
		width: 90%; /* Ensure card shrinks on smaller screens */
	}
	form {
		display: flex;
		flex-direction: column;
		width: 100%;
		margin-bottom: 24px;
	}
</style>
