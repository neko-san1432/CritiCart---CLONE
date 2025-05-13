import { supabase } from './supabase.js';
import { config } from './config.js';

// reCAPTCHA configuration
const RECAPTCHA_SITE_KEY = config.recaptcha.siteKey;

window.addEventListener('DOMContentLoaded', () => {
    // Load reCAPTCHA script dynamically after config is loaded
    const recaptchaScript = document.createElement('script');
    recaptchaScript.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    recaptchaScript.async = true;
    recaptchaScript.defer = true;
    document.head.appendChild(recaptchaScript);

    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeButtons = document.querySelectorAll('.close');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });
    }
    if (registerBtn && registerModal) {
        registerBtn.addEventListener('click', () => {
            registerModal.style.display = 'block';
        });
    }
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'none';
            if (registerModal) registerModal.style.display = 'none';
        });
    });

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const result = await auth.login(email, password);
                if (result.success) {
                    loginModal.style.display = 'none';
                    loginForm.reset();
                }
            } catch (error) {
                console.error('Login error:', error);
            }
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const fullName = document.getElementById('registerName').value;
            
            try {
                const result = await auth.register(email, password, fullName);
                if (result.success) {
                    registerModal.style.display = 'none';
                    registerForm.reset();
                }
            } catch (error) {
                console.error('Registration error:', error);
            }
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    });
});

class AuthError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}

class Auth {
    constructor() {
        this.user = null;
        this.session = null;
        this.recaptchaInstances = {
            login: null,
            register: null
        };
        this.recaptchaInitialized = false;
        
        // Mock user credentials for development
        this.mockUser = {
            email: 'test@example.com',
            password: 'testpassword123'
        };

        // Mock profile data
        this.mockProfile = {
            username: 'testuser',
            full_name: 'Test User',
            bio: 'This is a test profile for development purposes.',
            website: 'https://example.com',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser',
            review_count: 3,
            comment_count: 5,
            like_count: 10
        };
    }

