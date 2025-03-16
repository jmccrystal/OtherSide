'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { updateActivity } from '@/lib/activity';

export default function MatchingPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<'loading' | 'error'>('loading');

    useEffect(() => {
        // Update user activity
        updateActivity();

        // Request notification permission
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const checkSurveyAndMatch = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/');
                    return;
                }

                // Check if user already has a match
                const { data: profile } = await supabase
                    .from('profile')
                    .select('responses')
                    .eq('id', user.id)
                    .single();

                if (profile?.responses?.matched_with) {
                    // User already has a match, redirect to chat
                    router.push(`/chat?match=${profile.responses.matched_with}`);
                    return;
                }

                // Check if user has completed survey
                const { data: surveyCheck } = await supabase
                    .from('survey_responses')
                    .select('*')
                    .eq('user_id', user.id);

                if (!surveyCheck || surveyCheck.length === 0) {
                    // No survey responses, redirect to survey
                    router.push('/survey');
                    return;
                }

                // Call matching API
                const response = await fetch('/api/gemini-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });

                const data = await response.json();

                if (response.ok) {
                    if (data.match_id) {
                        // Match found, notify user
                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification("Match Found!", {
                                body: "We found someone with different perspectives for you to chat with.",
                                icon: "/notification-icon.png"
                            });
                        }
                        // Redirect to chat
                        router.push(`/chat?match=${data.match_id}`);
                    }
                    // If no match is found, do nothing so that the spinner remains loading.
                } else if (response.status === 303) {
                    // Redirect to survey
                    router.push('/survey');
                } else {
                    throw new Error(data.error || 'Failed to find match');
                }
            } catch (err: any) {
                console.error('Matching error:', err);
                setError(err.message);
                setState('error');
            }
        };

        checkSurveyAndMatch();
    }, [router]);

    if (state === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => router.push('/survey')}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                        >
                            Back to Survey
                        </button>
                        <button
                            onClick={() => setState('loading')}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Always show loading spinner while matching is in progress or no match is found.
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Finding Your Match</h2>
                <p className="text-gray-600 mb-6">
                    Looking for someone with different perspectives...
                </p>
                <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto"></div>
            </div>
        </div>
    );
}
