import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Ortodoncja ${brand.cityShort} - Nakładki Clear Correct, Prostowanie Zębów`,
    description: `Ortodoncja w ${brand.cityShort}. Przeźroczyste nakładki Clear Correct — prostowanie zębów bez aparatu metalowego. Symulacja 3D efektu. Gabinet ${brand.name}.`,
    keywords: `ortodoncja ${brand.cityShort.toLowerCase()}, prostowanie zębów ${brand.cityShort.toLowerCase()}, nakładki ortodontyczne ${brand.cityShort.toLowerCase()}, clear correct ${brand.cityShort.toLowerCase()}, aparat ortodontyczny ${brand.cityShort.toLowerCase()}`,
};

const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": [
        { "@type": "Question", "name": "Jak działają nakładki Clear Correct?", "acceptedAnswer": { "@type": "Answer", "text": "To zestaw przezroczystych szyn, które wymieniasz co 1-2 tygodnie. Każda kolejna nakładka delikatnie przesuwa zęby na właściwą pozycję. Są wyjmowane do jedzenia i mycia." } },
        { "@type": "Question", "name": "Czy prostowanie zębów nakładkami boli?", "acceptedAnswer": { "@type": "Answer", "text": "Ból jest minimalny – pacjenci opisują go raczej jako uczucie ucisku przez 1-2 dni po założeniu nowej pary nakładek. Jest to nieporównywalnie mniejszy dyskomfort niż przy aparacie metalowym." } },
        { "@type": "Question", "name": "Jak długo trwa leczenie ortodontyczne nakładkami?", "acceptedAnswer": { "@type": "Answer", "text": "Średni czas to 6-18 miesięcy, w zależności od wady. Już na pierwszej wizycie pokażemy Ci symulację 3D i powiemy dokładnie, ile potrwa leczenie." } },
        { "@type": "Question", "name": "Czy po zdjęciu nakładek zęby nie wrócą na stare miejsce?", "acceptedAnswer": { "@type": "Answer", "text": "Stosujemy retencję (cieniutki drucik od wewnątrz lub nakładka na noc), która trzyma zęby w nowej pozycji. Jest to standardowa procedura gwarantująca trwałość efektu." } }
    ]
};

const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": brand.appUrl },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": `${brand.appUrl}/oferta` },
        { "@type": "ListItem", "position": 3, "name": "Ortodoncja" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />{children}</>);
}
