/**
 * Unified AI Service Layer
 *
 * Single entry point for ALL AI operations across the application.
 * Each call specifies a `context` (where it's called from) and the service
 * automatically loads the relevant KB sections and builds a tailored prompt.
 *
 * Usage:
 *   import { getAICompletion, AIContext } from '@/lib/unifiedAI';
 *   const result = await getAICompletion({
 *       context: 'patient_chat',
 *       messages: [...],
 *       tools: [...],
 *   });
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { brand, demoSanitize } from '@/lib/brandConfig';

// ── Types ──────────────────────────────────────────────────────────

export type AIContext =
    | 'patient_chat'       // chatbot on the website
    | 'pricing'            // pricing assistant
    | 'email_draft'        // email draft generation
    | 'social_post'        // social media post generation
    | 'social_comment'     // social media comment replies
    | 'voice_assistant'    // employee voice assistant
    | 'blog_generator'     // blog/article generation
    | 'news_generator'     // news generation
    | 'video_metadata'     // video titles/descriptions
    | 'review_generator'   // Google review generation
    | 'translator'         // translation tasks
    | 'task_parser'        // NLP → structured tasks
    | 'content_moderator'  // content moderation/filtering
    | 'ai_trainer';        // meta-AI that modifies KB

export interface KBSection {
    section: string;
    title: string;
    content: string;
    context_tags: string[];
    priority: number;
}

export interface AICompletionOptions {
    context: AIContext;
    messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string }[];
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    model?: 'gpt-4o' | 'gpt-4o-mini';
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
    /** Extra context appended to system prompt (e.g., user memory, schedule slots) */
    extraSystemContext?: string;
    /** If true, skip KB loading (for meta-AI tasks that don't need clinic knowledge) */
    skipKB?: boolean;
    /** Custom system prompt override — bypasses buildContextPrompt entirely */
    systemPromptOverride?: string;
}

export interface AICompletionResult {
    reply: string | null;
    toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
    usage?: OpenAI.Completions.CompletionUsage;
    model: string;
}

// ── Context → Default Model Mapping ────────────────────────────────
// Expensive contexts use gpt-4o, cheaper ones use gpt-4o-mini

const CONTEXT_DEFAULT_MODEL: Record<AIContext, 'gpt-4o' | 'gpt-4o-mini'> = {
    patient_chat: 'gpt-4o',
    pricing: 'gpt-4o',
    email_draft: 'gpt-4o-mini',
    social_post: 'gpt-4o',
    social_comment: 'gpt-4o',
    voice_assistant: 'gpt-4o',
    blog_generator: 'gpt-4o',
    news_generator: 'gpt-4o',
    video_metadata: 'gpt-4o',
    review_generator: 'gpt-4o-mini',
    translator: 'gpt-4o',
    task_parser: 'gpt-4o-mini',
    content_moderator: 'gpt-4o',
    ai_trainer: 'gpt-4o',
};

// ── Context → Role Prompt ──────────────────────────────────────────
// These define HOW the AI behaves in each context

