/**
 * Authentication Module for EmoEdu
 * Handles user authentication and session management
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authListeners = [];
        
        // DOM Elements
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.loginModal = document.getElementById('login-modal');
        this.registerModal = document.getElementById('register-modal');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginError = document.getElementById('login-error');
        this.registerError = document.getElementById('register-error');
        this.authSection = document.getElementById('auth-section');
        this.userProfile = document.getElementById('user-profile');
        this.userName = document.getElementById('user-name');
        
        // Debug flag for mobile/cross-device testing
        this.debug = true;
        this.logDebug('Auth service initialized');
        
        // Initialize auth state
        this.init();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Log debug information
     * @param {string} message - Debug message
     * @param {Object} data - Optional data to log
     */
    logDebug(message, data) {
        if (this.debug) {
            console.log(`[Auth] ${message}`, data || '');
            
            // Add visual debug overlay for mobile testing if needed
            if (window.innerWidth < 768) {  // If on mobile
                let debugElement = document.getElementById('mobile-debug');
                if (!debugElement) {
                    debugElement = document.createElement('div');
                    debugElement.id = 'mobile-debug';
                    debugElement.style.position = 'fixed';
                    debugElement.style.bottom = '10px';
                    debugElement.style.left = '10px';
                    debugElement.style.right = '10px';
                    debugElement.style.background = 'rgba(0,0,0,0.7)';
                    debugElement.style.color = 'white';
                    debugElement.style.padding = '10px';
                    debugElement.style.fontSize = '12px';
                    debugElement.style.zIndex = '9999';
                    debugElement.style.maxHeight = '150px';
                    debugElement.style.overflow = 'auto';
                    document.body.appendChild(debugElement);
                }
                
                const logEntry = document.createElement('div');
                logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
                debugElement.appendChild(logEntry);
                
                // Keep only the last 10 messages
                while (debugElement.children.length > 10) {
                    debugElement.removeChild(debugElement.firstChild);
                }
            }
        }
    }
    
    /**
     * Initialize authentication state
     */
    async init() {
        // Check for token in localStorage
        const token = localStorage.getItem('token');
        
        this.logDebug('Initializing auth state, token exists:', !!token);
        
        if (token) {
            try {
                // Verify token and get user info
                this.logDebug('Validating token...');
                const response = await api.getCurrentUser();
                this.logDebug('Token validated, user retrieved', response.user);
                this.setCurrentUser(response.user);
            } catch (error) {
                this.logDebug('Token validation failed', error);
                console.error('Token validation failed:', error);
                this.logout();
            }
        }
    }
    
    /**
     * Setup event listeners for auth elements
     */
    setupEventListeners() {
        // Login button
        this.loginBtn.addEventListener('click', () => {
            this.showModal(this.loginModal);
        });
        
        // Register button
        this.registerBtn.addEventListener('click', () => {
            this.showModal(this.registerModal);
        });
        
        // Logout button
        this.logoutBtn.addEventListener('click', () => {
            this.logout();
        });
        
        // Login form
        this.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
        
        // Register form
        this.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
        
        // Close modal buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }
    
    /**
     * Show modal dialog
     * @param {HTMLElement} modal - Modal element to show
     */
    showModal(modal) {
        this.closeModals();
        modal.classList.add('active');
    }
    
    /**
     * Close all modals
     */
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        this.logDebug(`Attempting login for: ${email}`);
        
        try {
            this.loginError.textContent = 'Logging in...';
            const response = await api.login({ email, password });
            
            this.logDebug('Login successful', response);
            
            // Set token and user info
            api.setToken(response.token);
            this.setCurrentUser(response.user);
            
            // Clear form and close modal
            this.loginForm.reset();
            this.closeModals();
            
        } catch (error) {
            this.logDebug('Login failed', error);
            this.loginError.textContent = error.message || 'Login failed. Please check your credentials.';
        }
    }
    
    /**
     * Handle register form submission
     */
    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;
        
        try {
            const response = await api.register({ name, email, password, role });
            
            // Set token and user info
            api.setToken(response.token);
            this.setCurrentUser(response.user);
            
            // Clear form and close modal
            this.registerForm.reset();
            this.closeModals();
            
        } catch (error) {
            this.registerError.textContent = error.message || 'Registration failed. Please try again.';
        }
    }
    
    /**
     * Set current user and update UI
     * @param {Object} user - User object
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Update UI
        this.authSection.style.display = 'none';
        this.userProfile.style.display = 'flex';
        this.userName.textContent = user.name;
        
        // Notify listeners of auth state change
        this.notifyListeners();
    }
    
    /**
     * Logout user
     */
    logout() {
        // Clear auth state
        this.currentUser = null;
        this.isAuthenticated = false;
        api.clearToken();
        
        // Update UI
        this.authSection.style.display = 'flex';
        this.userProfile.style.display = 'none';
        
        // Notify listeners of auth state change
        this.notifyListeners();
    }
    
    /**
     * Add listener for auth state changes
     * @param {Function} listener - Callback function
     */
    addAuthListener(listener) {
        this.authListeners.push(listener);
        
        // Call listener immediately with current state
        listener(this.isAuthenticated, this.currentUser);
    }
    
    /**
     * Notify all listeners of auth state change
     */
    notifyListeners() {
        this.authListeners.forEach(listener => {
            listener(this.isAuthenticated, this.currentUser);
        });
    }
    
    /**
     * Get current user
     * @returns {Object|null} Current user or null if not authenticated
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    getIsAuthenticated() {
        return this.isAuthenticated;
    }
    
    /**
     * Check if current user is a teacher
     * @returns {boolean} True if user is a teacher
     */
    isTeacher() {
        return this.currentUser && this.currentUser.role === 'teacher';
    }
    
    /**
     * Check if current user is a student
     * @returns {boolean} True if user is a student
     */
    isStudent() {
        return this.currentUser && this.currentUser.role === 'student';
    }
    
    /**
     * Get current user ID
     * @returns {string|null} Current user ID or null if not authenticated
     */
    getCurrentUserId() {
        if (!this.currentUser) return null;
        
        // Some APIs return _id and some return id, check both
        return this.currentUser._id || this.currentUser.id || null;
    }
}

// Create single instance of Auth service
const auth = new AuthService();

// Export Auth service
window.auth = auth; 