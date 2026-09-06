/**
 * WIDOK PROFILU PACJENTA — allow-lista pól kartoteki PMS (P-023).
 *
 * 🔴 PO CO TO JEST. Kartoteka z Prodentisa (`GET /api/patient/:id/details`) niesie
 * komplet danych szczególnych: `pesel`, `birthDate`, `gender`, `middleName`,
 * `maidenName`, `notes` (m.in. ankieta E-Karty — nosicielstwo, nałogi, leki) oraz
 * `warnings[]` („Uwagi i ostrzeżenia dla lekarza" z datą i autorem). Do 06.09 obie
 * trasy profilu pacjenta oddawały ten rekord klientowi w całości, przez spread.
 * Zmierzone na produkcji 06.09 kluczem PACJENCKIM: `/me` → 17 kluczy, `/login` → 15,
 * w obu komplet pól wrażliwych, `pesel` niepusty. PMS nie filtruje tu niczego.
 *
 * 🔑 DLACZEGO ALLOW-LISTA, A NIE USUWANIE POLI. Deny-lista chroni wyłącznie przed
 * polami, które ktoś zdążył wypisać. Dostawca PMS dokładał do tej odpowiedzi nowe
 * pola już wcześniej (7 naraz — kontekst :15956) i zrobi to znowu; przy deny-liście
 * każde takie pole trafia do pacjenta samo z siebie, bez ani jednej linii zmiany
 * po naszej stronie. Ta funkcja przepuszcza WYŁĄCZNIE to, co web i apka realnie czytają.
 *
 * 🔑 KTO TO KONSUMUJE (dlatego lista ma dokładnie te pozycje):
 *   · web  — `PatientData` (hooks/usePatientAuth.ts), profil, dashboard, CheckoutForm;
 *   · apka — typ `Patient` (src/lib/api.ts), ekran profilu, kontekst logowania.
 * Ani jeden plik w żadnym z repozytoriów nie czyta pól wrażliwych z TEGO źródła —
 * `pesel`/`birthDate` czyta strefa PERSONELU z własnej trasy (`/api/employee/patient-details`)
 * i strona zgód z własnej whitelisty (`consents/verify`), i tych dwóch nie ruszamy.
 *
 * 🪤 KONTRAKT TYLKO ROŚNIE. Binarki 1.3.x żyją w sklepach, więc odpowiedź może stracić
 * wyłącznie klucze, których nikt nie czyta. Wszystkie pola z tej listy zostają.
 */

/** Adres w kształcie, w jakim czytają go profil pacjenta i formularz zamówienia. */
export type AdresWidoku = {
    street?: unknown;
    houseNumber?: unknown;
    apartmentNumber?: unknown;
    postalCode?: unknown;
    city?: unknown;
};

export type WidokProfiluPacjenta = {
    id?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    phone?: unknown;
    email?: unknown;
    address?: AdresWidoku | string;
};

/** Podpola adresu — allow-lista działa też piętro niżej. */
const POLA_ADRESU = ['street', 'houseNumber', 'apartmentNumber', 'postalCode', 'city'] as const;

/**
 * Adres bywa obiektem (tak oddaje go dziś PMS — zmierzone) albo, w starszych
 * kartotekach, zwykłym napisem. Napis przepuszczamy bez zmian: to nadal adres i żadne
 * z pól wrażliwych nie ma prawa się w nim znaleźć. Obiekt przepisujemy po podpolach.
 */
function widokAdresu(surowy: unknown): AdresWidoku | string | undefined {
    if (typeof surowy === 'string') return surowy;
    if (!surowy || typeof surowy !== 'object' || Array.isArray(surowy)) return undefined;

    const zrodlo = surowy as Record<string, unknown>;
    const wynik: Record<string, unknown> = {};
    for (const pole of POLA_ADRESU) wynik[pole] = zrodlo[pole];
    return wynik as AdresWidoku;
}

/**
 * Buduje widok profilu z surowej kartoteki PMS.
 *
 * Klucze są ZAWSZE obecne (wartością bywa `undefined`) — dzięki temu asercja
 * `Object.keys()` w strażniku jest równością na dokładnym zbiorze, a nie zależy od
 * tego, które pola akurat wypełnił dostawca. Serializacja JSON pomija `undefined`,
 * więc kształt odpowiedzi HTTP zostaje taki jak przed naprawą.
 */
export function widokProfiluPacjenta(surowy: unknown): WidokProfiluPacjenta {
    const d = (surowy && typeof surowy === 'object' ? surowy : {}) as Record<string, unknown>;

    return {
        // 🔴 `id` MUSI zostać: dashboard weba czyta `patient.id`, a `PatientData.id`
        // jest wymagane. Jego wypadnięcie psuje web BEZ błędu kompilacji.
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        email: d.email,
        address: widokAdresu(d.address),
    };
}
