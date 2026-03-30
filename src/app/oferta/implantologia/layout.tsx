import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Implanty ${brand.cityShort} - implanty zębów ${brand.cityShort}, implanty cennik ${brand.cityShort}`,
    description: `Profesjonalne zabiegi implantacji w ${brand.cityShort}. Precyzja, cyfrowe planowanie i bezbolesne leczenie w ${brand.name}. Sprawdź cennik i umów się na wizytę.`,
    keywords: `implanty ${brand.cityShort.toLowerCase()}, implanty zębów ${brand.cityShort.toLowerCase()}, implant cennik ${brand.cityShort.toLowerCase()}, implantacja ${brand.cityShort.toLowerCase()}, dentysta implanty ${brand.cityShort.toLowerCase()}`,
};

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

export default function ImplantologiaLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalServiceSchema) }}
            />
            {children}
        </>
    );
}
