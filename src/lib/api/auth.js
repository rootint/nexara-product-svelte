// const BASE_URL = 'http://localhost:8000';
const BASE_URL = 'https://api.nexara.ru';
// const BASE_URL = 'http://api-test.nexara.ru';
// const BASE_URL = 'http://42t.nexara.ru';

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
			throw new Error('Auth request failed');
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
