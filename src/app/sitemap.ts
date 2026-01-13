import { MetadataRoute } from 'next';
import { articles } from '@/data/articles'; // News
import { supabase } from '@/lib/supabaseClient';

const BASE_URL = 'https://mikrostomart.pl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { data: kbArticlesRaw } = await supabase.from('articles').select('slug, published_date');
    const kbArticles = kbArticlesRaw || [];

    const staticRoutes = [
        '',
        '/zespol',
        '/metamorfozy',
        '/oferta',
        '/cennik',
        '/kontakt',
        '/sklep',
        '/aktualnosci',
        '/baza-wiedzy',
        '/faq',
        '/rezerwacja',
        '/regulamin',
        '/polityka-cookies'
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    const newsRoutes = articles.map((post) => ({
        url: `${BASE_URL}/aktualnosci/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    const kbRoutes = kbArticles.map((post) => ({
        url: `${BASE_URL}/baza-wiedzy/${post.slug}`,
        lastModified: new Date(post.published_date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    return [...staticRoutes, ...newsRoutes, ...kbRoutes];
}
