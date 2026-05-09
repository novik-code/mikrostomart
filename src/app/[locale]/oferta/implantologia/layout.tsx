import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta/implantologia', PAGE_SEO['/oferta/implantologia']);
}

/**
 * FAQ structured data for implantologia page.
 * This enables rich snippets (expandable FAQ) directly in Google search results.
 */
const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Czy zabieg implantacji jest bezpieczny?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Tak, poprzedzamy go szczegółowym wywiadem i badaniami tomograficznymi. Zabieg planowany jest cyfrowo z użyciem szablonu implantologicznego."
            }
        },
        {
            "@type": "Question",
            "name": "Czy zabieg implantacji jest bolesny?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Nie, wykonywany jest w skutecznym znieczuleniu miejscowym. Dyskomfort po zabiegu jest porównywalny do usunięcia zęba."
            }
        },
        {
            "@type": "Question",
            "name": "Na jak długo starczają implanty zębowe?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Prawidłowo wykonane implanty przy dobrej higienie mogą służyć do końca życia. Skuteczność implantacji to ok. 98%."
            }
        },
        {
            "@type": "Question",
            "name": "Jakie są przeciwwskazania do implantacji?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Nieustabilizowana cukrzyca, ciąża, ciężkie choroby ogólnoustrojowe, wiek poniżej 16 lat. Kluczowa jest ilość kości – jeśli jest jej za mało, wykonujemy zabiegi regeneracyjne."
            }
        },
        {
            "@type": "Question",
            "name": "Ile kosztuje implant zęba w Opolu?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Wszczepienie implantu: 3500 zł, korona na implancie: 3500 zł, materiał kościozastępczy: 500-5500 zł, podniesienie dna zatoki (Sinus Lift): 1500-5000 zł. Ceny orientacyjne."
            }
        }
    ]
};

const medicalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": `Implanty zębów ${brand.cityShort} - ${brand.name}`,
    "about": {
        "@type": "MedicalProcedure",
        "name": "Implantacja zębów",
        "procedureType": "SurgicalProcedure",
        "description": "Zabiegi implantacji z zastosowaniem planowania cyfrowego i szablonów implantologicznych. Minimalnie inwazyjne, precyzyjne i bezbolesne.",
        "howPerformed": "Implant wprowadzany jest na podstawie indywidualnego szablonu zaprojektowanego przy użyciu badania tomograficznego (CBCT). Zabieg trwa ok. 30-40 minut.",
        "preparation": "Szczegółowy wywiad lekarski, badanie tomograficzne, cyfrowe planowanie zabiegu z indywidualnym szablonem.",
        "followup": "Okres osteointegracji 3-6 miesięcy, po czym montowana jest korona ostateczna."
    }
};

const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": brand.appUrl },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": `${brand.appUrl}/oferta` },
        { "@type": "ListItem", "position": 3, "name": "Implantologia" }
    ]
};

export default function ImplantologiaLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalServiceSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            {children}
        </>
    );
}
