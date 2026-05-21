/**
 * Person/Physician schema.org factories — przeniesione z `src/app/[locale]/o-nas/layout.tsx`
 * w Batch SEO-2 (2026-05-21) gdy stworzyliśmy dedykowane `/zespol/marcin-nowosielski`
 * i `/zespol/elzbieta-nowosielska`.
 *
 * Dlaczego shared lib:
 * 1. Reuse w 3 miejscach: nowe /zespol/marcin, /zespol/ela + ewentualnie jako
 *    `author` schema w /baza-wiedzy/[slug] albo /aktualnosci/[slug] (Batch SEO-3 jeśli kiedyś).
 * 2. Single source of truth — zmiana credentials/sameAs w jednym miejscu propaguje wszędzie.
 * 3. `@id` jest stabilny (`#marcin-nowosielski` / `#elzbieta-nowosielska`) — Google Knowledge
 *    Graph łączy entity przez @id niezależnie od URL strony renderującej schema.
 *
 * Po Batch SEO-2 /o-nas nie renderuje już tych schemas — są na dedykowanych stronach.
 */

import { brand } from '@/lib/brandConfig';
import { hreflangCode } from '@/lib/seo';

export interface PersonDescriptions {
    marcin: string;
    ela: string;
    marcinJob: string;
    elaJob: string;
}

export const PERSON_DESCRIPTIONS: Record<string, PersonDescriptions> = {
    pl: {
        marcin: 'Lekarz dentysta, implantolog, mikroskopowy endodonta. Współwłaściciel gabinetu Mikrostomart w Opolu. Specjalizuje się w implantologii, leczeniu kanałowym pod mikroskopem oraz stomatologii estetycznej.',
        ela: 'Higienistka stomatologiczna, współwłaścicielka gabinetu Mikrostomart w Opolu. Specjalizuje się w profesjonalnej higienizacji, profilaktyce i edukacji pacjentów.',
        marcinJob: 'Lekarz dentysta, implantolog',
        elaJob: 'Higienistka stomatologiczna',
    },
    en: {
        marcin: 'Dentist, implantologist and microscopic endodontist. Co-owner of Mikrostomart dental clinic in Opole, Poland. Specialises in implantology, microscopic root canal treatment, and aesthetic dentistry.',
        ela: 'Dental hygienist and co-owner of Mikrostomart dental clinic in Opole, Poland. Specialises in professional hygiene, prevention, and patient education.',
        marcinJob: 'Dentist, Implantologist',
        elaJob: 'Dental Hygienist',
    },
    de: {
        marcin: 'Zahnarzt, Implantologe und mikroskopischer Endodontologe. Mitinhaber der Zahnklinik Mikrostomart in Opole, Polen. Schwerpunkte: Implantologie, mikroskopische Wurzelkanalbehandlung und ästhetische Zahnmedizin.',
        ela: 'Dentalhygienikerin und Mitinhaberin der Zahnklinik Mikrostomart in Opole, Polen. Schwerpunkte: professionelle Mundhygiene, Prävention und Patientenedukation.',
        marcinJob: 'Zahnarzt, Implantologe',
        elaJob: 'Dentalhygienikerin',
    },
    ua: {
        marcin: 'Стоматолог, імплантолог, мікроскопічний ендодонт. Співвласник стоматологічної клініки Mikrostomart в Ополе, Польща. Спеціалізується на імплантології, мікроскопічному ендодонтичному лікуванні та естетичній стоматології.',
        ela: 'Стоматологічний гігієніст, співвласниця клініки Mikrostomart в Ополе, Польща. Спеціалізується на професійній гігієні, профілактиці та едукації пацієнтів.',
        marcinJob: 'Стоматолог, імплантолог',
        elaJob: 'Стоматологічний гігієніст',
    },
};

function buildLocalizedUrl(locale: string, path: string): string {
    return locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
}

/**
 * Marcin Physician schema. Po Batch SEO-1 (2026-05-21) używa @type Physician
 * (medical subtype) + pełny zestaw alumniOf/award/memberOf/hasCredential/sameAs/author Book.
 *
 * @param locale - URL locale prefix (pl/en/de/ua)
 * @param urlPath - URL bezwzględnej strony renderującej schema. Default `/zespol/marcin-nowosielski`
 *                  (Batch SEO-2 dedykowana strona). Można nadpisać dla `/o-nas` jako fallback.
 */
