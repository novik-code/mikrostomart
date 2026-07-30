/**
 * Strażnik okablowania: KAŻDA trasa wysyłająca przypomnienie o wizycie musi iść
 * przez wspólne `deliverReminderDraft` (push-first), a nie przez gołe `sendSMS`.
 *
 * 🔴 PO CO. Panel recepcji ma kilka tras wysyłki. Naprawa push-first z 2026-07-28
 * objęła TYLKO `/api/admin/sms-send`; `/api/admin/sms-reminders/send` („wyślij
 * wszystkie") została pominięta i przez nią przeszło zgłoszenie z produkcji
 * 2026-07-30: właściciel z aktywną aplikacją i świeżym tokenem dostał sam SMS.
 *
 * Ten test nie sprawdza logiki dostarczania — od tego są testy `patientDelivery`.
 * Sprawdza rzecz, której nie widać w code review: że ktoś nie dołożył CZWARTEJ
 * trasy wysyłki, znowu z `sendSMS` w środku.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const API = path.join(process.cwd(), 'src/app/api');

/** Trasy, które wysyłają DRAFT przypomnienia (nie: SMS ad hoc bez kontekstu wizyty). */
const REMINDER_SEND_ROUTES = [
    'admin/sms-send/route.ts',
    'admin/sms-reminders/send/route.ts',
];

describe('okablowanie wysyłki przypomnień', () => {
    for (const rel of REMINDER_SEND_ROUTES) {
        it(`${rel} idzie przez push-first`, () => {
            const src = fs.readFileSync(path.join(API, rel), 'utf8');
            expect(src).toContain('deliverReminderDraft');
        });
    }

    it('żadna trasa przypomnień nie woła sendSMS na ścieżce draftu', () => {
        for (const rel of REMINDER_SEND_ROUTES) {
            const src = fs.readFileSync(path.join(API, rel), 'utf8');
            // `sendSMS` wolno użyć WYŁĄCZNIE w gałęzi zapasowej, opisanej komentarzem.
            // Jeśli pojawia się bez niej, ktoś ominął push-first.
            if (src.includes('sendSMS(')) {
                expect(src).toMatch(/Ścieżka zapasowa|fallback/i);
            }
        }
    });

    /**
     * Wykrywa CZWARTĄ trasę: nowy plik pod `admin/sms*`, który czyta drafty
     * z `sms_reminders` i wysyła je `sendSMS`, nie tykając wspólnej ścieżki.
     */
    it('nie ma nowej trasy wysyłającej drafty PRZYPOMNIEŃ z pominięciem push-first', () => {
        const offenders: string[] = [];
        const walk = (dir: string) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (e.name === 'route.ts') {
                    const src = fs.readFileSync(p, 'utf8');
                    const readsDrafts = src.includes("from('sms_reminders')") && src.includes("'draft'");
                    const sends = src.includes('sendSMS(');
                    const pushFirst = src.includes('deliverReminderDraft') || src.includes('deliverToPatient');
                    /**
                     * Trasy obsługujące WYŁĄCZNIE inne typy (po zabiegu, tydzień po)
                     * są poza zakresem push-first — mają własne crony i własną logikę.
                     * ⚠️ Ich wiersze nie mają `patient_id`, więc push i tak nie miałby
                     * po czym znaleźć konta. To osobny, otwarty temat.
                     */
                    const onlyOtherTypes = /'post_visit'|'week_after_visit'/.test(src) && !/'reminder'/.test(src);
                    if (readsDrafts && sends && !pushFirst && !onlyOtherTypes) offenders.push(path.relative(API, p));
                }
            }
        };
        walk(path.join(API, 'admin'));
        walk(path.join(API, 'cron'));
        expect(offenders).toEqual([]);
    });
});
