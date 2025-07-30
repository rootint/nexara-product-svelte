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
		location: null,
		error: null
	});

	// const api = new ApiClient('http://api-test.nexara.ru');
	const api = new ApiClient('https://api.nexara.ru');
	// const api = new ApiClient('http://localhost:8000');

	return {
		subscribe,

		async createApiKey(location) {
			update((state) => ({ ...state, isLoading: true, error: null }));
			const formData = new FormData();

			// 2. Append your data field(s)
			formData.append('location', location);
			try {
				const result = await api.makeRequest(
					'/create_key',
					{
						method: 'POST'
					},
					null,
					formData
				);

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

		async changeApiKey() {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await api.makeRequest('/change_key', {
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
				console.log('result', result);
				set({
					personalPrice: result.rate,
					email: result.email,
					apiKey: result.api_key,
					credits: result.credits,
					userId: result.user_id,
					location: result.location,
					isLoading: false,
					error: null
				});
				return true;
			} catch (error) {
				console.log(error);
				update((state) => ({
					...state,
					error: error.message,
					isLoading: false
				}));
				return false;
			}
		},

		async getCredits(amount, apiKey) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
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
		},
		async transcribeFile(file, apiKey, enableDiarization, diarizationSetting, isRussian) {
			// Get the current API key directly from the store's value

			if (!apiKey) {
				throw new Error('API ключ не найден. Невозможно выполнить транскрибацию.');
			}
			if (!file) {
				throw new Error('Файл для транскрибации не предоставлен.');
			}

			const formData = new FormData();
			formData.append('model', 'whisper-1');
			formData.append('file', file, file.name); // Ensure filename is included
			formData.append('response_format', 'srt');
			formData.append('is_dashboard', true);
			formData.append('task', enableDiarization ? 'diarize' : 'transcribe');
			formData.append('diarization_setting', diarizationSetting);
			formData.append('language', isRussian ? 'ru' : '');
			// Note: The ApiClient base URL is 'https://api.nexara.ru'
			// The required endpoint is '/api/v1/audio/transcriptions'
			// We need to call the correct endpoint path relative to the base URL.
			const endpoint = '/api/v1/audio/transcriptions';

			try {
				// Use the new makeFormDataRequest method
				const result = await api.makeFormDataRequest(endpoint, apiKey, formData);
				// Optionally, refresh user credits/data after transcription if credits are deducted server-side immediately
				// await this.loadDashboardData(); // Uncomment if needed
				return result; // Return the transcription result
			} catch (error) {
				console.error('Transcription Store Error:', error);
				// Re-throw the error so the component can catch it and display a message
				throw error;
			}
		}
	};
}

export const dashboardStore = createDashboardStore();
