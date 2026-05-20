// Akredytacje i działalność naukowa Marcina Nowosielskiego — data file dla
// landing pages /akredytacje/[slug] + sekcji TrustStats pills (link internal).
//
// Każdy entry:
// - slug: URL-friendly identifier
// - label: krótka nazwa (na pillsy w TrustStats + breadcrumb)
// - fullName: pełna nazwa towarzystwa/uczelni (per locale w messages)
// - externalUrl: original page (gdzie istnieje)
// - webarchiveUrl: Wayback Machine snapshot (zawsze aktualne, mniej awaryjne)
//
// Strony per akredytacja czytają i18n namespace `akredytacje.<slug>` z
// 4 sekcjami: hero, meaning ("Co to znaczy"), marcinRole, source.

export interface AkredytacjaEntry {
    slug: string;
    label: string; // krótka nazwa na pill/badge
    externalUrl: string | null;
    webarchiveUrl: string;
    schemaType: 'EducationalOrganization' | 'MedicalOrganization' | 'Organization';
    foundedYear?: number;
    marcinSince?: number; // od kiedy Marcin jest członkiem/absolwentem
}

export const AKREDYTACJE: AkredytacjaEntry[] = [
    {
        slug: 'pte',
        label: 'PTE',
        externalUrl: 'https://endodoncja.pl/',
        // Specific snapshot: PTE 20-lecie page where Marcin is a lecturer
        webarchiveUrl: 'https://web.archive.org/web/2026/https://endodoncja.pl/20-lecie-pte/',
        schemaType: 'MedicalOrganization',
        foundedYear: 2004,
        marcinSince: 2015,
    },
    {
        slug: 'ese',
        label: 'ESE',
        externalUrl: 'https://www.e-s-e.eu/',
        webarchiveUrl: 'https://web.archive.org/web/2026/https://www.e-s-e.eu/',
        schemaType: 'MedicalOrganization',
        foundedYear: 1983,
        marcinSince: 2015,
    },
    {
        slug: 'ptsl',
        label: 'PTSL',
        externalUrl: null, // brak oficjalnej strony PTSL na 2026-05-20
        webarchiveUrl: 'https://web.archive.org/web/2026/https://ptsl.com.pl/',
        schemaType: 'MedicalOrganization',
        foundedYear: 2007,
        marcinSince: 2017,
    },
    {
        slug: 'rwth-aachen',
        label: 'RWTH Aachen',
        externalUrl: 'https://www.aalz.de/en/',
        webarchiveUrl: 'https://web.archive.org/web/2026/https://www.aalz.de/en/',
        schemaType: 'EducationalOrganization',
        foundedYear: 2004,
        marcinSince: 2018, // start studiów; 2021 = M.Sc.
    },
    {
        slug: 'la-ha',
        label: 'LA&HA',
        externalUrl: 'https://www.laserandhealthacademy.com/',
        webarchiveUrl: 'https://web.archive.org/web/2026/https://www.laserandhealthacademy.com/',
        schemaType: 'EducationalOrganization',
        foundedYear: 2007,
        marcinSince: 2019, // pierwszy wykład LA&HA Symposium Słowenia
    },
];

export function getAkredytacjaBySlug(slug: string): AkredytacjaEntry | undefined {
    return AKREDYTACJE.find((a) => a.slug === slug);
}
