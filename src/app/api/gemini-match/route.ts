import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Fetch current user's profile for previous_matches
        const { data: currentUserProfile, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('id, responses')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching current user profile:', profileError);
            return NextResponse.json({ error: 'Failed to fetch current user profile' }, { status: 500 });
        }

        const previousMatches = (currentUserProfile?.responses?.previous_matches) || [];

        // Get all survey responses (bypassing RLS)
        const { data: allResponses, error: responsesError } = await supabaseAdmin
            .from('survey_responses')
            .select('*');

        if (responsesError) {
            console.error('Error fetching responses:', responsesError);
            return NextResponse.json({ error: 'Failed to fetch survey data' }, { status: 500 });
        }

        // Find current user's survey response
        const currentUserResponse = allResponses?.find(r => r.user_id === userId);
        if (!currentUserResponse) {
            return NextResponse.json({ error: 'Survey not completed' }, { status: 400 });
        }

        // Filter out the current user's response
        let otherResponses = allResponses.filter(r => r.user_id !== userId);
        if (otherResponses.length === 0) {
            return NextResponse.json({}, { status: 200 });
        }

        // Fetch candidate profiles for filtering
        const candidateIds = otherResponses.map(r => r.user_id);
        const { data: candidateProfiles, error: candidateProfilesError } = await supabaseAdmin
            .from('profile')
            .select('id, responses')
            .in('id', candidateIds);

        if (candidateProfilesError) {
            console.error('Error fetching candidate profiles:', candidateProfilesError);
            return NextResponse.json({ error: 'Failed to fetch candidate profiles' }, { status: 500 });
        }

        // Exclude candidates already in a chat or matched before with current user
        otherResponses = otherResponses.filter(r => {
            const candidateProfile = candidateProfiles.find(p => p.id === r.user_id);
            if (!candidateProfile) return false;
            if (candidateProfile.responses && candidateProfile.responses.matched_with) return false;
            if (previousMatches.includes(r.user_id)) return false;
            return true;
        });

        if (otherResponses.length === 0) {
            // Return an empty object so the client keeps polling (spinner remains)
            return NextResponse.json({}, { status: 200 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
      You are an algorithm that matches people with opposing political views who can have a productive conversation.
      
      Analyze the current user's survey responses against all potential matches. For each potential match:
      1. Calculate a disagreement score from 0.0 to 1.0 where:
         - 0.0 means completely aligned views
         - 1.0 means completely opposing views but could have constructive dialogue
      2. Only include matches with a disagreement score >= 0.5
      3. Provide a brief reason why each match would lead to an interesting conversation
      
      Current user's survey responses:
      ${JSON.stringify(currentUserResponse.answers)}
      
      Other users' survey responses:
      ${JSON.stringify(otherResponses.map(r => ({ id: r.user_id, answers: r.answers })))}
      IMPORTANT: Return the JSON object as plain text without any markdown formatting, triple backticks, or code fences.
      Return a JSON object with ONLY:
      {
        "matches": [
          {
            "user_id": "user_id_of_match",
            "disagreement_score": 0.00,
            "match_reason": "Brief explanation of why these users would have an interesting conversation"
          },
          ...more matches if available
        ]
      }
    `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let matchData;

        try {
            matchData = JSON.parse(response.text());
            if (matchData.matches && matchData.matches.length > 0) {
                matchData.matches.forEach(match => {
                    console.log(`Match ${match.user_id}: ${match.disagreement_score.toFixed(2)} (${match.disagreement_score * 100}%)`);
                });
            } else {
                console.log('No matches found');
            }
        } catch (e) {
            console.error('Failed to parse Gemini response:', response.text());
            return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
        }

        // If no matches are returned, simply return an empty object so the client continues polling.
        if (!matchData.matches || matchData.matches.length === 0) {
            return NextResponse.json({}, { status: 200 });
        }

        // Sort matches by highest disagreement score
        const sortedMatches = matchData.matches.sort((a, b) => b.disagreement_score - a.disagreement_score);
        const bestMatch = sortedMatches[0];

        // Update the current user's profile with the new match info
        await supabaseAdmin
            .from('profile')
            .update({
                responses: {
                    matched_with: bestMatch.user_id,
                    match_reason: bestMatch.match_reason,
                    disagreement_score: bestMatch.disagreement_score
                }
            })
            .eq('id', userId);

        return NextResponse.json({
            match_id: bestMatch.user_id,
            match_reason: bestMatch.match_reason,
            disagreement_score: bestMatch.disagreement_score
        });
    } catch (error: any) {
        console.error('Error in matching:', error);
        return NextResponse.json({ error: error.message || 'Matching failed' }, { status: 500 });
    }
}

