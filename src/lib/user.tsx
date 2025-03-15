import { supabase } from './supabase';

export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try to get profile
    const { data: profile } = await supabase.from('profile')
        .select('*')
        .eq('id', user.id)
        .single();

    return { user, profile };
}