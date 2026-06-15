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
// realne liczby (nigdy 0). Pozostałe pola = snapshot 2026-05-12.

export const CLINIC_STATS = {
    lastUpdated: '2026-06-14',
    foundedYear: 2016,
    yearsActive: 10, // computed: currentYear - foundedYear

    // dr Marcin Nowosielski osobiście (Prodentis ID 0100000001)
    marcin: {
        implants: 1085,
        rootCanals: 1861,
        rootCanalsReEndo: 42,
        crowns: 1337,
        extractions: 2187,
        sinusLift: 131,
        augmentations: 76,
        softTissueGrafts: 196,
        apicalResections: 38,
        fillings: 10468,
        patients: 4295,
        visits: 19038,
        procedures: 56656,
    },

    // Cały gabinet (wszyscy lekarze)
    clinic: {
        implants: 1288,
        rootCanals: 2304,
        crowns: 1971,
        extractions: 2787,
        sinusLift: 132,
        augmentations: 80,
        softTissueGrafts: 127,
        fillings: 25061,
        patients: 6247,
        visits: 45667,
        procedures: 139708,
        doctors: 32,
    },
} as const;

export type ClinicStats = typeof CLINIC_STATS;
