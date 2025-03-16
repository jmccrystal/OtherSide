'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { updateActivity } from '@/lib/activity';

export default function MatchingPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Poll for a match every 10 seconds
    const checkSurveyAndMatch = useCallback(async () => {
        try {
            updateActivity();

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
                router.push(`/chat?match=${profile.responses.matched_with}`);
                return;
            }

            // Check if user has completed survey
            const { data: surveyCheck } = await supabase
                .from('survey_responses')
                .select('*')
                .eq('user_id', user.id);

            if (!surveyCheck || surveyCheck.length === 0) {
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

            // If a match is found, redirect to chat
            if (data.match_id) {
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Match Found!", {
                        body: "We found someone with different perspectives for you to chat with.",
                        icon: "/notification-icon.png"
                    });
                }
                router.push(`/chat?match=${data.match_id}`);
            }
            // Otherwise, do nothing (spinner remains) and wait for the next poll.
        } catch (err: any) {
            console.error('Matching error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [router]);

    // Initial check and polling interval
    useEffect(() => {
        checkSurveyAndMatch();
        const interval = setInterval(() => {
            checkSurveyAndMatch();
        }, 10000);
        return () => clearInterval(interval);
    }, [checkSurveyAndMatch]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/survey')}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                    >
                        Back to Survey
                    </button>
                </div>
            </div>
        );
    }

    // Always show loading spinner while waiting for a match.
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Finding Your Match</h2>
                <p className="text-gray-600 mb-6">Looking for someone with different perspectives...</p>
                <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto"></div>
            </div>
        </div>
    );
}
