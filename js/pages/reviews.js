import { db } from '../utils/supabase.js';
import { auth } from '../utils/auth.js';

// DOM Elements
const elements = {
    reviewsGrid: document.getElementById('reviewsGrid'),
    categoryFilter: document.getElementById('categoryFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.querySelector('.search-btn'),
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo')
};

// Pagination state
let currentPage = 1;
const productsPerPage = 12;
let totalProducts = 0;

// Error handling
const showError = (message) => {
    if (elements.reviewsGrid) {
        elements.reviewsGrid.innerHTML = `
            <div class="error-message">
                <span>${message || 'Error loading products. Please try again later.'}</span>
            </div>
        `;
    }
};

// Generate star rating HTML
const generateStarRating = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
        ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
        ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
    `;
};

// Format price with currency
const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price);
};

// Load products with error handling
const loadProducts = async () => {
    try {
        if (!elements.reviewsGrid) return;

        elements.reviewsGrid.innerHTML = '<div class="loading">Loading products...</div>';
        
        // Get filter values
        const filters = {
            category: elements.categoryFilter.value,
            minRating: elements.ratingFilter.value,
            search: elements.searchInput.value.trim()
        };

        // Get products from database
        const result = await db.getProducts(filters, currentPage, productsPerPage);

        if (!result.success) {
            throw new Error(result.error);
        }

        const { products, total } = result.data;

        if (!products || products.length === 0) {
            elements.reviewsGrid.innerHTML = `
                <div class="error-message">
                    <span>No products found. Try adjusting your filters.</span>
                </div>
            `;
            return;
        }

        totalProducts = total;
        displayProducts(products);
        updatePagination();
    } catch (error) {
        console.error('Error loading products:', error);
        showError(error.message);
    }
};

// Display products
const displayProducts = (products) => {
    if (!elements.reviewsGrid) return;
    
    elements.reviewsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image_url || 'assets/images/placeholder.png'}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-content">
                <h3>${product.name}</h3>
                <div class="product-meta">
                    <span class="category">${product.category}</span>
                    <span class="price">${formatPrice(product.price)}</span>
                </div>
                <div class="rating">
                    ${generateStarRating(product.average_rating || 0)}
                    <span class="review-count">(${product.review_count || 0} reviews)</span>
                </div>
                <p class="description">${product.description.substring(0, 150)}...</p>
                <div class="product-footer">
                    <span class="shop">${product.shop_provider}</span>
                    <a href="${product.product_url}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">View Product</a>
                </div>
            </div>
        </div>
    `).join('');
};

// Update pagination
const updatePagination = () => {
    if (!elements.pageInfo) return;

    const totalPages = Math.ceil(totalProducts / productsPerPage);
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    if (elements.prevPageBtn) {
        elements.prevPageBtn.disabled = currentPage === 1;
    }
    if (elements.nextPageBtn) {
        elements.nextPageBtn.disabled = currentPage === totalPages;
    }
};

// Setup event listeners
const setupEventListeners = () => {
    elements.categoryFilter?.addEventListener('change', () => {
        currentPage = 1;
        loadProducts();
    });

    elements.ratingFilter?.addEventListener('change', () => {
        currentPage = 1;
        loadProducts();
    });

    elements.searchBtn?.addEventListener('click', () => {
        currentPage = 1;
        loadProducts();
    });

    elements.searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            loadProducts();
        }
    });

    elements.prevPageBtn?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadProducts();
        }
    });

    elements.nextPageBtn?.addEventListener('click', () => {
        const totalPages = Math.ceil(totalProducts / productsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            loadProducts();
        }
    });
};

// Initialize the page
const init = () => {
    setupEventListeners();
    loadProducts();
};

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 