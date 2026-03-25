import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

const prodMetadata: Metadata = {
    title: 'Chirurgia Stomatologiczna Opole - Usuwanie Zębów, Ósemki',
    description: 'Chirurgia stomatologiczna w Opolu. Bezbolesne usuwanie zębów i ósemek z zastosowaniem PRF. Szybkie gojenie. Gabinet Mikrostomart Opole.',
    keywords: 'chirurgia stomatologiczna opole, usuwanie zębów opole, usuwanie ósemek opole, ekstrakcja zęba opole, PRF opole',
};

const demoMetadata: Metadata = {
    title: 'Chirurgia Stomatologiczna  - Usuwanie Zębów, Ósemki',
    description: 'Chirurgia stomatologiczna w . Bezbolesne usuwanie zębów i ósemek z zastosowaniem PRF. Szybkie gojenie. Gabinet DensFlow Demo .',
    keywords: 'chirurgia stomatologiczna opole, usuwanie zębów opole, usuwanie ósemek opole, ekstrakcja zęba opole, PRF opole',
};

export const metadata: Metadata = isDemoMode ? demoMetadata : prodMetadata;

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
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": "https://mikrostomart.pl" },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": "https://mikrostomart.pl/oferta" },
        { "@type": "ListItem", "position": 3, "name": "Chirurgia Stomatologiczna" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />{children}</>);
}
