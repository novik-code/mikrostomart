import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Chirurgia Stomatologiczna ${brand.cityShort} - Usuwanie Zębów, Ósemki`,
    description: `Chirurgia stomatologiczna w ${brand.cityShort}. Bezbolesne usuwanie zębów i ósemek z zastosowaniem PRF. Szybkie gojenie. Gabinet ${brand.name} ${brand.cityShort}.`,
    keywords: `chirurgia stomatologiczna ${brand.cityShort.toLowerCase()}, usuwanie zębów ${brand.cityShort.toLowerCase()}, usuwanie ósemek ${brand.cityShort.toLowerCase()}, ekstrakcja zęba ${brand.cityShort.toLowerCase()}, PRF ${brand.cityShort.toLowerCase()}`,
};

const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": [
        { "@type": "Question", "name": "Kiedy trzeba usunąć ósemki (zęby mądrości)?", "acceptedAnswer": { "@type": "Answer", "text": "Gdy brakuje na nie miejsca w łuku (stłoczenia), powodują stany zapalne, próchnicę siódemek lub torbiele. Oceniamy to na podstawie zdjęcia pantomograficznego." } },
        { "@type": "Question", "name": "Co to jest PRF?", "acceptedAnswer": { "@type": "Answer", "text": "To bogatopłytkowa fibryna uzyskiwana z krwi pacjenta. Działa jak naturalny super-plaster, przyspieszając gojenie rany po ekstrakcji nawet kilkukrotnie." } },
        { "@type": "Question", "name": "Jakie są zalecenia po usunięciu zęba?", "acceptedAnswer": { "@type": "Answer", "text": "Przez 2 godziny nie jeść. W dobie zabiegu unikać gorących posiłków i wysiłku fizycznego. Nie płukać ust energicznie (by nie wypłukać skrzepu). Stosować zimne okłady." } },
        { "@type": "Question", "name": "Czy suchy zębodół to częste powikłanie?", "acceptedAnswer": { "@type": "Answer", "text": "Zdarza się rzadko (ok. 2-5%), głównie u palaczy. Aby mu zapobiec, stosujemy PRF oraz ozonoterapię, które drastycznie zmniejszają ryzyko powikłań." } }
    ]
};

const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": brand.appUrl },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": `${brand.appUrl}/oferta` },
        { "@type": "ListItem", "position": 3, "name": "Chirurgia Stomatologiczna" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />{children}</>);
}
