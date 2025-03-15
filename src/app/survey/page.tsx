// Simple survey with political questions, etc, including multiple choice and free response. React component OnClick to submit form data to Supabase, then redirect to "Loading Match" page.
// The form data should be sent in to be stored with the user's profile, and also sent along with everyone else's data to the GPT API be matched with other users.
// For the GPT API, we will need to send the data in a specific format, and then receive the data back in a specific format, so prompt accordingly.

// ChatGPT Prompt:
// You are trying to match up users with the most DIFFERENT beliefs. The following is a list of questions that a user has answered.
// After that, you will receive a list of other users' answers to the same questions. You must match the user with the most different beliefs from the user.
// Your response should consist ONLY of the user's ID that you are matching with the user.
//

'use client';

export default function PageName() {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Matching Survey</h1>

        </div>
    );
}


