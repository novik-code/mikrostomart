import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Stomatologia Estetyczna ${brand.cityShort} - Licówki, Wybielanie, Bonding`,
    description: `Stomatologia estetyczna w ${brand.cityShort}. Licówki porcelanowe, wybielanie zębów, bonding kompozytowy. Piękny uśmiech w ${brand.name} — gabinet stomatologiczny ${brand.cityShort}.`,
    keywords: `stomatologia estetyczna ${brand.cityShort.toLowerCase()}, licówki ${brand.cityShort.toLowerCase()}, wybielanie zębów ${brand.cityShort.toLowerCase()}, bonding ${brand.cityShort.toLowerCase()}, hollywood smile ${brand.cityShort.toLowerCase()}`,
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
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": brand.appUrl },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": `${brand.appUrl}/oferta` },
        { "@type": "ListItem", "position": 3, "name": "Stomatologia Estetyczna" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />{children}</>);
}
