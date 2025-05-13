import { auth } from './auth.js';

export class Navigation {
    constructor() {
        this.darkMode = false;
    }

    async init() {
        try {
            console.log('Navigation init started');
            this.setupNavigation();
            this.setupDarkMode();
            console.log('Navigation initialized');
        } catch (error) {
            console.error('Navigation initialization error:', error);
        }
    }

    setupNavigation() {
        const authButtons = document.querySelector('.auth-buttons');
        if (authButtons) {
            this.updateAuthButtons(authButtons);
        }
    }

    updateAuthButtons(container) {
        if (auth.isAuthenticated()) {
            const userName = auth.user.user_metadata?.full_name || auth.user.email;
            container.innerHTML = `
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
            document.getElementById('logoutBtn')?.addEventListener('click', () => {
                auth.logout();
            });
        } else {
            container.innerHTML = `
                <button id="loginBtn" class="btn">Login</button>
                <button id="registerBtn" class="btn">Register</button>
            `;
            this.setupModalTriggers();
        }
    }

    setupDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                this.darkMode = !this.darkMode;
                document.body.classList.toggle('dark-mode');
                darkModeToggle.innerHTML = this.darkMode ? 
                    '<i class="fas fa-sun"></i>' : 
                    '<i class="fas fa-moon"></i>';
            });
        }
    }

    setupModalTriggers() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');

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
    }
} 