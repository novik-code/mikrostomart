# CLIENT_ONBOARDING.md
# Przewodnik wdrożenia nowego klienta DensFlow.Ai

> **Status:** Przygotowany po Fazie 9/10 multi-tenant architektury  
> **Przeznaczenie:** Checklist dla technika podczas onboardingu nowej kliniki

---

## ⏱ Szacowany czas wdrożenia

| Blok | Czas | Odpowiedzialny |
|------|------|---------------|
| Infrastruktura (Supabase + Vercel) | 2h | Dev |
| Dane kliniki (brand config) | 1h | Dev + Klient |
| Legalne (regulamin, RODO) | 2h | Klient dostarcza treść |
| Kalibracja AI (KB, cennik) | 1h | Dev + Klient |
| Integracje zewnętrzne | 2-4h | Dev |
| Testy i UAT | 2h | Dev + Klient |
| **RAZEM** | **~10-12h** | |

---

## 🏗️ BLOK 1 — Infrastruktura

### 1.1 Nowy projekt Supabase
- [ ] Utwórz nowy projekt Supabase (np. `klinika-xyz`)
- [ ] Zapisz: Project ID, URL, anon key, service_role key
- [ ] Wykonaj wszystkie migracje 003–099 z `supabase_migrations/` **w kolejności numerycznej** w SQL Editor
  ```bash
  # Skrypt pomocniczy — wklej każdy plik po kolei w Supabase SQL Editor
  ls supabase_migrations/ | sort | head -5
  # 003_xxx.sql → 004 → ... → 099_create_clinic_settings.sql
  ```
- [ ] Zweryfikuj że wszystkie tabele istnieją (sprawdź listę w mikrostomart_context.md → Database Schema)

### 1.2 Nowy projekt Vercel
- [ ] Utwórz projekt Vercel z repo `novik-code/mikrostomart`
- [ ] Ustaw nazwę projektu, np. `klinika-xyz-densflow`
- [ ] Odblokuj auto-deploy z brancha `main`

### 1.3 Zmienne środowiskowe w Vercel
Skopiuj `.env.local` z mikrostomart i **podmień** poniższe wartości:

