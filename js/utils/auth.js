// Supabase configuration
// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://dgualcjfvzjrqzwwmvov.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndWFsY2pmdnpqcnF6d3dtdm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzAxODIsImV4cCI6MjA2MTYwNjE4Mn0.R-gNusHP_Va683Xf1mhgdUH4NO5udxSkaUtstQwUS_A';
const supabase = window.supabase || supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// reCAPTCHA configuration
const RECAPTCHA_SITE_KEY = '6Ld36wkrAAAAAPzVNRDG5ghTy_ZhhjyhZJY2lelr';

// DOMContentLoaded to ensure elements exist
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
});

let loginRecaptchaInstance = null;
let registerRecaptchaInstance = null;

// Authentication utility functions
const auth = {
    // Initialize auth state
    init() {
        this.checkAuthState();
        this.setupAuthListeners();
    },

    // Check if user is authenticated
    checkAuthState() {
        const user = localStorage.getItem('user');
        if (user) {
            this.updateUIForAuth(JSON.parse(user));
        } else {
            this.updateUIForGuest();
        }
    },

    // Setup authentication event listeners
    setupAuthListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e.target);
            });
        }

        // Register form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(e.target);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    },

    // Handle login form submission
    async handleLogin(form) {
        const email = form.email.value;
        const password = form.password.value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            this.updateUIForAuth(data.user);

            // Close modal and show success message
            this.closeAuthModal();
            this.showNotification('Successfully logged in!', 'success');

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    },

    // Handle registration form submission
    async handleRegister(form) {
        const email = form.email.value;
        const password = form.password.value;
        const username = form.username.value;

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username
                    }
                }
            });

            if (error) throw error;

            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            this.updateUIForAuth(data.user);

            // Close modal and show success message
            this.closeAuthModal();
            this.showNotification('Registration successful!', 'success');

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    },

    // Handle logout
    async handleLogout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // Clear user data
            localStorage.removeItem('user');
            this.updateUIForGuest();

            // Show success message
            this.showNotification('Successfully logged out!', 'success');

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    },

    // Update UI for authenticated user
    updateUIForAuth(user) {
        // Update navigation
        const authLinks = document.querySelectorAll('.auth-link');
        authLinks.forEach(link => {
            if (link.classList.contains('guest-only')) {
                link.style.display = 'none';
            } else if (link.classList.contains('auth-only')) {
                link.style.display = 'block';
            }
        });

        // Update user info
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            element.textContent = user.user_metadata.username || user.email;
        });

        // Update avatar
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(element => {
            element.src = user.user_metadata.avatar_url || 'assets/icons/default-avatar.png';
        });
    },

    // Update UI for guest user
    updateUIForGuest() {
        // Update navigation
        const authLinks = document.querySelectorAll('.auth-only');
        authLinks.forEach(link => {
            link.style.display = 'none';
        });

        // Clear user info
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            element.textContent = '';
        });

        // Reset avatar
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(element => {
            element.src = 'assets/icons/default-avatar.png';
        });
    },

    // Show authentication modal
    showAuthModal(type = 'login') {
        const modal = document.getElementById('authModal');
        if (!modal) return;

        // Update modal content based on type
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const modalTitle = modal.querySelector('.modal-title');

        if (type === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            modalTitle.textContent = 'Login';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            modalTitle.textContent = 'Register';
        }

        // Show modal
        modal.style.display = 'flex';
    },

    // Close authentication modal
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (!modal) return;

        modal.style.display = 'none';
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

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