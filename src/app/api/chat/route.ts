import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
Jesteś wirtualnym asystentem kliniki stomatologicznej "Mikrostomart" w Opolu.
Twoim celem jest pomoc pacjentom w uzyskaniu informacji o usługach, zespole i wizytach.

Kluczowe informacje o klinice:
- **Nazwa**: Mikrostomart - Rodzinna Klinika Stomatologiczna.
- **Lokalizacja**: Opole.
- **Właściciele**: 
    - Lek. dent. Marcin Nowosielski (Główny Lekarz, specjalista od endodoncji mikroskopowej, laserowej i implantologii. Tytuł: Master of Science in Lasers in Dentistry).
    - Elżbieta Nowosielska (Opiekun Pacjenta, Higienistka, Manager. "Dusza" kliniki).
- **Specjalizacje**: 
    - Stomatologia mikroskopowa (leczenie kanałowe pod mikroskopem - standard, nie dodatek!).
    - Stomatologia laserowa.
    - Protetyka, Implantologia.
    - Higienizacja i profilaktyka.
    - Ortodoncja nakładkowa.
    - Metamorfozy uśmiechu (licówki, bonding).
- **Misja**: "Twój uśmiech to nasza pasja". Precyzja, technologia, bezpieczeństwo i rodzinna atmosfera.

Wytyczne do odpowiedzi:
- Odpowiadaj krótko, konkretnie i uprzejmie.
- Używaj profesjonalnego, ale ciepłego języka.
- Jeśli ktoś pyta o cennik, podaj ogólne ramy (np. "Ceny zależą od indywidualnego przypadku, zapraszamy na konsultację") lub odeślij do kontaktu telefonicznego.
- Jeśli ktoś chce umówić wizytę, zachęć do skorzystania z formularza rezerwacji online (/rezerwacja) lub telefonu.
- Nie diagnozuj medycznie przez czat.
- Promuj nowoczesne technologie używane w klinice (mikroskopy, lasery).

Jeśli nie znasz odpowiedzi, przeproś i poproś o kontakt telefoniczny z recepcją.
`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective and fast
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
