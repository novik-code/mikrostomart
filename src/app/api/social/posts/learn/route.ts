/**
 * POST /api/social/posts/learn
 * 
 * AI Learning endpoint: compares original AI text with admin-edited text,
 * analyzes differences with GPT-4o, and saves style feedback for future generation.
 * 
 * Body: { post_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
    try {
        const { post_id } = await req.json();
        if (!post_id) {
            return NextResponse.json({ error: 'post_id wymagany' }, { status: 400 });
        }

        // Get post with original and edited text
        const { data: post, error: postErr } = await supabase
            .from('social_posts')
            .select('id, text_content, original_ai_text, edit_feedback')
            .eq('id', post_id)
            .single();

        if (postErr || !post) {
            return NextResponse.json({ error: 'Post nie znaleziony' }, { status: 404 });
        }

        if (!post.original_ai_text) {
            return NextResponse.json({ error: 'Brak oryginalnego tekstu AI do porównania' }, { status: 400 });
        }

        if (post.original_ai_text === post.text_content) {
            return NextResponse.json({ error: 'Tekst nie został zmieniony — brak różnic do analizy' }, { status: 400 });
        }

        // Analyze differences with GPT-4o
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Jesteś ekspertem od analizy stylu treści social media.
Porównujesz oryginalny tekst wygenerowany przez AI z wersją zedytowaną przez admina.

Twoim zadaniem jest:
1. Zidentyfikować KONKRETNE różnice stylistyczne
2. Wyciągnąć wnioski — czego AI powinno się nauczyć na przyszłość
3. Sformułować KRÓTKIE, jasne zasady stylistyczne

Odpowiedz w formacie JSON:
{
    "feedback": "Krótki opis zmian i wniosków (1-3 zdania)",
    "style_notes": ["Reguła 1", "Reguła 2"],
    "severity": "minor|moderate|major"
}

Przykładowe reguły:
- "Używaj krótszych zdań, max 15 słów"
- "Nie zaczynaj posta od pytania retorycznego"
- "Unikaj słowa 'innowacyjny'"
- "Hashtagi powinny być bardziej niszowe, nie ogólne"`,
                },
                {
                    role: 'user',
                    content: `ORYGINAŁ AI:\n${post.original_ai_text}\n\nPO EDYCJI ADMINA:\n${post.text_content}`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
            max_tokens: 1024,
        });

        const raw = completion.choices[0].message.content || '{}';
        const analysis = JSON.parse(raw);

        // Save feedback to post
        await supabase
            .from('social_posts')
            .update({ edit_feedback: analysis.feedback })
            .eq('id', post_id);

        // Save style notes
        if (analysis.style_notes && analysis.style_notes.length > 0) {
            for (const note of analysis.style_notes) {
                await supabase.from('social_ai_style_notes').insert({
                    note,
                    category: 'auto',
                    source_post_id: post_id,
                });
            }
        }

        return NextResponse.json({
            success: true,
            feedback: analysis.feedback,
            style_notes: analysis.style_notes || [],
            severity: analysis.severity || 'moderate',
        });
    } catch (err: any) {
        console.error('[PostLearn] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
