import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'FAQ - Najczęstsze Pytania',
    description: 'Najczęściej zadawane pytania o leczenie stomatologiczne w gabinecie Mikrostomart w Opolu. Odpowiedzi na pytania o implanty, leczenie kanałowe, licówki, ortodoncję i więcej.',
    keywords: 'faq dentysta opole, pytania stomatologia, implanty pytania, leczenie kanałowe faq, licówki pytania, ortodoncja faq',
};

/**
 * FAQ structured data with top questions from all categories.
 * Google recommends max ~10 FAQ items for rich snippets visibility.
 * Selected the most searched dental questions.
 */
const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Czy leczenie kanałowe boli?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Współczesne leczenie kanałowe jest całkowicie bezbolesne. Stosujemy znieczulenie komputerowe (The Wand/SleeperOne), które eliminuje ból już na etapie podawania. Pacjenci często zasypiają w trakcie zabiegu."
            }
        },
        {
            "@type": "Question",
            "name": "Dlaczego leczenie pod mikroskopem jest lepsze?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mikroskop (powiększenie do 25x) pozwala lekarzowi znaleźć wszystkie kanały (nawet te dodatkowe), precyzyjnie je oczyścić i wypełnić. Drastycznie zwiększa to szansę na uratowanie zęba, który w metodzie tradycyjnej mógłby zostać usunięty."
            }
        },
        {
            "@type": "Question",
            "name": "Czy implanty zębowe są dla każdego?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Większość dorosłych pacjentów może mieć implanty. Przeciwwskazaniem mogą być niektóre nieustabilizowane choroby ogólnoustrojowe. Kluczowa jest ilość kości – jeśli jest jej za mało, wykonujemy zabiegi regeneracyjne."
            }
        },
        {
            "@type": "Question",
            "name": "Jak długo trwa zabieg implantacji i gojenie?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Samo wprowadzenie implantu trwa zazwyczaj 30-40 minut i jest bezbolesne. Proces zrastania z kością (osteointegracja) trwa od 3 do 6 miesięcy, po czym montuje się koronę ostateczną."
            }
        },
        {
            "@type": "Question",
            "name": "Czym są licówki porcelanowe?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Licówki to cieniutkie płatki (porcelanowe lub kompozytowe) naklejane na lico zęba. Korygują kształt, kolor i drobne nierówności. Umożliwiają osiągnięcie efektu 'Hollywood Smile' bez zakładania aparatu, jeśli wada jest niewielka."
            }
        },
        {
            "@type": "Question",
            "name": "Czy wybielanie zębów niszczy szkliwo?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Nie, profesjonalne wybielanie przeprowadzone w gabinecie pod kontrolą higienistki jest bezpieczne. Stosujemy nowoczesne preparaty, które nie demineralizują szkliwa, a jedynie utleniają przebarwienia w jego strukturze."
            }
        },
        {
            "@type": "Question",
            "name": "Jak działają nakładki ortodontyczne Clear Correct?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "To zestaw przezroczystych szyn, które wymieniasz co 1-2 tygodnie. Każda kolejna nakładka delikatnie przesuwa zęby na właściwą pozycję. Są wyjmowane do jedzenia i mycia, co zapewnia higienę i komfort."
            }
        },
        {
            "@type": "Question",
            "name": "Kiedy pierwsza wizyta z dzieckiem u dentysty?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Zapraszamy na pierwszą wizytę adaptacyjną już w wieku 2-3 lat. To wizyta w formie zabawy, bez leczenia, która buduje zaufanie małego pacjenta do dentysty."
            }
        },
        {
            "@type": "Question",
            "name": "Jakie są formy płatności w gabinecie?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Akceptujemy płatności gotówką, kartą płatniczą oraz BLIK-iem. Istnieje również możliwość rozłożenia płatności na raty w systemie MediRaty."
            }
        },
        {
            "@type": "Question",
            "name": "Jak dbacie o sterylność w gabinecie?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Używamy autoklawu najwyższej klasy medycznej (Klasa B). Wszystkie narzędzia są pakowane w sterylne pakiety otwierane przy pacjencie. Końcówki stomatologiczne są oliwione i sterylizowane po każdym pacjencie."
            }
        }
    ]
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            {children}
        </>
    );
}
