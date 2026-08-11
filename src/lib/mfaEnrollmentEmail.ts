import { brand } from '@/lib/brandConfig';
import { MFA_DEADLINE_LABEL_PL, daysUntilMfaDeadline } from '@/lib/mfaPolicy';

/**
 * Treść maila wzywającego pracownika do włączenia 2FA przed terminem.
 *
 * Nadawca: **gabinet@mikrostomart.pl** (decyzja właściciela 2026-08-11) — nie `noreply@`.
 * To wiadomość od gabinetu do zespołu, a nie automat transakcyjny; z `noreply@` ludzie
 * nie mają jak odpisać „nie działa mi", a to jest dokładnie ta wiadomość, na którą
 * będą chcieli odpisać.
 *
 * 🔑 Instrukcja opisuje kreator TAKI, JAKI JEST (sprawdzone w `pracownik/security/page.tsx`):
 * trzy kroki, 8 kodów ratunkowych, komunikat „Krok 1 z 3: Zeskanuj QR code". Instrukcja
 * rozjeżdżająca się z ekranem jest gorsza niż jej brak — czytelnik uznaje, że trafił
 * w złe miejsce, i przestaje ufać całej wiadomości.
 *
 * ⚠️ Mail NIE NIESIE ŻADNEGO TOKENU AKTYWACYJNEGO i nie może. Link, który sam z siebie
 * włącza drugi składnik, byłby drogą do przejęcia konta: kto przechwyci maila, ten
 * ustawia sobie 2FA na cudzym koncie. Dlatego link prowadzi po prostu do panelu,
 * a konfiguracja wymaga zalogowania — czyli znajomości hasła.
 */

/** Skąd pracownik ma zacząć. Strona jest w `SKIP_2FA_PATHS`, więc działa też po terminie. */
export const MFA_SETUP_URL = `${brand.appUrl}/pracownik/security`;

export function mfaEnrollmentSubject(now: number = Date.now()): string {
    const left = daysUntilMfaDeadline(now);
    if (left < 0) return 'Logowanie do panelu wymaga teraz kodu — konfiguracja zajmuje 3 minuty';
    if (left <= 3) return `Zostały ${left === 0 ? 'godziny' : `${left} dni`}: włącz logowanie dwuskładnikowe`;
    return `Do ${MFA_DEADLINE_LABEL_PL} włącz logowanie dwuskładnikowe w panelu`;
}

/**
 * @param firstName imię do powitania; puste = neutralne „Dzień dobry"
 */
export function mfaEnrollmentHtml(firstName?: string, now: number = Date.now()): string {
    const left = daysUntilMfaDeadline(now);
    const powitanie = firstName ? `Dzień dobry, ${escapeHtml(firstName)}!` : 'Dzień dobry!';

    const naglowekTerminu =
        left < 0
            ? `<p style="margin:0 0 16px;padding:12px 14px;background:#fdecea;border-left:4px solid #c0392b;">
                 <strong>Termin minął ${MFA_DEADLINE_LABEL_PL}.</strong> Bez włączonego kodu
                 nie zalogujesz się do panelu — poniżej jest instrukcja, zajmuje około trzech minut.
               </p>`
            : `<p style="margin:0 0 16px;padding:12px 14px;background:#fff8e1;border-left:4px solid #dcb14a;">
                 <strong>Od ${MFA_DEADLINE_LABEL_PL} logowanie do panelu wymaga kodu z telefonu.</strong>
                 ${left >= 0 ? `Zostało dni: <strong>${left}</strong>.` : ''}
                 Po tym terminie bez konfiguracji nie wejdziesz do panelu.
               </p>`;

    return `<!doctype html>
<html lang="pl"><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;">
<div style="max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <p style="margin:0 0 16px;font-size:16px;">${powitanie}</p>

  ${naglowekTerminu}

  <p style="margin:0 0 16px;line-height:1.55;">
    W panelu pracownika są dane pacjentów — historia leczenia, numery telefonów, wywiady.
    Samo hasło przestaje wystarczać: jeśli komuś wycieknie, wystarczy do wejścia.
    Kod z telefonu sprawia, że znajomość hasła to za mało.
  </p>

  <h3 style="margin:24px 0 10px;font-size:16px;">Co zrobić — trzy minuty</h3>
  <ol style="margin:0 0 16px;padding-left:20px;line-height:1.7;">
    <li>Zainstaluj na telefonie aplikację <strong>Google Authenticator</strong>
        (albo Microsoft Authenticator, albo 1Password — dowolną z tych trzech).</li>
    <li>Na komputerze wejdź na <a href="${MFA_SETUP_URL}" style="color:#8a6d1f;">${MFA_SETUP_URL}</a>
        i zaloguj się jak zwykle.</li>
    <li>Kliknij <strong>„Włącz 2FA"</strong>. Kreator przeprowadzi Cię przez trzy kroki:
        zeskanujesz kod QR, przepiszesz 6 cyfr z aplikacji i&nbsp;dostaniesz
        <strong>8 kodów ratunkowych</strong>.</li>
    <li><strong>Zapisz te 8 kodów</strong> — wydrukuj albo schowaj w menedżerze haseł.
        To jedyna droga do konta, jeśli zgubisz telefon.</li>
  </ol>

  <p style="margin:0 0 16px;padding:12px 14px;background:#f0f7f0;border-left:4px solid #4a8a4a;line-height:1.55;">
    <strong>Nie będziesz wpisywać kodu przy każdym wejściu.</strong> Przy logowaniu możesz
    zaznaczyć „zaufaj temu urządzeniu" — wtedy na swoim komputerze i telefonie podajesz kod
    mniej więcej raz na miesiąc.
  </p>

  <p style="margin:0 0 16px;line-height:1.55;">
    Coś nie działa albo utknęłaś/utknąłeś na którymś kroku — odpisz na tę wiadomość
    albo napisz do gabinetu. Pomożemy ustawić.
  </p>

  <p style="margin:24px 0 0;color:#666;font-size:13px;line-height:1.5;">
    ${escapeHtml(brand.name)}<br>
    Ta wiadomość dotyczy dostępu do panelu pracownika — nie przekazuj jej dalej.
  </p>
</div>
</body></html>`;
}

/** Minimalne escapowanie — imię i nazwa marki idą do HTML-a. */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
