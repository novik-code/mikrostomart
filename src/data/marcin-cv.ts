// CV + publikacje + wystąpienia Marcina Nowosielskiego.
// Single source of truth dla sekcji CvTimeline + PublicationsList na /o-nas.
// Źródło danych: MARCIN_NOWOSIELSKI_BIO_INVENTORY.md (2026-05-10) + PLAN_K3_BRIEF.md.
//
// Wszystkie titleKey/descKey/venueKey wskazują na klucze w namespace `oNasBrand`
// w messages/{pl,en,de,ua}/common.json. Komponenty renderują przez useTranslations.

export interface CvMilestone {
    year: string; // "2007" lub "2007-2013" (zakres) lub "2024+" (continuing)
    titleKey: string;
    descKey: string;
    icon?: string;
}

export interface Publication {
    type: 'book' | 'magazine' | 'conference';
    year: string;
    titleKey: string;
    venueKey: string;
    issueKey?: string;
    url?: string;
}

export interface Lecture {
    type: 'symposium' | 'workshop' | 'keynote' | 'panel';
    year: string;
    titleKey: string;
    venueKey: string;
    location?: string; // "Słowenia" | "Polska"
    url?: string;
}

// Vertical timeline 12 milestones (2007-2013 → 2024+).
// Order: chronologiczny (oldest first), komponent może renderować w obie strony.
export const MARCIN_CV: CvMilestone[] = [
    { year: '2007–2013', titleKey: 'cv.umw.title', descKey: 'cv.umw.desc', icon: '🎓' },
    { year: '2013', titleKey: 'cv.oil.title', descKey: 'cv.oil.desc', icon: '⚕️' },
    { year: '2015', titleKey: 'cv.pteEse.title', descKey: 'cv.pteEse.desc', icon: '🔬' },
    { year: '2016', titleKey: 'cv.mikrostomart.title', descKey: 'cv.mikrostomart.desc', icon: '🏥' },
    { year: '2017', titleKey: 'cv.ptslOralSurgery.title', descKey: 'cv.ptslOralSurgery.desc', icon: '🦷' },
    { year: '2018–2021', titleKey: 'cv.rwth.title', descKey: 'cv.rwth.desc', icon: '✨' },
    { year: '2019', titleKey: 'cv.lahaSlovenia.title', descKey: 'cv.lahaSlovenia.desc', icon: '🎤' },
    { year: '2020–2021', titleKey: 'cv.publications.title', descKey: 'cv.publications.desc', icon: '📰' },
    { year: '2022', titleKey: 'cv.lahaPolandKeynote.title', descKey: 'cv.lahaPolandKeynote.desc', icon: '🇵🇱' },
    { year: '2023', titleKey: 'cv.lahaSlovenia2023.title', descKey: 'cv.lahaSlovenia2023.desc', icon: '🎤' },
    { year: '2024', titleKey: 'cv.czelejBook.title', descKey: 'cv.czelejBook.desc', icon: '📚' },
    { year: '2024+', titleKey: 'cv.pte20.title', descKey: 'cv.pte20.desc', icon: '🏆' },
];

// 6 publikacji: 1 książka + 4 Magazyn Stomatologiczny + 1 LA&HA proceedings.
// Sort by year DESC (najnowsze najpierw — komponent renderuje w tym porządku).
export const MARCIN_PUBLICATIONS: Publication[] = [
    {
        type: 'book',
        year: '2024',
        titleKey: 'pubs.czelej.title',
        venueKey: 'pubs.czelej.venue',
        issueKey: 'pubs.czelej.issue',
        url: 'https://czelej.com.pl/sklep/wlasny-gabinet-poradnik/',
    },
    // 4 publikacje Magazyn Stomatologiczny — wszystkie linkują do profilu autora
    // (https://www.magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html),
    // który agreguje wszystkie artykuły Marcina. Indywidualne URLs per artykuł
    // niedostępne publicznie — author profile jest najlepszą destynacją.
    {
        type: 'magazine',
        year: '2021',
        titleKey: 'pubs.magStomat2021nr5.title',
        venueKey: 'pubs.magStomat.venue',
        issueKey: 'pubs.magStomat2021nr5.issue',
        url: 'https://www.magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html',
    },
    {
        type: 'magazine',
        year: '2021',
        titleKey: 'pubs.magStomat2021nr3.title',
        venueKey: 'pubs.magStomat.venue',
        issueKey: 'pubs.magStomat2021nr3.issue',
        url: 'https://www.magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html',
    },
    {
        type: 'magazine',
        year: '2020',
        titleKey: 'pubs.magStomat2020nr10.title',
        venueKey: 'pubs.magStomat.venue',
        issueKey: 'pubs.magStomat2020nr10.issue',
        url: 'https://www.magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html',
    },
    {
        type: 'magazine',
        year: '2020',
        titleKey: 'pubs.magStomat2020nr3.title',
        venueKey: 'pubs.magStomat.venue',
        issueKey: 'pubs.magStomat2020nr3.issue',
        url: 'https://www.magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html',
    },
    {
        type: 'conference',
        year: '2019',
        titleKey: 'pubs.laha2019.title',
        venueKey: 'pubs.laha2019.venue',
        url: 'https://www.laserandhealthacademy.com/media/uploads/laha/docs/2019/summaries/s31_marques_nowosielski.pdf',
    },
];

// 5 wystąpień: 3× LA&HA Symposium + 2× LA&HA Poland 2022 + 1× PTE 20-lecie.
// Sort by year DESC.
export const MARCIN_LECTURES: Lecture[] = [
    {
        type: 'keynote',
        year: '2024+',
        titleKey: 'lectures.pte20.title',
        venueKey: 'lectures.pte20.venue',
        url: 'https://endodoncja.pl/20-lecie-pte/',
    },
    {
        type: 'symposium',
        year: '2023',
        titleKey: 'lectures.lahaSym2023.title',
        venueKey: 'lectures.lahaSym2023.venue',
        location: 'Słowenia',
    },
    {
        type: 'keynote',
        year: '2022',
        titleKey: 'lectures.lahaPoland2022.title',
        venueKey: 'lectures.lahaPoland2022.venue',
        location: 'Polska',
    },
    {
        type: 'workshop',
        year: '2022',
        titleKey: 'lectures.lahaPolandWorkshop.title',
        venueKey: 'lectures.lahaPolandWorkshop.venue',
        location: 'Polska',
    },
    {
        type: 'symposium',
        year: '2019',
        titleKey: 'lectures.lahaSym2019.title',
        venueKey: 'lectures.lahaSym2019.venue',
        location: 'Słowenia',
    },
];
