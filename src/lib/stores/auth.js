// src/lib/stores/auth.js
import { writable } from 'svelte/store';
import { AuthApi } from '$lib/api/auth';
import { goto } from '$app/navigation';
import { languageTag } from '$lib/paraglide/runtime.js';

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
				if (languageTag === 'ru') {
					goto('/');
				} else {
					goto('/en');
				}
			} catch (error) {
				throw error;
			}
		},

		async register(email, password, location) {
			try {
				let source = null;
				try {
					const metricsData = localStorage.getItem('landing_page_metrics');
					if (metricsData) {
						source = metricsData;
					}
				} catch (e) {}
				await authApi.register(email, password, location, source);
				return this.login(email, password);
			} catch (error) {
        console.log(error)
				if (error.message === 'Too many requests') {
					throw new Error('Слишком много запросов. Пожалуйста, попробуйте позже.');
				}
				throw new Error('Такой email уже используется');
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
			if (languageTag === 'ru') {
				goto('/login');
			} else {
				goto('/en/login');
			}
		},

		// Initialize store from localStorage on app start
		initialize() {
			const token = localStorage.getItem('auth_token');
			try {
				if (token) {
					set({
						isAuthenticated: true,
						token,
						user: null // You might want to decode the JWT here
					});
				}
			} catch (e) {
				set({ isAuthenticated: false, token: null, user: null });
				goto('/login');
			}
		}
	};
}

export const authStore = createAuthStore();
