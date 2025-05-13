import { auth } from '../utils/auth.js';
import { db } from '../utils/supabase.js';
import config from '../utils/config.js';

// DOM Elements
const elements = {
    reviewForm: document.getElementById('reviewForm'),
    productName: document.getElementById('productName'),
    productLink: document.getElementById('productLink'),
    category: document.getElementById('category'),
    shopProvider: document.getElementById('shopProvider'),
    description: document.getElementById('description'),
    tags: document.getElementById('tags'),
    imageInput: document.getElementById('imageInput'),
    videoInput: document.getElementById('videoInput'),
    imagePreview: document.getElementById('imagePreview'),
    videoPreview: document.getElementById('videoPreview')
};

// reCAPTCHA configuration
let submitRecaptchaInstance = null;

// Initialize reCAPTCHA
function initRecaptcha() {
    if (typeof grecaptcha === 'undefined') {
        console.warn('reCAPTCHA not loaded');
        return;
    }

    const submitRecaptchaContainer = document.getElementById('submitRecaptcha');
    if (!submitRecaptchaContainer) {
        console.warn('reCAPTCHA container not found');
        return;
    }

    try {
        submitRecaptchaInstance = grecaptcha.render('submitRecaptcha', {
            'sitekey': config.recaptcha.siteKey,
            'callback': onRecaptchaSuccess,
            'expired-callback': onRecaptchaExpired
        });
    } catch (error) {
        if (!error.message.includes('reCAPTCHA has already been rendered')) {
            console.error('Error initializing reCAPTCHA:', error);
        }
    }
}

// reCAPTCHA callbacks
function onRecaptchaSuccess(token) {
    elements.reviewForm.dataset.recaptchaToken = token;
}

function onRecaptchaExpired() {
    elements.reviewForm.dataset.recaptchaToken = '';
}

// Rating state
const ratings = {
    price: 0,
    quality: 0
};

// Initialize star ratings
document.querySelectorAll('.stars').forEach(starsContainer => {
    const ratingType = starsContainer.dataset.rating;
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('i');
        star.className = 'far fa-star';
        star.dataset.value = i + 1;
        star.addEventListener('click', () => updateRating(ratingType, i + 1));
        starsContainer.appendChild(star);
    }
});

// Update rating
function updateRating(type, value) {
    ratings[type] = value;
    const stars = document.querySelectorAll(`.stars[data-rating="${type}"] i`);
    stars.forEach((star, index) => {
        star.className = index < value ? 'fas fa-star' : 'far fa-star';
    });
}

// Handle image upload
const imageDropzone = document.getElementById('imageDropzone');
imageDropzone.addEventListener('click', () => elements.imageInput.click());

imageDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropzone.style.borderColor = '#FF6B00';
});

imageDropzone.addEventListener('dragleave', () => {
    imageDropzone.style.borderColor = '#ddd';
});

imageDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropzone.style.borderColor = '#ddd';
    const files = e.dataTransfer.files;
    handleImageFiles(files);
});

// Handle video upload
const videoDropzone = document.getElementById('videoDropzone');
videoDropzone.addEventListener('click', () => elements.videoInput.click());

videoDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    videoDropzone.style.borderColor = '#FF6B00';
});

videoDropzone.addEventListener('dragleave', () => {
    videoDropzone.style.borderColor = '#ddd';
});

videoDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoDropzone.style.borderColor = '#ddd';
    const files = e.dataTransfer.files;
    handleVideoFiles(files);
});

// Handle image files
function handleImageFiles(files) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + elements.imagePreview.children.length > 5) {
        alert('Maximum 5 images allowed');
        return;
    }

    elements.imagePreview.innerHTML = '';
    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.dataset.file = file;
            elements.imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// Handle video files
function handleVideoFiles(files) {
    const videoFile = files[0];
    if (!videoFile || !videoFile.type.startsWith('video/')) {
        alert('Please upload a valid video file');
        return;
    }

    // Check video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
        if (video.duration > 60) {
            alert('Video must be 1 minute or less');
            return;
        }
        
        elements.videoPreview.innerHTML = '';
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(videoFile);
        videoElement.controls = true;
        videoElement.dataset.file = videoFile;
        elements.videoPreview.appendChild(videoElement);
    };
    video.src = URL.createObjectURL(videoFile);
}

// Add missing handler functions
function handleImageUpload(e) {
    handleImageFiles(e.target.files);
}

function handleVideoUpload(e) {
    handleVideoFiles(e.target.files);
}

// Initialize the page
const init = () => {
    // Check authentication first
    if (!auth.requireAuth('Please login to submit a review')) {
        // Hide the form content
        const container = document.querySelector('.submit-review-container');
        if (container) {
            container.style.display = 'none';
        }
        return;
    }

    // Show the form content
    const container = document.querySelector('.submit-review-container');
    if (container) {
        container.style.display = 'block';
    }

    // Setup form submission
    setupForm();
    
    // Setup media upload previews
    setupMediaPreviews();
};

// Setup form submission
const setupForm = () => {
    elements.reviewForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check authentication again before submission
        if (!auth.requireAuth()) return;

        try {
            // Get form data
            const formData = {
                productName: elements.productName.value,
                productLink: elements.productLink.value,
                category: elements.category.value,
                shopProvider: elements.shopProvider.value,
                description: elements.description.value,
                tags: elements.tags.value.split(',').map(tag => tag.trim()),
                rating: (ratings.price + ratings.quality) / 2,
                status: 'pending'
            };

            // Upload images
            const imageFiles = Array.from(elements.imagePreview.children).map(img => img.dataset.file);
            const imageUrls = await Promise.all(imageFiles.map(file => uploadFile(file, 'images')));

            // Upload video if exists
            let videoUrl = null;
            if (elements.videoPreview.children.length > 0) {
                const videoFile = elements.videoPreview.children[0].dataset.file;
                videoUrl = await uploadFile(videoFile, 'videos');
            }

            // Save review to database
            const result = await db.createReview({
                ...formData,
                images: imageUrls,
                video: videoUrl
            });
            
            if (result.success) {
                // Show success message
                auth.showNotification('Review submitted successfully!', 'success');
                // Redirect to reviews page
                window.location.href = 'reviews.html';
            } else {
                throw new Error(result.error || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            auth.showError(error.message || 'Failed to submit review');
        }
    });
};

// Setup media upload previews
const setupMediaPreviews = () => {
    // Image preview
    elements.imageInput?.addEventListener('change', handleImageUpload);

    // Video preview
    elements.videoInput?.addEventListener('change', handleVideoUpload);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Upload file to Supabase storage
async function uploadFile(file, folder) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('reviews')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('reviews')
        .getPublicUrl(filePath);

    return publicUrl;
}

// Initialize reCAPTCHA when the script loads
window.onload = function() {
    initRecaptcha();
}; 