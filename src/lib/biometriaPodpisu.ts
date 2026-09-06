/**
 * STRESZCZENIE BIOMETRII PODPISU — jedno miejsce, dwie trasy (P-071 + P-095).
 *
 * 🔴 PO CO. Podpis składany na tablecie zapisuje pełną trajektorię ręki: każdy punkt
 * z pozycją, NACISKIEM i czasem, plus `deviceInfo`. To dane biometryczne, czyli
 * szczególna kategoria z art. 9 RODO. Do 06.09 `GET /api/employee/patient-consents`
 * odsyłał je w komplecie w każdym wierszu listy — mimo że apka personelu nie czyta ich
 * ani razu (typ `SignedConsent` ma siedem pól i żadnego biometrycznego), a panel weba
 * potrzebuje wyłącznie LICZB do plakietki i popovera.
 *
 * 🔑 KSZTAŁT JEST KOPIĄ TEGO, CO JUŻ DZIAŁAŁO w `/api/admin/patient-consents` — ta trasa
 * streszczała biometrię do listy od dawna. Ten moduł istnieje po to, żeby definicja
 * została JEDNA: obie trasy oddają teraz identyczny obiekt, więc panel i widok admina
 * nie mogą się rozjechać.
 *
 * 🪤 CZEGO TU CELOWO NIE MA: `strokes` i `deviceInfo`. Pierwsze to sam przebieg ruchu,
 * drugie niesie `userAgent` i rozdzielczość ekranu — z biometrii bierzemy wyłącznie
 * `pointerType`, bo tylko on jest renderowany (rysik / palec / mysz).
 */

/** To, co realnie renderują panel pracownika i widok admina. */
export type StreszczenieBiometrii = {
    hasData: true;
    pointCount: number;
    avgPressure: number;
    maxPressure: number;
    totalDuration: number;
    pointerType: string;
    strokeCount: number;
};

/**
 * Zwraca streszczenie albo `null`, gdy zgoda nie ma biometrii (podpis papierowy,
 * import historyczny). `null` jest ważne: panel testuje `bio && …` i po tym rozpoznaje
 * zgodę bez plakietki.
 */
export function streszczenieBiometrii(surowa: unknown): StreszczenieBiometrii | null {
    if (!surowa || typeof surowa !== 'object') return null;
    const bio = surowa as {
        pointCount?: number;
        avgPressure?: number;
        maxPressure?: number;
        totalDuration?: number;
        deviceInfo?: { pointerType?: string };
        strokes?: { points?: unknown[] }[];
    };

    const kreski = Array.isArray(bio.strokes) ? bio.strokes : [];
    /**
     * 🪤 `pointCount` liczymy z kresek, GDY pola nie ma. Zapisujący (`zgody/[token]`)
     * ustawia je zawsze, ale wiersz zaimportowany albo wstawiony ręcznie może go nie mieć —
     * a panel gasi całą plakietkę przy `pointCount === 0`. To jest ten sam odruch co
     * fallback, który panel ma dziś u siebie; przenosimy go tutaj, żeby streszczenie
     * nie było uboższe od danych, które zastępuje.
     */
    const punkty = bio.pointCount
        ?? kreski.reduce((suma, k) => suma + (Array.isArray(k?.points) ? k.points.length : 0), 0);

    return {
        hasData: true,
        pointCount: punkty || 0,
        avgPressure: bio.avgPressure || 0,
        maxPressure: bio.maxPressure || 0,
        totalDuration: bio.totalDuration || 0,
        pointerType: bio.deviceInfo?.pointerType || 'unknown',
        strokeCount: kreski.length,
    };
}
