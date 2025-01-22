// src/lib/stores/auth.js
import { writable } from 'svelte/store';
import { AuthApi } from '$lib/api/auth';
import { goto } from '$app/navigation';

// Create our auth store with initial state
function createAuthStore() {
	const { subscribe, set, update } = writable({
		isAuthenticated: false,
		user: null,
		token: null
	});

	const authApi = new AuthApi();

	return {
		subscribe,

		// Login action
		async login(email, password) {
			try {
				const response = await authApi.login(email, password);
				const token = response.access_token;

				// Store token in localStorage
				localStorage.setItem('auth_token', token);

				// Update store state
				set({
					isAuthenticated: true,
					token,
					user: email // Or decode JWT for more user info
				});

				goto('/');
			} catch (error) {
				throw error;
			}
		},

		// Register action
		async register(email, password) {
			try {
				await authApi.register(email, password);
				// After registration, log the user in
				return this.login(email, password);
			} catch (error) {
				throw new Error('Registration failed');
			}
		},

		// Logout action
		logout() {
			localStorage.removeItem('auth_token');
			set({
				isAuthenticated: false,
				user: null,
				token: null
			});
			goto('/login');
		},

		// Initialize store from localStorage on app start
		initialize() {
			const token = localStorage.getItem('auth_token');
			if (token) {
				set({
					isAuthenticated: true,
					token,
					user: null // You might want to decode the JWT here
				});
			}
		}
	};
}

export const authStore = createAuthStore();
