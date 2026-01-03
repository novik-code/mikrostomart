export default function CookiesPage() {
    return (
        <main className="section container" style={{ paddingTop: '150px' }}>
            <h1 className="font-heading text-3xl mb-8 text-[var(--color-primary)]">Polityka Plików Cookies</h1>
            <div className="prose prose-invert max-w-none text-[var(--color-text-muted)]">
                <p><strong>Czym są pliki cookies?</strong></p>
                <p className="mb-4">Są to niewielkie pliki tekstowe wysyłane przez serwer www i przechowywane przez oprogramowanie komputera przeglądarki. Kiedy przeglądarka ponownie połączy się ze stroną, witryna rozpoznaje rodzaj urządzenia, z którego łączy się użytkownik.</p>

                <p><strong>Do czego ich używamy?</strong></p>
                <ul className="list-disc pl-6 mt-2 mb-4">
                    <li>Zapamiętywanie preferencji użytkownika (np. zgoda na cookies).</li>
                    <li>Tworzenie anonimowych statystyk, które pomagają zrozumieć, w jaki sposób użytkownicy korzystają ze strony.</li>
                    <li>Zapewnienie bezpieczeństwa i niezawodności serwisu.</li>
                </ul>

                <p className="mt-6"><strong>Zarządzanie plikami cookies</strong></p>
                <p>Użytkownik może w każdej chwili zmienić ustawienia dotyczące plików cookies. Ograniczenie stosowania plików cookies może wpłynąć na niektóre funkcjonalności dostępne na stronie internetowej.</p>
            </div>
        </main>
    )
}
