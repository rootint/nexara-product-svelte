import { env } from '$env/dynamic/public';
import { ApiClient } from '$lib/api/client';

// Base URL is set per environment via PUBLIC_API_BASE_URL (see .env.example).
// Falls back to prod so a missing/misconfigured var never points elsewhere.
const BASE_URL = env.PUBLIC_API_BASE_URL ?? 'https://api.nexara.ru';
const apiClient = new ApiClient(BASE_URL);

export class AuthApi {
	// Basic fetch wrapper for authentication requests
	async makeAuthRequest(endpoint, options) {
		const response = await fetch(`${BASE_URL}${endpoint}`, {
			...options,
			headers: {
				...options.headers
			}
		});
		if (response.status === 429) {
			throw new Error('Too many requests');
		}
		if (!response.ok) {
			// Surface the backend's reason (FastAPI-style `detail`) and status so
			// callers can distinguish e.g. "email already exists" from a weak
			// password or a server error, instead of collapsing them all.
			let detail;
			try {
				detail = (await response.json())?.detail;
			} catch (e) {
				// non-JSON error body — leave detail undefined
			}
			const message =
				typeof detail === 'string'
					? detail
					: typeof detail?.reason === 'string'
						? detail.reason
						: 'Auth request failed';
			const error = new Error(message);
			error.status = response.status;
			error.detail = detail;
			throw error;
		}
		return response.json();
	}

	// Login endpoint wrapper
	async login(email, password) {
		const formData = new URLSearchParams();
		formData.append('username', email);
		formData.append('password', password);

		return this.makeAuthRequest('/auth/jwt/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData
		});
	}

	async forgotPassword(email) {
		return this.makeAuthRequest('/auth/forgot-password', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email })
		});
	}

	async changePassword(currentPassword, newPassword) {
		const form = new FormData();
		form.append('current_password', currentPassword);
		form.append('new_password', newPassword);
		return apiClient.makeRequest('/change_password', { method: 'POST' }, null, form);
	}

	async resetPassword(token, password) {
		return this.makeAuthRequest('/auth/reset-password', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ token, password })
		});
	}

	async register(email, password, location, source) {
		const params = new URLSearchParams();
		if (location) params.append('location', location);
		if (source) params.append('source', source);
		const queryString = params.toString();
		const endpoint = `/auth/register${queryString ? `?${queryString}` : ''}`;

		return this.makeAuthRequest(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password })
		});
	}
}
