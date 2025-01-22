// const BASE_URL = 'http://localhost:8000';
const BASE_URL = 'https://api-test.nexara.ru';

export class AuthApi {
	// Basic fetch wrapper for authentication requests
	async makeAuthRequest(endpoint, options) {
		const response = await fetch(`${BASE_URL}${endpoint}`, {
			...options,
			headers: {
				...options.headers
			}
		});
		if (!response.ok) throw new Error('Auth request failed');
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

	// Register endpoint wrapper
	async register(email, password) {
		return this.makeAuthRequest('/auth/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password })
		});
	}
}
