/**
 * Jak DOSZŁO przypomnienie o wizycie i — jeśli nie pushem — DLACZEGO.
 *
 * ══ PO CO TO POWSTAŁO (2026-09-14) ═════════════════════════════════════════
 * Właściciel chciał widzieć w panelu admina przy każdym przypomnieniu, czy poszło
 * SMS-em, czy pushem, a jeśli nie pushem, to z jakiego powodu. Wiersz `sms_reminders`
 * niesie te informacje w kilku polach (`status`, `delivery_channel`, `push_sent`,
 * `push_error`, `send_error`, `sms_type`), a `push_error` i `send_error` to TEKSTY
 * pisane przez `patientDelivery` i `cron/push-escalation`. Czytanie tych pól po swojemu
 * w dwóch widokach panelu dałoby dwie różne odpowiedzi, dlatego interpretacja żyje
 * tutaj, a panel ją tylko wyświetla.
 *
 * 🔑 Teksty powodów i prefiksy eskalacji są STAŁYMI z tego pliku, a miejsca wysyłki
 * je importują. Gdyby ktoś zmienił treść komunikatu tylko po jednej stronie, panel
 * przestałby go rozpoznawać i pokazywałby „inny błąd" zamiast konkretnej przyczyny.
 *
 * Moduł jest CZYSTY (bez bazy i bez serwerowych zależności), bo importuje go
 * komponent kliencki panelu.
 */

/** Treści zapisywane w `sms_reminders.push_error` przez `lib/patientDelivery.ts`. */
export const POWOD_PUSH = {
    BRAK_KONTA: 'Pacjent nie ma konta w portalu',
    BRAK_TOKENU: 'Brak tokenu push (pacjent nie ma apki ani powiadomień w przeglądarce)',
    BLAD_ODCZYTU_TOKENOW: 'Nie udało się odczytać tokenów push (błąd bazy) — wysyłam SMS',
    /** Początek komunikatu, po nim liczniki nieudanych wysyłek. */
    PREFIKS_ZERO_URZADZEN: 'Push sent to 0 devices',
    /** Stara treść sprzed obsługi aplikacji mobilnej — wciąż leży w historii. */
    STARY_BRAK_FCM: 'Brak FCM tokenu (pacjent nie włączył powiadomień push)',
} as const;

/**
 * Pierwsza wersja push-first (kwiecień–lipiec 2026) pisała `Push sent to 0/N devices`,
 * obecna pisze `Push sent to 0 devices (…)`. Obie znaczą to samo.
 */
const ZERO_URZADZEN = /^Push sent to 0(?:\/\d+)? devices/;

/** Prefiksy `send_error` pisane przez `cron/push-escalation` (importuje je stąd). */
export const PREFIKS_ESKALACJI = 'Escalation:';
export const PREFIKS_ESKALACJA_NIEUDANA = 'Push OK, SMS failed:';
export const PREFIKS_ESKALACJA_POMINIETA = 'Eskalacja pominięta:';

export type KanalDostarczenia = 'push' | 'push+sms' | 'sms' | 'brak' | 'oczekuje';

export type KodPowodu =
    | 'brak_konta'
    | 'brak_apki_i_powiadomien'
    | 'blad_odczytu_tokenow'
    | 'push_nie_doszedl'
    | 'blad_push'
    | 'typ_tylko_sms'
    | 'sms_reczny'
    | 'brak_zapisu_proby';

export interface WierszDostarczenia {
    status?: string | null;
    sms_type?: string | null;
    delivery_channel?: string | null;
    push_sent?: boolean | null;
    push_error?: string | null;
    send_error?: string | null;
    appointment_type?: string | null;
}

export interface OpisDostarczenia {
    kanal: KanalDostarczenia;
    /** Krótka etykieta do plakietki. */
    etykieta: string;
    /** Dlaczego nie push — `null`, gdy push doszedł albo wysyłka jeszcze się nie odbyła. */
    kodPowodu: KodPowodu | null;
    /** Czytelne wyjaśnienie: powód braku pusha albo uwaga do eskalacji. */
    powod: string | null;
}

