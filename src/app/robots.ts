import { MetadataRoute } from 'next';
import { demoSanitize, brand } from '@/lib/brandConfig';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/admin/',
                '/pracownik/',
                '/strefa-pacjenta/',
                '/ekarta/',
                '/mapa-bolu/editor',
            ],
        },
        sitemap: `${brand.appUrl}/sitemap.xml`,
    };
}
