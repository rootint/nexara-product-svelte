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
				if (languageTag() === 'ru') {
					goto('/');
				} else {
					goto('/en');
				}
			} catch (error) {
				throw error;
			}
		},

		async forgotPassword(email) {
			await authApi.forgotPassword(email);
		},

		async resetPassword(token, password) {
			await authApi.resetPassword(token, password);
		},

		async changePassword(currentPassword, newPassword) {
			await authApi.changePassword(currentPassword, newPassword);
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
				if (error.message === 'Too many requests') {
					throw new Error('Слишком много запросов. Пожалуйста, попробуйте позже.');
				}
				// The common case is a duplicate email; keep the friendly message for
				// it, but surface the backend's actual reason (e.g. weak password) for
				// everything else instead of masking every failure as "email taken".
				const code = typeof error.detail === 'string' ? error.detail : error.detail?.code;
				if (code === 'REGISTER_USER_ALREADY_EXISTS') {
					throw new Error('Такой email уже используется');
				}
				if (error.message && error.message !== 'Auth request failed') {
					throw new Error(error.message);
				}
				throw new Error('Не удалось зарегистрироваться. Пожалуйста, попробуйте позже.');
			}
		},

		// Logout action
		logout() {
			localStorage.removeItem('auth_token');
			// Drop any cached per-user data (usage history + full transcription
			// text/results) so it can't be shown to the next user who signs in on
			// this browser.
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const key = localStorage.key(i);
				if (key && (key.startsWith('nexara_usage_history') || key === 'nexara_async_jobs')) {
					localStorage.removeItem(key);
				}
			}
			set({
				isAuthenticated: false,
				user: null,
				token: null
			});
			if (languageTag() === 'ru') {
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
