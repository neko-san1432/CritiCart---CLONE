import { config } from './config.js';

// Initialize Supabase client
const supabase = window.supabase.createClient(config.supabase.url, config.supabase.key);

// Cache implementation
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
};

const setCachedData = (key, data) => {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
};

// Error handling
class DatabaseError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.details = details;
    }
}

const handleError = (error) => {
    console.error('Database error:', error);
    
    // Define common error messages
    const errorMessages = {
        'PGRST116': 'Resource not found',
        '23505': 'This record already exists',
        '23503': 'Referenced record does not exist',
        '42P01': 'Database table not found',
        '42703': 'Column does not exist',
        '23502': 'Required field is missing',
        'PGRST301': 'Row level security violation',
        'AUTH001': 'Authentication required',
        'AUTH002': 'Invalid credentials',
        'AUTH003': 'Email not confirmed',
        'AUTH004': 'Invalid token',
        'STORAGE001': 'File upload failed',
        'STORAGE002': 'File not found',
        'NETWORK': 'Network connection error'
    };

    // Get user-friendly error message
    let userMessage = 'An unexpected error occurred';
    let errorTitle = 'Error';

    if (error.code) {
        userMessage = errorMessages[error.code] || error.message || userMessage;
        errorTitle = `Error (${error.code})`;
    } else if (error.message && error.message.includes('network')) {
        userMessage = errorMessages.NETWORK;
        errorTitle = 'Network Error';
    }

    // Show error modal to user
    if (typeof window !== 'undefined' && window.auth) {
        window.auth.showError(userMessage, errorTitle);
    }

    // Return a generic error object without sensitive details
    return {
        success: false,
        error: userMessage
    };
};

// Database utility functions
const db = {
    // Products
    async getProducts(filters = {}, page = 1, limit = 12) {
        const cacheKey = `products:${JSON.stringify(filters)}:${page}:${limit}`;
        const cached = getCachedData(cacheKey);
        if (cached) return cached;

        try {
            let query = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .order('name');

            // Apply filters
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            if (filters.minRating) {
                query = query.gte('average_rating', filters.minRating);
            }
            if (filters.search) {
                query = query.ilike('name', `%${filters.search}%`);
            }

            // Apply pagination
            const start = (page - 1) * limit;
            const end = start + limit - 1;
            query = query.range(start, end);

            const { data, error, count } = await query;
            if (error) throw error;

            const result = { products: data, total: count };
            setCachedData(cacheKey, result);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error fetching products:', error);
            return { success: false, error: error.message };
        }
    },

    // Reviews
    async getReviews(filters = {}, page = 1, limit = 12) {
        const cacheKey = `reviews:${JSON.stringify(filters)}:${page}:${limit}`;
        const cached = getCachedData(cacheKey);
        if (cached) return cached;

        try {
            let query = supabase
                .from('reviews')
                .select('*, author:profiles(*)', { count: 'exact' });

            // Apply filters
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            if (filters.rating) {
                query = query.gte('rating', filters.rating);
            }
            if (filters.search) {
                query = query.ilike('title', `%${filters.search}%`);
            }

            // Apply pagination
            const start = (page - 1) * limit;
            const end = start + limit - 1;
            query = query.range(start, end);

            const { data, error, count } = await query;
            if (error) throw error;

            const result = { reviews: data, total: count };
            setCachedData(cacheKey, result);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error fetching reviews:', error);
            return { success: false, error: error.message };
        }
    },

    async getReview(id) {
        const cacheKey = `review:${id}`;
        const cached = getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*, author:profiles(*), comments(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setCachedData(cacheKey, data);
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching review:', error);
            return { success: false, error: error.message };
        }
    },

    async createReview(review) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .insert([review])
                .select()
                .single();

            if (error) throw error;
            // Invalidate relevant caches
            cache.clear();
            return data;
        } catch (error) {
            return handleError(error);
        }
    },

    async updateReview(id, updates) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            // Invalidate relevant caches
            cache.delete(`review:${id}`);
            return data;
        } catch (error) {
            return handleError(error);
        }
    },

    async deleteReview(id) {
        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;
            // Invalidate relevant caches
            cache.delete(`review:${id}`);
        } catch (error) {
            return handleError(error);
        }
    },

    // Comments
    async getComments(reviewId) {
        const { data, error } = await supabase
            .from('comments')
            .select('*, author:profiles(*)')
            .eq('review_id', reviewId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createComment(comment) {
        const { data, error } = await supabase
            .from('comments')
            .insert([comment])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteComment(id) {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Profiles
    async getProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    },

    async updateProfile(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Media handling with retry logic
    async uploadMedia(file, bucket = 'media', retries = 3) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        for (let i = 0; i < retries; i++) {
            try {
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(filePath);

                return publicUrl;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    },

    async deleteMedia(path, bucket = 'media') {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
    },

    // Categories
    async getCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    },

    // Tags
    async getTags() {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    },

    // Get reviews for a specific product
    async getProductReviews(productId) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    author:profiles (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Format the reviews data
            return data.map(review => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.created_at,
                author_name: review.author?.full_name || 'Anonymous',
                author_avatar: review.author?.avatar_url
            }));
        } catch (error) {
            console.error('Error fetching reviews:', error);
            return [];
        }
    },

    // Helper functions
    async handleError(error) {
        console.error('Database error:', error);
        throw new Error(error.message);
    },

    async getProductDetails(productId) {
        try {
            // Get product details and reviews in parallel
            const [productResult, reviewsResult] = await Promise.all([
                supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single(),
                supabase
                    .from('reviews')
                    .select(`
                        *,
                        author:profiles (
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('product_id', productId)
                    .order('created_at', { ascending: false })
            ]);

            if (productResult.error) throw productResult.error;
            if (reviewsResult.error) throw reviewsResult.error;

            // Format reviews data
            const reviews = reviewsResult.data.map(review => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.created_at,
                author_name: review.author?.full_name || 'Anonymous',
                author_avatar: review.author?.avatar_url
            }));

            // Combine product and reviews data
            return {
                success: true,
                data: {
                    ...productResult.data,
                    reviews
                }
            };
        } catch (error) {
            console.error('Error fetching product details:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Export utilities
export { supabase, db, DatabaseError }; 