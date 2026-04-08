import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { getAICompletion } from '@/lib/unifiedAI';

export async function POST(req: Request) {
    const ip = getClientIP(req);
    const rl = await checkRateLimit(`cennik:${ip}`, 20);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Zbyt wiele zapytań. Spróbuj za chwilę.' }, { status: 429 });
    }

    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const extraContext = `ZASADY ODPOWIADANIA NA PYTANIA O CENY:
1. Odpowiadaj KRÓTKO i KONKRETNIE — podawaj cenę od razu, bez dłuższych wstępów.
2. Jeśli pacjent pyta o kilka zabiegów naraz, policz SUMĘ i podaj ją wyraźnie.
3. Zawsze zaznaczaj, że ceny są ORIENTACYJNE — ostateczny koszt ustala lekarz po konsultacji.
4. Formatuj ceny czytelnie: użyj pogrubienia (**cena**), listy punktowej, i emoji 💰.
5. Jeśli nie znasz dokładnej ceny, powiedz szczerze i zaproponuj kontakt telefoniczny: +48 570 270 470.
6. Odpowiadaj PO POLSKU. Bądź miły, empatyczny, ale zwięzły.
7. Jeśli pacjent pyta o coś spoza cennika (np. ból, objawy), zasugeruj Mapę Bólu (/mapa-bolu).
8. Na końcu każdej odpowiedzi z ceną dodaj zachętę do umówienia wizyty.
9. NIGDY nie wymyślaj cen — podawaj TYLKO te z bazy wiedzy.`;

        const result = await getAICompletion({
            context: 'pricing',
            messages,
            extraSystemContext: extraContext,
            temperature: 0.5,
            maxTokens: 800,
        });

        const reply = result.reply;

        // Log pricing queries for analytics
        try {
            const lastUserMsg = messages[messages.length - 1];
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: 'pricing_query',
                user_message: typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '[Mixed]',
                bot_reply: reply,
            };
            // Log to console in production (Vercel captures this)
            console.log('PRICING_QUERY:', JSON.stringify(logEntry));
        } catch (e) {
            console.error("Pricing logging failed", e);
        }

        return NextResponse.json({ reply });
    } catch (error) {
        console.error('Error in cennik-chat API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
