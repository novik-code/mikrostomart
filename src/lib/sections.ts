// ===================== PAGE SECTIONS LIBRARY =====================
// Defines available section types, their metadata, and Supabase CRUD

export type SectionType =
    | 'hero'
    | 'values'
    | 'narrative'
    | 'youtube'
    | 'reviews'
    | 'offer'
    | 'faq'
    | 'team'
    | 'contact'
    | 'gallery'
    | 'cta-banner'
    | 'text-block';

export interface PageSection {
    id: string;          // unique instance id (e.g. 'hero', 'values', 'cta-banner-1')
    type: SectionType;
    visible: boolean;
    order: number;
    config: Record<string, any>;
}

export interface SectionMeta {
    type: SectionType;
    label: string;
    icon: string;
    description: string;
    maxInstances: number; // -1 = unlimited
    defaultConfig: Record<string, any>;
}

// ===================== SECTION CATALOG =====================

export const SECTION_CATALOG: SectionMeta[] = [
    {
        type: 'hero',
        label: 'Sekcja Hero',
        icon: '🏠',
        description: 'Główny banner z tytułem, opisem i przyciskiem CTA',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'values',
        label: 'Wartości (3 karty)',
        icon: '💎',
        description: 'Trzy karty z wartościami gabinetu (precyzja, estetyka, komfort)',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'narrative',
        label: 'Metamorfozy',
        icon: '✨',
        description: 'Sekcja z tekstem i suwakiem przed/po',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'youtube',
        label: 'Filmy YouTube',
        icon: '🎬',
        description: 'Kanał YouTube z najnowszymi filmami',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'reviews',
        label: 'Opinie Google',
        icon: '⭐',
        description: 'Karuzela opinii z Google Maps',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'offer',
        label: 'Oferta / Usługi',
        icon: '🦷',
        description: 'Karuzela z ofertą usług',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'faq',
        label: 'FAQ',
        icon: '❓',
        description: 'Najczęściej zadawane pytania (accordion)',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'team',
        label: 'Zespół',
        icon: '👥',
        description: 'Karty zespołu lekarzy ze zdjęciami',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'contact',
        label: 'Kontakt',
        icon: '📞',
        description: 'Formularz kontaktowy z mapą',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'gallery',
        label: 'Galeria',
        icon: '🖼️',
        description: 'Galeria zdjęć gabinetu',
        maxInstances: 1,
        defaultConfig: {},
    },
    {
        type: 'cta-banner',
        label: 'Banner CTA',
        icon: '📢',
        description: 'Wezwanie do akcji — pełna szerokość',
        maxInstances: 3,
        defaultConfig: {
            title: 'Umów wizytę',
            subtitle: 'Zadbaj o swój uśmiech już dziś',
            buttonText: 'Umów się',
            buttonLink: '/rezerwacja',
        },
    },
    {
        type: 'text-block',
        label: 'Blok tekstowy',
        icon: '📝',
        description: 'Wolny tekst / HTML',
        maxInstances: 5,
        defaultConfig: {
            content: '',
        },
    },
];

// ===================== DEFAULTS =====================

export const DEFAULT_SECTIONS: PageSection[] = [
    { id: 'hero', type: 'hero', visible: true, order: 0, config: {} },
    { id: 'values', type: 'values', visible: true, order: 1, config: {} },
    { id: 'narrative', type: 'narrative', visible: true, order: 2, config: {} },
    { id: 'youtube', type: 'youtube', visible: true, order: 3, config: {} },
    { id: 'reviews', type: 'reviews', visible: true, order: 4, config: {} },
];

export function getSectionMeta(type: SectionType): SectionMeta | undefined {
    return SECTION_CATALOG.find(s => s.type === type);
}
