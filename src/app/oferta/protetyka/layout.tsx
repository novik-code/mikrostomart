import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Protetyka Opole - Korony, Mosty, Protezy',
    description: 'Protetyka stomatologiczna w Opolu. Korony pełnoceramiczne, cyrkonowe, mosty i protezy. Cyfrowe skanowanie 3D bez wycisków. Gabinet Mikrostomart.',
    keywords: 'protetyka opole, korony zębowe opole, mosty stomatologiczne opole, protezy opole, korona cyrkonowa opole',
};

const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": [
        { "@type": "Question", "name": "Korona czy licówka - co wybrać?", "acceptedAnswer": { "@type": "Answer", "text": "Licówka pokrywa tylko przednią część zęba (estetyka). Korona obejmuje cały ząb jak kapturek (odbudowa i wzmocnienie). Decyzję podejmuje lekarz na podstawie stopnia zniszczenia zęba." } },
        { "@type": "Question", "name": "Z czego robicie korony?", "acceptedAnswer": { "@type": "Answer", "text": "Stosujemy głównie korony pełnoceramiczne (E.max) oraz cyrkonowe. Nie powodują one sinienia dziąsła (jak stare korony na metalu) i są nie do odróżnienia od naturalnego zęba." } },
        { "@type": "Question", "name": "Jak wygląda proces robienia korony?", "acceptedAnswer": { "@type": "Answer", "text": "Dzięki cyfrowemu skanerowi nie musimy robić nieprzyjemnych wycisków masą. Skanujemy zęby kamerą 3D, a projekt wysyłamy do laboratorium. Gotową koronę cementujemy po 5-7 dniach roboczych." } },
        { "@type": "Question", "name": "Czym są mosty bez szlifowania?", "acceptedAnswer": { "@type": "Answer", "text": "To mosty adhezyjne na włóknie szklanym. Są rozwiązaniem tymczasowym lub długoczasowym, które pozwala uzupełnić brak zęba bez mocnego szlifowania sąsiadów." } }
    ]
};

const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": "https://mikrostomart.pl" },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": "https://mikrostomart.pl/oferta" },
        { "@type": "ListItem", "position": 3, "name": "Protetyka" }
    ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />{children}</>);
}
