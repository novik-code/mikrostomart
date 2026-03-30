import PainMapInteractive from './PainMapInteractive';
import { brandI18nParams } from '@/lib/brandConfig';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('mapaBoluUI');
    return {
        title: t('metaTitle', brandI18nParams()),
        description: t('metaDescription'),
    };
}

export default function PainMapPage() {
    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center">
            {/* Full-bleed map with no padding — immersive experience */}
            <PainMapInteractive />
        </main>
    );
}
