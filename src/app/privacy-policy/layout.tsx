import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | Mikrostomart Dental Clinic',
    description: 'Privacy Policy for Mikrostomart dental clinic. Information about data processing, social media content publishing, TikTok API usage, video processing, and GDPR compliance.',
    keywords: ['privacy policy', 'GDPR', 'data protection', 'TikTok', 'social media', 'dental clinic', 'Mikrostomart'],
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
