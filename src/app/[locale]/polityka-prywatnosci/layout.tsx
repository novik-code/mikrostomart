import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Polityka Prywatności | ${brand.name} ${brand.cityShort}`,
        description: `Polityka prywatności gabinetu stomatologicznego ${brand.name} w ${brand.cityShort} — jak przetwarzamy Twoje dane osobowe.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
