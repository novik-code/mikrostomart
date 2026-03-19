/**
 * Video AI Processing Library
 * 
 * Full pipeline: Whisper transcription → GPT-4o Vision analysis → 
 * metadata generation → Shotstack video editing → ready for publish.
 */

import OpenAI from 'openai';

// ── Types ──────────────────────────────────────────────────────────

export interface TranscriptionResult {
    text: string;
    srt: string;
    language: string;
    duration: number;
    words: { word: string; start: number; end: number }[];
}

export interface VideoAnalysis {
    topic: string;
    procedures: string[];
    context: string;
    mood: string;
    keyMoments: string[];
    suggestedHook: string;
    suggestedCTA: string;
}

export interface VideoMetadata {
    title: string;
    descriptions: {
        youtube: string;
        tiktok: string;
        instagram: string;
        facebook: string;
    };
    hashtags: string[];
    hook: string;
    cta: string;
}

export interface ShotstackTimeline {
    timeline: any;
    output: any;
}

// ── 1. Transcription (OpenAI Whisper) ─────────────────────────────

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('[VideoAI] Downloading video for transcription...');
    const videoRes = await fetch(videoUrl);
    const videoBuffer = await videoRes.arrayBuffer();
    
    // Create a File object for OpenAI API
    const file = new File([videoBuffer], 'video.mp4', { type: 'video/mp4' });

    console.log('[VideoAI] Transcribing with Whisper...');
    const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'pl',
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
    });

    // Build SRT from segments
    const segments = (transcription as any).segments || [];
    const words = (transcription as any).words || [];
    let srt = '';
    
    segments.forEach((seg: any, i: number) => {
        srt += `${i + 1}\n`;
        srt += `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n`;
        srt += `${seg.text.trim()}\n\n`;
    });

    const duration = segments.length > 0 
        ? segments[segments.length - 1].end 
        : (transcription as any).duration || 60;

    console.log(`[VideoAI] Transcription done: ${transcription.text.length} chars, ${duration}s`);

    return {
        text: transcription.text,
        srt,
        language: 'pl',
        duration,
        words: words.map((w: any) => ({ word: w.word, start: w.start, end: w.end })),
    };
}

function formatSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// ── 2. Frame Extraction (via URL generation) ──────────────────────

export function generateFrameTimestamps(durationSeconds: number, count: number = 4): number[] {
    if (durationSeconds <= 0) return [0];
    const step = durationSeconds / (count + 1);
    return Array.from({ length: count }, (_, i) => Math.round((i + 1) * step * 10) / 10);
}

// ── 3. Video Analysis (GPT-4o Vision) ─────────────────────────────

export async function analyzeVideoContent(
    transcript: string,
    frameDataUrls?: string[],
): Promise<VideoAnalysis> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('[VideoAI] Analyzing video content with GPT-4o...');

    const messages: any[] = [
        {
            role: 'system',
            content: `Jesteś ekspertem od analizy treści wideo stomatologicznych. Analizujesz materiały nagrane przez dentystę z kliniki Mikrostomart w Opolu.

Na podstawie transkrypcji (i opcjonalnie klatek z wideo) określ:
1. Główny temat wideo
2. Jakie zabiegi/procedury są pokazywane
3. Kontekst (gabinet, konsultacja, zabieg, edukacja)
4. Nastrój/ton (profesjonalny, casual, edukacyjny)
5. Kluczowe momenty (cytaty, ciekawostki)
6. Sugerowany hook na początku (pytanie lub ciekawostka przyciągająca uwagę)
7. Sugerowane CTA na końcu

Odpowiedz WYŁĄCZNIE w formacie JSON:
{
    "topic": "główny temat",
    "procedures": ["zabieg1", "zabieg2"],
    "context": "opis kontekstu",
    "mood": "profesjonalny/casual/edukacyjny",
    "keyMoments": ["cytat lub moment 1", "moment 2"],
    "suggestedHook": "Czy wiesz, że...?",
    "suggestedCTA": "Umów wizytę na mikrostomart.pl"
}`,
        },
    ];

    // Build user message with transcript and optional frames
    const userContent: any[] = [
        { type: 'text', text: `TRANSKRYPCJA WIDEO:\n${transcript}` },
    ];

    if (frameDataUrls && frameDataUrls.length > 0) {
        for (const frameUrl of frameDataUrls) {
            userContent.push({
                type: 'image_url',
                image_url: { url: frameUrl, detail: 'low' },
            });
        }
        userContent[0].text += '\n\nPoniżej klatki z wideo:';
    }

    messages.push({ role: 'user', content: userContent });

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1024,
    });

    const raw = completion.choices[0].message.content || '{}';
    const analysis = JSON.parse(raw) as VideoAnalysis;

    console.log(`[VideoAI] Analysis done: topic="${analysis.topic}"`);
    return analysis;
}

