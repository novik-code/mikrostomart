/**
 * Strażnik zamka powiadomień o zamówieniu (migracja 196).
 *
 * 🔴 CZEGO PILNUJE. Poprzednia wersja stawiała `notified_at` PRZED wysyłką. Nieudany
 * `sendEmail` oddawał 500, znacznik zostawał, a kolejne odpytanie widziało
 * `alreadyNotified` — klient zapłacił, gabinet nie dostał zamówienia i nikt się nie
 * dowiedział. Regresja tutaj jest CICHA: nic nie pada, po prostu poczta nie przychodzi.
 *
 * 🪤 To jest asercja OKABLOWANIA — sprawdza, że wołania stoją we właściwych miejscach.
 * ZACHOWANIE samych funkcji (claim → false przy drugim wywołaniu, release → znów true)
 * jest weryfikowane WYKONANIEM na bazie, bo cała logika żyje w SQL-u migracji 196,
 * a nie w TypeScripcie. Asercja na treści pliku przepuściłaby `if (false && …)`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/order-confirmation/route.ts'),
    'utf8',
);

describe('Strażnik: dwuetapowy zamek powiadomień o zamówieniu', () => {
    it('bierze zamek przez RPC, nie sklejanym filtrem PostgREST', () => {
        expect(src, 'brak wzięcia zamka').toContain('claim_order_notification');
        // Warunek „NULL albo starsze niż okno" sklejony w `.or(...)` to ta sama klasa
        // błędu co rozbity filtr w employee/documents/file — ma żyć w SQL.
        expect(src, 'wrócił sklejany filtr .or(`…`)').not.toMatch(/\.or\(`/);
    });

    it('🔴 „wysłane" stawiane PO wysyłce, nie przed nią', () => {
        const iClaim = src.indexOf('claim_order_notification');
        const iMail = src.indexOf('sendEmail(');
        const iFinish = src.indexOf('finish_order_notification');

        expect(iClaim, 'brak claim').toBeGreaterThan(-1);
        expect(iMail, 'strażnik przestał widzieć wysyłkę maila').toBeGreaterThan(-1);
        expect(iFinish, 'brak domknięcia po wysyłce').toBeGreaterThan(-1);

        expect(iClaim, 'zamek musi być brany PRZED wysyłką').toBeLessThan(iMail);
        expect(iFinish, '🔴 `notified_at` stawiany przed wysyłką — to była ta awaria')
            .toBeGreaterThan(iMail);
    });

    it('🔴 zamek zwalniany, gdy wysyłka padnie', () => {
        expect(src, 'brak zwolnienia zamka').toContain('release_order_notification');
        // Zwolnienie MUSI być osiągalne z bloku obsługi błędu, a nie tylko zdefiniowane.
        expect(src, 'zwolnienie nie jest wołane w catch').toMatch(/catch[\s\S]{0,900}?zwolnijZamek\?\.\(\)/);
        // Uchwyt powstaje PO wzięciu zamka — inaczej zwalniałby cudzy.
        expect(src).toMatch(/if \(locked && dwuetapowy\)[\s\S]{0,200}?zwolnijZamek = /);
    });

    it('ma tor zapasowy na czas przed wgraniem migracji 196', () => {
        // Push kodu przed migracją to auto-deploy — bez fallbacku wywaliłby KAŻDE zamówienie.
        expect(src, 'brak fallbacku na stary zamek').toMatch(/claimErr[\s\S]{0,400}?is\("notified_at", null\)/);
    });
});
