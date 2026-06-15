import { isDemoMode } from '@/lib/demoMode';

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getAICompletion } from '@/lib/unifiedAI';
import { brand } from '@/lib/brandConfig';

// Silnik treści Klasy A (GEO 2026-06-15) — przebudowa „młynka".
// ZMIANA vs poprzednia wersja (produkowała clickbait):
// - Temat WYŁĄCZNIE z kolejki `article_ideas` (pytania pacjentów + nasze strategiczne
//   tematy). Pusta kolejka → SKIP (zero wymyślania „chwytliwych" tytułów).
// - Generacja przez unifiedAI (blog_generator → KB + brand voice) z twardymi wymaganiami:
//   długość, struktura, FAQ, E-E-A-T, linki wewnętrzne, guardrail pro-gabinet.
// - Self-critique: druga AI ocenia draft; nie zda → 1 regeneracja.
// - Zapis PL jako status='draft'. Obrazek + tłumaczenia EN/DE/UA dopiero przy
//   zatwierdzeniu w adminie (POST /api/admin/articles {action:'publish'}) — nie
//   marnujemy zasobów na odrzucone i nie robimy commita/deployu per draft.

export const maxDuration = 120;

const send = async (writer: WritableStreamDefaultWriter, msg: string) => {
    await writer.write(new TextEncoder().encode(msg + "\n"));
};

const INTERNAL_LINK_HINTS = [
    '/oferta/implantologia', '/oferta/leczenie-kanalowe', '/oferta/stomatologia-estetyczna',
    '/oferta/protetyka', '/oferta/ortodoncja', '/oferta/chirurgia', '/oferta/periodontologia',
    '/oferta/all-on-4', '/oferta/laser', '/cennik', '/rezerwacja',
].join(', ');

function buildRequirements(recentTitles: string[]): string {
    return `WYMAGANIA — artykuł do bazy wiedzy gabinetu ${brand.name} (${brand.cityShort}):
- Język polski, 1400-2200 słów, ton ekspercki ale przystępny.
- PIERWSZY akapit = bezpośrednia, zwięzła odpowiedź na temat (2-3 zdania). To krytyczne dla cytowalności przez modele AI (GEO).
- Struktura: nagłówki ## (H2) i ### (H3); na końcu sekcja "## FAQ" z 4-6 pytaniami i pełnymi odpowiedziami; konkretne liczby/fakty/przykłady.
- E-E-A-T: pisz z perspektywy zespołu gabinetu; gdzie zasadne, odwołaj się do technologii/doświadczenia (mikroskop ZEISS, lasery Er:YAG/Nd:YAG, implantologia cyfrowa, M.Sc. RWTH).
- LINKI WEWNĘTRZNE: wpleć 2-4 trafne linki markdown [tekst](/sciezka) do stron usług (${INTERNAL_LINK_HINTS}). Linki POZA pogrubieniem (nie zagnieżdżaj w **bold**).
- GUARDRAIL (bezwzględny): NIE promuj unikania dentysty ani metod domowych "zamiast wizyty". Higiena/pielęgnacja domowa wyłącznie jako UZUPEŁNIENIE profesjonalnej opieki + zaproszenie do gabinetu. Treść rzetelna medycznie, bez obietnic gwarantowanych efektów.
- TYTUŁ: opisowy, konkretny, z frazą kluczową. ZABRONIONE clickbaitowe wzorce: "X zaskakujących…", "sekrety…", "magia…", "niezwykłe…", "czego nie wiesz…".
- slug: WYŁĄCZNIE ASCII [a-z0-9-], bez polskich znaków, opisowy, unikalny.
- NIE powielaj istniejących tematów (napisz coś innego): ${recentTitles.slice(0, 25).join(' | ') || '(brak)'}

Zwróć WYŁĄCZNIE obiekt JSON:
{"title":"...","slug":"...","excerpt":"streszczenie 2 zdania","content":"treść w Markdown (## , ### , * , ** , [tekst](/link))","imagePrompt":"szczegółowy prompt PO ANGIELSKU do fotorealistycznego zdjęcia ilustrującego temat"}`;
}

interface ArticleData {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    imagePrompt?: string;
}

