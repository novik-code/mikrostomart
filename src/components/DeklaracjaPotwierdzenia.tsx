'use client';

/**
 * Teksty „potwierdzenie = deklaracja obecności” w interfejsie weba (strona z linku SMS/push, strefa
 * pacjenta). Treść żyje w `lib/deklaracjaPotwierdzenia.ts` — jedno źródło dla UI i odpowiedzi serwera.
 */

import {
    DEKLARACJA_POTWIERDZENIA,
    INFORMACJA_PO_POTWIERDZENIU,
    REGULAMIN_HREF,
    TELEFON_GABINETU,
    TELEFON_GABINETU_HREF,
} from '@/lib/deklaracjaPotwierdzenia';

const pudelko: React.CSSProperties = {
    marginTop: '1.25rem',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md, 12px)',
    textAlign: 'left',
    fontSize: '0.95rem',
    lineHeight: 1.55,
};

const link: React.CSSProperties = { color: 'inherit', textDecoration: 'underline', fontWeight: 700 };

/** Pokazywane PRZED kliknięciem „Potwierdzam”. */
export function DeklaracjaPrzedPotwierdzeniem() {
    return (
        <div
            data-testid="deklaracja-potwierdzenia"
            style={{ ...pudelko, background: 'rgba(234, 179, 8, 0.12)', border: '2px solid rgba(234, 179, 8, 0.5)', color: 'var(--color-text-main, #f5f5f5)' }}
        >
            <strong style={{ display: 'block', marginBottom: '0.4rem' }}>⚠️ Zanim potwierdzisz</strong>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {DEKLARACJA_POTWIERDZENIA.map((punkt) => (
                    <li key={punkt} style={{ marginBottom: '0.25rem' }}>{punkt}</li>
                ))}
            </ul>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <a href={REGULAMIN_HREF} target="_blank" rel="noopener noreferrer" style={link}>Regulamin gabinetu</a>
                <a href={TELEFON_GABINETU_HREF} style={link}>📞 {TELEFON_GABINETU}</a>
            </div>
        </div>
    );
}

/** Pokazywane po potwierdzeniu i przy każdym ponownym wejściu na potwierdzoną wizytę. */
export function InformacjaPotwierdzonaWizyta({ tekst }: { tekst?: string }) {
    return (
        <div
            data-testid="wizyta-zablokowana"
            style={{ ...pudelko, background: 'rgba(59, 130, 246, 0.12)', border: '2px solid rgba(59, 130, 246, 0.45)', color: 'var(--color-text-main, #f5f5f5)' }}
        >
            <strong style={{ display: 'block', marginBottom: '0.4rem' }}>🔒 Wizyta potwierdzona</strong>
            <span>{tekst ?? INFORMACJA_PO_POTWIERDZENIU}</span>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <a href={TELEFON_GABINETU_HREF} style={link}>📞 Zadzwoń: {TELEFON_GABINETU}</a>
                <a href={REGULAMIN_HREF} target="_blank" rel="noopener noreferrer" style={link}>Regulamin gabinetu</a>
            </div>
        </div>
    );
}
