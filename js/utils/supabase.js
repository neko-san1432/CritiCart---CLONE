// Supabase configuration
const SUPABASE_URL = 'https://dgualcjfvzjrqzwwmvov.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndWFsY2pmdnpqcnF6d3dtdm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMzAxODIsImV4cCI6MjA2MTYwNjE4Mn0.R-gNusHP_Va683Xf1mhgdUH4NO5udxSkaUtstQwUS_A';

// Initialize Supabase client only once
const supabase = window.supabase || supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Database utility functions
const db = {
    // Reviews
    async getReviews(filters = {}, page = 1, limit = 12) {
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

        // Get results
        const { data, error, count } = await query;
        if (error) throw error;

        return { reviews: data, total: count };
    },

    async getReview(id) {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, author:profiles(*), comments(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createReview(review) {
        const { data, error } = await supabase
            .from('reviews')
            .insert([review])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateReview(id, updates) {
        const { data, error } = await supabase
            .from('reviews')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteReview(id) {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);

        if (error) throw error;
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

    // Media
    async uploadMedia(file, bucket = 'media') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
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
db.supabase = supabase;
window.db = db;
window.supabase = supabase; 