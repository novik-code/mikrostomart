import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Stomatologia Estetyczna Opole - Licówki, Wybielanie, Bonding',
    description: 'Stomatologia estetyczna w Opolu. Licówki porcelanowe, wybielanie zębów, bonding kompozytowy. Piękny uśmiech w Mikrostomart — gabinet stomatologiczny Opole.',
    keywords: 'stomatologia estetyczna opole, licówki opole, wybielanie zębów opole, bonding opole, hollywood smile opole',
};

const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": [
        { "@type": "Question", "name": "Czym są licówki porcelanowe?", "acceptedAnswer": { "@type": "Answer", "text": "Licówki to cieniutkie płatki porcelanowe naklejane na lico zęba. Korygują kształt, kolor i drobne nierówności. Umożliwiają osiągnięcie efektu Hollywood Smile bez zakładania aparatu." } },
        { "@type": "Question", "name": "Czy wybielanie zębów niszczy szkliwo?", "acceptedAnswer": { "@type": "Answer", "text": "Nie, profesjonalne wybielanie przeprowadzone w gabinecie jest bezpieczne. Stosujemy nowoczesne preparaty, które nie demineralizują szkliwa, a jedynie utleniają przebarwienia." } },
        { "@type": "Question", "name": "Jak długo utrzymuje się efekt wybielania?", "acceptedAnswer": { "@type": "Answer", "text": "Efekt zazwyczaj utrzymuje się od roku do 3 lat. Zależy głównie od diety (kawa, wino) i nawyków (palenie). Regularna higienizacja pomaga podtrzymać efekt bieli." } },
        { "@type": "Question", "name": "Co to jest Bonding?", "acceptedAnswer": { "@type": "Answer", "text": "Bonding to nieinwazyjna metoda poprawy estetyki zęba za pomocą żywicy kompozytowej. Wykonujemy go na jednej wizycie, bez szlifowania zębów. Idealny do zamknięcia diastemy." } }
    ]
};

const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": "https://mikrostomart.pl" },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": "https://mikrostomart.pl/oferta" },
        { "@type": "ListItem", "position": 3, "name": "Stomatologia Estetyczna" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />{children}</>);
}
