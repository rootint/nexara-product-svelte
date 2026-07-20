// src/lib/stores/dashboard.js
import { writable } from 'svelte/store';
import { env } from '$env/dynamic/public';
import { ApiClient } from '$lib/api/client';

// Short, stable per-user fingerprint derived from the auth token. Used to
// namespace browser-local caches so one user's data can't be read back by the
// next user who signs in on the same browser. Not security-sensitive — it only
// needs to differ between users, so a simple non-cryptographic hash is fine.
function hashToken(token) {
	let h = 0;
	for (let i = 0; i < token.length; i++) {
		h = (Math.imul(31, h) + token.charCodeAt(i)) | 0;
	}
	return (h >>> 0).toString(36);
}

function createDashboardStore() {
	const { subscribe, set, update } = writable({
		email: null,
		apiKey: null,
		userId: null,
		personalPrice: null,
		overdraft_limit: 0,
		credits: 0,
		notify_threshold: null,
		isLoading: false,
		location: null,
		error: null,
		apiKeys: [],
		apiKeysLoading: false,
		apiKeysError: null,
		dataLoaded: false,
		asyncJobs: []
	});

	// localStorage key for remembered async transcription jobs. The backend keeps
	// results for 12h; we persist the ids/metadata AND the full result so users can
	// re-open completed jobs indefinitely (even after the backend deletes them) and
	// resume polling in-progress ones across reloads. All local to this browser.
	const ASYNC_JOBS_KEY = 'nexara_async_jobs';
	// Local auto-delete preference for cached transcriptions: '1d' | '7d' | '30d' | 'never'.
	// Default to a finite window so full transcript text doesn't linger on shared
	// machines indefinitely; users can opt into 'never' explicitly in settings.
	const RETENTION_KEY = 'nexara_transcript_retention';
	const RETENTION_DAYS = { '1d': 1, '7d': 7, '30d': 30 };
	const DEFAULT_RETENTION = '7d';

	// Drop jobs older than the local retention window (based on completion, or
	// submission time as a fallback). 'never'/unknown keeps everything.
	function pruneByRetention(jobs) {
		let retention = DEFAULT_RETENTION;
		try {
			retention = localStorage.getItem(RETENTION_KEY) || DEFAULT_RETENTION;
		} catch (e) {
			/* ignore */
		}
		const days = RETENTION_DAYS[retention];
		if (!days) return jobs;
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
		return jobs.filter((j) => {
			const t = new Date(j.completedAt || j.createdAt).getTime();
			return isNaN(t) ? true : t >= cutoff;
		});
	}

	// Persist jobs to localStorage. Cached results can be large, so on a quota
	// error we progressively drop the result payload of the oldest jobs (keeping
	// their metadata) until it fits. Returns the (possibly trimmed) array.
	function persistAsyncJobs(jobs) {
		let attempt = jobs;
		for (;;) {
			try {
				localStorage.setItem(ASYNC_JOBS_KEY, JSON.stringify(attempt));
				return attempt;
			} catch (e) {
				// Find the oldest job (end of array = oldest) still holding a result.
				let idx = -1;
				for (let i = attempt.length - 1; i >= 0; i--) {
					if (attempt[i]?.result) {
						idx = i;
						break;
					}
				}
				if (idx === -1) return attempt; // nothing left to trim; keep in-memory only
				attempt = attempt.map((j, i) => (i === idx ? { ...j, result: null } : j));
			}
		}
	}

	// Base URL is set per environment via PUBLIC_API_BASE_URL (see .env.example).
	// Falls back to prod so a missing/misconfigured var never points elsewhere.
	const api = new ApiClient(env.PUBLIC_API_BASE_URL ?? 'https://api.nexara.ru');

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
					apiKeys: Array.isArray(result.api_keys)
						? result.api_keys
						: Array.isArray(result)
							? result
							: state.apiKeys,
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
				// Merge onto existing state (not set()) so browser-local fields like
				// asyncJobs survive a reload/refresh triggered by this call.
				update((state) => ({
					...state,
					personalPrice: result.rate,
					overdraft_limit: result.overdraft_limit ?? 0,
					email: result.email,
					apiKey: result.api_key,
					credits: result.credits,
					notify_threshold: result.notify_threshold ?? null,
					userId: result.user_id,
					location: result.location,
					apiKeys: result.api_keys || [],
					isLoading: false,
					error: null,
					apiKeysLoading: false,
					apiKeysError: null,
					dataLoaded: true
				}));
				return true;
			} catch (error) {
				update((state) => ({
					...state,
					error: error.message,
					isLoading: false,
					dataLoaded: false
				}));
				return false;
			}
		},

		// Update the low-balance notification threshold.
		// Pass a number (>= 0) to enable, or null to disable.
		// Note: to disable we must omit the `threshold` field entirely — sending
		// an empty string fails the backend's number validation.
		async updateNotifyThreshold(threshold) {
			const body = new URLSearchParams();
			if (threshold !== null && threshold !== undefined && threshold !== '') {
				body.append('threshold', String(threshold));
			}

			const token = localStorage.getItem('auth_token');
			if (!token) {
				throw new Error('Auth token not found');
			}

			const response = await fetch(`${api.baseUrl}/update_notify_threshold`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body
			});

			if (!response.ok) {
				let detail;
				try {
					detail = (await response.json())?.detail;
				} catch (e) {
					// response body was not JSON
				}
				throw new Error(detail || 'Failed to update notify threshold');
			}

			const normalized =
				threshold === null || threshold === undefined || threshold === ''
					? null
					: Number(threshold);
			update((state) => ({ ...state, notify_threshold: normalized }));

			return response.json();
		},

		// Redeem a promocode for the logged-in user. On success the credited
		// amount is added to the balance and we sync `credits` to the returned
		// (authoritative) balance. On failure we surface the server's `detail`
		// string, which is already a user-facing Russian message. The 422 case
		// has a nested (non-string) detail, so we fall back to a generic message.
		async applyPromocode(code) {
			const token = localStorage.getItem('auth_token');
			if (!token) {
				throw new Error('Auth token not found');
			}

			const response = await fetch(`${api.baseUrl}/apply_promocode`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code })
			});

			let data = null;
			try {
				data = await response.json();
			} catch (e) {
				// response body was not JSON
			}

			if (!response.ok) {
				const detail = typeof data?.detail === 'string' ? data.detail : null;
				throw new Error(detail || 'Неверный промокод');
			}

			update((state) => ({ ...state, credits: data.balance }));

			return data;
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
		// Submit an async transcription job. Returns immediately with
		// { job_id, status, created_at }; the actual result is fetched later via
		// fetchTranscriptionJob. Uses the same parameters as the old sync call.
		async submitTranscriptionJob(
			file,
			apiKey,
			enableDiarization,
			diarizationSetting,
			isRussian,
			numSpeakers,
			model = 'whisper-1',
			profanityFilter = false,
			roles = null
		) {
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
			formData.append('profanity_filter', profanityFilter);
			if (roles != null) {
				formData.append('roles', roles);
			}
			if (numSpeakers > 0) {
				formData.append('num_speakers', numSpeakers);
			}

			try {
				// Base URL is 'https://api.nexara.ru'; async submit endpoint.
				return await api.makeFormDataRequest(
					'/api/v1/audio/transcriptions/async',
					apiKey,
					formData
				);
			} catch (error) {
				console.error('Transcription submit error:', error);
				throw error;
			}
		},

		// Poll a single async job. Returns
		// { job_id, status, created_at, completed_at, result, error }.
		// Throws with error.status = 404 once the job has been deleted (>12h).
		async fetchTranscriptionJob(jobId, apiKey) {
			if (!jobId) {
				throw new Error('Job id is required.');
			}
			return api.makeApiKeyRequest(`/api/v1/audio/transcriptions/async/${jobId}`, apiKey);
		},

		// --- Remembered async jobs (localStorage) ---------------------------------

		loadAsyncJobs() {
			let jobs = [];
			try {
				const raw = localStorage.getItem(ASYNC_JOBS_KEY);
				if (raw) jobs = JSON.parse(raw);
				if (!Array.isArray(jobs)) jobs = [];
			} catch (e) {
				jobs = [];
			}
			jobs = persistAsyncJobs(pruneByRetention(jobs));
			update((state) => ({ ...state, asyncJobs: jobs }));
			return jobs;
		},

		saveAsyncJob(job) {
			update((state) => {
				const jobs = persistAsyncJobs(
					[job, ...(state.asyncJobs || []).filter((j) => j.jobId !== job.jobId)].slice(0, 50)
				);
				return { ...state, asyncJobs: jobs };
			});
		},

		updateAsyncJob(jobId, patch) {
			update((state) => {
				const jobs = persistAsyncJobs(
					(state.asyncJobs || []).map((j) => (j.jobId === jobId ? { ...j, ...patch } : j))
				);
				return { ...state, asyncJobs: jobs };
			});
		},

		removeAsyncJob(jobId) {
			update((state) => {
				const jobs = persistAsyncJobs((state.asyncJobs || []).filter((j) => j.jobId !== jobId));
				return { ...state, asyncJobs: jobs };
			});
		},

		// --- Local transcription retention preference ---
		getTranscriptRetention() {
			try {
				return localStorage.getItem(RETENTION_KEY) || DEFAULT_RETENTION;
			} catch (e) {
				return DEFAULT_RETENTION;
			}
		},

		setTranscriptRetention(value) {
			try {
				localStorage.setItem(RETENTION_KEY, value);
			} catch (e) {
				/* ignore */
			}
			// Apply the new window immediately to already-stored jobs.
			update((state) => {
				const jobs = persistAsyncJobs(pruneByRetention(state.asyncJobs || []));
				return { ...state, asyncJobs: jobs };
			});
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
			const token = localStorage.getItem('auth_token');
			if (!token) {
				throw new Error('Auth token not found');
			}

			// Scope the cache to the current user's token so a rate-limit/offline
			// fallback can never surface a previous user's data on this browser.
			const userScope = hashToken(token);
			const CACHE_KEY = `nexara_usage_history_${userScope}`;
			const CACHE_TIMESTAMP_KEY = `nexara_usage_history_timestamp_${userScope}`;

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
		},

		// Keyset-paginated, per-request billed usage feed (newest first).
		// Pass the previous response's `next_cursor` back as `cursor` for the
		// next (older) page. Returns the raw payload:
		//   { items, next_cursor, has_more, currency }
		async getUsage({ limit = 50, cursor } = {}) {
			const token = localStorage.getItem('auth_token');
			if (!token) {
				throw new Error('Auth token not found');
			}

			const params = new URLSearchParams();
			params.set('limit', String(limit));
			if (cursor != null) {
				params.set('cursor', String(cursor));
			}

			const response = await fetch(`${api.baseUrl}/get_usage?${params.toString()}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch usage history');
			}

			return response.json();
		}
	};
}

export const dashboardStore = createDashboardStore();
