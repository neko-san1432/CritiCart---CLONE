console.log('main.js is loading');

import { auth } from '../utils/auth.js';
import { db } from '../utils/supabase.js';
import { darkMode } from '../utils/darkMode.js';

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    featuredReviews: document.getElementById('featuredReviews'),
    searchBtn: document.querySelector('.search-btn'),
    categoryCards: document.querySelectorAll('.category-card')
};

// State management
const state = {
    searchTimeout: null,
    currentPage: 1,
    isLoading: false
};

// Initialize application
const init = async () => {
    try {
        console.log('Initializing main.js...');
        setupForms();
        await loadFeaturedReviews();

        elements.searchInput?.addEventListener('input', handleSearch);
        elements.searchBtn?.addEventListener('click', () => elements.searchInput?.focus());

        // Category click handling
        elements.categoryCards?.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.querySelector('h3').textContent;
                window.location.href = `reviews.html?category=${encodeURIComponent(category)}`;
            });
        });
    } catch (error) {
        console.error('Error initializing main.js:', error);
    }
};

// Setup forms
const setupForms = () => {
    // Add any form setup logic here
};

// Handle search input
const handleSearch = (e) => {
    clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query) {
            window.location.href = `reviews.html?search=${encodeURIComponent(query)}`;
        }
    }, 500);
};

// Load featured reviews
const loadFeaturedReviews = async () => {
    if (!elements.featuredReviews) return;
    
    try {
        state.isLoading = true;
        console.log('Loading featured reviews...');
        
        const result = await db.getReviews({ status: 'approved' }, 1, 6);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch reviews');
        }

        const { reviews } = result.data;
        console.log('Fetched reviews:', reviews);

        if (!reviews || reviews.length === 0) {
            elements.featuredReviews.innerHTML = '<p>No reviews available at the moment.</p>';
            return;
        }

        elements.featuredReviews.innerHTML = reviews.map(review => `
            <div class="review-card">
                <h3>${review.title || review.product_name}</h3>
                <div class="rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <p>${review.description.substring(0, 150)}...</p>
                <a href="review.html?id=${review.id}" class="btn">Read More</a>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading featured reviews:', error);
        elements.featuredReviews.innerHTML = '<p>Error loading reviews. Please try again later.</p>';
    } finally {
        state.isLoading = false;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 