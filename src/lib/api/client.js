// src/lib/api/client.js
import { goto } from '$app/navigation';
import { languageTag } from '$lib/paraglide/runtime.js';

// Clear the expired session and send the user back to login. Called whenever a
// session-authenticated request comes back 401 (token expired or revoked).
function handleSessionExpiry() {
	localStorage.removeItem('auth_token');
	goto(languageTag() === 'ru' ? '/login' : '/en/login');
}

export class ApiClient {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	// This method automatically injects the token into every request
	async makeRequest(endpoint, options = {}, body = null, form = null) {
		const token = localStorage.getItem('auth_token');

		const headers = {
			...options.headers,
			Authorization: token ? `Bearer ${token}` : ''
		};

		if (body) {
			headers['Content-Type'] = 'application/json';
		}

		let response;

		if (form) {
			response = await fetch(`${this.baseUrl}${endpoint}`, {
				...options,
				headers,
				body: form
			});
		} else {
			response = await fetch(`${this.baseUrl}${endpoint}`, {
				...options,
				headers,
				body: body ? JSON.stringify(body) : null
			});
		}

		if (!response.ok) {
			if (response.status === 401) {
				// Session token expired or invalid - clear it and redirect to login.
				handleSessionExpiry();
				throw new Error('Session expired');
			}
			throw new Error('API request failed');
		}

		return response.json();
	}

	// --- NEW METHOD for FormData requests with specific API Key ---
	async makeFormDataRequest(endpoint, apiKey, formData, options = {}) {
		if (!apiKey) {
			throw new Error('API Key is required for this request.');
		}

		const headers = {
			...options.headers, // Allow passing other headers if needed
			Authorization: `Bearer ${apiKey}`
			// DO NOT set Content-Type: 'multipart/form-data'.
			// The browser will set it automatically with the correct boundary
			// when the body is a FormData object.
		};

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: 'POST', // Usually POST for form data
			...options, // Allow overriding method, etc.
			headers,
			body: formData // Pass the FormData object directly
		});

		if (!response.ok) {
			let errorPayload = null;
			try {
				errorPayload = await response.json();
			} catch (e) {
				// Ignore if response body is not JSON
			}
			console.error('API FormData Error:', response.status, response.statusText, errorPayload);

			// Handle potential API key errors (e.g., 401, 403)
			if (response.status === 401 || response.status === 403) {
				throw new Error(
					errorPayload?.detail ||
						`API Key invalid or insufficient permissions (Status: ${response.status})`
				);
			}
			// Generic error for other issues
			throw new Error(errorPayload?.detail || `API request failed with status ${response.status}`);
		}

		if (response.status === 204) {
			return null;
		}

		// Assume successful transcription responses are JSON
		return response.json();
	}

	// --- API-key authed request without a body (e.g. GET job status) ---
	async makeApiKeyRequest(endpoint, apiKey, options = {}) {
		if (!apiKey) {
			throw new Error('API Key is required for this request.');
		}

		const headers = {
			...options.headers,
			Authorization: `Bearer ${apiKey}`
		};

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: 'GET',
			...options,
			headers
		});

		if (!response.ok) {
			let errorPayload = null;
			try {
				errorPayload = await response.json();
			} catch (e) {
				// Ignore if response body is not JSON
			}
			// Surface the HTTP status so callers can distinguish e.g. 404 (job
			// expired/deleted on the backend) from transient failures.
			const error = new Error(
				errorPayload?.detail || `API request failed with status ${response.status}`
			);
			error.status = response.status;
			throw error;
		}

		if (response.status === 204) {
			return null;
		}

		return response.json();
	}
}
