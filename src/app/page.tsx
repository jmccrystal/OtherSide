'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { setupActivityTracking } from '@/lib/activity';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Set up activity tracking
        const cleanup = setupActivityTracking();

        // Check if user is already logged in
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Check if user has completed survey
                const { data: surveyData } = await supabase
                    .from('survey_responses')
                    .select('*')
                    .eq('user_id', session.user.id);

                if (surveyData && surveyData.length > 0) {
                    // Check if user already has a match
                    const { data: profile } = await supabase
                        .from('profile')
                        .select('responses')
                        .eq('id', session.user.id)
                        .single();

                    if (profile?.responses?.matched_with) {
                        // User has a match, go to chat
                        router.push(`/chat?match=${profile.responses.matched_with}`);
                    } else {
                        // User completed survey but no match yet
                        router.push('/matching');
                    }
                } else {
                    // User logged in but no survey yet
                    router.push('/survey');
                }
            }
        };

        checkAuth();

        return cleanup;
    }, [router]);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/survey`
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <h1 className="text-3xl font-bold mb-3 text-gray-800">
                    The Other Side
                </h1>
                <p className="text-lg mb-6 text-gray-600">
                    Connect with people who see the world differently
                </p>

                <button
                    onClick={signInWithGoogle}
                    className="flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor"/>
                    </svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}