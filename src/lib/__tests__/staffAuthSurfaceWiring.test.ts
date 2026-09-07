/**
 * Strażnik dwóch dziur znalezionych w audycie 2026-08-01. Obie są niewidoczne
 * dla typów, testów jednostkowych i przeglądu kodu — obie zamykały się w jednej
 * linijce, a kosztowały miesiące cicho niedziałającej funkcji.
 *
 * 1. BRAMKA 2FA pilnowała tylko czterech prefiksów tras. Trasy personelu żyją także
 *    poza nimi (`/api/time/*`, `/api/intake/generate-token`) i sprawdzają wyłącznie
 *    ROLĘ. Kto znał samo hasło pracownika, wystawiał link do e-Karty na dowolnego
 *    pacjenta. To druga odsłona luki z lipca (`238f8a9`).
 *
 * 2. PREFLIGHT TOKENÓW PUSH pytał o kolumnę `patient_push_tokens.user_id`, która
 *    NIE ISTNIEJE (tabela jest kluczowana `patient_id` = prodentis id). PostgREST
 *    zwracał 42703, błąd był połykany, a twarda blokada niżej odrzucała każdego
 *    pacjenta z samą aplikacją mobilną komunikatem „nie włączył powiadomień".
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { isStaffProtectedPath } from '../middlewareSurface';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('bramka 2FA obejmuje wszystkie trasy personelu', () => {
    /**
     * 🪤 PRZEPISANE 2026-09-07 (P-004). Stały tu asercje w rodzaju
     * `expect(prefixes).toContain("'/api/time'")` — czyli sprawdzanie, czy NAPIS
     * stoi w źródle middleware. Taka asercja jest ślepa: przechodzi, gdy ciąg
     * leży w komentarzu obok, i nie widzi, czy lista jest w ogóle używana.
     * W tej samej sesji grep po zdjętym wpisie `'/api/admin/2fa/'` znalazł go
     * w MOIM komentarzu — czwarty raz ta sama pomyłka w tym projekcie.
     *
     * Dziś test buduje INWENTARZ Z KODU (każdy `route.ts` wołający jednego
     * z czterech strażników personelu) i dla każdej trasy WYKONUJE
     * `isStaffProtectedPath`. Nowa trasa personelu bez prefiksu zapala się sama.
     */
    const STRAZNICY = /requireAdmin\(|requireEmployeeOrAdmin\(|verifyAdmin\(|requireSupabaseUser\(/;

    /** Trasy świadomie POZA bramką — każda z powodem, nie „bo tak wyszło". */
    const UZASADNIONE_WYJATKI: Array<{ wzor: RegExp; powod: string }> = [
        { wzor: /^\/api\/auth\/2fa/, powod: 'bootstrap 2FA — objęcie = zakleszczenie; własny dowód w lib/mfaProof' },
        { wzor: /^\/api\/auth\/passkeys/, powod: 'bootstrap drugiego składnika; rejestracja ma własny dowód (P-002)' },
        { wzor: /^\/api\/products$/, powod: 'GET publiczny (sklep pacjenta); zapis ma dowód per metoda' },
        { wzor: /^\/api\/staff-signatures$/, powod: 'gałąź z tokenem zgody obsługuje tablet pacjenta' },
        { wzor: /^\/api\/push\/test$/, powod: 'trasa wspólna pacjent+personel; ma własne uwierzytelnienie' },
    ];

    function trasyPersonelu(): string[] {
        const wynik: string[] = [];
        const chodz = (kat: string) => {
            for (const wpis of fs.readdirSync(kat, { withFileTypes: true })) {
                const pelna = path.join(kat, wpis.name);
                if (wpis.isDirectory()) chodz(pelna);
                else if (wpis.name === 'route.ts' && STRAZNICY.test(fs.readFileSync(pelna, 'utf8'))) {
                    wynik.push(pelna
                        .replace(path.join(process.cwd(), 'src/app'), '')
                        .replace(/\/route\.ts$/, ''));
                }
            }
        };
        chodz(path.join(process.cwd(), 'src/app/api'));
        return wynik.sort();
    }

    const trasy = trasyPersonelu();

    it('inwentarz w ogóle coś znajduje (wzorzec nie zmurszał)', () => {
        // Strażnik, który po refaktorze przestaje cokolwiek znajdować, świeci
        // na zielono i jest GORSZY niż jego brak.
        expect(trasy.length).toBeGreaterThan(150);
    });

    it('każda trasa personelu jest ZA bramką albo ma spisany powód', () => {
        const bezOchrony = trasy.filter(t =>
            !isStaffProtectedPath(t) && !UZASADNIONE_WYJATKI.some(w => w.wzor.test(t)));
        expect(
            bezOchrony,
            'trasy personelu poza bramką 2FA i bez uzasadnienia:\n  ' + bezOchrony.join('\n  '),
        ).toEqual([]);
    });

    it('WYKONANIE: prefiksy naprawdę łapią trasy, których dotyczy P-004', () => {
        // Asercja na zachowanie funkcji, nie na obecność napisu w pliku.
        for (const t of ['/api/social/publish', '/api/short-links', '/api/health/ai',
                         '/api/fix-db-images', '/api/cron/post-visit-sms', '/api/time/entries',
                         '/api/intake/generate-token']) {
            expect(isStaffProtectedPath(t), `${t} miała wejść pod bramkę`).toBe(true);
        }
    });

    it('WYKONANIE: bramka NIE łapie tego, co złamałaby', () => {
        for (const t of ['/api/products', '/api/staff-signatures', '/api/push/test',
                         '/api/auth/2fa/challenge', '/api/auth/passkeys/authenticate/begin',
                         '/api/patients/me', '/api/intake/submit']) {
            expect(isStaffProtectedPath(t), `${t} NIE może wejść pod bramkę`).toBe(false);
        }
    });

    it('każdy wyjątek ma niepusty powód', () => {
        for (const w of UZASADNIONE_WYJATKI) expect(w.powod.length).toBeGreaterThan(20);
    });
});

describe('preflight tokenów push pyta o istniejącą kolumnę', () => {
    const src = read('src/app/api/employee/push/to-patient/route.ts');

    it('kluczuje patient_push_tokens po patient_id, nie po user_id', () => {
        const query = /from\('patient_push_tokens'\)[\s\S]{0,160}/.exec(src)?.[0] ?? '';
        expect(query).toContain("eq('patient_id'");
        expect(query).not.toContain("eq('user_id'");
    });

    it('nie blokuje wysyłki, gdy sam odczyt tokenów padł', () => {
        // Twarda blokada na wyniku zepsutego zapytania jest właśnie tym, co uciszyło
        // całą funkcję — brak wiedzy nie może udawać wiedzy o braku tokenów.
        expect(src).toMatch(/if \(!hasTokens && !tokenCheckFailed\)/);
    });

    it('zauważa błąd zapytania zamiast go połykać', () => {
        expect(src).toMatch(/tokenCheckFailed = true/);
    });
});