export const OPIS_POWODU: Record<KodPowodu, string> = {
    brak_konta: 'Pacjent nie ma konta w aplikacji ani w strefie pacjenta',
    brak_apki_i_powiadomien: 'Ma konto, ale nie ma aplikacji ani włączonych powiadomień',
    blad_odczytu_tokenow: 'Nie udało się sprawdzić urządzeń pacjenta (błąd bazy) — poszedł SMS',
    push_nie_doszedl: 'Push nie doszedł do żadnego urządzenia (nieaktualny token)',
    blad_push: 'Błąd wysyłki pusha',
    typ_tylko_sms: 'Ten rodzaj wiadomości wysyłamy wyłącznie SMS-em',
    sms_reczny: 'Ręczny SMS z panelu — bez próby pusha',
    brak_zapisu_proby: 'Brak zapisu próby pusha (starsza ścieżka wysyłki)',
};

function powodZTekstu(pushError: string | null | undefined): { kod: KodPowodu; powod: string } {
    const tekst = (pushError ?? '').trim();
    if (!tekst) return { kod: 'brak_zapisu_proby', powod: OPIS_POWODU.brak_zapisu_proby };
    if (tekst === POWOD_PUSH.BRAK_KONTA) return { kod: 'brak_konta', powod: OPIS_POWODU.brak_konta };
    if (tekst === POWOD_PUSH.BRAK_TOKENU || tekst === POWOD_PUSH.STARY_BRAK_FCM) {
        return { kod: 'brak_apki_i_powiadomien', powod: OPIS_POWODU.brak_apki_i_powiadomien };
    }
    if (tekst === POWOD_PUSH.BLAD_ODCZYTU_TOKENOW) {
        return { kod: 'blad_odczytu_tokenow', powod: OPIS_POWODU.blad_odczytu_tokenow };
    }
    if (ZERO_URZADZEN.test(tekst)) {
        return { kod: 'push_nie_doszedl', powod: OPIS_POWODU.push_nie_doszedl };
    }
    // Nieznany komunikat pokazujemy W CAŁOŚCI — ukrycie go za ogólnikiem zabrałoby
    // jedyną wskazówkę, co się stało.
    return { kod: 'blad_push', powod: `${OPIS_POWODU.blad_push}: ${tekst}` };
}

function poPrefiksie(tekst: string, prefiks: string): string {
    return tekst.slice(prefiks.length).trim();
}

