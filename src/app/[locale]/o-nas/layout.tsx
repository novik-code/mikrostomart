import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref, hreflangCode } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/o-nas', PAGE_SEO['/o-nas']);
}

// Per-locale Person descriptions for E-E-A-T signal (Google rewards explicit
// author/practitioner entities for medical content). Falls back to PL when locale
// is not present.
const PERSON_DESCRIPTIONS: Record<string, { marcin: string; ela: string; marcinJob: string; elaJob: string }> = {
    pl: {
        marcin: 'Lekarz dentysta, implantolog, mikroskopowy endodonta. Współwłaściciel gabinetu Mikrostomart w Opolu. Specjalizuje się w implantologii, leczeniu kanałowym pod mikroskopem oraz stomatologii estetycznej.',
        ela: 'Higienistka stomatologiczna, współwłaścicielka gabinetu Mikrostomart w Opolu. Specjalizuje się w profesjonalnej higienizacji, profilaktyce i edukacji pacjentów.',
        marcinJob: 'Lekarz dentysta, implantolog',
        elaJob: 'Higienistka stomatologiczna',
    },
    en: {
        marcin: 'Dentist, implantologist and microscopic endodontist. Co-owner of Mikrostomart dental clinic in Opole, Poland. Specialises in implantology, microscopic root canal treatment, and aesthetic dentistry.',
        ela: 'Dental hygienist and co-owner of Mikrostomart dental clinic in Opole, Poland. Specialises in professional hygiene, prevention, and patient education.',
        marcinJob: 'Dentist, Implantologist',
        elaJob: 'Dental Hygienist',
    },
    de: {
        marcin: 'Zahnarzt, Implantologe und mikroskopischer Endodontologe. Mitinhaber der Zahnklinik Mikrostomart in Opole, Polen. Schwerpunkte: Implantologie, mikroskopische Wurzelkanalbehandlung und ästhetische Zahnmedizin.',
        ela: 'Dentalhygienikerin und Mitinhaberin der Zahnklinik Mikrostomart in Opole, Polen. Schwerpunkte: professionelle Mundhygiene, Prävention und Patientenedukation.',
        marcinJob: 'Zahnarzt, Implantologe',
        elaJob: 'Dentalhygienikerin',
    },
    ua: {
        marcin: 'Стоматолог, імплантолог, мікроскопічний ендодонт. Співвласник стоматологічної клініки Mikrostomart в Ополе, Польща. Спеціалізується на імплантології, мікроскопічному ендодонтичному лікуванні та естетичній стоматології.',
        ela: 'Стоматологічний гігієніст, співвласниця клініки Mikrostomart в Ополе, Польща. Спеціалізується на професійній гігієні, профілактиці та едукації пацієнтів.',
        marcinJob: 'Стоматолог, імплантолог',
        elaJob: 'Стоматологічний гігієніст',
    },
};

function buildPersonSchemas(locale: string) {
    const desc = PERSON_DESCRIPTIONS[locale] || PERSON_DESCRIPTIONS.pl;
    const inLanguage = hreflangCode(locale);
    const oNasUrl = locale === 'pl'
        ? `${brand.appUrl}/o-nas`
        : `${brand.appUrl}/${locale}/o-nas`;

    return [
        {
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": `${brand.appUrl}/#marcin-nowosielski`,
            "name": "Marcin Nowosielski",
            "givenName": "Marcin",
            "familyName": "Nowosielski",
            "jobTitle": desc.marcinJob,
            "description": desc.marcin,
            "image": `${brand.appUrl}/marcin-final.webp`,
            "url": oNasUrl,
            "inLanguage": inLanguage,
            "worksFor": { "@id": brand.schemaId },
            "knowsAbout": ["Implantologia", "Endodoncja", "Stomatologia mikroskopowa", "Implantology", "Endodontics", "Microscopic dentistry"],
        },
        {
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": `${brand.appUrl}/#elzbieta-nowosielska`,
            "name": "Elżbieta Nowosielska",
            "givenName": "Elżbieta",
            "familyName": "Nowosielska",
            "jobTitle": desc.elaJob,
            "description": desc.ela,
            "image": `${brand.appUrl}/ela-final.webp`,
            "url": oNasUrl,
            "inLanguage": inLanguage,
            "worksFor": { "@id": brand.schemaId },
            "knowsAbout": ["Higienizacja", "Profilaktyka stomatologiczna", "Dental hygiene", "Prevention"],
        },
    ];
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'o-nas' },
    ]);
    const persons = buildPersonSchemas(locale);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            {persons.map((p) => (
                <script
                    key={p["@id"]}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(p) }}
                />
            ))}
            {children}
        </>
    );
}
