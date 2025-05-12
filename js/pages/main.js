import { auth } from '../utils/auth.js';
import { db, DatabaseError } from '../utils/supabase.js';

// DOM Elements
const elements = {
    darkModeToggle: document.getElementById('darkModeToggle'),
    searchInput: document.getElementById('searchInput'),
    featuredReviews: document.getElementById('featuredReviews'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    searchBtn: document.querySelector('.search-btn'),
    categoryCards: document.querySelectorAll('.category-card')
};

// State management
const state = {
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    searchTimeout: null,
    currentPage: 1,
    isLoading: false
};

// Initialize dark mode
const initDarkMode = () => {
    if (state.isDarkMode) {
        document.body.classList.add('dark-mode');
        elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
};

// Toggle dark mode with animation
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    state.isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', state.isDarkMode);
    
    // Animate icon transition
    const icon = elements.darkModeToggle.querySelector('i');
    icon.style.transform = 'rotate(360deg)';
    icon.style.transition = 'transform 0.5s ease';
    
    setTimeout(() => {
        icon.innerHTML = state.isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        icon.style.transform = 'rotate(0deg)';
    }, 250);
};

// Debounced search with loading state
const handleSearch = async (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (state.searchTimeout) {
        clearTimeout(state.searchTimeout);
    }

    // Show loading state
    if (query.length >= 2) {
        elements.featuredReviews.innerHTML = '<div class="loading">Searching...</div>';
        state.isLoading = true;
    }

    // Debounce search
    state.searchTimeout = setTimeout(async () => {
        if (query.length < 2) {
            await loadFeaturedReviews();
            return;
        }

        try {
            const { reviews } = await db.getReviews({ search: query });
            updateSearchResults(reviews);
        } catch (error) {
            handleError(error);
        } finally {
            state.isLoading = false;
        }
    }, 300);
};

// Update search results with animation
const updateSearchResults = (reviews) => {
    if (!elements.featuredReviews) return;

    if (reviews.length === 0) {
        elements.featuredReviews.innerHTML = '<div class="no-results">No reviews found</div>';
        return;
    }

    const html = reviews.map(review => `
        <div class="review-card" data-aos="fade-up">
            <img src="${review.image_url || 'assets/images/placeholder.jpg'}" alt="${review.title}">
            <h3>${review.title}</h3>
            <p>${review.summary}</p>
            <div class="review-meta">
                <span class="rating">${review.rating}/5</span>
                <span class="author">${review.author_name}</span>
            </div>
        </div>
    `).join('');

    elements.featuredReviews.innerHTML = html;
};

// Load featured reviews with error handling
const loadFeaturedReviews = async () => {
    if (!elements.featuredReviews) return;

    try {
        elements.featuredReviews.innerHTML = '<div class="loading">Loading reviews...</div>';
        const { reviews } = await db.getReviews({ featured: true });
        updateFeaturedReviews(reviews);
    } catch (error) {
        handleError(error);
    }
};

// Update featured reviews with animation
const updateFeaturedReviews = (reviews) => {
    if (!elements.featuredReviews) return;
    
    if (reviews.length === 0) {
        elements.featuredReviews.innerHTML = '<div class="no-results">No featured reviews yet</div>';
        return;
    }

    const html = reviews.map((review, index) => `
        <div class="review-card" data-aos="fade-up" data-aos-delay="${index * 100}">
            <img src="${review.image_url || 'assets/images/placeholder.jpg'}" alt="${review.title}">
            <h3>${review.title}</h3>
            <p>${review.summary}</p>
            <div class="review-meta">
                <span class="rating">${review.rating}/5</span>
                <span class="author">${review.author_name}</span>
            </div>
        </div>
    `).join('');

    elements.featuredReviews.innerHTML = html;
};

// Modal handling with animations
const setupModals = () => {
    const modals = {
        login: elements.loginModal,
        register: elements.registerModal
    };

    // Open modal with animation
    const openModal = (type) => {
        const modal = modals[type];
        if (!modal) return;

        modal.style.display = 'block';
        modal.classList.add('fade-in');
    };

    // Close modal with animation
    const closeModal = (type) => {
        const modal = modals[type];
        if (!modal) return;

        modal.classList.add('fade-out');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('fade-out');
        }, 300);
    };

    // Setup modal triggers
    elements.loginBtn?.addEventListener('click', () => openModal('login'));
    elements.registerBtn?.addEventListener('click', () => openModal('register'));

    // Close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal('login');
            closeModal('register');
        });
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modals.login) closeModal('login');
        if (e.target === modals.register) closeModal('register');
    });
};

// Form handling with validation
const setupForms = () => {
    const forms = {
        login: document.getElementById('loginForm'),
        register: document.getElementById('registerForm')
    };

    // Form validation
    const validateForm = (form) => {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    };

    // Login form
    forms.login?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm(forms.login)) return;

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const result = await auth.login(email, password);
            if (result.success) {
                closeModal('login');
                showNotification('Successfully logged in!', 'success');
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            handleError(error);
        }
    });

    // Register form
    forms.register?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm(forms.register)) return;

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const result = await auth.register(email, password, name);
            if (result.success) {
                closeModal('register');
                showNotification('Registration successful!', 'success');
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            handleError(error);
        }
    });
};

// Error handling
const handleError = (error) => {
    console.error('Application error:', error);
    
    let message = 'An unexpected error occurred';
    if (error instanceof DatabaseError) {
        message = error.message;
    } else if (error instanceof Error) {
        message = error.message;
    }

    showNotification(message, 'error');
};

// Notification system with types
const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    });

    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateY(-100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Get notification icon based on type
const getNotificationIcon = (type) => {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
};

// Initialize application
const init = () => {
    initDarkMode();
    setupModals();
    setupForms();
    loadFeaturedReviews();

    // Event listeners
    elements.darkModeToggle?.addEventListener('click', toggleDarkMode);
    elements.searchInput?.addEventListener('input', handleSearch);
    elements.searchBtn?.addEventListener('click', () => elements.searchInput?.focus());

    // Category click handling
    elements.categoryCards?.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.querySelector('h3').textContent;
            window.location.href = `reviews.html?category=${encodeURIComponent(category)}`;
        });
    });
};

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 