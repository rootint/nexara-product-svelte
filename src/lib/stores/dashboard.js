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
		error: null,
		apiKeys: [],
		apiKeysLoading: false,
		apiKeysError: null,
		dataLoaded: false
	});

	// const api = new ApiClient('http://api-test.nexara.ru');
	// const api = new ApiClient('http://42t.nexara.ru');
	const api = new ApiClient('https://api.nexara.ru');
	// const api = new ApiClient('http://localhost:8000');

	return {
		subscribe,

		async createApiKey(location, name) {
			update((state) => ({ ...state, apiKeysLoading: true, apiKeysError: null }));
			const formData = new FormData();

			formData.append('location', location);
			if (name) {
				formData.append('name', name);
			}

			try {
				const metricsData = localStorage.getItem('landing_page_metrics');
				if (metricsData) {
					const parsedMetrics = JSON.parse(metricsData);
					formData.append('source', JSON.stringify(parsedMetrics));
					console.log('Sending metrics data with API key creation:', parsedMetrics);
				}
			} catch (error) {
				console.warn('Failed to retrieve or parse metrics data:', error);
			}

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
					apiKeys: result.api_keys || result,
					apiKeysLoading: false
				}));

				return result;
			} catch (error) {
				update((state) => ({
					...state,
					apiKeysError: error.message,
					apiKeysLoading: false
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
					apiKeys: result.api_keys || [],
					isLoading: false,
					error: null,
					apiKeysLoading: false,
					apiKeysError: null,
					dataLoaded: true
				});
				return true;
			} catch (error) {
				console.log(error);
				update((state) => ({
					...state,
					error: error.message,
					isLoading: false,
					dataLoaded: false
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
		async transcribeFile(
			file,
			apiKey,
			enableDiarization,
			diarizationSetting,
			isRussian,
			numSpeakers,
			model = 'whisper-1'
		) {
			// Get the current API key directly from the store's value

			if (!apiKey) {
				throw new Error('API ключ не найден. Невозможно выполнить транскрибацию.');
			}
			if (!file) {
				throw new Error('Файл для транскрибации не предоставлен.');
			}

			const formData = new FormData();
			formData.append('model', model);
			formData.append('file', file, file.name); // Ensure filename is included
			formData.append('response_format', 'srt');
			formData.append('is_dashboard', true);
			formData.append('task', enableDiarization ? 'diarize' : 'transcribe');
			formData.append('diarization_setting', diarizationSetting);
			formData.append('language', isRussian ? 'ru' : '');
			console.log(formData);
			if (numSpeakers > 0) {
				formData.append('num_speakers', numSpeakers);
			}
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
		},

		async deleteApiKey(keyId) {
			update((state) => ({ ...state, apiKeysLoading: true, apiKeysError: null }));

			const token = localStorage.getItem('auth_token');
			if (!token) {
				update((state) => ({
					...state,
					apiKeysError: 'Auth token not found',
					apiKeysLoading: false
				}));
				throw new Error('Auth token not found');
			}

			try {
				const formData = new FormData();
				formData.append('key_id', keyId);

				const response = await fetch(`${api.baseUrl}/delete_key`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`
					},
					body: formData
				});

				if (!response.ok) {
					throw new Error('Failed to delete API key');
				}

				update((state) => ({
					...state,
					apiKeys: state.apiKeys.filter((key) => key.id !== keyId),
					apiKeysLoading: false
				}));

				return true;
			} catch (error) {
				update((state) => ({
					...state,
					apiKeysError: error.message,
					apiKeysLoading: false
				}));
				throw error;
			}
		},

		async getHistory(nDays = 30) {
			const CACHE_KEY = 'nexara_usage_history';
			const CACHE_TIMESTAMP_KEY = 'nexara_usage_history_timestamp';

			const token = localStorage.getItem('auth_token');
			if (!token) {
				throw new Error('Auth token not found');
			}

			try {
				const response = await fetch(`${api.baseUrl}/get_history/${nDays}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					localStorage.setItem(CACHE_KEY, JSON.stringify(data));
					localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
					return { data, fromCache: false };
				} else if (response.status === 429) {
					const cachedData = localStorage.getItem(CACHE_KEY);
					const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

					if (cachedData) {
						return {
							data: JSON.parse(cachedData),
							fromCache: true,
							cachedAt: cachedTimestamp ? new Date(parseInt(cachedTimestamp)) : null
						};
					} else {
						throw new Error('Rate limit exceeded and no cached data available');
					}
				} else {
					throw new Error('Failed to fetch usage history');
				}
			} catch (error) {
				const cachedData = localStorage.getItem(CACHE_KEY);
				const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

				if (cachedData) {
					return {
						data: JSON.parse(cachedData),
						fromCache: true,
						cachedAt: cachedTimestamp ? new Date(parseInt(cachedTimestamp)) : null
					};
				}

				console.error('Usage History Error:', error);
				throw error;
			}
		}
	};
}

export const dashboardStore = createDashboardStore();
