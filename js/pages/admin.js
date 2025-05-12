// Admin dashboard functionality
const admin = {
    // Initialize admin dashboard
    init() {
        this.checkAdminAccess();
        this.loadReviews();
        this.setupEventListeners();
    },

    // Check if user has admin access
    async checkAdminAccess() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            const profile = await db.getProfile(user.id);
            if (profile.role !== 'admin') {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
            window.location.href = 'index.html';
        }
    },

    // Load reviews for management
    async loadReviews() {
        try {
            const { reviews, total } = await db.getReviews({}, 1, 50);
            this.displayReviews(reviews);
            this.updatePagination(total, 1);
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showError('Failed to load reviews');
        }
    },

    // Display reviews in the table
    displayReviews(reviews) {
        const tbody = document.querySelector('.reviews-table tbody');
        if (!tbody) return;

        if (reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No reviews found</td></tr>';
            return;
        }

        tbody.innerHTML = reviews.map(review => `
            <tr data-id="${review.id}">
                <td>${review.title}</td>
                <td>${review.category}</td>
                <td>${review.author.username}</td>
                <td>${this.formatDate(review.created_at)}</td>
                <td>${this.getStatusBadge(review.status)}</td>
                <td>
                    <div class="review-actions">
                        <button class="btn-edit" onclick="admin.editReview('${review.id}')">Edit</button>
                        <button class="btn-delete" onclick="admin.deleteReview('${review.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // Get status badge HTML
    getStatusBadge(status) {
        const badges = {
            pending: '<span class="badge pending">Pending</span>',
            approved: '<span class="badge approved">Approved</span>',
            rejected: '<span class="badge rejected">Rejected</span>'
        };
        return badges[status] || badges.pending;
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Update pagination controls
    updatePagination(total, currentPage) {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(total / 50);
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

        // Admin menu clicks
        const menuItems = document.querySelectorAll('.admin-menu button');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                this.switchSection(item.dataset.section);
            });
        });
    },

    // Switch between admin sections
    switchSection(section) {
        // Update menu active state
        const menuItems = document.querySelectorAll('.admin-menu button');
        menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        // Show selected section
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = section.id === `${section}Section` ? 'block' : 'none';
        });

        // Load section data
        if (section === 'reviews') {
            this.loadReviews();
        } else if (section === 'users') {
            this.loadUsers();
        }
    },

    // Edit review
    async editReview(reviewId) {
        try {
            const review = await db.getReview(reviewId);
            this.showEditModal(review);
        } catch (error) {
            console.error('Error loading review:', error);
            this.showError('Failed to load review details');
        }
    },

    // Show edit modal
    showEditModal(review) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Edit Review</h2>
                <form id="editReviewForm">
                    <div class="form-group">
                        <label for="title">Title</label>
                        <input type="text" name="title" value="${review.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select name="category" required>
                            ${this.getCategoryOptions(review.category)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="status">Status</label>
                        <select name="status" required>
                            <option value="pending" ${review.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${review.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${review.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea name="description" rows="4" required>${review.description}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-submit">Save Changes</button>
                        <button type="button" class="btn-cancel">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#editReviewForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditSubmit(e.target, review.id);
            modal.remove();
        });

        // Close modal
        const cancelBtn = modal.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    },

    // Get category options HTML
    async getCategoryOptions(selectedCategory) {
        try {
            const categories = await db.getCategories();
            return categories.map(category => `
                <option value="${category.id}" ${category.id === selectedCategory ? 'selected' : ''}>
                    ${category.name}
                </option>
            `).join('');
        } catch (error) {
            console.error('Error loading categories:', error);
            return '';
        }
    },

    // Handle edit form submission
    async handleEditSubmit(form, reviewId) {
        try {
            const updates = {
                title: form.title.value,
                category: form.category.value,
                status: form.status.value,
                description: form.description.value
            };

            await db.updateReview(reviewId, updates);
            this.loadReviews();
            this.showNotification('Review updated successfully', 'success');
        } catch (error) {
            console.error('Error updating review:', error);
            this.showError('Failed to update review');
        }
    },

    // Delete review
    async deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            await db.deleteReview(reviewId);
            this.loadReviews();
            this.showNotification('Review deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting review:', error);
            this.showError('Failed to delete review');
        }
    },

    // Load users for management
    async loadUsers() {
        try {
            const users = await db.getUsers();
            this.displayUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    },

    // Display users in the table
    displayUsers(users) {
        const tbody = document.querySelector('.users-table tbody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr data-id="${user.id}">
                <td>
                    <div class="user-info">
                        <img src="${user.avatar_url || 'assets/icons/default-avatar.png'}" alt="${user.username}" class="user-avatar">
                        <span>${user.username}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>${this.getRoleBadge(user.role)}</td>
                <td>
                    <div class="user-actions">
                        ${user.role !== 'admin' ? `
                            <button class="btn-suspend" onclick="admin.toggleUserStatus('${user.id}', ${!user.suspended})">
                                ${user.suspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // Get role badge HTML
    getRoleBadge(role) {
        const badges = {
            admin: '<span class="badge admin">Admin</span>',
            moderator: '<span class="badge moderator">Moderator</span>',
            user: '<span class="badge user">User</span>'
        };
        return badges[role] || badges.user;
    },

    // Toggle user suspension status
    async toggleUserStatus(userId, suspend) {
        try {
            await db.updateUser(userId, { suspended: suspend });
            this.loadUsers();
            this.showNotification(`User ${suspend ? 'suspended' : 'unsuspended'} successfully`, 'success');
        } catch (error) {
            console.error('Error updating user status:', error);
            this.showError('Failed to update user status');
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

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    admin.init();
});
