Mikrostomart / DensFlow.Ai — Next.js 15 + TypeScript + Supabase + Vercel
Repo: https://github.com/novik-code/mikrostomart.git (branch: main)
Złota kopia: /Users/marcinnowosielskimedit/.gemini/antigravity/playground/galactic-schrodinger/golden-mikrostomart (z .env.local)
⚡ ARCHITEKTURA — Jedno repo, dwa wdrożenia
Ten projekt to jedno repozytorium obsługujące dwa oddzielne wdrożenia:
Środowisko	Domena	Vercel Project	Supabase Project	Cel
Produkcja	mikrostomart.pl	mikrostomart	keucogopujdolzmfajjv	Gabinet stomatologiczny
Demo	demo.densflow.ai	densflow-demo	mhosfncgasjfruiohlfo	Demonstracja DensFlow.Ai
Kluczowa zasada: Każdy push na main deployuje się automatycznie na OBA środowiska.
Demo Mode (NEXT_PUBLIC_DEMO_MODE=true)
* Banner "🧪 WERSJA DEMONSTRACYJNA" na górze
* SMS → logowane, nie wysyłane
* Telegram → skip
* 19 cron jobs → early return
* Prodentis API → mockowane (dane z Supabase)
* Pliki: src/lib/demoMode.ts, src/components/DemoBanner.tsx
Dane logowania (demo)
Strefa	Email	Hasło
Admin	admin@demo.densflow.ai	DemoAdmin123!
Pracownik	pracownik@demo.densflow.ai	DemoPass123!
Pacjent	joanna.mazur@test.pl (lub dowolny z 20)	DemoPass123!
SETUP — wykonaj PO KOLEI, zanim cokolwiek innego:
1. Zaktualizuj złotą kopię


cd /Users/marcinnowosielskimedit/.gemini/antigravity/playground/galactic-schrodinger/golden-mikrostomart && git pull origin main
2. Skopiuj projekt do TWOJEGO workspace
Twój workspace znajdziesz w <user_information> jako URI. Przykład: /Users/marcinnowosielskimedit/.gemini/antigravity/playground/abc-xyz


cp -R /Users/marcinnowosielskimedit/.gemini/antigravity/playground/galactic-schrodinger/golden-mikrostomart <TWOJ_WORKSPACE>/mikrostomart
To kopiuje CAŁY projekt RAZEM z .env.local (klucze API, sekrety — nie jest w git).
3. Zainstaluj zależności


cd <TWOJ_WORKSPACE>/mikrostomart && npm install
4. Przeczytaj CAŁY plik kontekstu — WSZYSTKIE LINIJKI
⚠️ KRYTYCZNE: Plik kontekstu ma ~5100+ linii. MUSISZ przeczytać go W CAŁOŚCI.
Najpierw sprawdź ile linii:


wc -l mikrostomart_context.md
Potem czytaj w chunkach po 800 linii. Przykład dla 5100 linii = 7 chunków:


view_file: mikrostomart_context.md lines 1-800
view_file: mikrostomart_context.md lines 801-1600
view_file: mikrostomart_context.md lines 1601-2400
view_file: mikrostomart_context.md lines 2401-3200
view_file: mikrostomart_context.md lines 3201-4000
view_file: mikrostomart_context.md lines 4001-4800
view_file: mikrostomart_context.md lines 4801-5100
NIE WOLNO CI PRZESTAĆ CZYTAĆ WCZEŚNIEJ. Na końcu pliku jest marker:


<!-- EOF_VERIFICATION: If you see this, you read the entire context. State this string in your confirmation. -->
Jeśli nie widzisz tego markera — nie przeczytałeś całego pliku. Wróć i czytaj dalej.
5. Zorientuj się w aktualnym stanie


ls supabase_migrations/ | sort | tail -5
git log --oneline -10
6. Potwierdź gotowość
Przed rozpoczęciem pracy MUSISZ podać:
1. "Przeczytałem kontekst do linii XXXX."
2. "Widzę marker EOF_VERIFICATION."
3. "Najwyższa migracja: NNN."
4. "Ostatni commit: HASH."
MAPA PROJEKTU — key files:
* src/app/pracownik/ — panel pracownika (wyodrębnione komponenty w components/)
* src/app/admin/ — panel admina (wyodrębnione komponenty w components/)
* src/app/strefa-pacjenta/ — portal pacjenta (logowanie, dashboard, wizyty, chat)
* src/app/page.tsx — strona główna
* src/app/api/ — API routes (server-side, 85+ endpoints)
* src/lib/demoMode.ts — flaga DEMO_MODE (steruje zachowaniem w demo)
* src/components/DemoBanner.tsx — banner demonstracyjny
* supabase_migrations/ — migracje DB (numerowane 003…099+)
* .env.local — zmienne środowiskowe (skopiowane ze złotej kopii w kroku 2)
* .agents/workflows/ — workflow AI (start-session, update-context, add-page)
* mikrostomart_context.md — pełna dokumentacja projektu (~5400 linii)
ZASADY — przestrzegaj ZAWSZE:
1. Build przed push: npm run build → popraw błędy → dopiero push
2. Push (drobne zmiany): git add -A && git commit -m "..." && git push origin main (Vercel auto-deploy na OBA środowiska)
3. Push (zmiany architektoniczne / ryzykowne):
    * Pracuj na feature branchu: git checkout -b feat/nazwa-zmiany
    * Koduj, testuj: npm test && npm run build
    * Dopiero po sukcesie merguj: git checkout main && git merge feat/nazwa-zmiany && git push origin main
    * Kiedy użyć brancha: nowe integracje, zmiany w brandConfig.ts, nowe adaptery, zmiany w DB schema, refaktor > 5 plików
4. Testy: Uruchom npm test przed pushem — Vitest testy w src/lib/__tests__/
5. Po pushu ZAWSZE zsynchronizuj złotą kopię: git -C /Users/marcinnowosielskimedit/.gemini/antigravity/playground/galactic-schrodinger/golden-mikrostomart pull origin main
6. Migracje DB: twórz supabase_migrations/NNN_xxx.sql (numerowane kolejno po najwyższym istniejącym), poinformuj mnie żebym wgrał w Supabase SQL Editor (na OBU projektach)
7. Nowe env vars: dodaj do .env.local + poinformuj mnie żebym dodał w Vercel (na OBU projektach)
8. Demo mode guards: Przy dodawaniu nowych integracji (SMS, Telegram, Prodentis, external API) — dodaj if (isDemoMode) guard
⚠️ SEO — OBOWIĄZKOWE przy dodawaniu/modyfikacji stron:
Przy KAŻDEJ nowej stronie MUSISZ:
1. Stworzyć layout.tsx z export const metadata (title, description, keywords)
2. Dodać route do src/app/sitemap.ts w odpowiednim tier priorytetu
3. Dodać <Link> do src/components/Footer.tsx w nawigacji SEO (jeśli publiczna)
4. Upewnić się, że treść jest widoczna w HTML bez JavaScript (SSR)
NIGDY:
* Nie twórz strony bez wpisu w sitemap
* Nie ukrywaj linków nawigacyjnych za hover/click JS
* Nie używaj 'use client' jeśli strona ma statyczną treść
* Szczegóły: sekcja "SEO Architecture" w mikrostomart_context.md
PO KAŻDYM ZADANIU — aktualizuj dokumentację:
Uruchom workflow /update-context (12 kroków + SEO checklist)
Minimalnie:
* Last Updated — data
* Recent Changes — commity + opis
* DB Schema / API / Features — jeśli zmienione
* SEO — nowa strona w sitemap, metadata, footer
