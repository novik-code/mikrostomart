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

/**
 * 🔴 LUKA, KTÓRA WYWOŁAŁA AWARIĘ 2026-09-09.
 *
 * Blok wyżej pilnuje tras wysyłających DRAFTY przypomnień. `cron/push-appointment-1h`
 * draftów nie wysyła — produkuje push bezpośrednio — więc nigdy nie był w zasięgu
 * tego strażnika i przez to jako jedyny nie nauczył się nieść `data.type`.
 * Pacjenci przestali móc potwierdzić wizytę z powiadomienia.
 *
 * Ten blok pilnuje SZERSZEJ własności: każdy, kto wysyła push o wizycie, buduje
 * ładunek WSPÓLNYM builderem. Zachowanie samego buildera sprawdza wykonaniem
 * `pushWizytyLadunek.test.ts`; tutaj chodzi o to, żeby nikt go nie ominął.
 */
describe('każdy producent pusha o wizycie używa wspólnego buildera', () => {
    const BUILDER = 'buildAppointmentReminderPush';

    /** Trasy świadomie POZA builderem — każda z powodem, nie „bo tak wyszło". */
    const WYJATKI: Array<{ plik: string; powod: string }> = [
        {
            plik: 'src/app/api/cron/sms-auto-send/route.ts',
            powod: 'ma własną, sprawdzoną kopię (buildReminderPush) — złożenie w jedno idzie osobną zmianą, poza hotfiksem awarii',
        },
        {
            plik: 'src/lib/reminderDelivery.ts',
            powod: 'jw. — ręczna wysyłka draftu z panelu, ładunek niesie data.type od dawna',
        },
        {
            plik: 'src/lib/patientDelivery.ts',
            powod: 'TRANSPORT, nie producent — dostaje gotowy ładunek i tylko wybiera kanał (push/SMS)',
        },
    ];

    function producenciPushaWizyt(): string[] {
        const znalezione: string[] = [];
        const chodz = (kat: string) => {
            for (const wpis of fs.readdirSync(kat, { withFileTypes: true })) {
                const pelna = path.join(kat, wpis.name);
                if (wpis.isDirectory()) { chodz(pelna); continue; }
                if (!/\.ts$/.test(wpis.name)) continue;
                if (pelna.includes('__tests__')) continue; // testy opisują producentów, nie są nimi
                const src = fs.readFileSync(pelna, 'utf8');
                // Producent = wysyła push I mówi o wizycie (tytuł/typ przypomnienia).
                if (/pushToPatientAll|deliverToPatient/.test(src)
                    && /appointment_reminder|appointment_1h/.test(src)) {
                    znalezione.push(path.relative(process.cwd(), pelna));
                }
            }
        };
        chodz(path.join(process.cwd(), 'src'));
        return znalezione.sort();
    }

    const producenci = producenciPushaWizyt();

    it('inwentarz w ogóle kogoś znajduje (wzorzec nie zmurszał)', () => {
        // Strażnik, który po refaktorze przestaje cokolwiek znajdować, świeci
        // na zielono i jest GORSZY niż jego brak.
        expect(producenci.length).toBeGreaterThanOrEqual(2);
    });

    it('każdy producent używa wspólnego buildera albo ma spisany powód', () => {
        const naruszenia = producenci.filter(p =>
            !fs.readFileSync(path.join(process.cwd(), p), 'utf8').includes(BUILDER)
            && !WYJATKI.some(w => w.plik === p));
        expect(
            naruszenia,
            'producenci pusha o wizycie z własnym ładunkiem (ryzyko powtórki awarii 09.09):\n  '
            + naruszenia.join('\n  '),
        ).toEqual([]);
    });

    it('każdy wyjątek ma niepusty powód', () => {
        for (const w of WYJATKI) expect(w.powod.length).toBeGreaterThan(20);
    });

});
