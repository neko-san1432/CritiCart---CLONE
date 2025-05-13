import { auth } from '../utils/auth.js';
import { Navigation } from '../utils/navigation.js';
import { db, supabase } from '../utils/supabase.js';

export const profile = {
    async init() {
        try {
            console.log('Profile init started');
            
            // Check if user is authenticated
            if (!auth.isAuthenticated()) {
                console.log('User not authenticated, showing auth required');
                auth.requireAuth();
                return;
            }

            console.log('User authenticated, showing profile content');
            // Show profile content
            document.getElementById('profileContent').style.display = 'block';

            // Initialize navigation
            const nav = new Navigation();
            await nav.init();
            console.log('Navigation initialized');

            // Load profile data
            await this.loadProfile();
            console.log('Profile data loaded');

            // Setup event listeners
            this.setupEventListeners();
            console.log('Event listeners set up');
        } catch (error) {
            console.error('Profile initialization error:', error);
            auth.showError('Failed to initialize profile');
        }
    },

    async loadProfile() {
        try {
            if (!auth.user) {
                throw new Error('No authenticated user');
            }

            console.log('Loading profile for user:', auth.user.id);

            // Try to get profile by user_id
            let { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', auth.user.id)
                .single();
            
            if (error) {
                console.error('Error loading profile:', error);
                
                if (error.code === 'PGRST116') {
                    console.log('Profile not found, creating new profile...');
                    // Create default profile
                    const { data: newProfile, error: createError } = await supabase
                        .from('profiles')
                        .insert([{
                            user_id: auth.user.id,
                            username: `user_${Math.random().toString(36).substr(2, 9)}`,
                            full_name: auth.user.user_metadata?.full_name || 'New User',
                            bio: 'Welcome to my profile!',
                            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.user.id}`,
                            review_count: 0,
                            comment_count: 0,
                            like_count: 0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error creating profile:', createError);
                        throw createError;
                    }

                    console.log('Created new profile:', newProfile);
                    profileData = newProfile;
                } else {
                    throw error;
                }
            }

            if (!profileData) {
                throw new Error('Profile not found and could not be created');
            }

            console.log('Loaded profile:', profileData);
            await this.updateProfileUI(profileData);
        } catch (error) {
            console.error('Error in loadProfile:', error);
            auth.showError('Failed to load profile data: ' + (error.message || 'Unknown error'));
        }
    },

    async updateProfileUI(profileData) {
        try {
            console.log('Updating UI with profile data:', profileData);
            
            // Update profile header
            document.getElementById('profileName').textContent = profileData.full_name || 'No Name Set';
            document.getElementById('profileEmail').textContent = auth.user.email;
            
            if (profileData.avatar_url) {
                document.getElementById('avatarPreview').src = profileData.avatar_url;
            }

            // Update form fields
            document.getElementById('fullName').value = profileData.full_name || '';
            document.getElementById('username').value = profileData.username || '';
            document.getElementById('bio').value = profileData.bio || '';
            document.getElementById('website').value = profileData.website || '';

            // Update stats
            document.getElementById('reviewCount').textContent = profileData.review_count || 0;
            document.getElementById('commentCount').textContent = profileData.comment_count || 0;
            document.getElementById('likeCount').textContent = profileData.like_count || 0;

            console.log('UI update complete');
        } catch (error) {
            console.error('Error updating UI:', error);
            throw error;
        }
    },

    setupEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateProfile();
            });
        }

        // Avatar upload
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.uploadAvatar(file);
                }
            });
        }
    },

    async updateProfile() {
        try {
            const updates = {
                full_name: document.getElementById('fullName').value,
                username: document.getElementById('username').value,
                bio: document.getElementById('bio').value,
                website: document.getElementById('website').value,
                updated_at: new Date().toISOString()
            };

            const userId = auth.user.id;
            console.log('Updating profile for user:', userId, updates);

            const { data: updatedProfile, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('user_id', userId)
                .select()
                .single();
            
            if (error) throw error;

            console.log('Profile updated:', updatedProfile);
            await this.updateProfileUI(updatedProfile);
            auth.showNotification('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            auth.showError('Failed to update profile: ' + (error.message || 'Unknown error'));
        }
    },

    async uploadAvatar(file) {
        try {
            // Show loading state
            const avatarPreview = document.getElementById('avatarPreview');
            avatarPreview.style.opacity = '0.5';

            // Upload file to Supabase Storage
            const userId = auth.user.id;
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            console.log('Uploading avatar:', filePath);

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    upsert: true
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            console.log('Avatar uploaded, URL:', publicUrl);

            // Update profile with new avatar URL
            const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Update UI
            await this.updateProfileUI(updatedProfile);
            avatarPreview.style.opacity = '1';
            auth.showNotification('Avatar updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            auth.showError('Failed to upload avatar: ' + (error.message || 'Unknown error'));
            document.getElementById('avatarPreview').style.opacity = '1';
        }
    }
};

// Initialize profile page
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing profile...');
    profile.init().catch(error => {
        console.error('Profile initialization failed:', error);
    });
}); 