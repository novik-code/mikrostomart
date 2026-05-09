import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta/protetyka', PAGE_SEO['/oferta/protetyka']);
}

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
        { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": brand.appUrl },
        { "@type": "ListItem", "position": 2, "name": "Oferta", "item": `${brand.appUrl}/oferta` },
        { "@type": "ListItem", "position": 3, "name": "Protetyka" }
    ]
};

const medicalProcedureSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    "name": `Protetyka stomatologiczna ${brand.cityShort}`,
    "procedureType": "https://schema.org/TherapeuticProcedure",
    "bodyLocation": "Teeth",
    "description": "Odbudowa zniszczonych lub utraconych zębów: korony pełnoceramiczne (E.max), cyrkonowe, mosty, licówki oraz protezy. Cyfrowe skanowanie 3D zamiast tradycyjnych wycisków.",
    "howPerformed": "Skan wewnątrzustny kamerą 3D, projekt komputerowy, wykonanie pracy w laboratorium technicznym (5-7 dni roboczych). Cementowanie wykonane na drugiej wizycie.",
    "preparation": "Wywiad medyczny, badanie kliniczne i radiologiczne. W razie potrzeby leczenie endodontyczne lub przygotowanie kości pod implant.",
    "followup": "Kontrola po 7-14 dniach. Higiena protetyczna i regularne kontrole co 6 miesięcy.",
    "performer": { "@type": "MedicalOrganization", "name": brand.name, "url": brand.appUrl }
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalProcedureSchema) }} />{children}</>);
}