// ── 4. Metadata Generation (GPT-4o) ──────────────────────────────

export async function generateVideoMetadata(
    transcript: string,
    analysis: VideoAnalysis,
): Promise<VideoMetadata> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('[VideoAI] Generating video metadata...');

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `Jesteś ekspertem od social media marketingu dla kliniki stomatologicznej Mikrostomart w Opolu. Tworzysz WYBITNE opisy do wideo Shorts/Reels.

ZASADY:
- Tytuł: CHWYTLIWY, max 80 znaków, musi przyciągnąć uwagę w feedzie
- Hook: pytanie lub ciekawostka na początku wideo (2-3 sekundy tekstu)
- Opisy: OSOBNE dla każdej platformy, zoptymalizowane pod ich algorytmy
- Hashtagi: mix trending + niszowe stomatologiczne, 15-20 sztuk
- CTA: płynne, bez nachalności, zachęcające do follow/subskrypcji

PLATFORMY:
- YouTube Shorts: SEO-friendly opis, 150-300 słów, #Shorts w tytule
- TikTok: krótko (50-80 słów), dynamicznie, emoji, trend hashtagi
- Instagram Reels: inspirujące, 80-120 słów, dużo hashtagów
- Facebook: ciepło i profesjonalnie, 100-200 słów, zachęta do komentarza

Pisz w PIERWSZEJ OSOBIE jako Marcin Nowosielski, dentysta.

Odpowiedz WYŁĄCZNIE w formacie JSON:
{
    "title": "Chwytliwy tytuł",
    "hook": "Tekst hook na początek wideo (max 10 słów)",
    "cta": "Tekst CTA na koniec wideo (max 15 słów)",
    "descriptions": {
        "youtube": "Pełny opis YT...",
        "tiktok": "Krótki opis TikTok...",
        "instagram": "Opis IG...",
        "facebook": "Opis FB..."
    },
    "hashtags": ["stomatologia", "dentysta", "opole", ...]
}`,
            },
            {
                role: 'user',
                content: `TRANSKRYPCJA:\n${transcript}\n\nANALIZA AI:\nTemat: ${analysis.topic}\nZabiegi: ${analysis.procedures.join(', ')}\nKontekst: ${analysis.context}\nKluczowe momenty: ${analysis.keyMoments.join('; ')}\nSugerowany hook: ${analysis.suggestedHook}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.85,
        max_tokens: 2048,
    });

    const raw = completion.choices[0].message.content || '{}';
    const metadata = JSON.parse(raw) as VideoMetadata;

    console.log(`[VideoAI] Metadata generated: title="${metadata.title}"`);
    return metadata;
}

// ── 5. Shotstack Video Editing ───────────────────────────────────

export async function buildShotstackTimeline(
    videoUrl: string,
    transcript: TranscriptionResult,
    metadata: VideoMetadata,
    logoUrl?: string,
): Promise<ShotstackTimeline> {
    const duration = transcript.duration || 60;

    // Build caption clips from SRT segments
    const captionClips: any[] = [];
    const srtLines = transcript.srt.split('\n\n').filter(Boolean);
    
    for (const block of srtLines) {
        const lines = block.split('\n');
        if (lines.length < 3) continue;
        
        const timeParts = lines[1].split(' --> ');
        const start = parseSrtTime(timeParts[0]);
        const end = parseSrtTime(timeParts[1]);
        const text = lines.slice(2).join(' ').trim();
        
        if (text && end > start) {
            captionClips.push({
                asset: {
                    type: 'html',
                    html: `<p style="font-family:'Inter',sans-serif; font-size:42px; color:white; text-align:center; text-shadow: 2px 2px 4px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; padding: 10px 20px; line-height: 1.3; font-weight: 800;">${escapeHtml(text)}</p>`,
                    width: 900,
                    height: 200,
                },
                start,
                length: end - start,
                position: 'bottom',
                offset: { y: -0.12 },
                transition: {
                    in: 'fade',
                    out: 'fade',
                },
            });
        }
    }

    // Hook text overlay (first 3 seconds)
    const hookClip = {
        asset: {
            type: 'html',
            html: `<p style="font-family:'Inter',sans-serif; font-size:52px; color:#FFD700; text-align:center; text-shadow: 3px 3px 6px rgba(0,0,0,0.95); font-weight: 900; padding: 20px;">${escapeHtml(metadata.hook)}</p>`,
            width: 900,
            height: 300,
        },
        start: 0,
        length: 3,
        position: 'center',
        transition: {
            in: 'slideUp',
            out: 'fade',
        },
    };

    // CTA overlay (last 4 seconds)
    const ctaClip = {
        asset: {
            type: 'html',
            html: `<div style="text-align:center; padding: 20px;">
                <p style="font-family:'Inter',sans-serif; font-size:38px; color:white; text-shadow: 2px 2px 4px rgba(0,0,0,0.9); font-weight: 700; margin-bottom: 10px;">${escapeHtml(metadata.cta)}</p>
                <p style="font-family:'Inter',sans-serif; font-size:28px; color:#FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.9); font-weight: 600;">mikrostomart.pl</p>
            </div>`,
            width: 900,
            height: 250,
        },
        start: Math.max(0, duration - 4),
        length: 4,
        position: 'center',
        transition: {
            in: 'slideUp',
            out: 'fade',
        },
    };

    // Logo watermark (entire duration)
    const logoClip = logoUrl ? {
        asset: {
            type: 'image',
            src: logoUrl,
        },
        start: 0,
        length: duration,
        fit: 'none',
        scale: 0.12,
        position: 'topRight',
        offset: { x: -0.03, y: 0.03 },
        opacity: 0.7,
    } : null;

    // Build timeline
    const tracks: any[] = [
        // Track 1 (top): Hook overlay
        { clips: [hookClip] },
        // Track 2: Captions
        { clips: captionClips },
        // Track 3: CTA
        { clips: [ctaClip] },
    ];

    // Track 4: Logo (if provided)
    if (logoClip) {
        tracks.push({ clips: [logoClip] });
    }

    // Track 5 (bottom): Source video
    tracks.push({
        clips: [{
            asset: {
                type: 'video',
                src: videoUrl,
                volume: 1,
            },
            start: 0,
            length: duration,
        }],
    });

    return {
        timeline: {
            background: '#000000',
            tracks,
        },
        output: {
            format: 'mp4',
            resolution: 'sd', // 480p for cost savings, or 'hd' for 720p
            aspectRatio: '9:16',
            fps: 30,
        },
    };
}

export async function renderWithShotstack(timeline: ShotstackTimeline): Promise<{ renderId: string }> {
    const apiKey = process.env.SHOTSTACK_API_KEY;
    if (!apiKey) throw new Error('SHOTSTACK_API_KEY not configured');

    const env = process.env.SHOTSTACK_ENV || 'stage'; // 'stage' for testing, 'v1' for production
    const baseUrl = `https://api.shotstack.io/${env}`;

    console.log('[VideoAI] Submitting to Shotstack for rendering...');

    const res = await fetch(`${baseUrl}/render`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(timeline),
    });

    const data = await res.json();
    
    if (!res.ok || !data.success) {
        throw new Error(`Shotstack render failed: ${JSON.stringify(data)}`);
    }

    const renderId = data.response?.id;
    if (!renderId) throw new Error('No render ID returned from Shotstack');

    console.log(`[VideoAI] Shotstack render submitted: ${renderId}`);
    return { renderId };
}

export async function checkShotstackRender(renderId: string): Promise<{
    status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed';
    url?: string;
    error?: string;
}> {
    const apiKey = process.env.SHOTSTACK_API_KEY;
    if (!apiKey) throw new Error('SHOTSTACK_API_KEY not configured');

    const env = process.env.SHOTSTACK_ENV || 'stage';
    const baseUrl = `https://api.shotstack.io/${env}`;

    const res = await fetch(`${baseUrl}/render/${renderId}`, {
        headers: { 'x-api-key': apiKey },
    });

    const data = await res.json();
    const response = data.response;

    if (response?.status === 'done') {
        return { status: 'done', url: response.url };
    } else if (response?.status === 'failed') {
        return { status: 'failed', error: response.error || 'Render failed' };
    }

    return { status: response?.status || 'queued' };
}

// ── Helpers ──────────────────────────────────────────────────────

function parseSrtTime(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':');
    const secParts = (parts[2] || '0').split(',');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const s = parseInt(secParts[0] || '0', 10);
    const ms = parseInt(secParts[1] || '0', 10);
    return h * 3600 + m * 60 + s + ms / 1000;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
