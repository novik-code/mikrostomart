import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 🔒 Zdejmuje tokeny push pacjenta przy REWOKACJI SESJI.
 *
 * Po co: migracja 197 unieważnia stare tokeny JWT (zmiana hasła, reset po przejęciu
 * konta, usunięcie konta), więc urządzenie napastnika przestaje czytać dane —
 * ale NADAL DOSTAJE POWIADOMIENIA. A treść pusha bywa mówiąca sama z siebie:
 * „Przypomnienie o wizycie jutro o 10:00 u dr …", plus deep-link prowadzący
 * w konkretne miejsce aplikacji. Rewokacja, która zostawia ten kanał otwarty,
 * jest niepełna.
 *
 * Dwie tabele, dwa różne klucze — łatwo o pomyłkę:
 *  · `patient_push_tokens.patient_id` trzyma **PRODENTIS id** (mimo nazwy kolumny),
 *  · `fcm_tokens.user_id` trzyma **UUID konta** i wymaga `user_type='patient'`.
 *
 * 🔑 NIEBLOKUJĄCE: błąd sprzątania nie może wywrócić zmiany hasła ani resetu —
 * to są ścieżki ratunkowe, których nie wolno zablokować z powodu tabeli pomocniczej.
 * Urządzenia z poprawnym, świeżym logowaniem zarejestrują token z powrotem same
 * (apka odświeża go przy każdym wejściu na wierzch).
 */
export async function revokePatientPushTokens(
  supabase: SupabaseClient,
  ids: { prodentisId?: string | null; userId?: string | number | null },
  tag: string,
): Promise<void> {
  try {
    if (ids.prodentisId) {
      const { error } = await supabase
        .from('patient_push_tokens')
        .delete()
        .eq('patient_id', ids.prodentisId);
      if (error) console.error(`[${tag}] patient_push_tokens cleanup error:`, error);
    }
    if (ids.userId != null) {
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', String(ids.userId))
        .eq('user_type', 'patient');
      if (error) console.error(`[${tag}] fcm_tokens cleanup error:`, error);
    }
  } catch (e) {
    console.error(`[${tag}] Push token revoke failed:`, e);
  }
}
