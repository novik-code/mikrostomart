/**
 * Otwieranie WŁASNEGO dokumentu przez pacjenta (portal webowy) — przez trasę-pośrednik.
 *
 * Bliźniak `staffDocumentLink.ts`, ale bije w `/api/patients/documents/[id]/file`:
 * inna bramka (JWT pacjenta zamiast sesji personelu) i inny rejestr
 * (`patient_document_access_log`, bez identyfikatora pracownika).
 *
 * 🪤 Okno otwieramy PRZED `await` — po nim przeglądarka nie wiąże już otwarcia
 * z gestem i blokada wyskakujących okien je ubija.
 */

export async function otworzDokumentPacjenta(
    id: string,
    typ: 'consent' | 'ekarta' | string,
): Promise<void> {
    const okno = window.open('', '_blank', 'noopener,noreferrer');
    const rodzaj = typ === 'ekarta' ? 'ekarta' : 'consent';

    try {
        const res = await fetch(`/api/patients/documents/${encodeURIComponent(id)}/file?type=${rodzaj}`);
        const dane = await res.json().catch(() => ({}));

        if (!res.ok || !dane?.url) {
            okno?.close();
            alert(
                res.status === 401
                    ? 'Sesja wygasła — zaloguj się ponownie.'
                    : 'Nie udało się otworzyć dokumentu. Spróbuj ponownie albo skontaktuj się z rejestracją.',
            );
            return;
        }

        if (okno) okno.location.href = dane.url;
        else window.location.href = dane.url;
    } catch {
        okno?.close();
        alert('Błąd połączenia przy otwieraniu dokumentu.');
    }
}
