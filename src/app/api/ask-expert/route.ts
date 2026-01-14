import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { question, honeypot } = body;

        // 1. HONEYPOT CHECK (Silent Rejection)
        if (honeypot) {
            console.log("AskExpert: Honeypot filled. Ignoring.");
            return NextResponse.json({ success: true }); // Fake success
        }

        if (!question || question.length < 5) {
            return NextResponse.json({ error: "Pytanie jest zbyt krótkie." }, { status: 400 });
        }

        // 2. AI SPAM FILTER (OpenAI)
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const moderationcheck = await openai.moderations.create({ input: question });

        if (moderationcheck.results[0].flagged) {
            console.log("AskExpert: OpenAI Moderation flagged content.");
            return NextResponse.json({ success: true }); // Fake success
        }

        // 3. AI TOPIC CHECK (Is it about dentistry?)
        const analysis = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Jesteś filtrem spamu dla kliniki stomatologicznej. Oceń czy podane pytanie dotyczy stomatologii, zdrowia, medycyny lub estetyki twarzy. Odpowiedz TYLKO 'TAK' lub 'NIE'." },
                { role: "user", content: question }
            ],
            temperature: 0
        });

        const isRelevant = analysis.choices[0].message.content?.trim().toUpperCase() === "TAK";

        if (!isRelevant) {
            console.log("AskExpert: Question irrelevant:", question);
            return NextResponse.json({ success: true }); // Fake success
        }

        // 4. SAVE TO DB (If passed all checks)
        console.log("AskExpert: Relevance Pass. Initializing Supabase...");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("AskExpert: Inserting into DB...");
        const { error } = await supabase.from('article_ideas').insert({ question });

        if (error) {
            console.error("AskExpert: Supabase Insert Error:", JSON.stringify(error));
            throw error;
        }

        console.log("AskExpert: Success!");
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("AskExpert API Error Full:", error);
        return NextResponse.json({ error: "Wystąpił błąd serwera: " + error.message }, { status: 500 });
    }
}
