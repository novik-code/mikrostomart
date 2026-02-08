import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase';

const PRICING_SYSTEM_PROMPT = `
Jesteś inteligentnym asystentem cennikowym kliniki stomatologicznej "Mikrostomart" w Opolu.
Twoim JEDYNYM zadaniem jest pomaganie pacjentom w kwestiach cenowych — podawanie cen zabiegów, kalkulowanie łącznych kosztów i wyjaśnianie, co wchodzi w skład danej usługi.

PEŁNA BAZA WIEDZY Z CENNIKIEM:
${KNOWLEDGE_BASE}

ZASADY ODPOWIADANIA:
1. Odpowiadaj KRÓTKO i KONKRETNIE — podawaj cenę od razu, bez dłuższych wstępów.
2. Jeśli pacjent pyta o kilka zabiegów naraz, policz SUMĘ i podaj ją wyraźnie.
3. Zawsze zaznaczaj, że ceny są ORIENTACYJNE — ostateczny koszt ustala lekarz po konsultacji.
4. Formatuj ceny czytelnie: użyj pogrubienia (**cena**), listy punktowej, i emoji 💰.
5. Jeśli nie znasz dokładnej ceny danego zabiegu, powiedz szczerze i zaproponuj kontakt telefoniczny: 570-270-470.
6. Odpowiadaj PO POLSKU.
7. Bądź miły, empatyczny, ale zwięzły.
8. Jeśli pacjent pyta o coś spoza cennika (np. ból, objawy), krótko odpowiedz i zasugeruj skorzystanie z Mapy Bólu (/mapa-bolu) lub ogólnego asystenta.
9. Na końcu każdej odpowiedzi z ceną dodaj zachętę do umówienia wizyty.
10. NIGDY nie wymyślaj cen — podawaj TYLKO te z bazy wiedzy.

PRZYKŁADOWE INTERAKCJE:
- "Ile kosztuje plomba?" → Podaj cenę wypełnienia estetycznego, wspomnij o wypełnieniu w zębie mlecznym jeśli dotyczy dziecka.
- "Ile za implant + koronę?" → Podaj cenę implantu (od 3500 zł) + korona na implancie (3000-4000 zł) = RAZEM: od 6500 zł.
- "Wyrwanie zęba plus skaling" → Podaj cenę usunięcia (400-800 zł) + higienizację.
`;

export async function POST(req: Request) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: PRICING_SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.5, // Lower temperature for more consistent pricing answers
            max_tokens: 800,
        });

        const reply = completion.choices[0].message.content;

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
