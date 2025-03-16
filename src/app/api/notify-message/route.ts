import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
    try {
        const { userId, senderName, messagePreview } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Get user's email
        const { data: user, error: userError } = await supabaseAdmin
            .from('profile')
            .select('email')
            .eq('id', userId)
            .single();

        if (userError || !user?.email) {
            console.error('Error getting user email:', userError);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // In a real app, you'd send an actual email here
        // For now, we'll just log it
        console.log(`NOTIFICATION: Would send email to ${user.email}`);
        console.log(`Subject: New message from ${senderName}`);
        console.log(`Body: ${senderName} sent you a message: "${messagePreview}". Log in to respond.`);

        // For a real implementation, you'd use a service like SendGrid, AWS SES, etc.
        // Example with SendGrid (commented out):
        /*
        const msg = {
          to: user.email,
          from: 'notifications@yourapp.com',
          subject: `New message from ${senderName}`,
          text: `${senderName} sent you a message: "${messagePreview}". Log in to respond.`,
          html: `<p>${senderName} sent you a message: <em>"${messagePreview}"</em></p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/chat?match=${senderUserId}">Click here to respond</a></p>`,
        };
        await sgMail.send(msg);
        */

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in notification:', error);
        return NextResponse.json({ error: error.message || 'Notification failed' }, { status: 500 });
    }
}