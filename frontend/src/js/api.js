/**
 * API Service for EmoEdu
 * Handles all API requests to the backend
 */
class ApiService {
    constructor() {
        // Base URL for API - determine dynamically based on current host
        const host = window.location.hostname;
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const protocol = window.location.protocol;
        
        // If we're on localhost, use port 5001, otherwise use current port
        // For HTTPS server, use same port (proxy is configured)
        const apiPort = window.location.protocol === 'https:' ? port : (host === 'localhost' ? '5001' : port);
        
        this.baseUrl = `${protocol}//${host}:${apiPort}/api`;
        this.token = localStorage.getItem('token') || '';
        
        console.log('API Service initialized with baseUrl:', this.baseUrl);
    }

    /**
     * Set authentication token
     * @param {string} token - JWT token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.token = '';
        localStorage.removeItem('token');
    }

    /**
     * Get request headers
     * @returns {Object} Headers object
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Make API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise} - Promise with response
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        console.log(`API ${method} request to ${url}`, data || '');

        try {
            const response = await fetch(url, options);
            
            // Add detailed logging for responses 
            console.log(`Response status: ${response.status} ${response.statusText}`);
            console.log(`Response headers:`, Object.fromEntries([...response.headers.entries()]));
            
            let responseData;
            
            try {
                const text = await response.text();
                console.log(`Raw response:`, text.substring(0, 500) + (text.length > 500 ? '...' : ''));
                
                try {
                    responseData = text ? JSON.parse(text) : {};
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    throw new Error(`Invalid server response: ${text.substring(0, 100)}...`);
                }
            } catch (textError) {
                console.error('Failed to read response text:', textError);
                responseData = { message: 'Could not read server response' };
                throw new Error('Network error: Could not read server response');
            }

            if (!response.ok) {
                const errorMessage = responseData.message || responseData.error || `Error: ${response.status} ${response.statusText}`;
                console.error(`API error (${response.status}):`, errorMessage, responseData);
                throw new Error(errorMessage);
            }

            console.log(`API ${method} response from ${endpoint}:`, responseData);
            return responseData;
        } catch (error) {
            console.error(`API request to ${url} failed:`, error);
            
            // Add detailed error reporting especially for network issues
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.error('Network error details:', {
                    url,
                    method,
                    message: 'This is likely a CORS, network, or server availability issue'
                });
                // Display error in mobile debug overlay
                if (window.innerWidth < 768) {
                    const debugElement = document.getElementById('mobile-debug');
                    if (debugElement) {
                        const logEntry = document.createElement('div');
                        logEntry.className = 'error';
                        logEntry.textContent = `API ERROR: ${error.message} (${url})`;
                        debugElement.appendChild(logEntry);
                    }
                }
            }
            
            throw error;
        }
    }

    // Auth API endpoints
    async register(userData) {
        return this.request('/auth/register', 'POST', userData);
    }

    async login(credentials) {
        return this.request('/auth/login', 'POST', credentials);
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async updateProfile(userData) {
        return this.request('/auth/profile', 'PUT', userData);
    }

    // Class API endpoints
    async getClasses() {
        return this.request('/class');
    }

    async getClass(classId) {
        return this.request(`/class/${classId}`);
    }

    async createClass(classData) {
        return this.request('/class', 'POST', classData);
    }

    async updateClass(classId, classData) {
        return this.request(`/class/${classId}`, 'PUT', classData);
    }

    async joinClass(classId) {
        return this.request(`/class/${classId}/join`, 'POST');
    }

    async startClass(classId) {
        return this.request(`/class/${classId}/start`, 'POST');
    }

    async endClass(classId) {
        return this.request(`/class/${classId}/end`, 'POST');
    }

    async recordEmotionData(classId, emotionData) {
        return this.request(`/class/${classId}/emotion`, 'POST', emotionData);
    }

    async getEmotionData(classId) {
        return this.request(`/class/${classId}/emotion`);
    }
}

// Create single instance of API service
const api = new ApiService();

// Export API service
window.api = api; 