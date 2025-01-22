// src/lib/api/client.js
export class ApiClient {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	// This method automatically injects the token into every request
	async makeRequest(endpoint, options = {}, body = null) {
		const token = localStorage.getItem('auth_token');

    const headers = {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : '',
    };

		if (body) {
			headers['Content-Type'] = 'application/json';
		}

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers,
			body: body ? JSON.stringify(body) : null
		});

		if (!response.ok) {
			if (response.status === 401) {
				// Token expired or invalid - redirect to login
				goto('/login');
			}
			throw new Error('API request failed');
		}

		return response.json();
	}
}
