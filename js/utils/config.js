// Configuration file for API keys and environment variables
const ENV = {
    development: {
        supabase: {
            url: 'https://dgualcjfvzjrqzwwmvov.supabase.co',
            key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndWFsY2pmdnpqcnF6d3dtdm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzAxODIsImV4cCI6MjA2MTYwNjE4Mn0.R-gNusHP_Va683Xf1mhgdUH4NO5udxSkaUtstQwUS_A'
        },
        recaptcha: {
            siteKey: '6Ld36wkrAAAAAPzVNRDG5ghTy_ZhhjyhZJY2lelr'
        }
    },
    production: {
        supabase: {
            url: process.env.SUPABASE_URL,
            key: process.env.SUPABASE_ANON_KEY
        },
        recaptcha: {
            siteKey: process.env.RECAPTCHA_SITE_KEY
        }
    }
};

// Detect environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const config = ENV[isDevelopment ? 'development' : 'production'];

// Validate configuration
const validateConfig = () => {
    const required = ['supabase.url', 'supabase.key', 'recaptcha.siteKey'];
    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj?.[k], config);
        return !value;
    });

    if (missing.length > 0) {
        console.error('Missing required configuration:', missing);
        return false;
    }
    return true;
};

// Export validated configuration
export default Object.freeze({
    ...config,
    isDevelopment,
    validate: validateConfig
}); 