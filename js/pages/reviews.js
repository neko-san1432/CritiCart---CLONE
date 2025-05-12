// DOM Elements
const reviewsContainer = document.getElementById('reviewsContainer');
const categoryFilter = document.getElementById('categoryFilter');
const ratingFilter = document.getElementById('ratingFilter');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Pagination state
let currentPage = 1;
const reviewsPerPage = 12;
let totalReviews = 0;

// Load reviews
async function loadReviews() {
    try {
        let query = supabase
            .from('reviews')
            .select('*, users(full_name, avatar_url)', { count: 'exact' })
            .eq('status', 'approved');

        // Apply filters
        const category = categoryFilter.value;
        const minRating = ratingFilter.value;
        const searchTerm = searchInput.value.trim();

        if (category) {
            query = query.eq('category', category);
        }

        if (minRating) {
            query = query.gte('rating', minRating);
        }

        if (searchTerm) {
            query = query.or(`product_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
        }

        // Apply pagination
        const from = (currentPage - 1) * reviewsPerPage;
        const to = from + reviewsPerPage - 1;
        query = query.range(from, to);

        const { data: reviews, error, count } = await query;

        if (error) throw error;

        totalReviews = count;
        displayReviews(reviews);
        updatePagination();
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsContainer.innerHTML = '<p class="error">Error loading reviews. Please try again later.</p>';
    }
}

// Display reviews
function displayReviews(reviews) {
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p class="no-reviews">No reviews found matching your criteria.</p>';
        return;
    }

    reviewsContainer.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-images">
                ${review.images ? review.images.map(img => `
                    <img src="${img}" alt="Review image" loading="lazy">
                `).join('') : ''}
            </div>
            <div class="review-content">
                <h3>${review.product_name}</h3>
                <div class="rating">
                    ${generateStarRating(review.rating)}
                </div>
                <p class="description">${review.description.substring(0, 150)}...</p>
                <div class="review-meta">
                    <span class="category">${review.category}</span>
                    <span class="shop">${review.shop_provider}</span>
                    <span class="date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-author">
                    <img src="${review.users.avatar_url || 'default-avatar.png'}" alt="User avatar" class="author-avatar">
                    <span>${review.users.full_name}</span>
                </div>
                <a href="review.html?id=${review.id}" class="read-more">Read More</a>
            </div>
        </div>
    `).join('');
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(totalReviews / reviewsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

// Event listeners
categoryFilter.addEventListener('change', () => {
    currentPage = 1;
    loadReviews();
});

ratingFilter.addEventListener('change', () => {
    currentPage = 1;
    loadReviews();
});

searchBtn.addEventListener('click', () => {
    currentPage = 1;
    loadReviews();
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        currentPage = 1;
        loadReviews();
    }
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadReviews();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(totalReviews / reviewsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        loadReviews();
    }
});

// Load reviews on page load
loadReviews();

// Reviews page functionality
const reviews = {
    // Initialize reviews page
    init() {
        this.loadFilters();
        this.loadReviews();
        this.setupEventListeners();
    },

    // Load category and tag filters
    async loadFilters() {
        try {
            const [categories, tags] = await Promise.all([
                db.getCategories(),
                db.getTags()
            ]);

            this.populateFilters(categories, tags);
        } catch (error) {
            console.error('Error loading filters:', error);
            this.showError('Failed to load filters');
        }
    },

    // Populate filter dropdowns
    populateFilters(categories, tags) {
        // Category filter
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            categorySelect.innerHTML = `
                <option value="">All Categories</option>
                ${categories.map(category => `
                    <option value="${category.id}">${category.name}</option>
                `).join('')}
            `;
        }

        // Tag filter
        const tagSelect = document.getElementById('tagFilter');
        if (tagSelect) {
            tagSelect.innerHTML = `
                <option value="">All Tags</option>
                ${tags.map(tag => `
                    <option value="${tag.id}">${tag.name}</option>
                `).join('')}
            `;
        }
    },

    // Load reviews with filters
    async loadReviews(page = 1) {
        try {
            const filters = this.getFilters();
            const { reviews, total } = await db.getReviews(filters, page);
            
            this.displayReviews(reviews);
            this.updatePagination(total, page);
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showError('Failed to load reviews');
        }
    },

    // Get current filter values
    getFilters() {
        const category = document.getElementById('categoryFilter')?.value;
        const tag = document.getElementById('tagFilter')?.value;
        const rating = document.getElementById('ratingFilter')?.value;
        const search = document.getElementById('searchInput')?.value;

        return { category, tag, rating, search };
    },

    // Display reviews in the grid
    displayReviews(reviews) {
        const grid = document.querySelector('.reviews-grid');
        if (!grid) return;

        if (reviews.length === 0) {
            grid.innerHTML = '<p class="no-reviews">No reviews found matching your criteria.</p>';
            return;
        }

        grid.innerHTML = reviews.map(review => this.createReviewCard(review)).join('');
    },

    // Create review card HTML
    createReviewCard(review) {
        return `
            <div class="review-card" data-id="${review.id}">
                <div class="review-image">
                    <img src="${review.images[0] || 'assets/images/placeholder.jpg'}" alt="${review.title}">
                </div>
                <div class="review-content">
                    <h3>${review.title}</h3>
                    <div class="review-meta">
                        <span class="category">${review.category}</span>
                        <span class="rating">${this.createStarRating(review.rating)}</span>
                    </div>
                    <p>${this.truncateText(review.description, 150)}</p>
                    <div class="review-footer">
                        <div class="author">
                            <img src="${review.author.avatar_url || 'assets/icons/default-avatar.png'}" alt="${review.author.username}" class="author-avatar">
                            <span class="author-name">${review.author.username}</span>
                        </div>
                        <div class="review-stats">
                            <span class="comments"><i class="fas fa-comments"></i> ${review.comments_count || 0}</span>
                            <span class="likes"><i class="fas fa-heart"></i> ${review.likes_count || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Create star rating HTML
    createStarRating(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        return `
            <div class="stars">
                ${'★'.repeat(fullStars)}
                ${halfStar ? '½' : ''}
                ${'☆'.repeat(emptyStars)}
                <span class="rating-value">${rating.toFixed(1)}</span>
            </div>
        `;
    },

    // Truncate text with ellipsis
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    },

    // Update pagination controls
    updatePagination(total, currentPage) {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(total / 12);
        const pages = [];

        // Previous page
        pages.push(`
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - 2 && i <= currentPage + 2)
            ) {
                pages.push(`
                    <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `);
            } else if (
                i === currentPage - 3 ||
                i === currentPage + 3
            ) {
                pages.push('<span class="page-ellipsis">...</span>');
            }
        }

        // Next page
        pages.push(`
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `);

        pagination.innerHTML = pages.join('');
    },

    // Setup event listeners
    setupEventListeners() {
        // Filter changes
        const filters = document.querySelectorAll('.filter');
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.loadReviews(1);
            });
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.loadReviews(1);
                }, 500);
            });
        }

        // Pagination clicks
        document.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.page-btn');
            if (pageBtn && !pageBtn.disabled) {
                const page = parseInt(pageBtn.dataset.page);
                this.loadReviews(page);
            }
        });

        // Review card clicks
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.review-card');
            if (card) {
                const reviewId = card.dataset.id;
                window.location.href = `review.html?id=${reviewId}`;
            }
        });
    },

    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        // Remove error message after 3 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
};

// Initialize reviews page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    reviews.init();
}); 