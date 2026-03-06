import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Leczenie Kanałowe Opole - Endodoncja Mikroskopowa',
    description: 'Leczenie kanałowe pod mikroskopem w Opolu. Bezbolesne, precyzyjne, często na jednej wizycie. Gabinet Mikrostomart — powiększenie 25x, komputerowe znieczulenie.',
    keywords: 'leczenie kanałowe opole, endodoncja opole, leczenie kanałowe pod mikroskopem, root canal opole, dentysta kanałowe opole',
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
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": "https://mikrostomart.pl" },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": "https://mikrostomart.pl/oferta" },
        { "@type": "ListItem", "position": 3, "name": "Leczenie Kanałowe" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            {children}
        </>
    );
}
