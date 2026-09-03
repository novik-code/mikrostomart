// Statystyki kliniki Mikrostomart — FALLBACK dla /api/clinic-stats.
//
// K-2c (2026-05-20): real-time data z Prodentis API obsługiwane przez
// `/api/clinic-stats` route handler (Prodentis v10.2 endpointy publiczne,
// no API key, dane marketingowe agregowane). Ten plik = fallback gdy
// Prodentis chwilowo down lub w demo mode.
//
// Refresh procedure (manual snapshot, jeśli liczby się rozjeżdżają):
//   1. Marcin generuje świeży eksport z Prodentis500
//   2. Aktualizuje wartości poniżej + bumpuje `lastUpdated`
//   3. Commit + push (Vercel auto-deploy)
//
// Source: STATYSTYKI_*.md z pulpitu Marcina (eksport Prodentis500 z dn. 2026-05-12).
// 2026-06-14: odświeżono 3 wyświetlane wartości clinic-wide (implants/rootCanals/
// patients) do bieżących live z audytu GEO — fallback ma trzymać OSTATNIE ZNANE
// realne liczby (nigdy 0).
// 2026-09-03: pełne odświeżenie z ŻYWEGO odczytu `/api/clinic-stats` (source=live,
// lastUpdated 2026-09-03T08:38:10Z). Snapshot z 06.14 rozjechał się z rzeczywistością
// o +90 implantów, +51 leczeń kanałowych i +170 pacjentów — a przez usterkę licznika
// (patrz TrustStats.tsx, FIX 2026-09-03) to WŁAŚNIE te przeterminowane liczby widział
// każdy odwiedzający, mimo zielonej plakietki „LIVE". ⚪ Pole `visits` zostaje ze
// snapshotu 2026-05-12 — API procedure-stats go nie oddaje i nic go nie wyświetla.
// 🪤 Dwie wartości SPADŁY wobec snapshotu z 05.12 (`marcin.fillings` 10468 → 10083,
// `marcin.softTissueGrafts` 196 → 156). To nie jest ubytek zabiegów, tylko inne
// KATEGORYZOWANIE po stronie API niż w ręcznym eksporcie z Prodentis500. Żadne z tych
// pól nie jest nigdzie wyświetlane — wyświetlane są wyłącznie `clinic.implants`,
// `clinic.rootCanals` i `clinic.patients` (karty 1-3 w TrustStats).

export const CLINIC_STATS = {
    lastUpdated: '2026-09-03',
    foundedYear: 2016,
    yearsActive: 10, // computed: currentYear - foundedYear

    // lek. dent. Marcin Nowosielski M.Sc. osobiście (Prodentis ID 0100000001)
    marcin: {
        implants: 1251,
        rootCanals: 1862,
        rootCanalsReEndo: 42,
        crowns: 1398,
        extractions: 2268,
        sinusLift: 144,
        augmentations: 84,
        softTissueGrafts: 156,
        apicalResections: 38,
        fillings: 10083,
        patients: 4405,
        visits: 19038,
        procedures: 58224,
    },

    // Cały gabinet (wszyscy lekarze)
    clinic: {
        implants: 1378,
        rootCanals: 2355,
        crowns: 2084,
        extractions: 2886,
        sinusLift: 145,
        augmentations: 88,
        softTissueGrafts: 157,
        fillings: 25988,
        patients: 6417,
        visits: 45667,
        procedures: 147612,
        doctors: 33,
    },
} as const;

export type ClinicStats = typeof CLINIC_STATS;
