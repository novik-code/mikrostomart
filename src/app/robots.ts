import { MetadataRoute } from 'next';

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
        sitemap: 'https://mikrostomart.pl/sitemap.xml',
    };
}
