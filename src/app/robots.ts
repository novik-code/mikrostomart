import { MetadataRoute } from 'next';
import { brand } from '@/lib/brandConfig';
import { isDemoMode } from '@/lib/demoMode';

// S5-1 (2026-05-15): private paths must be blocked across ALL locale prefixes.
// Previously only PL (default, no prefix) was disallowed, leaving /en/strefa-pacjenta/,
// /de/admin/, /ua/ekarta/ etc. crawlable — Googlebot was indexing localized auth pages.
const PRIVATE_PATHS = [
    '/api/',
    '/admin/',
    '/pracownik/',
    '/strefa-pacjenta/',
    '/ekarta/',
    '/mapa-bolu/editor',
    '/auth/',
    '/zgody/',
    '/qr-display',
    '/s/',
    '/opieka/',
    '/wizyta/', // S5-2 will add noindex metadata; preemptively block crawl here
];

const LOCALE_PREFIXES = ['', '/en', '/de', '/ua'];

export default function robots(): MetadataRoute.Robots {
    if (isDemoMode) {
        return {
            rules: { userAgent: '*', disallow: '/' },
        };
    }

    const disallow = LOCALE_PREFIXES.flatMap((prefix) =>
        PRIVATE_PATHS.map((path) => `${prefix}${path}`)
    );

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow,
        },
        sitemap: `${brand.appUrl}/sitemap.xml`,
    };
}
