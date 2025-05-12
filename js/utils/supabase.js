import { createClient } from '@supabase/supabase-js';
import config from './config.js';

// Validate configuration before initializing
if (!config.validate()) {
    throw new Error('Invalid Supabase configuration');
}

// Initialize Supabase client with custom options
const supabase = createClient(config.supabase.url, config.supabase.key, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            'x-application-name': 'criticart'
        }
    }
});

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
    throw new DatabaseError(
        error.message || 'An unexpected error occurred',
        error.code || 'UNKNOWN_ERROR',
        error.details || {}
    );
};

// Database utility functions
const db = {
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
            return result;
        } catch (error) {
            return handleError(error);
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
            return data;
        } catch (error) {
            return handleError(error);
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

    // Helper functions
    async handleError(error) {
        console.error('Database error:', error);
        throw new Error(error.message);
    }
};

// Export utilities
export { db, supabase, DatabaseError }; 