const CONTEXT_ROLE_PROMPTS: Record<AIContext, string> = {
    patient_chat: `Jesteś wirtualnym asystentem kliniki stomatologicznej "${brand.name}" w ${brand.cityShort}.
Twoim celem jest pomoc pacjentom w uzyskaniu informacji o usługach, zespole i wizytach ORAZ zbieranie kontaktów (leadów).
- Odpowiadaj krótko, konkretnie i uprzejmie.
- Jeśli pacjent pyta o złożony zabieg lub cenę, podaj orientacyjną cenę z bazy wiedzy i zaproponuj kontakt telefoniczny.
- Jeśli pacjent prześle zdjęcie, przeanalizuj je wizualnie ale ZAWSZE dodaj disclaimer: "To tylko wstępna analiza AI, konieczna jest wizyta lekarska".
- Zapraszaj do rezerwacji online (/rezerwacja) lub kontaktu (${brand.phone1}).
- Jeśli pacjent pyta o wpłatę zadatku: "Przekierowuję Cię do formularza wpłaty zadatku. [NAVIGATE:/zadatek]".`,

    pricing: `Jesteś asystentem cennika kliniki stomatologicznej "${brand.name}".
Odpowiadasz WYŁĄCZNIE na pytania dotyczące cen zabiegów stomatologicznych.
- Podaj KONKRETNE CENY z bazy wiedzy — nie odsyłaj "na stronę cennika"
- Zawsze dodaj: "Podane ceny są orientacyjne. Ostateczny koszt ustala lekarz po konsultacji."
- WAŻNE: Przy cenach leczenia kanałowego ZAWSZE wyjaśnij system cenowy: cena za pierwszy kanał + dopłata za każdy kolejny
- Jeśli pytanie NIE dotyczy cen → "Przepraszam, jestem asystentem cennika. Czy mogę pomóc z cenami konkretnego zabiegu?"`,

    email_draft: `Jesteś asystentem recepcji gabinetu stomatologicznego ${brand.smsSenderName} w ${brand.cityShort}.
Analizujesz emaile i przygotowujesz profesjonalne odpowiedzi.
- Profesjonalna ale ciepła tonacja
- Zawieraj KONKRETNE ceny gdy pacjent pyta o koszty (z bazy wiedzy)
- Zakończ zachętą do kontaktu telefonicznego (${brand.phone1}) lub rezerwacji online (/rezerwacja)
- Format HTML (proste <p>, <br>, <strong>)`,

    social_post: `Jesteś członkiem zespołu gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.
Tworzysz treści na social media.
- Piszesz w imieniu ZESPOŁU ("nasz gabinet", "nasz zespół", "u nas")
- NIGDY w pierwszej osobie liczby pojedynczej ("ja", "mój")
- Język: przystępny, ciepły i profesjonalny
- Gabinet specjalizuje się w stomatologii mikroskopowej, implantologii i laserach`,

    social_comment: `Jesteś członkiem zespołu gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.
Odpowiadasz na komentarze pod postami w mediach społecznościowych.
- Pisz w imieniu ZESPOŁU
- Ton: ciepły, profesjonalny, przyjazny — jak rozmowa z pacjentem
- KRÓTKO: 1-3 zdania (max 200 znaków)
- NIE zachęcaj do wizyty/konsultacji w KAŻDEJ odpowiedzi — odpowiadaj merytorycznie
- Pozytywny komentarz → podziękuj + coś merytorycznego
- Pytanie → odpowiedz konkretnie
- Neutralny/emoji → krótkie podziękowanie
- Negatywny → profesjonalizm, propozycja kontaktu prywatnego
- Spam → odpowiedz "SKIP"
- 1-2 pasujące emoji`,

    voice_assistant: `Jesteś asystentem głosowym ${brand.name} — kliniki stomatologicznej w ${brand.cityShort}.
Mówisz po polsku. Jesteś rzeczowy, ciepły i naturalny — jak dobry współpracownik, nie robot.
- NIE pytaj przed działaniem. DZIAŁAJ od razu.
- Po wykonaniu akcji: 1-2 zdania CO zrobiłeś, potem KONKRETNA propozycja co jeszcze
- Krótko. Max 2-3 zdania. Naturalnie, jak człowiek.
- NIE zaczynaj od "Oczywiście!", "Jasne!", "Rozumiem!"
- Potwierdzaj co zrobiłeś, nie co "zamierzasz zrobić"
DZIŚ: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, godz. ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,

    blog_generator: `${brand.aiBlogAuthor}.
Piszesz artykuły blogowe o stomatologii — min. 800 słów, ekspercki ale przystępny ton.
- Struktura: wstęp, sekcje z nagłówkami H2/H3, podsumowanie
- SEO: naturalne użycie słów kluczowych
- Osobisty styl, nie korporacyjny`,

    news_generator: `Jesteś doświadczonym redaktorem medycznym/stomatologicznym.
Piszesz krótkie aktualności (200-400 słów) w profesjonalnym ale przystępnym tonie.`,

    video_metadata: `Jesteś ekspertem od social media marketingu dla kliniki stomatologicznej ${brand.name} w ${brand.cityShort}.
Tworzysz tytuły, opisy i hashtagi do wideo Shorts/Reels — osobne dla każdej platformy.
- Tytuł: CHWYTLIWY, max 80 znaków
- Używaj: "nasz gabinet", "nasz zespół"`,

    review_generator: `Jesteś pomocnym asystentem, który pisze autentyczne opinie Google po polsku.
- Używaj naturalnego języka, jak prawdziwy pacjent
- Wspominaj konkretne aspekty wizyty`,

    translator: `Jesteś profesjonalnym tłumaczem tekstu medycznego/stomatologicznego.
- Precyzyjne tłumaczenia z zachowaniem terminologii medycznej
- Naturalny język docelowy, nie dosłowne tłumaczenie`,

    task_parser: `Jesteś asystentem który analizuje krótkie notatki głosowe lub tekstowe i wyciąga z nich zadania.
- Wyodrębnij: tytuł, opis, priorytet, termin, checklistę
- Odpowiedz w formacie JSON`,

    content_moderator: `Oceń czy podane pytanie/treść dotyczy stomatologii, zdrowia, medycyny lub estetyki twarzy.
Odpowiedz TYLKO 'TAK' lub 'NIE'.`,

    ai_trainer: `Jesteś AI Trenerem — asystentem który pomaga administratorowi zarządzać bazą wiedzy głównego AI asystenta.

TWOJE ZADANIA:
1. Gdy admin opisuje problem z zachowaniem AI → zidentyfikuj właściwą sekcję KB do modyfikacji
2. Zaproponuj KONKRETNĄ zmianę w treści sekcji (pokaż co dodać/zmienić/usunąć)
3. Wyjaśnij dlaczego ta zmiana rozwiąże problem

SEKCJE KB KTÓRE MOŻESZ MODYFIKOWAĆ:
core, team, treatments, pricing, faq, contact, tools_on_site, brand_voice, social_guidelines, email_rules, voice_assistant_rules, custom_instructions

FORMAT ODPOWIEDZI (JSON):
{
    "analysis": "Co admin chce zmienić i dlaczego",
    "target_section": "nazwa_sekcji",
    "proposed_change": "Nowa/zmieniona treść do dodania lub zastąpienia w sekcji",
    "change_type": "append|replace|delete",
    "explanation": "Dlaczego ta zmiana pomoże"
}

Jeśli potrzebujesz więcej informacji — pytaj. Jeśli zmiana wymaga wielu sekcji, zwróć tablicę zmian.`,
};

// ── KB Cache ───────────────────────────────────────────────────────

let kbCache: { sections: KBSection[]; loadedAt: number } | null = null;
const KB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Static Fallback ────────────────────────────────────────────────

let staticFallbackPromise: Promise<string> | null = null;

async function getStaticFallback(): Promise<string> {
    if (!staticFallbackPromise) {
        staticFallbackPromise = import('@/lib/knowledgeBase').then(m => m.KNOWLEDGE_BASE);
    }
    return staticFallbackPromise;
}

// ── Core Functions ─────────────────────────────────────────────────

/**
 * Load KB sections from Supabase. Uses 5-min cache.
 * Falls back to static KNOWLEDGE_BASE if DB is unavailable.
 */
export async function loadKnowledgeBase(contextTags?: string[]): Promise<KBSection[]> {
    const now = Date.now();

    // Return cached if fresh
    if (kbCache && (now - kbCache.loadedAt) < KB_CACHE_TTL_MS) {
        return filterByContext(kbCache.sections, contextTags);
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data, error } = await supabase
            .from('ai_knowledge_base')
            .select('section, title, content, context_tags, priority')
            .eq('is_active', true)
            .order('priority', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No KB sections found');

        kbCache = { sections: data, loadedAt: now };
        return filterByContext(data, contextTags);
    } catch (err) {
        console.warn('[UnifiedAI] KB load failed, using static fallback:', err);

        // Fallback: return static KB as single section
        const staticKB = await getStaticFallback();
        const fallbackSections: KBSection[] = [{
            section: 'static_fallback',
            title: 'Baza Wiedzy (static)',
            content: staticKB,
            context_tags: ['*'],
            priority: 0,
        }];

        return filterByContext(fallbackSections, contextTags);
    }
}

/**
 * Filter KB sections by context tags.
 * Sections tagged with '*' are included in ALL contexts.
 */
function filterByContext(sections: KBSection[], contextTags?: string[]): KBSection[] {
    if (!contextTags || contextTags.length === 0) return sections;

    return sections.filter(s =>
        s.context_tags.includes('*') ||
        s.context_tags.some(tag => contextTags.includes(tag))
    );
}

/**
 * Build the complete system prompt for a given context.
 * Combines: role prompt + relevant KB sections + extra context.
 */
export async function buildContextPrompt(
    context: AIContext,
    extraContext?: string,
): Promise<string> {
    const rolePrompt = CONTEXT_ROLE_PROMPTS[context] || '';
    const kbSections = await loadKnowledgeBase([context]);

    const kbText = kbSections
        .map(s => `## ${s.title}\n${s.content}`)
        .join('\n\n');

    let prompt = rolePrompt;

    if (kbText.trim()) {
        prompt += `\n\nBAZA WIEDZY:\n${demoSanitize(kbText)}`;
    }

    if (extraContext) {
        prompt += `\n\n${extraContext}`;
    }

    return prompt;
}