export function getMarcinSchema(locale: string, urlPath = '/zespol/marcin-nowosielski'): Record<string, unknown> {
    const desc = PERSON_DESCRIPTIONS[locale] || PERSON_DESCRIPTIONS.pl;
    const inLanguage = hreflangCode(locale);
    const url = buildLocalizedUrl(locale, urlPath);

    return {
        "@context": "https://schema.org",
        "@type": "Physician",
        "@id": `${brand.appUrl}/#marcin-nowosielski`,
        "name": "Marcin Nowosielski",
        "givenName": "Marcin",
        "familyName": "Nowosielski",
        "honorificPrefix": "lek. dent.",
        "honorificSuffix": "M.Sc.",
        "jobTitle": desc.marcinJob,
        "description": desc.marcin,
        "image": `${brand.appUrl}/marcin-final.webp`,
        "url": url,
        "inLanguage": inLanguage,
        "knowsLanguage": ["pl", "en", "de"],
        "availableLanguage": ["pl", "en", "de"],
        "medicalSpecialty": ["Endodontics", "Implantology", "CosmeticDentistry", "LaserDentistry"],
        "worksFor": {
            "@type": "Dentist",
            "@id": brand.schemaId,
            "name": brand.schemaName,
            "url": brand.schemaUrl,
        },
        "knowsAbout": [
            "Implantologia", "Endodoncja", "Stomatologia mikroskopowa", "Stomatologia laserowa",
            "Implantology", "Endodontics", "Microscopic dentistry", "Laser dentistry",
        ],
        "alumniOf": [
            {
                "@type": "EducationalOrganization",
                "name": "Uniwersytet Medyczny im. Piastów Śląskich we Wrocławiu",
                "url": "https://www.umw.edu.pl/",
            },
            {
                "@type": "EducationalOrganization",
                "name": "RWTH Aachen University — Aachen Dental Laser Center",
                "url": "https://www.aalz.de/en/",
                "description": "Master of Science in Lasers in Dentistry (2018–2021, with distinction)",
            },
        ],
        "award": [
            "Master of Science in Lasers in Dentistry with distinction (RWTH Aachen, 2021)",
            "Drugi w Polsce dentysta z tytułem M.Sc. in Lasers in Dentistry",
            "Najmłodszy w Polsce dentysta z tytułem M.Sc. in Lasers in Dentistry",
        ],
        "memberOf": [
            { "@type": "Organization", "name": "Polskie Towarzystwo Endodontyczne (PTE)", "url": "https://endodoncja.pl/" },
            { "@type": "Organization", "name": "European Society of Endodontology (ESE)", "url": "https://www.e-s-e.eu/" },
            { "@type": "Organization", "name": "Polskie Towarzystwo Stomatologii Laserowej (PTSL)" },
            { "@type": "Organization", "name": "Opolska Izba Lekarska" },
        ],
        "hasCredential": [
            {
                "@type": "EducationalOccupationalCredential",
                "credentialCategory": "Master's Degree",
                "name": "Master of Science in Lasers in Dentistry",
                "recognizedBy": { "@type": "EducationalOrganization", "name": "RWTH Aachen University" },
                "dateCreated": "2021",
            },
            {
                "@type": "EducationalOccupationalCredential",
                "credentialCategory": "Curriculum Certificate",
                "name": "Curriculum Endodontyczne",
                "recognizedBy": { "@type": "Organization", "name": "Polskie Towarzystwo Endodontyczne" },
            },
            {
                "@type": "EducationalOccupationalCredential",
                "credentialCategory": "Diploma",
                "name": "Oral Surgery Academy Graduate",
            },
        ],
        "author": [
            {
                "@type": "Book",
                "name": "Własny gabinet — poradnik dla lekarzy dentystów",
                "publisher": { "@type": "Organization", "name": "Wydawnictwo Czelej", "url": "https://czelej.com.pl" },
                "datePublished": "2024",
                "inLanguage": "pl",
            },
        ],
        "sameAs": [
            "https://www.facebook.com/marcindentist",
            "https://www.instagram.com/nowosielski_marcin/",
            "https://www.instagram.com/mikrostomart_opole/",
            "https://www.youtube.com/c/DentistMarcIn",
            "https://www.tiktok.com/@nowosielskimarcin",
            "https://czelej.com.pl/sklep/wlasny-gabinet-poradnik/",
            "https://endodoncja.pl/20-lecie-pte/",
            "https://www.laserandhealthacademy.com/media/uploads/laha/docs/2019/summaries/s31_marques_nowosielski.pdf",
            "https://www.magazyn-stomatologiczny.pl/a5646/Lek--dent--Marcin-Nowosielski-.html",
            "https://nowosielski.pl",
        ],
    };
}

/**
 * Elżbieta Person schema. Higienistka — schema.org nie ma typu DentalHygienist,
 * Person jest poprawny (Physician byłby błędny dla niemedycznej roli klinicznej).
 *
 * @param urlPath - default `/zespol/elzbieta-nowosielska`.
 */
export function getElaSchema(locale: string, urlPath = '/zespol/elzbieta-nowosielska'): Record<string, unknown> {
    const desc = PERSON_DESCRIPTIONS[locale] || PERSON_DESCRIPTIONS.pl;
    const inLanguage = hreflangCode(locale);
    const url = buildLocalizedUrl(locale, urlPath);

    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `${brand.appUrl}/#elzbieta-nowosielska`,
        "name": "Elżbieta Nowosielska",
        "givenName": "Elżbieta",
        "familyName": "Nowosielska",
        "honorificPrefix": "hig. stom.",
        "jobTitle": desc.elaJob,
        "description": desc.ela,
        "image": `${brand.appUrl}/ela-final.webp`,
        "url": url,
        "inLanguage": inLanguage,
        "worksFor": {
            "@type": "Dentist",
            "@id": brand.schemaId,
            "name": brand.schemaName,
            "url": brand.schemaUrl,
        },
        "knowsAbout": ["Higienizacja", "Profilaktyka stomatologiczna", "Dental hygiene", "Prevention"],
    };
}
