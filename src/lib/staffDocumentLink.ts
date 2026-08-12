/**
 * Otwieranie plików ze Storage w panelu pracownika — przez trasę-pośrednik.
 *
 * 🔑 PO CO. Panel wstawiał dotąd publiczny adres wprost w `href`. Trzy skutki:
 * brak śladu w audycie (nikt nie wie, kto otworzył e-Kartę z PESEL-em), martwy
 * link po zamknięciu bucketa i adres, który da się skopiować i wysłać dalej.
 * Pośrednik sprawdza, że obiekt istnieje w bazie, podpisuje go na 900 s i zapisuje
 * wpis w `employee_audit_log`.
 *
 * 🪤 OKNO OTWIERAMY SYNCHRONICZNIE, PRZED `await`. Przeglądarka wiąże `window.open`
 * z gestem użytkownika; wywołane po `await fetch(...)` jest już „samo z siebie"
 * i blokada wyskakujących okien je ubija. Dlatego najpierw pusta karta, potem
 * podstawienie adresu — kolejność ma znaczenie i nie jest kwestią gustu.
 */

type Rodzaj =
    | { typ: 'consent'; id: string }
    | { typ: 'ekarta'; id: string }
    | { typ: 'task-image'; path: string };

export async function otworzDokumentPersonelu(co: Rodzaj): Promise<void> {
    const okno = window.open('', '_blank', 'noopener,noreferrer');

    const qs = co.typ === 'task-image'
        ? `type=task-image&path=${encodeURIComponent(co.path)}`
        : `type=${co.typ}&id=${encodeURIComponent(co.id)}`;

    try {
        const res = await fetch(`/api/employee/documents/file?${qs}`);
        const dane = await res.json().catch(() => ({}));

        if (!res.ok || !dane?.url) {
            okno?.close();
            // 401/403 to najczęściej wygasła sesja albo niedokończone 2FA — mówimy to
            // wprost, zamiast zostawiać człowieka z pustą kartą i domysłami.
            alert(
                res.status === 401 || res.status === 403
                    ? 'Sesja wygasła lub brak uprawnień — zaloguj się ponownie (i przejdź 2FA).'
                    : `Nie udało się otworzyć dokumentu: ${dane?.error || res.status}`,
            );
            return;
        }

        if (okno) okno.location.href = dane.url;
        else window.location.href = dane.url; // blokada okien — otwieramy w tej samej karcie
    } catch {
        okno?.close();
        alert('Błąd połączenia przy otwieraniu dokumentu.');
    }
}

/**
 * Adres do `<img src>` dla zdjęcia zadania — tryb `redirect=1` oddaje BAJTY
 * (302 na podpisany adres), bo znacznik `<img>` nie umie skonsumować JSON-a.
 *
 * Zwraca `null`, gdy wiersz nie ma jeszcze klucza — wołający pokazuje wtedy stary
 * `image_url`. To jest okres przejściowy: bucket wciąż publiczny, więc obie drogi działają.
 */
export function miniaturaZadania(path: string | null | undefined): string | null {
    const p = (path || '').trim();
    if (!p) return null;
    return `/api/employee/documents/file?type=task-image&path=${encodeURIComponent(p)}&redirect=1`;
}
