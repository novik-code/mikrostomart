import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Leczenie Kanałowe ${brand.cityShort} - Endodoncja Mikroskopowa`,
    description: `Leczenie kanałowe pod mikroskopem w ${brand.cityShort}. Bezbolesne, precyzyjne, często na jednej wizycie. Gabinet ${brand.name} — powiększenie 25x, komputerowe znieczulenie.`,
    keywords: `leczenie kanałowe ${brand.cityShort.toLowerCase()}, endodoncja ${brand.cityShort.toLowerCase()}, leczenie kanałowe pod mikroskopem, root canal ${brand.cityShort.toLowerCase()}, dentysta kanałowe ${brand.cityShort.toLowerCase()}`,
};

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Czy leczenie kanałowe boli?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Współczesne leczenie kanałowe jest całkowicie bezbolesne. Stosujemy znieczulenie komputerowe (The Wand/SleeperOne), które eliminuje ból już na etapie podawania."
            }
        },
        {
            "@type": "Question",
            "name": "Dlaczego leczenie kanałowe pod mikroskopem jest lepsze?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mikroskop (powiększenie do 25x) pozwala lekarzowi znaleźć wszystkie kanały (nawet te dodatkowe), precyzyjnie je oczyścić i wypełnić. Drastycznie zwiększa to szansę na uratowanie zęba."
            }
        },
        {
            "@type": "Question",
            "name": "Ile wizyt zajmuje leczenie kanałowe?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "W Mikrostomart staramy się przeprowadzać leczenie kanałowe na jednej wizycie. Dzięki pracy pod mikroskopem i zaawansowanym narzędziom maszynowym jesteśmy w stanie wykonać cały zabieg w ciągu 90-120 minut."
            }
        },
        {
            "@type": "Question",
            "name": "Co to jest powtórne leczenie kanałowe (Re-Endo)?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "To zabieg naprawczy, gdy pierwotne leczenie okazało się nieskuteczne. Polega na usunięciu starego materiału, odnalezieniu pominiętych kanałów i ponownym, sterylnym ich wypełnieniu."
            }
        }
    ]
};

const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": brand.appUrl },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": `${brand.appUrl}/oferta` },
        { "@type": "ListItem", "position": 3, "name": "Leczenie Kanałowe" }
    ]
};

const medicalProcedureSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    "name": `Leczenie kanałowe pod mikroskopem ${brand.cityShort}`,
    "procedureType": "https://schema.org/TherapeuticProcedure",
    "bodyLocation": "Tooth",
    "description": "Endodoncja mikroskopowa: precyzyjne usunięcie martwej tkanki, dezynfekcja i szczelne wypełnienie kanałów zęba pod kontrolą mikroskopu zabiegowego (powiększenie do 25x).",
    "howPerformed": "Zabieg w komputerowym znieczuleniu (The Wand / SleeperOne), z izolacją koferdamem. Pomiary endometryczne, opracowanie kanałów narzędziami rotacyjnymi, dezynfekcja i wypełnienie gutaperką pod mikroskopem.",
    "preparation": "Diagnostyka radiologiczna (RTG, CBCT w skomplikowanych przypadkach). Wywiad medyczny.",
    "followup": "Kontrola po 7-14 dniach. Odbudowa korony zęba (wypełnienie lub korona protetyczna) w ciągu kolejnej wizyty.",
    "performer": { "@type": "MedicalOrganization", "name": brand.name, "url": brand.appUrl }
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalProcedureSchema) }} />
            {children}
        </>
    );
}
