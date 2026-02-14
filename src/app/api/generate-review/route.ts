import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface SurveyAnswers {
    isPatient: string;
    duration: string;
    procedures: string[];
    staffRating: number;
    comfortRating: number;
    whatYouLike: string;
    improvements: string;
    recommend: string;
}

export async function POST(request: Request) {
    try {
        const { answers } = (await request.json()) as { answers: SurveyAnswers };

        // Determine sentiment
        const avgRating = (answers.staffRating + answers.comfortRating) / 2;
        const positiveRecommend = ['Zdecydowanie tak', 'Raczej tak'].includes(answers.recommend);
        const sentiment = avgRating >= 4 && positiveRecommend ? 'positive' : 'negative';

        if (sentiment === 'negative') {
            return NextResponse.json({
                sentiment: 'negative',
                review: null,
            });
        }

        // Generate review with OpenAI
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const proceduresText = answers.procedures.length > 0 ? answers.procedures.join(', ') : 'różne zabiegi';

        const prompt = `Na podstawie poniższych odpowiedzi z ankiety pacjenta gabinetu stomatologicznego Mikrostomart w Opolu, napisz naturalną, przyjazną opinię Google po polsku. Opinia powinna być autentyczna, nie za długa (3-5 zdań), nie przesadnie entuzjastyczna ale pozytywna. Napisz ją w pierwszej osobie, jakby ją pisał sam pacjent. NIE używaj gwiazdek ani emoji.

Dane z ankiety:
- Pacjent od: ${answers.duration}
- Zabiegi: ${proceduresText}
- Ocena personelu: ${answers.staffRating}/5
- Ocena komfortu: ${answers.comfortRating}/5
- Co się podoba: ${answers.whatYouLike || 'ogólnie pozytywne wrażenia'}
- Rekomendacja: ${answers.recommend}

Napisz TYLKO treść opinii, bez żadnych dodatkowych komentarzy.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Jesteś pomocnym asystentem, który pisze autentyczne opinie Google po polsku.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 300,
        });

        const review = completion.choices[0]?.message?.content?.trim() || '';

        return NextResponse.json({ sentiment: 'positive', review });
    } catch (error) {
        console.error('[generate-review] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate review' },
            { status: 500 }
        );
    }
}
