import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase';
import fs from 'fs';
import path from 'path';



const SYSTEM_PROMPT = `
Jesteś wirtualnym asystentem kliniki stomatologicznej "Mikrostomart" w Opolu.
Twoim celem jest pomoc pacjentom w uzyskaniu informacji o usługach, zespole i wizytach ORAZ zbieranie kontaktów (leadów).

BARDZO WAŻNE INFORMACJE Z BAZY WIEDZY KLINIKI:
${KNOWLEDGE_BASE}

Wytyczne do odpowiedzi:
- Odpowiadaj krótko, konkretnie i uprzejmie.
- Jeśli pacjent pyta o złożony zabieg lub cenę, zaproponuj kontakt telefoniczny.
- UŻYWAJ NARZĘDZIA 'save_lead' jeśli pacjent poda numer telefonu lub wyrazi chęć kontaktu!
- Jeśli pacjent prześle zdjęcie, przeanalizuj je wizualnie (np. "Widzę przebarwienia...", "Zęby wydają się starte..."), ale ZAWSZE dodaj disclaimer: "To tylko wstępna analiza AI, konieczna jest wizyta lekarska".
- Zapraszaj do rezerwacji online (/rezerwacja).

Jeśli nie znasz odpowiedzi, przeproś i poproś o kontakt.
`;

// Tools Definition
const tools = [
    {
        type: "function",
        function: {
            name: "save_lead",
            description: "Zapisz numer telefonu i temat rozmowy pacjenta, aby recepcja mogła oddzwonić.",
            parameters: {
                type: "object",
                properties: {
                    phone: { type: "string", description: "Numer telefonu pacjenta" },
                    topic: { type: "string", description: "Temat rozmowy lub problem pacjenta (np. 'Implanty', 'Ból zęba')" },
                    name: { type: "string", description: "Imię pacjenta (opcjonalnie)" }
                },
                required: ["phone", "topic"]
            }
        }
    }
];

export async function POST(req: Request) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        // 1. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Vision + Tools support
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages
            ],
            tools: tools as any,
            tool_choice: "auto",
            temperature: 0.7,
        });

        const choice = completion.choices[0];
        const message = choice.message;
        let reply = message.content;

        // 2. Handle Tool Calls (Function Calling)
        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                // Determine if it's a standard function tool call
                if (toolCall.type === 'function' && toolCall.function) {
                    if (toolCall.function.name === 'save_lead') {
                        const args = JSON.parse(toolCall.function.arguments);

                        // SAVE LEAD LOGIC (Append to file)
                        const leadData = {
                            timestamp: new Date().toISOString(),
                            ...args
                        };

                        try {
                            const logPath = path.join(process.cwd(), 'data', 'leads.jsonl');
                            // Ensure directory exists
                            const dir = path.dirname(logPath);
                            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                            fs.appendFileSync(logPath, JSON.stringify(leadData) + '\n');
                            console.log("Lead saved:", leadData);
                        } catch (err) {
                            console.error("Failed to save lead:", err);
                        }

                        // Mock response from function
                        reply = `Dziękuję! Zapisałem Twój numer (${args.phone}). Nasza recepcja oddzwoni w sprawie: ${args.topic}.`;
                    }
                }
            }
        }

        // 3. Logging Analytics (Append conversation snippet to logs)
        try {
            const lastUserMsg = messages[messages.length - 1];
            const logEntry = {
                timestamp: new Date().toISOString(),
                user_message: typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '[Image/Mixed]',
                bot_reply: reply,
                has_image: Array.isArray(lastUserMsg.content)
            };
            const chatLogPath = path.join(process.cwd(), 'data', 'chat_logs.jsonl');
            // Ensure directory exists
            const dir = path.dirname(chatLogPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.appendFileSync(chatLogPath, JSON.stringify(logEntry) + '\n');
        } catch (e) {
            console.error("Logging failed", e);
        }

        return NextResponse.json({ reply });
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