/**
 * Main AI completion function. Single entry point for all AI operations.
 */
export async function getAICompletion(opts: AICompletionOptions): Promise<AICompletionResult> {
    const {
        context,
        messages,
        tools,
        temperature,
        maxTokens,
        responseFormat,
        extraSystemContext,
        skipKB,
        systemPromptOverride,
    } = opts;

    const model = opts.model || CONTEXT_DEFAULT_MODEL[context] || 'gpt-4o';

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build system prompt
    let systemPrompt: string;
    if (systemPromptOverride) {
        systemPrompt = systemPromptOverride;
    } else if (skipKB) {
        systemPrompt = CONTEXT_ROLE_PROMPTS[context] || '';
        if (extraSystemContext) systemPrompt += `\n\n${extraSystemContext}`;
    } else {
        systemPrompt = await buildContextPrompt(context, extraSystemContext);
    }

    // Build messages array
    const fullMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'tool' | 'system',
            content: m.content,
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
    ];

    // Build request
    const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages: fullMessages,
        temperature: temperature ?? 0.7,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...(responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
        ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {}),
    };

    const completion = await openai.chat.completions.create(request);
    const choice = completion.choices[0];

    return {
        reply: choice.message.content,
        toolCalls: choice.message.tool_calls,
        usage: completion.usage ?? undefined,
        model: completion.model,
    };
}

/**
 * Invalidate KB cache — call after admin edits KB.
 */
export function invalidateKBCache(): void {
    kbCache = null;
}
