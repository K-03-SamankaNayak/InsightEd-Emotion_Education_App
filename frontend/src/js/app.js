/**
 * Main App Module
 * Handles navigation and overall app functionality
 */
class App {
    constructor() {
        // Pages
        this.pages = {
            home: document.getElementById('home-page'),
            classes: document.getElementById('classes-page'),
            classDetail: document.getElementById('class-detail-page'),
            liveClass: document.getElementById('live-class-page'),
            profile: document.getElementById('profile-page')
        };
        
        // Navigation links
        this.navLinks = document.querySelectorAll('.nav-link');
        
        // Profile form elements
        this.profileNameInput = document.getElementById('profile-name-input');
        this.profileEmailInput = document.getElementById('profile-email-input');
        this.profilePasswordInput = document.getElementById('profile-password-input');
        this.profileForm = document.getElementById('profile-form');
        this.profileName = document.getElementById('profile-name');
        this.profileEmail = document.getElementById('profile-email');
        this.profileRole = document.getElementById('profile-role');
        
        // Other elements
        this.getStartedBtn = document.getElementById('get-started-btn');
        
        // Initialize app
        this.init();
    }
    
    /**
     * Initialize app
     */
    init() {
        // Setup navigation links
        this.setupNavigation();
        
        // Setup get started button
        this.getStartedBtn.addEventListener('click', () => {
            if (auth.getIsAuthenticated()) {
                this.navigateTo('classes');
            } else {
                auth.showModal(document.getElementById('register-modal'));
            }
        });
        
        // Listen for auth state changes
        auth.addAuthListener((isAuthenticated, user) => {
            if (isAuthenticated) {
                // Update profile page if user is authenticated
                this.updateProfilePage(user);
            }
        });
        
        // Setup profile form
        this.profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateProfile();
        });
    }
    
    /**
     * Setup navigation links
     */
    setupNavigation() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    }
    
    /**
     * Navigate to page
     * @param {string} pageName - Page name
     */
    navigateTo(pageName) {
        // Check if user is authenticated for restricted pages
        if ((pageName === 'classes' || pageName === 'profile') && !auth.getIsAuthenticated()) {
            auth.showModal(document.getElementById('login-modal'));
            return;
        }
        
        // Hide all pages
        Object.values(this.pages).forEach(page => {
            page.style.display = 'none';
        });
        
        // Show selected page
        if (this.pages[pageName]) {
            this.pages[pageName].style.display = 'block';
        }
        
        // Update active navigation link
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });
        
        // Special handling for pages
        if (pageName === 'classes') {
            // Reload classes if navigating to classes page
            window.classesManager.loadClasses();
        }
    }
    
    /**
     * Update profile page with user data
     * @param {Object} user - User object
     */
    updateProfilePage(user) {
        this.profileName.textContent = user.name;
        this.profileEmail.textContent = user.email;
        this.profileRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        
        this.profileNameInput.value = user.name;
        this.profileEmailInput.value = user.email;
        this.profilePasswordInput.value = '';
    }
    
    /**
     * Update user profile
     */
    async updateProfile() {
        const name = this.profileNameInput.value;
        const email = this.profileEmailInput.value;
        const password = this.profilePasswordInput.value;
        
        const userData = {
            name,
            email
        };
        
        if (password) {
            userData.password = password;
        }
        
        try {
            const response = await api.updateProfile(userData);
            
            // Update profile page
            this.updateProfilePage(response.user);
            
            // Update auth state
            auth.setCurrentUser(response.user);
            
            alert('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    }
}

// Create app instance
const app = new App();

// Export app
window.app = app; 