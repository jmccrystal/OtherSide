// Simple survey with political questions, etc, including multiple choice and free response. React component OnClick to submit form data to Supabase, then redirect to "Loading Match" page.
// The form data should be sent in to be stored with the user's profile, and also sent along with everyone else's data to the GPT API be matched with other users.
// For the GPT API, we will need to send the data in a specific format, and then receive the data back in a specific format, so prompt accordingly.

'use client';

'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import questions from './questions.json';

export default function Survey() {
    const router = useRouter();
    const [answers, setAnswers] = useState({});

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            await supabase.from('profile').upsert({
                id: user.id,
                name: user.user_metadata?.name || user.user_metadata?.full_name,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url
            });

            await supabase.from('survey_responses').insert({
                user_id: user.id,
                answers: answers
            });

            router.push('/matching');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
            <form onSubmit={handleSubmit} className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
                {questions.map((q, i) => (
                    <div key={i} className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{q.question}</h3>

                        {q.type === 'multiple_choice' && q.options?.map((option, j) => (
                            <label key={j} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                                <input 
                                    type="radio" 
                                    name={`q-${i}`} 
                                    onChange={() => setAnswers({...answers, [i]: option})} 
                                    required 
                                    className="h-4 w-4 text-indigo-600"
                                />
                                <span className="text-gray-700">{option}</span>
                            </label>
                        ))}

                        {q.type === 'free_response' && (
                            <textarea
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                onChange={(e) => setAnswers({...answers, [i]: e.target.value})}
                                required
                            />
                        )}
                    </div>
                ))}
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition">
                    Submit
                </button>
            </form>
        </div>
    );
}