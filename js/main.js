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

// Load featured reviews
async function loadFeaturedReviews() {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        displayReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Display reviews in the grid
function displayReviews(reviews) {
    featuredReviews.innerHTML = reviews.map(review => `
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

// Load featured reviews on page load
loadFeaturedReviews(); 