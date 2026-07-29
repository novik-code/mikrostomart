/**
 * POST /api/employee/stt — transkrypcja nagrania na tekst (OpenAI whisper-1).
 *
 * PO CO. Wejście głosowe asystenta w webie stoi na przeglądarkowym
 * `webkitSpeechRecognition` — którego w React Native po prostu NIE MA, a poza tym
 * nie działa w Firefoksie i bywa kapryśne w iOS Safari. Aplikacja nagrywa plik
 * i wysyła go tutaj, więc tor mobilny nie zależy od API przeglądarki.
 *
 * Body: multipart/form-data, pole `file` (m4a/mp3/wav/webm), opcjonalnie `language`.
 * Odpowiedź: `{ text }`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** Whisper na minutowym nagraniu potrafi liczyć kilkanaście sekund. */
export const maxDuration = 60;

/** 25 MB to twardy limit API Whispera; my i tak nagrywamy krótkie polecenia. */
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Magic bytes kontenerów audio, które realnie wysyła aplikacja i przeglądarka.
 * 🔑 Sprawdzamy ZAWARTOŚĆ, nie deklarowany `Content-Type` — ten pochodzi od klienta
 * i nie jest dowodem na nic. Ta sama zasada co przy załącznikach czatu, gdzie
 * walidacja po zadeklarowanym typie wpuściłaby plik do dekodera obrazu.
 */
function looksLikeAudio(b: Uint8Array): boolean {
    if (b.length < 12) return false;
    const ascii = (i: number, s: string) => s.split('').every((c, k) => b[i + k] === c.charCodeAt(0));
    // MP4/M4A: '....ftyp'  ·  OGG: 'OggS'  ·  RIFF/WAV: 'RIFF'  ·  WebM/Matroska: 1A 45 DF A3
    if (ascii(4, 'ftyp')) return true;
    if (ascii(0, 'OggS')) return true;
    if (ascii(0, 'RIFF')) return true;
    if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true;
    // MP3: 'ID3' albo ramka zaczynająca się od 0xFF 0xEx/0xFx
    if (ascii(0, 'ID3')) return true;
    if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return true;
    return false;
}

export async function POST(req: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [isEmployee, isAdmin] = await Promise.all([hasRole(user.id, 'employee'), hasRole(user.id, 'admin')]);
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'Transkrypcja jest niedostępna' }, { status: 503 });
    }

    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        return NextResponse.json({ error: 'Oczekiwano multipart/form-data' }, { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'Brak nagrania' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Nagranie jest za długie' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikeAudio(bytes)) {
        return NextResponse.json({ error: 'Plik nie jest nagraniem audio' }, { status: 400 });
    }

    const language = String(form.get('language') || 'pl').slice(0, 5);

    try {
        const upstream = new FormData();
        // Nazwa pliku MA ZNACZENIE — Whisper rozpoznaje kontener po rozszerzeniu,
        // a nagranie z telefonu przychodzi bez sensownej nazwy.
        upstream.append('file', new Blob([bytes as unknown as BlobPart]), file.name || 'nagranie.m4a');
        upstream.append('model', 'whisper-1');
        upstream.append('language', language);
        // Podpowiedź terminologiczna — bez niej Whisper zamienia nazwiska i słownictwo
        // gabinetowe na fonetycznie podobne wyrazy potoczne.
        upstream.append(
            'prompt',
            'Rozmowa w gabinecie stomatologicznym. Terminy: implant, licówka, endodoncja, higienizacja, zgryz, ekstrakcja, korona, most, proteza, znieczulenie, RTG, CBCT, pantomogram.',
        );

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            body: upstream,
        });

        if (!res.ok) {
            // Treść odpowiedzi OpenAI zostaje w logu — klientowi oddajemy komunikat,
            // z którym da się żyć, bez wewnętrznych szczegółów.
            console.error('[STT] Whisper error:', res.status, (await res.text()).slice(0, 300));
            return NextResponse.json({ error: 'Nie udało się rozpoznać mowy' }, { status: 502 });
        }

        const data = (await res.json()) as { text?: string };
        const text = (data.text ?? '').trim();
        if (!text) {
            return NextResponse.json({ error: 'Nie rozpoznano mowy w nagraniu' }, { status: 422 });
        }

        return NextResponse.json({ text });
    } catch (err) {
        console.error('[STT] Error:', err);
        return NextResponse.json({ error: 'Nie udało się rozpoznać mowy' }, { status: 500 });
    }
}
