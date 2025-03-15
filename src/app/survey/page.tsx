// Simple survey with political questions, etc, including multiple choice and free response. React component OnClick to submit form data to Supabase, then redirect to "Loading Match" page.
// The form data should be sent in to be stored with the user's profile, and also sent along with everyone else's data to the GPT API be matched with other users.
// For the GPT API, we will need to send the data in a specific format, and then receive the data back in a specific format, so prompt accordingly.

// ChatGPT Prompt:
// You are trying to match up users with the most DIFFERENT beliefs. The following is a list of questions that a user has answered.
// After that, you will receive a list of other users' answers to the same questions. You must match the user with the most different beliefs from the user.
// Your response should consist ONLY of the user's ID that you are matching with the user.
//

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Assuming questions.json exists at this location
import questions from './questions.json';

export default function Survey() {
    const router = useRouter();
    const [answers, setAnswers] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('survey_responses').insert([{
            user_id: user.id,
            answers: answers
        }]);
        router.push('/survey/matching');
    };

    // @ts-ignore
    return (
        <form onSubmit={handleSubmit}>
            {questions.map((q, i) => (
                <div key={i}>
                    <h3>{q.question}</h3>

                    {q.type === 'multiple_choice' && q.options.map((option, j) => (
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