async function generateArticle(topic: string, requirements: string): Promise<ArticleData> {
    const res = await getAICompletion({
        context: 'blog_generator',
        responseFormat: 'json',
        maxTokens: 4000,
        temperature: 0.7,
        messages: [{ role: 'user', content: `Temat artykułu: "${topic}".\n\n${requirements}` }],
    });
    const data = JSON.parse(res.reply || '{}');
    if (!data.title || !data.content || !data.slug) {
        throw new Error('AI nie zwróciło poprawnego JSON artykułu (title/slug/content)');
    }
    // Twardy sanity na slug (ASCII)
    data.slug = String(data.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return data as ArticleData;
}

interface Critique { pass: boolean; score: number; issues: string[] }

async function critiqueArticle(a: ArticleData): Promise<Critique> {
    const rubric = `Jesteś surowym redaktorem medycznym. Oceń artykuł stomatologiczny do bazy wiedzy.
Zwróć WYŁĄCZNIE JSON: {"pass": boolean, "score": 0-100, "issues": ["..."]}.
Ustaw pass=false jeśli ŁAMIE którekolwiek kryterium:
1. Treść krótsza niż ~1300 słów.
2. Promuje unikanie dentysty lub metody domowe "zamiast wizyty" (dozwolone tylko jako uzupełnienie + zaproszenie do gabinetu).
3. Tytuł clickbaitowy ("zaskakujących", "sekrety", "magia", "niezwykłe", "czego nie wiesz").
4. Brak min. 3 nagłówków "##" lub brak sekcji FAQ.
5. Brak min. 2 wewnętrznych linków markdown do /oferta, /cennik lub /rezerwacja.
6. Obietnice gwarantowanych efektów / treść medycznie niesolidna.
W "issues" wypisz konkretne złamane punkty (po polsku).`;
    try {
        const res = await getAICompletion({
            context: 'content_moderator',
            skipKB: true,
            systemPromptOverride: rubric,
            responseFormat: 'json',
            temperature: 0,
            maxTokens: 600,
            messages: [{ role: 'user', content: JSON.stringify({ title: a.title, content: a.content }).slice(0, 14000) }],
        });
        const parsed = JSON.parse(res.reply || '{}');
        return {
            pass: parsed.pass !== false,
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        };
    } catch {
        // Krytyka nie powinna blokować — przy błędzie przepuść (admin i tak recenzuje draft).
        return { pass: true, score: 0, issues: [] };
    }
}

export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const adminUser = await verifyAdmin();
    if (!isCronAuth && !adminUser && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
        try {
            await send(writer, "START: Silnik treści — szukam tematu w kolejce...");

            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
            const adminDb = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

            // 1. Temat WYŁĄCZNIE z kolejki. Pusto → SKIP (zero clickbaitu).
            const { data: pendingIdeas } = await adminDb
                .from('article_ideas')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (!pendingIdeas || pendingIdeas.length === 0) {
                await send(writer, "SKIP: brak tematu w kolejce article_ideas — nic nie generuję (świadomie).");
                await writer.close();
                return;
            }

            const idea = pendingIdeas[0];
            const topic: string = idea.question;
            const pendingIdeaId = idea.id;
            await send(writer, `TOPIC: ${topic}`);

            // 2. Kontekst dedup — ostatnie tytuły PL (unikamy powielania).
            const { data: recent } = await adminDb
                .from('articles')
                .select('title, slug')
                .eq('locale', 'pl')
                .order('published_date', { ascending: false })
                .limit(40);
            const recentTitles = (recent || []).map((r: any) => r.title).filter(Boolean);
            const requirements = buildRequirements(recentTitles);

            // 3. Generacja (unifiedAI blog_generator → KB + brand voice).
            await send(writer, "STEP: Piszę artykuł (unifiedAI / blog_generator)...");
            let articleData = await generateArticle(topic, requirements);

            // 4. Self-critique → 1 regeneracja jeśli nie zda.
            await send(writer, "STEP: Self-critique...");
            const critique = await critiqueArticle(articleData);
            if (!critique.pass) {
                await send(writer, `STEP: Draft nie zdał (${critique.issues.join('; ') || 'low quality'}). Regeneruję raz...`);
                articleData = await generateArticle(
                    topic,
                    requirements + `\n\nPOPRZEDNIA WERSJA ODRZUCONA przez recenzję. Popraw konkretnie: ${critique.issues.join('; ')}`
                );
            }

            // 5. Slug uniqueness (dowolny locale).
            const { data: slugHit } = await adminDb
                .from('articles')
                .select('id')
                .eq('slug', articleData.slug)
                .limit(1);
            if (slugHit && slugHit.length > 0) {
                articleData.slug = `${articleData.slug}-${Date.now().toString().slice(-5)}`;
            }

            // 6. Zapis PL jako DRAFT (bez obrazka i tłumaczeń — to robi „Zatwierdź" w adminie).
            await send(writer, "STEP: Zapisuję draft PL w bazie...");
            const groupId = crypto.randomUUID();
            const { error: insertError } = await adminDb.from('articles').insert({
                title: articleData.title,
                slug: articleData.slug,
                excerpt: articleData.excerpt,
                content: articleData.content,
                image_url: null,
                published_date: new Date().toISOString().split('T')[0],
                locale: 'pl',
                group_id: groupId,
                status: 'draft',
            });
            if (insertError) throw new Error(`Błąd bazy danych: ${insertError.message}`);

            await adminDb.from('article_ideas').update({ status: 'processed' }).eq('id', pendingIdeaId);

            await send(writer, `SUCCESS: ${JSON.stringify({ title: articleData.title, slug: articleData.slug, status: 'draft', selfCritiqueScore: critique.score })}`);
            await send(writer, "INFO: Draft czeka na zatwierdzenie w panelu admin → Artykuły.");
        } catch (e: any) {
            console.error('[daily-article]', e);
            await send(writer, `ERROR: ${e.message}`);
        } finally {
            await writer.close();
        }
    })();

    return new NextResponse(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
