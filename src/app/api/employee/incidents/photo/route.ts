/**
 * POST /api/employee/incidents/photo        — wgranie zdjęcia usterki (multipart)
 * GET  /api/employee/incidents/photo?path=  — signed URL 300 s + wpis do audytu
 *
 * 🔑 Signed URL powstaje WYŁĄCZNIE tutaj, nigdy w liście awarii. Gdyby lista go
 * budowała, audyt zapisywałby „pobrał listę" zamiast „otworzył zdjęcie", a 5-minutowy
 * TTL wypalałby się przy zwykłym przewijaniu.
 *
 * 🔑 Ścieżkę podaną przez klienta WERYFIKUJEMY w bazie. Bez tego trasa byłaby
 * generatorem podpisanych linków do dowolnego obiektu w buckecie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { detectImageMime, readUploadedFile } from '@/lib/chatAttachments';
import { photoBelongsToIncident, signIncidentPhoto, storeIncidentPhoto } from '@/lib/incidents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Oczekiwano multipart/form-data' }, { status: 400 });
    }

    const buf = await readUploadedFile(form, 'file');
    if (!buf) return NextResponse.json({ error: 'Brak pliku albo przekroczony limit 10 MB' }, { status: 400 });

    // 🔑 MAGIC BYTES PRZED DEKODEREM. `sharp` dekoduje SVG, więc walidacja dopiero
    // po `metadata().format` wpuściłaby plik do librsvg.
    if (!detectImageMime(new Uint8Array(buf))) {
        return NextResponse.json({ error: 'Plik nie jest obrazem' }, { status: 400 });
    }

    // Zdjęcia wgrywane są PRZED utworzeniem awarii (użytkownik wybiera je w formularzu),
    // więc katalogiem jest identyfikator szkicu z klienta, nie id awarii.
    const draft = (form.get('draftId') || '').toString().replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'draft';

    const stored = await storeIncidentPhoto(buf, draft);
    if (!stored) return NextResponse.json({ error: 'Nie udało się przetworzyć zdjęcia' }, { status: 400 });

    return NextResponse.json({ ok: true, ...stored }, { status: 201 });
}

export async function GET(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const path = new URL(request.url).searchParams.get('path');
    if (!path) return NextResponse.json({ error: 'Brak parametru path' }, { status: 400 });

    const incidentId = await photoBelongsToIncident(path);
    if (!incidentId) return NextResponse.json({ error: 'Nie znaleziono zdjęcia' }, { status: 404 });

    const url = await signIncidentPhoto(path);
    if (!url) return NextResponse.json({ error: 'Nie udało się podpisać linku' }, { status: 500 });

    void logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email ?? '',
        action: 'view_incident_photo',
        resourceType: 'incident',
        resourceId: incidentId,
        request,
    });

    return NextResponse.json({ url, expiresIn: 300 });
}
