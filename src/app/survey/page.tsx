// Simple survey with political questions, etc, including multiple choice and free response. React component OnClick to submit form data to Supabase, then redirect to "Loading Match" page.
// The form data should be sent in to be stored with the user's profile, and also sent along with everyone else's data to the GPT API be matched with other users.
// For the GPT API, we will need to send the data in a specific format, and then receive the data back in a specific format, so prompt accordingly.

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

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // First make sure profile exists
            const { error: profileError } = await supabase.from('profile').upsert({
                id: user.id,
                name: user.user_metadata?.name || user.user_metadata?.full_name,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url
            });

            if (profileError) console.error("Profile error:", profileError);

            // Then save survey answers
            const { error: surveyError } = await supabase.from('survey_responses').insert({
                user_id: user.id,
                answers: answers
            });

            if (surveyError) console.error("Survey error:", surveyError);
            else router.push('/matching');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {questions.map((q, i) => (
                <div key={i}>
                    <h3>{q.question}</h3>

                    {q.type === 'multiple_choice' && q.options?.map((option, j) => (
                        <label key={j}>
                            <input
                                type="radio"
                                name={`q-${i}`}
                                onChange={() => setAnswers({...answers, [i]: option})}
                                required
                            />
                            {option}
                        </label>
                    ))}

                    {q.type === 'free_response' && (
                        <textarea
                            onChange={(e) => setAnswers({...answers, [i]: e.target.value})}
                            required
                        />
                    )}
                </div>
            ))}
            <button type="submit">Submit</button>
        </form>
    );
}


