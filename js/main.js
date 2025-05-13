import { db } from './utils/supabase.js';
import { auth } from './utils/auth.js';

console.log('main.js is loading');

class MainApp {
    constructor() {
        this.featuredProducts = [];
        this.currentSlide = 0;
        this.slidesToShow = 3;
        this.isInitialized = false;
    }

    async init() {
        console.log('Initializing main.js...');
        try {
            // Wait for auth to be ready
            await auth.waitForSession();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Load initial data
            await this.loadFeaturedProducts();
            await this.loadProducts();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing app:', error);
            this.handleError(error);
        }
    }

    initializeEventListeners() {
        // Carousel navigation
        document.querySelector('.carousel-prev')?.addEventListener('click', () => this.moveCarousel('prev'));
        document.querySelector('.carousel-next')?.addEventListener('click', () => this.moveCarousel('next'));
        
        // Search and filters
        document.querySelector('.search-bar')?.addEventListener('input', (e) => this.handleSearch(e));
        document.querySelector('.category-filters')?.addEventListener('click', (e) => this.handleCategoryFilter(e));
    }

    async loadFeaturedProducts() {
        console.log('Loading featured reviews...');
        try {
            const result = await db.getProducts({ 
                minRating: 4,
                limit: 6,
                featured: true 
            });
            
            console.log('Fetched reviews:', result.data?.products || []);
            
            if (result.success && result.data?.products) {
                this.featuredProducts = result.data.products;
                this.renderFeaturedProducts();
            }
        } catch (error) {
            console.error('Error loading featured products:', error);
            this.handleError(error);
        }
    }

    renderFeaturedProducts() {
        const container = document.getElementById('featuredContainer');
        if (!container) return;

        container.innerHTML = this.featuredProducts.map(product => `
            <div class="featured-card">
                <span class="featured-badge">Featured</span>
                <img src="${product.image_url}" 
                     alt="${product.name}" 
                     class="featured-image"
                     onerror="this.src='assets/images/placeholder.png'">
                <h3 class="featured-name">${product.name}</h3>
                <div class="featured-price">${this.formatPrice(product.price)}</div>
                <div class="featured-rating">
                    ${this.generateStarRating(product.average_rating)}
                    <span>(${product.review_count} reviews)</span>
                </div>
                <p class="featured-description">${product.description}</p>
                <button class="view-product-btn" data-product-id="${product.id}">
                    View Details
                </button>
            </div>
        `).join('');

        // Add click handlers for view buttons
        container.querySelectorAll('.view-product-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.productId;
                const product = this.featuredProducts.find(p => p.id === productId);
                if (product) {
                    this.showProductDetails(product);
                }
            });
        });
    }

    moveCarousel(direction) {
        const container = document.getElementById('featuredContainer');
        if (!container) return;

        const cards = container.querySelectorAll('.featured-card');
        const cardWidth = 300 + 24; // card width + gap

        if (direction === 'next' && this.currentSlide < cards.length - this.slidesToShow) {
            this.currentSlide++;
        } else if (direction === 'prev' && this.currentSlide > 0) {
            this.currentSlide--;
        }

        container.style.transform = `translateX(-${this.currentSlide * cardWidth}px)`;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    }

    async showProductDetails(product) {
        try {
            // Get full product details including reviews
            const details = await db.getProductDetails(product.id);
            if (details.success) {
                // Update modal with full details
                const modal = document.getElementById('productModal');
                if (modal) {
                    // Update modal content
                    document.getElementById('modalTitle').textContent = details.data.name;
                    document.getElementById('modalImage').src = details.data.image_url;
                    document.getElementById('modalPrice').textContent = this.formatPrice(details.data.price);
                    document.getElementById('modalDescription').textContent = details.data.description;
                    
                    // Show reviews
                    const reviewsContainer = document.getElementById('modalReviews');
                    reviewsContainer.innerHTML = details.data.reviews.length ? 
                        details.data.reviews.map(review => this.renderReview(review)).join('') :
                        '<p>No reviews yet.</p>';
                    
                    modal.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error showing product details:', error);
            this.handleError(error);
        }
    }

    renderReview(review) {
        return `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">${review.author_name}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="product-rating">${this.generateStarRating(review.rating)}</div>
                <p class="review-text">${review.comment}</p>
            </div>
        `;
    }

    handleError(error) {
        // Show error message to user
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <h3>Error</h3>
            <p>${error.message || 'An unexpected error occurred'}</p>
        `;
        
        document.body.appendChild(errorContainer);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    }
}

// Initialize app
const app = new MainApp();
app.init().catch(error => {
    console.error('Failed to initialize app:', error);
});

export default app; 