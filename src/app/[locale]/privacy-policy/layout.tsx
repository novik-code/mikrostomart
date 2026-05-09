import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Privacy Policy | ${brand.name} Dental Clinic`,
        description: `Privacy Policy for ${brand.name} dental clinic. Information about data processing, social media content publishing, TikTok API usage, video processing, and GDPR compliance.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
