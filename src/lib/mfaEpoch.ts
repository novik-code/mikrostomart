import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * `mfa_epoch` — licznik unieważnień sesji drugiego składnika (migracja 191).
 *
 * 🔒 PO CO TO JEST. Token sesji MFA (cookie `mfa_session` na webie, nagłówek
 * `X-MFA-Session` w apce) żyje 8 h, a przy „Zaufaj temu urządzeniu" 30 DNI.
 * Do 2026-08-12 nie istniało NIC, co mogłoby go unieważnić przed terminem:
 * `verifyMfaSessionToken` sprawdzał podpis, `userId` i datę. Reset 2FA po
 * kradzieży telefonu nie odbierał złodziejowi dostępu — komentarz w kodzie
 * twierdził inaczej, ale nie miał pokrycia.
 *
 * Teraz token niesie epokę z chwili wystawienia, a bramka odrzuca token
 * z epoką STARSZĄ niż bieżąca w bazie. Odebranie czynnika = inkrementacja.
 *
 * 🪤 KOLEJNOŚĆ DEPLOY vs MIGRACJA. `readMfaGate` czyta kolumnę z FALLBACKIEM.
 * Bez niego brak kolumny (`42703`) wywala CAŁY select, `totp_enabled` wychodzi
 * `false` i bramka 2FA przestaje cokolwiek egzekwować dla nie-adminów — czyli
 * dokładanie kolumny do zapytania OTWIERAŁOBY dziurę zamiast ją zamykać.
 * Ta sama klasa co awaria `/api/patients/me` po dodaniu kolumny `avatar`.
 */

let cachedClient: SupabaseClient | null = null;

/**
 * Leniwy klient serwisowy — NIE na poziomie modułu, bo ten plik importuje
 * middleware, a tworzenie klienta przy imporcie modułu wykonywałoby się dla
 * KAŻDEGO żądania przechodzącego przez matcher.
 */
function serviceClient(): SupabaseClient | null {
    if (cachedClient) return cachedClient;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    cachedClient = createClient(url, key);
    return cachedClient;
}

/** Kod PostgREST dla „kolumna nie istnieje" — stan sprzed wgrania migracji 191. */
const UNDEFINED_COLUMN = '42703';

export type MfaGate = {
    /** `employees.totp_enabled` — czy konto ma aktywny drugi składnik. */
    totpEnabled: boolean;
    /** Bieżąca epoka; 0 zarówno dla świeżego konta, jak i przed migracją 191. */
    epoch: number;
    /** `false` = odczyt padł (błąd bazy) albo nie ma takiego pracownika. */
    ok: boolean;
};

/**
 * Jeden odczyt bramki 2FA: `totp_enabled` + `mfa_epoch`.
 *
 * Klient przychodzi Z ZEWNĄTRZ, bo middleware tworzy własny na żądanie i nie
 * ma powodu, żeby robić drugi. Trasy API wołają `getMfaEpoch`, które używa
 * współdzielonego klienta serwisowego.
 */
export async function readMfaGate(client: SupabaseClient, userId: string): Promise<MfaGate> {
    const withEpoch = await client
        .from('employees')
        .select('totp_enabled, mfa_epoch')
        .eq('user_id', userId)
        .maybeSingle();

    if (!withEpoch.error) {
        const row = withEpoch.data as { totp_enabled?: boolean; mfa_epoch?: number } | null;
        return {
            totpEnabled: Boolean(row?.totp_enabled),
            epoch: typeof row?.mfa_epoch === 'number' ? row.mfa_epoch : 0,
            ok: Boolean(row),
        };
    }

    // Migracja 191 jeszcze nie wgrana → czytamy tyle, ile było wcześniej.
    if (withEpoch.error.code === UNDEFINED_COLUMN) {
        const legacy = await client
            .from('employees')
            .select('totp_enabled')
            .eq('user_id', userId)
            .maybeSingle();
        if (!legacy.error) {
            return { totpEnabled: Boolean(legacy.data?.totp_enabled), epoch: 0, ok: Boolean(legacy.data) };
        }
        console.error('[mfaEpoch] readMfaGate legacy read failed:', legacy.error.code, legacy.error.message);
        return { totpEnabled: false, epoch: 0, ok: false };
    }

    console.error('[mfaEpoch] readMfaGate failed:', withEpoch.error.code, withEpoch.error.message);
    return { totpEnabled: false, epoch: 0, ok: false };
}

/**
 * Bieżąca epoka pracownika — wołane przy WYSTAWIANIU tokenu.
 *
 * Zwraca 0, gdy odczyt padnie. To strona bezpieczna: token z zaniżoną epoką
 * zostanie odrzucony przez bramkę i człowiek przejdzie challenge jeszcze raz.
 * Zawyżenie byłoby groźne — wystawiłoby token przeżywający przyszły reset.
 */
export async function getMfaEpoch(userId: string): Promise<number> {
    const client = serviceClient();
    if (!client) return 0;
    const gate = await readMfaGate(client, userId);
    return gate.epoch;
}

/**
 * Unieważnia WSZYSTKIE dotychczasowe sesje MFA pracownika (atomowy RPC z mig. 191).
 *
 * Zwraca `false`, gdy unieważnienie NIE nastąpiło (brak RPC = migracja niewgrana,
 * brak pracownika, błąd bazy). Wołający nie przerywa z tego powodu operacji —
 * odebranie czynnika samo w sobie jest skuteczne — ale zapis w logu ma być głośny,
 * bo cicha porażka oznacza, że stary token dalej żyje.
 */
export async function bumpMfaEpoch(userId: string, reason: string): Promise<boolean> {
    const client = serviceClient();
    if (!client) {
        console.error('[mfaEpoch] bump skipped — no service client', { reason });
        return false;
    }

    const { data, error } = await client.rpc('increment_mfa_epoch', { p_user_id: userId });
    if (error) {
        console.error('[mfaEpoch] bump FAILED — stare sesje MFA zostaja wazne:', reason, error.code, error.message);
        return false;
    }
    if (typeof data !== 'number') {
        console.error('[mfaEpoch] bump nie trafil w zadnego pracownika:', reason);
        return false;
    }
    return true;
}
