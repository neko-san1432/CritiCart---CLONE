// DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.admin-sidebar a');
const reviewModal = document.getElementById('reviewModal');
const reviewContent = document.getElementById('reviewContent');
const closeModal = document.querySelector('.close');
const approveBtn = document.querySelector('.approve-btn');
const rejectBtn = document.querySelector('.reject-btn');

let currentReviewId = null;

// Check if user is admin
async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata.role !== 'admin') {
        window.location.href = 'index.html';
    }
}

// Navigation handling
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = link.dataset.section;
        
        // Update active states
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetSection) {
                section.classList.add('active');
                loadSectionContent(targetSection);
            }
        });
    });
});

// Load section content
async function loadSectionContent(section) {
    try {
        let query = supabase
            .from('reviews')
            .select('*, users(full_name, avatar_url)');

        switch (section) {
            case 'pending':
                query = query.eq('status', 'pending');
                break;
            case 'approved':
                query = query.eq('status', 'approved');
                break;
            case 'rejected':
                query = query.eq('status', 'rejected');
                break;
            case 'appeals':
                query = query.eq('status', 'appealed');
                break;
            case 'users':
                loadUsers();
                return;
        }

        const { data: reviews, error } = await query;
        if (error) throw error;

        displayReviews(reviews, section);
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Display reviews
function displayReviews(reviews, section) {
    const container = document.getElementById(`${section}Reviews`);
    container.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <h3 class="review-title">${review.product_name}</h3>
                <div class="review-meta">
                    <span>By ${review.users.full_name}</span>
                    <span>${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="review-content">
                <p>${review.description}</p>
                ${review.images ? `
                    <div class="review-images">
                        ${review.images.map(img => `
                            <img src="${img}" alt="Review image">
                        `).join('')}
                    </div>
                ` : ''}
                ${review.video ? `
                    <video class="review-video" controls>
                        <source src="${review.video}" type="video/mp4">
                    </video>
                ` : ''}
            </div>
            <div class="review-actions">
                <button class="btn view-btn" onclick="viewReview('${review.id}')">View Details</button>
                ${section === 'pending' ? `
                    <button class="btn approve-btn" onclick="approveReview('${review.id}')">Approve</button>
                    <button class="btn reject-btn" onclick="rejectReview('${review.id}')">Reject</button>
                ` : ''}
                ${section === 'appeals' ? `
                    <button class="btn approve-btn" onclick="handleAppeal('${review.id}', true)">Accept Appeal</button>
                    <button class="btn reject-btn" onclick="handleAppeal('${review.id}', false)">Reject Appeal</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Load users
async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;

        const usersList = document.getElementById('usersList');
        usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <img src="${user.avatar_url || 'default-avatar.png'}" alt="User avatar" class="user-avatar">
                    <div class="user-details">
                        <h3>${user.full_name}</h3>
                        <p>${user.email}</p>
                    </div>
                </div>
                <div class="user-role role-${user.role}">${user.role}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// View review details
async function viewReview(reviewId) {
    try {
        const { data: review, error } = await supabase
            .from('reviews')
            .select('*, users(full_name, avatar_url)')
            .eq('id', reviewId)
            .single();

        if (error) throw error;

        currentReviewId = reviewId;
        reviewContent.innerHTML = `
            <div class="review-header">
                <h3>${review.product_name}</h3>
                <div class="review-meta">
                    <span>By ${review.users.full_name}</span>
                    <span>${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="review-content">
                <p>${review.description}</p>
                ${review.images ? `
                    <div class="review-images">
                        ${review.images.map(img => `
                            <img src="${img}" alt="Review image">
                        `).join('')}
                    </div>
                ` : ''}
                ${review.video ? `
                    <video class="review-video" controls>
                        <source src="${review.video}" type="video/mp4">
                    </video>
                ` : ''}
            </div>
        `;

        reviewModal.style.display = 'block';
    } catch (error) {
        console.error('Error loading review:', error);
    }
}

// Approve review
async function approveReview(reviewId) {
    try {
        const { error } = await supabase
            .from('reviews')
            .update({ status: 'approved' })
            .eq('id', reviewId);

        if (error) throw error;

        alert('Review approved successfully');
        loadSectionContent('pending');
    } catch (error) {
        console.error('Error approving review:', error);
        alert('Error approving review');
    }
}

// Reject review
async function rejectReview(reviewId) {
    try {
        const { error } = await supabase
            .from('reviews')
            .update({ status: 'rejected' })
            .eq('id', reviewId);

        if (error) throw error;

        alert('Review rejected');
        loadSectionContent('pending');
    } catch (error) {
        console.error('Error rejecting review:', error);
        alert('Error rejecting review');
    }
}

// Handle appeal
async function handleAppeal(reviewId, accept) {
    try {
        const { error } = await supabase
            .from('reviews')
            .update({ 
                status: accept ? 'approved' : 'rejected',
                appeal_status: accept ? 'accepted' : 'rejected'
            })
            .eq('id', reviewId);

        if (error) throw error;

        alert(`Appeal ${accept ? 'accepted' : 'rejected'}`);
        loadSectionContent('appeals');
    } catch (error) {
        console.error('Error handling appeal:', error);
        alert('Error handling appeal');
    }
}

// Modal handling
closeModal.addEventListener('click', () => {
    reviewModal.style.display = 'none';
    currentReviewId = null;
});

window.addEventListener('click', (e) => {
    if (e.target === reviewModal) {
        reviewModal.style.display = 'none';
        currentReviewId = null;
    }
});

// Initialize
checkAdminAccess();
loadSectionContent('pending'); 