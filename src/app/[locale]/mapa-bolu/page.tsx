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

export default async function PainMapPage() {
    const t = await getTranslations('mapaBoluUI');
    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center">
            {/* 2026-08-20 (audyt SEO 16.08, "H1: Missing"): strona nie miala zadnego H1 —
                jedyny naglowek to H2 w nakladce intro, ktora sie zamyka. Widok jest
                celowo pelnoekranowy i nie ma w nim miejsca na naglowek, wiec H1 jest
                dostepny dla czytnikow ekranu i robotow, a niewidoczny wizualnie. */}
            <h1 className="sr-only">{t('pageH1')}</h1>
            {/* Full-bleed map with no padding — immersive experience */}
            <PainMapInteractive />
        </main>
    );
}
