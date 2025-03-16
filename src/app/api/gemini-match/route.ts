// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
    try {
        // Get the request body which will contain the user ID
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Get all survey responses with admin client (bypasses RLS)
        const { data: allResponses, error: responsesError } = await supabaseAdmin
            .from('survey_responses')
            .select('*');

        if (responsesError) {
            console.error('Error fetching responses:', responsesError);
            return NextResponse.json({ error: 'Failed to fetch survey data' }, { status: 500 });
        }

        console.log('All responses:', allResponses);

        // Find current user's response
        const currentUserResponse = allResponses?.find(r => r.user_id === userId);
        console.log('Current user response:', currentUserResponse);
        if (!currentUserResponse) {
            return NextResponse.json({ error: 'Survey not completed' }, { status: 400 });
        }

        // Get other users' responses
        const otherResponses = allResponses.filter(r => r.user_id !== userId);
        if (otherResponses.length === 0) {
            return NextResponse.json({ error: 'No other users to match with yet' }, { status: 404 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Format data for Gemini
        const prompt = `
      You are an algorithm that matches people with opposing political views who can have a productive conversation.
      
      Find the BEST MATCH for the current user based on having significantly different political views but potential for constructive dialogue.
      
      Current user's survey responses:
      ${JSON.stringify(currentUserResponse.answers)}
      
      Other users' survey responses:
      ${JSON.stringify(otherResponses.map(r => ({ id: r.user_id, answers: r.answers })))}
      
      Return a JSON object with ONLY:
      {
        "match_id": "user_id_of_best_match",
        "match_reason": "Brief explanation of why these users would have an interesting conversation"
      }
      
      IMPORTANT: DO NOT INCLUDE A CODE BLOCK. RESPONSE SHOULD BE RAW JSON ONLY. NO \`\`\`json TAGS.
    `;

        // Call Gemini API
        const result = await model.generateContent(prompt);
        const response = result.response;
        let matchData;

        try {
            matchData = JSON.parse(response.text());
        } catch (e) {
            console.error('Failed to parse Gemini response:', response.text());
            return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
        }

        // Update user profile with match info
        await supabaseAdmin
            .from('profile')
            .update({
                responses: {
                    matched_with: matchData.match_id,
                    match_reason: matchData.match_reason
                }
            })
            .eq('id', userId);

        return NextResponse.json(matchData);
    } catch (error: any) {
        console.error('Error in matching:', error);
        return NextResponse.json({ error: error.message || 'Matching failed' }, { status: 500 });
    }
}