// DOM Elements
const reviewForm = document.getElementById('reviewForm');
const imageDropzone = document.getElementById('imageDropzone');
const videoDropzone = document.getElementById('videoDropzone');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const imagePreview = document.getElementById('imagePreview');
const videoPreview = document.getElementById('videoPreview');

// reCAPTCHA configuration
const SUBMIT_RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_SITE_KEY';
let submitRecaptchaInstance = null;

// Initialize reCAPTCHA
function initRecaptcha() {
    submitRecaptchaInstance = grecaptcha.render('submitRecaptcha', {
        'sitekey': SUBMIT_RECAPTCHA_SITE_KEY,
        'callback': onRecaptchaSuccess,
        'expired-callback': onRecaptchaExpired
    });
}

// reCAPTCHA callbacks
function onRecaptchaSuccess(token) {
    reviewForm.dataset.recaptchaToken = token;
}

function onRecaptchaExpired() {
    reviewForm.dataset.recaptchaToken = '';
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
imageDropzone.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', handleImageUpload);

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
videoDropzone.addEventListener('click', () => videoInput.click());

videoInput.addEventListener('change', handleVideoUpload);

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
    
    if (imageFiles.length + imagePreview.children.length > 5) {
        alert('Maximum 5 images allowed');
        return;
    }

    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.dataset.file = file;
            imagePreview.appendChild(img);
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
        
        const reader = new FileReader();
        reader.onload = (e) => {
            videoPreview.innerHTML = '';
            const videoElement = document.createElement('video');
            videoElement.src = e.target.result;
            videoElement.controls = true;
            videoElement.dataset.file = videoFile;
            videoPreview.appendChild(videoElement);
        };
        reader.readAsDataURL(videoFile);
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

// Handle form submission
reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const recaptchaToken = reviewForm.dataset.recaptchaToken;
    if (!recaptchaToken) {
        alert('Please complete the reCAPTCHA verification');
        return;
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Please login to submit a review');
        return;
    }

    // Validate ratings
    if (!ratings.price || !ratings.quality) {
        alert('Please provide both price and quality ratings');
        return;
    }

    // Get form data
    const formData = {
        product_name: document.getElementById('productName').value,
        product_link: document.getElementById('productLink').value,
        category: document.getElementById('category').value,
        shop_provider: document.getElementById('shopProvider').value,
        rating: (ratings.price + ratings.quality) / 2,
        description: document.getElementById('description').value,
        tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
        user_id: user.id,
        status: 'pending'
    };

    try {
        // Upload images
        const imageFiles = Array.from(imagePreview.children).map(img => img.dataset.file);
        const imageUrls = await Promise.all(imageFiles.map(file => uploadFile(file, 'images')));

        // Upload video if exists
        let videoUrl = null;
        if (videoPreview.children.length > 0) {
            const videoFile = videoPreview.children[0].dataset.file;
            videoUrl = await uploadFile(videoFile, 'videos');
        }

        // Save review to database
        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                ...formData,
                images: imageUrls,
                video: videoUrl
            }]);

        if (error) throw error;

        alert('Review submitted successfully! It will be reviewed by an admin.');
        window.location.href = 'index.html';
        grecaptcha.reset(submitRecaptchaInstance);
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Error submitting review. Please try again.');
        grecaptcha.reset(submitRecaptchaInstance);
    }
});

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