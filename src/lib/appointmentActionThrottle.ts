/**
 * DŁAWIK AKCJI WIZYTY — jeden kubełek na pacjenta (P-087, krok 8 karty P-001).
 *
 * 🔴 PO CO. Odwołanie, przełożenie i potwierdzenie obecności nie miały ŻADNEGO limitu.
 * Każda z tych akcji budzi recepcję czterema kanałami naraz: e-mail, Telegram, dwa pushe
 * do personelu i ikona w PMS. Zalogowany pacjent mógł je wywoływać w pętli.
 *
 * 🔑 KUBEŁEK JEST WSPÓLNY DLA TRZECH TRAS — celowo. Osobne dałyby trzykrotność budżetu,
 * a z punktu widzenia zespołu to jedna klasa hałasu: ten sam kanał, ta sama recepcja.
 *
 * 🔑 KLUCZ PO PACJENCIE, NIE PO IP. Lekcja `dc1e132`: cały gabinet pracuje na jednym
 * tablecie, a operatorzy komórkowi trzymają tysiące abonentów za jednym CGNAT-em —
 * limit po adresie uciszyłby wszystkich naraz.
 *
 * 🔑 PRÓG JEST LUŹNY ŚWIADOMIE. Uczciwy pacjent potwierdza obecność raz i najwyżej raz
 * przekłada; dziesięć akcji w dziesięć minut nie zdarza się przy normalnym używaniu,
 * a pętlę ucina natychmiast. Limit ma łapać NADUŻYCIE, nie karać niezdecydowanie.
 *
 * 🪤 BEZ `failClosed`. Awaria licznika nie może zablokować odwołania wizyty — własności
 * pilnuje osobna bramka (P-001), więc fail-open na samym LICZNIKU nie otwiera dziury,
 * a fail-closed zamieniłby awarię bazy w „nie możesz odwołać wizyty".
 */

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const APPT_ACTION_MAX = 10;
export const APPT_ACTION_WINDOW_MS = 10 * 60_000;

/** Wyłącznik awaryjny bez deployu — wzorzec `VERIFY_RATE_LIMIT_OFF`. */
const egzekwujemy = () => process.env.APPT_ACTION_RATE_LIMIT_OFF !== '1';

/**
 * Zwraca gotową odpowiedź 429, gdy pacjent przekroczył budżet — albo `null`, gdy wolno.
 *
 * Wołać PO `verifyPatientSession` (żeby anonim nie wypalał cudzego kubełka), a PRZED
 * odczytem pacjenta z bazy i przed czymkolwiek, co dotyka PMS.
 */
export async function guardAppointmentAction(prodentisId: string): Promise<NextResponse | null> {
    if (!egzekwujemy()) return null;

    const { allowed } = await checkRateLimit(
        `apptaction:${prodentisId}`,
        APPT_ACTION_MAX,
        APPT_ACTION_WINDOW_MS,
    );
    if (allowed) return null;

    const sekundy = Math.ceil(APPT_ACTION_WINDOW_MS / 1000);
    return NextResponse.json(
        {
            // Apka 1.3.x pokazuje `error`; `message` dokładamy dla klientów, które czytają je.
            error: 'Zbyt wiele operacji na wizytach. Spróbuj ponownie za kilka minut.',
            message: 'Zbyt wiele operacji na wizytach. Spróbuj ponownie za kilka minut.',
        },
        {
            status: 429,
            headers: { 'Retry-After': String(sekundy), 'Cache-Control': 'no-store' },
        },
    );
}