export function opisDostarczenia(w: WierszDostarczenia): OpisDostarczenia {
    const status = w.status ?? '';
    const sendError = w.send_error ?? '';

    if (w.push_sent === true) {
        // 🔑 Eskalacja nieudana albo pominięta: push DOSZEDŁ, SMS nie. Kanałem jest push —
        // pokazanie „Push + SMS" mówiłoby właścicielowi, że SMS wyszedł, a nie wyszedł.
        if (sendError.startsWith(PREFIKS_ESKALACJA_NIEUDANA)) {
            return {
                kanal: 'push', etykieta: 'Push (SMS nie doszedł)', kodPowodu: null,
                powod: `Pacjent nie zareagował na push, a dosłanie SMS-a się nie udało: ${poPrefiksie(sendError, PREFIKS_ESKALACJA_NIEUDANA)}`,
            };
        }
        if (sendError.startsWith(PREFIKS_ESKALACJA_POMINIETA)) {
            return {
                kanal: 'push', etykieta: 'Push', kodPowodu: null,
                powod: `Bez reakcji na push, SMS-a nie dosłano: ${poPrefiksie(sendError, PREFIKS_ESKALACJA_POMINIETA)}`,
            };
        }
        // Wiersze sprzed 2026-09-14: nieudana eskalacja zapisywała `failed` + `push+sms`.
        if (status === 'failed') {
            return {
                kanal: 'push', etykieta: 'Push (SMS nie doszedł)', kodPowodu: null,
                powod: sendError ? `Dosłanie SMS-a się nie udało: ${sendError}` : 'Dosłanie SMS-a się nie udało',
            };
        }
        if (w.delivery_channel === 'push+sms') {
            const eskalacja = sendError.startsWith(PREFIKS_ESKALACJI);
            return {
                kanal: 'push+sms',
                etykieta: eskalacja ? 'Push, potem SMS' : 'Push + SMS',
                kodPowodu: null,
                powod: eskalacja ? 'Pacjent nie zareagował na push w ciągu 2 godzin — dosłany SMS' : null,
            };
        }
        return { kanal: 'push', etykieta: 'Push', kodPowodu: null, powod: null };
    }

    const nieReminder = !!w.sms_type && w.sms_type !== 'reminder';
    const recznySms = w.appointment_type === 'manual';
    // Wiadomości po wizycie i tydzień po też idą push-first i zapisują prawdziwy powód,
    // więc „tylko SMS z założenia" pokazujemy wyłącznie, gdy żadnej próby pusha nie ma.
    const przyczyna = recznySms
        ? { kod: 'sms_reczny' as const, powod: OPIS_POWODU.sms_reczny }
        : w.push_error
            ? powodZTekstu(w.push_error)
            : nieReminder
                ? { kod: 'typ_tylko_sms' as const, powod: OPIS_POWODU.typ_tylko_sms }
                : powodZTekstu(null);

    if (status === 'draft') {
        // Szkic po NIEUDANEJ próbie (brak pusha i błąd SMS-a): `updateDeliveryStatus`
        // zapisuje kanał `none` i powód, ale statusu nie zmienia. To nie jest „czeka".
        if (w.delivery_channel === 'none' && w.push_error) {
            return { kanal: 'brak', etykieta: 'Próba nieudana', kodPowodu: przyczyna.kod, powod: przyczyna.powod };
        }
        return { kanal: 'oczekuje', etykieta: 'Czeka na wysyłkę', kodPowodu: null, powod: null };
    }
    if (status === 'sent') {
        return { kanal: 'sms', etykieta: 'SMS', kodPowodu: przyczyna.kod, powod: przyczyna.powod };
    }
    if (status === 'cancelled') {
        return { kanal: 'brak', etykieta: 'Anulowane', kodPowodu: null, powod: sendError || null };
    }
    // `failed` i wszystko nieznane: nic nie doszło. Powód braku pusha nadal ma sens —
    // mówi, czemu wysyłka w ogóle zależała od SMS-a.
    return { kanal: 'brak', etykieta: 'Nie dostarczono', kodPowodu: przyczyna.kod, powod: przyczyna.powod };
}

export interface PodsumowanieDostarczen {
    push: number;
    pushSms: number;
    sms: number;
    brak: number;
    oczekuje: number;
    /** Ile razy wystąpił każdy powód braku pusha — tylko niezerowe. */
    powody: Partial<Record<KodPowodu, number>>;
}

export function podsumujDostarczenia(wiersze: ReadonlyArray<WierszDostarczenia>): PodsumowanieDostarczen {
    const wynik: PodsumowanieDostarczen = { push: 0, pushSms: 0, sms: 0, brak: 0, oczekuje: 0, powody: {} };
    for (const w of wiersze) {
        const o = opisDostarczenia(w);
        if (o.kanal === 'push') wynik.push++;
        else if (o.kanal === 'push+sms') wynik.pushSms++;
        else if (o.kanal === 'sms') wynik.sms++;
        else if (o.kanal === 'brak') wynik.brak++;
        else wynik.oczekuje++;
        if (o.kodPowodu) wynik.powody[o.kodPowodu] = (wynik.powody[o.kodPowodu] ?? 0) + 1;
    }
    return wynik;
}
