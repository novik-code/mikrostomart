import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

// English-only privacy policy duplicate of /polityka-prywatnosci. To avoid
// near-duplicate content signals only the EN locale is indexed; PL/DE/UA versions
// of /privacy-policy are noindex'd and canonical to /polityka-prywatnosci.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const indexable = locale === 'en';
    return {
        title: `Privacy Policy | ${brand.name} Dental Clinic`,
        description: `Privacy Policy for ${brand.name} dental clinic. Information about data processing, social media content publishing, TikTok API usage, video processing, and GDPR compliance.`,
        alternates: { canonical: indexable ? '/en/privacy-policy' : '/polityka-prywatnosci' },
        robots: indexable ? undefined : { index: false, follow: true },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
