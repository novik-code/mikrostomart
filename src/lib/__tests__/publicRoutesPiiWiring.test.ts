/**
 * Strażnik okablowania: trasy publiczne nie mogą oddawać danych pacjenta ani ich logować.
 *
 * Sesja 1 planu napraw (2026-08-06). Pilnuje pięciu rzeczy naraz, bo wszystkie są tej
 * samej klasy: dane pacjenta dostępne bez uwierzytelnienia albo zapisane tam, gdzie nikt
 * ich nie pilnuje (logi Vercela — poza audytem, poza retencją, poza eksportem RODO).
 *
 * Każda asercja opisuje realną, zamkniętą dziurę — nie hipotezę.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const API = path.join(process.cwd(), 'src/app/api');
const read = (p: string) => fs.readFileSync(path.join(API, p), 'utf8');

describe('Strażnik: e-Karta nie jest publiczna', () => {
    const src = read('intake/generate-pdf/route.ts');

    it('POST jest chroniony guardem personelu', () => {
        // Do 2026-08-06 pierwszą instrukcją handlera było `await req.json()` — zero auth.
        expect(src).toContain('requireEmployeeOrAdmin');
        const post = src.indexOf('export async function POST');
        expect(post).toBeGreaterThan(-1);
        // guard MUSI stać przed odczytem ciała żądania
        const doJson = src.indexOf('req.json()', post);
        const doGuard = src.indexOf('requireEmployeeOrAdmin()', post);
        expect(doGuard).toBeGreaterThan(-1);
        expect(doGuard).toBeLessThan(doJson);
    });

    it('gałąź generująca e-Kartę po numerze kartoteki NIE ISTNIEJE', () => {
        // Pozwalała pobrać PESEL, adres i wywiad dowolnego pacjenta po sekwencyjnym id.
        expect(src).not.toContain("from('patient_intake_tokens')");
        expect(src).not.toMatch(/const\s*\{[^}]*prodentisPatientId[^}]*\}\s*=\s*await req\.json/);
    });

    it('nadal eksportuje generateEKartaPdf, a submit woła ją BEZ HTTP', () => {
        // To jedyna ścieżka pacjenta wypełniającego e-Kartę z linku — nie wolno jej urwać.
        expect(src).toContain('export { generateEKartaPdf }');
        const submit = read('intake/submit/route.ts');
        expect(submit).toContain('generateEKartaPdf');
        expect(submit).not.toContain("fetch('/api/intake/generate-pdf'");
    });

    it('trasa jest objęta bramką 2FA w middleware', () => {
        const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');
        expect(mw).toContain("'/api/intake/generate-pdf'");
        // ...ale wypełniane przez pacjenta submit/verify MUSZĄ zostać publiczne
        expect(mw).not.toContain("'/api/intake/submit'");
    });
});

describe('Strażnik: martwa trasa short-linków usunięta', () => {
    it('GET /api/short-links/[code] nie istnieje', () => {
        // Oddawała destination_url z tokenem potwierdzenia wizyty, bez limitu.
        expect(fs.existsSync(path.join(API, 'short-links/[code]/route.ts'))).toBe(false);
    });

    it('realny resolver /s/[code] nadal istnieje', () => {
        expect(fs.existsSync(path.join(process.cwd(), 'src/app/s/[code]/route.ts'))).toBe(true);
    });
});

describe('Strażnik: przejęcie subskrypcji push', () => {
    const src = read('push/resubscribe/route.ts');

    it('nie przyjmuje oldEndpoint z ciała żądania', () => {
        // Pozwalał przepisać CUDZY wiersz (zachowując user_id ofiary) na własną przeglądarkę.
        expect(src).not.toMatch(/oldEndpoint\s*[,}]/);
        expect(src).not.toContain("eq('endpoint', oldEndpoint)");
    });

    it('nie loguje identyfikatora użytkownika', () => {
        expect(src).not.toMatch(/console\.log\([^)]*existingRow\.user_id/);
    });
});

describe('Strażnik: wyrocznie tożsamości mają limit', () => {
    it('patients/verify dławi po numerze ORAZ osobno po IP dla nietrafień', () => {
        const src = read('patients/verify/route.ts');
        expect(src).toContain('checkRateLimit');
        expect(src).toContain('pverify:15m:');
        expect(src).toContain('pverify:24h:');
        // 🪤 licznik po IP MUSI być osobną przestrzenią kluczy — recepcja pracuje na
        // jednym tablecie, więc limit po IP liczony od każdej próby uciszyłby rejestrację
        expect(src).toContain('pverify:miss:');
    });

    it('consents/verify dławi po tokenie i nie karmi licznika IP wygasłym linkiem', () => {
        const src = read('consents/verify/route.ts');
        expect(src).toContain('cverify:');
        expect(src).toContain('cverify:miss:');
        // wygasły token → 410, i ta gałąź nie może wołać licznika nietrafień
        const expired = src.indexOf("'Token wygasł'");
        expect(expired).toBeGreaterThan(-1);
        const przedWygasnieciem = src.slice(0, expired);
        // licznik nietrafień stoi WYŻEJ, w gałęzi "brak wiersza" — nie w gałęzi wygaśnięcia
        expect(przedWygasnieciem).toContain('cverify:miss:');
    });

    it('odpowiedź z danymi pacjenta nie trafia do cache', () => {
        const src = read('consents/verify/route.ts');
        expect(src).toContain('no-store');
    });
});

describe('Strażnik: brak danych pacjenta w logach', () => {
    it('patients/verify maskuje numer i identyfikator', () => {
        const src = read('patients/verify/route.ts');
        expect(src).toContain('maskPhone');
        expect(src).toContain('maskId');
        // Surowe wartości nie mogą wrócić do console.*.
        // 🪤 Regex musi wymagać PRZECINKA tuż przed wartością — inaczej łapie także
        // poprawne `maskId(data.patient?.id)` i test oskarża naprawiony kod.
        expect(src).not.toMatch(/console\.(log|warn)\([^)]*,\s*normalizedPhone\)/);
        expect(src).not.toMatch(/console\.(log|warn)\([^)]*,\s*data\.patient\?\.id\)/);
        expect(src).not.toMatch(/console\.(log|warn)\([^)]*,\s*match\.id\)/);
    });

    it('reservations nie loguje adresu z tokenem e-Karty', () => {
        const src = read('reservations/route.ts');
        // `intakeUrl` to działająca 72-godzinna przepustka do formularza z PESEL-em
        expect(src).not.toMatch(/console\.log\([^)]*\$\{intakeUrl\}/);
    });
});
