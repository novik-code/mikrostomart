/**
 * Consent type mapping — maps consent_type keys to PDF filenames, Polish labels,
 * and precise field positions for pre-filling patient data.
 *
 * Coordinates are in PDF points (1pt = 1/72 inch), origin at bottom-left.
 * US Letter = 612 x 792 pts, A4 = 595 x 842 pts.
 */

export interface FieldPosition {
    x: number;
    y: number;
    fontSize?: number;
}

export interface PeselBoxes {
    /** x of the first PESEL digit box */
    startX: number;
    /** y baseline */
    y: number;
    /** width of each box */
    boxWidth: number;
    fontSize?: number;
}

export interface ConsentFieldMap {
    /** Where to write patient full name (on the dotted line) */
    name?: FieldPosition;
    /** PESEL individual character boxes */
    pesel?: PeselBoxes;
    /** Date field position */
    date?: FieldPosition;
    /** Address field position */
    address?: FieldPosition;
    /** Additional fields like "miejscowość" */
    city?: FieldPosition;
    /** Phone number */
    phone?: FieldPosition;
    /** Email */
    email?: FieldPosition;
    /** Doctor name — filled from dropdown on tablet */
    doctor?: FieldPosition;
    /** Tooth number — filled from dropdown on tablet */
    tooth?: FieldPosition;
}

export interface ConsentType {
    label: string;
    file: string;
    fields: ConsentFieldMap;
}

/**
 * Field positions calculated from PDF analysis:
 * - Standard layout (Logo → Title → Name → PESEL): higienizacja, znieczulenie,
 *   chirurgiczne, protetyczne, endodontyczne, zachowawcze, protetyka_implant
 * - RTG layout: data → nazwisko → adres → telefon → PESEL
 * - Implantacja layout: miejscowość/data → pacjent line → PESEL
 * - Wizerunek: name only, no PESEL
 */

// Standard layout — shared by most forms (US Letter 612x792)
const STANDARD_FIELDS: ConsentFieldMap = {
    name: { x: 275, y: 442, fontSize: 11 },
    pesel: { startX: 133, y: 398, boxWidth: 23.5, fontSize: 12 },
};

export const CONSENT_TYPES: Record<string, ConsentType> = {
    higienizacja: {
        label: 'Zgoda na higienizację',
        file: 'zgoda_na_higienizację.pdf',
        fields: { ...STANDARD_FIELDS },
    },
    znieczulenie: {
        label: 'Zgoda na znieczulenie',
        file: 'zgoda_na_znieczulenie.pdf',
        fields: { ...STANDARD_FIELDS },
    },
    chirurgiczne: {
        label: 'Zgoda na leczenie chirurgiczne',
        file: 'zgoda_na_leczenie_chirurgiczne.pdf',
        fields: { ...STANDARD_FIELDS },
    },
    protetyczne: {
        label: 'Zgoda na leczenie protetyczne',
        file: 'zgoda_na_leczenie_protetyczne.pdf',
        fields: { ...STANDARD_FIELDS },
    },
    endodontyczne: {
        label: 'Zgoda na leczenie endodontyczne',
        file: 'zgoda_na_leczenie_endodontyczne.pdf',
        fields: { ...STANDARD_FIELDS },
    },
    zachowawcze: {
        label: 'Zgoda na leczenie zachowawcze',
        file: 'zgoda_na_leczenie_zachowawcze.pdf',
        fields: { ...STANDARD_FIELDS },
    },
    protetyka_implant: {
        label: 'Akceptacja pracy protetycznej na implancie',
        file: 'AKCEPTACJA_PRACY_PROTETYCZNEJ_NA_IMPLANCIE.pdf',
        // A4 (595x842) — similar layout but slightly different coords
        fields: {
            name: { x: 275, y: 510, fontSize: 11 },
            pesel: { startX: 133, y: 466, boxWidth: 23.5, fontSize: 12 },
        },
    },
    rtg: {
        label: 'Ankieta i zgoda na RTG',
        file: 'ankieta_i_zgoda_na_rtg.pdf',
        // Special layout: data → nazwisko → adres → PESEL
        fields: {
            date: { x: 175, y: 620, fontSize: 11 },
            name: { x: 270, y: 585, fontSize: 11 },
            address: { x: 270, y: 550, fontSize: 10 },
            phone: { x: 130, y: 500, fontSize: 10 },
            pesel: { startX: 175, y: 455, boxWidth: 23.5, fontSize: 12 },
        },
    },
    implantacja: {
        label: 'Zgoda na implantację',
        file: 'zgoda_na_implantację.pdf',
        // Special layout: miejscowość/data → pacjent → PESEL
        fields: {
            city: { x: 195, y: 475, fontSize: 11 },
            date: { x: 330, y: 475, fontSize: 11 },
            name: { x: 310, y: 435, fontSize: 11 },
            pesel: { startX: 133, y: 395, boxWidth: 23.5, fontSize: 12 },
        },
    },
    wizerunek: {
        label: 'Zgoda na publikację wizerunku',
        file: 'zgoda_na_publikację_wizerunku.pdf',
        // Name only, no PESEL
        fields: {
            name: { x: 175, y: 555, fontSize: 11 },
        },
    },
};

export const CONSENT_TYPE_KEYS = Object.keys(CONSENT_TYPES);
