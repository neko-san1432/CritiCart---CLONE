// Supabase configuration
const SUPABASE_URL = 'https://dgualcjfvzjrqzwwmvov.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndWFsY2pmdnpqcnF6d3dtdm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzAxODIsImV4cCI6MjA2MTYwNjE4Mn0.R-gNusHP_Va683Xf1mhgdUH4NO5udxSkaUtstQwUS_A';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// reCAPTCHA configuration
const RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_SITE_KEY';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const closeButtons = document.querySelectorAll('.close');

let loginRecaptchaInstance = null;
let registerRecaptchaInstance = null;

// Initialize reCAPTCHA
function initRecaptcha() {
    // Initialize login reCAPTCHA
    loginRecaptchaInstance = grecaptcha.render('loginRecaptcha', {
        'sitekey': RECAPTCHA_SITE_KEY,
        'callback': onLoginRecaptchaSuccess,
        'expired-callback': onLoginRecaptchaExpired
    });

    // Initialize register reCAPTCHA
    registerRecaptchaInstance = grecaptcha.render('registerRecaptcha', {
        'sitekey': RECAPTCHA_SITE_KEY,
        'callback': onRegisterRecaptchaSuccess,
        'expired-callback': onRegisterRecaptchaExpired
    });
}

// Modal handling
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
    if (!loginRecaptchaInstance) {
        initRecaptcha();
    }
    grecaptcha.reset(loginRecaptchaInstance);
});

registerBtn.addEventListener('click', () => {
    registerModal.style.display = 'block';
    if (!registerRecaptchaInstance) {
        initRecaptcha();
    }
    grecaptcha.reset(registerRecaptchaInstance);
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
        grecaptcha.reset(loginRecaptchaInstance);
        grecaptcha.reset(registerRecaptchaInstance);
    });
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
        grecaptcha.reset(loginRecaptchaInstance);
    }
    if (e.target === registerModal) {
        registerModal.style.display = 'none';
        grecaptcha.reset(registerRecaptchaInstance);
    }
});

// reCAPTCHA callbacks
function onLoginRecaptchaSuccess(token) {
    document.getElementById('loginForm').dataset.recaptchaToken = token;
}

function onLoginRecaptchaExpired() {
    document.getElementById('loginForm').dataset.recaptchaToken = '';
}

function onRegisterRecaptchaSuccess(token) {
    document.getElementById('registerForm').dataset.recaptchaToken = token;
}

function onRegisterRecaptchaExpired() {
    document.getElementById('registerForm').dataset.recaptchaToken = '';
}

// Login handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recaptchaToken = loginForm.dataset.recaptchaToken;
    if (!recaptchaToken) {
        alert('Please complete the reCAPTCHA verification');
        return;
    }

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Successful login
        loginModal.style.display = 'none';
        updateUIForLoggedInUser(data.user);
        grecaptcha.reset(loginRecaptchaInstance);
    } catch (error) {
        alert('Error logging in: ' + error.message);
        grecaptcha.reset(loginRecaptchaInstance);
    }
});

// Registration handling
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recaptchaToken = registerForm.dataset.recaptchaToken;
    if (!recaptchaToken) {
        alert('Please complete the reCAPTCHA verification');
        return;
    }

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: 'client' // Default role for new users
                }
            }
        });
        
        if (error) throw error;
        
        // Successful registration
        registerModal.style.display = 'none';
        alert('Registration successful! Please check your email for verification.');
        grecaptcha.reset(registerRecaptchaInstance);
    } catch (error) {
        alert('Error registering: ' + error.message);
        grecaptcha.reset(registerRecaptchaInstance);
    }
});

// Check authentication state
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        updateUIForLoggedInUser(user);
    }
}

// Update UI based on authentication state
function updateUIForLoggedInUser(user) {
    const authButtons = document.querySelector('.auth-buttons');
    authButtons.innerHTML = `
        <div class="user-menu">
            <span>Welcome, ${user.user_metadata.full_name}</span>
            <button onclick="logout()" class="btn">Logout</button>
        </div>
    `;
}

// Logout handling
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Refresh page to reset UI
        window.location.reload();
    } catch (error) {
        alert('Error logging out: ' + error.message);
    }
}

// Initialize reCAPTCHA when the script loads
window.onload = function() {
    initRecaptcha();
};

// Check auth state on page load
checkAuth(); 