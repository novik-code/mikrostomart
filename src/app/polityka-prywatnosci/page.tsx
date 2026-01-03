export default function PrivacyPolicyPage() {
    return (
        <main className="section container" style={{ paddingTop: '150px' }}>
            <h1 className="font-heading text-3xl mb-8 text-[var(--color-primary)]">Polityka Prywatności (RODO)</h1>
            <div className="prose prose-invert max-w-none text-[var(--color-text-muted)]">
                <p><strong>I. Administrator Danych Osobowych</strong></p>
                <p>Administratorem Twoich danych osobowych jest Gabinet Stomatologiczny Mikrostomart z siedzibą w Opolu przy ul. Centralnej 33a.</p>

                <p className="mt-6"><strong>II. Cele i Podstawy Przetwarzania</strong></p>
                <p>Przetwarzamy Twoje dane w celu:</p>
                <ul className="list-disc pl-6 mt-2 mb-4">
                    <li>Rezerwacji wizyt i prowadzenia dokumentacji medycznej (zgodnie z ustawą o prawach pacjenta).</li>
                    <li>Kontaktu w sprawach organizacyjnych (potwierdzenie wizyty).</li>
                    <li>Odpowiedzi na zapytania przesłane przez formularz kontaktowy.</li>
                </ul>

                <p className="mt-6"><strong>III. Twoje Prawa</strong></p>
                <p>Masz prawo do dostępu do swoich danych, ich sprostowania, usunięcia (w zakresie nie sprzecznym z obowiązkiem prowadzenia dokumentacji medycznej) oraz wniesienia skargi do organu nadzorczego.</p>

                <p className="mt-6"><strong>IV. Kontakt</strong></p>
                <p>W sprawach ochrony danych osobowych prosimy o kontakt pod adresem email: gabinet@mikrostomart.pl.</p>
            </div>
        </main>
    )
}