```dotenv
# === SUPABASE (NOWY PROJEKT) ===
NEXT_PUBLIC_SUPABASE_URL=https://NOWE_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# === IDENTYFIKACJA ===
NEXT_PUBLIC_DEMO_MODE=false               # false = produkcja
NEXT_PUBLIC_APP_URL=https://klinika-xyz.pl
NEXT_PUBLIC_SITE_URL=https://klinika-xyz.pl

# === PRODENTIS / PMS ===
NEXT_PUBLIC_PMS_PROVIDER=prodentis        # lub 'standalone' jeśli bez Prodentis!
PRODENTIS_API_URL=http://[IP klienta]:3000
PRODENTIS_LOGIN=...
PRODENTIS_PASSWORD=...

# === GITHUB (BLOG/MEDIA) ===
GITHUB_OWNER=novik-code                   # lub nowa org jeśli osobne repo
GITHUB_REPO=mikrostomart                  # lub nazwa repo klienta
GITHUB_ACCESS_TOKEN=...

# === GOOGLE (CALENDAR OAUTH) ===
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://klinika-xyz.pl/api/employee/calendar/auth/callback
# (lub zostaw puste — NEXT_PUBLIC_APP_URL jest używane jako fallback)

# === SMSAPI ===
SMSAPI_TOKEN=...

# === RESEND (EMAIL) ===
RESEND_API_KEY=...

# === OPENAI ===
OPENAI_API_KEY=...

# === STRIPE ===
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# === PUSH NOTIFICATIONS (VAPID) ===
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...         # Nowe klucze dla nowego domenu!
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@klinika-xyz.pl

# === TELEGRAM ===
TELEGRAM_BOT_TOKEN=...

# === OPCJONALNE / POZOSTAJĄ TEŻ SAME ===
REPLICATE_API_TOKEN=...
YOUTUBE_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

> [!IMPORTANT]
> **VAPID keys muszą być NEW!** Generuj nową parę dla każdego klienta:  
> `npx web-push generate-vapid-keys`

> [!WARNING]  
> Jeśli klient **nie ma Prodentis** — ustaw `NEXT_PUBLIC_PMS_PROVIDER=standalone`.  
> Wtedy wizyty są zarządzane wyłącznie przez Supabase. Cron jobs dotyczące Prodentis będą early-return.

---

## 🎨 BLOK 2 — Dane kliniki (Brand Config)

### 2.1 Zaktualizuj brand w Supabase (site_settings)
Wrzuć do SQL Editora nowego Supabase:

```sql
INSERT INTO site_settings (key, value) VALUES
('brand', '{
  "name": "Klinika XYZ",
  "tagline": "Twój uśmiech to nasza pasja",
  "phone1": "123-456-789",
  "phone2": "987-654-321",
  "email": "kontakt@klinika-xyz.pl",
  "senderEmail": "noreply@klinika-xyz.pl",
  "streetAddress": "ul. Kwiatowa 5",
  "postalCode": "00-001",
  "city": "Warszawa",
  "cityShort": "Warszawa",
  "domain": "klinika-xyz.pl",
  "githubRepo": "mikrostomart",
  "mapsEmbedUrl": "https://www.google.com/maps/embed?pb=...",
  "legalEntity": {
    "name": "XYZ Dental Sp. z o.o.",
    "nip": "0000000000",
    "krs": "0000000000",
    "address": "ul. Kwiatowa 5, 00-001 Warszawa"
  }
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### 2.2 Ustaw Google Maps embed URL
- [ ] Idź do Google Maps → znajdź adres kliniki → Share → Embed a map → skopiuj URL z `src=`
- [ ] Wklej w pole `mapsEmbedUrl` (lub przez Admin Panel → Klinika → Kontakt gdy będzie UI)
- [ ] Alternatywnie: wstaw bezpośrednio do `site_settings` jak wyżej

### 2.3 Logo i zasoby graficzne
- [ ] Podmień `/public/logo-transparent.png` (logo PNG przezroczyste, ~200×80px)
- [ ] Podmień `/public/favicon.ico`
- [ ] Podmień `/public/og-image.jpg` (1200×630px, dla social share)
- [ ] Podmień `/public/apple-touch-icon.png`

> [!NOTE]
> Pliki logotypów są hardcoded w: `Navbar.tsx`, `Footer.tsx`, `SplashScreen.tsx`.  
> Docelowo przenieść do `brand.logoUrl` (Phase 11).

---

## 📜 BLOK 3 — Treści prawne (KLIENT MUSI DOSTARCZYĆ)

### 3.1 Regulamin
- [ ] Klient dostarcza treść regulaminu (HTML lub DOCX)
- [ ] Wgraj do `messages/pl/pages.json` → klucze `regulamin.sec2Body`, `sec4Body`, `sec6Body` itp.
- [ ] Zrób to samo dla EN/DE/UA jeśli klient potrzebuje wielojęzyczności
- [ ] **Sprawdź**: NIP, KRS, pełna nazwa spółki, adres, sąd rejestrowy

### 3.2 RODO / Polityka prywatności
- [ ] Klient dostarcza klauzulę informacyjną RODO
- [ ] Zaktualizuj `messages/pl/pages.json` → klucze `rodo.sec1Text`, `rodo.sec2Li1`, `rodo.sec2Li2` (email, telefon, adres ADO)
- [ ] Zaktualizuj adres email w `rodo.sec2Li1` → adres ABI/IOD kliniki

### 3.3 Polityka cookies (opcjonalnie)
- [ ] Zaktualizuj jeśli klient chce własną politykę cookies

### 3.4 Zgody medyczne (Intake PDF)
- [ ] Podmień pliki zgód: `public/consent-form-xxx.pdf` (jeśli wymagane przez klinikę)
- [ ] Consent forms są powiązane z `patient_intake_submissions.pdf_url`

---

## 🤖 BLOK 4 — Baza wiedzy AI i cennik

### 4.1 AI Knowledge Base
- [ ] Przygotuj KNOWLEDGE_BASE dla nowej kliniki (Markdown, ~15-20KB)
  - Zespół lekarzy + biogramy
  - Usługi i zabiegi
  - Technologie w klinice
  - FAQ
  - **Cennik** (orientacyjny, zaktualizowany)
  - Historia i wartości kliniki
- [ ] Wgraj przez panel pracownika: `/pracownik` → Email AI → 📚 Baza wiedzy → Edytuj → Zapisz
- [ ] Alternatywnie SQL: `INSERT INTO site_settings (key, value) VALUES ('ai_knowledge_base', '...')`

### 4.2 Cennik AI chatbota
- [ ] Cennik jest częścią KNOWLEDGE_BASE (sekcja `## CENNIK`)
- [ ] Zaktualizuj ceny i zabiegi na aktualne dla kliniki

### 4.3 Specjaliści w formularzu rezerwacji
- [ ] Dodaj lekarzy do tabeli `employees` z polem `show_in_booking = true`
- [ ] Ustaw `position = 'Lekarz'` lub `'Higienistka'` dla odpowiednich pracowników

---

## 🔌 BLOK 5 — Integracje zewnętrzne

### 5.1 Prodentis
- [ ] Potwierdź IP/URL serwera Prodentis kliniki
- [ ] Wgraj `PRODENTIS_API_URL` w Vercel
- [ ] Test: Admin Panel → Integracja PMS → Sprawdź połączenie (health check)
- [ ] Ustaw `prodentis_id` dla każdego lekarza w DB (`employees.prodentis_doctor_id`)

### 5.2 SMSAPI
- [ ] Klient zakłada konto SMSAPI.pl lub dostarcza token do istniejącego
- [ ] Wgraj `SMSAPI_TOKEN` w Vercel
- [ ] Test: wyślij testowy SMS przez Admin Panel

### 5.3 Email (Resend)
- [ ] Klient dostarcza domenę email lub używa istniejącej
- [ ] Dodaj domenę w Resend Dashboard i zweryfikuj DNS
- [ ] Wgraj `RESEND_API_KEY` + ustaw `FROM_ADDRESS` w emailService.ts (lub brand.senderEmail)

### 5.4 Stripe (jeśli sklep/płatności)
- [ ] Klient zakłada konto Stripe
- [ ] Wgraj `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Skonfiguruj webhook endpoint w Stripe Dashboard: `https://klinika-xyz.pl/api/stripe/webhook`

### 5.5 Google Calendar OAuth
- [ ] Zarejestruj aplikację w Google Cloud Console
- [ ] Dodaj `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] Dodaj redirect URI: `https://klinika-xyz.pl/api/employee/calendar/auth/callback`
- [ ] `GOOGLE_REDIRECT_URI` ustaw w Vercel (lub zostaw puste — `NEXT_PUBLIC_APP_URL` jest fallback)

### 5.6 Google Reviews / Maps
- [ ] Wgraj `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Zidentyfikuj `GOOGLE_PLACE_ID` kliniki w Google Maps

### 5.7 Telegram
- [ ] Klient tworzy bota przez @BotFather
- [ ] Wgraj `TELEGRAM_BOT_TOKEN`
- [ ] Skonfiguruj chat ID grup w Admin Panel → Telegram

### 5.8 Social Media (opcjonalnie)
- [ ] Facebook/Instagram: nowy Facebook App dla kliniki, OAuth
- [ ] TikTok: osobna aplikacja TikTok Developers

---

## 👤 BLOK 6 — Konta i użytkownicy

### 6.1 Admin Supabase Auth
- [ ] Utwórz konto admin w Supabase Authentication
- [ ] Dodaj wpis do `user_roles`: `(user_id, role='admin')`

### 6.2 Konta pracowników
- [ ] Utwórz konta w Supabase Auth dla każdego pracownika
- [ ] Dodaj do `user_roles` z `role='employee'`
- [ ] Dodaj do tabeli `employees` (name, position, push_groups, itp.)
- [ ] Ustaw `show_in_booking = true` dla lekarzy i higienistek

### 6.3 Testowe konto pacjenta
- [ ] Zarejestruj testowego pacjenta przez `/strefa-pacjenta/register`
- [ ] Potwierdź link `prodentis_id`

---

## 🗄️ BLOK 7 — Migracje bazy danych

### Zasada numerowania
- [ ] **ZAWSZE** numeruj migacje sekwencyjnie: `100_xxx.sql`, `101_xxx.sql`, ...
- [ ] **ZAWSZE** umieszczaj w katalogu `supabase_migrations/` (NIE w `supabase/migrations/`)
- [ ] Wykonuj migacje na **ODRĘBNYM projekcie Supabase** klienta

> [!CAUTION]
> **Nie kopiuj bezpośrednio bazy Mikrostomart!** Nowy klient dostaje czystą bazę z migracjami od 003 do 099. Dane pilentów Mikrostomart tam nie powinny trafić.

---

## ✅ BLOK 8 — Testy przed go-live

### 8.1 Smoke tests
- [ ] Strona główna się ładuje bez błędów JS
- [ ] Formularz rezerwacji pobierz lekarzy z DB
- [ ] Formularz rezerwacji = wyświetla dostępne sloty (Prodentis lub Standalone)
- [ ] SMS testowy działa
- [ ] Email testowy działa
- [ ] Admin Panel ładuje się i działa
- [ ] Panel pracownika: logowanie, harmonogram, zadania
- [ ] Strefa pacjenta: rejestracja, logowanie, historia wizyt

### 8.2 Testy AI
- [ ] Chat assistant na stronie głównej — odpowiada po polsku
- [ ] Cennik chatbot — podaje prawidłowe ceny z nowej KB
- [ ] Email AI — generuje drafty

### 8.3 SEO check
- [ ] `https://klinika-xyz.pl/sitemap.xml` — dostępny, zawiera nowe URL
- [ ] `<title>` i `<meta description>` zawierają nazwę kliniki (nie "Mikrostomart")
- [ ] `robots.txt` — nie blokuje indeksowania

### 8.4 PMS health check
- [ ] Admin Panel → Integracja PMS → przycisk "Sprawdź połączenie" = ✅ OK

---

## 📋 LISTA RZECZY KTÓRE KLIENT MUSI DOSTARCZYĆ

Zbierz te informacje PRZED rozpoczęciem onboardingu:

```
□ Pełna nazwa kliniki
□ Adres (ulica, nr, kod pocztowy, miasto)
□ Telefon główny + opcjonalnie dodatkowy
□ Email kontaktowy + email do wysyłki (lub dostęp do domeny email)
□ Strona www docelowa (domena)
□ Logo (PNG z przezroczystym tłem, min. 400px szerokości)
□ Favicon (256×256px)
□ Zdjęcie OG (1200×630px)
□ Regulamin gabinetu (dokument Word lub HTML)
□ Klauzula RODO / informacja o ADO (pełna nazwa sp., NIP, adres ADO, kontakt IOD)
□ Cennik zabiegów (PDF lub Excel lub zwykła lista)
□ Lista lekarzy + biogramy (do KB AI)
□ Zdjęcia zespołu (opcjonalnie do KB)
□ Dostęp do Prodentis (IP serwera, login/hasło) — jeśli klient ma Prodentis
□ Konto/token SMSAPI (lub chęć założenia)
□ Konto Google Cloud (dla Calendar OAuth, Maps API, Reviews API)
□ Konto Facebook (jeśli social media auto-post)
□ Konto Stripe (jeśli sklep/płatności)
□ Konto TikTok Developers (jeśli TikTok auto-post)
```

---

## 🔧 ZNANE PROBLEMY / TODO przy kolejnych klientach

### Phase 11 — Deferred (zrób przy pierwszym kliencie)

| Zadanie | Opis | Trudność |
|---------|------|---------|
| `prodentis_id` → `external_id` | Rename kolumny w sms_reminders, online_bookings, patients itp. | 🔴 High risk — DB migration z danymi produkcji |
| Logo z DB | `brand.logoUrl` zamiast hardcoded `/logo-transparent.png` | 🟡 Medium |
| Cennik na stronach oferty | Admin UI dla cen na implantologia/leczenie-kanalowe itp. | 🟡 Medium (2-3 dni dev) |
| Regulamin/RODO w Admin UI | Edytor legalnych bloków HTML z poziomu panelu | 🔴 Trudne (rich text editor + i18n) |
| Ścieżki URL (`/pracownik`, `/admin`) | Teraz hardcoded — docelowo konfigurowalny prefix | 🟡 Medium |
| mapsEmbedUrl w Admin UI | Teraz tylko przez Supabase SQL Editor | 🟢 Easy |
| Multi-branch deployment | Jeden repo, jeden branch = jeden klient | 🔴 Architecture decision |

### Znane ograniczenia architektury
- **Jeden repo → Wszyscy klienci na tym samym kodzie**: każde bugfix/feature idzie do wszystkich
- **Cron jobs**: `vercel.json` ma 17 cron jobów — każdy klient ma taki sam harmonogram (nie konfigurowalny z panelu)
- **Telegram bot**: jeden bot per instalacja — klienci muszą mieć osobne boty

---

## 📞 Kontakt techniczny

- **Dev lead**: Marcin Nowosielski
- **Repo**: https://github.com/novik-code/mikrostomart
- **Demo**: https://demo.densflow.ai
- **Docs**: `mikrostomart_context.md` (~5300 linii)

---

*Wygenerowano: 2026-03-30 | Wersja architektury: Phases 1-10 complete*
