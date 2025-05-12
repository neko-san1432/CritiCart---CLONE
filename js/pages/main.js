// Dark mode functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Check for saved theme preference or use system preference
const currentTheme = localStorage.getItem('theme') || 
    (prefersDarkScheme.matches ? 'dark' : 'light');

// Set initial theme
document.documentElement.setAttribute('data-theme', currentTheme);
updateDarkModeIcon(currentTheme);

// Toggle theme
darkModeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateDarkModeIcon(newTheme);
});

// Update dark mode icon
function updateDarkModeIcon(theme) {
    const icon = darkModeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const featuredReviews = document.getElementById('featuredReviews');

// Main page functionality
const mainPage = {
    // Initialize main page
    init() {
        this.loadFeaturedReviews();
        this.setupCategoryClicks();
        this.setupSearch();
    },

    // Load featured reviews
    async loadFeaturedReviews() {
        const grid = document.getElementById('featuredReviews');
        if (!grid) return;
        grid.innerHTML = '<p>Loading...</p>';
        try {
            // Fetch featured reviews (example: reviews with featured: true or top 6 approved)
            const { data: reviews, error } = await supabase
                .from('reviews')
                .select('*, users(full_name, avatar_url)')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(6);
            if (error) throw error;
            if (!reviews || reviews.length === 0) {
                grid.innerHTML = '<p>No featured reviews yet.</p>';
                return;
            }
            grid.innerHTML = reviews.map(this.createReviewCard).join('');
        } catch (err) {
            grid.innerHTML = '<p class="error">Failed to load featured reviews.</p>';
        }
    },

    // Create review card HTML
    createReviewCard(review) {
        return `
            <div class="review-card" data-id="${review.id}">
                <div class="review-image">
                    <img src="${(review.images && review.images[0]) || 'assets/images/placeholder.jpg'}" alt="${review.product_name || review.title}">
                </div>
                <div class="review-content">
                    <h3>${review.product_name || review.title}</h3>
                    <div class="review-meta">
                        <span class="category">${review.category || ''}</span>
                        <span class="rating">${this.createStarRating(review.rating || 0)}</span>
                    </div>
                    <p>${this.truncateText(review.description || '', 100)}</p>
                    <div class="review-footer">
                        <div class="author">
                            <img src="${(review.users && review.users.avatar_url) || 'assets/icons/default-avatar.png'}" alt="${(review.users && review.users.full_name) || 'User'}" class="author-avatar">
                            <span class="author-name">${(review.users && review.users.full_name) || 'User'}</span>
                        </div>
                        <a href="review.html?id=${review.id}" class="btn-read-more">Read More</a>
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
            <span class="stars">
                ${'★'.repeat(fullStars)}${halfStar ? '½' : ''}${'☆'.repeat(emptyStars)}
                <span class="rating-value">${rating.toFixed(1)}</span>
            </span>
        `;
    },

    // Truncate text with ellipsis
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    },

    // Setup event listeners
    setupCategoryClicks() {
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.querySelector('h3').textContent;
                window.location.href = `reviews.html?category=${encodeURIComponent(category)}`;
            });
        });
    },

    setupSearch() {
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `reviews.html?search=${encodeURIComponent(query)}`;
                }
            });
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchBtn.click();
                }
            });
        }
    }
};

// Initialize main page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    mainPage.init();
});

// Search functionality
searchBtn.addEventListener('click', async () => {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) return;

    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .or(`product_name.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
            .eq('status', 'approved');

        if (error) throw error;

        displayReviews(reviews);
    } catch (error) {
        console.error('Error searching reviews:', error);
    }
});

// Category click handling
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', async () => {
        const category = card.querySelector('h3').textContent;
        
        try {
            const { data: reviews, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('category', category)
                .eq('status', 'approved');

            if (error) throw error;

            displayReviews(reviews);
        } catch (error) {
            console.error('Error loading category reviews:', error);
        }
    });
}); 