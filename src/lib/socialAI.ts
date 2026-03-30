/**
 * Social Media AI Content Generation Helpers
 * 
 * Generates text content (GPT-4o) and images (Flux/DALL-E 3)
 * for social media posts across Facebook, Instagram, TikTok, YouTube.
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize, brand } from '@/lib/brandConfig';

// ── Types ──────────────────────────────────────────────────────────

export interface GeneratedContent {
    text: string;
    hashtags: string[];
    imagePrompt: string;
    title?: string;          // for YouTube
    videoDescription?: string; // for video posts
}

export interface GeneratedImage {
    url: string;             // final public URL (Supabase Storage)
    base64?: string;         // raw base64 if needed
}

export type ContentType = 'post_text_image' | 'video_short' | 'carousel';
export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'youtube';

// ── Platform-specific config ───────────────────────────────────────

const PLATFORM_GUIDELINES: Record<Platform, string> = {
    facebook: `Facebook: 
- Długość: 100-300 słów (Facebook preferuje dłuższe posty)
- Emoji: umiarkowanie, 3-5 na post
- Hashtagi: 3-5, na końcu
- CTA: zachęta do komentarza, udostępnienia lub wizyty
- Ton: profesjonalny ale ciepły, jak lekarz rozmawiający z pacjentem`,

    instagram: `Instagram:
- Długość: 80-200 słów (zwięzłe, ale treściwe)
- Emoji: więcej, 5-10 na post, rozrzucone w tekście
- Hashtagi: 10-20, mix popularnych i niszowych, na końcu
- CTA: "Link w bio" lub "Zapisz ten post"
- Ton: inspirujący, edukujący, wizualny`,

    tiktok: `TikTok (opis wideo):
- Długość: 30-80 słów (krótko i na temat)  
- Emoji: 3-5, na początku
- Hashtagi: 5-8, trendy + niszowe
- CTA: "Obserwuj po więcej" lub pytanie do widzów
- Ton: dynamiczny, casualowy, młodzieżowy ale profesjonalny`,

    youtube: `YouTube (opis wideo):
- Długość: 200-400 słów (SEO-friendly, szczegółowy)
- Emoji: minimalne, 2-3
- Hashtagi: 3-5, w pierwszej linii
- CTA: "Subskrybuj i włącz dzwonek" + link do rezerwacji
- Ton: ekspert, edukacyjny, autorytatywny ale przystępny
- Dodaj timestampy jeśli to dłuższe wideo`,
};

const DENTAL_TOPICS = [
    'Korzyści z regularnych przeglądów stomatologicznych',
    'Jak prawidłowo szczotkować zęby — najczęstsze błędy',
    'Implant vs most — co wybrać?',
    'Wybielanie zębów — metody i fakty',
    'Leczenie kanałowe pod mikroskopem — bez bólu',
    'Laserowe leczenie dziąseł — rewolucja w periodontologii',
    'Bruksizm — skrzytanie zębami i jak z nim walczyć',
    'Pierwsza wizyta u dentysty z dzieckiem — poradnik dla rodziców',
    'Czym jest stomatologia estetyczna?',
    'Korony porcelanowe — kiedy warto?',
    'Nakładki ortodontyczne — niewidoczna korekta uśmiechu',
    'Jak dbać o zęby w ciąży?',
    'Fluoryzacja — czy jest bezpieczna?',
    'Zdrowa dieta a zdrowe zęby — co jeść?',
    'Nadwrażliwość zębów — przyczyny i rozwiązania',
    'Technologia 3D w stomatologii',
    'Białe plamy na zębach — co oznaczają?',
    'Próchnica wczesna u dzieci — zapobieganie',
    'Protezy na implantach — komfort jak z własnymi zębami',
    'Skaling i piaskowanie — dlaczego regularna higiena jest ważna',
    'Uśmiech a pewność siebie — jak stomatologia zmienia życie',
    'Zęby mądrości — usuwać czy nie?',
    'Stomatologia mikroskopowa — precyzja na najwyższym poziomie',
    'Resorpcja korzeni — ukryty problem',
    'Chirurgia stomatologiczna — kiedy jest konieczna?',
];

// ── Topic fetching from DB ─────────────────────────────────────────

async function pickTopicFromDB(): Promise<string | null> {
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const db = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // STRICT: only pick topics that have NEVER been used
        const { data: topics } = await db
            .from('social_topics')
            .select('id, topic')
            .eq('is_active', true)
            .eq('used_count', 0)
            .order('created_at', { ascending: true })
            .limit(10);

        if (!topics || topics.length === 0) return null;

        // Pick random from unused pool
        const picked = topics[Math.floor(Math.random() * topics.length)];

        // Mark as used (increment count + timestamp) — this topic will never be picked again
        await db
            .from('social_topics')
            .update({
                used_count: 1,
                last_used_at: new Date().toISOString()
            })
            .eq('id', picked.id);

        return picked.topic;
    } catch (err) {
        console.error('[SocialAI] DB topic fetch failed, using fallback:', err);
        return null;
    }
}

// ── Text Generation ────────────────────────────────────────────────

export async function generateSocialText(
    contentType: ContentType,
    platforms: Platform[],
    customPrompt?: string | null,
): Promise<GeneratedContent> {
    const model = process.env.SOCIAL_AI_MODEL || 'gpt-4o';
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Pick topic: custom prompt > DB topics > hardcoded fallback
    let topic = customPrompt;
    if (!topic) {
        topic = await pickTopicFromDB();
    }
    if (!topic) {
        topic = DENTAL_TOPICS[Math.floor(Math.random() * DENTAL_TOPICS.length)];
    }

    const platformInstructions = platforms.map(p => PLATFORM_GUIDELINES[p]).join('\n\n');

    // Load AI style notes from DB (learned from admin edits)
    let styleContext = '';
    try {
        const { data: styleNotes } = await db
            .from('social_ai_style_notes')
            .select('note, category')
            .order('created_at', { ascending: false })
            .limit(10);
        if (styleNotes && styleNotes.length > 0) {
            styleContext = `\n\nNAUCZONE PREFERENCJE STYLU (wyciągnięte z wcześniejszych edycji adminów):\n${styleNotes.map((n: any) => `- ${n.note}`).join('\n')}\nStosuj się do tych preferencji w generowanym tekście.`;
        }
    } catch { /* style notes table may not exist yet */ }

    // Load recent edit feedback for few-shot learning
    let editContext = '';
    try {
        const { data: recentEdits } = await db
            .from('social_posts')
            .select('original_ai_text, text_content, edit_feedback')
            .not('edit_feedback', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(3);
        if (recentEdits && recentEdits.length > 0) {
            editContext = `\n\nPRZYKŁADY EDYCJI ADMINA (ucz się z nich):\n${recentEdits.map((e: any) => `Feedback: ${e.edit_feedback}`).join('\n')}\nUwzględnij te uwagi w nowym poście.`;
        }
    } catch { /* columns may not exist yet */ }

    const systemPrompt = `Jesteś członkiem zespołu gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.
Tworzysz treści na social media. Twój styl:
- Piszesz w imieniu ZESPOŁU gabinetu („nasz gabinet”, „nasz zespół”, „u nas”, „zapraszamy”)
- NIGDY nie pisz w pierwszej osobie liczby pojedynczej („ja”, „mój”, „moi”)
- Język jest przystępny, ciepły i profesjonalny
- Używasz porównań z życia codziennego
- Wspominasz o doświadczeniu zespołu
- Gabinet specjalizuje się w stomatologii mikroskopowej, implantologii i laserach
- Gabinet jest w ${brand.cityShort}, pracujemy z mikroskopem, laserem Fotona LightWalker, drukarką 3D
${styleContext}${editContext}

PLATFORMY DOCELOWE:
${platformInstructions}

TYP TREŚCI: ${contentType === 'post_text_image' ? 'Post z grafiką' : contentType === 'video_short' ? 'Opis do krótkiego wideo (Reel/Short/TikTok)' : 'Karuzela (seria slajdów)'}

${customPrompt ? `DODATKOWE INSTRUKCJE OD ADMINA:\n${customPrompt}\n` : ''}

WAŻNE:
- Wygeneruj JEDNĄ treść, która będzie pasować do wszystkich wymienionych platform
- Hashtagi powinny być bez # (sam tekst), system doda # automatycznie
- Tekst NIE powinien zawierać hashtagów — podaj je osobno
- Dla wideo: tekst to opis/caption, nie skrypt
- imagePrompt: szczegółowy prompt po angielsku do wygenerowania grafiki pasującej do posta

Odpowiedz WYŁĄCZNIE w formacie JSON:
{
    "text": "Treść posta/opisu",
    "hashtags": ["stomatologia", "dentysta", "opole", "zdrowie", ...],
    "imagePrompt": "Detailed English prompt for a premium social media image. Dark moody background, gold accent lighting, modern dental clinic aesthetic, photorealistic, cinematic, 1080x1080 square format.",
    "title": "Tytuł (tylko dla YouTube, opcjonalny)"
}`;

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Temat: ${topic}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.85,
        max_tokens: 2048,
    });

    const raw = completion.choices[0].message.content || '{}';
    const data = JSON.parse(raw);

    if (!data.text) throw new Error('AI nie wygenerowało treści');

    return {
        text: data.text,
        hashtags: data.hashtags || [],
        imagePrompt: data.imagePrompt || '',
        title: data.title,
        videoDescription: data.videoDescription,
    };
}

