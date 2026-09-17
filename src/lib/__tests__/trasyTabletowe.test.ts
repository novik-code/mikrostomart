/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy `next/dynamic` i kontekstów zwracają komponenty o dowolnych propsach;
 * typowanie ich pod sygnatury Next nie wnosi nic do tego, co test sprawdza.
 */
/**
 * STRAŻNIK: STRONY PODPISYWANE NA TABLECIE BEZ NAKŁADEK WITRYNY.
 *
 * 🔴 CO BYŁO ZEPSUTE. `/zgody/[token]` i `/ekarta/[token]` dostawały pełny szablon strony. Zmierzone
 * w przeglądarce 17.09.2026 (768×1024): przyklejony dolny pasek „Telefon / Wizyta / Ból zęba”
 * zasłaniał przycisk „✍️ Przejdź do podpisania” — dotyk przeniósł pacjenta na /rezerwacja w połowie
 * podpisywania zgody. Do tego menu, stopka, czat, zachęta do instalacji, baner ciasteczek i pigułka
 * „🛡 Admin” (tablet recepcji bywa zalogowany kontem z rolą admin).
 *
 * Strażnik WYKONUJE: renderuje prawdziwy `ThemeLayout` i `AdminFloatingBar` do HTML dla trasy
 * tabletowej i zwykłej, patrzy, które nakładki są w wyniku. Kontrola pozytywna: na zwykłej stronie
 * wszystkie nakładki SĄ (inaczej test przechodziłby na pusto).
 * DOWÓD, ŻE GRYZIE (cofka): zdejmij `trasaTabletowa` z `skipGlobalChrome` → pada test pasków.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { czyTrasaTabletowa } from '@/lib/trasyTabletowe';

let sciezka = '/';
vi.mock('next/navigation', () => ({
    usePathname: () => sciezka,
    useRouter: () => ({ push: () => {} }),
}));

vi.mock('@/context/ThemeContext', () => ({
    ThemeProvider: ({ children }: any) => children,
    usePresetId: () => 'default-gold',
    useTheme: () => ({
        theme: {
            features: { backgroundVideo: true, assistantTeaser: true, pwaInstallPrompt: true, simulatorModal: true, opinionSurvey: true },
            typography: { fontBody: 'Inter', fontHeading: 'Playfair Display' },
            hero: { backgroundVideoId: 'x' },
        },
    }),
}));

const znacznik = (nazwa: string) => {
    const Atrapa = () => createElement('i', null, `[${nazwa}]`);
    Atrapa.displayName = `Atrapa${nazwa}`;
    return Atrapa;
};
vi.mock('@/components/Navbar', () => ({ default: znacznik('NAVBAR') }));
vi.mock('@/components/Footer', () => ({ default: znacznik('FOOTER') }));
vi.mock('@/components/BackgroundVideo', () => ({ default: znacznik('WIDEO') }));
vi.mock('@/components/AssistantTeaser', () => ({ default: znacznik('CZAT') }));
vi.mock('@/components/MobileBottomBar', () => ({ default: znacznik('DOLNY-PASEK') }));
vi.mock('@/components/PWAInstallPrompt', () => ({ default: znacznik('PWA') }));
vi.mock('@/components/SimulatorModal', () => ({ default: znacznik('SYMULATOR') }));
vi.mock('@/components/OpinionSurvey', () => ({ default: znacznik('ANKIETA') }));
// `next/dynamic` → komponent, który renderuje załadowany moduł (atrapy powyżej rozwiązują się od razu).
vi.mock('next/dynamic', () => ({
    default: (ladowanie: () => Promise<any>) => {
        let C: any = null;
        void ladowanie().then((m) => { C = m.default; });
        return (props: any) => (C ? createElement(C, props) : createElement('i', null, '[NIEZALADOWANY]'));
    },
}));

vi.mock('@/hooks/useUserRoles', () => ({ useUserRoles: () => ({ isAdmin: true, email: 'gabinet@example.test', loading: false }) }));
vi.mock('@/context/VisualEditorContext', () => ({ useVisualEditor: () => ({ isEditorOpen: false, toggleEditor: () => {} }) }));

const NAKLADKI = ['[NAVBAR]', '[FOOTER]', '[WIDEO]', '[CZAT]', '[DOLNY-PASEK]', '[PWA]', '[SYMULATOR]', '[ANKIETA]'];

let ThemeLayout: any;
let AdminFloatingBar: any;
beforeAll(async () => {
    ThemeLayout = (await import('@/components/ThemeLayout')).default;
    AdminFloatingBar = (await import('@/components/AdminFloatingBar')).default;
    await new Promise((r) => setTimeout(r, 0)); // dociągnięcie atrap z `next/dynamic`
});

const renderLayout = (p: string) => {
    sciezka = p;
    return renderToString(createElement(ThemeLayout, null, createElement('main', null, 'TRESC-STRONY')));
};

describe('czyTrasaTabletowa', () => {
    it('e-Karta i zgody z tokenem są tabletowe — także z prefiksem języka', () => {
        expect(czyTrasaTabletowa('/zgody/abc123')).toBe(true);
        expect(czyTrasaTabletowa('/ekarta/abc123')).toBe(true);
        expect(czyTrasaTabletowa('/en/zgody/abc123')).toBe(true);
    });

    it('zwykłe strony NIE są tabletowe', () => {
        for (const p of ['/', '/rezerwacja', '/zgody', '/zgody/', '/ekarta', '/strefa-pacjenta/dashboard', '/opieka/abc', '/zgodyx/abc', null, undefined, '']) {
            expect(czyTrasaTabletowa(p as any)).toBe(false);
        }
    });
});

describe('ThemeLayout · trasa tabletowa bez nakładek witryny', () => {
    it('kontrola pozytywna: na zwykłej stronie wszystkie nakładki są, baner ciasteczek nie jest chowany', () => {
        const html = renderLayout('/rezerwacja');
        for (const n of NAKLADKI) expect(html).toContain(n);
        expect(html).toContain('TRESC-STRONY');
        expect(html).not.toContain('[data-cookie-banner]{display:none');
    });

    for (const p of ['/zgody/tok-zgody', '/ekarta/tok-ekarty']) {
        it(`🔴 ${p}: żadnej nakładki (dolny pasek, menu, stopka, czat, PWA, ankieta), treść jest, baner ciasteczek schowany`, () => {
            const html = renderLayout(p);
            for (const n of NAKLADKI) expect(html).not.toContain(n);
            expect(html).toContain('TRESC-STRONY');
            expect(html).toContain('[data-cookie-banner]{display:none !important}');
        });
    }
});

describe('AdminFloatingBar · pigułka admina nie wisi nad podpisem', () => {
    it('kontrola pozytywna: na zwykłej stronie admin widzi pigułkę', () => {
        sciezka = '/rezerwacja';
        expect(renderToString(createElement(AdminFloatingBar))).toContain('Admin');
    });

    it('🔴 na trasie tabletowej pigułki nie ma', () => {
        sciezka = '/zgody/tok-zgody';
        expect(renderToString(createElement(AdminFloatingBar))).toBe('');
    });
});
