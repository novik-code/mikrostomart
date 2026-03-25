import type { PageSection } from './sections';

// Per-template section ordering — each template has a completely different
// set of visible sections, in a different order, with different hero layouts.
// Referenced by /api/sections when no custom sections saved in DB.

export const TEMPLATE_SECTIONS: Record<string, PageSection[]> = {
    // Default (mikrostomart/gold) — original layout
    'default-gold': [
        { id: 'hero', type: 'hero', visible: true, order: 0, config: {} },
        { id: 'values', type: 'values', visible: true, order: 1, config: {} },
        { id: 'narrative', type: 'narrative', visible: true, order: 2, config: {} },
        { id: 'youtube', type: 'youtube', visible: true, order: 3, config: {} },
        { id: 'reviews', type: 'reviews', visible: true, order: 4, config: {} },
    ],

    // DensFlow Light (LePerle-inspired) — boutique minimal
    // Split hero (text left, visual right), team focus, reviews, contact — that's it
    'densflow-light': [
        { id: 'hero', type: 'hero', visible: true, order: 0, config: { heroLayout: 'split-right' } },
        { id: 'team', type: 'team', visible: true, order: 1, config: {} },
        { id: 'narrative', type: 'narrative', visible: true, order: 2, config: {} },
        { id: 'reviews', type: 'reviews', visible: true, order: 3, config: {} },
        { id: 'contact', type: 'contact', visible: true, order: 4, config: {} },
    ],

    // Dental Luxe (NawrockiClinic-inspired) — full cinematic luxury
    // Fullscreen video hero, then everything: offer, metamorfozy, youtube, gallery, reviews, FAQ, contact
    'dental-luxe': [
        { id: 'hero', type: 'hero', visible: true, order: 0, config: { heroLayout: 'fullscreen-video' } },
        { id: 'offer', type: 'offer', visible: true, order: 1, config: {} },
        { id: 'narrative', type: 'narrative', visible: true, order: 2, config: {} },
        { id: 'youtube', type: 'youtube', visible: true, order: 3, config: {} },
        { id: 'gallery', type: 'gallery', visible: true, order: 4, config: {} },
        { id: 'reviews', type: 'reviews', visible: true, order: 5, config: {} },
        { id: 'faq', type: 'faq', visible: true, order: 6, config: {} },
        { id: 'cta-banner-1', type: 'cta-banner', visible: true, order: 7, config: { title: 'Zarezerwuj wizytę', subtitle: 'Ekskluzywna opieka stomatologiczna', buttonText: 'Umów konsultację' } },
        { id: 'contact', type: 'contact', visible: true, order: 8, config: {} },
    ],

    // Fresh Smile (AmbasadaUsmiechu-inspired) — community, educational
    // Compact hero, services focus, values, FAQ, blog/knowledge, reviews
    'fresh-smile': [
        { id: 'hero', type: 'hero', visible: true, order: 0, config: { heroLayout: 'centered-compact' } },
        { id: 'offer', type: 'offer', visible: true, order: 1, config: {} },
        { id: 'values', type: 'values', visible: true, order: 2, config: {} },
        { id: 'faq', type: 'faq', visible: true, order: 3, config: {} },
        { id: 'reviews', type: 'reviews', visible: true, order: 4, config: {} },
        { id: 'cta-banner-1', type: 'cta-banner', visible: true, order: 5, config: { title: 'Nie zwlekaj!', subtitle: 'Zadzwoń i umów się na wizytę', buttonText: 'Zadzwoń teraz' } },
        { id: 'contact', type: 'contact', visible: true, order: 6, config: {} },
    ],

    // Nordic Dental (OneandonlyClinic-inspired) — butique elegance, portfolio
    // Split-left hero (visual left, text right), metamorfozy, services, reviews, contact
    'nordic-dental': [
        { id: 'hero', type: 'hero', visible: true, order: 0, config: { heroLayout: 'split-left' } },
        { id: 'narrative', type: 'narrative', visible: true, order: 1, config: {} },
        { id: 'offer', type: 'offer', visible: true, order: 2, config: {} },
        { id: 'team', type: 'team', visible: true, order: 3, config: {} },
        { id: 'reviews', type: 'reviews', visible: true, order: 4, config: {} },
        { id: 'contact', type: 'contact', visible: true, order: 5, config: {} },
    ],

    // Warm Care (MalottkiClinic-inspired) — warm, content-rich
    // Standard centered hero, then full content: values, metamorfozy, offer, reviews, FAQ, contact
    'warm-care': [
        { id: 'hero', type: 'hero', visible: true, order: 0, config: { heroLayout: 'centered' } },
        { id: 'values', type: 'values', visible: true, order: 1, config: {} },
        { id: 'narrative', type: 'narrative', visible: true, order: 2, config: {} },
        { id: 'offer', type: 'offer', visible: true, order: 3, config: {} },
        { id: 'reviews', type: 'reviews', visible: true, order: 4, config: {} },
        { id: 'faq', type: 'faq', visible: true, order: 5, config: {} },
        { id: 'gallery', type: 'gallery', visible: true, order: 6, config: {} },
        { id: 'contact', type: 'contact', visible: true, order: 7, config: {} },
    ],
};
