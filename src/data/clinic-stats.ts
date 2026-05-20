// Statystyki kliniki Mikrostomart — dane do <TrustStats /> i innych miejsc.
//
// Source of truth: ręczny eksport z Prodentis500 (`zabiegi` table) przez Marcina,
// dostarczony jako STATYSTYKI_*.md 2026-05-12. Pliki źródłowe na pulpicie Marcina.
//
// Refresh procedure (manual, ~5 min):
//   1. Marcin generuje świeży eksport z Prodentis500
//   2. Aktualizuje wartości poniżej + bumpuje `lastUpdated`
//   3. Commit + push (Vercel auto-deploy)
//
// TODO: zastąpić realtime API endpoint `/api/clinic-stats` backed by Prodentis
// (osobny sprint po K-2, gdy Marcin zatwierdzi że liczby są na publicznej stronie OK).

export const CLINIC_STATS = {
    lastUpdated: '2026-05-12',
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
        implants: 1150,
        rootCanals: 2282,
        crowns: 1971,
        extractions: 2787,
        sinusLift: 132,
        augmentations: 80,
        softTissueGrafts: 127,
        fillings: 25061,
        patients: 6191,
        visits: 45667,
        procedures: 139708,
        doctors: 32,
    },
} as const;

export type ClinicStats = typeof CLINIC_STATS;
