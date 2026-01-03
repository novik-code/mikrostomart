import { MetadataRoute } from 'next';
import { articles } from '@/data/articles'; // News
import { articles as kbArticles } from '@/data/knowledgeBaseArticles';
import { products } from '../../data/products.json'; // Direct import JSON? May need assert

const BASE_URL = 'https://mikrostomart.pl';

export default function sitemap(): MetadataRoute.Sitemap {
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
        lastModified: new Date(post.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // Products (Assuming public products are indexable)
    const productRoutes = products
        .filter((p: any) => p.isVisible !== false)
        .map((product: any) => ({
            url: `${BASE_URL}/sklep/${product.id}`, // Detail page exists? Or just shop?
            // Wait, we don't have detail page for product yet in this code base (users add to cart from list).
            // Checking /sklep/page.tsx -> it has ProductModal but not separate route /sklep/[id].
            // So skip products sitemap for now to avoid 404s.
        })).filter(r => false); // Disable for now

    return [...staticRoutes, ...newsRoutes, ...kbRoutes];
}
