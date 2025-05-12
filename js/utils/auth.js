import { supabase } from './supabase.js';
import config from './config.js';

// reCAPTCHA configuration
const RECAPTCHA_SITE_KEY = '6Ld36wkrAAAAAPzVNRDG5ghTy_ZhhjyhZJY2lelr';

window.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeButtons = document.querySelectorAll('.close');

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

    // Place any other modal-related logic here if needed
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
        this.recaptchaInstances = new Map();
        this.init();
    }

    async init() {
        try {
            // Check for existing session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                this.session = session;
                this.user = session.user;
                this.updateUI();
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthChange(event, session);
            });

            // Initialize reCAPTCHA
            this.initRecaptcha();
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.showNotification('Authentication system error', 'error');
        }
    }

    handleAuthChange(event, session) {
        switch (event) {
            case 'SIGNED_IN':
                this.session = session;
                this.user = session.user;
                this.updateUI();
                this.showNotification('Successfully signed in!', 'success');
                break;
            case 'SIGNED_OUT':
                this.session = null;
                this.user = null;
                this.updateUI();
                this.showNotification('Successfully signed out!', 'info');
                break;
            case 'TOKEN_REFRESHED':
                this.session = session;
                this.showNotification('Session refreshed', 'info');
                break;
            case 'USER_UPDATED':
                this.user = session.user;
                this.updateUI();
                break;
        }
    }

    async login(email, password) {
        try {
            const recaptchaToken = await this.getRecaptchaToken('login');
            if (!recaptchaToken) {
                throw new AuthError('Please complete the reCAPTCHA verification', 'RECAPTCHA_REQUIRED');
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error instanceof AuthError ? error.message : 'Invalid email or password'
            };
        }
    }

    async register(email, password, fullName) {
        try {
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

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Registration error:', error);
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
            const userName = this.user.user_metadata.full_name || this.user.email;
            authButtons.innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-btn">
                        <span class="user-name">${userName}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown">
                        <a href="/profile">Profile</a>
                        <a href="/settings">Settings</a>
                        <button id="logoutBtn" class="btn">Logout</button>
                    </div>
                </div>
            `;

            // Setup user menu
            const menuBtn = authButtons.querySelector('.user-menu-btn');
            const dropdown = authButtons.querySelector('.user-dropdown');
            menuBtn?.addEventListener('click', () => {
                dropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuBtn?.contains(e.target)) {
                    dropdown?.classList.remove('show');
                }
            });

            // Setup logout
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        } else {
            authButtons.innerHTML = `
                <button id="loginBtn" class="btn">Login</button>
                <button id="registerBtn" class="btn">Register</button>
            `;
        }
    }

    initRecaptcha() {
        if (typeof grecaptcha === 'undefined') {
            console.warn('reCAPTCHA not loaded');
            return;
        }

        ['login', 'register'].forEach(type => {
            const container = document.getElementById(`${type}Recaptcha`);
            if (!container) return;

            this.recaptchaInstances.set(type, grecaptcha.render(container, {
                sitekey: config.recaptcha.siteKey,
                callback: (token) => this.handleRecaptchaSuccess(type, token),
                'expired-callback': () => this.handleRecaptchaExpired(type)
            }));
        });
    }

    async getRecaptchaToken(type) {
        const instance = this.recaptchaInstances.get(type);
        if (!instance) return null;

        try {
            return await grecaptcha.execute(instance);
        } catch (error) {
            console.error('reCAPTCHA error:', error);
            return null;
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

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

export const auth = new Auth();

// Initialize reCAPTCHA
function initRecaptcha() {
    // Initialize login reCAPTCHA
    loginRecaptchaInstance = grecaptcha.render('loginRecaptcha', {
        'sitekey': RECAPTCHA_SITE_KEY,
        'callback': onLoginRecaptchaSuccess,
        'expired-callback': onLoginRecaptchaExpired
    });

    // Initialize register reCAPTCHA
    registerRecaptchaInstance = grecaptcha.render('registerRecaptcha', {
        'sitekey': RECAPTCHA_SITE_KEY,
        'callback': onRegisterRecaptchaSuccess,
        'expired-callback': onRegisterRecaptchaExpired
    });
}

// Modal handling
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
    if (!loginRecaptchaInstance) {
        initRecaptcha();
    }
    grecaptcha.reset(loginRecaptchaInstance);
});

registerBtn.addEventListener('click', () => {
    registerModal.style.display = 'block';
    if (!registerRecaptchaInstance) {
        initRecaptcha();
    }
    grecaptcha.reset(registerRecaptchaInstance);
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
        grecaptcha.reset(loginRecaptchaInstance);
        grecaptcha.reset(registerRecaptchaInstance);
    });
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
        grecaptcha.reset(loginRecaptchaInstance);
    }
    if (e.target === registerModal) {
        registerModal.style.display = 'none';
        grecaptcha.reset(registerRecaptchaInstance);
    }
});

// reCAPTCHA callbacks
function onLoginRecaptchaSuccess(token) {
    document.getElementById('loginForm').dataset.recaptchaToken = token;
}

function onLoginRecaptchaExpired() {
    document.getElementById('loginForm').dataset.recaptchaToken = '';
}

function onRegisterRecaptchaSuccess(token) {
    document.getElementById('registerForm').dataset.recaptchaToken = token;
}

function onRegisterRecaptchaExpired() {
    document.getElementById('registerForm').dataset.recaptchaToken = '';
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
}); 