    async init() {
        try {
            console.log('Auth init started');
            // Check for existing session first
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                console.log('Found existing session:', session);
                this.session = session;
                this.user = session.user;
                this.updateUI();
            } else if (!this.isAuthenticated()) {
                console.log('No session found, attempting mock login');
                // Only try mock login if no session exists
                const { success } = await this.mockLogin();
                if (!success) {
                    throw new Error('Failed to initialize authentication');
                }
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event, session);
                this.handleAuthChange(event, session);
            });

            // Initialize event listeners
            this.setupEventListeners();
            console.log('Auth initialization complete');
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.showError('Authentication system error');
            throw error; // Propagate error to caller
        }
    }

    setupEventListeners() {
        // Setup login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                await this.login(email, password);
            });
        }

        // Setup register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const fullName = document.getElementById('registerName').value;
                await this.register(email, password, fullName);
            });
        }

        // Setup modal triggers
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const closeButtons = document.querySelectorAll('.close');

        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', () => {
                loginModal.style.display = 'block';
                if (this.recaptchaInstances.login) {
                    grecaptcha.reset(this.recaptchaInstances.login);
                }
            });
        }

        if (registerBtn && registerModal) {
            registerBtn.addEventListener('click', () => {
                registerModal.style.display = 'block';
                if (this.recaptchaInstances.register) {
                    grecaptcha.reset(this.recaptchaInstances.register);
                }
            });
        }

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (loginModal) {
                    loginModal.style.display = 'none';
                    if (this.recaptchaInstances.login) {
                        grecaptcha.reset(this.recaptchaInstances.login);
                    }
                }
                if (registerModal) {
                    registerModal.style.display = 'none';
                    if (this.recaptchaInstances.register) {
                        grecaptcha.reset(this.recaptchaInstances.register);
                    }
                }
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
                if (this.recaptchaInstances.login) {
                    grecaptcha.reset(this.recaptchaInstances.login);
                }
            }
            if (e.target === registerModal) {
                registerModal.style.display = 'none';
                if (this.recaptchaInstances.register) {
                    grecaptcha.reset(this.recaptchaInstances.register);
                }
            }
        });
    }

    handleAuthChange(event, session) {
        switch (event) {
            case 'SIGNED_IN':
                this.session = session;
                this.user = session.user;
                this.updateUI();
                this.showNotification('Successfully signed in!', 'success');
                window.dispatchEvent(new CustomEvent('authStateChange', { 
                    detail: { state: 'SIGNED_IN', user: session.user }
                }));
                break;
            case 'SIGNED_OUT':
                this.session = null;
                this.user = null;
                this.updateUI();
                this.showNotification('Successfully signed out!', 'info');
                window.dispatchEvent(new CustomEvent('authStateChange', { 
                    detail: { state: 'SIGNED_OUT' }
                }));
                break;
            case 'TOKEN_REFRESHED':
                this.session = session;
                this.showNotification('Session refreshed', 'info');
                break;
            case 'USER_UPDATED':
                this.user = session.user;
                this.updateUI();
                window.dispatchEvent(new CustomEvent('authStateChange', { 
                    detail: { state: 'USER_UPDATED', user: session.user }
                }));
                break;
        }
    }

    async login(email, password) {
        try {
            this.showNotification('Logging in...', 'info');
            
            // Validate inputs
            if (!email || !password) {
                throw new AuthError('Email and password are required', 'VALIDATION_ERROR');
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            this.showNotification('Successfully logged in!', 'success');
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Failed to login');
            return { success: false, error: error.message };
        }
    }

    async register(email, password, fullName) {
        try {
            // Validate inputs
            if (!email || !password || !fullName) {
                throw new AuthError('All fields are required', 'VALIDATION_ERROR');
            }
            
            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                throw new AuthError('Please enter a valid email address', 'INVALID_EMAIL');
            }

            if (password.length < 8) {
                throw new AuthError('Password must be at least 8 characters long', 'INVALID_PASSWORD');
            }

            if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)) {
                throw new AuthError(
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                    'WEAK_PASSWORD'
                );
            }

            if (fullName.length < 2) {
                throw new AuthError('Please enter your full name', 'INVALID_NAME');
            }

            const recaptchaToken = await this.getRecaptchaToken('register');
            if (!recaptchaToken) {
                throw new AuthError('Please complete the reCAPTCHA verification', 'RECAPTCHA_REQUIRED');
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) {
                // Map Supabase errors to user-friendly messages
                const errorMessages = {
                    'user_already_registered': 'An account with this email already exists',
                    'rate_limit_exceeded': 'Too many attempts. Please try again later',
                    'weak_password': 'Password is too weak'
                };
                
                throw new AuthError(
                    errorMessages[error.message] || error.message,
                    error.code
                );
            }

            this.showNotification('Registration successful! Please check your email to verify your account.', 'success');
            return { success: true, data };
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification(error.message, 'error');
            return { 
                success: false, 
                error: error instanceof AuthError ? error.message : 'Registration failed'
            };
        }
    }

    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: 'Failed to sign out' };
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: 'Failed to send reset email' };
        }
    }

    updateUI() {
        const authButtons = document.querySelector('.auth-buttons');
        if (!authButtons) return;

        if (this.user) {
            const userName = this.user.user_metadata?.full_name || this.user.email;
            authButtons.innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-btn">
                        <span class="user-name">${userName}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown">
                        <a href="profile.html">Profile</a>
                        <a href="settings.html">Settings</a>
                        <button id="logoutBtn" class="btn">Logout</button>
                    </div>
                </div>
            `;

            // Setup logout button
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        } else {
            authButtons.innerHTML = `
                <button id="loginBtn" class="btn">Login</button>
                <button id="registerBtn" class="btn">Register</button>
            `;
            
            // Reattach event listeners for login/register buttons
            this.setupEventListeners();
        }
    }

    initRecaptcha() {
        if (typeof grecaptcha === 'undefined') {
            console.warn('reCAPTCHA not loaded');
            return;
        }

        // Wait for DOM elements to be ready
        const loginContainer = document.getElementById('loginRecaptcha');
        const registerContainer = document.getElementById('registerRecaptcha');

        if (!loginContainer || !registerContainer) {
            // Elements not ready, retry in 100ms
            setTimeout(() => this.initRecaptcha(), 100);
            return;
        }

        try {
            // Only initialize if not already initialized
            if (!this.recaptchaInitialized) {
                // Initialize login reCAPTCHA
                if (!this.recaptchaInstances.login) {
                    this.recaptchaInstances.login = grecaptcha.render(loginContainer, {
                        'sitekey': config.recaptcha.siteKey,
                        'callback': (token) => this.handleRecaptchaSuccess('login', token),
                        'expired-callback': () => this.handleRecaptchaExpired('login')
                    });
                }

                // Initialize register reCAPTCHA
                if (!this.recaptchaInstances.register) {
                    this.recaptchaInstances.register = grecaptcha.render(registerContainer, {
                        'sitekey': config.recaptcha.siteKey,
                        'callback': (token) => this.handleRecaptchaSuccess('register', token),
                        'expired-callback': () => this.handleRecaptchaExpired('register')
                    });
                }

                this.recaptchaInitialized = true;
            }
        } catch (error) {
            if (!error.message.includes('reCAPTCHA has already been rendered')) {
                console.error('Error initializing reCAPTCHA:', error);
            }
        }
    }

    handleRecaptchaSuccess(type, token) {
        const form = document.getElementById(`${type}Form`);
        if (form) {
            form.dataset.recaptchaToken = token;
        }
    }

    handleRecaptchaExpired(type) {
        const form = document.getElementById(`${type}Form`);
        if (form) {
            form.dataset.recaptchaToken = '';
        }
    }

    async getRecaptchaToken(type) {
        if (!this.recaptchaInstances[type]) return null;
        try {
            return await grecaptcha.execute(this.recaptchaInstances[type]);
        } catch (error) {
            console.error('reCAPTCHA error:', error);
            return null;
        }
    }

    showError(message, title = 'Error') {
        // Create modal if it doesn't exist
        let errorModal = document.getElementById('errorModal');
        if (!errorModal) {
            errorModal = document.createElement('div');
            errorModal.id = 'errorModal';
            errorModal.className = 'error-modal';
            errorModal.innerHTML = `
                <div class="error-modal-content">
                    <div class="error-modal-header">
                        <span class="error-modal-icon">⚠️</span>
                        <h3 class="error-modal-title"></h3>
                    </div>
                    <div class="error-modal-message"></div>
                    <button class="error-modal-button">OK</button>
                </div>
            `;
            document.body.appendChild(errorModal);

            // Add click handlers
            errorModal.querySelector('.error-modal-button').addEventListener('click', () => {
                errorModal.style.display = 'none';
            });
            
            // Close on click outside
            errorModal.addEventListener('click', (e) => {
                if (e.target === errorModal) {
                    errorModal.style.display = 'none';
                }
            });
        }

        // Update modal content
        errorModal.querySelector('.error-modal-title').textContent = title;
        errorModal.querySelector('.error-modal-message').textContent = message;
        
        // Show modal
        errorModal.style.display = 'block';
    }

    showNotification(message, type = 'info') {
        // Only show notifications for success and info messages
        if (type === 'error') {
            this.showError(message);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            'success': '✅',
            'info': 'ℹ️',
            'warning': '⚠️'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">×</button>
        `;

        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    isAuthenticated() {
        return !!this.user;
    }

    requireAuth(message = 'Please login first') {
        if (!this.isAuthenticated()) {
            // Show error modal
            this.showError(message, 'Authentication Required');
            
            // Open login modal
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'block';
            }
            
            return false;
        }
        return true;
    }

    // Mock login function for development
    async mockLogin() {
        console.log('Attempting mock login...');
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: this.mockUser.email,
                password: this.mockUser.password
            });

            if (error) throw error;

            this.user = data.user;
            this.session = data.session;

            // Wait a moment for the session to be properly set
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create profile if it doesn't exist
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', this.user.id)
                .single();

            if (profileError && profileError.code === 'PGRST116') {
                // Profile doesn't exist, create it with mock data
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert([{
                        user_id: this.user.id,
                        ...this.mockProfile,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creating profile:', createError);
                    throw createError;
                }
                console.log('Created new profile:', newProfile);
            } else if (profile) {
                console.log('Found existing profile:', profile);
            }

            console.log('Mock login successful!');
            return { success: true, data };
        } catch (error) {
            console.error('Mock login error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize auth and export instance
const auth = new Auth();
export { auth };

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
}); 