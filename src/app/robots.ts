import { MetadataRoute } from 'next';
import { brand } from '@/lib/brandConfig';
import { isDemoMode } from '@/lib/demoMode';

export default function robots(): MetadataRoute.Robots {
    if (isDemoMode) {
        return {
            rules: { userAgent: '*', disallow: '/' },
        };
    }

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
                '/auth/',
                '/zgody/',
                '/qr-display',
                '/s/',
                '/opieka/',
            ],
        },
        sitemap: `${brand.appUrl}/sitemap.xml`,
    };
}
