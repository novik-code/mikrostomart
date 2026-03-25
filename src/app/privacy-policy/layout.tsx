import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Privacy Policy | DensFlow Demo Dental Clinic',
            description: 'Privacy Policy for DensFlow Demo dental clinic. Information about data processing, social media content publishing, TikTok API usage, video processing, and GDPR compliance.',
        };
    }
    return {
        title: 'Privacy Policy | Mikrostomart Dental Clinic',
        description: 'Privacy Policy for Mikrostomart dental clinic. Information about data processing, social media content publishing, TikTok API usage, video processing, and GDPR compliance.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
