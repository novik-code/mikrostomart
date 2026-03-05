import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Rezerwacja Online | Mikrostomart - Dentysta Opole',
    description: 'Umów wizytę u dentysty w Opolu online. Szybka rezerwacja w gabinecie Mikrostomart — wybierz specjalistę, datę i godzinę.',
    keywords: 'rezerwacja dentysta opole, umów wizytę online opole, wizyta stomatolog opole, mikrostomart rezerwacja',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
