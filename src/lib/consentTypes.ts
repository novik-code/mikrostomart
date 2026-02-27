/**
 * Consent type mapping — maps consent_type keys to PDF filenames and Polish labels.
 */
export const CONSENT_TYPES: Record<string, { label: string; file: string }> = {
    higienizacja: {
        label: 'Zgoda na higienizację',
        file: 'zgoda_na_higienizację.pdf',
    },
    implantacja: {
        label: 'Zgoda na implantację',
        file: 'zgoda_na_implantację.pdf',
    },
    chirurgiczne: {
        label: 'Zgoda na leczenie chirurgiczne',
        file: 'zgoda_na_leczenie_chirurgiczne.pdf',
    },
    endodontyczne: {
        label: 'Zgoda na leczenie endodontyczne',
        file: 'zgoda_na_leczenie_endodontyczne.pdf',
    },
    protetyczne: {
        label: 'Zgoda na leczenie protetyczne',
        file: 'zgoda_na_leczenie_protetyczne.pdf',
    },
    zachowawcze: {
        label: 'Zgoda na leczenie zachowawcze',
        file: 'zgoda_na_leczenie_zachowawcze.pdf',
    },
    znieczulenie: {
        label: 'Zgoda na znieczulenie',
        file: 'zgoda_na_znieczulenie.pdf',
    },
    rtg: {
        label: 'Ankieta i zgoda na RTG',
        file: 'ankieta_i_zgoda_na_rtg.pdf',
    },
    wizerunek: {
        label: 'Zgoda na publikację wizerunku',
        file: 'zgoda_na_publikację_wizerunku.pdf',
    },
    protetyka_implant: {
        label: 'Akceptacja pracy protetycznej na implancie',
        file: 'AKCEPTACJA_PRACY_PROTETYCZNEJ_NA_IMPLANCIE.pdf',
    },
};

export const CONSENT_TYPE_KEYS = Object.keys(CONSENT_TYPES);
