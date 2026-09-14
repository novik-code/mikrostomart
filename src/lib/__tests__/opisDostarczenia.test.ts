/**
 * Interpretacja wiersza `sms_reminders` dla panelu admina: kanał i powód braku pusha.
 *
 * Prośba właściciela 2026-09-14: „które przypomnienie poszło SMS-em, a które pushem,
 * a jeśli nie poszło pushem, to dlaczego". Przypadki niżej to REALNE kombinacje pól
 * zmierzone w produkcyjnej tabeli od 01.06 (1120+ wierszy) oraz stany, które zapisują
 * `patientDelivery` i `cron/push-escalation` — teksty biorę ze wspólnych stałych.
 */
import { describe, it, expect } from 'vitest';
import {
    opisDostarczenia, podsumujDostarczenia, POWOD_PUSH, OPIS_POWODU,
    PREFIKS_ESKALACJI, PREFIKS_ESKALACJA_NIEUDANA, PREFIKS_ESKALACJA_POMINIETA,
} from '../opisDostarczenia';

describe('push doszedł', () => {
    it('🔴 status push_sent → kanał push, bez powodu', () => {
        // Przed migracją 204 ten wiersz nie mógł powstać (CHECK z 007 odrzucał `push_sent`).
        expect(opisDostarczenia({ status: 'push_sent', delivery_channel: 'push', push_sent: true, push_error: null }))
            .toEqual({ kanal: 'push', etykieta: 'Push', kodPowodu: null, powod: null });
    });

    it('eskalacja: push, brak reakcji w 2 h, dosłany SMS', () => {
        const o = opisDostarczenia({
            status: 'sent', delivery_channel: 'push+sms', push_sent: true,
            send_error: `${PREFIKS_ESKALACJI} pacjent nie odpowiedział na push w ciągu 2h`,
        });
        expect(o.kanal).toBe('push+sms');
        expect(o.etykieta).toBe('Push, potem SMS');
        expect(o.powod).toContain('2 godzin');
    });

    it('pacjent odpowiedział na push → eskalacja zapisuje sent + kanał push: to nadal PUSH', () => {
        expect(opisDostarczenia({ status: 'sent', delivery_channel: 'push', push_sent: true }).kanal).toBe('push');
    });

    it('🔴 nieudana eskalacja NIE jest liczona jako „Push + SMS" — SMS nie wyszedł', () => {
        const o = opisDostarczenia({
            status: 'push_sent', delivery_channel: 'push', push_sent: true,
            send_error: `${PREFIKS_ESKALACJA_NIEUDANA} SMSAPI 101`,
        });
        expect(o).toMatchObject({ kanal: 'push', etykieta: 'Push (SMS nie doszedł)' });
        expect(o.powod).toContain('SMSAPI 101');
    });

    it('stary zapis nieudanej eskalacji (failed + push+sms) → push, SMS nie doszedł', () => {
        expect(opisDostarczenia({ status: 'failed', delivery_channel: 'push+sms', push_sent: true, send_error: 'Push OK, SMS failed: x' }))
            .toMatchObject({ kanal: 'push', etykieta: 'Push (SMS nie doszedł)' });
    });

    it('eskalacja pominięta (wizyta dziś) → push z wyjaśnieniem', () => {
        const o = opisDostarczenia({ status: 'sent', delivery_channel: 'push', push_sent: true, send_error: `${PREFIKS_ESKALACJA_POMINIETA} wizyta dziś` });
        expect(o.kanal).toBe('push');
        expect(o.powod).toContain('wizyta dziś');
    });
});

