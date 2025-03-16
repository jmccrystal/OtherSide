import { supabase } from './supabase';

// Update user's active status
export async function updateActivity() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        await supabase
            .from('active_users')
            .upsert({
                user_id: user.id,
                last_active: new Date().toISOString()
            }, { onConflict: 'user_id' });
    }
}

// Set up activity tracking - call this on app load
export function setupActivityTracking() {
    // Update on page load
    updateActivity();

    // Update every 5 minutes while page is open
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    // Update before page unload
    window.addEventListener('beforeunload', updateActivity);

    // Return cleanup function
    return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', updateActivity);
    };
}