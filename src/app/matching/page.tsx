    'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MatchingPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const findMatch = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    throw new Error('Not authenticated');
                }

                // TESTING: Make sure we have survey data
                const { data: surveyCheck } = await supabase
                    .from('survey_responses')
                    .select('*')
                    .eq('user_id', user.id);

                console.log('Found survey data:', surveyCheck);

                // If no survey data, create test data
                if (!surveyCheck || surveyCheck.length === 0) {
                    console.log('Creating test survey data...');
                    const { error } = await supabase
                        .from('survey_responses')
                        .insert({
                            user_id: user.id,
                            answers: {
                                "0": "Moderate",
                                "1": "Serious concern but balanced approach",
                                "2": "I believe in fair taxation and social safety nets while maintaining economic growth."
                            }
                        });

                    if (error) {
                        console.error('Error creating survey data:', error);
                    } else {
                        console.log('Created test survey data');
                    }
                }

                // Call our Gemini matching API
                const response = await fetch('/api/gemini-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to find match');
                }

                // Wait a moment for dramatic effect
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Redirect to chat page with matched user
                router.push(`/chat?match=${data.match_id}`);
            } catch (err: any) {
                console.error('Matching error:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        findMatch();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                {error ? (
                    <div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
                        <p className="text-gray-700 mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/survey')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Back to Survey
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Finding Your Match</h2>
                        <p className="text-gray-600 mb-6">
                            Looking for someone with different perspectives...
                        </p>
                        <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto"></div>
                    </>
                )}
            </div>
        </div>
    );
}