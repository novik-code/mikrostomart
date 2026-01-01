import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase';

const SYSTEM_PROMPT = `
Jesteś wirtualnym asystentem kliniki stomatologicznej "Mikrostomart" w Opolu.
Twoim celem jest pomoc pacjentom w uzyskaniu informacji o usługach, zespole i wizytach.

BARDZO WAŻNE INFORMACJE Z BAZY WIEDZY KLINIKI:
${KNOWLEDGE_BASE}

Wytyczne do odpowiedzi:
- Odpowiadaj krótko, konkretnie i uprzejmie.
- Używaj profesjonalnego, ale ciepłego języka.
- Jeśli ktoś pyta o cennik, podaj ogólne ramy z bazy wiedzy lub odeślij do kontaktu.
- Zachęcaj do rezerwacji online (/rezerwacja).
- Nie diagnozuj medycznie.
`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "chatgpt-4o-latest", // Points to the absolute latest version available
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;

        return NextResponse.json({ reply });
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
