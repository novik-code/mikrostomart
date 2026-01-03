export default function RegulationsPage() {
    return (
        <main className="section container" style={{ paddingTop: '150px' }}>
            <h1 className="font-heading text-3xl mb-8 text-[var(--color-primary)]">Regulamin Serwisu</h1>
            <div className="prose prose-invert max-w-none text-[var(--color-text-muted)]">
                <p><strong>§1. Postanowienia Ogólne</strong></p>
                <p>1. Niniejszy regulamin określa zasady korzystania z serwisu internetowego Mikrostomart dostępnego pod adresem mikrostomart.pl.</p>
                <p>2. Administratorem serwisu jest Gabinet Stomatologiczny Mikrostomart, ul. Centralna 33a, 45-940 Opole.</p>

                <p className="mt-4"><strong>§2. Usługi</strong></p>
                <p>1. Serwis umożliwia zapoznanie się z ofertą gabinetu, cennikiem oraz dokonanie wstępnej rezerwacji wizyty.</p>
                <p>2. Rezerwacja wizyty przez formularz internetowy wymaga potwierdzenia telefonicznego ze strony personelu gabinetu.</p>

                <p className="mt-4"><strong>§3. Odpowiedzialność</strong></p>
                <p>1. Administrator dokłada wszelkich starań, aby informacje zawarte w serwisie były aktualne i rzetelne.</p>
                <p>2. Wizualizacje (symulacje uśmiechu AI) mają charakter poglądowy i nie stanowią gwarancji efektu medycznego.</p>
            </div>
        </main>
    )
}