describe('poszedł SMS — dlaczego nie push', () => {
    const sms = (push_error: string | null, extra = {}) =>
        opisDostarczenia({ status: 'sent', delivery_channel: 'sms', push_sent: false, sms_type: 'reminder', push_error, ...extra });

    it('🔴 brak konta (962 z 1120 wierszy)', () => {
        expect(sms(POWOD_PUSH.BRAK_KONTA)).toMatchObject({ kanal: 'sms', kodPowodu: 'brak_konta', powod: OPIS_POWODU.brak_konta });
    });

    it('🔴 konto bez aplikacji i powiadomień — obecna i stara treść dają ten sam powód', () => {
        expect(sms(POWOD_PUSH.BRAK_TOKENU).kodPowodu).toBe('brak_apki_i_powiadomien');
        expect(sms(POWOD_PUSH.STARY_BRAK_FCM).kodPowodu).toBe('brak_apki_i_powiadomien');
    });

    it('błąd odczytu tokenów ≠ brak tokenów', () => {
        expect(sms(POWOD_PUSH.BLAD_ODCZYTU_TOKENOW).kodPowodu).toBe('blad_odczytu_tokenow');
    });

    it('push wysłany na 0 urządzeń — obecny i pierwszy format komunikatu', () => {
        expect(sms('Push sent to 0 devices (fcm failed=1, app failed=0)').kodPowodu).toBe('push_nie_doszedl');
        expect(sms('Push sent to 0/2 devices').kodPowodu).toBe('push_nie_doszedl');
    });

    it('nieznany komunikat nie ginie za ogólnikiem', () => {
        const o = sms('FCM quota exceeded');
        expect(o.kodPowodu).toBe('blad_push');
        expect(o.powod).toContain('FCM quota exceeded');
    });

    it('stara ścieżka (czerwiec–lipiec): status sent, kanał none, bez push_error → SMS, brak zapisu próby', () => {
        // 381 takich wierszy — każdy ma identyfikator SMS-a od operatora, więc SMS wyszedł.
        expect(opisDostarczenia({ status: 'sent', delivery_channel: 'none', push_sent: false, push_error: null }))
            .toMatchObject({ kanal: 'sms', kodPowodu: 'brak_zapisu_proby' });
    });

    it('wiadomość po wizycie z prawdziwą próbą pusha → prawdziwy powód, nie „tylko SMS"', () => {
        // `post-visit-sms` i `week-after-visit-sms` też idą push-first i zapisują `push_error`.
        expect(sms(POWOD_PUSH.BRAK_KONTA, { sms_type: 'post_visit' }).kodPowodu).toBe('brak_konta');
    });

    it('wiadomość po wizycie bez żadnej próby pusha → tylko SMS z założenia', () => {
        expect(sms(null, { sms_type: 'week_after_visit' }).kodPowodu).toBe('typ_tylko_sms');
    });

    it('ręczny SMS z panelu — bez próby pusha', () => {
        expect(opisDostarczenia({ status: 'sent', sms_type: null, appointment_type: 'manual' }).kodPowodu).toBe('sms_reczny');
    });
});

describe('nie wysłano', () => {
    it('szkic czeka na wysyłkę — bez powodu', () => {
        expect(opisDostarczenia({ status: 'draft' })).toMatchObject({ kanal: 'oczekuje', powod: null });
    });

    it('🔴 szkic po nieudanej próbie (kanał none + powód) → „Próba nieudana", nie „czeka"', () => {
        expect(opisDostarczenia({ status: 'draft', delivery_channel: 'none', push_error: POWOD_PUSH.BRAK_KONTA }))
            .toMatchObject({ kanal: 'brak', etykieta: 'Próba nieudana', kodPowodu: 'brak_konta' });
    });

    it('błąd wysyłki → nie dostarczono, z powodem braku pusha', () => {
        expect(opisDostarczenia({ status: 'failed', push_error: POWOD_PUSH.BRAK_KONTA, send_error: 'SMSAPI 101' }))
            .toMatchObject({ kanal: 'brak', etykieta: 'Nie dostarczono', kodPowodu: 'brak_konta' });
    });

    it('anulowane (pacjent już odpowiedział) → powód z send_error', () => {
        expect(opisDostarczenia({ status: 'cancelled', send_error: 'Pacjent odpowiedział via push — SMS niepotrzebny' }))
            .toMatchObject({ kanal: 'brak', etykieta: 'Anulowane', powod: 'Pacjent odpowiedział via push — SMS niepotrzebny' });
    });
});

describe('podsumowanie dnia', () => {
    it('liczy kanały i powody', () => {
        const p = podsumujDostarczenia([
            { status: 'push_sent', push_sent: true },
            { status: 'sent', push_sent: true, delivery_channel: 'push+sms', send_error: `${PREFIKS_ESKALACJI} x` },
            { status: 'push_sent', push_sent: true, send_error: `${PREFIKS_ESKALACJA_NIEUDANA} y` },
            { status: 'sent', push_error: POWOD_PUSH.BRAK_KONTA },
            { status: 'sent', push_error: POWOD_PUSH.BRAK_KONTA },
            { status: 'sent', push_error: POWOD_PUSH.BRAK_TOKENU },
            { status: 'failed', push_error: POWOD_PUSH.BRAK_KONTA },
            { status: 'draft' },
        ]);
        expect(p).toEqual({
            push: 2, pushSms: 1, sms: 3, brak: 1, oczekuje: 1,
            powody: { brak_konta: 3, brak_apki_i_powiadomien: 1 },
        });
    });
});
