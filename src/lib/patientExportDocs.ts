/**
 * Kompletowanie dokumentów PDF do paczki RODO (art. 15).
 *
 * 🔴 PO CO OSOBNY MODUŁ. Logika siedziała w trasie i była NIETESTOWALNA — a to
 * dokładnie ten kawałek, który po zamknięciu bucketa mógł po cichu oddać pacjentowi
 * pusty ZIP ze statusem 200. Strażnik tekstowy tego nie obroni: sprawdzone cofką —
 * cztery różne regresje (ciche pominięcie, wyłączone przerwanie, wypadnięcie e-Kart,
 * zabity odczyt ze Storage) przeszły przez asercje na treści pliku BEZ JEDNEGO
 * czerwonego testu. Zachowanie trzeba wykonać, nie wygrepować.
 *
 * Zależności wstrzykiwane, żeby test mógł podstawić brak pliku i awarię sieci.
 */

export type DokumentDoPaczki = {
    /** Opis dla logu i komunikatu — bez nazwiska, bez ścieżki (ścieżka sama jest PII). */
    opis: string;
    /** Klucz obiektu w buckecie (kolumna `*_path`). */
    path?: string | null;
    /** Stary publiczny adres — okres przejściowy, wiersze sprzed backfillu. */
    legacyUrl?: string | null;
    /** Nazwa pliku w archiwum. */
    nazwaWPaczce: string;
};

export type WynikKompletowania = {
    pliki: Array<{ nazwaWPaczce: string; bytes: Buffer }>;
    /** Opisy dokumentów, których NIE UDAŁO SIĘ pobrać. Niepuste = eksport ma paść. */
    brakujace: string[];
};

export async function skompletujDokumenty(
    dokumenty: DokumentDoPaczki[],
    zrodla: {
        czytajZeStorage: (path: string) => Promise<Buffer | null>;
        pobierzStarymAdresem: (url: string) => Promise<Buffer | null>;
    },
): Promise<WynikKompletowania> {
    const pliki: WynikKompletowania['pliki'] = [];
    const brakujace: string[] = [];

    for (const d of dokumenty) {
        const path = (d.path || '').trim();
        const legacy = (d.legacyUrl || '').trim();

        // Wiersz bez JAKIEGOKOLWIEK wskazania na plik — nie ma czego dokładać
        // i nie jest to brak. (Np. zgoda zarejestrowana bez wygenerowanego PDF-a.)
        if (!path && !legacy) continue;

        let bytes: Buffer | null = null;
        if (path) {
            bytes = await zrodla.czytajZeStorage(path);
        } else {
            bytes = await zrodla.pobierzStarymAdresem(legacy);
        }

        // 🔑 TU JEST SEDNO: brak bajtów NIE JEST pomijany. Pacjent nie ma jak zauważyć,
        // że w paczce nie ma jednej zgody sprzed trzech lat — więc paczka ma być
        // kompletna albo żadna.
        if (!bytes || bytes.length === 0) {
            brakujace.push(d.opis);
            continue;
        }
        pliki.push({ nazwaWPaczce: d.nazwaWPaczce, bytes });
    }

    return { pliki, brakujace };
}
