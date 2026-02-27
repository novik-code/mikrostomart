/**
 * Consent type mapping — maps consent_type keys to PDF filenames, Polish labels,
 * and precise field positions for pre-filling patient data.
 *
 * Coordinates are in PDF points (1pt = 1/72 inch), origin at bottom-left.
 * US Letter = 612 x 792 pts, A4 = 595 x 842 pts.
 *
 * Field coordinates were mapped manually using /admin/pdf-mapper tool.
 * To re-map coordinates: open /admin/pdf-mapper, select the consent form,
 * click each field type on the PDF, then export and paste here.
 */

export interface FieldPosition {
    x: number;
    y: number;
    fontSize?: number;
    /** Which page this field is on (1-indexed, default=1) */
    page?: number;
}

export interface PeselBoxes {
    /** x of the first PESEL digit box */
    startX: number;
    /** y baseline */
    y: number;
    /** width of each box */
    boxWidth: number;
    fontSize?: number;
    /** Which page this field is on (1-indexed, default=1) */
    page?: number;
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
    /** Doctor signature image position (pre-saved PNG from admin panel) */
    doctor_signature?: FieldPosition;
    /** Patient signature position (drawn on tablet canvas) */
    patient_signature?: FieldPosition;
}

export interface ConsentType {
    label: string;
    file: string;
    fields: ConsentFieldMap;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * CONSENT FORM FIELD MAPPINGS
 * ═══════════════════════════════════════════════════════════════════
 *
 * Mapped manually using /admin/pdf-mapper on 2026-02-27.
 *
 * To edit: change coordinates below and redeploy.
 * To re-map from scratch: use /admin/pdf-mapper tool.
 *
 * page: 1 = first page (default if omitted)
 * Coordinates: x = horizontal from left, y = vertical from bottom
 * ═══════════════════════════════════════════════════════════════════
 */

export const CONSENT_TYPES: Record<string, ConsentType> = {

    // ── HIGIENIZACJA ─────────────────────────────────────────────
    higienizacja: {
        label: 'Zgoda na higienizację',
        file: 'zgoda_na_higienizację.pdf',
        fields: {
            name: { x: 208.6, y: 617.1, fontSize: 11, page: 1 },
            pesel: { startX: 166.4, y: 576.4, boxWidth: 23.5, fontSize: 12, page: 1 },
            date: { x: 315.6, y: 119.1, fontSize: 11, page: 1 },
            doctor: { x: 152, y: 510.3, fontSize: 11, page: 1 },
            patient_signature: { x: 317, y: 98, page: 1 },
            doctor_signature: { x: 99.3, y: 113.8, page: 1 },
            address: { x: 435, y: 624.3, fontSize: 11, page: 1 },
            city: { x: 434.1, y: 592.2, fontSize: 11, page: 1 },
        },
    },

    // ── ZNIECZULENIE ─────────────────────────────────────────────
    znieczulenie: {
        label: 'Zgoda na znieczulenie',
        file: 'zgoda_na_znieczulenie.pdf',
        fields: {
            name: { x: 197.6, y: 596.5, fontSize: 11, page: 1 },
            pesel: { startX: 168.8, y: 554.4, boxWidth: 23.5, fontSize: 12, page: 1 },
            address: { x: 413, y: 612.3, fontSize: 11, page: 1 },
            city: { x: 413.9, y: 596, fontSize: 11, page: 1 },
            patient_signature: { x: 439.3, y: 61.6, page: 1 },
            doctor_signature: { x: 88.7, y: 65.4, page: 1 },
        },
    },

    // ── CHIRURGICZNE ─────────────────────────────────────────────
    chirurgiczne: {
        label: 'Zgoda na leczenie chirurgiczne',
        file: 'zgoda_na_leczenie_chirurgiczne.pdf',
        fields: {
            name: { x: 234.1, y: 637.2, fontSize: 11, page: 1 },
            pesel: { startX: 168.3, y: 599.9, boxWidth: 23.5, fontSize: 12, page: 1 },
            address: { x: 434.1, y: 638.2, fontSize: 11, page: 1 },
            city: { x: 435.5, y: 614.2, fontSize: 11, page: 1 },
            tooth: { x: 178.4, y: 533.8, fontSize: 11, page: 1 },
            doctor: { x: 119.4, y: 522.3, fontSize: 11, page: 1 },
            doctor_signature: { x: 127.6, y: 174.2, page: 3 },
            date: { x: 373.6, y: 183.7, fontSize: 11, page: 3 },
            patient_signature: { x: 374.1, y: 158.8, page: 3 },
        },
    },

    // ── PROTETYCZNE ──────────────────────────────────────────────
    protetyczne: {
        label: 'Zgoda na leczenie protetyczne',
        file: 'zgoda_na_leczenie_protetyczne.pdf',
        fields: {
            name: { x: 211.5, y: 627.6, fontSize: 11, page: 1 },
            pesel: { startX: 150.6, y: 575, boxWidth: 23.5, fontSize: 12, page: 1 },
            address: { x: 425.4, y: 633.9, fontSize: 11, page: 1 },
            city: { x: 428.3, y: 599.9, fontSize: 11, page: 1 },
            tooth: { x: 114.6, y: 525.2, fontSize: 11, page: 1 },
            doctor: { x: 100.2, y: 424.6, fontSize: 11, page: 1 },
            doctor_signature: { x: 97.4, y: 522.3, page: 3 },
            date: { x: 351.6, y: 531.9, fontSize: 11, page: 3 },
            patient_signature: { x: 352.5, y: 509.4, page: 3 },
        },
    },

    // ── ENDODONTYCZNE ────────────────────────────────────────────
    endodontyczne: {
        label: 'Zgoda na leczenie endodontyczne',
        file: 'zgoda_na_leczenie_endodontyczne.pdf',
        fields: {
            name: { x: 213, y: 620.5, fontSize: 11, page: 1 },
            pesel: { startX: 163.1, y: 571.6, boxWidth: 23.5, fontSize: 12, page: 1 },
            address: { x: 429.3, y: 625.7, fontSize: 11, page: 1 },
            city: { x: 429.3, y: 589.8, fontSize: 11, page: 1 },
            tooth: { x: 264.3, y: 502.7, fontSize: 11, page: 1 },
            doctor: { x: 123.3, y: 489.7, fontSize: 11, page: 1 },
            doctor_signature: { x: 105, y: 446.6, page: 3 },
            date: { x: 330.5, y: 462.4, fontSize: 11, page: 3 },
            patient_signature: { x: 333.8, y: 432.7, page: 3 },
        },
    },

    // ── ZACHOWAWCZE ──────────────────────────────────────────────
    zachowawcze: {
        label: 'Zgoda na leczenie zachowawcze',
        file: 'zgoda_na_leczenie_zachowawcze.pdf',
        fields: {
            name: { x: 207.7, y: 597, fontSize: 11, page: 1 },
            pesel: { startX: 147.7, y: 558.7, boxWidth: 23.5, fontSize: 12, page: 1 },
            address: { x: 419.7, y: 613.3, fontSize: 11, page: 1 },
            city: { x: 419.7, y: 600.4, fontSize: 11, page: 1 },
            tooth: { x: 252.3, y: 501.2, fontSize: 11, page: 1 },
            doctor: { x: 387.1, y: 501.7, fontSize: 11, page: 1 },
            doctor_signature: { x: 118.9, y: 156.9, page: 2 },
            date: { x: 349.2, y: 156.4, fontSize: 11, page: 2 },
            patient_signature: { x: 348.7, y: 127.7, page: 2 },
        },
    },

    // ── PROTETYKA NA IMPLANCIE ────────────────────────────────────
    protetyka_implant: {
        label: 'Akceptacja pracy protetycznej na implancie',
        file: 'AKCEPTACJA_PRACY_PROTETYCZNEJ_NA_IMPLANCIE.pdf',
        fields: {
            name: { x: 152.6, y: 683, fontSize: 11, page: 1 },
            pesel: { startX: 86.8, y: 660.6, boxWidth: 23.5, fontSize: 12, page: 1 },
            address: { x: 359.2, y: 684.8, fontSize: 11, page: 1 },
            city: { x: 361.1, y: 657.3, fontSize: 11, page: 1 },
            doctor_signature: { x: 398.9, y: 83.9, page: 1 },
            date: { x: 79.3, y: 72.3, fontSize: 11, page: 1 },
            patient_signature: { x: 191.3, y: 80.2, page: 1 },
        },
    },

    // ── RTG ───────────────────────────────────────────────────────
    rtg: {
        label: 'Ankieta i zgoda na RTG',
        file: 'ankieta_i_zgoda_na_rtg.pdf',
        fields: {
            name: { x: 227.3, y: 591.3, fontSize: 11, page: 1 },
            address: { x: 106, y: 552.5, fontSize: 11, page: 1 },
            city: { x: 234.1, y: 572.1, fontSize: 11, page: 1 },
            phone: { x: 275.3, y: 531.9, fontSize: 11, page: 1 },
            pesel: { startX: 184.7, y: 496, boxWidth: 23.5, fontSize: 12, page: 1 },
            date: { x: 95.9, y: 379.6, fontSize: 11, page: 2 },
            patient_signature: { x: 214.9, y: 379.1, page: 2 },
        },
    },

    // ── IMPLANTACJA ──────────────────────────────────────────────
    implantacja: {
        label: 'Zgoda na implantację',
        file: 'zgoda_na_implantację.pdf',
        fields: {
            city: { x: 170.3, y: 588.9, fontSize: 11, page: 1 },
            name: { x: 236.5, y: 567.3, fontSize: 11, page: 1 },
            pesel: { startX: 70, y: 534.7, boxWidth: 23.5, fontSize: 12, page: 1 },
            patient_signature: { x: 324.2, y: 144.9, page: 4 },
            date: { x: 232.6, y: 145.9, fontSize: 11, page: 4 },
        },
    },

    // ── WIZERUNEK ────────────────────────────────────────────────
    wizerunek: {
        label: 'Zgoda na publikację wizerunku',
        file: 'zgoda_na_publikację_wizerunku.pdf',
        fields: {
            name: { x: 182.3, y: 602.3, fontSize: 11, page: 1 },
            phone: { x: 116.1, y: 561.1, fontSize: 11, page: 1 },
            city: { x: 101.7, y: 122, fontSize: 11, page: 1 },
            patient_signature: { x: 241.7, y: 124.4, page: 1 },
            doctor_signature: { x: 431.2, y: 123.4, page: 1 },
        },
    },
};

export const CONSENT_TYPE_KEYS = Object.keys(CONSENT_TYPES);