// ── Image Generation ───────────────────────────────────────────────

export async function generateSocialImage(
    imagePrompt: string,
    format: 'square' | 'portrait' | 'landscape' = 'square',
): Promise<string> {
    // Returns base64 of image

    const imageModel = process.env.SOCIAL_IMAGE_MODEL || 'flux-dev';

    const aspectRatio = format === 'square' ? '1:1' : format === 'portrait' ? '9:16' : '16:9';
    const dalleSize = format === 'square' ? '1024x1024' as const : format === 'portrait' ? '1024x1792' as const : '1792x1024' as const;

    const enhancedPrompt = imagePrompt +
        ' Ultra-premium dental photography, dark moody atmosphere, gold accent lighting, ' +
        'bokeh background, magazine cover quality, luxury medical brand aesthetic, no text overlays, no watermarks';

    if (imageModel === 'flux-dev' || imageModel === 'flux') {
        try {
            const Replicate = require('replicate');
            const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

            const output: any = await replicate.run('black-forest-labs/flux-dev', {
                input: {
                    prompt: enhancedPrompt,
                    go_fast: true,
                    output_format: 'png',
                    aspect_ratio: aspectRatio,
                    output_quality: 100,
                },
            });

            const imageUrl = Array.isArray(output) ? output[0] : output;
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            return Buffer.from(arrayBuffer).toString('base64');
        } catch (fluxErr: any) {
            console.error('[SocialAI] Flux error, falling back to DALL-E:', fluxErr.message);
            // Fall through to DALL-E
        }
    }

    // DALL-E 3 fallback
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: dalleSize,
        response_format: 'b64_json',
    });

    const base64 = imageResponse.data?.[0]?.b64_json;
    if (!base64) throw new Error('Błąd generowania obrazka');
    return base64;
}

// ── Upload to Supabase Storage ─────────────────────────────────────

export async function uploadImageToStorage(
    base64: string,
    supabase: any,
    prefix: string = 'social',
): Promise<string> {
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
    const buffer = Buffer.from(base64, 'base64');

    // Try upload, create bucket if needed
    let uploadResult = await supabase.storage
        .from('social-media')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

    if (uploadResult.error?.message?.includes('not found') || uploadResult.error?.message?.includes('Bucket')) {
        await supabase.storage.createBucket('social-media', { public: true });
        uploadResult = await supabase.storage
            .from('social-media')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: false });
    }

    if (uploadResult.error) throw uploadResult.error;

    const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(fileName);
    return urlData.publicUrl;
}
