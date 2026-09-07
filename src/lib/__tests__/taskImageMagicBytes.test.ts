/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapa klienta storage jest z natury dynamiczna. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK TYPU PLIKU PRZY WGRYWANIU ZDJĘĆ ZADAŃ (P-103).
 *
 * 🔴 CO BYŁO ZEPSUTE. `POST /api/employee/tasks/upload-image` ufało DEKLAROWANEMU typowi
 * (`file.type.startsWith('image/')`) i rozszerzeniu wziętemu z `file.name` bez sanityzacji.
 * Bucket `task-images` nie ma `allowed_mime_types`, więc dowolny plik ≤10 MB z etykietą
 * `image/*` — w tym SVG ze skryptem — trafiał do bucketa i przy jawnym otwarciu
 * (`otworzDokumentPersonelu` → `window.open`) odpalał się na origin `*.supabase.co`.
 * Bez ciasteczek panelu, więc to wektor phishingu wewnętrznego, nie XSS panelu.
 *
 * 🪤 ROZJAZD Z CZTEREMA SĄSIEDNIMI TRASAMI uploadu, które sniffują magic bytes od dawna —
 * `detectImageMime` z `lib/chatAttachments.ts` używa m.in. `incidents/photo`. To znowu
 * „naprawiliśmy jedno miejsce z pary" (tu: jedno z pięciu).
 *
 * 🔑 Nazwa z ukośnikiem dawała dodatkowo zagnieżdżony klucz, który podpisy akceptują,
 * a proxy `documents/file` odrzuca — czyli uszkodzona miniatura tylko w panelu webowym.
 * Rozszerzenie bierzemy dziś z WYKRYTEGO typu, nie z nazwy.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `file.type.startsWith('image/')` → padają dwa
 * pierwsze testy.
 *
 * Uruchomienie: `npx vitest run taskImageMagicBytes`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let wgrane: { path: string; contentType?: string }[] = [];

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
}));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        storage: {
            from: () => ({
                upload: async (path: string, _b: unknown, opts: { contentType?: string }) => {
                    wgrane.push({ path, contentType: opts?.contentType });
                    return { data: { path }, error: null };
                },
                createSignedUrl: async () => ({ data: { signedUrl: 'https://x' }, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: 'https://x' } }),
            }),
        },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    }),
}));

/** Prawdziwe nagłówki plików — nie da się ich podrobić etykietą MIME. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const zadanie = (bajty: Uint8Array, nazwa: string, typ: string) => {
    const fd = new FormData();
    fd.append('file', new Blob([bajty.buffer as ArrayBuffer], { type: typ }), nazwa);
    return new NextRequest('https://example.test/api/employee/tasks/upload-image', { method: 'POST', body: fd });
};

beforeEach(() => {
    vi.clearAllMocks();
    wgrane = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-103 · o typie decydują BAJTY, nie etykieta', () => {
    it('🔴 SEDNO: SVG ze skryptem podszywający się pod PNG → 400, ZERO wgrania', async () => {
        const { POST } = await import('@/app/api/employee/tasks/upload-image/route');
        const res = await POST(zadanie(SVG, 'obrazek.png', 'image/png'));

        expect(res.status).toBe(400);
        expect(wgrane).toHaveLength(0);
    });

    it('🔴 dowolny plik z etykietą `image/*` też odpada', async () => {
        const { POST } = await import('@/app/api/employee/tasks/upload-image/route');
        const smiec = new TextEncoder().encode('MZ\x90\x00to nie jest obraz');
        expect((await POST(zadanie(smiec, 'a.jpg', 'image/jpeg'))).status).toBe(400);
        expect(wgrane).toHaveLength(0);
    });

    it('prawdziwy JPEG przechodzi', async () => {
        const { POST } = await import('@/app/api/employee/tasks/upload-image/route');
        const res = await POST(zadanie(JPEG, 'zdjecie.jpg', 'image/jpeg'));
        expect(res.status).toBeLessThan(400);
        expect(wgrane).toHaveLength(1);
    });

    it('🔑 rozszerzenie i typ biorą się z WYKRYTYCH bajtów, nie z nazwy', async () => {
        const { POST } = await import('@/app/api/employee/tasks/upload-image/route');
        // Prawdziwy PNG nazwany „.jpg" i zadeklarowany jako jpeg.
        await POST(zadanie(PNG, 'oszustwo.jpg', 'image/jpeg'));

        expect(wgrane[0].path).toMatch(/\.png$/);
        expect(wgrane[0].contentType).toBe('image/png');
    });

    it('🪤 nazwa z ukośnikiem nie tworzy zagnieżdżonego klucza', async () => {
        const { POST } = await import('@/app/api/employee/tasks/upload-image/route');
        await POST(zadanie(JPEG, '../../ucieczka/plik.jpg', 'image/jpeg'));

        // Klucz ma być dokładnie `tasks/<nazwa>` — jeden poziom, bez `..`.
        expect(wgrane[0].path).toMatch(/^tasks\/[A-Za-z0-9.-]+$/);
        expect(wgrane[0].path).not.toContain('..');
    });
});
