// DOM Elements
const productName = document.getElementById('productName');
const category = document.getElementById('category');
const shopProvider = document.getElementById('shopProvider');
const reviewDate = document.getElementById('reviewDate');
const imageGallery = document.getElementById('imageGallery');
const videoContainer = document.getElementById('videoContainer');
const priceRating = document.getElementById('priceRating');
const qualityRating = document.getElementById('qualityRating');
const description = document.getElementById('description');
const tags = document.getElementById('tags');
const authorInfo = document.getElementById('authorInfo');
const reportBtn = document.getElementById('reportBtn');
const shareBtn = document.getElementById('shareBtn');
const reportModal = document.getElementById('reportModal');
const reportForm = document.getElementById('reportForm');

// Get review ID from URL
const urlParams = new URLSearchParams(window.location.search);
const reviewId = urlParams.get('id');

if (!reviewId) {
    window.location.href = 'reviews.html';
}

// Load review data
async function loadReview() {
    try {
        const { data: review, error } = await supabase
            .from('reviews')
            .select('*, users(full_name, avatar_url, email)')
            .eq('id', reviewId)
            .single();

        if (error) throw error;
        if (!review) throw new Error('Review not found');

        // Update page title
        document.title = `${review.product_name} - CritiCart`;

        // Update review details
        productName.textContent = review.product_name;
        category.textContent = review.category;
        shopProvider.textContent = review.shop_provider;
        reviewDate.textContent = new Date(review.created_at).toLocaleDateString();

        // Update ratings
        priceRating.innerHTML = generateStarRating(review.price_rating);
        qualityRating.innerHTML = generateStarRating(review.quality_rating);

        // Update description
        description.textContent = review.description;

        // Update tags
        if (review.tags && review.tags.length > 0) {
            tags.innerHTML = review.tags.map(tag => `
                <span>${tag}</span>
            `).join('');
        } else {
            tags.innerHTML = '<span>No tags</span>';
        }

        // Update author info
        authorInfo.innerHTML = `
            <img src="${review.users.avatar_url || 'default-avatar.png'}" alt="Author avatar" class="author-avatar">
            <div class="author-details">
                <h3>${review.users.full_name}</h3>
                <p>Member since ${new Date(review.users.created_at).toLocaleDateString()}</p>
            </div>
        `;

        // Update media
        if (review.images && review.images.length > 0) {
            imageGallery.innerHTML = review.images.map(image => `
                <img src="${image}" alt="Review image" onclick="openImageModal('${image}')">
            `).join('');
        } else {
            imageGallery.innerHTML = '<p>No images available</p>';
        }

        if (review.video_url) {
            videoContainer.innerHTML = `
                <video controls>
                    <source src="${review.video_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            videoContainer.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading review:', error);
        document.body.innerHTML = `
            <div class="error-container">
                <h1>Error</h1>
                <p>Failed to load review. Please try again later.</p>
                <a href="reviews.html" class="btn btn-primary">Back to Reviews</a>
            </div>
        `;
    }
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

// Image modal
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <img src="${imageUrl}" alt="Full size image">
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.remove();
        document.body.style.overflow = '';
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    };
}

// Report review
async function reportReview(reason, details) {
    try {
        const { error } = await supabase
            .from('reports')
            .insert({
                review_id: reviewId,
                reason: reason,
                details: details,
                reported_by: (await supabase.auth.getUser()).data.user.id
            });

        if (error) throw error;

        alert('Thank you for your report. Our team will review it shortly.');
        reportModal.style.display = 'none';
    } catch (error) {
        console.error('Error reporting review:', error);
        alert('Failed to submit report. Please try again later.');
    }
}

// Share review
function shareReview() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: productName.textContent,
            text: `Check out this review on CritiCart: ${productName.textContent}`,
            url: url
        }).catch(console.error);
    } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy link. Please try again.');
        });
    }
}

// Event listeners
reportBtn.addEventListener('click', () => {
    reportModal.style.display = 'block';
});

shareBtn.addEventListener('click', shareReview);

reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('reportReason').value;
    const details = document.getElementById('reportDetails').value;
    await reportReview(reason, details);
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === reportModal) {
        reportModal.style.display = 'none';
    }
});

// Close modal when clicking close button
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        reportModal.style.display = 'none';
    });
});

// Load review on page load
loadReview();

// Review page functionality
const review = {
    // Initialize review page
    init() {
        this.loadReview();
        this.setupEventListeners();
    },

    // Load review details
    async loadReview() {
        try {
            const reviewId = this.getReviewId();
            if (!reviewId) {
                this.showError('Review ID not found');
                return;
            }

            const review = await db.getReview(reviewId);
            this.displayReview(review);
        } catch (error) {
            console.error('Error loading review:', error);
            this.showError('Failed to load review');
        }
    },

    // Get review ID from URL
    getReviewId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    },

    // Display review details
    displayReview(review) {
        // Update page title
        document.title = `${review.title} - CritiCart`;

        // Display review header
        const header = document.querySelector('.review-header');
        if (header) {
            header.innerHTML = `
                <h1>${review.title}</h1>
                <div class="review-meta">
                    <span class="category">${review.category}</span>
                    <span class="date">${this.formatDate(review.created_at)}</span>
                    <span class="author">By ${review.author.username}</span>
                </div>
            `;
        }

        // Display review content
        const content = document.querySelector('.review-content');
        if (content) {
            content.innerHTML = `
                <div class="review-media">
                    ${this.createMediaGallery(review.images)}
                    ${review.video ? this.createVideoPlayer(review.video) : ''}
                </div>
                <div class="review-details">
                    ${this.createRatingSection(review)}
                    ${this.createDescriptionSection(review)}
                    ${this.createTagsSection(review)}
                    ${this.createAuthorSection(review)}
                </div>
            `;
        }

        // Display comments
        const comments = document.querySelector('.comments-section');
        if (comments) {
            comments.innerHTML = `
                <h2>Comments (${review.comments.length})</h2>
                ${this.createCommentsList(review.comments)}
                ${this.createCommentForm()}
            `;
        }
    },

    // Create media gallery HTML
    createMediaGallery(images) {
        if (!images || images.length === 0) return '';

        return `
            <div class="image-gallery">
                ${images.map((image, index) => `
                    <div class="preview-item">
                        <img src="${image}" alt="Review image ${index + 1}" onclick="review.showFullImage('${image}')">
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Create video player HTML
    createVideoPlayer(videoUrl) {
        return `
            <div class="video-container">
                <video controls>
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    },

    // Create rating section HTML
    createRatingSection(review) {
        return `
            <div class="rating-section">
                <h2>Ratings</h2>
                <div class="ratings-grid">
                    <div class="rating-item">
                        <h3>Overall Rating</h3>
                        <div class="rating">${this.createStarRating(review.rating)}</div>
                    </div>
                    <div class="rating-item">
                        <h3>Quality</h3>
                        <div class="rating">${this.createStarRating(review.quality_rating)}</div>
                    </div>
                    <div class="rating-item">
                        <h3>Value</h3>
                        <div class="rating">${this.createStarRating(review.value_rating)}</div>
                    </div>
                    <div class="rating-item">
                        <h3>Service</h3>
                        <div class="rating">${this.createStarRating(review.service_rating)}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Create description section HTML
    createDescriptionSection(review) {
        return `
            <div class="description-section">
                <h2>Description</h2>
                <p>${review.description}</p>
            </div>
        `;
    },

    // Create tags section HTML
    createTagsSection(review) {
        if (!review.tags || review.tags.length === 0) return '';

        return `
            <div class="tags-section">
                <h2>Tags</h2>
                <div class="tags">
                    ${review.tags.map(tag => `
                        <span>${tag}</span>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Create author section HTML
    createAuthorSection(review) {
        return `
            <div class="author-section">
                <h2>About the Author</h2>
                <div class="author-info">
                    <img src="${review.author.avatar_url || 'assets/icons/default-avatar.png'}" alt="${review.author.username}" class="author-avatar">
                    <div class="author-details">
                        <h3>${review.author.username}</h3>
                        <p>${review.author.bio || 'No bio available'}</p>
                    </div>
                </div>
            </div>
        `;
    },

    // Create comments list HTML
    createCommentsList(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        }

        return `
            <div class="comments-list">
                ${comments.map(comment => `
                    <div class="comment" data-id="${comment.id}">
                        <div class="comment-header">
                            <img src="${comment.author.avatar_url || 'assets/icons/default-avatar.png'}" alt="${comment.author.username}" class="comment-avatar">
                            <div class="comment-meta">
                                <span class="comment-author">${comment.author.username}</span>
                                <span class="comment-date">${this.formatDate(comment.created_at)}</span>
                            </div>
                        </div>
                        <div class="comment-content">
                            <p>${comment.content}</p>
                        </div>
                        ${this.createCommentActions(comment)}
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Create comment form HTML
    createCommentForm() {
        return `
            <form id="commentForm" class="comment-form">
                <textarea name="content" placeholder="Write your comment..." required></textarea>
                <button type="submit" class="btn-submit">Post Comment</button>
            </form>
        `;
    },

    // Create comment actions HTML
    createCommentActions(comment) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return '';

        const isAuthor = user.id === comment.author.id;
        return `
            <div class="comment-actions">
                ${isAuthor ? `
                    <button class="btn-edit" onclick="review.editComment('${comment.id}')">Edit</button>
                    <button class="btn-delete" onclick="review.deleteComment('${comment.id}')">Delete</button>
                ` : `
                    <button class="btn-report" onclick="review.reportComment('${comment.id}')">Report</button>
                `}
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

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Show full-size image
    showFullImage(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <img src="${imageUrl}" alt="Full size image">
                <button class="close-modal">&times;</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal on click
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.className === 'close-modal') {
                modal.remove();
            }
        });
    },

    // Setup event listeners
    setupEventListeners() {
        // Comment form submission
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'commentForm') {
                e.preventDefault();
                await this.handleCommentSubmit(e.target);
            }
        });

        // Report review button
        const reportBtn = document.querySelector('.btn-report-review');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                this.showReportModal();
            });
        }

        // Share review button
        const shareBtn = document.querySelector('.btn-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareReview();
            });
        }
    },

    // Handle comment submission
    async handleCommentSubmit(form) {
        try {
            const content = form.content.value;
            const reviewId = this.getReviewId();

            const comment = await db.createComment({
                review_id: reviewId,
                content
            });

            // Reload review to show new comment
            this.loadReview();
            form.reset();
        } catch (error) {
            console.error('Error posting comment:', error);
            this.showError('Failed to post comment');
        }
    },

    // Edit comment
    async editComment(commentId) {
        try {
            const comment = await db.getComment(commentId);
            const newContent = prompt('Edit your comment:', comment.content);

            if (newContent && newContent !== comment.content) {
                await db.updateComment(commentId, { content: newContent });
                this.loadReview();
            }
        } catch (error) {
            console.error('Error editing comment:', error);
            this.showError('Failed to edit comment');
        }
    },

    // Delete comment
    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await db.deleteComment(commentId);
            this.loadReview();
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showError('Failed to delete comment');
        }
    },

    // Report comment
    reportComment(commentId) {
        this.showReportModal('comment', commentId);
    },

    // Show report modal
    showReportModal(type = 'review', id = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Report ${type}</h2>
                <form id="reportForm">
                    <div class="form-group">
                        <label for="reason">Reason for reporting:</label>
                        <select name="reason" required>
                            <option value="">Select a reason</option>
                            <option value="spam">Spam</option>
                            <option value="inappropriate">Inappropriate content</option>
                            <option value="harassment">Harassment</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="details">Additional details:</label>
                        <textarea name="details" rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-submit">Submit Report</button>
                        <button type="button" class="btn-cancel">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#reportForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleReportSubmit(e.target, type, id);
            modal.remove();
        });

        // Close modal
        const cancelBtn = modal.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    },

    // Handle report submission
    async handleReportSubmit(form, type, id) {
        try {
            const report = {
                type,
                target_id: id || this.getReviewId(),
                reason: form.reason.value,
                details: form.details.value
            };

            await db.createReport(report);
            this.showNotification('Report submitted successfully', 'success');
        } catch (error) {
            console.error('Error submitting report:', error);
            this.showError('Failed to submit report');
        }
    },

    // Share review
    shareReview() {
        const url = window.location.href;
        const title = document.title;

        if (navigator.share) {
            navigator.share({
                title,
                url
            }).catch(console.error);
        } else {
            // Fallback for browsers that don't support Web Share API
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Link copied to clipboard!', 'success');
        }
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

// Initialize review page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    review.init();
}); 