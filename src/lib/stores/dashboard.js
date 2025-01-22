// src/lib/stores/dashboard.js
import { writable } from 'svelte/store';
import { ApiClient } from '$lib/api/client';

function createDashboardStore() {
	const { subscribe, set, update } = writable({
		email: null,
		apiKey: null,
		userId: null,
		personalPrice: null,
		credits: 0,
		isLoading: false,
		error: null
	});
  
	const api = new ApiClient('https://api-test.nexara.ru');
	// const api = new ApiClient('http://localhost:8000');

	return {
		subscribe,

		async createApiKey() {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await api.makeRequest('/create_key', {
					method: 'POST'
				});

				update((state) => ({
					...state,
					apiKeys: result,
					isLoading: false
				}));

				return result;
			} catch (error) {
				update((state) => ({
					...state,
					error: error.message,
					isLoading: false
				}));
				throw error;
			}
		},

		async loadDashboardData() {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await api.makeRequest('/view_account', {
					method: 'GET'
				});

				console.log(result);

				set({
					personalPrice: result.rate,
					email: result.email,
					apiKey: result.api_key,
					credits: result.credits,
					userId: result.user_id,
					isLoading: false,
					error: null
				});
			} catch (error) {
				update((state) => ({
					...state,
					error: error.message,
					isLoading: false
				}));
			}
		},

		async getCredits(amount, apiKey) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				console.log(apiKey);
				console.log(amount);
				const result = await api.makeRequest(
					'/pay',
					{
						method: 'POST'
					},
					{
						api_key: apiKey,
						rubles: amount
					}
				);
			} catch (error) {
				update((state) => ({
					...state,
					error: error.message,
					isLoading: false
				}));
			}
		}
	};
}

export const dashboardStore = createDashboardStore();
