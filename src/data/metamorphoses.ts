import { isDemoMode } from '@/lib/demoMode';

/**
 * Dane metamorfoz (before/after) — single source of truth.
 * Wyciągnięte z MetamorphosisGallery.tsx (2026-06-01) żeby reużyć w image sitemap
 * (/sitemap-images.xml) + galerii. Pure data (jedyna zależność: isDemoMode dla motto #15).
 */
export interface MetamorphosisItem {
    id: number;
    before: string;
    after: string;
    title: string;
    description: string;
    motto?: string;
}

export const METAMORPHOSES: MetamorphosisItem[] = [
    {
        id: 1,
        before: "/metamorphosis_before-v2.webp",
        after: "/metamorphosis_after-v2.webp",
        title: "Metamorfoza Pana Michała",
        description: "Pełna rekonstrukcja zgryzu przywracająca funkcjonalność i estetykę.",
        motto: '"Teraz uśmiecham się do każdego zdjęcia!"'
    },
    {
        id: 2,
        before: "/metamorphosis_2_before.jpg",
        after: "/metamorphosis_2_after.jpg",
        title: "Nowy uśmiech Pana Piotra",
        description: "Subtelna zmiana kształtu i koloru zębów, która diametralnie odmieniła odbiór twarzy.",
        motto: '"Odzyskałem pewność siebie w kontaktach biznesowych."'
    },
    {
        id: 3,
        before: "/metamorphosis_3_before.jpg",
        after: "/metamorphosis_3_after.jpg",
        title: "Metamorfoza Pani Klaudii",
        description: "Kompleksowa poprawa estetyki uśmiechu.",
        motto: '"Nareszcie czuję się sobą."'
    },
    {
        id: 4,
        before: "/images/metamorphoses/meta_4_before.jpg",
        after: "/images/metamorphoses/meta_4_after.jpg",
        title: "Metamorfoza Pani Anny",
        description: "Zastosowanie licówek porcelanowych w odcinku przednim dla idealnej harmonii uśmiechu.",
        motto: '"Zawsze marzyłam o takim uśmiechu na ślubie córki."'
    },
    {
        id: 5,
        before: "/images/metamorphoses/meta_5_before.jpg",
        after: "/images/metamorphoses/meta_5_after.jpg",
        title: "Uśmiech Pana Tomasza",
        description: "Odbudowa startych zębów metodą bondingu (flow injection).",
        motto: '"Młodszy wygląd o 10 lat bez inwazyjnych zabiegów."'
    },
    {
        id: 6,
        before: "/images/metamorphoses/meta_6_before.jpg",
        after: "/images/metamorphoses/meta_6_after.jpg",
        title: "Metamorfoza Pana Łukasza",
        description: "Korekta dziąsłowa (gingiwoplastyka) połączona z wybielaniem gabinetowym.",
        motto: '"Mój uśmiech w końcu wygląda tak, jak się czuję."'
    },
    {
        id: 7,
        before: "/images/metamorphoses/meta_7_before.jpg",
        after: "/images/metamorphoses/meta_7_after.jpg",
        title: "Nowy uśmiech Pani Agaty",
        description: "Implantacja w miejsce brakujących zębów bocznych przywracająca pełną funkcję żucia.",
        motto: '"Mogę znów jeść to, na co mam ochotę!"'
    },
    {
        id: 8,
        before: "/images/metamorphoses/meta_8_before.jpg",
        after: "/images/metamorphoses/meta_8_after.jpg",
        title: "Metamorfoza Pana Damiana",
        description: "Zamknięcie diastemy i korekta kształtu zębów materiałem kompozytowym.",
        motto: '"Drobna zmiana, a wielki efekt."'
    },
    {
        id: 9,
        before: "/images/metamorphoses/meta_9_before.jpg",
        after: "/images/metamorphoses/meta_9_after.jpg",
        title: "Uśmiech Pani Natalii",
        description: "Kompleksowa rehabilitacja protetyczna z podniesieniem zwarcia.",
        motto: '"Koniec z bólem stawów i ukrywaniem uśmiechu."'
    },
    {
        id: 10,
        before: "/images/metamorphoses/meta_10_before.jpg",
        after: "/images/metamorphoses/meta_10_after.jpg",
        title: "Metamorfoza Pani Moniki",
        description: "Wymiana starych wypełnień na estetyczne odbudowy onlay/overlay.",
        motto: '"Moje zęby wyglądają teraz tak naturalnie!"'
    },
    {
        id: 11,
        before: "/images/metamorphoses/meta_11_before.jpg",
        after: "/images/metamorphoses/meta_11_after.jpg",
        title: "Przemiana Pani Zofii",
        description: "Cyfrowe projektowanie uśmiechu (DSD) i realizacja ceramiczna.",
        motto: '"Profesjonalizm na każdym etapie. Warto było zaufać."'
    },
    {
        id: 12,
        before: "/images/metamorphoses/meta_12_before.jpg",
        after: "/images/metamorphoses/meta_12_after.jpg",
        title: "Metamorfoza Pana Rafała",
        description: "Leczenie ortodontyczne nakładkowe zakończone wybielaniem.",
        motto: '"Proste zęby to moja nowa wizytówka."'
    },
    {
        id: 13,
        before: "/images/metamorphoses/meta_13_before.jpg",
        after: "/images/metamorphoses/meta_13_after.jpg",
        title: "Styl Pana Roberta",
        description: "Estetyczna odbudowa kłów i siekaczy po urazie mechanicznym.",
        motto: '"Szybki powrót do pełnej sprawności i wyglądu."'
    },
    {
        id: 14,
        before: "/images/metamorphoses/meta_14_before.jpg",
        after: "/images/metamorphoses/meta_14_after.jpg",
        title: "Metamorfoza Pani Izabeli",
        description: "Licówki kompozytowe bez szlifowania zębów (technika direct).",
        motto: '"Bałam się dentysty, a teraz nie mogę przestać się uśmiechać."'
    },
    {
        id: 15,
        before: "/images/metamorphoses/meta_15_before.jpg",
        after: "/images/metamorphoses/meta_15_after.jpg",
        title: "Uśmiech Marzeń Pani Elżbiety",
        description: "Pełna rekonstrukcja łuku górnego na implantach (All-on-4).",
        motto: isDemoMode ? '"To inwestycja w jakość życia. Dziękuję całemu zespołowi."' : '"To inwestycja w jakość życia. Dziękuję zespołowi Mikrostomart."'
    },
    {
        id: 16,
        before: "/images/metamorphoses/meta_16_before.jpg",
        after: "/images/metamorphoses/meta_16_after.jpg",
        title: "Metamorfoza Pana Wojtka",
        description: "Kompleksowa rehabilitacja po 2 latach leczenia: chirurgia, augmentacja kości, implantacja, leczenie zachowawcze i protetyka. Trafił do nas z polecenia brata Piotra (metamorfoza #2).",
        motto: '"Brat pokazał mi, co możliwe. Dwa lata później sam mam ten uśmiech."'
    }
];
