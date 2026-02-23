import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/employee/tts
 * Converts text to speech using OpenAI TTS (model: tts-1, voice: nova).
 * Returns audio/mpeg stream.
 *
 * Body: { text: string, voice?: 'nova' | 'alloy' | 'shimmer' | 'echo' | 'fable' | 'onyx' }
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const { text, voice = 'nova' } = await req.json();

    if (!text?.trim()) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Truncate very long texts (TTS limit = 4096 chars)
    const input = text.slice(0, 4000);

    try {
        const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice,
                input,
                response_format: 'mp3',
            }),
        });

        if (!ttsRes.ok) {
            const err = await ttsRes.text();
            console.error('[TTS] OpenAI error:', err);
            return NextResponse.json({ error: 'TTS API error' }, { status: 502 });
        }

        // Stream audio back to client
        const audioBuffer = await ttsRes.arrayBuffer();
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store',
            },
        });
    } catch (e: any) {
        console.error('[TTS] Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
