import { MetadataRoute } from 'next';
import { articles } from '@/data/articles'; // News
import { supabase } from '@/lib/supabaseClient';
import { demoSanitize } from '@/lib/brandConfig';

const BASE_URL = 'https://mikrostomart.pl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { data: kbArticlesRaw } = await supabase.from('articles').select('slug, published_date');
    const kbArticles = kbArticlesRaw || [];

    // ── Main pages (high priority) ──
    const mainRoutes = [
        '',              // Homepage
        '/o-nas',
        '/zespol',
        '/oferta',
        '/oferta/implantologia',
        '/oferta/leczenie-kanalowe',
        '/oferta/stomatologia-estetyczna',
        '/oferta/ortodoncja',
        '/oferta/chirurgia',
        '/oferta/protetyka',
        '/cennik',
        '/kontakt',
        '/rezerwacja',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.9,
    }));

    // ── Content & features (medium priority) ──
    const contentRoutes = [
        '/aktualnosci',
        '/baza-wiedzy',
        '/metamorfozy',
        '/sklep',
        '/faq',
        '/nowosielski',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    // ── Interactive tools (medium priority) ──
    const toolRoutes = [
        '/mapa-bolu',
        '/kalkulator-leczenia',
        '/porownywarka',
        '/selfie',
        '/symulator',
        '/aplikacja',
        '/zadatek',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // ── Legal pages (low priority) ──
    const legalRoutes = [
        '/regulamin',
        '/polityka-cookies',
        '/polityka-prywatnosci',
        '/rodo',
        '/privacy-policy',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
    }));

    // ── Dynamic: news articles ──
    const newsRoutes = articles.map((post) => ({
        url: `${BASE_URL}/aktualnosci/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // ── Dynamic: knowledge base articles ──
    const kbRoutes = kbArticles.map((post) => ({
        url: `${BASE_URL}/baza-wiedzy/${post.slug}`,
        lastModified: new Date(post.published_date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    return [...mainRoutes, ...contentRoutes, ...toolRoutes, ...legalRoutes, ...newsRoutes, ...kbRoutes];
}
