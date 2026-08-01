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
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('bramka 2FA obejmuje wszystkie trasy personelu', () => {
    const src = read('src/middleware.ts');
    const prefixes = /const PROTECTED_PREFIXES = \[([\s\S]*?)\]/.exec(src)?.[1] ?? '';

    it('pilnuje tras czasu pracy', () => {
        expect(prefixes).toContain("'/api/time'");
    });

    it('pilnuje wystawiania tokenu e-Karty', () => {
        expect(prefixes).toContain("'/api/intake/generate-token'");
    });

    it('NIE obejmuje całego /api/intake — submit i verify są publiczne dla pacjenta', () => {
        // Objęcie całego prefiksu zepsułoby wypełnianie e-Karty z linku.
        expect(prefixes).not.toMatch(/'\/api\/intake'/);
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
