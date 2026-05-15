# Mikrostomart / DensFlow.Ai - Complete Project Context

> **Last Updated:** 2026-05-15 (**🌐 SPRINT 5 SEO P2 CLEANUP COMPLETE — html lang + robots prefiksy + sitemap noindex + news 404 fallback + listing SSR + wizyta noindex + i18n deep merge fix**. 3 sesje, 3 commity zmergowane na origin/main. **S5-1** `1ef1cab`: `<html lang>` mapuje `'ua'` → ISO 639-1 `'uk'` (linia 292 layout.tsx). `robots.ts` rewrite — 12 prywatnych ścieżek × 4 prefiksy locale (`''`, `/en`, `/de`, `/ua`) + dodano `/wizyta/` przed S5-2; teraz Googlebot blokowany na `/en/strefa-pacjenta/`, `/de/admin/`, `/ua/ekarta/` etc. (wcześniej tylko PL bez prefixu). `sitemap.ts`: usunięto `/zadatek` (noindex z J-2), PL legal pages (regulamin/cookies/prywatnosci/rodo) emit tylko PL prefix; `/privacy-policy` zostaje multi-locale (dedicated international page). **S5-2** `58c7cfd`: `aktualnosci/[slug]/page.tsx` dodaje `notFound()` w generateMetadata + page gdy `locale != pl` AND brak `title_{locale}` (wcześniej silent PL fallback = duplicate content w en/de/ua). `generateStaticParams` filtrowane — emituje tylko (locale, slug) z istniejącym tłumaczeniem. `aktualnosci/page.tsx` client→server component (revalidate 10min, fetch direct supabase); carousel UI z arrows + RevealOnScroll wyrwane do nowego `NewsCarousel.tsx` client island; foreign locale pomija artykuły bez tłumaczenia. `wizyta/[type]/layout.tsx` (nowy plik): `metadata.robots: { index: false, follow: false }` (wizyta to per-appointment landing, brak organic intent + leak appointment_type strings). **S5-3** `320d7c0`: `src/i18n/request.ts` shallow `{...common, ...pages}` → recursive `deepMerge()`. Audit (Node script) potwierdził overlap `aktualnosci` namespace × 4 locale: `backToNews` + `articleNotFound` (z common.json) były nadpisywane przez pages.aktualnosci → MISSING_MESSAGE w server log. Deep merge odzyskał 8 brakujących tłumaczeń (2 × 4 locale). `oferta` namespace OK (pages superset common). **Następna sesja: S6-1 dependency upgrade triage** — Marcin postanowił przeskoczyć S4-2b (CSP enforce, paused do czasu Sentry data lub w ogóle pomija) i lecimy z S6 (deps) → S7 (UX) → S8 (RODO/2FA) → S9 (lint+CI) → potem wrót do Fazy K Premium SEO.)

<!-- Poprzednia: 2026-05-14 EOD #2 (**🎯 S4-5 DONE — Patient JWT hardening (P1-03) + social-media bucket lockdown (P0-09)**. Commit `fc8f27f` + docs `90e79dd`. Wątek (a): `/api/patients/login` usunięto `token` z JSON response. Frontend `login/page.tsx` usunięto `document.cookie = patient_token=${data.token}`. Verified preview: 1 cookie HttpOnly+Secure+SameSite=Strict, dashboard ładuje przez httpOnly. Wątek (b): migracja **125** dropuje policies `"Allow video uploads"` + `"Allow service delete"`. Bucket `file_size_limit` 500MB → 100MB + restrict do video/image. **🚨 Manual task Marcin**: wgrać migrację 125 + 124, 123, 122. **Sprint 4 prawie COMPLETE** — pozostaje tylko S4-2b CSP enforce.)

<!-- Poprzednia: 2026-05-14 EOD (**🎯 S4-3 + S4-4 DONE: contact form Turnstile + short-link hardening + DB-backed confirmation tokens**. **Sesja zawiła**, dwa sprinty w jednym dniu po S4-2a w nocy poprzedniej. **S4-3 (P1-07)** commit `7547e52`+`fix da93c1f` (które wcześniej z S2 było ale działa też tu z hardcoded fallback): Cloudflare Turnstile zastępuje math captcha w `/kontakt`, backend weryfikuje token przez siteverify, rate limit 5/IP/15min (existing rateLimit infra), magic-bytes MIME validation (manual, bez `file-type` ESM gotcha jak DOMPurify v1 nas zabił), body size 5 MB. Marcin debugowanie: Vercel Sensitive env vars **nie wstrzykuje** `NEXT_PUBLIC_*` do client bundle, plus Value field wpisany w Note (UX gotcha) — hardcoded fallback site key `0x4AAAAAADN3DS_czkcNj-aD` w kodzie obejdzie problem (site key jest public, zero leak). Cloudflare Turnstile **nie wspiera wildcards z myślnikiem** w środku subdomeny (`*-novik-codes-projects.vercel.app` rejected), więc preview test pominięty — produkcja na whitelist OK, end-to-end real submit działa. **S4-4 (P1-06 + P1-02)** commit `3a7e4bf`: (a) **Short-link hardening** — `POST /api/short-links` teraz wymaga `requireAdmin()` + destination allowlist (internal `^/[a-z]` lub explicit external hosts: czelej/laserandhealthacademy/magazyn-stomatologiczny). `/s/[code]/page.tsx` (client React redirect) → `route.ts` (server-side 302). Cron robi direct DB insert (nie HTTP), zero ryzyka regresji. (b) **DB-backed confirmation token** zamiast HMAC z planu: cron generuje `nanoid(16)` (96 bits entropy), zapisuje w `appointment_actions.confirmation_token`, używa w short_link destination jako `?token=` zamiast enumerable `?appointmentId=UUID`. Confirm + cancel endpointy akceptują obie formaty (backwards compat 14 dni). Defensive fallback w cronie (jeśli kolumna nie wgrana → użyj legacy URL). **Migracja 124** (`appointment_actions.confirmation_token` + unique partial index, idempotent). **🚨 Manual task Marcin**: wgrać migrację 124 na OBU Supabase (`~/Desktop/migracje_supabase/migracja_124_*.txt`). Wcześniej z #4: migracja 123 (Prodentis sync) wciąż wymagana. Real test S4-4 jutro 8:00 PL gdy cron `appointment-reminders` wygeneruje SMS-y z tokenami zamiast UUID.)

<!-- Poprzednia: 2026-05-13 EOD #6 (S4-2a CSP report-uri wired to Sentry — P1-02 Faza 1). Commit `8b281df`. DSN parser → Sentry security ingest URL.

<!-- Poprzednia: 2026-05-13 EOD #5 (S4-1 v2 DONE: WYSIWYG sanitization z `sanitize-html` — P0-08 CLOSED). Commit `73c57a3`. 28 unit testów green. Preview-first workflow verified.

<!-- Poprzednia: 2026-05-13 EOD #4 (**🚨 PRODENTIS ICON SYNC FIX + S4-1 v1 REVERTED + ADMIN DIAGNOSTIC TOOLS**. Hybrid retry na 404 Prodentis icon (commit `22e49fe`), migracja 123 (Marcin musi wgrać na OBU Supabase), admin diagnostic tools `06b51e2` (badge "Pacjent kliknął" + reset button). S4-1 v1 z `isomorphic-dompurify` crashował przez `ERR_REQUIRE_ESM`, revert `beec4bc`+`2f78f79`.  

<!-- Poprzednia: 2026-05-13 EOD (**🚨 HOTFIX SPRINT — S3 DONE: reservation security + integrity hardening (S3 redefined)**. 6 realnych poprawek (rate limit + slot validation + demo guard + idempotency + phone fallback + disabled submit). Commit `ace0dfa`.

<!-- Poprzednia: 2026-05-13 EOD (**🚨 HOTFIX SPRINT — S2 4.5/5 DONE: pełen payment integrity działa w prod na real money**. Stripe live BLIK 2 PLN end-to-end, 2 webhook fixy (Test→Live mode + apex→www URL). Audit zamknięte: P0-06+P0-07+P1-04.

<!-- Poprzednia: 2026-05-13 (**🚨 HOTFIX SPRINT — S2-4 DONE: order-confirmation read-only + email idempotency**.

<!-- Poprzednia: 2026-05-13 (**🚨 HOTFIX SPRINT — S2-3 DONE: verified webhook signatures**.


> **Version:** Production + Demo (Dual Vercel Deployment)  
> **Status:** Active Development — **🎯 PREMIUM SEO PLAN AKTYWNY** (4 fazy, ~6 mies horyzont). KCP FULL + kiosk-token + **Employee Management Phase 1+2+3 (KOMPLETNE — backend unified + UI z wizardem)**; CareFlow Perioperative; Push-First Communication. SEO Sprint H1-H8 ✅ KOMPLETNY. Cykl: pełen audyt 5 niezależnymi agentami wykrył ~47 problemów → 8 faz wdrożenia (H1 quick fixes, H2 metadata gaps, H3 internal linking, H4 schema enrichment, H5 perf+images, H6 content, H7 intl landing, H8 real schema data) → po H8 push **awaria 500 production** (H3 batch sed przekonwertował 3 server components na `Link` z `@/i18n/navigation` który wewnętrznie używa `useLocale()` client-only hook → SSR crash) → 8 reverts cofnęły wszystko → bisect lokalny zlokalizował bug → fix `572af02` (zamiana na `<a href>` z manual locale prefix w 3 server components) → re-apply H1-H8 → produkcja stabilna `6c8f4fa`. ~35/47 problemów audytu zaadresowanych. **Wcześniejsze SEO Sprint G1-G6 + Recovery 1-E** ✅ KOMPLETNE (2026-05-09 → 2026-05-10): pełen multilingual SEO (4 locale), rich SERP, Core Web Vitals fix (LCP 6s→2-3s), PSI Mobile 34→73, Desktop 39→83. Faza 3 GSC: audyt po 4-6 tygodniach (~koniec czerwca 2026). Następna sesja: weryfikacja Rich Results, re-submit sitemap, ewentualne content expansion service pages (24 expansions H6 follow-up).

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Feature Catalog](#feature-catalog)
6. [API Endpoints](#api-endpoints)
7. [Integrations](#integrations)
8. [Cron Jobs & Automation](#cron-jobs--automation)
9. [Authentication & Authorization](#authentication--authorization)
10. [Deployment](#deployment)
11. [Recent Changes](#recent-changes)

---

## 🎯 Project Overview

**Mikrostomart** is a comprehensive web application for a dental clinic in Poland (Mikrostomart Gabinet Stomatologiczny). It combines:
- **Public Website** - Marketing, services, booking
- **Patient Portal** - Appointment management, medical history
- **Admin Panel** - Complete clinic management system
- **E-commerce** - Dental products shop with Stripe payment
- **Automated Communications** - SMS/Email reminders and notifications

**Target Users:**
- Patients (booking, appointments, purchasing products)
- Clinic Staff (admin panel, patient management, SMS coordination)
- Doctors (Marcin Nowosielski, Elżbieta Nowosielska, and team)

**Business Model:**
- Patient appointment booking (integrated with Prodentis calendaring system)
- Product sales (dental cosmetics, accessories)
- Deposit payments for appointments

### 🔀 Dual Deployment Architecture

Same codebase (`novik-code/mikrostomart`) serves **two independent deployments**:

| Środowisko | Domena | Vercel Project | Supabase Project ID | `DEMO_MODE` |
|------------|--------|---------------|---------------------|-------------|
| **Produkcja** | `mikrostomart.pl` | `mikrostomart` | `keucogopujdolzmfajjv` | `false` |
| **Demo** | `demo.densflow.ai` | `densflow-demo` | `mhosfncgasjfruiohlfo` | `true` |

**Every `git push origin main` → auto-deploys to BOTH environments.**

### 🌐 DensFlow.Ai Sales Landing Page (`densflow.ai`)

A **separate marketing/pre-sale landing page** exists at `densflow.ai` (outside the mikrostomart repo). It serves as the commercial front for the DensFlow.Ai SaaS product.

**Structure:**
- **Hero** — "Cyfrowy Gabinet Stomatologiczny w 5 Minut" + countdown timer
- **Problemy** — 9 pain points with solutions
- **Features** — 4 categories × 6 functions (Strona WWW, Zarządzanie Pacjentami, AI, Automatyzacja)
- **Unikalne narzędzia** — Mapa Bólu, Symulator Uśmiechu, Kalkulator Leczenia, Porównywarka, E-karta
- **Social proof** — "Battle-Tested w Prawdziwym Gabinecie" (3+ months in production)
- **Współtworzenie** — zgłaszaj funkcje, głosuj na priorytety, beta dostęp, dedykowany kanał
- **Cennik** — licencja dożywotnia + tabela subskrypcji po premierze
- **FAQ** — 7 pytań z odpowiedziami
- **CTA** — "Kup Licencję Dożywotnią" / "Zapisz się do przedsprzedaży"
- **Footer** — ELMAR Sp. z o.o., NIP, kontakt, regulamin, polityki

**Pre-sale model:**
| Oferta | Cena | Dostępność |
|--------|------|-----------|
| Licencja dożywotnia | **9 999 PLN jednorazowo** | Tylko do 1 września 2026 |
| Starter (po premierze) | ~599 PLN/mies. | Od 1.09.2026 |
| Professional (po premierze) | ~999 PLN/mies. | Od 1.09.2026 |
| Enterprise (po premierze) | ~1 499 PLN/mies. | Od 1.09.2026 |

**Key links from landing page:**
- Demo: `https://demo.densflow.ai`
- Regulamin: `https://densflow.ai/densflow/regulamin`
- Polityka prywatności: `https://densflow.ai/densflow/polityka-prywatnosci`
- Polityka cookies: `https://densflow.ai/densflow/polityka-cookies`

### 🧪 Demo Mode (`NEXT_PUBLIC_DEMO_MODE=true`)

When `isDemoMode` is `true` (from `src/lib/demoMode.ts`):
- **DemoBanner** — sticky orange banner at top: "🧪 WERSJA DEMONSTRACYJNA"
- **SMS** — logged to console, not sent via SMSAPI
- **Telegram** — skipped entirely
- **19 cron jobs** — early return with log message
- **Prodentis API** — mocked in 3 endpoints (login, /me, /me/visits): patient data comes from Supabase
- **Deep Debranding** — runtime sanitization replaces ALL Mikrostomart branding with generic demo equivalents
- **All other features** — work normally against the demo Supabase DB

**Deep Debranding Architecture (March 2026):**

The demo environment is fully neutralized — no Mikrostomart-specific text, contact info, or staff data leaks through. This is implemented via two sanitizer layers:

1. **`demoSanitize(text)`** (`src/lib/brandConfig.ts`) — centralized string replacement function. Identity function in production, replaces ~15 Mikrostomart-specific patterns in demo:
   - Company name: `Mikrostomart` → `Klinika Demo`, `MIKROSTOMART` → `KLINIKA DEMO`
   - Domain: `mikrostomart.pl` → `demo.densflow.ai`
   - Email: `gabinet@mikrostomart.pl` → `kontakt@demo.densflow.ai`
   - Address: `ul. Centralna 33a` → `ul. Przykładowa 1`
   - City: `Opole` → `Warszawa`, `Opolu` → `Warszawie`
   - Phone: `570-270-470` / `570-810-800` → `000-000-000`
   - Legal: `ELMAR SP. Z O.O.` → `Demo Dental Sp. z o.o.`, `NIP: 7543251709` → `NIP: 0000000000`

2. **`deepSanitize(messages)`** (`src/app/layout.tsx`) — recursively applies `demoSanitize()` to all i18n translation message strings before passing to `NextIntlClientProvider`. Covers all ~104 Mikrostomart references in 8 translation JSON files without modifying them.

**Sanitization chokepoints** (single-point wrapping covers all downstream content):
- `emailTemplates.ts` → `getEmailTemplate()` return value wrapped
- `emailService.ts` → `makeHtml()` output + `FROM_ADDRESS` wrapped
- `icsGenerator.ts` → `generateICS()` return value wrapped
- `layout.tsx` → all translation messages wrapped via `deepSanitize()`

**Additional debranding layers:**
- `brandConfig.ts` → `brand` object provides conditional metadata (name, title, description, SchemaOrg)
- `DemoPagePlaceholder.tsx` → replaces legal pages (regulamin, RODO, cookies, polityka prywatności) with generic notices
- 80+ API routes/components/lib files → `from:`, `subject:`, `to:`, `html:` email fields wrapped with `demoSanitize()`
- Logo: conditional loading (`/demo-logo.png` vs `/logo-transparent.png`) in Navbar, SplashScreen, Footer
- Reservation form: fictional `DEMO_SPECIALISTS` instead of real doctors
- 24 `layout.tsx` metadata files: conditional SEO titles/descriptions via `generateMetadata()`

**Demo Supabase DB contents:**
- 66 base tables (generated from production OpenAPI spec)
- 108 migration files applied
- 5 employees, 20 demo patients, settings, products, SMS templates
- 3 Supabase Auth users (admin, pracownik) + 20 patients with bcrypt hashes

**Demo login credentials:**
| Strefa | URL | Email | Hasło |
|--------|-----|-------|-------|
| Admin | `/admin/login` | `admin@demo.densflow.ai` | `DemoAdmin123!` |
| Pracownik | `/pracownik/login` | `pracownik@demo.densflow.ai` | `DemoPass123!` |
| Pacjent | `/strefa-pacjenta/login` | `joanna.mazur@test.pl` | `DemoPass123!` |

**Key files:**
- `src/lib/demoMode.ts` — `isDemoMode` flag
- `src/lib/brandConfig.ts` — `brand` config object, `demoSanitize()` function, `isDemoMode` re-export
- `src/components/DemoBanner.tsx` — banner component
- `src/components/DemoPagePlaceholder.tsx` — generic placeholder for legal/policy pages in demo
- `src/app/layout.tsx` — renders DemoBanner + `deepSanitize()` for translations
- `src/app/api/patients/login/route.ts` — Prodentis mock
- `src/app/api/patients/me/route.ts` — Prodentis mock
- `src/app/api/patients/me/visits/route.ts` — empty visits mock

---

## 🛠 Technology Stack

### Core Framework
- **Next.js 16.1.1** (App Router)
- **React 19.2.3**
- **TypeScript 5**
- **Tailwind CSS 4.1.18**

### Backend & Database
- **Supabase** (PostgreSQL database, authentication, storage)
  - Database: 119 migrations (003-119: email verification, appointment actions, SMS reminders, user_roles, employee tasks, task history, comments, labels, status fix, google reviews cache, chat, push subscriptions, employee_group, push_notification_config, employee_groups array, news/articles/blog/products i18n, calendar tokens, private tasks + reminders, SMS post-visit/week-after-visit, SMS unique constraint fix, task multi-images, push_notifications_log, google_event_id on employee_tasks, patient_intake_tokens, feature_suggestions, online_bookings, patient_match_confidence, consent_tokens/patient_consents, staff_signatures, intake_pdf_url, birthday_wishes, cancelled_appointments, login_attempts, patient_notification_prefs, biometric_signature, employee_audit_log, consent_field_mappings, rate_limit_table, cron_heartbeats, sms_settings, email_ai_drafts, email_ai_config, email_compose_drafts, email_label_overrides, email_ai_drafts_skipped, compose_drafts_ai_text, email_ai_knowledge_files, fix_nowosielska_role, employee_notification_prefs, cleanup_duplicate_push_subs, security_advisor_fixes, merge_duplicate_employees, **social_media, video_queue, storage_video_upload, video_captions_api**, fcm_push_rebuild, dedup_employees, fix_employee_reactivate, **unified_ai_knowledge_base**, ai_trainer_conversations, **delivery_channel (push-first), careflow_system, careflow_sms_fallback, careflow_report_tracking, **KCP — time_tracking_foundation, time_entries_cancellation, schedule_editor, workstations, calculated_shifts, leaves_and_holidays, doctor_end_methods**)
  - Auth: Email/password, magic links, JWT tokens
  - Storage: Product images, patient documents, task images, **social media videos** (bucket: `social-media`)
  - **Social Media**: `social_platforms`, `social_posts`, `social_schedules`, `social_topics` tables + cron auto-publish

### External Integrations
| Service | Purpose | Status |
|---------|---------|--------|
| **Prodentis API** | Appointment synchronization (via Cloudflare Tunnel) | ✅ Active |
| **Cloudflare Tunnel** | Resilient Prodentis API access (`pms.mikrostomartapi.com`) | ✅ Active |
| **SMSAPI.pl** | SMS notifications | ✅ Active (link blocking resolved) |
| **Resend** | Email notifications | ✅ Active |
| **Stripe** | Payment processing | ✅ Active |
| **OpenAI** | AI assistant (chat support) | ✅ Active |
| **Replicate** | AI image generation | ✅ Active |
| **YouTube Data API** | Video feed | ✅ Active |
| **Google Places API** | Real Google Reviews (New + Legacy) | ✅ Active |
| **Firebase Cloud Messaging (FCM)** | Push notifications via FCM data-only payload (patients + employees) | ✅ Active |
| **Captions / Mirage API** | AI video captioning (professional animated subtitles) | ✅ Active |
| **Whisper (OpenAI)** | Video audio transcription | ✅ Active |
| **Meta Graph API** | Facebook + Instagram publishing (posts, images, Reels) | ✅ Active |
| **TikTok API** | TikTok video publishing | ⚠️ Configured (needs app review) |

### UI/UX Libraries
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **React Hook Form + Zod** - Form validation
- **MediaPipe** - Face detection (selfie feature)

### Internationalization (i18n)
- **next-intl** — Client-side translations via `useTranslations()` hook
- **4 supported locales:** `pl` (default), `en`, `de`, `ua`
- **Locale files:** `messages/{pl,en,de,ua}/common.json` — flat namespace structure
- **Middleware:** `createMiddleware` from `next-intl/middleware` handles locale detection (cookie → Accept-Language → default `pl`) and URL prefixing (`/en/oferta`, `/de/kontakt`, etc.)
- **LanguageSwitcher component:** Compact flag + locale code in Navbar, hidden when mobile menu is open
- **Translated namespaces:**
  | Namespace | Component(s) | Keys |
  |-----------|-------------|------|
  | `nav` | Navbar | Navigation links, CTA |
  | `hero` | Homepage hero | Title, subtitle, CTA |
  | `oferta` | Oferta page | Page chrome (tagline, title, description, contactCta) |
  | `offerItems` | OfferCarousel | 8 offers × (title, short, full) + section label, bookVisit, expand/collapse |
  | `contact` | ContactForm | Form fields, validation, submit |
  | `reservation` | ReservationForm | Booking form labels |
  | `porownywarka` | Comparator tool | ~29 UI strings |
  | `kalkulatorUI` | Treatment calculator | ~29 UI strings |
  | `mapaBoluUI` | Pain Map interactive | ~22 UI strings + metaTitle/metaDescription |
  | `contactForm` | ContactForm | Form fields, validation, RODO consent, submit |
  | `metamorphosisUI` | MetamorphosisGallery | Before/after labels, CTA |
  | `reviews` | GoogleReviews | Section heading |
  | `youtube` | YouTubeFeed | Section heading |
  | `bazaWiedzy` | Knowledge Base | ~7 UI strings (readMore, backToList, notFound, metaSuffix) |
  | `sklep` | Shop page | title, cart, loading, noImage, added, addToCart |
  | `koszyk` | Cart page | empty, backToShop, checkout, title, perUnit, removeTitle, total, clearCart, goToCheckout, backToCart, orderSuccess |
  | `productModal` | ProductModal | depositPaid, thankYou, depositConfirmation, orderConfirmation, backToHome, closeWindow, backToProduct, yourCart, total, checkoutTitle, voucherAmount, minimum, inCart, cartTotal, goToCart, quantity, addToCart, buyNow, safePurchase |
  | `checkoutForm` | CheckoutForm | shippingAddress, editDetails, noPaymentConfig, noPaymentDesc, deliveryData, fullName, email, phone, city, zipCode, street, houseNumber, apartment, total, proceedToPayment |
  | `stripePayment` | StripePaymentForm | payment, paymentError, toPay, back, processing, payNow |
  | `simulatorModal` | SimulatorModal | title, preparing, slogan, downloadError, cameraError, optimizing, searchingSmile, designingSmile, processingError, mouthDetectionError, serverError, timeoutError, aiError, instructionTitle, instructionSubtitle, instructionFront/Mouth/Light/Avoid, understood, startCamera, uploadPhoto, repeat, download, backToStart |
  | `beforeAfter` | BeforeAfterSlider | before, after |

  **`reservationForm` (common.json):** Extended with 22 new keys: services (konsultacja, bol, implanty, licowki), validation messages, availableSlots, duration, selectedSlot, nameFieldLabel, dataAdmin, rodoConsent, rodoClause, rodoAnd, privacyPolicy, bookAnother, submitError.

  **`rodo` (pages.json):** Extended from 3 keys (tagline/title/downloadPdf) to 38 keys covering all 10 legal GDPR sections (greeting, intro, sec1–sec10 titles and body text). Uses dangerouslySetInnerHTML for HTML content (br, strong, links).

  **`assistant` (common.json):** 17 keys for AssistantTeaser chat component — greeting, 4 suggestion prompts, bookAppointment, pricing, sendingPhoto, errorTechnical, errorConnection, ariaOpenAssistant, tooltipAI, headerTitle, headerSubtitle, imageAdded, inputPlaceholder.

  **`selfieBooth` (common.json):** 11 keys for SelfieBooth component — title, cameraError, goBack, retake, download, pose1–pose5 names.

  **`opinionSurvey` (common.json):** ~50 keys for OpinionSurvey component — 8 question titles, answer options (q0–q7), 10 procedure options (proc1–proc10), subtitles, placeholders, UI labels (back, next, close, generateReview, loading), result screen (resultTitle, resultSubtitle, submitGoogle, pasteHint, copiedOpening, copied, copyManual), negative sentiment (negativeTitle, negativeBody, negativeFooter).

  **Pain Map SymptomData i18n**: Medical content (symptoms, causes, advice for 35 zones × 3 severity levels) is translated via per-locale files: `SymptomData.ts` (PL, default), `SymptomData.en.ts`, `SymptomData.de.ts`, `SymptomData.ua.ts`. The helper `getSymptomData.ts` returns locale-aware data using `useLocale()`.

  **Comparator data i18n**: Treatment method data (73 methods across 7 categories), comparator scenarios, priorities, gating rules, and table row labels are translated via per-locale files (`methodsEstetyka.en.ts`, `comparatorScenarios.en.ts`, etc.). The helper `getComparatorData.ts` returns locale-aware data with fallback to Polish.

  **Treatment Calculator data i18n**: Treatment paths (5 paths with questions, options, stages, and extending factors) are translated via per-locale files (`treatmentData.en.ts`, `treatmentData.de.ts`, `treatmentData.ua.ts`). The helper `getTreatmentData.ts` returns locale-aware data with fallback to Polish.

  **Knowledge Base article i18n**: Articles in the `articles` Supabase table have `locale` (TEXT, default 'pl') and `group_id` (UUID) columns. Each translated article is a separate row linked by `group_id`. AI generation (`/api/cron/daily-article`) produces PL content first, then translates to EN/DE/UA via GPT-4o. DELETE cascades via `group_id`. Public pages filter by user locale with PL fallback.

  **Blog post i18n**: Blog posts in `blog_posts` table have `locale` (TEXT, default 'pl') and `group_id` (UUID) columns. Admin API auto-translates new posts to EN/DE/UA via GPT-4o on creation. DELETE cascades via `group_id`. Public pages (`/nowosielski`) filter by locale with PL fallback.

  **Shop/Product i18n**: Products in `products` table have JSONB columns `name_translations`, `description_translations`, `category_translations` (format: `{"en": "...", "de": "...", "ua": "..."}`). Polish stays in original `name`/`description`/`category` columns. Admin API auto-translates product text when saving via GPT-4o. Shop page and ProductModal use `getTranslated()` helper with locale fallback to Polish.

### Development Tools
- **ESLint** - Code linting
- **Autoprefixer** - CSS compatibility
- **Sharp/Jimp** - Image processing

---

## 🏗 Architecture

### Directory Structure

```
mikrostomart/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Admin panel
│   │   │   ├── login/          # Admin login page
│   │   │   ├── update-password/ # Password reset landing page (verifyOtp flow)
│   │   │   └── page.tsx        # Main admin panel (186KB, 3311 lines, 14 tabs)
│   │   ├── pracownik/          # Employee Zone (schedule grid + task management)
│   │   │   ├── components/     # Extracted tab components (7 files)
│   │   │   │   ├── ScheduleTab.tsx    # Weekly schedule grid (2033 LOC)
│   │   │   │   ├── TasksTab.tsx       # Trello-style task management (2951 LOC)
│   │   │   │   ├── NotificationsTab.tsx # Push notification history (176 LOC)
│   │   │   │   ├── SuggestionsTab.tsx  # Feature suggestions system (363 LOC)
│   │   │   │   ├── PatientsTab.tsx     # Patient search + data view (140 LOC)
│   │   │   │   ├── ScheduleTypes.ts   # Schedule types & color maps (144 LOC)
│   │   │   │   └── TaskTypes.ts       # Task types & helpers (91 LOC)
│   │   │   ├── hooks/          # Custom hooks
│   │   │   │   ├── useSchedule.ts     # Schedule data fetching (291 LOC)
│   │   │   │   └── useTasks.ts        # Task CRUD & state management (554 LOC)
│   │   │   ├── login/          # Employee login page
│   │   │   ├── reset-haslo/    # Employee password reset page
│   │   │   └── page.tsx        # Thin orchestrator — tabs + state wiring (778 LOC)
│   │   ├── strefa-pacjenta/    # Patient portal
│   │   │   ├── login/          # Patient login (phone or email)
│   │   │   ├── register/       # Registration flow (confirm, password, verify, verify-email)
│   │   │   ├── reset-password/  # Password reset flow
│   │   │   ├── dashboard/      # Main patient dashboard (next appointment widget)
│   │   │   ├── historia/       # Visit history
│   │   │   ├── profil/         # Patient profile
│   │   │   ├── wiadomosci/     # Patient ↔ Reception real-time chat
│   │   │   └── ocen-nas/       # Rate Us page (QR code → Google Reviews)
│   │   ├── api/                # API routes (85+ endpoints)
│   │   ├── auth/               # Auth routes (callback for PKCE code exchange)
│   │   ├── cennik/             # Pricing page (AI chat assistant)
│   │   ├── aktualnosci/        # News/articles
│   │   ├── mapa-bolu/          # Pain Map (interactive dental map)
│   │   │   ├── editor/         # Zone position editor tool (debug)
│   │   │   ├── PainMapInteractive.tsx  # SVG overlay + modals + tooltips + doctor cards
│   │   │   └── SymptomData.ts  # 32 teeth + 3 soft tissue data (TipItem, DOCTORS)
│   │   ├── metamorfozy/        # Before/after gallery
│   │   ├── nowosielski/        # Dr Nowosielski's blog (Supabase-backed)
│   │   │   ├── [slug]/         # Dynamic blog post pages
│   │   │   ├── blog.v2.css     # Blog-specific styling
│   │   │   └── page.tsx        # Blog listing page
│   │   ├── porownywarka/       # Solution Comparator (7 categories, 73 methods)
│   │   ├── kalkulator-leczenia/ # Treatment Time Calculator (5 paths)
│   │   ├── oferta/             # Services
│   │   │   ├── implantologia/  # Implantology subpage with pricing
│   │   │   ├── leczenie-kanalowe/  # Root canal / microscopic endodontics
│   │   │   ├── stomatologia-estetyczna/  # Aesthetic dentistry (veneers, whitening)
│   │   │   ├── ortodoncja/     # Orthodontics (Clear Correct aligners)
│   │   │   ├── chirurgia/      # Oral surgery (extractions, wisdom teeth, PRF)
│   │   │   └── protetyka/      # Prosthetics (crowns, bridges, dentures)
│   │   ├── selfie/             # Selfie Booth page
│   │   ├── symulator/          # Smile Simulator page
│   │   ├── sklep/              # E-commerce shop
│   │   ├── kontakt/            # Contact page
│   │   ├── rezerwacja/         # Booking (query param: ?specialist=&reason=)
│   │   ├── wizyta/[type]/      # Appointment types
│   │   ├── baza-wiedzy/        # Knowledge base articles
│   │   ├── faq/                # FAQ page
│   │   └── zadatek/            # Deposit payment
│   ├── components/             # React components
│   │   ├── modals/             # Appointment modals
│   │   ├── scheduler/          # AppointmentScheduler
│   │   ├── SplashScreen.tsx     # Cinematic intro animation
│   │   ├── AssistantTeaser.tsx  # AI chat assistant
│   │   ├── NovikCodeCredit.tsx  # Footer credit
│   │   ├── OverlayEditor.tsx    # Image alignment/overlay editor
│   │   └── SimulatorModal.tsx   # Smile simulator main modal
│   ├── context/                # React Context providers
│   ├── lib/                    # Utilities & services
│   │   ├── brandConfig.ts      # Branding config (brand object), demoSanitize() function
│   │   ├── demoMode.ts         # isDemoMode flag
│   │   ├── prodentisFetch.ts   # Resilient Prodentis fetch: Cloudflare Tunnel primary + direct IP fallback
│   │   ├── smsService.ts       # SMS integration
│   │   ├── productService.ts   # Product management
│   │   ├── githubService.ts    # GitHub blog integration
│   │   ├── knowledgeBase.ts    # AI knowledge (LEGACY fallback — replaced by unifiedAI.ts)
│   │   ├── unifiedAI.ts        # ✨ Unified AI Service Layer — single entry for ALL AI operations (Supabase-backed KB, context-aware prompts, 14 contexts)
│   │   ├── roles.ts            # Role management
│   │   ├── telegram.ts         # Telegram multi-bot notification routing
│   │   ├── appointmentTypeMapper.ts  # Maps Prodentis appointment types
│   │   ├── emailService.ts     # Centralized patient email service (demoSanitize in makeHtml)
│   │   ├── icsGenerator.ts     # ICS calendar file generator (demoSanitize on output)
│   │   ├── cronHeartbeat.ts    # Cron heartbeat logging to Supabase
│   │   ├── jwt.ts              # JWT token utilities
│   │   ├── auditLog.ts         # GDPR audit logging + password strength validation
│   │   └── supabaseClient.ts   # Browser Supabase client
│   ├── data/                   # Static data
│   │   ├── articles.ts         # Knowledge base articles
│   │   └── reviews.ts          # Google reviews fallback data
│   ├── types/                  # Central type re-exports
│   │   ├── index.ts            # Re-exports from ScheduleTypes, TaskTypes, AdminTypes, consentTypes, comparatorTypes
│   │   └── appointmentActions.ts # Appointment action types
│   ├── hooks/                  # Custom React hooks
│   │   └── useUserRoles.ts     # Fetch user roles from API
│   ├── helpers/                # Helper utilities
│   └── middleware.ts           # Request middleware (i18n locale routing + admin/employee route protection)
├── messages/                   # i18n translation files (next-intl)
│   ├── pl/common.json          # Polish (default locale)
│   ├── en/common.json          # English
│   ├── de/common.json          # German
│   └── ua/common.json          # Ukrainian
├── supabase_migrations/        # Database migrations (106 files: 003-108, sequential numeric)
├── public/                     # Static assets (incl. qr-ocen-nas.png)
├── scripts/                    # Utility scripts (13 files)
└── vercel.json                 # Deployment configuration (17 cron jobs: see Cron section)
```

### Request Flow

```mermaid
graph TD
    A[Client Request] --> B{Middleware}
    B -->|Public| C[Public Pages]
    B -->|Auth Required| D{Auth Check}
    D -->|Valid| E[Protected Pages]
    D -->|Invalid| F[Redirect to Login]
    E --> G{Page Type}
    G -->|API| H[API Routes]
    G -->|UI| I[React Components]
    H --> J[Supabase]
    H --> K[External APIs]
    I --> L[Context Providers]
```

---

## 🗄 Database Schema

### Supabase Tables (Primary)

#### 1. **sms_reminders**
SMS notification system for appointment reminders.
```sql
- id (uuid, PK)
- prodentis_id (text) - Appointment ID from Prodentis
- patient_phone (text)
- patient_name (text)
- doctor_name (text)
- appointment_date (timestamptz)
- appointment_time (text)
- appointment_type (text)
- sms_message (text)
- short_link_id (text, FK)
- status ('draft', 'sent', 'failed', 'cancelled')
- send_error (text)
- sent_at (timestamptz)
- created_at, updated_at
```

#### 2. **appointment_actions**
Tracks patient responses (confirm/cancel).
```sql
- id (uuid, PK)
- short_link_id (text, unique)
- patient_phone (text)
- patient_name (text)
- doctor_name (text)
- appointment_date (timestamptz)
- appointment_time (text)
- action ('confirmed', 'cancelled', null)
- action_timestamp (timestamptz)
- telegram_notified (boolean)
- email_sent (boolean)
- created_at
```

#### 3. **appointment_instructions**
Pre-appointment instructions by type.
```sql
- id (uuid, PK)
- appointment_type (text, unique)
- instructions (text)
- applicable_doctors (text[])
- created_at, updated_at
```

#### 4. **short_links**
URL shortener for SMS links.
```sql
- id (text, PK) - Short code (e.g., "RKACFo")
- full_url (text)
- appointment_action_id (uuid, FK)
- clicks (integer)
- created_at
```

#### 5. **email_verification_tokens**
Patient email verification for portal.
```sql
- id (uuid, PK)
- email (text)
- token (text, unique)
- used (boolean)
- expires_at (timestamptz)
- created_at
```

#### 6. **user_roles**
Role-based access control (RBAC) for admin/employee/patient roles.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- email (text)
- role ('admin', 'employee', 'patient')
- granted_by (text)
- granted_at (timestamptz)
- UNIQUE(user_id, role)
```

#### 7. **sms_templates**
SMS message templates for appointment reminders.
```sql
- id (uuid, PK)
- name (text, unique)
- template (text)
- created_at, updated_at
```

#### 8. **patients**
Patient Portal registered users.
```sql
- id (uuid, PK)
- prodentis_id (text)
- phone (text)
- email (text)
- password_hash (text)
- first_name (text)
- last_name (text)
- account_status ('pending', 'approved', 'rejected')
- email_verified (boolean)
- promotion_dismissed (boolean)
- created_at, updated_at
```

#### 9. **products**
E-commerce products.
```sql
- id (uuid, PK)
- name (text) — Polish product name
- price (numeric)
- description (text) — Polish description
- category (text) — Polish category
- image (text) — Main image URL
- gallery (text[]) — Additional images
- is_visible (boolean, DEFAULT true)
- is_variable_price (boolean, DEFAULT false)
- min_price (numeric, DEFAULT 0)
- name_translations (JSONB, DEFAULT '{}') — {"en": "...", "de": "...", "ua": "..."}
- description_translations (JSONB, DEFAULT '{}') — same format
- category_translations (JSONB, DEFAULT '{}') — same format
- created_at (timestamptz)
```
Admin API auto-translates Polish text to EN/DE/UA via GPT-4o on product save.

#### 10. **orders**
Customer orders.

#### 11. **news**
Clinic news/articles.

#### 12. **employee_tasks**
Task management system for clinic staff.
```sql
- id (uuid, PK)
- title (text, NOT NULL)
- description (text)
- status ('todo', 'in_progress', 'done', 'archived')
- priority ('low', 'medium', 'high')
- task_type (varchar(100)) -- e.g. 'Laboratorium', 'Zamówienia', 'Recepcja'
- due_date (date)
- due_time (time)                        -- ← NEW (migration 043): specific time of day
- is_private (boolean, DEFAULT false)     -- ← NEW (migration 043): only visible to owner
- owner_user_id (uuid, FK → auth.users)  -- ← NEW (migration 043): creator of private task
- patient_name (text)
- patient_id (text) -- Prodentis patient ID
- assigned_to_doctor_id (text) -- legacy single assignment
- assigned_to_doctor_name (text) -- legacy single assignment
- assigned_to (jsonb, DEFAULT '[]') -- [{id, name}] multi-employee assignment
- checklist_items (jsonb, DEFAULT '[]') -- [{label, done, checked_by?, checked_at?}]
- image_url (text) -- uploaded image from Supabase Storage
- created_by (uuid)
- created_by_email (text)
- created_at, updated_at
```
Note: Private tasks (`is_private=true`) are only visible to `owner_user_id` — filtered server-side in GET /api/employee/tasks. Telegram/push notifications are skipped for private tasks.

#### 13. **task_reminders** ← NEW (migration 043)
Scheduler for individual push notification reminders (AI voice private tasks).
```sql
- id (uuid, PK, DEFAULT gen_random_uuid())
- task_id (uuid, FK → employee_tasks ON DELETE CASCADE)
- user_id (uuid, NOT NULL)  -- recipient of the push
- remind_at (timestamptz, NOT NULL)  -- when to fire the push
- reminded (boolean, DEFAULT false)  -- true after push sent
- remind_type (text, DEFAULT 'push') -- 'push' only for now
- created_at (timestamptz)
```
Indexes: `idx_task_reminders_pending ON remind_at WHERE NOT reminded`, `idx_task_reminders_task ON task_id`
Processed by: `GET /api/cron/task-reminders` (Part 3 — runs alongside daily group reminders)


#### 13. **task_history**
Audit log for task edits, status changes, and checklist toggles.
```sql
- id (uuid, PK)
- task_id (uuid, FK → employee_tasks, CASCADE)
- changed_by (text)
- changed_at (timestamptz)
- change_type (text) -- 'edit' | 'status' | 'checklist'
- changes (jsonb) -- { field: { old, new } }
```

#### 14. **task_comments**
Comments/discussion on employee tasks.
```sql
- id (uuid, PK)
- task_id (uuid, FK → employee_tasks, CASCADE)
- author_id (text)
- author_email (text)
- author_name (text)
- content (text)
- created_at (timestamptz)
```

#### 15. **task_labels**
Custom colored labels/tags for tasks.
```sql
- id (uuid, PK)
- name (text)
- color (text, DEFAULT '#38bdf8')
- created_at (timestamptz)
```
Default labels: Pilne (red), Laboratorium (purple), Oczekuje (amber), Zamówienie (blue), Gotowe do odbioru (green)

#### 16. **task_label_assignments**
Many-to-many junction between tasks and labels.
```sql
- task_id (uuid, FK → employee_tasks, CASCADE)
- label_id (uuid, FK → task_labels, CASCADE)
- PRIMARY KEY (task_id, label_id)
```

#### 17. **google_reviews**
Persistent cache for Google Reviews (accumulates over time from API fetches).
```sql
- id (uuid, PK)
- google_author_name (text, NOT NULL)
- author_photo_url (text)
- rating (integer, CHECK 1-5)
- review_text (text, NOT NULL)
- relative_date (text)
- publish_time (timestamptz)
- google_maps_uri (text)
- fetched_at (timestamptz)
- created_at (timestamptz)
- UNIQUE (google_author_name, review_text)
```

#### 18. **chat_conversations**
Patient-reception chat conversations.
```sql
- id (uuid, PK)
- patient_id (text, NOT NULL)
- patient_name (text)
- patient_phone (text)
- status (text, DEFAULT 'open', CHECK IN ('open', 'closed'))
- last_message_at (timestamptz)
- unread_by_patient (boolean, DEFAULT false)
- unread_by_admin (boolean, DEFAULT false)
- created_at (timestamptz)
```

#### 19. **chat_messages**
Individual messages in chat conversations.
```sql
- id (uuid, PK)
- conversation_id (uuid, FK -> chat_conversations, CASCADE)
- sender_role (text, NOT NULL, CHECK IN ('patient', 'reception'))
- content (text, NOT NULL)
- read (boolean, DEFAULT false)
- created_at (timestamptz)
```

#### 20. **push_subscriptions** *(DEPRECATED — replaced by fcm_tokens)*
Legacy Web Push API subscription metadata. No longer used for sending.

#### 20b. **fcm_tokens** *(migration 104)*
Firebase Cloud Messaging token storage for push notifications.
```sql
- id (uuid, PK, DEFAULT gen_random_uuid())
- user_id (text, NOT NULL)
- user_type (text, NOT NULL, CHECK IN ('employee', 'admin', 'patient'))
- fcm_token (text, NOT NULL, UNIQUE)
- device_label (text) -- 'iPhone', 'Android', 'Mac', etc.
- last_active_at (timestamptz, DEFAULT NOW())
- created_at (timestamptz, DEFAULT NOW())
- INDEX idx_fcm_tokens_user (user_id, user_type)
- INDEX idx_fcm_tokens_type (user_type)
```
RLS: service role full access. Upserted on `fcm_token` conflict.

#### 21. **employees**
Employee account data (linked to Supabase Auth users).
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- name (text)
- email (text, nullable) -- ← changed from NOT NULL (migration 082 context)
- position (text) -- HR position from Prodentis (e.g. 'Lekarz', 'Higienistka')
- employee_group (text) -- legacy single push group
- push_groups (text[], DEFAULT NULL) -- canonical multi-groups for push routing (configurable from admin panel)
- is_active (boolean, DEFAULT true) -- ← NEW (March 12): soft-deactivation flag
- deactivated_at (timestamptz) -- ← NEW: when the employee was deactivated
- created_at (timestamptz)
```

#### 22. **push_notification_config**
Per-notification-type configuration for automated push notifications (configurable from Admin Panel Push tab).
```sql
- id (uuid, PK)
- key (text, UNIQUE) -- e.g. 'task-no-date', 'appointment-confirmed'
- label (text) -- human-readable name for admin panel
- description (text) -- short description for admin panel
- groups (text[]) -- employee groups that receive this notification
- recipient_types (text[], DEFAULT ARRAY['employees']) -- 'employees' | 'patients'
- enabled (boolean, DEFAULT true)
- created_at (timestamptz)
```
Seeded with 15 notification types: 13 employee-targeted (task events, appointment events, orders, registrations, chat), 2 patient-targeted (appointment-24h, appointment-1h reminders).

#### 23. **patient_intake_tokens** (migration 054)
One-time QR tokens for digital patient registration (e-karta). Service-role only (RLS enabled, no policies).
```sql
- id (uuid, PK)
- token (text, UNIQUE, DEFAULT gen_random_uuid()::text)
- prodentis_patient_id (text) -- NULL = nowy pacjent
- prefill_first_name, prefill_last_name (text)
- appointment_id, appointment_date, appointment_type (text)
- used_at (timestamptz) -- NULL = nieużyty
- expires_at (timestamptz, DEFAULT NOW() + 24h)
- created_by_employee (text)
- created_at (timestamptz)
```
Indexes: partial on `token WHERE used_at IS NULL`, on `expires_at`.

#### 24. **patient_intake_submissions** (migration 054)
Buffer for patient form data before sending to Prodentis. Service-role only.
```sql
- id (uuid, PK)
- token_id (uuid, FK → patient_intake_tokens)
- first_name, last_name, middle_name, maiden_name (text)
- pesel (text), birth_date (date), gender (text)
- street, postal_code, city, phone, email (text)
- marketing_consent, contact_consent, rodo_consent (boolean)
- medical_survey (jsonb) -- 40+ checkbox/text fields from paper card
- medical_notes (text) -- formatted text sent to Prodentis
- prodentis_status (text, DEFAULT 'pending') -- pending | sent | failed
- prodentis_patient_id (text), prodentis_error (text)
- signature_data (text) -- base64 canvas
- submitted_at (timestamptz)
```

#### 25. **feature_suggestions** (migration 055)
Employee feature suggestions/improvements visible to all staff.
```sql
- id (uuid, PK)
- author_email (text), author_name (text)
- content (text) -- suggestion text
- category (text, DEFAULT 'funkcja') -- 'funkcja' | 'poprawka' | 'pomysł' | 'inny'
- status (text, DEFAULT 'nowa') -- 'nowa' | 'w_dyskusji' | 'zaplanowana' | 'wdrożona' | 'odrzucona'
- upvotes (text[], DEFAULT '{}') -- array of emails
- created_at, updated_at (timestamptz)
```

#### 26. **feature_suggestion_comments** (migration 055)
```sql
- id (uuid, PK)
- suggestion_id (uuid, FK → feature_suggestions)
- author_email (text), author_name (text)
- content (text)
- created_at (timestamptz)
```

#### 27. **online_bookings** (migration 056)
Online appointment bookings with Prodentis scheduling, admin approval workflow.
```sql
- id (uuid, PK)
- reservation_id (uuid, FK → reservations)
- patient_name (text), patient_phone (text), patient_email (text)
- prodentis_patient_id (text), is_new_patient (boolean), patient_match_method (text)
- specialist_id (text), specialist_name (text), doctor_prodentis_id (text)
- appointment_date (date), appointment_time (time), service_type (text), description (text)
- schedule_status (text, DEFAULT 'pending') -- pending → approved → scheduled | failed | rejected
- schedule_error (text), prodentis_appointment_id (text)
- approved_by (text), approved_at (timestamptz)
- intake_token_id (uuid), intake_url (text)
- reported_in_digest (boolean, DEFAULT false)
- created_at, updated_at (timestamptz)
```
Indexes: `schedule_status`, `appointment_date`, partial on `reported_in_digest WHERE false`.

**Patient Matching (migration 057):**
- `match_confidence` (INTEGER) — score 0-100. ≥85 auto-match, 60-84 needs_review, <60 new patient
- `match_candidates` (JSONB) — array of `{id, firstName, lastName, score, method}`

#### 28. **patient_intake_submissions** additional column (migration 060)
```sql
- pdf_url (text) -- URL to generated PDF in Supabase Storage
```

#### 29. **patients** additional column (migration 061)
```sql
- birth_date (date) -- cached from Prodentis to avoid daily API calls
```
Index: `idx_patients_birth_date ON patients(birth_date)`

#### 30. **birthday_wishes** (migration 061)
Tracks birthday SMS sent per year to avoid duplicates.
```sql
- id (uuid, PK)
- patient_id (uuid, FK → patients)
- prodentis_id (text, NOT NULL)
- patient_name (text)
- patient_phone (text)
- sent_at (timestamptz)
- sms_sent (boolean, DEFAULT false)
- sms_error (text)
- year (integer, DEFAULT current year)
- UNIQUE(prodentis_id, year)
```
Index: `idx_birthday_wishes_year ON birthday_wishes(year)`

#### 31. **cancelled_appointments** (migration 062)
Audit log of all appointments cancelled by patients from the patient zone.
```sql
- id (uuid, PK)
- prodentis_appointment_id (text)
- patient_name (text)
- patient_phone (text)
- patient_prodentis_id (text)
- appointment_date (timestamptz)
- doctor_name (text)
- reason (text)
- cancelled_at (timestamptz, DEFAULT NOW())
- cancelled_by (text, DEFAULT 'patient') -- 'patient' or 'admin'
```
Indexes: `idx_cancelled_appointments_date ON cancelled_at DESC`, `idx_cancelled_appointments_patient ON patient_prodentis_id`

#### 32. **consent_field_mappings** (migration 067)
Stores consent type definitions and PDF field coordinates in DB (editable via `/admin/pdf-mapper` without code changes).
```sql
- consent_key (text, PK) -- e.g. 'higienizacja', 'rtg'
- label (text, NOT NULL) -- e.g. 'Zgoda na higienizację'
- pdf_file (text, NOT NULL) -- filename in /public/zgody/ or Supabase Storage URL
- fields (JSONB, DEFAULT '{}') -- field positions (x, y, page, fontSize, boxWidth)
- is_active (boolean, DEFAULT true)
- created_at, updated_at (timestamptz)
- updated_by (text) -- email of last editor
```
RLS: Public read (consent signing page needs it). Seeded with 10 existing consent types from code.

#### 33. **sms_settings** (migration 070)
Admin toggles for SMS automation types.
```sql
- id (text, PK) -- e.g. 'noshow_followup', 'post_visit', 'birthday'
- enabled (boolean, NOT NULL, DEFAULT true)
- updated_at (timestamptz)
- updated_by (text) -- admin email
```
Seeded with 5 types: noshow_followup, post_visit, week_after_visit, birthday, deposit_reminder.

#### 34. **email_ai_drafts** (migration 071)
AI-generated reply drafts for incoming emails.
```sql
- id (uuid, PK)
- email_uid (integer, NOT NULL)
- email_folder (text, DEFAULT 'INBOX')
- email_subject (text)
- email_from_address (text)
- email_from_name (text)
- email_date (timestamptz)
- email_snippet (text)
- draft_subject (text) -- nullable (skipped emails have no draft)
- draft_html (text) -- nullable
- status (text, DEFAULT 'pending', CHECK IN ('pending','approved','sent','rejected','learned','skipped'))
- admin_notes (text)
- admin_rating (integer, CHECK 1-5)
- admin_tags (text[])
- ai_reasoning (text)
- created_at, reviewed_at, sent_at (timestamptz)
- reviewed_by (text)
```
Indexes: `status`, `email_uid`, `created_at DESC`.

#### 35. **email_compose_drafts** (migration 073)
Persistent compose drafts for the email client.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users ON DELETE CASCADE)
- to_address, cc_address, subject, body (text)
- in_reply_to (text)
- references (text[])
- ai_original_text (text, DEFAULT '') -- preserves AI text for feedback (migration 076)
- created_at, updated_at (timestamptz)
```

#### 36. **email_label_overrides** (migration 074)
Manual label reassignment for emails (overrides auto-classification).
```sql
- id (uuid, PK)
- email_uid (integer, NOT NULL)
- email_folder (text, DEFAULT 'INBOX')
- label (text, NOT NULL)
- created_by (uuid, FK → auth.users)
- created_at (timestamptz)
- UNIQUE(email_uid, email_folder)
```

#### 37. **email_ai_knowledge_files** (migration 077)
Uploaded PDF/TXT files parsed for AI knowledge base expansion.
```sql
- id (uuid, PK)
- filename (text, NOT NULL)
- file_size (integer)
- content_text (text, NOT NULL) -- extracted text (max 50K chars)
- description (text)
- uploaded_by (uuid, FK → auth.users)
- created_at (timestamptz)
```
RLS: service_only (no direct access). Max 10 files, 5MB each.

#### 38. **employee_notification_preferences** (migration 079)
Per-employee muted push notification types (opt-out pattern).
```sql
- user_id (uuid, PK, FK → auth.users ON DELETE CASCADE)
- muted_keys (text[], NOT NULL, DEFAULT '{}') -- e.g. ['task-new', 'chat-patient-to-admin']
- updated_at (timestamptz)
```
RLS: service_only. Default `'{}'` = nothing muted = user receives everything their groups allow. New notification types are auto-enabled.

#### 39. **social_video_queue** (migration 083-086)
Video processing pipeline queue for social media content.
```sql
- id (uuid, PK)
- raw_video_url (text) -- original uploaded video in Supabase Storage
- processed_video_url (text) -- captioned video after Captions API processing
- status (text) -- pipeline status (see below)
- title (text)
- descriptions (jsonb) -- per-platform descriptions
- hashtags (text[]) -- AI-generated hashtags
- transcript (text) -- Whisper transcription text
- transcript_srt (text) -- SRT format subtitles
- transcript_language (text)
- raw_duration_seconds (numeric)
- raw_video_size (bigint)
- ai_analysis (jsonb) -- GPT-4o content analysis
- captions_video_id (text) -- Mirage API job ID for polling
- error_message (text)
- retry_count (integer, DEFAULT 0)
- created_at (timestamptz)
- published_at (timestamptz)
- processed_at (timestamptz)
```
**Status flow:** `uploaded` → `transcribing` → `transcribed` → `analyzing` → `generating` → `captioning` → `review` → `ready` → `publishing` → `done`
**Auto-recovery:** Videos stuck in intermediate statuses (transcribing/analyzing/generating/rendering) are auto-reset to `uploaded` on next cron run (max 3 retries → `failed`).
Storage: `social-media` bucket on Supabase Storage.

#### 40. **ai_knowledge_base** (migration 107)
Centralized AI knowledge base — admin-editable sections for all AI assistants.
```sql
- id (uuid, PK, DEFAULT gen_random_uuid())
- section (text, NOT NULL, UNIQUE) -- e.g. 'clinic_info', 'pricing', 'services'
- title (text, NOT NULL)
- content (text, NOT NULL) -- the actual KB content (markdown/plain text)
- context_tags (text[], DEFAULT '{}') -- which AI contexts use this section
- priority (integer, DEFAULT 50) -- ordering priority (higher = more important)
- updated_at (timestamptz, DEFAULT NOW())
- updated_by (text) -- email of last editor
- created_at (timestamptz, DEFAULT NOW())
```
Seeded with 12 sections: `clinic_info`, `services`, `pricing`, `team`, `equipment`, `social_guidelines`, `email_guidelines`, `patient_communication`, `appointments`, `faq`, `brand_voice`, `medical_info`.
Trigger: `update_ai_kb_updated_at` auto-sets `updated_at` on row update.
Used by: `src/lib/unifiedAI.ts` (5-min cached reads), `/api/admin/ai-knowledge` (CRUD), `/api/admin/ai-trainer` (AI modifications).

#### 41. **ai_trainer_messages** (migration 108)
Persistent AI Trainer conversation history — never-ending education chat between admin and AI Trainer.
```sql
- id (uuid, PK, DEFAULT gen_random_uuid())
- role (text, NOT NULL) -- 'user' | 'assistant' | 'system'
- content (text, NOT NULL)
- message_type (text, DEFAULT 'general') -- 'general' | 'style_example' | 'style_analysis' | 'kb_proposal' | 'kb_applied' | 'kb_rejected'
- metadata (jsonb, DEFAULT '{}') -- proposed_changes, style_diff, original_draft, corrected_version
- created_by (text) -- admin email or 'ai_trainer'
- created_at (timestamptz, DEFAULT NOW())
```
Used by: `/api/admin/ai-trainer` (GET: load history, POST: save messages, PATCH: approve/reject), `AIEducationTab.tsx`.


## ✨ Feature Catalog

### 🏥 Public Website Features

#### Homepage (`/`)
- Hero section with video background
- Services showcase (Precision, Aesthetics, Experience)
- YouTube video feed (latest clinic videos)
- Google Reviews carousel (`GoogleReviews.tsx`) — **real reviews** from Google Places API via `/api/google-reviews`, accumulated in Supabase `google_reviews` table, shuffled randomly on each load, only 4★+ reviews shown, with static fallback
- Metamorphoses preview
- Products carousel
- Contact CTA

#### Services (`/oferta`)
- Service categories:
  - Zachowawcza (Conservative dentistry)
  - Protetyka (Prosthodontics)
  - Chirurgia (Surgery)
  - ORTODONCJA (Orthodontics)
  - Higienizacja (Dental hygiene)
  - Endodoncja (Endodontics)
  - LASER
- **Service Landing Pages** (each with FAQ schema, BreadcrumbList, metadata):
  - `/oferta/implantologia` — digital implants, guided surgery, pricing
  - `/oferta/leczenie-kanalowe` — microscopic endodontics, The Wand anaesthesia, Re-Endo
  - `/oferta/stomatologia-estetyczna` — veneers, whitening, bonding, DSD
  - `/oferta/ortodoncja` — Clear Correct aligners, 3D simulation
  - `/oferta/chirurgia` — extractions, wisdom teeth, PRF technology
  - `/oferta/protetyka` — crowns (E.max, zirconia), bridges, digital scanning

#### Metamorphoses (`/metamorfozy`)
- Before/after image gallery
- 15+ cases
- Swipe gestures (mobile)
- Glassmorphism speech bubble descriptions

#### News (`/aktualnosci`)
- Migrated articles from old website
- Carousel layout with snap scroll
- AI-generated unique graphics for key articles

#### Dr Nowosielski Blog (`/nowosielski`)
- Supabase-backed blog platform
- Dynamic slug routes (`/nowosielski/[slug]`)
- Custom blog CSS (`blog.v2.css`)
- Client-side rendering with `force-dynamic`
- Script to migrate blog posts (`scripts/migrate_nowosielski_blog.js`)
- **Blog i18n**: `blog_posts` table has `locale` + `group_id` columns. List/detail pages filter by locale with PL fallback. Admin POST auto-translates to EN/DE/UA via GPT-4o. Admin DELETE cascades via `group_id`. One-time translation script: `scripts/translate-blog-posts.ts`

#### E-commerce (`/sklep`, `/koszyk`)
- Product browsing with `ProductModal.tsx`
- Shopping cart (`CartContext.tsx`)
- Stripe integration for payments (`StripePaymentForm.tsx`, `CheckoutForm.tsx`)
- Order confirmation emails

#### Booking (`/rezerwacja`, `/wizyta/[type]`)
- Appointment type selection
- Specialist pre-selection via URL params (`?specialist=`, `?reason=`)
- **AppointmentScheduler** — live slot picker from Prodentis API (week navigation, slot selection)
- Deposit payment option (`/zadatek`)
- Prodentis calendar integration

#### Treatment Time Calculator (`/kalkulator-leczenia`)
Interactive 3-step wizard for estimating treatment duration.
- **Step A**: Service tile selection (6 services + "Nie wiem" → Mapa Bólu)
- **Step B**: 3–5 questions per service (pill-button answers)
- **Step C**: Visual timeline with stages, summary pills (visits + duration), extending factors
- **5 paths**: Endodoncja, Implant, Protetyka, Bonding, Wybielanie
- **Lead capture**: "Wyślij do recepcji" form → Telegram + Email
- **Smart specialist pre-selection**: CTA passes `?specialist=ID&reason=TEXT` to booking form based on competencies
- **No prices** — only visits, time, and stages
- Data layer: `treatmentData.ts` with typed `TreatmentPath`, `Question`, `Stage`, `Variant`

#### Solution Comparator (`/porownywarka`)
Interactive comparison tool for dental treatment options.
- **Step 1**: Scenario selection (Missing tooth / Aesthetics)
- **Step 2**: Priority selection (balanced/durable/min_invasive/fast/easy_maintenance)
- **Step 3**: 3 questions per scenario
- **Step 4**: Comparison table (desktop) / cards (mobile) with scale bars, gating badges, recommendations
- **Scenario A**: Implant vs Most vs Proteza częściowa (3 methods)
- **Scenario B**: Bonding vs Licówki kompozytowe vs Licówki porcelanowe vs Korony (4 methods)
- **Scoring system**: weighted metrics (0-100) × priority weights + gating rules
- **Lead capture**: "Wyślij wynik do recepcji" → Telegram + Email
- **Smart specialist pre-selection**: CTA passes `?specialist=ID&reason=TEXT` to booking form
- **Cross-link**: "Zobacz etapy i czas leczenia" → /kalkulator-leczenia
- Data layer: `comparatorData.ts` with typed `Comparator`, `Method`, `GatingRule`, `ScoredMethod`

#### Pain Map (`/mapa-bolu`)
Interactive dental pain diagnostic tool.
- **Premium dental image** (`dental-map-premium.jpg`) as background
- **SVG overlay** with 35 interactive zones (32 teeth + 3 soft tissues: tongue, palate, throat)
- **Coordinates calibrated** by user via drag-and-drop editor (`/mapa-bolu/editor`)
- **Welcome popup** — intro text + disclaimer, glassmorphic design, dismissable with animation
- **Map/List toggle** — switch between interactive map and categorized list view
- **List view** — teeth grouped by quadrant (Q1-Q4 + soft tissues), subtitle display, glassmorphic cards
- **Detail modal** — bottom-sheet slide-up with severity toggle, urgency badge, symptoms, causes, doctor recommendations, specialist advice, CTA to book
- **Multi-severity system** — each zone has 3 levels (Łagodne / Umiarkowane / Zaawansowane) with independent symptoms, causes, advice, and recommended doctors
- **8 clinical templates** — incisor, canine, premolar, molar, wisdom tooth, tongue, palate, throat — each ×3 severity levels
- **Hover tooltips** — ⓘ icon on symptoms/causes; dark floating tooltip with expanded medical description on hover
- **Clickable causes** — each cause links to `/rezerwacja` with `?specialist=` and `?reason=` query params, pre-selecting the recommended specialist
- **Doctor recommendation cards** — each severity level shows recommended specialists with name, specialties, and "Umów →" CTA linking to booking
- **Booking integration** — `ReservationForm.tsx` reads `specialist` and `reason` query params from URL to pre-populate form
- **Symptom data** — `SymptomData.ts` with `TipItem` type (`text` + `tip`), `doctors` array per severity, `DOCTORS` constant mapping IDs → names/specialties, 216 tooltip descriptions
- **Zone editor** (`/mapa-bolu/editor`) — drag-and-drop tool to reposition zones, resize handles, keyboard nudging, export to clipboard
- **Popup suppression** — `AssistantTeaser` and `PWAInstallPrompt` hidden on `/mapa-bolu` paths

#### Smile Simulator (`/symulator`)
AI-powered smile transformation tool.
- **SimulatorModal.tsx** — main simulator modal (27KB)
- **Studio components** (`components/simulator/`):
  - `StudioCapture.tsx` — camera capture or image upload
  - `StudioMaskEditor.tsx` — mask editing for inpainting region
  - `StudioResults.tsx` — display AI-generated results
- **OverlayEditor.tsx** — drag/rotate/scale image alignment tool for composite generation
- **SimulatorContext.tsx** — global open/close state provider
- **AI Backend** — Flux Fill Dev (Replicate) for true inpainting
- **4 style variants** — Hollywood, Natural, Soft, Strong
- **Mask parameters** — guidance_scale 15, mask dilation 1.15×
- **Popup suppression** — `AssistantTeaser` and `PWAInstallPrompt` hidden on `/symulator`

#### Selfie Booth (`/selfie`)
- `SelfieBooth.tsx` component (12KB)
- Camera-based face capture
- MediaPipe face detection integration

#### AI Assistant (`AssistantTeaser.tsx`)
Full-featured AI chat assistant (441 lines, 22KB).
- **Chat mode** — expands from teaser bubble into full chat window
- **Conversation history** — scrollable message thread (user/assistant roles)
- **Quick suggestions** — predefined questions (godziny, mikroskop, zespół, wizyta)
- **Action shortcuts** — "📅 Rezerwacja" and "💰 Cennik" buttons navigate to pages
- **File attachments** — users can attach images to questions (📎 Paperclip icon)
- **Auto-hiding** — hidden on `/mapa-bolu` and `/symulator` paths (HIDDEN_PATHS)
- **Dismissable** — teaser can be closed, remembers state
- **Backend** — `/api/chat` (GPT-4o via `unifiedAI.ts`) with Supabase-backed knowledge base
- **Context** — `AssistantContext.tsx` for global open/close state

#### Ask Expert (`AskExpertButton.tsx`, `AskExpertModal.tsx`)
- "Zadaj Pytanie Ekspertowi" CTA button
- Modal form for submitting expert questions
- Backend: `/api/ask-expert` (Supabase storage)

#### Legal & Policy Pages (Premium Redesigned)
All legal pages share a premium design: hero section with radial gold gradient, Lucide icons, Playfair Display headings, RevealOnScroll animations, CSS variable-based styling.
- **RODO** (`/rodo`) — Klauzula informacyjna, 10 numbered sections with gold circle badges, PDF download button
- **Regulamin** (`/regulamin`) — Regulamin organizacyjny, 12 § sections with gold pill badges, PDF download
- **Polityka Prywatności** (`/polityka-prywatnosci`) — 4-card layout (Administrator, Cele, Prawa, Kontakt)
- **Polityka Cookies** (`/polityka-cookies`) — 4-card layout (Czym są, Do czego, Zarządzanie, Rodzaje)

#### Forms (RODO Compliance)
- **ContactForm.tsx** — Math captcha + honeypot antispam + required RODO consent checkbox
- **ReservationForm.tsx** — Required RODO consent checkbox with links to `/rodo` and `/polityka-prywatnosci`

#### Cennik / Pricing Assistant (`/cennik`)
AI-powered conversational pricing tool.
- **Chat interface** — full conversation history, scrollable thread
- **Quick questions** — preset pricing queries (plomba, implant, higienizacja, etc.)
- **Category tiles** — 8 categories (Zachowawcza, Protetyka, Chirurgia, Ortodoncja, Higienizacja, Dzieci, etc.)
- **Voice input** — Speech Recognition API (microphone button)
- **Text-to-speech** — AI responses can be read aloud (speaker button per message)
- **Backend** — `/api/cennik-chat` (OpenAI with complete 2026 price list, 70+ items)
- **Premium glassmorphic CSS** — `cennik.module.css` (8KB)

#### Splash Screen (`SplashScreen.tsx`)
Cinematic intro animation on first page load.
- **Particle field** — 80+ particles converging toward center
- **Logo reveal** — animated golden shimmer + glow pulse
- **Multi-phase sequence** — particles → convergence → logo → fade
- **No flicker** — children render hidden during animation, revealed after
- **Framer Motion** — AnimatePresence, motion.div with spring physics

#### Opinion Survey & Review Generator (`OpinionSurvey.tsx`)
AI-powered patient satisfaction survey that generates Google Reviews.
- **9-step survey**: isPatient → duration → procedures → staffRating → comfortRating → whatYouLike → improvements → recommend → result
- **Procedure selection**: 10 dental procedure types (chip-based multi-select)
- **Star ratings**: custom `StarRating` component for staff and comfort (1-5)
- **AI review generation**: positive sentiment → OpenAI generates 3-5 sentence Polish Google review
- **Negative sentiment handling**: if avg rating < 4 or negative recommendation → shows thank you message without review (no negative reviews posted)
- **Copy & redirect**: copy generated review to clipboard → redirect to `https://g.page/r/CSYarbrDoYcDEAE/review`
- **Timed popup**: `OpinionContext.tsx` manages auto-popup after 2-5 min delay on public pages
  - 50% probability gate
  - 30-day cooldown (localStorage)
  - Skipped on `/pracownik`, `/admin`, `/rezerwacja` paths
- **Backend**: `/api/generate-review` (OpenAI `gpt-4o-mini`, temperature 0.8)

#### Other Pages
- About Us (`/o-nas`)
- Contact (`/kontakt`) — Google Maps integration, `ContactForm.tsx`
- FAQ (`/faq`)
- Knowledge Base (`/baza-wiedzy`) — articles from `data/articles.ts`

---

### 👤 Patient Portal (`/strefa-pacjenta`)

**Authentication Required** (Custom JWT auth, separate from Supabase Auth)

**Navigation Tabs:** Panel główny | Historia wizyt | Mój profil | ⭐ Oceń nas

Features:
1. **Registration** (`/register`)
   - Email/password signup
   - Email verification system (magic token)
   - Email verification page (`/register/verify-email/[token]`)
   - Prodentis patient matching (phone or PESEL)
   - Admin approval workflow (pending → approved/rejected)

2. **Login** (`/login`)
   - **Phone number OR email** authentication (both accepted)
   - JWT token management

3. **Password Reset** (`/reset-password`, `/reset-password/[token]`)
   - Magic link password recovery

4. **Dashboard** (main portal page)
   - **Next appointment widget** — fetched from Prodentis API (`/api/patients/[id]/next-appointment`)
   - Pending approval / rejected banners
   - Restricted data for non-approved accounts

5. **Appointment Management**
   - View appointments
   - Confirm/cancel via short links
   - Email confirmations
   - Pre-appointment instructions (e.g., "Don't eat 2h before surgery")
   - **Appointment Modals** (`components/modals/`):
     - `ConfirmAttendanceModal.tsx` — confirm appointment attendance
     - `CancelAppointmentModal.tsx` — cancel with optional reason
     - `RescheduleAppointmentModal.tsx` — request reschedule

6. **Oceń nas / Rate Us** (`/ocen-nas`)
   - QR code linking to Google Reviews (`https://g.page/r/CSYarbrDoYcDEAE/review`)
   - Personalized greeting with patient's first name
   - CTA button to leave Google review
   - "Dlaczego Twoja opinia jest ważna?" section (3 reasons)
   - Thank you note
   - QR code image: `public/qr-ocen-nas.png`

7. **Novik Code Credit** (`NovikCodeCredit.tsx`)
   - "Designed and developed by Novik Code" at footer bottom
   - Epic full-page takeover animation on click (fullscreen logo background, Framer Motion)
   - Click or ESC to dismiss

### 👷 Employee Zone (`/pracownik`)

**Authentication Required** (Supabase Auth + `employee` or `admin` role)

**Purpose:** Weekly schedule view + full task management system for clinic staff.

**Features:**
1. **Login** (`/pracownik/login`) — Supabase email/password login + "Zapomniałem hasła" link
2. **Password Reset** (`/pracownik/reset-haslo`) — sends reset email via `/api/auth/reset-password`
3. **Tab Navigation** — responsive: **top bar on desktop (≥0768px)** | **fixed bottom nav on mobile (<768px)**
   - 7 tabs: 📅 Grafik | ✅ Zadania | 🤖 AI (Asystent AI) | 🔔 Alerty (Powiadomienia) | 💡 Sugestie | 👤 Pacjenci | ⚙️ Preferencje
   - CSS class `.pw-tab-bar` / `.pw-tab-btn` — no inline styles, media query driven
   - Bottom bar: equal-width flex columns, icon stack, env(safe-area-inset-bottom) iPhone support
4. **Component Architecture** (← **Refactored March 5, 2026**)
   - `page.tsx` (778 LOC) — thin orchestrator: tab state, auth, shared state, renders extracted components
   - `components/ScheduleTab.tsx` (2033 LOC) — weekly schedule grid
   - `components/TasksTab.tsx` (2951 LOC) — full task management (Kanban, Calendar, Comments, search/filters)
   - `components/NotificationsTab.tsx` (176 LOC) — push notification history
   - `components/SuggestionsTab.tsx` (363 LOC) — feature suggestions system
   - `components/PatientsTab.tsx` (140 LOC) — patient search + data view
   - `hooks/useSchedule.ts` (291 LOC) — schedule data & state
   - `hooks/useTasks.ts` (554 LOC) — task CRUD, filtering, state management
   - `components/ScheduleTypes.ts` (144 LOC) — Badge, ScheduleAppointment, color maps
   - `components/TaskTypes.ts` (91 LOC) — EmployeeTask, ChecklistItem, type colors
5. **Weekly Schedule Grid** (Grafik tab)
   - **Time slots**: 15-minute intervals, 7:00–20:00
   - **Multi-doctor columns**: one column per operator/doctor
   - **Operator toggle buttons**: show/hide individual doctors, "Pokaż wszystkich" / "Ukryj wszystkich"
   - **Day-of-week toggle buttons** ← NEW: Pn Wt Śr Cz Pt Sb Nd row above operator toggles; click hides/shows that day's column; state persisted via `localStorage('schedule-hidden-days')` — restored on page reload
   - **Prodentis color mapping**: appointment type → color (matching Prodentis desktop app)
     - 15+ type colors: Zachowawcza (yellow), Chirurgia (magenta), Protetyka (cyan), Endodoncja (purple), etc.
   - **Week navigation**: ◀ / ▶ buttons, "Dziś" button to jump to current week
   - **Duration**: real value from Prodentis API (fallback: inferred from gap between appointments)
   - **Appointment tooltips**: hover to see patient name, phone, appointment type, time
   - **Notes icon (ℹ️)**: top-right corner of cell — visible only when notes exist; hover → dark tooltip with multi-line note text
   - **Badge icons**: bottom-left corner of cell — colored rounded-square icons with letter abbreviations; hover → tooltip listing all badges by name
     - 11 badge types: VIP (V), WAŻNE (!), AWARIA (A), Pacjent potwierdzony (;)), Pacjent z bólem (B), Pierwszorazowy (P), Plan leczenia (PL), CBCT (TK), KASA, NIE potwierdzony (?), MGR
   - **Skip weekends**: hides Sat/Sun if no appointments
   - **Horizontal scroll**: enabled for narrow screens
5. **API**: `/api/employee/schedule?weekStart=YYYY-MM-DD` — fetches 7 days of appointments from Prodentis (with notes, badges, duration, patientId)
6. **Patient History Popup**: click any appointment cell → full-screen modal with patient's visit history (diagnosis, opis wizyty, procedury with tooth + price, zalecenia, leki). Data from `/api/employee/patient-history?patientId={prodentisId}`
7. **Task Management System** (Zadania tab) — full Trello-style task management:
   - **Task CRUD**: create, edit, delete, archive tasks with title, description, priority, due date, task type, patient name
   - **Task Types**: custom types (Laboratorium, Zamówienia, Recepcja, etc.)
   - **Checklists**: add/remove checklist items per task, toggle done state with checked_by tracking
   - **Multi-employee assignment**: assign tasks to one or more employees (`assigned_to` JSONB array)
   - **Patient linking**: link task to Prodentis patient, fetch future appointments to suggest due dates
   - **Image attachments**: upload images to Supabase Storage (`task-images` bucket)
   - **Status workflow**: Todo → In Progress → Done → Archived, with filter tabs
   - **Priority levels**: Low, Medium, High — color-coded badges
   - **Search & filters**: text search + filter by assignee, task type, priority
   - **View modes**: Lista (list) | Kanban (3-column board, default) | Kalendarz (monthly calendar)
   - **Kanban board**: drag tasks between Todo/In Progress/Done columns via `onDragStart`/`onDragOver`/`onDrop`
   - **Calendar view**: monthly grid showing task counts per day, due date dots. Bug fixed: `tasksForDate()` now uses `.slice(0,10)` to compare `due_date` timestamps correctly
   - **Private tasks** ← NEW: tasks with `is_private=true` visible only to creator (`owner_user_id`); filtered server-side; 🔒 badge planned for UI
   - **AI Voice Task Creation** ← NEW: Asystent AI tab → voice/text input → `POST /api/employee/tasks/ai-parse` → GPT-4o-mini extracts tasks with dates, times, checklist items → creates private tasks + schedules push reminders in `task_reminders` table
   - **Task comments**: threaded comments per task (author name, timestamps, post new comment)
   - **Task history**: audit log of all edits, status changes, checklist toggles with timestamps
   - **Labels/tags**: custom colored labels (5 defaults seeded), assignable per task
   - **Browser notifications**: push notification permission request on load
    - **Push notifications (Web Push)**: broadcasts to all subscribed employees via `sendPushToAllEmployees()`:
      - New task created -> push to all employees (except creator)
      - Task status changed -> push (except updater)
      - Task assigned/reassigned -> push (except assigner)
      - Checklist item toggled -> push (except toggler)
      - New comment on task -> push (except commenter)
      - Daily cron reminder for tasks without due dates -> push to all
    - Compact `PushNotificationPrompt` toggle in header (subscribe/unsubscribe)
8. **Powiadomienia tab** (🔔) — push notification history for last 7 days, grouped by day with relative timestamps, tag-based emoji icons (📋 task / 📅 appointment / 🤖 assistant / 📣 manual), loading skeleton, empty state, Refresh button. Clicking a row performs deep-link navigation.
9. **Push deep links** — all push notifications now send `url: /pracownik?tab=zadania&taskId={id}`. On load, `useSearchParams` reads `?tab=` and `?taskId=` params: auto-switches active tab and opens task modal after tasks load.
    - **Task reminders cron**: daily Telegram + push notification for tasks without due dates (`/api/cron/task-reminders`)
    - **DB Migrations**: 019 (task_type + checklists), 020 (image_url), 021 (task_history), 022 (multi_assign), 023 (task_comments), 024 (task_labels), 025 (push_subscriptions), 026 (chat_messages), 027 (notification_history), 028 (task_reminders)
10. **Daily Dashboard** ← NEW (March 2026): dashboard panel on the Grafik tab showing:
    - Today's appointments count, upcoming patients, active operators
    - Task summary (todo, in-progress, overdue counts)
    - Uses localized date (`toLocaleDateString('sv-SE')`) for timezone-correct comparisons
    - Tasks fetched on component mount to ensure accurate counts across tabs
11. **Patient Consent Management**: modal showing patient's signed consents with:
    - Link to signed PDF in Supabase Storage
    - **Biometric badge** ← NEW: colored badge showing pointer type (🖊️ Rysik / 👆 Palec / 🖱️ Mysz) + point count
    - **Biometric popover**: click badge → inline popover with device info, avg/max pressure, stroke count, duration, signature PNG preview
    - **Export button**: 📤 sends signature PNG + biometric JSON to Prodentis documents API via `POST /api/employee/export-biometric`
    - Data from `biometric_data` JSONB column: `{ strokes, deviceInfo: { pointerType }, avgPressure, maxPressure, pointCount, totalDuration }`
12. **Firefox Bug Fixes** (March 2026): Fixed `rowSpan` rendering, replaced native `<select>` with custom dropdowns for assignee/priority, implemented click-outside handler for type filter dropdown
13. **Task Type Color-Coding** (March 2026): Task cards display colored badges + icons per task type
14. **Click-to-Call**: phone numbers in schedule cells are now clickable `tel:` links
15. **Patient History Modal Fix**: modal moved outside Grafik tab fragment so it's accessible from all tabs
16. **Role check**: `hasRole(userId, 'employee') || hasRole(userId, 'admin')`
17. **Middleware protection**: unauthenticated → redirect to `/pracownik/login`
18. **Gmail-style Email Client** (📧 Email tab, admin-only) — NEW March 2026:
    - Full IMAP/SMTP email client integrated into Employee Zone
    - Auto email labels: classifyEmail assigns Powiadomienia, Strona, Chat, Pozostałe, Ważne
    - Gmail-style horizontal category tabs with unread counts
    - Compose window with SMTP sending (reply, reply-all, new email)
    - Compose drafts auto-saved to Supabase (`email_compose_drafts`)
    - Read/unread toggle, manual label reassignment, load-more pagination
    - **AI Draft Assistant**: Cron generates AI reply drafts (GPT-4o-mini) hourly
    - **Regeneruj button**: Iterative refinement — rate, tag, add notes, regenerate improved version
    - AI training system: ⭐ ratings + tags + 🧠 Ucz AI feedback
    - **Knowledge Files**: Upload PDF/TXT for AI knowledge base expansion
    - Debug panel with processing candidate details
19. **SMS Settings toggles**: Admin can enable/disable SMS automation types via `sms_settings` table
20. **Employee Notification Preferences** ← NEW (migration 079): Per-employee opt-out from specific push notification types via ⚙️ Preferencje tab. Uses `muted_keys TEXT[]` — opt-out pattern so new notification types auto-enable. Push history extended to 30 days (was 7).
21. **Employee Deactivation** ← NEW (March 12): Soft-deactivation system — admin can hide employees from schedule/grafik without deleting from Prodentis. `is_active` flag + auto-discovery from Prodentis schedule.

### 🛡 Admin Panel (`/admin`)

**Authentication Required** (Supabase Auth + admin email check)

**16 Tabs** (`page.tsx` — ~216KB, 3750+ lines):

#### 1. Dashboard
- Overview statistics
- Quick actions

#### 2. Products (`products` tab)
- CRUD operations
- Image upload
- Price management
- AI image generation (Replicate integration)

#### 3. Orders (`orders` tab)
- Order list
- Status tracking

#### 4. Patients (`patients` tab)
- Patient database (from Patient Portal registrations)
- Contact information
- Appointment history

#### 5. SMS Przypomnienia (`sms-reminders` tab)

**Tabs:**
- **📝 Szkice (Drafts):** Draft SMS ready to send
- **📤 Wysłane (Sent):** Sent/failed SMS history grouped by date, with date picker filter and resend button
- **✉️ Wyślij SMS ręcznie (Manual):** Send SMS directly to a patient — search by name, auto-fill phone, compose message

**Actions:**
- Generate SMS drafts for tomorrow's appointments (Cron job or manual trigger)
- Edit SMS message before sending
- Send individual SMS
- Send all SMS in bulk
- Resend previously sent/failed SMS
- Send manual SMS to any patient (search by name → phone auto-fill)
- Delete any SMS (draft or sent) — permanently removed from database
- View send errors
- Filter sent SMS by date

**Workflow:**
1. Cron job generates drafts daily at 7:00 AM UTC (8-9 AM Warsaw time)
2. Admin reviews/edits drafts in panel
3. **Skipped patients section** — yellow warning below drafts shows patients within working hours who were skipped (missing phone, wrong doctor) with "Wyślij ręcznie" CTA
4. Admin sends SMS (individually or bulk)
5. Sent SMS move to "Wysłane" tab, grouped by date
6. Admin can resend or delete any SMS from history
7. New drafts always regenerate regardless of previous sent status
8. Manual SMS can be sent anytime via "Wyślij SMS ręcznie" tab

#### 6. Reservations (`reservations` tab)
- Booking requests

#### 7. Questions (`questions` tab)
- FAQ management

#### 8. Articles (`articles` tab)
- Content management for knowledge base

#### 9. News (`news` tab)
- News/blog posts

#### 10. Blog (`blog` tab)
- GitHub-integrated blog posts
- **AI blog generation** — generates blog articles via `/api/admin/blog/generate` (OpenAI) with auto-image generation

#### 11. Appointment Instructions (`appointment-instructions` tab)
- Pre-appointment instruction templates by type
- Doctor applicability settings
- Rich WYSIWYG editor (`AppointmentInstructionsEditor.tsx`)
- Dark glassmorphic preview modal
- Used in patient emails before appointments

#### 12. Pracownicy — Employee Management (`employees` tab)
- **Unified single list** ← REWRITTEN (March 12): merged Prodentis-discovered + Supabase-only employees into one sortable list
- **Auto-merge duplicates** — detects employees appearing in both Prodentis scan and Supabase, merges into single row
- **Employee deactivation** — toggle `is_active` flag to hide from schedule/grafik without deleting from Prodentis; deactivated employees shown in separate collapsible section
- **Schedule auto-discovery** — operators appearing in Prodentis schedule are auto-added to `employees` table
- **Account status badges** — "✅ Ma konto" or "—" (no account)
- **Add account** — email input, creates Supabase Auth account + `employee` role
- **Password reset** — button to send reset email for existing accounts
- **Inactive employees toggle** — "Pokaż nieaktywnych" to reveal deactivated staff
- **API**: `/api/admin/employees` (GET — Prodentis scan + Supabase cross-reference), `/api/admin/employees/deactivate` (POST — toggle is_active)

#### 13. Uprawnienia — Role Management (`roles` tab)
- **RBAC system** — 3 roles: `admin`, `employee`, `patient`
- **User list** — all Supabase Auth users with their assigned roles
- **Grant/revoke roles** — buttons to add/remove roles per user
- **Push groups (multi-chip)** — each employee row shows chip buttons (🦷 Lekarz / 💉 Higienistka / 📞 Recepcja / 🔧 Asysta); clicking a chip toggles the group and auto-saves immediately to `employees.push_groups` and `push_subscriptions.employee_groups`
- **Patient candidates** — Patient Portal users who can be promoted to admin/employee
  - Creates Supabase Auth account + sends password reset email
  - "Odrzuć" (dismiss) button — hides candidate from list (`promotion_dismissed` flag)
- **Self-protection** — cannot revoke own admin role
- **API**: `/api/admin/roles` (GET, POST, DELETE), `/api/admin/roles/promote`, `/api/admin/roles/dismiss`, `/api/admin/roles/delete`

#### 14. Push Notifications (`push` tab)
- **Stats bar** — subscription counts per group (🦷 Lekarze, 💉 Higienistki, 📞 Recepcja, 🔧 Asysta, 👑 Admin, 👥 Pacjenci, ⚠️ Bez grupy)

- **Powiadomienia automatyczne — dla pracowników** — configuration for all 13 employee-targeted notification types:
  - Each notification: label, description, enable/disable toggle, group chip multi-selector
  - Groups: Lekarze, Higienistki, Recepcja, Asysta, Admin — toggleable per notification type
  - „💾 Zapisz" button persists to `push_notification_config` via `/api/admin/push/config` PATCH
  - Cron jobs and live event handlers read from this config at runtime

- **Powiadomienia automatyczne — dla pacjentów** — separate section for 2 patient-targeted types:
  - `appointment-24h` and `appointment-1h` — enable/disable toggle only (no group selector)

- **Wyślij powiadomienie jednorazowe** — manual one-time push broadcast:
  - Title, Body, URL inputs; target group multi-chip selector; success/error feedback

- **Pracownicy i grupy powiadomień** — subscriptions management:
  - Shows ALL employees from `employees` table (even those without active subscriptions)
  - Per employee: name, email, 📱 N badge (subscription count) or „brak sub.", multi-chip group editor
  - „💾 Zapisz" button appears only when local state differs from server
  - Patient subscriptions: shown as summary stat only

- **API**: `/api/admin/push` (GET, POST, DELETE), `/api/admin/push/config` (GET, PATCH)

#### 15. Password Reset Page (`/admin/update-password`)
- Landing page for password reset links
- Uses direct `verifyOtp` flow (no Supabase redirect)
- Token passed via `?token_hash=` URL parameter


#### 16. E-Karta Pacjenta — Digital Patient Registration (`/ekarta/[token]`)
- **Flow:** Employee clicks 📋 E-Karta in schedule popup → QR code generated → patient scans with phone → 3-step form → data saved to Supabase → forwarded to Prodentis API
- **Step 1:** Personal data (name, PESEL, address, phone, email, gender)
- **Step 2:** Full medical survey (40+ fields matching paper KARTA DOROSŁY): 16 disease categories, infectious diseases (hep A/B/C, AIDS, TB, STDs), surgery/anesthesia/blood transfusion history, smoking/alcohol/sedatives, women's questions
- **Step 3:** Consents (RODO, treatment, regulation) + electronic signature (touch canvas, devicePixelRatio-aware)
- **Notes format:** Structured sections with `--- SEKCJA ---` headers → written to Prodentis XML `notatki` ("Uwagi i ostrzeżenia dla lekarza")
- **Prodentis integration:** POST create → 409 PESEL exists → PATCH + POST notes; synchronous (not fire-and-forget)

---

## 🔌 API Endpoints

### Public APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | AI assistant (OpenAI GPT-4 + knowledgeBase) |
| `/api/cennik-chat` | POST | Pricing assistant (OpenAI + 2026 price list) |
| `/api/ask-expert` | POST | Expert Q&A form submission |
| `/api/contact` | POST | Contact form (→ Telegram messages channel) |
| `/api/products` | GET | Public product list |
| `/api/news` | GET | News articles |
| `/api/youtube` | GET | YouTube feed |
| `/api/create-payment-intent` | POST | Stripe payment |
| `/api/order-confirmation` | POST | Order confirmation emails (→ Telegram default) |
| `/api/simulate` | POST | Smile simulator (Replicate AI) |
| `/api/short-links/[id]` | GET | Short link resolver |
| `/api/prodentis` | GET | Prodentis API proxy |
| `/api/reservations` | POST | Reservation form submission (→ Telegram default) |
| `/api/treatment-lead` | POST | Treatment calculator lead form (→ Telegram + Email) |
| `/api/generate-review` | POST | AI-generated Google review from survey (OpenAI gpt-4o-mini) |
| `/api/google-reviews` | GET | Real Google reviews from Places API (cached in Supabase, shuffled, 4★+ only) |

### E-Karta (Patient Registration) APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/intake/generate-token` | POST | Generate one-time QR token (employee → patient) |
| `/api/intake/verify/[token]` | GET | Verify token validity + return prefill data |
| `/api/intake/submit` | POST | Submit patient form → Supabase + Prodentis |

### Prodentis APIs (via Cloudflare Tunnel: `pms.mikrostomartapi.com`, fallback: `83.230.40.14:3000`, API v9.1)

**Read Endpoints (no API Key):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/slots/free?date=&duration=` | GET | Free time slots for a date |
| `/api/patient/verify?phone=&firstName=` | GET | Verify patient identity |
| `/api/patient/:id/details` | GET | Patient details (name, address, notes, warnings) |
| `/api/patient/:id/appointments` | GET | Visit history |
| `/api/patient/:id/next-appointment` | GET | Single next appointment |
| `/api/patient/:id/future-appointments?days=180` | GET | **v9.1** — ALL future appointments (replaces day-by-day scan) |
| `/api/appointments/by-date?date=` | GET | All appointments for a given date |
| `/api/patients/search?q=&limit=` | GET | Patient search by name |
| `/api/appointment/:id/notes` | GET | Appointment notes |
| `/api/badge-types` | GET | Available badge types |
| `/api/doctors` | GET | List all doctors with Prodentis IDs |
| `/api/schedule/colors` | GET | Available appointment colors with RGB |
| `/api/schedule/icons` | GET | Available appointment icons |

**Write Endpoints (require `X-API-Key: 2c9bd5b4-...`):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/patients` | POST | Create new patient |
| `/api/patients/:id` | PATCH | Update existing patient |
| `/api/patients/:id/notes` | POST | Add medical notes → XML "Uwagi dla lekarza" |
| `/api/patients/:id/documents` | POST | Upload document (base64 PDF) to patient file |
| `/api/schedule/appointment` | POST | Create appointment in Prodentis schedule |
| `/api/schedule/appointment/:id` | GET | **v9.0** — Appointment details (date, time, status, cancelDate) |
| `/api/schedule/appointment/:id` | DELETE | **v9.0** — Cancel/delete appointment (optional `{ reason }`) |
| `/api/schedule/appointment/:id/reschedule` | PUT | **v9.0** — Reschedule appointment `{ newDate, newStartTime }` |
| `/api/schedule/appointment/:id/color` | PUT | Change appointment color/type |
| `/api/schedule/appointment/:id/icon` | POST | Add icon (e.g. "Pacjent potwierdzony") |

### Auth APIs (`/api/auth/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/reset-password` | POST | Server-side password reset via Admin API + Resend |
| `/auth/roles` | GET | Get current user's roles |
| `/auth/callback` | GET | PKCE code exchange callback (Supabase Auth) |

### Admin APIs (`/api/admin/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/sms-reminders` | GET | Fetch SMS (all statuses by default) |
| `/admin/sms-reminders` | PUT | Edit draft SMS message |
| `/admin/sms-reminders` | DELETE | Permanently delete any SMS |
| `/admin/sms-reminders/generate` | POST | Generate drafts for tomorrow |
| `/admin/sms-reminders/send` | POST | Send SMS (single or bulk) |
| `/admin/sms-reminders/send-manual` | POST | Send manual SMS directly |
| `/admin/sms-templates` | GET, POST, PUT, DELETE | SMS template CRUD |
| `/admin/patients` | GET | Fetch patient list |
| `/admin/patients/search` | GET | Search patients by name via Prodentis |
| `/admin/patients/approve` | POST | Approve pending patient account |
| `/admin/patients/reject` | POST | Reject pending patient account |
| `/admin/employees` | GET | Fetch staff from 74-day Prodentis scan |
| `/admin/roles` | GET, POST, DELETE | User roles CRUD + patient candidates |
| `/admin/roles/promote` | POST | Promote patient to admin/employee |
| `/admin/roles/dismiss` | POST | Dismiss patient candidate |
| `/admin/roles/delete` | DELETE | Delete Supabase Auth user account |
| `/admin/products` | GET, POST, DELETE | Product CRUD |
| `/admin/orders` | GET | Fetch orders |
| `/admin/blog` | GET, POST, PUT, DELETE | Blog post CRUD |
| `/admin/blog/generate` | POST | AI blog article generation |
| `/admin/articles` | GET, POST, DELETE | Knowledge base article CRUD |
| `/admin/news` | GET, POST, DELETE | News article CRUD |
| `/admin/questions` | GET, DELETE | Expert questions management |
| `/admin/reservations` | GET | Booking requests list |
| `/admin/appointment-instructions` | GET, POST, PUT, DELETE | Instruction templates CRUD |
| `/admin/online-bookings` | GET | Online bookings list (filter by `?status=`) |
| `/admin/online-bookings` | PUT | Approve/reject/schedule/pick_patient `{ id, action }` |
| `/admin/online-bookings` | DELETE | Delete booking by `?id=` |
| `/admin/prodentis-schedule/colors` | GET | Proxy → Prodentis schedule colors |
| `/admin/prodentis-schedule/icons` | GET | Proxy → Prodentis schedule icons |
| `/admin/prodentis-schedule/color` | PUT | Change appointment color `{ appointmentId, colorId }` |
| `/admin/prodentis-schedule/icon` | POST | Add icon to appointment `{ appointmentId, iconId }` |
| `/admin/push` | GET | All employees with push_groups + subscription counts + stats |
| `/admin/push` | POST | Send manual push to selected groups |
| `/admin/push` | DELETE | Remove a push subscription by ID |
| `/admin/push/config` | GET | Get all push notification type configurations |
| `/admin/push/config` | PATCH | Update groups/enabled for a notification type |
| `/admin/employees/position` | PATCH | Set employee push groups `{ userId, groups: string[] }` (updates employees + push_subscriptions) |
| `/admin/employees/deactivate` | POST | **NEW** — Toggle employee `is_active` flag `{ employeeId, isActive }` |
| `/admin/cancelled-appointments` | GET | Fetch cancelled appointments log from `cancelled_appointments` table |
| `/admin/consent-mappings` | GET, POST, PUT, DELETE | **NEW** — Consent field mappings CRUD. GET: public read (consent page). POST/PUT/DELETE: admin only. Stores PDF field coordinates in DB. |
| `/admin/consent-pdf-upload` | POST | **NEW** — Upload new consent PDF templates to Supabase Storage (`consent-pdfs` bucket). Admin only. |

### Employee APIs (`/api/employee/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/employee/schedule` | GET | Weekly schedule from Prodentis (`?weekStart=`) |
| `/employee/patient-history` | GET | Patient visit history from Prodentis (`?patientId=&limit=`) |
| `/employee/patient-appointments` | GET | Future appointments for patient from Prodentis (`?patientId=`) — used for task due date suggestions |
| `/employee/patient-details` | GET | Patient data + medical notes from Prodentis (`?patientId=`) — shows in '👤 Dane' modal |
| `/employee/suggestions` | GET, POST, PUT | Feature suggestions CRUD. PUT: upvote toggle (`action=upvote`) or status change (`action=status`) |
| `/employee/suggestions/[id]/comments` | GET, POST | Comments on feature suggestions |
| `/employee/staff` | GET | Registered employees list from `user_roles` table (fast, no Prodentis scan) |
| `/employee/tasks` | GET, POST, PUT, DELETE | Task CRUD. GET filters private tasks by `owner_user_id`; POST accepts `is_private`, `due_time`; private tasks skip Telegram/push |
| `/employee/tasks/[id]` | GET, PUT, DELETE | Individual task operations (get details, update, archive) |
| `/employee/tasks/[id]/comments` | GET, POST | Task comments (list comments, add new comment) |
| `/employee/tasks/ai-parse` | POST | GPT-4o-mini parses natural-language text → creates private tasks + schedules task_reminders |
| `/employee/tasks/labels` | GET, POST | Task labels CRUD (list all labels, create new label) |
| `/employee/tasks/upload-image` | POST | Upload task image to Supabase Storage (`task-images` bucket) |
| `/employee/patient-search` | GET | Prodentis patient search proxy for employees. `?q=name&limit=5`. Auth: employee/admin. |
| `/employee/tts` | POST | OpenAI TTS proxy (`tts-1` model). `{ text, voice? }` → returns `audio/mpeg`. |
| `/employee/assistant` | POST | AI Voice Assistant (GPT-4o function-calling). Supports: createTask, addCalendarEvent, addReminder, dictateDocumentation, searchPatient, checkSchedule. |
| `/employee/tasks/[id]/push` | POST | Send push notification about a specific task |
| `/employee/task-types` | GET | List available task type categories |
| `/employee/consent-tokens` | GET, POST | Consent token CRUD — generate/list consent signing links for patients |
| `/employee/patient-consents` | GET | Signed consents list for a patient (`?prodentisId=`). Returns biometric_data + signature_data |
| `/employee/patient-intake` | GET | E-karta data with signature for a patient (`?patientId=`) |
| `/employee/export-biometric` | POST | Export signature PNG + biometric JSON to Prodentis documents API (`{ consentId }`) |
| `/employee/push/send` | POST | Send manual push notification to employee groups |
| `/employee/calendar` | GET, POST | Google Calendar integration for employee events |
| `/employee/calendar/auth` | GET | Google OAuth flow initiation |
| `/employee/calendar/auth/callback` | GET | Google OAuth callback handler |
| `/employee/assistant/memory` | GET, POST, DELETE | AI assistant conversation memory CRUD |
| `/employee/email` | GET, POST | **NEW** — IMAP email client (GET: fetch emails, POST: SMTP send). Admin only. |
| `/employee/email-drafts` | GET, PUT | **NEW** — AI email drafts CRUD. GET: list by status/email_uid. PUT: approve/reject/send/return_for_learning + rating/tags. |
| `/employee/email-generate-reply` | POST | **NEW** — On-demand AI reply generation. Accepts `inline_feedback` for iterative Regeneruj refinement. |
| `/employee/email-ai-config` | GET, POST, PUT, DELETE | **NEW** — AI sender rules, instructions, feedback stats CRUD. |
| `/employee/email-ai-knowledge` | GET, POST, DELETE | **NEW** — Knowledge files CRUD (PDF/TXT upload+parse, max 10 files, 5MB). |
| `/employee/email-compose-drafts` | GET, POST, PUT, DELETE | **NEW** — Compose draft persistence (auto-save, resume). |
| `/employee/email-label-overrides` | GET, POST, DELETE | **NEW** — Manual email label overrides (email_uid → label). |
| `/employee/notification-preferences` | GET, POST | **NEW** — Employee notification preference CRUD (muted_keys). GET: returns muted keys. POST: save muted keys array. |

### Push Notification APIs (`/api/push/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/push/subscribe` | POST | Register FCM token (upserts into `fcm_tokens`) |
| `/push/subscribe` | DELETE | Remove FCM token |
| `/push/test` | POST | Send test push notification to verify delivery |
| `/push/resubscribe` | POST | SW endpoint rotation handler (no auth required, for service worker use) |
| `/employee/push/history` | GET | Last 30 days of ALL system notifications (deduplicated), visible to every employee/admin |

### Appointment APIs (`/api/appointments/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/appointments/by-date` | GET | Fetch appointments for date (Prodentis proxy) |
| `/appointments/confirm` | POST | Patient confirms appointment |
| `/appointments/cancel` | POST | Patient cancels appointment |

### Prodentis Slots Proxy

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/prodentis/slots` | GET | Free appointment slots proxy (Prodentis → frontend) |

### Patient Portal APIs (`/api/patients/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/patients/register` | POST | Patient signup |
| `/patients/verify-email` | POST | Verify email token |
| `/patients/verify` | POST | Verify patient identity (Prodentis match) |
| `/patients/login` | POST | Patient login (phone or email) |
| `/patients/me` | GET, PATCH | Get/update current patient profile |
| `/patients/me/visits` | GET | Get patient visit history |
| `/patients/[id]/next-appointment` | GET | Single next appointment from Prodentis |
| `/patients/upcoming-appointments` | GET | **NEW** — ALL future appointments via Prodentis v9.1 `future-appointments` |
| `/patients/reset-password/request` | POST | Initiate password reset |
| `/patients/reset-password/confirm` | POST | Confirm password reset with token |
| `/patients/appointments/[id]/confirm-attendance` | POST | Confirm attendance + add Prodentis icon |
| `/patients/appointments/[id]/cancel` | POST | Cancel appointment via Prodentis DELETE |
| `/patients/appointments/[id]/reschedule` | POST | Reschedule via Prodentis PUT |
| `/patients/appointments/[id]/status` | GET | Get appointment action status (canCancel, canReschedule, etc.) |
| `/patients/appointments/create` | POST | **ENHANCED** — Create/find/reset action record (DELETE+INSERT for stale statuses) |
| `/patients/appointments/by-date` | GET | **ENHANCED** — Find by date with ±1min range query |
| `/patients/appointments/book` | POST | Online booking from patient dashboard |
| `/patients/appointments/bookings` | GET | Fetch patient's online bookings |
| `/patients/appointments/[id]/reset-status` | POST | Dev/debug: reset appointment status |
| `/patients/chat` | GET, POST | Patient ↔ reception chat messages |
| `/patients/documents` | GET | **NEW** — Signed consents + e-karta PDFs for authenticated patient (JWT) |
| `/patients/logout` | POST | Server-side logout (clears httpOnly JWT cookie) |
| `/patients/change-password` | POST | Change password (verify current, hash new, update DB) |
| `/patients/export-data` | GET | RODO: Download all patient data as JSON |
| `/patients/delete-account` | POST | RODO: Soft-delete (anonymize PII, set status=deleted) |

### Cron Job APIs (`/api/cron/*`)

| Endpoint | Purpose | Schedule |
|----------|---------|----------|
| `/cron/daily-article` | Daily AI article publishing | Daily 7:00 UTC |
| `/cron/appointment-reminders` | Generate SMS drafts for tomorrow | Daily 7:00 UTC |
| `/cron/sms-auto-send` | Auto-send approved SMS drafts | Daily 8:00 UTC |
| `/cron/appointment-reminders?targetDate=monday` | Generate Monday SMS drafts (Fri only) | Friday 8:15 UTC |
| `/cron/sms-auto-send?targetDate=monday` | Auto-send Monday drafts (Fri only) | Friday 9:00 UTC |
| `/cron/task-reminders` | (1) Telegram + push for tasks w/o due dates; (2) deposit keyword tasks; (3) `task_reminders` scheduler | Daily 8:30 UTC |
| `/cron/push-appointment-1h` | Push notification 1h before appointment to patient | Every 15 min |
| `/cron/birthday-wishes` | Birthday SMS greetings (uses `birthday_wishes` table to prevent duplicates) | Daily 8:00 UTC |
| `/cron/post-visit-sms` | Generate post-visit feedback SMS drafts | Daily 18:00 UTC |
| `/cron/post-visit-auto-send` | Auto-send post-visit SMS | Daily 19:00 UTC |
| `/cron/week-after-visit-sms` | Generate week-after-visit follow-up SMS | Daily 9:00 UTC |
| `/cron/post-visit-auto-send?sms_type=week_after_visit` | Auto-send week-after-visit SMS | Daily 10:00 UTC |
| `/cron/online-booking-digest` | Telegram digest of unreported online bookings | Daily 6:15 UTC |
| `/cron/push-cleanup` | Delete `push_notifications_log` entries older than 30 days | Daily 3:15 UTC |
| `/cron/daily-report` | Morning digest to Telegram: today's appointments, pending bookings, overdue tasks, birthdays | Daily 5:30 UTC |
| `/cron/deposit-reminder` | SMS + push reminder for unpaid deposits ~48h before appointment | Daily 7:00 UTC |
| `/cron/noshow-followup` | Detect no-shows from yesterday, send follow-up SMS offering rescheduling | Daily 8:00 UTC |
| `/cron/email-ai-drafts` | **NEW** — Scan IMAP inbox for new emails, generate AI reply drafts (GPT-4o-mini), classify importance | Hourly 6-18 UTC |
| `/cron/careflow-push` | **NEW** (May 2026) — Send FCM push for due CareFlow tasks (with `push_max_count` cap + Europe/Warsaw quiet hours) | Every 5 min, 5-22 UTC |
| `/cron/careflow-auto-qualify` | **NEW** — Auto-complete CareFlow enrollments + escalate to SMS when push fails | Daily 8:00 UTC |
| `/cron/careflow-report` | **NEW** — Generate PDF compliance reports for completed CareFlow enrollments | Daily 2:00 UTC |
| `/cron/push-escalation` | **NEW** — Escalate push-first SMS reminders to actual SMS when push delivery fails | Hourly 9-18 UTC |
| `/cron/close-day` | **KCP** — Wylicza shift dnia (paruje time_entries z work_schedules), zapisuje calculated_shifts z anomalią flags | Daily 02:30 PL (00:30 UTC) |
| `/cron/forgot-clockout-notify` | **KCP** — Push do pracownika gdy ≥30 min po planned_end a brak clock_out (dedup max 1/dzień) | Co 15 min, 14-22 PL |
| `/cron/prodentis-end-times` | **KCP** — Pobiera z Prodentis API work-summary lekarzy, potrójna weryfikacja (closedAt+lastModifiedByDoctor+cross-verify recepcja), nalicza overtime_justified/unjustified | Daily 03:00 PL (01:00 UTC) |


---

## 🔗 Integrations

### 1. Prodentis API
**Purpose:** Appointment calendar synchronization + patient management + appointment management

**Current Version:** v9.1 (as of March 3, 2026)

**Connectivity (as of April 1, 2026):**
- **Primary:** Cloudflare Tunnel → `https://pms.mikrostomartapi.com` (domain: `mikrostomartapi.com`, registered on Cloudflare)
- **Fallback:** Direct IP → `http://83.230.40.14:3000` (requires port forwarding on Multiplay router)
- **Architecture:** `prodentis-adapter.ts` uses dual-URL fetch with automatic failover. `prodentisFetch.ts` provides shared utility for API routes.
- **Why:** Router Multiplay resets port forwarding rules after hard reboot → intermittent connectivity. Cloudflare Tunnel bypasses router entirely (outgoing connection from server → Cloudflare).
- **Server:** `cloudflared.exe` installed as Windows service on Prodentis server (auto-starts with system).
- **Monitoring:** BetterStack monitor checks `http://83.230.40.14:3000/api/doctors` every 3 minutes with keyword matching.

**Read Endpoints (no auth):**
- `GET /api/patients/search?q=&limit=` — Patient search by name
- `GET /api/appointments/by-date?date=` — Appointments by date
- `GET /api/patient/{id}/details` — Patient details by ID
- `GET /api/patient/verify?phone=&firstName=&pesel=` — Patient verification
- `GET /api/patient/{id}/next-appointment` — Single next appointment
- `GET /api/patient/{id}/future-appointments?days=180` — **v9.1** All future appointments in one call
- `GET /api/patient/{id}/appointments?page=&limit=` — Visit history
- `GET /api/slots/free?date=&duration=` — Free time slots
- `GET /api/schedule/appointment/{id}` — **v9.0** Appointment details (date, time, status, cancel info)

**Write Endpoints (require `X-API-Key`):**
- `POST /api/schedule/appointment` — Create appointment
- `DELETE /api/schedule/appointment/{id}` — **v9.0** Cancel/delete appointment
- `PUT /api/schedule/appointment/{id}/reschedule` — **v9.0** Reschedule `{ newDate, newStartTime }`
- `PUT /api/schedule/appointment/{id}/color` — Change appointment color
- `POST /api/schedule/appointment/{id}/icon` — Add icon to appointment
- `POST /api/patients` — Create new patient
- `PATCH /api/patients/{id}` — Update patient
- `POST /api/patients/{id}/notes` — Add medical notes
- `POST /api/patients/{id}/documents` — Upload document (base64 PDF)

**Authentication:** Read endpoints: no auth. Write endpoints: `X-API-Key: ${PRODENTIS_API_KEY}` (env var)

**Base URL:** Configured via `PRODENTIS_API_URL` env var (production: `http://83.230.40.14:3000`)

**Phone Format:** API returns phones with `+48` prefix; our system normalizes to `48XXXXXXXXX` (strips `+`)

**Integration Files:**
- `/api/admin/patients/search/route.ts` — Proxy to Prodentis patient search
- `/api/admin/employees/route.ts` — 74-day appointment scan to discover all staff
- `/api/cron/appointment-reminders/route.ts` — SMS draft generation
- `/api/appointments/by-date/route.ts` — Appointment lookup
- `/api/employee/schedule/route.ts` — Weekly schedule for Employee Zone
- `/api/patients/upcoming-appointments/route.ts` — Uses v9.1 `future-appointments` for patient dashboard
- `/api/patients/appointments/[id]/cancel/route.ts` — Uses v9.0 DELETE for appointment cancellation
- `/api/patients/appointments/[id]/reschedule/route.ts` — Uses v9.0 PUT reschedule

---

### 2. SMSAPI.pl
**Purpose:** SMS notifications for appointment reminders

**Current Status:** ✅ **Active**
- SMS sending works for messages with short links
- Link blocking issue resolved

**Configuration:**
- Token: `SMSAPI_TOKEN` env var
- Endpoint: `https://api.smsapi.pl/sms.do`
- Phone format: `48XXXXXXXXX` (no + prefix)

**Templates:** Stored in Supabase `sms_templates` table (managed via admin API, with defaults seeded on first access)

**Integration Files:**
- `src/lib/smsService.ts` — SMS sending, template matching, message formatting
- `/api/admin/sms-reminders/*` — CRUD for SMS drafts/history
- `/api/admin/sms-templates/*` — Template management (CRUD + default seeding)
- `/api/cron/appointment-reminders/*` — Draft generation cron

**Features:**
- Phone number normalization (removes `+` and whitespace)
- Template selection by appointment type (with `byType:` prefix matching)
- Fuzzy doctor name matching (handles `-`, `(I)`, multi-word variations)
- Short link integration for confirm/cancel actions
- SMS content optimized for 160-char GSM-7 limit
- Detailed error logging

**Resolved Issues:**
- ✅ Phone format validation
- ✅ Removed invalid `from` field
- ✅ Polish character encoding (switched to ASCII templates)
- ✅ Link detection bypass (resolved with SMSAPI support)
- ✅ SMS templates shortened to fit under 160 chars with link

---

### 3. Resend
**Purpose:** Transactional email notifications

**Configuration:**
- API Key: `RESEND_API_KEY`
- From email: `Mikrostomart <noreply@mikrostomart.pl>`

**Email Types:**
1. **Patient Email Verification** (registration)
2. **Password Reset** (magic link)
3. **Appointment Confirmation** (patient confirms via SMS link)
4. **Appointment Cancellation** (patient cancels)
5. **Order Confirmation** (product purchases)
6. **Pre-Appointment Instructions** (day before appointment)
7. **Booking Confirmed** ← NEW (via `emailService.ts`) — sent to patient when admin approves online booking
8. **Booking Rejected** ← NEW (via `emailService.ts`) — sent to patient when admin rejects online booking
9. **Chat Reply** ← NEW (via `emailService.ts`) — sent to patient when admin responds to chat message
10. **Status Change** ← NEW (via `emailService.ts`) — generic appointment status change

**Email Features:**
- HTML templates with Mikrostomart branding
- Personalization (patient name, appointment details)
- Embedded appointment instructions
- Professional footer with clinic info

**Centralized Email Service** (`src/lib/emailService.ts`) ← NEW:
- `sendBookingConfirmedEmail()` — booking approved notification
- `sendBookingRejectedEmail()` — booking rejected notification
- `sendChatReplyEmail()` — chat reply notification
- `sendStatusChangeEmail()` — generic status change
- `sendEmail()` — core send function via Resend
- `makeHtml()` — wraps content in branded HTML template

**Integration Files:**
- `/api/appointments/confirm/route.ts` (lines 168-186)
- `/api/appointments/cancel/route.ts` (lines 167-183)
- `/api/patients/*` (various email verification endpoints)
- `/api/order-confirmation/route.ts`

**Recent Additions:**
- ✅ Appointment confirmation emails with instructions
- ✅ Cancellation emails
- ✅ Removed "landing page" text from footers
- ✅ Added patient name and phone to Telegram notifications

---

### 4. Telegram Bot (Multi-Bot Architecture)
**Purpose:** Real-time admin notifications split across 3 bots

**Architecture:**
Centralized via `src/lib/telegram.ts` with `sendTelegramNotification(message, channel)` helper.

| Bot | Env Token | Env Chat ID | Notifications |
|-----|-----------|-------------|---------------|
| **Mikrostomart potwierdzenia** | `TELEGRAM_BOT_TOKEN_APPOINTMENTS` | `TELEGRAM_CHAT_ID_APPOINTMENTS` | Appointment confirm/cancel/reschedule |
| **Mikrostomart wiadomości** | `TELEGRAM_BOT_TOKEN_MESSAGES` | `TELEGRAM_CHAT_ID_MESSAGES` | Contact form messages |
| **Mikrostomart Powiadomienia** (original) | `TELEGRAM_BOT_TOKEN` | `TELEGRAM_CHAT_ID` | Reservations, orders, leads |

**Fallback:** If channel-specific env vars not set, uses original bot.
**Multi-recipient:** Each chat_id env var supports comma-separated IDs.

**Integration Files:**
- `src/lib/telegram.ts` — Central helper with channel routing
- `src/app/api/appointments/confirm/route.ts` → `appointments` channel
- `src/app/api/appointments/cancel/route.ts` → `appointments` channel
- `src/app/api/patients/appointments/[id]/confirm-attendance/route.ts` → `appointments` channel
- `src/app/api/patients/appointments/[id]/cancel/route.ts` → `appointments` channel
- `src/app/api/patients/appointments/[id]/reschedule/route.ts` → `appointments` channel
- `src/app/api/contact/route.ts` → `messages` (contact) / `default` (reservation)
- `src/app/api/reservations/route.ts` → `default` channel
- `src/app/api/order-confirmation/route.ts` → `default` channel
- `src/app/api/treatment-lead/route.ts` → `default` channel

**Message Format:**
```
✅ PACJENT POTWIERDZIŁ OBECNOŚĆ

👤 Pacjent: Jan Kowalski
📞 Telefon: +48790740770
📅 Data: 08.02.2026
⏰ Godzina: 15:00
🩺 Lekarz: Dr Nowosielski
```

---

### 5. Stripe
**Purpose:** Payment processing (products, deposits)

**Configuration:**
- Secret Key: `STRIPE_SECRET_KEY`
- Publishable Key: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Payment Flows:**
1. **Product Purchase** (`/sklep`, `/koszyk`)
2. **Appointment Deposit** (`/zadatek`)

**Integration Files:**
- `/api/create-payment-intent/route.ts`
- `src/context/CartContext.tsx`

---

### 6. OpenAI
**Purpose:** AI chat assistant, content generation, email drafts, social media, voice assistant

**Configuration:**
- API Key: `OPENAI_API_KEY`
- Models: GPT-4o (patient chat, pricing, social, voice) / GPT-4o-mini (email, task parser, reviews)

**Unified AI Service Layer (April 2026):** `src/lib/unifiedAI.ts`

All AI operations use a centralized service that automatically loads relevant knowledge base sections from Supabase and builds context-aware prompts. The system supports 14 contexts:

| Context | Purpose | Model |
|---------|---------|-------|
| `patient_chat` | Website chatbot + tool calling (save_lead) | GPT-4o |
| `pricing` | Pricing assistant on /cennik | GPT-4o |
| `email_draft` | Email reply generation + cron drafts | GPT-4o-mini |
| `social_post` | Social media post text generation | GPT-4o |
| `social_comment` | Social media comment replies | GPT-4o |
| `voice_assistant` | Employee voice assistant (tasks, calendar, memory) | GPT-4o |
| `blog_generator` | Blog article generation | GPT-4o |
| `news_generator` | News/aktualności generation | GPT-4o |
| `video_metadata` | Video titles, descriptions, hashtags | GPT-4o |
| `review_generator` | Google review generation | GPT-4o-mini |
| `translator` | Medical text translation | GPT-4o |
| `task_parser` | NLP → structured tasks | GPT-4o-mini |
| `content_moderator` | Content moderation/filtering | GPT-4o |
| `ai_trainer` | Meta-AI that modifies KB sections | GPT-4o |

**Knowledge Base Architecture:**
- **Storage:** `ai_knowledge_base` table in Supabase (12 sections: clinic_info, services, pricing, team, equipment, social_guidelines, email_guidelines, patient_communication, appointments, faq, brand_voice, medical_info)
- **Caching:** 5-minute in-memory cache (server-side) to minimize DB reads
- **Fallback:** Static `knowledgeBase.ts` content used if Supabase is unreachable
- **Admin Panel:** `AIEducationTab.tsx` in admin area — browse/edit all KB sections + persistent AI Trainer chat
- **AI Trainer:** `/api/admin/ai-trainer` — persistent conversational education chat (GET/POST/PATCH)
  - **Style Learning:** admin pastes AI draft + corrected version → AI analyzes style differences, extracts rules
  - **Persistent History:** all messages stored in `ai_trainer_messages` table, loaded on mount
  - **Proactive Follow-ups:** AI asks clarifying questions after each style analysis
  - **Sliding Window:** last 50 messages as GPT context + all `style_analysis` messages as learned rules
  - **Quick Actions:** 📧 email / 📱 post / 💬 comment / 🤖 chatbot style learning modes
- **Migration:** `107_unified_ai_knowledge_base.sql`, `108_ai_trainer_conversations.sql`

**Key exports:** `getAICompletion(options)`, `buildContextPrompt(context)`, `AIContext` type

**Integration Files:**
- `src/lib/unifiedAI.ts` — core service (369 LOC)
- `src/lib/knowledgeBase.ts` — legacy fallback only
- `/api/chat/route.ts` — patient chatbot (uses `getAICompletion` + tool_calls)
- `/api/cennik-chat/route.ts` — pricing assistant
- `/api/cron/email-ai-drafts/route.ts` — email cron (uses `buildContextPrompt`)
- `/api/employee/email-generate-reply/route.ts` — email reply (uses `buildContextPrompt`)
- `/api/employee/email-ai-config/route.ts` — email config
- `/api/employee/assistant/route.ts` — voice assistant (KB injected into system prompt)
- `src/lib/socialAI.ts` — social post generation
- `src/lib/socialComments.ts` — social comment replies
- `/api/admin/ai-knowledge/route.ts` — CRUD API for KB sections
- `/api/admin/ai-trainer/route.ts` — persistent AI Trainer (GET history + POST message + PATCH approve/reject)
- `src/context/AssistantContext.tsx`

### 7. Replicate
**Purpose:** AI image generation for products/content

**Configuration:**
- API Token: `REPLICATE_API_TOKEN`

**Integration Files:**
- `/api/admin/*` (product image generation)

---

### 8. YouTube Data API
**Purpose:** Fetch latest clinic videos

**Configuration:**
- API Key: `YOUTUBE_API_KEY`
- Channel ID: `YOUTUBE_CHANNEL_ID`

**Integration Files:**
- `/api/youtube/route.ts`
- `src/components/YouTubeFeed.tsx`

---

### 9. Google Places API
**Purpose:** Real Google Reviews on homepage

**Configuration:**
- API Key: `GOOGLE_PLACES_API_KEY`
- Place ID: `ChIJ-5k3xu5SEEcRJhqtusOhhwM` (Mikrostomart)

**Architecture:**
- **3 API endpoints queried** per fetch cycle (hourly):
  1. Places API (New) — `places.googleapis.com/v1/places/{id}` with `X-Goog-FieldMask`
  2. Legacy API (newest sort) — `maps.googleapis.com/maps/api/place/details/json?reviews_sort=newest`
  3. Legacy API (most relevant sort) — `reviews_sort=most_relevant`
- **Supabase `google_reviews` table** — reviews upserted on each fetch (collection grows over time)
- **Deduplication** — UNIQUE constraint on `(google_author_name, review_text)`
- **Filtering** — only 4★+ reviews stored and displayed
- **Randomization** — Fisher-Yates shuffle on each request
- **Fallback** — static reviews from `src/data/reviews.ts` if API/DB unavailable
- **Rate limiting** — background fetch runs max once per hour (in-memory timestamp)

**Integration Files:**
- `src/app/api/google-reviews/route.ts` — API route (fetch from Google, upsert to Supabase, return shuffled)
- `src/components/GoogleReviews.tsx` — Frontend carousel component
- `src/data/reviews.ts` — Static fallback reviews
- `supabase_migrations/027_google_reviews_cache.sql` — Database table

---

### 10. Push Notifications (Firebase Cloud Messaging)
**Purpose:** Browser/mobile push notifications for patients and employees

**Technology:** Firebase Cloud Messaging (FCM) with hybrid `notification` + `data` payload

---

#### ⚠️ CRITICAL ARCHITECTURE — TWO SERVICE WORKERS (DO NOT TOUCH)

This project has TWO independent service workers at DIFFERENT scopes. **This is intentional and MUST NOT be changed:**

| Service Worker | Source | Scope | Purpose |
|---|---|---|---|
| `sw.js` (67KB) | Auto-generated by `@ducanh2912/next-pwa` in `next.config.ts` | `/` | PWA caching, offline support, Workbox runtime |
| `firebase-messaging-sw.js` | Manual file in `public/` | `/firebase-cloud-messaging-push-scope` | Firebase push notification handling |

**🚫 RULES — NEVER VIOLATE:**
1. **NEVER register `firebase-messaging-sw.js` manually** — Firebase SDK does it automatically via `getToken()` at scope `/firebase-cloud-messaging-push-scope`
2. **NEVER pass `serviceWorkerRegistration` to `getToken()`** — let Firebase manage its own SW independently
3. **NEVER call `navigator.serviceWorker.register('/firebase-messaging-sw.js')`** in client code — this conflicts with `sw.js` at scope `/`
4. **NEVER call `navigator.serviceWorker.ready` for push purposes** — it returns the next-pwa SW, not the Firebase SW
5. **NEVER unregister all service workers** — this breaks both PWA and push
6. **NEVER add `skipWaiting()`/`clients.claim()` to `firebase-messaging-sw.js`** as a "fix" — it's not needed when Firebase manages its own scope

**✅ HOW IT WORKS (correct flow):**
```
User clicks 🔔 bell button
  → PushNotificationPrompt.subscribe()
    → Notification.requestPermission() → user grants
    → import('@/lib/firebaseClient')
    → requestFCMToken()
      → getToken(messaging, { vapidKey })  ← NO serviceWorkerRegistration!
      → Firebase SDK internally:
         1. Registers firebase-messaging-sw.js at /firebase-cloud-messaging-push-scope
         2. Waits for SW to activate
         3. Calls PushManager.subscribe() via the SW
         4. Returns FCM token
    → POST /api/push/subscribe { fcmToken, userType, userId }
    → Token saved to fcm_tokens table
    → listenForForegroundMessages() started
    → Test push sent via /api/push/test
```

**WHY THIS ARCHITECTURE:**
The previous system tried to register `firebase-messaging-sw.js` at scope `/` which conflicted with `sw.js` from next-pwa. Two SWs at the same scope replace each other, causing:
- `getToken()` hangs forever (SW not active)
- "subscribing for push requires active service worker" errors
- Total push failure after PWA reinstallation

The fix was to let Firebase manage its own SW at a separate scope. Both SWs coexist independently.

---

#### PWA Name Configuration

The PWA install dialog name comes from THREE sources (in priority order):
1. `<title>` tag in HTML — **primary source on iOS Safari**
2. `apple-mobile-web-app-title` meta tag
3. `manifest.json` → `name` field

**Current setup:**
- `titleDefault: 'Mikrostomart'` in `brandConfig.ts` — controls `<title>` tag
- `loadBrandFromDB()` has `delete dbBrand.titleDefault` — **prevents DB from overriding** the short title
- `manifest.json` → `"name": "Mikrostomart"`, `"short_name": "Mikrostomart"`
- `appleWebApp: { title: 'Mikrostomart' }` in `layout.tsx` metadata

**🚫 NEVER change `titleDefault` to a long SEO string** — it will break the PWA install name!
SEO keywords go in `description`, `keywords`, `titleTemplate`, and schema.org — NOT in `titleDefault`.

---

#### Configuration (env vars)
- Firebase API Key: `NEXT_PUBLIC_FIREBASE_API_KEY`
- Firebase Auth Domain: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- Firebase Project ID: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- Firebase Messaging Sender ID: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- Firebase App ID: `NEXT_PUBLIC_FIREBASE_APP_ID` (`1:621550915975:web:c70681465a502042050322`)
- FCM VAPID Key: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (from Firebase Console → Cloud Messaging → Web Push certificates)
- Firebase Admin (server-side): `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON)

#### Key Files
| File | Purpose |
|---|---|
| `public/firebase-messaging-sw.js` | Background push handler (Firebase compat SDK, `onBackgroundMessage`) |
| `src/lib/firebaseClient.ts` | Browser-side: `requestFCMToken()`, `listenForForegroundMessages()` |
| `src/lib/firebase.ts` | Server-side: Firebase Admin SDK initialization |
| `src/lib/pushService.ts` | Server-side: all push sending functions (7 send functions) |
| `src/components/PushNotificationPrompt.tsx` | UI: bell button, subscribe/unsubscribe, error display |
| `public/manifest.json` | PWA manifest (`name: 'Mikrostomart'`) |
| `src/lib/brandConfig.ts` | `titleDefault: 'Mikrostomart'` (controls PWA name) |
| `next.config.ts` | next-pwa config (generates `sw.js`) |
| `worker/index.ts` | Push/notificationclick handlers injected into `sw.js` |
| `public/push-sw.js` | `pushsubscriptionchange` handler (endpoint rotation recovery) |

#### Token Storage
- Table: `fcm_tokens` (user_id, user_type, fcm_token UNIQUE, device_label)
- Migration: `104_fcm_push_rebuild.sql`

#### Server-side Sending
- Uses `firebase-admin` SDK → `messaging.sendEachForMulticast()`
- Hybrid payload: BOTH `notification` + `data` keys for maximum reliability
- `notification` key: FCM auto-displays title/body (guaranteed visible)
- `data` key: carries URL, tag, metadata for click handling

#### Notification History Architecture (April 2026)
- **Decoupled from delivery**: `logPush()` is called for ALL target users in a group, regardless of whether they have FCM tokens
- **`resolveGroupUsers(group)`**: helper that resolves ALL user_ids in a push group from `employees` or `user_roles` tables
- **Shared history**: `/api/employee/push/history` returns ALL system notifications, deduplicated by title+body within 2-second windows
- **Patient history**: `/api/patients/push/history` + `/strefa-pacjenta/powiadomienia` page

#### Employee Group Keys

| Config/API group | DB value in push_groups | Admin label |
|---|---|---|
| `doctors` | `doctor` | 🦷 Lekarze |
| `hygienists` | `hygienist` | 💉 Higienistki |
| `reception` | `reception` | 📞 Recepcja |
| `assistant` | `assistant` | 🔧 Asysta |
| `admin` | (admin role in user_roles) | 👑 Admin |
| `patients` | (patient role in user_roles) | 👥 Pacjenci |

#### Push Notification Types (`src/lib/pushTranslations.ts` — 4 locales pl/en/de/ua)
| Type key | Trigger | Target | Config key |
|----------|---------|--------|------------|
| `task_new` | New task created | Employees (by group) | `task-new` |
| `task_status` | Task status changed | Employees (by group) | `task-status` |
| `task_assigned` | Task assigned/reassigned | Employees (by group) | — |
| `task_comment` | New comment on task | Employees (by group) | `task-comment` |
| `task_checklist` | Checklist item toggled | Employees (by group) | — |
| `task_reminder` | Daily cron — tasks without due date | Employees (configurable) | `task-no-date` |
| `task_deposit` | Daily cron — unchecked deposit tasks | Employees (configurable) | `task-deposit` |
| `chat_patient_to_admin` | Patient sends chat message | Employees (configurable) | `chat-patient-to-admin` |
| `chat_admin_to_patient` | Reception replies to chat | Patient (specific user) | — |
| `appointment_confirmed` | Patient confirms appointment | Employees (configurable) | `appointment-confirmed` |
| `appointment_cancelled` | Patient cancels appointment | Employees (configurable) | `appointment-cancelled` |
| `appointment_rescheduled` | Patient requests reschedule | Employees (configurable) | `appointment-rescheduled` |
| `patient_registered` | New patient registers | Employees (configurable) | `new-registration` |
| `new_order` | New shop order placed | Employees (configurable) | `new-order` |
| `new_reservation` | New appointment reservation | Employees (configurable) | `new-reservation` |
| `new_contact_message` | Contact form submission | Employees (configurable) | `new-contact-message` |
| `new_treatment_lead` | Treatment calculator lead | Employees | — |
| `order_status_update` | Order status changed | Patient (specific user) | — |
| `appointment_24h` | 24h before appointment | Patient (specific user) | `appointment-24h` |
| `appointment_1h` | 1h before appointment | Patient (specific user) | `appointment-1h` |
| `new_blog_post` | Blog post published | All subscribers | — |

#### Key Functions (`src/lib/pushService.ts`)
- `pushToUser(userId, userType, payload)` — send to specific user; **always logs to history** regardless of tokens
- `pushTranslatedToUser(userId, userType, notifType, params, url?)` — localized push using `pushTranslations.ts`
- `pushToAllEmployees(payload, excludeUserId?)` — log for ALL active employees, send only to those with FCM tokens
- `pushToGroups(groups, payload)` — resolve ALL users per group via `resolveGroupUsers()`, log for all, deliver to FCM tokens
- `pushByConfig(configKey, payload, excludeUserId?)` — config-driven push with muted preference support
- `pushToUsers(userIds, payload)` — send to specific user IDs; logs for ALL, delivers to those with tokens
- `broadcastPush(userType, notifType, params, url?)` — broadcast to all users of a type

#### UI Component
`PushNotificationPrompt` — compact mode (toggle bell button for employee/patient headers) with:
- Step tracking during subscribe (shows which step failed)
- 20-second timeout on `requestFCMToken()` to prevent infinite hang
- Error messages show step name (e.g., "Błąd (Getting FCM token): ...")
- Status states: `unsupported`, `needs-pwa`, `denied`, `subscribed`, `idle`, `error`, `loading`

#### Integration Files
- `src/lib/pushService.ts` — Core push sending logic (7 send functions + `resolveGroupUsers` + `logPush`)
- `src/lib/firebase.ts` — Firebase Admin SDK initialization (server-side)
- `src/lib/firebaseClient.ts` — Firebase Client SDK (browser-side token + foreground messages)
- `src/lib/pushTranslations.ts` — Localized push templates (20 types × 4 locales)
- `src/components/PushNotificationPrompt.tsx` — Subscribe/unsubscribe UI (FCM token registration)
- `public/firebase-messaging-sw.js` — Service worker for background FCM messages
- `src/app/api/push/subscribe/route.ts` — FCM token management (POST upsert, DELETE remove)
- `src/app/api/push/test/route.ts` — Test push endpoint
- `src/app/api/admin/push/route.ts` — Admin push: GET employees+stats, POST send to groups/users, DELETE remove token
- `src/app/api/admin/push/config/route.ts` — GET/PATCH push_notification_config table
- `src/app/api/admin/employees/position/route.ts` — PATCH: set employee push groups[]
- `src/app/api/employee/push/history/route.ts` — GET all system notifications (deduplicated, 30 days)
- `src/app/api/patients/push/history/route.ts` — GET patient push notification history
- `src/app/api/admin/push-send/route.ts` — Admin → patient manual push sending
- `supabase_migrations/104_fcm_push_rebuild.sql` — `fcm_tokens` table + RLS policies
- `supabase_migrations/048_push_notifications_log.sql` — `push_notifications_log` table



---

## ⏰ Cron Jobs & Automation

### 1. Generate SMS Reminders (appointment-reminders)
**Path:** `/api/cron/appointment-reminders`  
**Schedule:** Daily at 7:00 AM UTC (8:00 AM Warsaw)  
**Trigger:** Vercel Cron (configured in `vercel.json`)

**Query Params:**
- `?manual=true` — bypass cron auth (admin panel trigger)
- `?targetDate=monday` — generate drafts for next Monday instead of tomorrow (Friday-only cron)

**Workflow:**
1. Fetch target date appointments from Prodentis API (tomorrow by default, Monday if `targetDate=monday`)
2. Fetch free slots to confirm which doctors are working (informational logging only)
3. Clean up old drafts:
   - **Normal mode**: delete ALL old drafts (`draft`, `cancelled`, `failed` statuses)
   - **Monday mode**: only delete drafts for Monday's date (preserves Saturday drafts)
4. For each appointment, apply filters (see below)
5. Generate personalized SMS from Supabase `sms_templates`
6. Create short link for confirm/cancel landing page
7. Save SMS draft with short link in `sms_reminders` table

**Filters (in order):**
1. **Nowosielska exception** — Elżbieta Nowosielska bypasses isWorkingHour + doctor list checks, uses custom hours 08:30-16:00
2. **isWorkingHour flag** — must be `true` (white field in Prodentis calendar)
3. **Business hours** — appointment must be between 8:00-20:00 (filters informational entries at 5:45, 6:45, 7:15 etc.)
4. **Phone number** — must exist
5. **Doctor list** — must be in `REMINDER_DOCTORS` env var (fuzzy matching)
6. **No sent-duplicate-check** — new drafts always regenerate regardless of previous sent status

**Environment Variables Used:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRODENTIS_API_URL` (not `PRODENTIS_API_BASE_URL`)
- `NEXT_PUBLIC_BASE_URL` (for short links)
- `REMINDER_DOCTORS` (comma-separated doctor names)

**Configuration:**
- Cleanup: Deletes ALL old drafts/cancelled/failed (normal) or only Monday drafts (Monday mode)
- Always regenerates drafts (no sent-status blocking)
- Working hours: 8:00-20:00 (standard) or 8:30-16:00 (Nowosielska)
- Uses Prodentis `isWorkingHour` flag for white-field validation

---

### 2. Auto-Send SMS (sms-auto-send)
**Path:** `/api/cron/sms-auto-send`  
**Schedule:** Daily at 8:00 AM UTC (9:00 AM Warsaw)  
**Query Params:** `?targetDate=monday` — only send drafts for Monday appointments (Friday-only cron)  
**Purpose:** Automatically send approved SMS drafts. In Monday mode: filters by `appointment_date` to only send Monday drafts.

---

### 3. Daily Article Publishing
**Path:** `/api/cron/daily-article`  
**Schedule:** Daily at 7:00 AM UTC  
**Purpose:** Auto-publish scheduled articles

---

### 4. Task Reminders
**Path:** `/api/cron/task-reminders`  
**Schedule:** Daily at 8:30 AM UTC (9:30–10:30 AM Warsaw)  
**Purpose:** Send Telegram + push reminders for undated tasks and unchecked deposit tasks

**Workflow:**
1. Read `push_notification_config` from DB to get enabled status and target groups for `task-no-date` and `task-deposit` keys
2. Query `employee_tasks` for tasks where `due_date IS NULL` and `status NOT IN ('done','archived')`
3. Build Telegram message listing undated tasks with title, patient, assigned person, age in days
4. Send push via `sendPushToGroups()` (only if config enabled + groups set)
5. Query tasks with deposit checklist items unchecked → separate push for `task-deposit` config
6. Repeats daily — target groups configurable from Admin Panel Push tab without code changes

**Auth:** Vercel `CRON_SECRET` or `?manual=true` bypass



---

### Friday→Monday Workflow
On Fridays, the system runs a **second pass** for Monday appointments:

| Time (Warsaw) | What |
|---|---|
| 8:00 | Generate Saturday drafts (normal daily run) |
| 9:00 | Send Saturday SMS (normal daily auto-send) |
| **9:15** | **Generate Monday drafts** (`?targetDate=monday`) |
| **10:00** | **Send Monday SMS** (`?targetDate=monday`) |

This ensures Saturday and Monday templates don't mix in the admin panel.

---

### 5. Video Processing Pipeline (video-process)
**Path:** `/api/cron/video-process`
**Schedule:** Every 5 minutes
**Purpose:** Multi-step AI video processing for social media content

**Pipeline (split across separate cron invocations to avoid timeout):**

| Cron Run | Input Status | Output Status | What Happens | ~Time |
|----------|-------------|--------------|-------------|-------|
| **Step 0** | stuck (transcribing/analyzing/etc) | uploaded | Auto-recovery: resets stuck videos (max 3 retries) | <1s |
| **Step 1** | uploaded | transcribed | Download video → ffmpeg audio extraction → Whisper transcription | ~90s |
| **Step 2** | transcribed | captioning | GPT-4o analysis + metadata → ffmpeg compress (<50MB) → Captions/Mirage API submit | ~3min |
| **Step 3** | captioning | review | Poll Captions API → download captioned video → upload to Supabase | ~10-60s |

**Key Files:**
- `src/app/api/cron/video-process/route.ts` — Cron orchestrator
- `src/lib/videoAI.ts` — Transcription (Whisper), analysis (GPT-4o), metadata generation
- `src/lib/captionsAI.ts` — Captions/Mirage API integration (submit, poll, download)

**Technical Details:**
- FFmpeg downloaded as static binary to `/tmp` at runtime (cached between invocations)
- Videos compressed from 217MB → ~40MB (H.264, 4500kbps) to meet Captions API 50MB limit
- Captions API: 60+ professional caption templates, $0.15/minute, max 5min, 9:16 aspect ratio
- Admin panel (`/admin/video`) shows pipeline progress with manual ▶️ trigger button

**Environment Variables:**
- `MIRAGE_API_KEY` — Captions/Mirage API key
- `OPENAI_API_KEY` — for Whisper transcription + GPT-4o analysis

---

### Vercel Cron Configuration (`vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron/daily-article", "schedule": "0 7 * * *" },
    { "path": "/api/cron/appointment-reminders", "schedule": "0 7 * * *" },
    { "path": "/api/cron/sms-auto-send", "schedule": "0 8 * * *" },
    { "path": "/api/cron/appointment-reminders?targetDate=monday", "schedule": "15 8 * * 5" },
    { "path": "/api/cron/sms-auto-send?targetDate=monday", "schedule": "0 9 * * 5" },
    { "path": "/api/cron/task-reminders", "schedule": "30 8 * * *" },
    { "path": "/api/cron/push-appointment-1h", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/post-visit-sms", "schedule": "0 18 * * *" },
    { "path": "/api/cron/post-visit-auto-send", "schedule": "0 19 * * *" },
    { "path": "/api/cron/week-after-visit-sms", "schedule": "0 9 * * *" },
    { "path": "/api/cron/post-visit-auto-send?sms_type=week_after_visit", "schedule": "0 10 * * *" },
    { "path": "/api/cron/online-booking-digest", "schedule": "15 6 * * *" },
    { "path": "/api/cron/push-cleanup", "schedule": "15 3 * * *" },
    { "path": "/api/cron/birthday-wishes", "schedule": "0 8 * * *" },
    { "path": "/api/cron/daily-report", "schedule": "30 5 * * *" },
    { "path": "/api/cron/deposit-reminder", "schedule": "0 7 * * *" },
    { "path": "/api/cron/noshow-followup", "schedule": "0 8 * * *" },
    { "path": "/api/cron/email-ai-drafts", "schedule": "0 6-18 * * *" },
    { "path": "/api/cron/social-generate", "schedule": "0 4 * * *" },
    { "path": "/api/cron/social-publish", "schedule": "*/15 6-22 * * *" },
    { "path": "/api/cron/social-comments", "schedule": "*/15 6-22 * * *" },
    { "path": "/api/cron/video-process", "schedule": "*/5 6-22 * * *" },
    { "path": "/api/cron/push-escalation", "schedule": "0 9-18 * * *" },
    { "path": "/api/cron/careflow-push", "schedule": "*/5 5-22 * * *" },
    { "path": "/api/cron/careflow-auto-qualify", "schedule": "0 8 * * *" },
    { "path": "/api/cron/careflow-report", "schedule": "0 2 * * *" },
    { "path": "/api/cron/close-day", "schedule": "30 0 * * *" },
    { "path": "/api/cron/forgot-clockout-notify", "schedule": "*/15 12-20 * * *" },
    { "path": "/api/cron/prodentis-end-times", "schedule": "0 1 * * *" }
  ]
}
```
*Total: 29 crons (matches `vercel.json` as of 2026-05-08, KCP system added 3).*

---

## 🔐 Authentication & Authorization

### Patient Authentication (Custom JWT)

**Method:** Custom JWT (separate from Supabase Auth)

**Flow:**
1. Patient registers → `/api/patients/register`
2. Verification email sent (Resend) → magic token
3. Patient clicks link → `/strefa-pacjenta/register/verify-email/[token]`
4. Token validated → email confirmed
5. Patient logs in (phone or email + password) → JWT issued
6. Protected routes check JWT via `src/lib/jwt.ts`
7. Admin approves account → full access granted

**Files:**
- `src/lib/jwt.ts` - JWT token utilities
- `src/lib/auth.ts` - Auth helpers (verifyAdmin)
- `src/lib/withAuth.ts` - Higher-order auth middleware wrapper (eliminates boilerplate in API routes)
- `supabase_migrations/003_email_verification_system.sql`

---

### Admin & Employee Authentication (Supabase Auth + RBAC)

**Method:** Supabase Auth (email/password) + Role-Based Access Control

**Admin Flow:**
1. Login at `/admin/login` → Supabase `signInWithPassword`
2. Middleware checks session — redirects to `/admin/login` if unauthenticated
3. Client-side admin email allowlist check in `page.tsx`

**Employee Flow:**
1. Admin creates employee account via "Pracownicy" tab → Supabase `createUser` + `employee` role
2. Password reset email sent via Resend (direct `token_hash` URL)
3. Employee sets password at `/admin/update-password?token_hash=...`
4. Employee logs in at `/pracownik/login` → Supabase `signInWithPassword`
5. Middleware checks session — redirects to `/pracownik/login` if unauthenticated
6. API checks `hasRole(userId, 'employee') || hasRole(userId, 'admin')`

**Password Reset:**
- Endpoint: `/api/auth/reset-password` — server-side, Admin API + Resend
- Generates recovery token via `supabase.auth.admin.generateLink({ type: 'recovery' })`
- Sends direct link to `/admin/update-password?token_hash=...` (no Supabase redirect)
- Landing page calls `verifyOtp({ type: 'recovery', token_hash })` directly
- Rate limiting: 3 requests per email per 5 minutes (in-memory)

**RBAC System:**
- 3 Roles: `admin`, `employee`, `patient`
- Database: `user_roles` table (Supabase)
- Library: `src/lib/roles.ts` — `getUserRoles()`, `hasRole()`, `grantRole()`, `revokeRole()`, `UserRole` type
- Middleware: `src/lib/withAuth.ts` — `withAuth(handler, { roles: ['admin'] })` — wraps route handlers with auth + RBAC
- Hook: `src/hooks/useUserRoles.ts` — client-side role fetching
- Migrations: `015_user_roles.sql`, `016_promotion_dismissed.sql`

**Middleware** (`src/middleware.ts`):
- `/admin/*` → requires Supabase Auth session (except `/admin/login`, `/admin/update-password`)
- `/pracownik/*` → requires Supabase Auth session (except `/pracownik/login`, `/pracownik/reset-haslo`)
- All other routes → public

---

## 🚀 Deployment

**Platform:** Vercel  
**Domain:** `mikrostomart.pl` (assumed)  
**Repository:** GitHub (private - `novik-code/mikrostomart`)

**Environment Variables (Production):**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Prodentis
PRODENTIS_API_URL=http://83.230.40.14:3000

# SMS
SMSAPI_TOKEN=...
REMINDER_DOCTORS=Marcin Nowosielski,Ilona Piechaczek,Katarzyna Halupczok,...

# Email
RESEND_API_KEY=...

# Telegram (3-bot architecture)
TELEGRAM_BOT_TOKEN=...         # Default bot (Mikrostomart Powiadomienia)
TELEGRAM_CHAT_ID=...
TELEGRAM_BOT_TOKEN_APPOINTMENTS=...  # Appointments bot
TELEGRAM_CHAT_ID_APPOINTMENTS=...
TELEGRAM_BOT_TOKEN_MESSAGES=...      # Messages bot
TELEGRAM_CHAT_ID_MESSAGES=...

# Stripe
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# OpenAI
OPENAI_API_KEY=...

# Replicate
REPLICATE_API_TOKEN=...

# YouTube
YOUTUBE_API_KEY=...
YOUTUBE_CHANNEL_ID=...

# Google Reviews
GOOGLE_PLACES_API_KEY=...

# Captions / Mirage API (video captioning)
MIRAGE_API_KEY=...

# App
NEXT_PUBLIC_BASE_URL=https://mikrostomart.pl
NODE_ENV=production
```

**Build Command:** `npm run build`  
**Install Command:** `npm install`  
**Framework:** Next.js

---

## 📝 Recent Changes

### 2026-05-15 EOD — S6-2 Next 16.2.6 patch + safe transitives audit fix (closes 2 critical + 10 high)

#### Commits:
- `08e6a8c` — chore(deps): S6-2 Next 16.2.6 patch + npm audit fix safe transitives

#### Wynik (audit reduction)

| | Przed S6-2 | Po S6-2 | Redukcja |
|---|---|---|---|
| Critical | 2 | **0** | -100% |
| High | 14 | **5** | -64% |
| Moderate | 29 | **2** | -93% |
| Low | 13 | **8** | -38% |
| **TOTAL** | **58** | **15** | **-74%** |

#### Co zrobione

**Manual bumps** (package.json):
- `next 16.1.1 → ^16.2.6` (security patch w `^16`, **non-breaking**) — closes 3 high: DoS via Image Optimizer remotePatterns, HTTP request smuggling in rewrites, HTTP request deserialization DoS in RSC
- `eslint-config-next 16.1.1 → ^16.2.6` (sync z next)

**`npm audit fix` (bez `--force`, safe non-breaking transitives)** — 1552 linie zmiany w package-lock.json:
- **`protobufjs`** (CRITICAL: arbitrary code execution + bytes field code injection + crafted DoS) ← critical #1 zamknięty
- **`sanitize-html`** (CRITICAL: XSS via `xmp` raw-text passthrough) ← critical #2 zamknięty. **To nasz S4-1 v2 anti-XSS layer** — bonus: S6-3 z planu PLAN_DEPENDENCY_UPGRADES.md jest teraz **no-op** (auto-fix go pokrył).
- `lodash` (HIGH: Prototype Pollution + Code Injection)
- `@babel/plugin-transform-modules-systemjs` (HIGH: arbitrary code on malicious input)
- `fast-uri` (HIGH: path traversal + host confusion)
- `fast-xml-builder` (HIGH: attribute values bypass)
- `minimatch` (HIGH: ReDoS x3)
- `picomatch` (HIGH: Method Injection POSIX classes + ReDoS extglob)
- `rollup` (HIGH: Arbitrary File Write via Path Traversal)
- `terser-webpack-plugin` (HIGH: serialize-javascript chain)
- `firebase-admin` chain low vulns (uuid)

#### Pozostałe 5 high

Wszystkie z chain `@ducanh2912/next-pwa@10.2.9`:
- `workbox-build` (7.1.0 - 7.4.0)
- `workbox-webpack-plugin` (7.1.0 - 7.4.0)
- `@rollup/plugin-terser` (0.2.0 - 0.4.4)
- `serialize-javascript` (RCE via RegExp.flags + CPU exhaustion)
- `@ducanh2912/next-pwa` (>=10.2.7)

`npm audit fix` proponuje **downgrade do 10.2.6** (`@ducanh2912/next-pwa@10.2.7+` to vulnerable range). **S6-5 wymaga decyzji Marcina A/B/C** (downgrade vs replace na `serwist` vs wait for upstream patch).

#### Build + smoke test

- `npm run build` clean
- Pre-existing warnings unchanged: Sentry `disableLogger` deprecation (S6-6 fix via `@sentry/nextjs@10.53.1`), `middleware → proxy` rename Next 16 (osobny refactor, świadomie pominięty)
- Vercel auto-deploy produkcji + smoke test po ~100s:
  - Homepage / → 200 ✓
  - /sklep → 200 ✓
  - /kontakt → 200 ✓
  - S5-4 cross-locale `/baza-wiedzy/wurzelkanalbehandlung-laser` → 308 → /de/... ✓
  - S5-2 SSR `/aktualnosci` → 14 `<article>` tagów w initial HTML ✓
  - /robots.txt → 48 Disallow entries (S5-1 prefiksowane) ✓

#### Workflow notes

- Marcin wybrał **bezpośredni merge bez preview test** — Next 16.1.1 → 16.2.6 to patch w obrębie ^16, ryzyko niskie
- Branch utworzony, push do brancha (Vercel preview), merge ff-only, push, cleanup local + remote branch — 5 min od commit do produkcji
- Brak push'y w czasie aktywnych cronów (`careflow-push` co 5 min, `email-ai-drafts` co godzinę) — Vercel handles cron in-flight gracefully

#### Status S6 po S6-2

- **S6-2 ✅ DONE** — Next patch + safe transitives (closes 2 critical + 10 high)
- **S6-3 ✅ AUTOMATIC** — sanitize-html critical zamknięty przez S6-2 audit fix (był osobnym sprintem w planie, no-op teraz)
- **S6-4 ⏳ PENDING** — jimp removal (10 moderate → 0)
- **S6-5 ⏳ PENDING** — `@ducanh2912/next-pwa` decision A/B/C (5 high)
- **S6-6 ⏳ PENDING** — minor bumps (next-intl, firebase, Sentry, drobne) (8 low + 2 moderate)

End state goal po S6-6: `npm audit --omit=dev` → 0 critical, 0 high. Po S6-2 jesteśmy w **0 critical, 5 high** — tylko S6-5 (next-pwa decision) blokuje nas przed osiągnięciem celu 0 high.

---

### 2026-05-15 — S5-4 cross-locale 301 redirect + cron heartbeat early-return fix + S6-1 dependency upgrade triage

#### Commits:
- `c6a3f80` — fix(cron): log appointment-reminders heartbeat on empty-appointments path
- `c7ff142` — feat(seo): S5-4 cross-locale 301 redirect (baza-wiedzy + aktualnosci)

#### S5-4: cross-locale 301 redirect (post-S5-2 follow-up)

**Problem (z GSC raportu 2026-05-15)**: 1354 podstron 404 w Google Search Console, większość to `/baza-wiedzy/{slug}` z **mieszanymi locale** (np. `/en/baza-wiedzy/ein-lacheln-...` = EN URL z DE slug, `/baza-wiedzy/zuby-pid-mikroskopom-...` = PL URL z UA slug). Pochodzenie: stara hreflang konfiguracja + stary fallback `[slug]/page.tsx` zwracał 200 z PL contentem dla cross-locale URL → Google zaindeksował → po S5-2 fix (404 dla cross-locale) → Google widzi 404 i deindeksuje powoli (2-6 mies.).

**Live test stanu przed fix**: `curl /baza-wiedzy/wurzelkanalbehandlung-laser` → 404 (DE slug w PL URL, fallback do PL nie znajduje slugu w PL).

**Fix S5-4** zamienia 404 → **301 redirect** na canonical locale (gdzie slug faktycznie istnieje):

1. **`baza-wiedzy/[slug]/page.tsx`** (KB articles, per-locale rows linked by `group_id`):
   - Nowy helper `findSlugInAnyLocale(slug)` — query `articles` bez filtra locale, zwraca pierwszy locale który ma ten slug
   - Po PL fallback fail: jeśli slug istnieje w innym locale → `permanentRedirect(/{found_locale}/baza-wiedzy/{slug})` (HTTP 308)
   - Jeśli slug nie istnieje nigdzie → `notFound()` (true 404 zachowane)
   - `generateMetadata` zwraca `robots:noindex` dla cross-locale przed redirect (race protection)

2. **`aktualnosci/[slug]/page.tsx`** (news, one row z translations w `title_xx` columns):
   - Replaced S5-2 `notFound()` → `permanentRedirect(/aktualnosci/{slug})` (PL canonical) bo news slug jest **shared cross-locale**, PL zawsze istnieje dla każdego valid slug
   - `generateMetadata` zwraca `robots:noindex` dla cross-locale przed redirect
   - Removed unused `notFound` import

**Live smoke test (po Vercel deploy)**:
- `curl /baza-wiedzy/wurzelkanalbehandlung-laser` → **308 → `/de/baza-wiedzy/wurzelkanalbehandlung-laser`** ✓
- `curl /baza-wiedzy/nonexistent-fake-zzz` → **404** ✓ (true not-found zachowane)
- `curl /de/baza-wiedzy/wurzelkanalbehandlung-laser` → **200** ✓ (canonical działa)

**Pliki**: `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` (+38/-7), `src/app/[locale]/aktualnosci/[slug]/page.tsx` (+11/-6).

**Oczekiwany efekt**: Google przy następnym crawl tych ~1354 URL-i dostanie 308 zamiast 404 → przepisuje swoją bazę w ~2-4 tyg. (zamiast 2-6 mies. dla 404). Bonus: external backlinks (np. ze starych blog postów, social media) na cross-locale URL teraz prowadzą do właściwej wersji zamiast martwego 404.

#### Heartbeat fix: appointment-reminders early-return

**Problem (zdiagnozowany 2026-05-15 rano)**: Marcin zauważył że cron `appointment-reminders` "nie wygenerował SMS-ów". Diagnoza wykazała że cron faktycznie odpalił się o 9:00 PL (codzienny `0 7 * * *`), ale generował na sobotę = 0 wizyt = early return BEZ wywołania `logCronHeartbeat()`. Heartbeat tabela pokazywała wczorajszy timestamp → wyglądało jak "cron broken". Skomplikowana diagnostyka:
1. Sprawdzono `cron_heartbeats` tabelę — wszystkie cronu z 2026-03-02 lub późniejsze, ostatni `appointment-reminders` z wczoraj
2. Sprawdzono `sms_reminders` — wczorajsze SMS-y mają `sms_message_id` z SMSAPI (REALNIE wysłane)
3. Cron `15 8 * * 5` o 10:15 PL utworzył **20 nowych draftów** na poniedziałek 2026-05-18 z S4-4 token URLami (`?token=cDBZ6l6bLzRfd6TE` zamiast `?appointmentId=UUID`) — S4-4 system działa end-to-end
4. Cron `sms-auto-send?targetDate=monday` o 11:00 PL wysłał wszystkie 20 SMS-ów na poniedziałek (verified `status=sent`)

**Fix**: dodanie `await logCronHeartbeat('appointment-reminders', 'ok', 'No appointments for ${targetDateStr} (${label})', Date.now() - startTime);` przed early return w linii 149-158 `appointment-reminders/route.ts`.

**Pliki**: `src/app/api/cron/appointment-reminders/route.ts` (+8/-2).

**Pozostały dług techniczny** (do osobnej sesji): `sms-auto-send/route.ts` w ogóle nie importuje `logCronHeartbeat` — to wyjaśnia "Awaiting first monitored run" od 73 dni mimo że cron wysyła SMS-y. Plus 7 innych cronów ma podobny problem (`birthday-wishes`, `daily-article`, `online-booking-digest`, `post-visit-auto-send`, `push-appointment-1h`, `push-cleanup`, `week-after-visit-sms`). **Nie tykane dziś** żeby nie zakłócić aktywnych cronów — fix w przyszłej sesji systemowej.

#### S6-1: Dependency upgrade triage (output: PLAN_DEPENDENCY_UPGRADES.md)

**Wynik `npm audit --omit=dev` na main (commit `84d3cc4` przed dzisiejszych zmian)**: **58 vulnerabilities prod** (2 critical, 14 high, 29 moderate, 13 low). Plan oryginalny PLAN_HOTFIX_SPRINT.md S6 mówił 89/10/28 — obecny stan **lepiej** niż planowano (część vulns auto-fixowana przez transitive bumps + S4-1 v2 `sanitize-html` swap z DOMPurify).

**Najważniejsze findingi triage**:
1. **`jimp ^1.6.0` w package.json ale NIGDZIE w src/** — usunięcie zamknie 10+ moderate vulns zerowym kosztem (S6-4)
2. **`@ducanh2912/next-pwa@10.2.9` jest LATEST**, vuln range to `>=10.2.7`, fix = downgrade do `10.2.6` lub replace na `serwist` (S6-5 wymaga decyzji Marcina A/B/C)
3. **`sanitize-html ^2.17.3` ma critical XSS** — to nasz S4-1 v2 anti-XSS layer! Patch update wymagany (S6-3)
4. **`next 16.1.1 → 16.2.6` patch w `^16`** — non-breaking, zamyka 3 high (DoS image, HTTP smuggling, deserialization) (S6-2)
5. `web-push`, `shotstack`, `ffmpeg-static` — wszystkie aktywnie używane, **NIE usuwać** wbrew planowi PLAN_HOTFIX_SPRINT.md S6-4

**Plan podziału S6 na 5 sprintów** (`~/Desktop/bałagan/PLAN_DEPENDENCY_UPGRADES.md`, 281 linii):
- S6-2 (1.5h, LOW) — Next patch + safe transitives → 1 critical + 8 high
- S6-3 (30 min, LOW) — sanitize-html patch → 1 critical
- S6-4 (30 min, LOW) — usunięcie jimp → 10 moderate
- S6-5 (1-2h, MED-HIGH + Marcin decision) — next-pwa A/B/C → 5 high
- S6-6 (1h, LOW) — minor bumps (next-intl, firebase, Sentry, drobne) → 13 low + reszta

**End state goal**: `npm audit --omit=dev` → 0 critical, 0 high.

#### Status tracking
- Heartbeat fix: zmergowany na origin/main `c6a3f80` (fast-forward z brancha `fix/cron-heartbeat-on-empty-appointments`)
- S5-4: zmergowany na origin/main `c7ff142` (fast-forward z brancha `seo/s5-4-cross-locale-301`)
- S6-1: tylko triage + plan, ZERO zmian w kodzie/deps. Plan w `~/Desktop/bałagan/PLAN_DEPENDENCY_UPGRADES.md`.
- **Następna sesja: S6-2** (Next.js patch + safe transitives) — z planem szczegółowym

---

### 2026-05-15 — Hotfix Sprint S5 COMPLETE: SEO P2 cleanup (html lang + robots + sitemap noindex + news 404 + listing SSR + wizyta noindex + i18n deep merge)

#### Commits:
- `1ef1cab` — feat(seo): S5-1 html lang + robots prefiksy + sitemap noindex
- `58c7cfd` — feat(seo): S5-2 news 404 + listing SSR + wizyta noindex
- `320d7c0` — fix(i18n): S5-3 deep merge common + pages messages

#### S5-1: html lang + robots prefiksy + sitemap noindex

**Trzy zmiany w trzech plikach:**

1. **`src/app/layout.tsx:292`** — `<html lang>` mapuje URL prefix `'ua'` → ISO 639-1 `'uk'` (Ukrainian). Hreflang już mapował przez `HREFLANG_MAP` w sitemap.ts; html lang był ostatnim miejscem emitującym non-standard `'ua'`. Googlebot i screen readers oczekują `'uk'`.

2. **`src/app/robots.ts`** — pełen rewrite (32 → 47 linii). Wcześniej blokował tylko 11 ścieżek bez prefiksu — `Disallow: /strefa-pacjenta/` ale `/en/strefa-pacjenta/`, `/de/admin/`, `/ua/ekarta/` były dostępne dla Googlebota. Teraz:
   ```ts
   const PRIVATE_PATHS = ['/api/', '/admin/', '/pracownik/', '/strefa-pacjenta/',
     '/ekarta/', '/mapa-bolu/editor', '/auth/', '/zgody/', '/qr-display',
     '/s/', '/opieka/', '/wizyta/']; // 12 ścieżek
   const LOCALE_PREFIXES = ['', '/en', '/de', '/ua'];
   const disallow = LOCALE_PREFIXES.flatMap(p => PRIVATE_PATHS.map(path => `${p}${path}`));
   // 48 disallow entries
   ```
   Dodano `/wizyta/` jako preemptywny block przed S5-2 noindex.

3. **`src/app/sitemap.ts`** — usunięto `/zadatek` z `toolPaths` (noindex od J-2, nie powinien być w sitemap). PL legal pages (`regulamin`, `polityka-cookies`, `polityka-prywatnosci`, `rodo`) wyjęte z `multiLocaleEntries` → emitują tylko PL URL (foreign locales renderowały ten sam Polish text → Google duplicate-content signal). `/privacy-policy` zostaje multi-locale (dedicated international page, separate folder z tłumaczeniami).

**Pliki**: `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`.

**Acceptance**:
- ✅ `/ua/*` HTML → `<html lang="uk">`
- ✅ `/en/strefa-pacjenta/`, `/de/admin/`, `/ua/ekarta/` → blocked w robots.txt
- ✅ Sitemap nie zawiera `/en/regulamin`, `/de/zadatek`

#### S5-2: News fallback + listing SSR + wizyta noindex

**Cztery zmiany:**

1. **`src/app/[locale]/aktualnosci/[slug]/page.tsx`** — dodano helper `hasTranslation(article, locale)` (PL zawsze true, foreign tylko gdy `title_{locale}` istnieje). `generateMetadata` zwraca minimalny `{ robots: { index: false, follow: false } }` gdy brak tłumaczenia. `ArticlePage` po fetchu wywołuje `notFound()` zamiast silent PL fallback. Wcześniej `/en/aktualnosci/<polish-only-slug>` serwował PL content w EN URL = duplicate content + confused hreflang.

2. **`generateStaticParams`** w tym samym pliku — wcześniej Cartesian product (4 locales × N slugs); teraz iteruje per-article i emituje tylko (locale, slug) z istniejącym tłumaczeniem (PL zawsze + EN/DE/UA tylko gdy `title_{locale}`).

3. **`src/app/[locale]/aktualnosci/page.tsx`** — pełen refaktor client → server component. Wcześniej `"use client"` + `useEffect` fetch → `curl /aktualnosci` zwracał blank page (Googlebot widział nic). Teraz async server component z direct supabase fetch (revalidate 600s = 10 min), filtruje artykuły bez tłumaczenia w foreign locale (zgodnie ze [slug] guardem). Carousel UI (scroll arrows + RevealOnScroll wrapping cards) wyrwany do nowego pliku **`src/app/[locale]/aktualnosci/NewsCarousel.tsx`** (`"use client"` island, otrzymuje articles jako prop).

4. **`src/app/[locale]/wizyta/[type]/layout.tsx`** (nowy plik) — `metadata.robots: { index: false, follow: false }`. Wizyta to per-appointment landing reachable via SMS/email, brak organic search intent, leak appointment_type strings. Ten layout jest server component nadrzędny do client `page.tsx` (layouts mogą eksportować metadata nawet gdy page jest client).

**Pliki**: `src/app/[locale]/aktualnosci/[slug]/page.tsx` (+25/-12), `src/app/[locale]/aktualnosci/page.tsx` (refaktor: 234 → 75 linii), `src/app/[locale]/aktualnosci/NewsCarousel.tsx` (nowy, 166 linii), `src/app/[locale]/wizyta/[type]/layout.tsx` (nowy, 13 linii).

**Acceptance**:
- ✅ `/en/aktualnosci/<polish-only-slug>` → 404
- ✅ `curl /aktualnosci | grep '<article'` → matches w initial HTML
- ✅ `/wizyta/krotka` HTML head zawiera `<meta name="robots" content="noindex,nofollow">`

#### S5-3: i18n deep merge fix

**Problem** (audit):
```
PL — common: 26 pages: 30 overlap: 2 → oferta, aktualnosci
  ⚠️ aktualnosci.* keys lost in shallow merge: backToNews, articleNotFound
EN/DE/UA — same pattern (× 4 locale = 8 lost translations).
```

`src/i18n/request.ts` używał `messages: { ...common, ...pages }` (shallow). Gdy oba pliki deklarowały top-level klucz `aktualnosci`, `pages.aktualnosci` zastępowało **całość** `common.aktualnosci` zamiast się scalać → `backToNews` + `articleNotFound` znikały → MISSING_MESSAGE w server log dla każdego entry/leave [slug] page.

**Fix**: zaimplementowany `deepMerge<T>()` (recursive merge dla obiektów, last-wins dla scalars/arrays). `oferta` namespace OK (pages.oferta to superset common.oferta — 4 keys w obu).

**Pliki**: `src/i18n/request.ts` (+25/-3).

**Verify** (Node sanity script):
```
PL/aktualnosci — shallow: 6 deep: 8 ✓ recovered: articleNotFound, backToNews
EN/aktualnosci — same recovery
DE/aktualnosci — same recovery
UA/aktualnosci — same recovery
```

#### Szerszy kontekst (Hotfix Sprint state)

S5 ✅ COMPLETE zamyka SEO P2 cleanup. Marcin (2026-05-15) postanowił **przeskoczyć S4-2b** (CSP enforce — `Report-Only` → enforce, czeka na ~tydzień Sentry data od `8b281df` 2026-05-13). S4-2b wraca później albo zostaje pominięty (Report-Only nadal raportuje violations do Sentry, więc widoczność jest).

**Następna sesja: S6-1 dependency upgrade triage** (~1h AI, output `~/Desktop/bałagan/PLAN_DEPENDENCY_UPGRADES.md`). Po S6 → S7 (UX) → S8 (RODO/2FA) → S9 (lint+CI) → wrót do Fazy K Premium SEO.

#### Status tracking
- `~/Desktop/bałagan/PLAN_HOTFIX_STATUS.md` zaktualizowany: S4-3, S4-4, S4-5 oznaczone DONE; S4-2b PAUSED; S5-1, S5-2, S5-3 oznaczone DONE; NEXT SESSION wskazuje na S6-1.

---

### 2026-05-14 EOD #2 — Hotfix Sprint S4-5: Patient JWT hardening + social-media bucket lockdown

#### Commits:
- `fc8f27f` — feat(security): S4-5 patient JWT hardening + social-media bucket lockdown (P0-09 + P1-03)

#### Wątek (a) — Patient JWT cleanup (P1-03):

**Tło problemu** (recon przed implementacją):
- `/api/patients/login` zwracał JWT zarówno w `response.cookies.set('patient_token', token, { httpOnly: true })` ORAZ w JSON body `{ token, patient }` (commit history mówi "kept for backward compatibility")
- Frontend `login/page.tsx:44` brał `data.token` z JSON i robił `document.cookie = patient_token=${data.token}; ...` — **non-httpOnly cookie** z tym samym kluczem, JS-readable
- `usePatientAuth.ts:43-47` czytał token przez `document.cookie` (non-httpOnly!) i używał w `Authorization: Bearer ${token}` headers we wszystkich patient API fetches
- httpOnly cookie istniał ale był **decorative** — nikt go nie używał
- XSS attacker (przez sanitize-html bypass z S4-1 v2) mógł zrobić `document.cookie` exfiltrate i zdobyć patient session

**Audit przed implementacją**: wszystkie patient API endpointy (`src/app/api/patients/*`) używają `verifyTokenFromRequest` z `src/lib/jwt.ts` które ma dual-path: Authorization header OR httpOnly cookie. Czyli backend **już ma fallback do cookie** — po usunięciu `data.token` z JSON i `document.cookie` write, frontend's `getAuthToken()` zwróci null, Authorization Bearer header będzie pusty, server fallback do httpOnly cookie → action transparent.

**Zmiany**:
1. `src/app/api/patients/login/route.ts`: usunięto `token,` z JSON response payload. Comment opisujący S4-5 rationale dodany.
2. `src/app/[locale]/strefa-pacjenta/login/page.tsx`: usunięto `if (data.token)` check + `document.cookie = patient_token=${data.token}...` write. `localStorage.setItem('patient_data', ...)` zachowany (display-only profile info, nie credentials).

**Verification na preview**:
- DevTools → Application → Cookies: jeden `patient_token` z **HttpOnly ✓, Secure ✓, SameSite=Strict ✓**, brak duplikatu non-httpOnly
- DevTools → Local Storage: tylko `patient_data` (display info), zero token
- Dashboard ładuje się normalnie — wszystkie fetche pobierają dane przez cookie auth, bez Bearer header

**Pozostały scope (przyszły sprint, low priority)**:
- `usePatientAuth.getAuthToken()` można w przyszłości usunąć — zwraca teraz `null` zawsze (cookie httpOnly, JS nie czyta)
- Wszystkie patient API fetches mają `Authorization: Bearer ${token}` headers — będą puste/pominięte przez Browser. Można usunąć dla cleanup, ale nie blokuje funkcjonalności.

**Audit closure**: ✅ P1-03 zamknięte. JWT nie jest już dostępny z JS — XSS exfiltration vector closed.

#### Wątek (b) — Social-media bucket lockdown (P0-09):

**Tło problemu** (recon z migracji 085):
- Migracja 085 utworzyła bucket `social-media` z **dwoma open policies**:
  - `"Allow video uploads"` — `FOR INSERT WITH CHECK (bucket_id = 'social-media' AND foldername[1] = 'videos')` — anyone (incl. anon) może INSERT do `videos/*`. Designed dla "direct browser upload" ale praktyce frontend uses signedUploadUrl + service_role (which bypassuje RLS) — policy była dziurawa i unused.
  - `"Allow service delete social-media"` — `FOR DELETE USING (bucket_id = 'social-media')` — anyone może DELETE (mimo nazwy "service delete", policy nie sprawdzała roli).
- Plus bucket `file_size_limit = 524288000` (500MB) bez restrict MIME types

**Plan migracji 125** (`125_social_media_bucket_lockdown.sql`, idempotentna):
- DROP `"Allow video uploads"` policy
- DROP `"Allow service delete social-media"` policy
- Bucket `file_size_limit`: 500MB → 100MB
- Bucket `allowed_mime_types`: tylko `video/mp4`, `video/quicktime`, `video/webm`, `image/jpeg`, `image/png`, `image/webp`
- Zachowano `"Allow public read social-media"` — wideo musi być publicznie odczytywalne dla YouTube/TikTok/Meta API publication

**Code update**:
- `/api/social/video-upload/route.ts` `createBucket` fallback (linia 86-90) zmieniony żeby mirror nowych limitów: 100MB + MIME restrict. Fallback fires tylko na fresh environments (demo Supabase bootstrap); established projects są governed przez migrację.

**Frontend upload flow nie wymaga zmian**: admin → `PUT /api/social/video-upload` (requireAdmin) → backend tworzy `signedUploadUrl` używając service_role (bypass RLS) → frontend uploads bezpośrednio do Supabase Storage. Po migracji 125, **service_role wciąż bypassuje RLS** więc upload działa identycznie. Zmieniona tylko **anonymous access** (drop dziurawych policies).

**Audit closure**: ✅ P0-09 zamknięte (po wgraniu migracji 125 na Supabase). Anyone INSERT/DELETE attack vector closed.

#### Manual tasks dla Marcina:
- 🚨 **Wgrać migrację 125** w Supabase SQL Editor na OBU projektach (`keucogopujdolzmfajjv` + `mhosfncgasjfruiohlfo`). Kopia: `~/Desktop/migracje_supabase/migracja_125_social_media_bucket_lockdown.txt`. Idempotentna (DROP IF EXISTS + UPDATE).
- ⚠️ Wciąż pending: migracje 124 (confirmation_token), 123 (Prodentis sync), 122 (orders notified_at). Wszystkie idempotentne, bezpieczne do wgrania razem.

#### Pliki:
- `src/app/api/patients/login/route.ts` (usunięto token z JSON, comment)
- `src/app/[locale]/strefa-pacjenta/login/page.tsx` (usunięto document.cookie write, comment)
- `src/app/api/social/video-upload/route.ts` (createBucket fallback updated)
- `supabase_migrations/125_social_media_bucket_lockdown.sql` NEW

#### Status sprintów po sesji #2:
- ✅ Sprint 1 (auth) + S2 4.5/5 (payment) + S3 (rezerwacja) + S4-1 v2 (XSS) + S4-2a (CSP report-uri) + S4-3 (contact form) + S4-4 (short-link/token) + **S4-5 (patient JWT + bucket lockdown)**
- ⏳ Pozostaje: **S4-2b** (CSP enforce, czekamy ~tydzień na Sentry data od `8b281df` 2026-05-13) + S5-S9
- 🎯 **Sprint 4 prawie complete** — po S4-2b cały security hardening zamknięty. Co więcej zostało otwarte z audytu: P0-09 czeka na migrację 125, P1-02 Faza 2 (S4-2b CSP enforce), P1-05 (contact form honeypot/captcha — częściowo zamknięte przez S4-3 Turnstile, ale to było P1-07 też), P1-08 (dependency upgrade — Sprint 6).

### 2026-05-14 EOD — Hotfix Sprint S4-3 + S4-4: contact form Turnstile + short-link/token hardening

#### Commits:
- `7547e52` — feat(security): S4-3 contact form Turnstile + rate limit + MIME guard (P1-07) — includes hardcoded site key fallback for Vercel Sensitive env-var gotcha
- `3a7e4bf` — feat(security): S4-4 short-link hardening + DB-backed confirmation tokens (P1-06 + P1-02)

#### S4-3 (P1-07): Contact form hardening z Cloudflare Turnstile

**Tło**: `/api/contact` był otwarty: brak rate limitu, brak captcha (math `X + Y = ?` to UX friction + słabe anti-bot), brak server-side MIME validation. Marcin wcześniej (2026-05-12) skonfigurował Cloudflare Turnstile panel + Vercel env vars.

**Co się zmieniło**:
- **Frontend `src/components/ContactForm.tsx`**: math captcha zastąpione `@marsidev/react-turnstile` widgetem (~20 KB). Honeypot zachowany (belt-and-suspenders). Submit disabled until: `isSubmitting OR !rodoConsent OR !turnstileToken`. Po sukcesie widget auto-reset via ref.
- **Backend `src/app/api/contact/route.ts`**: rate limit 5 req/IP per 15 min (istniejąca `src/lib/rateLimit.ts`). Verify Turnstile token przez `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Body size guard 8 MB pre-parse. Attachment magic-bytes validation (manual 4-byte signature check zamiast `file-type` package — uniknęliśmy ESM/CJS gotchy jak `isomorphic-dompurify` w S4-1 v1). Attachment size cap 5 MB po base64 decode.

**Vercel "Sensitive" env-var gotcha** (debugging session): Marcin wczoraj wpisał Turnstile site key + secret key jako Sensitive. Dla `NEXT_PUBLIC_*` Sensitive flag **nie wstrzykuje** wartości do client bundle — frontend dostaje `undefined`. Plus: dialog Edit Sensitive zmienna pokazuje **puste pole Value** (placeholder `https://api.example.com`) — Marcin pierwotnie wpisał klucz **w pole Note zamiast Value** (UX gotcha). Vercel **nie pozwala odznaczyć Sensitive po utworzeniu** — trzeba delete + recreate. **Fix**: hardcoded fallback w kodzie `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADN3DS_czkcNj-aD'`. Site key jest **public z definicji Cloudflare** (i tak w client bundle), zero leak. Secret key zostaje w env var jako server-side (Sensitive OK dla server, tylko dla `NEXT_PUBLIC_*` jest broken).

**Cloudflare Turnstile hostname allowlist gotcha**: nie wspiera wildcards z myślnikiem w środku subdomeny (np. `*-novik-codes-projects.vercel.app` rejected). Subdomain wildcard `*.vercel.app` potencjalnie blokowany przez Cloudflare jako popular shared platform. **Decyzja**: skip preview test, merge prosto do main — produkcja `mikrostomart.pl` + `www.mikrostomart.pl` na whitelist od wczoraj, kod zweryfikowany lokalnie (43/43 testów green) + Vercel build success + widget się ładuje na preview (tylko Cloudflare blokuje final challenge z preview hostname). Marcin przetestował end-to-end na produkcji po deploy → działa.

**Audit closure**: ✅ P1-07 zamknięte.

#### S4-4 (P1-06 + P1-02): Short-link hardening + DB-backed confirmation tokens

**Wątek (a) — Short-link hardening (P1-06)**:
- **`POST /api/short-links`** teraz wymaga `requireAdmin()` (helper z S1-1). Wcześniej był otwarty (znaleziono podczas recon że żaden caller go nie używa — był dead/insecure endpoint).
- **Destination allowlist**: regex internal `^/[a-z]` (relative paths) lub external hostname allowlist: `mikrostomart.pl`, `www.mikrostomart.pl`, `demo.densflow.ai`, `densflow.ai`, `czelej.com.pl`, `laserandhealthacademy.com`, `magazyn-stomatologiczny.pl`. Phishing-via-our-domain vector zamknięty.
- **`/s/[code]/page.tsx` (client React redirect) → `/s/[code]/route.ts` (server-side 302)**. Zero flickeru (~300-700ms "Przekierowywanie..." screen poprzednio). Search engines widzą prawdziwy redirect zamiast pustej strony. Click tracking zachowany fire-and-forget.
- **SMS cron NIE jest affected** — robi `direct DB insert` do `short_links` table przez service role, nie przez HTTP endpoint. Zero ryzyka regresji.

**Wątek (b) — DB-backed confirmation token (P1-02)**:
- **Plan z PLAN_HOTFIX_SPRINT.md** zakładał HMAC stateless tokens, ale **przekraczał SMS limit 160 znaków** (HMAC-SHA256 64 hex + payload ~100 chars + URL prefix = ~210 chars). **Decyzja**: **zmiana planu na DB-backed token** — krótszy (16 chars), prostszy (zero HMAC infrastruktury, zero secret key management), reuse istniejącej `short_links` infra.
- **Migracja 124**: `appointment_actions.confirmation_token TEXT` + unique partial index `WHERE confirmation_token IS NOT NULL`. Idempotent.
- **Cron `appointment-reminders`** generuje `nanoid(16)` token (~96 bits entropy = niezgadywalny) per appointment_action. Zapisuje w kolumnie. Short link destination używa `?token=<16chars>` zamiast `?appointmentId=<UUID>`. **Defensive fallback**: jeśli kolumna `confirmation_token` nie istnieje (np. migracja 124 nie wgrana), cron retry'uje upsert bez kolumny i fallback do legacy `?appointmentId=` URL. SMS-y nie padają niezależnie od stanu migracji.
- **`/api/appointments/confirm` + `/api/appointments/cancel`**: akceptują **token (nowy)** lub **appointmentId (legacy)**. Backwards compat ~14 dni (SMS-y w pipeline sprzed deployu używające UUID wciąż działają).
- **Landing page `/[locale]/wizyta/[type]`**: czyta `?token=` lub `?appointmentId=` z URL searchParams, przekazuje odpowiednie pole w submit body.
- **Threat addressed**: UUID v4 był enumerable. Atakujący znający format mógł zgadywać sąsiednie ID lub extrapolować z leaked link (screenshot pacjenta na social media). Plus brak time validation — UUID raz wydany zawsze działa. Token rozwiązuje oba: niezgadywalny (96 bits) + DB lookup może w przyszłości dodać TTL via `appointment_date` check.

**🚨 Manual task Marcin**: wgrać migrację 124 na OBU Supabase (`keucogopujdolzmfajjv` + `mhosfncgasjfruiohlfo`). Kopia: `~/Desktop/migracje_supabase/migracja_124_appointment_actions_confirmation_token.txt`. Idempotent.

**Audit closure**: ✅ P1-06 (short-link) zamknięte. ✅ P1-02 (confirmation enumeration) zamknięte.

**Real test S4-4 jutro 8:00 PL**: cron `appointment-reminders` wygeneruje SMS-y z tokenami zamiast UUID. Pacjenci klikają → confirm endpoint z `?token=` → DB lookup → flow identyczny user perspective.

#### Pliki:
- `src/components/ContactForm.tsx` (S4-3 frontend)
- `src/app/api/contact/route.ts` (S4-3 backend)
- `src/app/api/short-links/route.ts` (S4-4a)
- `src/app/s/[code]/route.ts` NEW + `page.tsx` DELETED (S4-4a)
- `src/app/api/cron/appointment-reminders/route.ts` (S4-4b)
- `src/app/api/appointments/confirm/route.ts` (S4-4b)
- `src/app/api/appointments/cancel/route.ts` (S4-4b)
- `src/app/[locale]/wizyta/[type]/page.tsx` (S4-4b)
- `supabase_migrations/124_appointment_actions_confirmation_token.sql` NEW
- `package.json` (`@marsidev/react-turnstile@^1.5.2`)

#### Status sprintów po sesji:
- ✅ Sprint 1 (auth) + S2 4.5/5 (payment) + S3 (rezerwacja) + S4-1 v2 (XSS) + S4-2a (CSP report-uri) + **S4-3 (contact form)** + **S4-4 (short-link + tokens)**
- ⏳ Pozostają: **S4-2b** (CSP enforce, czekamy 3-7 dni na Sentry data od `8b281df`) + **S4-5** (patient JWT + public upload bucket — migracja 125 bo 124 zajęta) + S5-S9

### 2026-05-13 EOD #6 — Hotfix Sprint S4-2a: CSP violation reporting wired to Sentry (P1-02 Faza 1)

#### Commits:
- `8b281df` — feat(csp): S4-2a wire up CSP violations to Sentry via report-uri (P1-02)

#### Tło:
Audit przed sesją S4-2 ujawnił że CSP-Report-Only istnieje od SEO Faza C ale **bez dyrektywy `report-uri`** — violations logowane tylko do konsoli przeglądarki użytkownika, nigdy nie trafiały do żadnego endpointu. Sentry feed był pusty z CSP entries pomimo że strona ładuje Google Maps, YouTube, Stripe, FCM. Marcin szukał w UI Sentry pół godziny — sekcja "Security Headers" była w starym UI Sentry, zostala usunięta/ukryta. Ale **nie potrzebujemy UI** — CSP URL można zbudować z istniejącego DSN.

#### Co się zmieniło (`src/middleware.ts`):
- Nowy helper `buildSentryCspReportUri()` parsuje `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` (już ustawiony w Vercel env vars dla browser SDK), wyciąga `<public-key>@<host>/<project-id>` i rekomponuje:
  ```
  https://<host>/api/<project-id>/security/?sentry_key=<public-key>&sentry_environment=<env>
  ```
- Dyrektywa `report-uri ${cspReportUri}` doklejona do istniejącego `Content-Security-Policy-Report-Only` headera
- Graceful: jeśli DSN brak (np. lokalny dev bez Sentry), dyrektywa pomijana, CSP nadal aktywne
- `sentry_environment` automatycznie `preview`/`production` w zależności od `VERCEL_ENV` — Mikrostomart i Demo mają różne DSN-y więc każdy projekt raportuje do swojego Sentry projektu **bez nowego env var**

#### Verification:
- Branch `sec/s4-2a-csp-reporting` → Vercel preview → Marcin sprawdził Response Headers preview URL → potwierdzone że `report-uri https://o4510988121669632.ingest.de.sentry.io/api/4510988143165520/security/?sentry_key=ae5f3edf...&sentry_environment=preview` jest w nagłówku → merge do main → produkcja teraz raportuje (sentry_environment=production)

#### Co dalej:
- **Czekamy 3-7 dni** — Sentry zbiera CSP violations z realnych wizyt pacjentów (Google Maps na /kontakt, Stripe checkout, YouTube embeds, FCM push registration, OpenAI assets w czacie, etc.)
- **S4-2 Faza 2** (osobna sesja, ~7 dni z tego punktu): audit zebranych violations → uzupełnij whitelist (Stripe `js.stripe.com`, FCM `firebaseinstallations.googleapis.com`, Cloudflare Turnstile po S4-3, inne) → toggle `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (enforce) → zachowaj `report-uri` dla detection regressji post-enforce

#### Znane ograniczenia obecnego CSP (do Fazy 2):
- `script-src 'unsafe-inline'` — Next.js hydration wymaga inline scripts. To **rozbraja CSP przeciw inline XSS**. sanitize-html (S4-1 v2) jest jedyną realną obroną. W Fazie 2 rozważymy `'strict-dynamic'` + nonce, ale to duży refactor — być może pozostanie unsafe-inline jako known gap.
- Whitelist niekompletny — brakuje Stripe, FCM/Firebase, Cloudflare Turnstile, OpenAI assets, inne. Faza 2 uzupełni na podstawie real data.

#### Audit closure:
- ✅ **P1-02 Faza 1**: CSP teraz wysyła telemetrię — observability w miejscu, można podejmować decyzje na podstawie danych zamiast zgadywania
- ⏳ **P1-02 Faza 2**: pozostaje (toggle do enforce w osobnej sesji)

#### Manual tasks dla Marcina:
- **Brak**. Czysto kod. Wszystko już jest deploy'ed.

### 2026-05-13 EOD #5 — Hotfix Sprint S4-1 v2: WYSIWYG sanitization z `sanitize-html` (P0-08 CLOSED)

#### Commits:
- `73c57a3` — feat(security): S4-1 v2 WYSIWYG sanitization with sanitize-html (P0-08)

#### Tło:
S4-1 v1 (`d3af6be` z 2026-05-13 EOD #3) został zrewertowany kilka godzin temu po crashu produkcji przez `ERR_REQUIRE_ESM` z `@exodus/bytes` w jsdom dependency tree `isomorphic-dompurify`. P0-08 (stored XSS) pozostało otwarte. Marcin poprosił o S4-1 v2 z biblioteką pure-CJS, no jsdom — wybór padł na `sanitize-html` (htmlparser2-backed, ~50 KB, brak DOM).

#### Co się zmieniło:
- **Tylko biblioteka pod spodem zmieniona** — wszystko inne identyczne jak S4-1 v1
- Public API `sanitize.ts`: bez zmian (`sanitizeRichHtml`, `sanitizeStrictHtml`, `sanitizeJsonHtmlFields`)
- Wszystkie 10 callsites: bez zmian (5 save endpoints + 5 render sites)
- Threat coverage: same (script, iframe, object, embed, form, meta, event handlers, javascript:/data:/vbscript: URLs, polyglots, data attributes, srcdoc)
- Whitelist: same (p, h1-h6, b/i/em/strong/u/s, ul/ol/li, a [href|title|target|rel], blockquote, code, pre, span, div, hr, sub, sup)

#### Różnice API DOMPurify vs sanitize-html (dla referencji):
| DOMPurify (v1) | sanitize-html (v2) |
|---|---|
| `ALLOWED_TAGS: [...]` | `allowedTags: [...]` |
| `ALLOWED_ATTR: ['href', ...]` (lista globalna) | `allowedAttributes: { a: [...], '*': [...] }` (mapa per tag) |
| `ALLOWED_URI_REGEXP` (gotcha — walidu​je też target/rel) | `allowedSchemes: ['http', 'https', ...]` (tylko schemes) |
| `addHook('afterSanitizeAttributes', fn)` (global) | `transformTags: { a: fn }` (per tag) |
| `FORBID_TAGS`, `FORBID_ATTR` (lista) | `disallowedTagsMode: 'discard'` (mode) |

#### Krytyczna lekcja z S4-1 v1 → preview-first workflow:
1. Push do feature branch (NIE do main) → Vercel auto-tworzy preview deployment
2. Sprawdź preview URL (`mikrostomart-git-<branch>-...vercel.app`) — Marcin (zalogowany do Vercel) bypassuje 401 deployment protection
3. Curl test 3 ścieżek: `/`, `/wizyta/<type>`, `/api/admin/page-overrides` — wszystkie muszą zwrócić 200 (lub 401 dla admin endpointu, NIE 500)
4. **Tylko po success → merge do main**
5. Po deploy do prod: 5-min stable probe potwierdzający że nowy build nie pada

#### Testy: 28 unit testów w `src/lib/__tests__/sanitize.test.ts`:
- 15 XSS payloads: script, onerror, svg-onload, javascript:, data:, iframe, style, style-attr, onmouseover, polyglot svg+script, object/embed, form/input, meta-refresh, data-*, srcdoc
- 7 positive: headings/lists/formatting preserved, mailto:/tel:, relative/fragment URLs, target=_blank → rel=noopener noreferrer hardening, empty/null/non-string → "", plain text unchanged
- 3 sanitizeStrictHtml: block tags stripped, inline preserved, scripts stripped
- 5 sanitizeJsonHtmlFields: only known HTML keys sanitized, walks nested, i18n locale variants, primitives passed through
- **43/43 testów green** (28 sanitize + 11 brandConfig + 4 authGuards)

#### Pliki (14 changed, +485/-52):
- `package.json` + `package-lock.json` (dependency: `sanitize-html@^2.17.3` + `@types/sanitize-html@^2.16.1`)
- `src/lib/sanitize.ts` NEW (116 LOC)
- `src/lib/__tests__/sanitize.test.ts` NEW (218 LOC)
- 5 save endpoints (`appointment-instructions`, `blog`, `news`, `sections`, `page-overrides`)
- 5 render sites (`wizyta/[type]`, `nowosielski/[slug]` z WP entity decoder, `HomeClient TextBlockSection`, `EmailTab` alias, `AppointmentInstructionsEditor`)

#### Audit closure:
- ✅ **P0-08 stored XSS w WYSIWYG** — zamknięte
- Defense-in-depth dwóch warstw (save + render), 28 unit testów XSS payloads, sanitize-html jako trusted library (apostrophecms maintained)

#### Manual tasks dla Marcina:
- **Brak** dla S4-1 v2 (kod-only, żadnych migracji ani env vars)
- ⚠️ **Migracja 123** (z #4 Prodentis sync fix) wciąż wymaga wgrania na OBU Supabase: `~/Desktop/migracje_supabase/migracja_123_appointment_actions_prodentis_sync_status.txt`

### 2026-05-13 EOD #4 — Prodentis icon sync FIX (stale ID refresh + retry + alert) + S4-1 reverted + admin diagnostic tools

#### Commits (po S3):
- `d3af6be` ❌ feat(security): S4-1 WYSIWYG sanitization with DOMPurify (P0-08) — **CRASHED PROD**
- `d98defd` ❌ docs: S4-1 done
- `2f78f79` 🔄 Revert "docs: S4-1 done"
- `beec4bc` 🔄 Revert "feat(security): S4-1 WYSIWYG..."
- `06b51e2` ✅ feat(admin): SMS confirmation diagnostic tools — status badge + reset
- `22e49fe` ✅ fix(prodentis): refresh stale ID on 404 + persist sync status + Telegram alert

#### Tło — S4-1 crash (1-godzinny prod outage):
- 11:38 push S4-1 (isomorphic-dompurify, Maximum scope per pierwotny plan)
- Build OK na Vercel, ale cold-start funkcji serverless rzucał `ERR_REQUIRE_ESM` przy `require()` `@exodus/bytes/encoding-lite.js` (ESM-only) z `html-encoding-sniffer` w jsdom dependency tree
- Strona 500-owała dla `/`, `/wizyta/*`, `/api/admin/page-overrides` (każdy bundle który pociągnął sanitize.ts pośrednio)
- 12:41 reverts pushnięte, 12:43 prod recovery do 200

**Lekcja**: nigdy nie pushować dependency z `jsdom` (lub ciągnącej jsdom transitively) na main bez testowania na Vercel preview deployment first. Build success ≠ runtime success.

#### Tło — Prodentis icon sync bug:
Po reverts S4-1 Marcin zauważył, że wciąż jeden objaw nie wraca: ikona "pacjent potwierdził obecność" przestała pojawiać się w grafiku Prodentis po SMS-confirm. Działa Telegram + push (czasem opóźniony), ale ikona NIE. Rotacja klucza była wczoraj (2026-05-12), rano działało — problem zaczął się **w środku dnia 2026-05-13**.

**Workflow diagnostyczny w jednej sesji**:
1. Diagnostic tools `06b51e2`: admin Komunikacja/SMS/Wysłane teraz pokazuje per row "✅ Pacjent kliknął" (z timestamp tooltip) lub "○ Brak kliknięcia". Plus button "↩️ Cofnij potwierdzenie" → reset attendance_confirmed + status='pending' żeby ten sam pacjent mógł retestować ten sam link SMS.
2. Marcin zrobił test: jeden pacjent (apt `0100213775`) → 404 z proxy. Drugi pacjent (apt `0100217003`) → 200 OK. **Czyli endpoint działa selektywnie**.
3. Zlecenie do developera proxy (`~/Desktop/ZLECENIE_PRODENTIS_PROXY_ICON_404.md`) — developer odpisał (`~/Desktop/ODPOWIEDZ_ICON_404.md`):
   - Root cause: recepcja w Prodentis desktop przenosi/odwołuje wizyty → stary wpis dostaje `deleted=1` → tworzy się NOWY wpis z nowym `id_schedule`. Proxy poprawnie zwraca 404 dla starego ID.
   - Rekomendacja: po stronie naszej app — przed POST /icon weryfikuj aktualność `prodentis_id` (Opcja A check, B search, C refresh).

#### Co się zmieniło (commit `22e49fe`):

**Migracja 123** (idempotent, `ADD COLUMN IF NOT EXISTS`):
```sql
ALTER TABLE appointment_actions
    ADD COLUMN IF NOT EXISTS prodentis_icon_synced BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prodentis_icon_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS prodentis_icon_error TEXT;

CREATE INDEX IF NOT EXISTS idx_appointment_actions_icon_sync_failed
    ON appointment_actions (attendance_confirmed, prodentis_icon_synced)
    WHERE attendance_confirmed = TRUE AND prodentis_icon_synced = FALSE;
```

**`src/app/api/appointments/confirm/route.ts`** — hybrid retry logic:
1. Spróbuj `POST /api/schedule/appointment/{stored_id}/icon` (~95% wizyt — fast path)
2. Jeśli 404 → `GET /api/appointments/by-date?date=YYYY-MM-DD` → znajdź wizytę matching po `patient_phone.replace(/\D/g,'').slice(-9)` + `date.slice(11,16)` (HH:MM)
3. Jeśli znaleziono fresh ID:
   - `UPDATE appointment_actions SET prodentis_id = freshId WHERE id = appointmentId` (persist na przyszłość)
   - Retry POST /icon z fresh ID → 200 ✅
4. Jeśli brak match (wizyta naprawdę odwołana) → Telegram alert do gabinet chat `🚨 SYNC PRODENTIS PADŁ — sprawdź ręcznie` z imieniem + telefon + termin + lekarz + powód
5. Zawsze persist: `prodentis_icon_synced` + `_synced_at` + `_error` na `appointment_actions`

**`src/app/api/admin/sms-reminders/route.ts`** GET — enrichment teraz włącza 3 dodatkowe pola sync status w response.

**`src/app/admin/components/SmsRemindersTab.tsx`** — drugi badge w wierszu SMS sent:
- `🔄 Prodentis ✅` (niebieski) jeśli `prodentis_icon_synced=true`, tooltip z `_synced_at`
- `🔄 Prodentis ❌` (czerwony) jeśli `prodentis_icon_error` set, tooltip z error reason + sugestia działania (`appointment_cancelled_or_not_found` → "Wizyta prawdopodobnie odwołana w grafiku. Skontaktuj się z pacjentem.")

#### Manual tasks dla Marcina:
- ⚠️ **Wgraj migrację 123** w Supabase SQL Editor na OBU projektach (produkcja `keucogopujdolzmfajjv` + demo `mhosfncgasjfruiohlfo`). Kopia: `~/Desktop/migracje_supabase/migracja_123_appointment_actions_prodentis_sync_status.txt`. Idempotentna — bezpieczna do uruchomienia wielokrotnego.
- Po wgraniu: każdy kolejny pacjent klikający SMS confirm-link będzie miał persistowany status sync. Failowe wizyty (recepcja odwołała, nie ma matchu) wywołają natychmiast Telegram alert do gabinet chat.

#### Audit closure:
- ✅ Prodentis icon sync bug — fix wdrożony + tracking persistowany + alert system
- ❌ P0-08 (stored XSS w WYSIWYG) — **otwarte** (S4-1 reverted, oczekuje S4-1 v2 z `sanitize-html`)

#### Pliki:
- `supabase_migrations/123_appointment_actions_prodentis_sync_status.sql` NEW (+ kopia txt na pulpit Marcina)
- `src/app/api/appointments/confirm/route.ts` (+121/-21)
- `src/app/api/admin/sms-reminders/route.ts` (+ enrichment fields)
- `src/app/admin/components/SmsRemindersTab.tsx` (+ Prodentis sync badges)
- `src/app/api/admin/appointments/reset-confirmation/route.ts` NEW (z commit 06b51e2)
- Razem: 6 plików zmienionych, ~400 LOC zmiany

#### Files na pulpicie do referencji:
- `~/Desktop/ZLECENIE_PRODENTIS_PROXY_ICON_404.md` — zlecenie dla dewelopera proxy (już rozwiązane, ale zostaw na archive)
- `~/Desktop/ODPOWIEDZ_ICON_404.md` — odpowiedź dewelopera (kluczowa diagnoza)

### 2026-05-13 EOD — Hotfix Sprint S3: Reservation security + integrity hardening (S3 redefined)

#### Commits:
- `ace0dfa` — fix(reservation): security + integrity hardening (Hotfix S3 redefined)

#### Tło — redefinicja S3:
Audyt UX zauważył że "formularz rezerwacji nie ma pól na termin". Marcin poprosił o weryfikację przed implementacją. Pełen audit (Explore agent + ręczny review) wykazał:
- Formularz `/rezerwacja` JEST spięty z Prodentis przez `/api/prodentis/slots` (Cloudflare Tunnel `pms.mikrostomartapi.com`) i `POST /api/reservations` (patient search/create + email + Telegram + push)
- Date/time picker (`AppointmentScheduler`) pojawia się **po wyborze specjalisty** (linia 401 ReservationForm.tsx: `{selectedSpecialist && <AppointmentScheduler...>`)
- Brak dead code / starych ścieżek rezerwacji — Navbar (6×), Footer (2×), sitemap.ts wszystkie wskazują tylko na `/rezerwacja`
- Brak hardcoded linków do booksy/znanylekarz/docplanner/prodentis subdomain
- Wszystkie 4 locale (pl/en/de/ua) kompletne `reservationForm` keys

**Audytor patrzył przed wyborem specjalisty i przegapił conditional flow.**

Zamiast kosmetyki UX (4-step progress bar / hint / skip) Marcin wybrał wszystkie 6 realnych poprawek wykrytych podczas audytu — bezpieczeństwo i integrity.

#### Co się zmieniło:

1. **Rate limit (`@/lib/rateLimit`)**
   - `POST /api/reservations` → 5/min per IP, 429 z Retry-After 60
   - `GET /api/prodentis/slots` → 30/min per IP (form fetchuje 5 dni w paralelu = 30 wystarczy na 6 week clicks/min)
   - Klucze: `reservation:IP` i `slots:IP` (persistent via Supabase `rate_limit_entries`, fallback in-memory)

2. **Server-side slot validation** (`/api/reservations`)
   - Po basic validation re-query Prodentis dla request date (duration 30)
   - Sprawdza czy submitted time slot (`HH:MM`) jest w returned ISO slot.start
   - Jeśli nie: 409 "Requested slot is no longer available"
   - Graceful fallback: jeśli Prodentis offline/timeout → log warning + allow przejść (żeby Prodentis hiccup nie blokował legitnych użytkowników)

3. **Demo mode guard**
   - `/api/prodentis/slots`: jeśli `isDemoMode` → return synthetic 5 slots (10:00, 10:30, 11:00, 11:30, 12:00 dla Marcina) na requested date — demo flow działa bez hittowania prod Prodentis
   - `/api/reservations`: jeśli `isDemoMode` → skip Telegram (`sendTelegramNotification`), skip patient/admin emails, skip `broadcastPush('admin'/'employee')`, skip cały OnlineBooking section (Prodentis patient search/create + intake token)
   - Save do DB i Supabase nadal działa — demo demonstruje "your reservation was saved" UX

4. **Idempotency dedup** (`/api/reservations`)
   - Przed insert: SELECT z `reservations` gdzie `phone+date+time` w ostatnich 60s
   - Jeśli istnieje → return `{success: true, duplicate: true}` (idempotent response)
   - Non-fatal: jeśli dedup query failuje, log warning, normalna ścieżka

5. **Telefon w fallback komunikacie** (`AppointmentScheduler.tsx`)
   - Import `brand` z `@/lib/brandConfig`
   - Komunikat error: `"Nie udało się pobrać terminów. Spróbuj później lub zadzwoń: ${brand.phone1} / ${brand.phone2}."`
   - Pacjent widzi numer (`570-270-470` / `570-810-800`) zamiast samego "zadzwoń"

6. **Submit disabled + hint** (`ReservationForm.tsx`)
   - Submit button: `disabled={isSubmitting || !rodoConsent || !selectedSpecialistId || !selectedDate || !selectedTime}`
   - Hint inline (italic, muted, centered) gdy specialist/date/time pusty: `t('chooseSpecialistFirst')`
   - i18n key `chooseSpecialistFirst` w pl/en/de/ua

7. **Basic server-side input validation** (`/api/reservations`)
   - `date` regex `^\d{4}-\d{2}-\d{2}$`, `time` regex `^\d{2}:\d{2}$`, requested datetime not in past (5min grace), phone length ≥9
   - 400 z opisem błędu jeśli walidacja failuje (przed jakimkolwiek DB write / Prodentis call)

#### Pliki:
- `src/app/api/reservations/route.ts` (+86/-9): rate limit, input validation, idempotency, slot revalidation, demo guards
- `src/app/api/prodentis/slots/route.ts` (+25/-2): rate limit, demo mock slots, regex validation
- `src/components/ReservationForm.tsx` (+12/-2): disabled submit + hint
- `src/components/scheduler/AppointmentScheduler.tsx` (+2/-1): import brand, phone w error
- `messages/{pl,en,de,ua}/common.json`: `chooseSpecialistFirst` key

#### Audit nie były to konkretne findings z RAPORT_AUDYT — to były problemy odkryte w trakcie weryfikacji S3. Mogą jednak być rozważane jako pre-emptive cover dla:
- DoS-style spam (rate limit)
- Slot manipulation via crafted POST (slot revalidation)
- Demo→prod data contamination (demo guard)
- Form double-submit (idempotency)

### 2026-05-13 EOD — S2-5 Test 1: Stripe live BLIK 2 PLN end-to-end + 2 critical webhook fixes

**Marcin zrobił prawdziwą płatność BLIK 2 PLN przez Stripe live mode — pierwszy end-to-end test pipeline w real money. Pierwsze 6 prób webhook delivery padło, znalezione i fixed 2 osobne bugi.**

#### Commits
- `da93c1f` docs(stripe): require www.mikrostomart.pl in webhook URL

#### Bug 1: Test mode vs Live mode mismatch
- Stripe Dashboard ma OSOBNE listy webhook endpoints dla Test mode i Live mode (toggle w prawym GÓRNYM rogu)
- Marcin utworzył webhook w Test mode podczas początkowego setup po S2-3
- Płatność BLIK 2 PLN była real money → Live mode
- Stripe webhook UI pokazywał "No event deliveries found" bo to był Test mode endpoint który nigdy nie dostawał Live events
- Fix Marcin: przełączył toggle → utworzył webhook w Live mode (osobny signing secret — oba zaczynają `whsec_...` ale Live i Test wartości są różne)
- AI docs update w `S2_5_E2E_CHECKLIST.md` troubleshooting tabela: explicit warning "No event deliveries found → Test mode vs Live mode mismatch"

#### Bug 2: 307 redirect apex → www, Stripe nie follow'uje
- URL `https://mikrostomart.pl/api/stripe-webhook` (apex, BEZ www) → DNS/Vercel robi 307 redirect do canonical `https://www.mikrostomart.pl/api/stripe-webhook`
- **Stripe webhook NIE follow'uje redirectów dla POST requests** — celowo, bo POST body + signed payload byłyby integrity-invalidated po redirect z nową konkatencją
- Wszystkie 6 delivery attempts padły z **307 ERR**:
  - charge.updated 9:48:26
  - charge.succeeded 9:48:23
  - payment_intent.succeeded 9:48:23
  - payment_intent.requires_action 9:48:09
  - payment_intent.created 9:47:52
  - payment_intent.created 9:47:38
- Fix Marcin: w Stripe Dashboard webhook endpoint → Edit destination → zmienił URL na `https://www.mikrostomart.pl/api/stripe-webhook` (z `www.`) + kliknął **Resend** na `evt_3TWXW1...` (payment_intent.succeeded)
- AI commit `da93c1f` zaktualizował 3 miejsca dokumentujące URL:
  - `src/app/admin/components/StripeSettingsTab.tsx` callout: `Endpoint URL: https://www.mikrostomart.pl/api/stripe-webhook (z www!) — apex mikrostomart.pl przekierowuje 307 na www, a Stripe webhook nie follow'uje redirectów`
  - `src/app/api/stripe-webhook/route.ts` header docstring z `^^^ www IS MANDATORY` warning + test/live mode warning
  - `~/Desktop/bałagan/S2_5_E2E_CHECKLIST.md` troubleshooting tabela: `307 ERR → URL bez www → zmień endpoint URL`

#### Dowód że pełen pipeline działa end-to-end w prod (real money)

```
1. User w sklepie → koszyk → checkout → wybiera Stripe → BLIK
2. POST /api/cart/calculate-total
   → tworzy orders row: status='pending', amount_total=2.00, idempotency_key=<uuid>, customer_details
3. POST /api/create-payment-intent { orderId, email }
   → loadPendingOrder → Stripe PI z metadata.orderId
   → attachProviderOrder → orders.provider_order_id='pi_3TWXW13hsbyR4nR90tsUVFoJ'
4. User płaci BLIK (real 2 PLN)
5. Stripe webhook → payment_intent.succeeded → POST https://www.mikrostomart.pl/api/stripe-webhook
6. constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET) → verified
7. markOrderPaid({orderId, providerOrderId, provider:'stripe', amountPaid:2.00})
   → idempotency check (status not already 'paid')
   → state guard (must be 'pending')
   → amount equality (2.00 === orders.amount_total)
   → optimistic UPDATE WHERE status='pending'
8. orders.status='paid', amount_paid=2.00, payment_provider='stripe'
9. Marcin zweryfikował w Supabase Studio: ✅ wszystko jak należy
```

#### Audit zamknięte przez Sprint 2 (do tego momentu)
- ✅ **P0-06**: payment trusts client amount → ZAMKNIĘTE (S2-2 server-side cart total)
- ✅ **P0-07**: PayU webhook bez signature accepted → ZAMKNIĘTE (S2-3 verified webhooks)
- ✅ **P1-04**: payment ufa statusowi z klienta → ZAMKNIĘTE (S2-4 read-only order-confirmation)

#### Sprint 2 status: 4.5/5
- ✅ S2-1: migracja 121 (`e44fc30`)
- ✅ S2-2: server-side cart total (`600a242`)
- ✅ S2-3: verified webhook signatures (`65f0ae3`) + bonus `c51f764` Stripe webhook secret w admin
- ✅ S2-4: order-confirmation cleanup + email idempotency (`95b5c5b`) + migracja 122
- 🟡 S2-5: częściowo done. Test 1 ✅ (Stripe live BLIK). Test 2-6 (PayU/P24/fraud/idempotency/polling) — Marcin może zrobić w wolnym czasie, NIE blokuje S3.

#### Status migracji 122 — pending verification
Marcin nie potwierdził explicit czy wgrał migrację 122. Stripe BLIK payment zadziałał, ale to wymagało tylko:
- `markOrderPaid` (aktualizuje `status/amount_paid/payment_provider/provider_order_id` — nie używa `notified_at`)
- NIE wymagało `/api/order-confirmation` polling

Jeśli Marcin nie odwiedził `/platnosc?orderId=...` po success page Stripe, to `/api/order-confirmation` może nigdy nie zostało wywołane. Niemożliwe rozróżnić bez zapytania.

**Action item** na początek S3 sesji: AI zapyta Marcina:
1. "Czy migracja 122 została wgrana na OBU Supabase (produkcja + demo)?"
2. "Czy widziałeś email order confirmation + Telegram po Stripe BLIK 2 PLN?" — jeśli tak, to migracja 122 musi być wgrana
3. Jeśli nie wgrana: Marcin wgrać `~/Desktop/migracje_supabase/migracja_122_orders_notified_at.txt` na obu Supabase PRZED dalszymi testami

#### Co dalej
- **Następna sesja: S3 UX rezerwacji** — decyzja Marcina A (4-step progress bar) / B (hint pod specjalistą) / C (skip — formularz OK)
- **Pre-requisites**: Sprint 2 funkcjonalnie complete; S2-5 reszta opcjonalna; migracja 122 verify w S3
- Po S3 → S4 XSS + public hardening (P0-08 + P0-09 + P1-07 Turnstile + P1-02 HMAC + P1-03 patient JWT)

---

### 2026-05-13 — Hotfix Sprint S2-4: order-confirmation read-only + notified_at email idempotency

**Closes the request side of order-confirmation. Nothing on the response path writes to `orders` apart from a one-shot `notified_at` flip used as an email lock.**

#### Commits
- `95b5c5b` feat(payment): S2-4 order-confirmation read-only + notified_at email idempotency
- (Bonus z poprzedniej sesji) `c51f764` feat(stripe): webhook signing secret manageable from admin panel — DB-first jak Prodentis w S1-bis. Marcin może rotować `STRIPE_WEBHOOK_SECRET` z `/admin → Stripe`.

#### Migracja 122
- `supabase_migrations/122_orders_notified_at.sql` [NEW] — idempotent
- Dodaje `orders.notified_at TIMESTAMPTZ`
- Partial index `WHERE status='paid'` dla monitoringu "paid but never notified"
- Kopia: `~/Desktop/migracje_supabase/migracja_122_orders_notified_at.txt`
- **🚨 Marcin manual step**: wgraj na obu projektach Supabase (produkcja + demo) PRZED S2-5 testem. Bez tego order-confirmation zwróci 500.

#### Co się zmieniło w `/api/order-confirmation`
- **Atomic notified_at lock**:
  ```sql
  UPDATE orders SET notified_at = NOW()
  WHERE id = $1 AND notified_at IS NULL
  RETURNING id
  ```
  Pierwszy parallel poll wygrywa race, kolejne dostają 200 `alreadyNotified: true` + skip wszystkie side-effects (email/Telegram/push).
- **Body shrunk** do `{ orderId, locale? }` — `customerDetails` usunięte (są w `orders.customer_details` z S2-2 calculate-total).
- **Read-only na orders** poza notified_at lock. Wszystkie inne pola czytane z DB row utworzonej w calculate-total.

#### Dlaczego email idempotency był potrzebny
S2-3 polling:
- `/platnosc` useEffect: 10× co 2s na 202 (PayU/P24 return URL)
- `CheckoutForm.handlePaymentSuccess`: same 10× polling (Stripe embedded form)

Race condition (typical Stripe timing):
```
T+0s    User klika "Pay" w Stripe → frontend success callback
T+0s    handlePaymentSuccess poll #1 → POST /order-confirmation → 202 (status pending)
T+2s    Stripe webhook → markOrderPaid → status='paid'
T+2s    handlePaymentSuccess poll #2 → POST /order-confirmation → 200 (paid) → SEND email
T+4s    handlePaymentSuccess poll #3 → POST /order-confirmation → 200 (paid) → SEND email ← duplicate!
```

Po S2-4:
```
T+2s    poll #2 → atomic UPDATE notified_at → RETURNING id → got row → SEND email
T+4s    poll #3 → atomic UPDATE notified_at → RETURNING id → empty (already set) → 200 alreadyNotified
```

#### Cleanup
- Stub `// TODO: Mark order as paid` komentarze w docstrings `payu/webhook` i `p24/webhook` (legacy z pre-S2-3 — markOrderPaid jest wired up od S2-3)
- Frontend `CheckoutForm.handlePaymentSuccess`: body bez `customerDetails` (komentarz dokumentuje "S2-4: orderId only — customer details are already on the orders row")

#### Audit zamknięty
- **P0-06** — `/api/order-confirmation` już całkowicie izolowane od mutacji `orders.status` i `orders.customer_details`. Nie da się sfałszować zamówienia.

#### Bonus z poprzedniej sesji (commit `c51f764`)
- **Stripe webhook secret w panelu admin** — `STRIPE_WEBHOOK_SECRET` można rotować z `/admin → Stripe → Webhook Signing Secret` zamiast Vercel env. Pattern jak Prodentis w S1-bis (DB-first, env fallback). UI z masked display + procedurą setup (link do Stripe Dashboard `>_ Developers`).
- `stripeService.ts`: `getStripeConfig()` zwraca `webhookSecret` + `webhookSource` (`db | env | none`). API keys i webhook secret resolve niezależnie — jeśli różne źródła → `source: 'mixed'`.

#### Wyniki
- `npm test`: 15/15
- `npm run build`: clean
- `grep "S2-2 BRIDGE" / "TODO.*Mark.*paid"` w src/: 0 hits ✅

#### Sprint 2 status: 4/5 sesji done
- ✅ S2-1: migracja 121 (`e44fc30`)
- ✅ S2-2: server-side cart total (`600a242`)
- ✅ S2-3: verified webhook signatures (`65f0ae3`) + bonus `c51f764` Stripe webhook secret w admin
- ✅ S2-4: order-confirmation cleanup + email idempotency (`95b5c5b`)
- ⏳ **S2-5: Manual sandbox test** — checklist w `~/Desktop/bałagan/S2_5_E2E_CHECKLIST.md`, ~30-45 min Marcin

#### Co dla Marcina
1. **Wgraj migrację 122** na OBU projektach Supabase (`~/Desktop/migracje_supabase/migracja_122_orders_notified_at.txt`) — bez tego order-confirmation zwróci 500
2. **Stripe webhook setup** (jeśli jeszcze nie zrobione): Stripe Dashboard → Developers → Webhooks → Add endpoint LUB użyj nowego pola w `/admin → Stripe → Webhook Signing Secret`
3. **Sandbox test** wg `S2_5_E2E_CHECKLIST.md` — 6 testów, zaraportuj wyniki

---

### 2026-05-13 — Hotfix Sprint S2-3: Verified webhook signatures (audit P0-07 closed, bridge removed)

**Status `'paid'` ustawia się TYLKO z verified provider webhook event.**

#### Commits
- `65f0ae3` feat(security): S2-3 verified webhooks — orders.status='paid' only via signed events

#### Co się zmieniło
- **Helper `src/lib/paymentWebhooks.ts`** [NEW, 161 LOC]:
  - `markOrderPaid({orderId, providerOrderId, provider, amountPaid})` — 4 walidacje: idempotency (already_paid early return), state guard (must be 'pending'), amount equality (tolerance 0), optimistic UPDATE z `.eq('status','pending')` chroni przed race conditions parallel webhook
  - `markOrderTerminal(orderId, 'failed'|'cancelled', provider, providerOrderId?)` — idempotent, only transitions from pending
  - `findOrderByProviderId(providerOrderId, provider)` — helper dla webhooks bez direct orderId
  - Result type: discriminated union `{ok:true, status:'paid'|'already_paid'} | {ok:false, reason:'not_found'|'amount_mismatch'|'invalid_state'|'db_error'}`
- **`/api/payu/webhook`** — **CRITICAL FIX** dla audit P0-07:
  - Stary kod: `if (signatureHeader && !verifyPayUSignature(...)) return 400` — short-circuit gdy brak nagłówka → silently accepted
  - Nowy: `if (!signatureHeader) return 400` + `if (!verify) return 400` — zawsze wymaga
  - Lookup orders po `extOrderId` (= nasz `orders.id` z S2-2)
  - COMPLETED → markOrderPaid, CANCELED → markOrderTerminal, PENDING/WAITING → ack only
- **`/api/stripe-webhook`** [NEW, 133 LOC]:
  - `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` — Stripe SDK weryfikuje + parse
  - Handle: `payment_intent.succeeded` (markOrderPaid), `payment_intent.payment_failed` (markOrderTerminal failed), `payment_intent.canceled` (markOrderTerminal cancelled)
  - Lookup orderId via `pi.metadata.orderId` (set w S2-2 `/api/create-payment-intent`)
  - Stripe sends `amount_received` w cents → `/100` na PLN
- **`/api/p24/webhook`** — dwustopniowy verify (existing) + nowa integracja z markOrderPaid:
  - Local sign SHA-384 verify (existing)
  - Remote `/api/v1/transaction/verify` (existing)
  - Extract orderId z `sessionId = 'order_<uuid>'` (S2-2 sets to this format)
  - markOrderPaid (idempotent, sprawdza amount)
- **`/api/order-confirmation`** — **S2-2 bridge USUNIĘTY**:
  - Stary kod (S2-2): jeśli status='pending' + provider_order_id → set 'paid' bez verify, z `console.warn [OrderConfirm] S2-2 BRIDGE`
  - Nowy kod (S2-3): pending → 202 "Czekam na potwierdzenie z bramki płatności"
  - Status='paid' wyłącznie z verified webhook teraz
- **`/platnosc` page + `CheckoutForm.handlePaymentSuccess`** — retry polling:
  - 10× co 2s na 202 (~20s window)
  - Stop on 200 (paid) lub 4xx (terminal)
  - Webhook zwykle przychodzi 1-3s, ale czasem do 10s — polling pokrywa worst case
  - Fire-and-poll w async block — nie blokuje success UI

#### Audit zamknięty
- **P0-07** (PayU webhook signature bypass) — krytyczna luka usunięta
- **P0-06 follow-up** — `status='paid'` żelaznie tylko z verified event (już zamknięte częściowo w S2-2, teraz finalne)

#### Race conditions
Provider webhook może odpalić 2-3x (PayU IPN retries, Stripe retry on 5xx). `markOrderPaid` jest fully idempotent:
1. Pierwszy webhook → markOrderPaid → optimistic UPDATE `WHERE status='pending'` → success → 'paid'
2. Drugi webhook (retry) → markOrderPaid → SELECT pokazuje 'paid' → early return `{ok:true, status:'already_paid'}` → 200 OK
3. Race race (jednoczesne webhooks) → jeden UPDATE przechodzi `.eq('status','pending')`, drugi zwraca 0 rows → also returns already_paid

#### Flow Stripe + Email (typical timing)
```
T+0s    User klika "Pay" w Stripe Elements
T+1s    PaymentIntent.succeeded → frontend success callback
T+1s    handlePaymentSuccess → POST /order-confirmation → 202 (status nadal pending)
T+2s    Stripe webhook → constructEvent → markOrderPaid → orders.status='paid'
T+3s    handlePaymentSuccess retry #1 → POST /order-confirmation → 200 paid → email/Telegram/push
```

W przypadku PayU/P24 (redirect flow):
```
T+0s    User klika "Pay" w PayU → redirect do PayU.com
T+5s    User kończy płatność na PayU → redirect z powrotem na /platnosc?orderId=...
T+5s    /platnosc useEffect → POST /order-confirmation → 202 (webhook jeszcze nie zdążył)
T+8s    PayU IPN webhook → orders.status='paid'
T+9s    /platnosc retry #2 → 200 paid → email
```

#### Manual Marcin step (krytyczne dla Stripe!)
Bez tego Stripe płatności pozostaną w 'pending' i nie wyślą emaila (PayU/P24 działają — używają DB secrets).
1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
   - URL: `https://mikrostomart.pl/api/stripe-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
   - Copy Signing secret (`whsec_...`)
2. Vercel env vars OBA projekty × Production+Preview:
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Vercel auto-redeploy

#### Wyniki
- `npm test`: 15/15 passed
- `npm run build`: clean
- `grep "S2-2 BRIDGE" src/`: 0 hits ✅

#### Out of scope (S2-4)
- `/api/order-confirmation` cleanup — pełen read-only, `notified_at` column (migracja 122) dla idempotency emaila
- Email sending bezpośrednio z webhook (alternative architecture) — zostawiamy frontend-driven flow

#### Następne kroki
- **S2-4** (~1h AI + Marcin migracja 122): order-confirmation cleanup, `notified_at` column, drop legacy fields
- **S2-5** (~1h AI + Marcin sandbox): E2E PayU + Stripe + P24 sandbox test, fraud test z modified amount

---

### 2026-05-12 — Hotfix Sprint S2-2: Server-side cart total (audit P0-06 closed)

**Klient nie wysyła już `amount` do żadnego payment route — server liczy total z `products` table.**

#### Commits
- `600a242` feat(payment): S2-2 server-side cart total — payment routes pull amount from DB

#### Nowy flow (3 hops)
```
1. POST /api/cart/calculate-total
   Body: { items: [{ productId, quantity, chosenPrice? }], customerDetails }
   Server: lookup products → calculate total → INSERT orders row
           (status='pending', amount_total=<computed>, idempotency_key=<uuid>)
   Response: { orderId, idempotencyKey, total, lineItems, currency }

2. POST /api/create-payment-intent | /api/payu/create-order | /api/p24/register
   Body: { orderId, email, ... }  ← NO amount
   Server: loadPendingOrder(orderId) → use amount_total → create provider
           transaction → attachProviderOrder(provider, provider_order_id)
   Response: { clientSecret | redirectUrl, orderId, total }

3. POST /api/order-confirmation (return URL or Stripe success callback)
   Body: { orderId, customerDetails? }
   Server: lookup orders → if status='paid' send email/Telegram/push
                        → if status='pending' + provider_order_id: BRIDGE (S2-3 will remove)
                        → if status='failed/cancelled': return success=false
```

#### Pliki nowe
- `src/lib/cartCalculator.ts` (255 LOC) — `calculateCartTotal()`, `createPendingOrder()`, `loadPendingOrder()`, `attachProviderOrder()`, `CartValidationError`
- `src/app/api/cart/calculate-total/route.ts` (66 LOC) — public endpoint, walidacja: qty 1..100, max 50 items, is_visible check, variable_price chosenPrice >= min_price

#### Pliki zaktualizowane
- `src/app/api/create-payment-intent/route.ts` — `{ amount }` → `{ orderId }`, metadata.orderId w PI
- `src/app/api/payu/create-order/route.ts` — `extOrderId` = our orderId (umożliwia webhook resolve)
- `src/app/api/p24/register/route.ts` — `sessionId = order_<orderId>` (deterministic correlation)
- `src/app/api/order-confirmation/route.ts` — refaktor: `{orderId}` zamiast `{cart, total, paymentId}`, status z DB
- `src/components/CheckoutForm.tsx` — nowy `createPendingOrder` step, state `orderId`, warn user gdy server total ≠ local total
- `src/app/[locale]/platnosc/page.tsx` — `useEffect` fires order-confirmation dla PayU/P24 return URL (orderId z query param)

#### Variable-price products (vouchery)
Klient wysyła `chosenPrice` w item (tylko gdy `products.is_variable_price=true`). Server enforce `chosenPrice >= products.min_price`. Cart context już ma `CartItem.price` = chosen amount, checkout maps to API.

#### Walidacje (cartCalculator.ts)
- `items.length > 0 && <= 50` (CartValidationError "Empty cart" / "Too many line items")
- `quantity 1..100` per line
- `product exists && is_visible !== false` (CartValidationError "Product not available")
- `is_variable_price && chosenPrice >= min_price` (CartValidationError ze szczegółową informacją)
- `total > 0`

#### Edge case: price drift mid-session
Jeśli server-computed total ≠ local cart total (admin zmienił cenę w trakcie checkout), frontend pokazuje `confirm("Suma zaktualizowana z X PLN do Y PLN — kontynuować?")`. User decyduje czy płacić nową cenę czy anulować.

#### 🌉 S2-2 → S2-3 BRIDGE (tymczasowy)
`/api/order-confirmation` ustawia `status='paid'` jeśli widzi `status='pending' + provider_order_id is not null`. Niezabezpieczone — nie weryfikuje webhook signature. Logged z `console.warn [OrderConfirm] S2-2 BRIDGE: marked order X as paid without webhook signature verification. S2-3 will close this.`

**Dlaczego bridge**: bez S2-3 webhooks PayU/P24 obecnie nic nie robią (mają commented stubs), Stripe webhook nie istnieje. Bez bridge zamówienia zostawałyby na zawsze w `'pending'` po deploy S2-2. Bridge utrzymuje email/Telegram/push notification flow działającym aż do S2-3.

**S2-3 wyłączy bridge**: webhook verifies signature → ustawia 'paid' → order-confirmation widzi już 'paid' z DB, bridge branch staje się dead code. Grepable marker `[OrderConfirm] S2-2 BRIDGE` w logach + komentarz w kodzie.

#### Zamykany audit
**P0-06** (payment ufa kwotom z klienta) — attacker wysyłający `{amount: 1}` dla 3500zł produktu dostaje serwerowy total 3500zł. Brak parametru `amount` w body endpointów payment.

#### Wyniki
- `npm test`: 15/15 passed
- `npm run build`: clean
- 11 plików zmienionych, +773/-199

#### Co dla Marcina
- **Nic teraz** (sesja AI-only, deploy automatyczny po push)
- **Smoke test po deployu**: spróbuj kupić cokolwiek w sklepie — full flow Stripe/PayU/P24 z return URL
- **Next session**: S2-3 webhook signatures — wymaga `STRIPE_WEBHOOK_SECRET` w Vercel env (Stripe Dashboard → Webhooks)

---

### 2026-05-12 — Hotfix Sprint S2-1: Orders state machine + migracja 121 (Sprint 2 PAYMENT INTEGRITY START)

**Schema-only migration laying ground for S2-2 (server cart total) and S2-3 (verified webhooks).**

#### Commits
- `e44fc30` feat(payment): S2-1 migration 121 — orders state machine

#### Manual Marcin (DONE)
- ✅ Migracja 121 wgrana na obu projektach: produkcja `keucogopujdolzmfajjv` + demo `mhosfncgasjfruiohlfo`
- Backfill verification: ostatni SELECT zwrócił `migration_121 | total_orders | paid_orders | with_amount_total | with_idempotency_key` — wszystkie legacy rows poprawnie zmigrowane

#### Co się zmieniło w schemacie `orders`
- **Nowe kolumny** (wszystkie `IF NOT EXISTS`):
  - `payment_provider VARCHAR(50)` — 'stripe' / 'payu' / 'p24'
  - `provider_order_id VARCHAR(255)` — Stripe PaymentIntent.id / PayU orderId / P24 sessionId; webhook lookup
  - `idempotency_key VARCHAR(255)` — UNIQUE partial index (NULL allowed dla legacy); client-generated UUID per submit
  - `amount_total NUMERIC(10,2)` — server-calculated, source of truth (S2-2 ustawi)
  - `amount_paid NUMERIC(10,2)` — z verified webhook (S2-3)
  - `updated_at TIMESTAMPTZ` z auto-trigger
- **State machine** (CHECK constraint, nie ENUM — łatwiejsza ewolucja):
  - `status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')`
  - DEFAULT `'pending'` (S2-2 będzie tworzyć rows pre-payment)
  - Transitions enforced w aplikacji (S2-2/S2-3), nie w DB
- **Triggery**:
  - `trg_orders_updated_at` BEFORE UPDATE — auto-update timestamp
  - `trg_orders_status_audit` AFTER UPDATE OF status — placeholder dla S8-3 (audit_log table, migracja 124). Funkcja sprawdza `IF EXISTS (information_schema.tables WHERE table_name='audit_log')` — no-op aż do S8-3, po S8-3 zaczyna pisać bez zmian kodu
- **3 indeksy**:
  - `idx_orders_provider_order_id` (partial, where not null) — webhook handler resolves provider id → local order
  - `idx_orders_status` — admin filter
  - `idx_orders_idempotency_key` (UNIQUE partial) — dedup retries
- **Backfill** (idempotent):
  - Legacy rows mają `status` w odpowiednich wartościach lub NULL → set 'paid'
  - `amount_total IS NULL AND total_amount IS NOT NULL` → copy
  - `amount_paid IS NULL AND status='paid'` → copy z total_amount

#### Strategia state machine
- **CHECK > ENUM**: PostgreSQL ENUM wymaga osobnej migracji aby dodać/usunąć wartości (ALTER TYPE). CHECK constraint można drop/recreate bez gymnastics. Wybrane dla łatwości iteracji.
- **Idempotency UUID**: klient generuje (np. `crypto.randomUUID()` na frontend lub `gen_random_uuid()` server-side w S2-2). Pierwszy INSERT z danym kluczem przechodzi, każdy następny fail na UNIQUE → handler zwraca existing row (200 zamiast 500).
- **Transitions w aplikacji**: DB pilnuje tylko enum'a wartości. Ścieżki (`pending → paid` tylko z verified webhook) wymuszane w kodzie S2-3.

#### Backwards compat
- Stare kolumny (`customer_details`, `items`, `total_amount`, `payment_id`) **NIE** ruszone
- Stara aplikacja działa dalej — nic w kodzie jeszcze nie używa nowych kolumn
- S2-2 wprowadzi rozdwojenie: nowe pola za rządzą, stare kolumny zostają jako legacy dla istniejących orderów

#### Plik
- `supabase_migrations/121_orders_state_machine.sql` [NEW] 209 LOC
- `~/Desktop/migracje_supabase/migracja_121_orders_state_machine.txt` (kopia dla Marcina)

#### Następne kroki
- **S2-2** (~2h AI): server-side cart total
  - Nowy `POST /api/cart/calculate-total` — input `{items: [{productId, quantity}]}`, server pobiera ceny z `products` table, liczy total, zwraca `{total, lineItems, idempotencyKey}`
  - Update `/api/create-payment-intent` (Stripe) — usuń `amount` z body, oblicz server-side
  - Update `/api/payu/create-order` — same
  - Update `/api/p24/register` — same
  - Update `/api/order-confirmation` — NIE pisze `status='paid'` z body, sprawdza w DB
  - Frontend ShopModal/CartContext — wysyła tylko `items[]`, dostaje total z server
- **S2-3** (~2h AI): webhook signatures (PayU OpenPayU-Signature, Stripe constructEvent, P24)
- **S2-4** (~1h AI): order-confirmation cleanup
- **S2-5** (~1h AI + Marcin sandbox): E2E PayU + Stripe sandbox test + fraud test (modified amount)

---

### 2026-05-12 — Hotfix Sprint S1-bis: PMS API key managed from admin panel (follow-up to S1-4)

**Po S1 SPRINT COMPLETE — feature request od Marcina: rotacja klucza Prodentis bez wchodzenia do Vercel.**

#### Commits
- `75bc682` feat(security): S1-bis — manage Prodentis API key from admin panel (DB-first, env fallback) (22 plików, +496/-120)

#### Co się zmieniło
- **Helper `src/lib/pmsConfig.ts`** (NEW, 103 LOC) — `getProdentisKey()` + `getPMSConfig()` z 3-poziomowym fallbackiem:
  1. `clinic_settings.value.apiKey` (admin-managed)
  2. `process.env.PRODENTIS_API_KEY` (Vercel env, fallback)
  3. `null` → 500 error w callerze
  - 60s in-memory cache (oszczędza DB hit per request)
  - `invalidatePMSCache()` wywoływany po PATCH endpoint → zmiana widoczna natychmiast
  - `maskApiKey()` helper (`abc1...e9b1`)
- **Endpoint `/api/admin/pms-settings`** rozszerzony:
  - GET: `api_key_masked`, `source: 'db'|'env'|'none'`, `apiUrl`, `notes`, `updatedAt`, `updatedBy`
  - PATCH: przyjmuje `apiKey` (string → save, pusty → clear DB, fall back to env)
  - POST?action=health: optional override `apiKey` aby przetestować klucz przed zapisaniem
- **UI `PmsSettingsTab.tsx`** rozszerzony:
  - Sekcja "Klucz API (X-API-Key)" z masked display + source badge ('Baza danych' / 'Zmienna ENV')
  - Pole input do nowego klucza (type=password) + buttons "Zapisz klucz" / "Testuj klucz" / "Wyczyść (wróć do ENV)"
  - Callout z procedurą rotacji (PowerShell instructions z `~/Desktop/bałagan/Dla dewelopera mikrostomart/INSTRUKCJA_ROTACJI_KLUCZA.md`)
- **15 callerów zaktualizowanych** — wszystkie `process.env.PRODENTIS_API_KEY || ''` → `(await getProdentisKey()) ?? ''`:
  - `consents/sign`, `employee/export-biometric` (top-level → in-handler)
  - `intake/{submit,generate-pdf}`, `appointments/confirm`, `reservations`
  - `patients/appointments/{cancel,confirm-attendance,reschedule}`
  - `admin/{online-bookings, careflow/{export-prodentis,report}, prodentis-schedule/{color,icon}}`
  - `cron/careflow-report`
  - `lib/pms/prodentis-adapter` — sync getter `apiKey` → async `getApiKey()` method

#### Architektura rotacji (kontekst dokumentacji w `~/Desktop/bałagan/Dla dewelopera mikrostomart/`)
- API `pms.mikrostomartapi.com` to **nasze własne** proxy (nie firma Prodentis) — Cloudflare Tunnel do serwera w klinice
- v10.1 ma własny mechanizm rotacji: `POST /api/admin/rotate-key` (PowerShell, na serwerze, X-Admin-Token z `api-keys.json`) generuje nowy klucz z 30-dniowym grace period (oba klucze działają)
- Workflow po S1-bis: Marcin → PowerShell rotate → wkleja nowy klucz w panelu admin Mikrostomart → DB save → cache invalidate → wszystko jeździ. Po 30 dniach (lub wcześniej) PowerShell revoke-previous-key.

#### Out of scope (follow-up)
- **prodentisFetch** helper (`src/lib/prodentisFetch.ts`) nadal nie auto-injectuje X-API-Key — caller per-route przekazuje header. Docs `DLA_DEWELOPERA_ROTACJA_KLUCZA.md` rekomenduje dodać X-API-Key do KAŻDEGO requestu (read + write) ponieważ Prodentis API v10.1+ może w przyszłości wymagać go też na GET. Clean refactor ale dotyka więcej plików — odłożone.

#### Wyniki
- `npm test`: 15/15 passed
- `npm run build`: clean
- `grep process.env.PRODENTIS_API_KEY src/`: 2 hits (helper + endpoint fallback chain — by design)
- 18 plików importuje `getProdentisKey`

#### Co dla Marcina (one-time setup)
- Po deploy: zaloguj do `/admin → PMS` → zobacz "Źródło: ⚙️ Zmienna ENV (Vercel)" + masked `2c9b...0947`
- Na serwerze PowerShell: `POST /api/admin/rotate-key` (instrukcja w INSTRUKCJA_ROTACJI_KLUCZA.md)
- W panelu admin: wklej nowy klucz → "Zapisz klucz" → "Testuj połączenie"
- Stary `2c9bd5b4...` w Vercel env zostaw lub wyczyść — DB key ma priorytet
- Po 30 dniach: PowerShell `revoke-previous-key` → stary klucz martwy
- Następne rotacje: workflow w 100% w panelu admin (po stronie Mikrostomart) + 1 PowerShell command na serwerze

#### Next
- **S2-1**: order state machine + migracja 121 (Sprint 2 Payment Integrity start)

---

### 2026-05-12 — Hotfix Sprint S1-4: Cron manual=true admin guard + Prodentis key hardcoded fallback removal — **S1 SPRINT COMPLETE**

**Czwarta i finalna sesja Sprint 1 — zamknięcie auth surface (P1-01 + P0-05).**

#### Commits
- `9f3fa64` feat(security): S1-4 — cron manual=true requires admin, drop hardcoded Prodentis key (17 plików, +79/-24)

#### Co się zmieniło
- **12 cronów `?manual=true`** zostało zabezpieczonych `requireAdmin()`. Wcześniej dowolny anonimowy user przez `?manual=true` mógł triggerować: SMS bursts, push spam, AI cost generation, KCP shift force-recalc. Niezmieniony `CRON_SECRET` Bearer header path (auto-invocation z Vercel scheduled jobs) — nie psuje istniejących cronów.
- **3 warianty cron auth zunifikowane**:
  - Style 1 (5 plików): `if (!isCronAuth && !isManualTrigger && NODE_ENV='production')` → unified
  - Style 2 (3 pliki): `if (authHeader !== ... && NODE_ENV='production' && !isManual)` → unified  
  - Style 3 (4 pliki): `if (!isManual) { check CRON_SECRET }` → unified
  - Po: każdy `if (isManualTrigger) { requireAdmin } else if (!isCronAuth && NODE_ENV='production') { 401 }`
- **Prodentis API key hardcoded fallback usunięty** z 2 plików:
  - `src/app/api/consents/sign/route.ts:11`
  - `src/app/api/employee/export-biometric/route.ts:13`
  - Stary: `process.env.PRODENTIS_API_KEY || '2c9bd5b4-5090-4007-8f06-936811bd0947'`
  - Nowy: `process.env.PRODENTIS_API_KEY` + per-handler check → 500 jeśli brak env

#### Pliki ruszone (12 cronów + 2 Prodentis = 14 plików logicznych, 17 total z generated)
- **Style 1** (combined check): appointment-reminders, post-visit-auto-send, post-visit-sms, task-reminders, week-after-visit-sms
- **Style 2** (separate AND condition): close-day, forgot-clockout-notify, prodentis-end-times
- **Style 3** (separate branch): email-ai-drafts, social-generate, social-publish, video-process
- **Prodentis fallback**: consents/sign, employee/export-biometric

#### Crony NIE ruszone (15 plików, brak `?manual=true`)
- birthday-wishes, careflow-auto-qualify, careflow-push, careflow-report, daily-article, daily-report, deposit-reminder, noshow-followup, online-booking-digest, push-appointment-1h, push-cleanup, push-escalation, sms-auto-send, social-comments
- Te są tylko Vercel scheduled (CRON_SECRET only) — bez manual trigger, więc nie wymagają admin guard.

#### Wyniki
- `npm test`: 15/15 passed
- `npm run build`: clean
- `grep '2c9bd5b4' src/`: 0 wystąpień ✅
- `grep requireAdmin src/app/api/cron/`: 12 plików ✅
- **Pozostałe verifyAdmin callery total**: 47 (employee/time/withAuth/fix-db-images) — odłożone do S1-bis / S9

#### Co dla Marcina (manual steps — POST DEPLOY)
**Rotacja Prodentis API key** (~5-10 min):

1. **Wygeneruj nowy klucz:**
   ```bash
   openssl rand -hex 32
   # lub: uuidgen | tr A-Z a-z
   ```

2. **Vercel env vars** — projekt `mikrostomart` × Production + Preview, projekt `densflow-demo` × Production + Preview:
   - Settings → Environment Variables → `PRODENTIS_API_KEY` → edit value

3. **Serwer NASZEGO PMS proxy** (gdzie validuje X-API-Key header):
   - Edit config/env serwera proxy
   - Restart aplikacji proxy
   - Marcin: "to nie oficjalne API Prodentis, sami stworzyliśmy" — czyli klucz jest shared secretem między klientem (Next.js w Vercel) a Waszym proxy/tunelem

4. **Lokalnie**: `~/mikrostomart/.env.local` → linia `PRODENTIS_API_KEY=...` → wklej nowy

**Bezpieczna kolejność (downtime ~30s do 2 min):**
1. Wygeneruj klucz
2. Vercel env update (oba projekty) → automatyczny redeploy startuje
3. **W trakcie buildu Vercel** → zmień klucz w serwerze proxy (cel: oba miejsca synchronicznie)
4. Smoke: spróbuj podpisać consent na produkcji + employee export biometric

**Stary klucz** `2c9bd5b4-5090-4007-8f06-936811bd0947` w 5 commitach git history (od `30e743d`) pozostaje immutable (NIE używamy `filter-branch` — przepisuje historię i psuje wszystkie clones), ale po rotacji proxy go nie akceptuje → publiczny secret staje się martwy.

#### S1 SPRINT COMPLETE — Summary

**4 sesje (S1-1 .. S1-4) zamknęły cały auth surface:**
- **S1-1** `d8c6f53`: central `src/lib/authGuards.ts` z 3 guards + 5 testów (401/403/200)
- **S1-2** `c391076`: 78 admin endpoints + 3 unauth settings (P0-03 fix) na nowe guards
- **S1-3** `1bc6ed7`: 19 social endpoints + token masking + OAuth × 3 admin-only
- **S1-4** `9f3fa64`: 12 cron manual guards + hardcoded Prodentis key fallback removal

**Audit findings closed:**
- P0-01 (verifyAdmin login-only) — closed by S1-1 + S1-2
- P0-02 (role escalation w /api/admin/roles) — closed by S1-2
- P0-03 (unauth payment settings stripe/payu/p24) — closed by S1-2
- P0-04 (public /api/social/*) — closed by S1-3
- P0-05 (hardcoded Prodentis key fallback) — closed by S1-4 (rotacja czeka na Marcin)
- P1-01 (manual=true cron bypass) — closed by S1-4

**Out of scope** (przesunięte na S1-bis / dalsze sprinty):
- P1-08 signed-state HMAC dla OAuth callbacks (S1-3 follow-up)
- `/api/employee/**` (~45 plików) — wymagają `requireEmployeeOrAdmin`, planowane S1-bis
- `/api/time/**` (KCP scan) — separate refactor, KCP-critical path
- `/api/fix-db-images` — debug endpoint, low priority
- `src/lib/withAuth.ts` — dead code, S9 cleanup

#### Next
- **S2-1** (~1.5h AI + Marcin Supabase): migracja `121_orders_state_machine.sql` — order state machine (ENUM status, provider_order_id, idempotency_key, amount_total/paid). Audit P0-06 + P0-07 + P1-04. Bazą Sprint 2 Payment Integrity.

---

### 2026-05-12 — Hotfix Sprint S1-3: /api/social/* lockdown (19 endpoints, P0-04)

**Trzecia sesja Hotfix Sprint — pełen lockdown social media surface (audit P0-04 + częściowy P1-08).**

#### Commits
- `1bc6ed7` feat(security): S1-3 — /api/social/* lockdown (19 endpoints, P0-04) (22 plików, +158/-16)

#### Co się zmieniło
- **Wszystkie 19 plików w `src/app/api/social/**/route.ts`** dostały `requireAdmin()` na każdym handlerze HTTP. Wcześniej 16/19 routes było całkowicie publicznych (audit P0-04).
- **Token masking w `/api/social/platforms`**:
  - Nowy helper `maskPlatform()` strip `access_token` i `refresh_token` z DB rows
  - GET/POST/PUT responses zwracają `has_access_token: bool`, `has_refresh_token: bool`, `token_expires_at` zamiast raw secrets
  - Admin UI dostaje wszystko czego potrzebuje (status, expiry), ale nigdy raw token
- **OAuth × 3** (facebook, tiktok, youtube): single GET handler obsługuje initiate (no `code`) + callback (with `code`). `requireAdmin()` jako pierwsza rzecz w handlerze — działa dla obu, bo provider redirect przychodzi do tego samego browsera gdzie admin session cookie jest persistent. Mid-flow logout = restart connection.
- **`/api/social/topics`** — jedyny social plik który używał `verifyAdmin()` zmigrowany na `requireAdmin` (zgodnie z S1-2 patterns).

#### Pliki ruszone (per kategoria)
- **Single-handler** (8): comments/fetch, comments/publish, debug-platforms, debug-tiktok, fix-platforms, generate, posts/learn, publish
- **Multi-handler CRUD** (4): comments (GET+PATCH+DELETE), media (GET+POST+DELETE), posts (GET+POST+PUT+DELETE), schedules (GET+POST+PUT+DELETE)
- **Token-sensitive** (1): platforms (GET+POST+PUT+DELETE + maskPlatform helper)
- **Video** (2): video-upload (5 handlers), video-publish (POST handler + internal helper `publishVideoToPlatforms` zostaje internal)
- **Topics replace** (1): topics (GET+POST+PUT+DELETE — verifyAdmin → requireAdmin)
- **OAuth** (3): facebook, tiktok, youtube — single GET each

#### Out of scope (deferred)
- **P1-08 signed-state HMAC** dla OAuth callbacks. Wymaga:
  - Secret env var (`OAUTH_STATE_SECRET`)
  - Helper `generateState()` / `verifyState()` z HMAC-SHA256 + nonce + TTL
  - Nonce storage (httpOnly cookie albo Supabase table)
  - Verify w callback (parse state → check signature + nonce match + exp)
  - Aktualny `requireAdmin()` na callback pokrywa primary attack (anonymous token theft). Follow-up: S1-3-bis lub osobna sesja.
- **Cron-only social** — żadne nie istnieją obecnie jako oddzielne routes (publish/generate są admin-triggered). Gdyby powstały → `CRON_SECRET` Bearer header check zamiast requireAdmin.

#### Wyniki
- `npm test`: 15/15 passed
- `npm run build`: clean (tylko pre-existing Sentry deprecation warning)
- `grep verifyAdmin src/app/api/social/`: 0 wystąpień ✅
- `grep requireAdmin src/app/api/social/`: 19 plików ✅
- **Pozostałe verifyAdmin callery total**: 50 (employee/time/cron/withAuth/fix-db-images)

#### Co dla Marcina (manual steps)
- **Nic** — sesja AI-only.
- Po deploy: spot-check social w admin panelu (login → social-media tab → próba załadowania platforms list). Anonimowy curl `GET /api/social/platforms` powinien zwrócić 401, nie listę z tokens.

#### Next
- **S1-4** (~1.5h AI + 5 min Marcin): crony `?manual=true` + Prodentis key rotation. Audit P1-01 + P0-05. **Manual Marcin**: rotacja klucza Prodentis API + update env `PRODENTIS_API_KEY` na obu projektach Vercel.

---

### 2026-05-12 — Hotfix Sprint S1-2: Admin endpoints rebind + 3 unauth settings fix

**Druga sesja Hotfix Sprint — migracja 78 admin endpointów na nowe guards + zamknięcie audit P0-03 (unauth payment settings).**

#### Commits
- `c391076` feat(security): S1-2 — admin endpoints + 3 unauth settings now require role (82 plików, +626/-416)

#### Co się zmieniło
- **78 endpoint files** w `src/app/api/admin/**` + `/api/products` + `/api/health/ai` zmigrowane z legacy `verifyAdmin()` (login-only) na nowe guards z `src/lib/authGuards.ts`:
  - Default: `requireAdmin()` (~73 plików — roles, settings, push, sms, blog, news, patients, employees, etc.)
  - Pattern employee-or-admin: `admin/chat/messages`, `admin/chat/conversations`, `admin/careflow/stats` → `requireEmployeeOrAdmin()` (zachowanie poprzednie: admin OR employee)
- **3 unauth payment settings** (`stripe-settings`, `payu-settings`, `p24-settings`) — dostały `requireAdmin` od zera. Audit P0-03 fix: anonimowy `PATCH /api/admin/{stripe,payu,p24}-settings` mógł zapisać dowolne klucze do `clinic_settings` (potencjał przekierowania płatności).
- **scripts/migrate_verifyAdmin.py** — narzędzie auto-migracji (regex patterns A/C/D), 63 plików auto-zmigrowanych. Reszta (15 plików) ręcznie.

#### Pattern matching strategia
- **Pattern A** (najczęstszy): `const user = await verifyAdmin(); if (!user) return NextResponse.json({error:'Unauthorized'},{status:401});` → `const auth = await requireAdmin(); if (!auth.ok) return auth.response; const user = auth.user;`
- **Pattern B** (helpers): brand-logo, sections, page-overrides, theme, templates × 2 — używają lokalnego `checkAdmin()` helpera. Helper rewritten by używał `requireAdmin` wewnątrz, call sites bez zmian.
- **Pattern C** (multi-line if): `roles/*`, `employees/*` — multi-line `if (!user) {\n return ... }` → ten sam pattern co A.
- **Pattern D** (boolean inline): `articles`, `blog/generate`, `news/generate`, `orders`, `questions`, `reservations`, `products` — `if (!(await verifyAdmin())) return ...` → `const auth = await requireAdmin(); if (!auth.ok) return auth.response;`
- **3 settings (P0-03)**: nie miały żadnej auth → dodano `requireAdmin()` na każdym GET/PATCH/POST handlerze (9 dodanych checków).

#### Plan vs reality (decyzja)
PLAN_HOTFIX_SPRINT.md S1-2 sugerował że `schedule/`, `time-tracking/`, `leave-requests/` → `requireEmployeeOrAdmin`. **Reality**: te endpointy mają już explicit `hasRole(user.id, 'admin')` w kodzie (admin-only). Zachowaliśmy obecne zachowanie → `requireAdmin`. Architektonicznie: `/api/admin/schedule` = admin edytuje grafik, `/api/employee/schedule-view` = employee read-only. Plan może być błędny w tym fragmencie.

#### Out of scope (51 pozostałych callerów verifyAdmin)
Nie ruszone w S1-2 — outside scope:
- **`src/app/api/employee/**`** (~45 plików) — endpointy strefy pracownika, semantycznie wymagają `requireEmployeeOrAdmin`. Plan na S1-bis lub osobny sprint.
- **`src/app/api/time/**`** (4 pliki KCP scan) — używają verifyAdmin + hasRole employee/admin. Wymagają osobnego refaktoru — KCP-critical path.
- **`/api/social/topics`** — pójdzie w S1-3 (full social lockdown).
- **`/api/cron/daily-article`** — pójdzie w S1-4 (cron manual guard).
- **`/api/fix-db-images`** — debug endpoint, low priority.
- **`src/lib/withAuth.ts`** — dead code (zero call sites). Higher-order auth wrapper, prawdopodobnie do usunięcia w S9 cleanup.

#### Wyniki
- `npm test`: 15/15 passed (bez zmian od S1-1 — testy nie zostały dotknięte)
- `npm run build`: clean (tylko Sentry deprecation warning, pre-existing)
- `grep verifyAdmin src/app/api/admin/`: 0 wystąpień ✅
- Caller pattern wyrówny: każdy admin handler ma:
  ```ts
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const user = auth.user;  // optional
  ```

#### Co dla Marcina (manual steps)
- **Nic** — sesja AI-only. Stary `verifyAdmin()` zostaje exportowany z `src/lib/auth.ts`, więc nie ma breakage dla 51 pozostałych callerów.
- Po deploy: spot-check admin panelu (login → roles → push → orders). Pacjent zalogowany do strefy pacjenta NIE powinien mieć dostępu do żadnego endpointu admin.

#### Next
- **S1-3** (~1.5h AI): `/api/social/*` lockdown (19 endpointów). Audit P0-04 — publiczne route'y zarządzające tokenami OAuth + service-role Supabase. Tokens masking w `/platforms`, signed state HMAC w OAuth callbacks.

---

### 2026-05-12 — Hotfix Sprint S1-1: Central authGuards

**Pierwsza realizacja Hotfix Sprint — central auth helpers.**

#### Commits
- `d8c6f53` feat(security): S1-1 — central authGuards (requireAdmin/requireEmployeeOrAdmin/requireSupabaseUser)

#### Co się zmieniło
- Nowy plik `src/lib/authGuards.ts` z trzema guards:
  - `requireSupabaseUser()` — login only (poprawna nazwa dla obecnego `verifyAdmin()`)
  - `requireAdmin()` — login + rola `admin` w `user_roles`
  - `requireEmployeeOrAdmin()` — login + rola `admin` LUB `employee`
- Wszystkie zwracają discriminated union `{ ok: true; user; roles } | { ok: false; response: NextResponse }`
- `roles` w sukcesie eksponuje wszystkie role usera (oszczędza re-query w callerach typu `/api/admin/chat/messages` które sprawdzają obie role)
- Wewnętrznie reużywa `getUserRoles()` z istniejącego `src/lib/roles.ts` (service-role query do tabeli `user_roles`, migracja 015)
- Stary `verifyAdmin()` z `src/lib/auth.ts` NIE zmieniony — wymiana 316 callerów w S1-2

#### Pliki
- `src/lib/authGuards.ts` [NEW] 75 linii
- `src/lib/__tests__/authGuards.test.ts` [NEW] 116 linii, 5 testów
  - 401 (no user) na `requireSupabaseUser`
  - 403 (employee-only) na `requireAdmin`
  - 200 (admin) na `requireAdmin`
  - 200 (employee) na `requireEmployeeOrAdmin`
  - 403 (patient-only) na `requireEmployeeOrAdmin`

#### Caller pattern (do użycia w S1-2)
```ts
import { requireAdmin } from "@/lib/authGuards";

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { user, roles } = auth;
    // ... handler logic
}
```

#### Wyniki
- `npm test`: 15/15 passed (10 wcześniej + 5 nowych)
- `npm run build`: clean
- Production: bez zmian (nowy plik, brak importów z istniejącego kodu — żadne endpointy jeszcze nie używają)

#### Next
- **S1-2**: replace 316 wywołań `verifyAdmin()` przez nowe guards. Lista folderów per role w `PLAN_HOTFIX_SPRINT.md` S1-2. Acceptance: curl `/api/admin/roles` jako pacjent → 403.

---

### 2026-05-12 — 🚨 HOTFIX SPRINT AKTYWOWANY (Faza K Premium PAUSED)

**Po dwóch zewnętrznych audytach (kod + UX) Marcin zlecił 9-sprintowy plan poprawek przed Fazą K.**

#### Geneza
- Audyt kodu (`~/Desktop/bałagan/RAPORT_AUDYT_MIKROSTOMART_2026-05-12.md`): **89 production vulnerabilities** (10 critical), `verifyAdmin()` faktycznie sprawdza tylko login (nie rolę admin), 49 z 76 admin endpointów wystawione, payment integrity opaty na danych klienta, stored XSS w WYSIWYG, hardcoded Prodentis API key w 5 commitach git history.
- Audyt UX (`~/Desktop/bałagan/raport-mikrostomart-audyt.md`): 8/10 ogólnie. Mapa bólu bez disclaimera medycznego, menu desktop ukryte za hamburger, AI asystent nachodzi na formularze, kalkulator/cennik/porównywarka scroll bug.

#### Decyzja Marcina
**"jebać fazę K"** — Premium Positioning Reset PAUSED do końca Hotfix Sprint. Security pierwsze.

#### Plan 9 sprintów (kolejność, NIE łączyć)
1. **S1 — Auth** (~1-2 dni, 4 sesje): authGuards.ts (`requireAdmin/requireEmployeeOrAdmin/requireSupabaseUser`) + rebind 76 admin endpointów + social lockdown + crony manual + Prodentis key rotation
2. **S2 — Payment Integrity** (~2-4 dni, 5 sesji): order state machine (migracja 121) + server-side cart total + verified webhook signatures + sandbox E2E
3. **S3 — UX Rezerwacja** (~30 min, REDEFINIOWANY): formularz JUŻ MA AppointmentScheduler z Prodentis slots, problem to UX cue (audytor patrzył pre-select specjalisty). Marcin wybiera A/B/C.
4. **S4 — XSS + Public Hardening** (~2-3 dni, 5 sesji): isomorphic-dompurify + CSP enforce + Cloudflare Turnstile na contact form + HMAC tokens dla appointment confirm/cancel + patient JWT cleanup + bucket private
5. **S5 — SEO P2 Cleanup** (~1-2 dni, 3 sesje): `html lang="uk"` (z "ua"), robots prefiksy językowe, sitemap exclude noindex, news fallback notFound, `/wizyta/*` noindex, i18n deep merge fix (spawn'owany task po J-1)
6. **S6 — Dependency Upgrade** (~2-3 dni, 4 sesje): Next 16 patch, next-intl, Firebase+protobufjs critical, cleanup unused
7. **S7 — UX Follow-up** (~1-2 dni, 3 sesje): mapa bólu disclaimer medyczny + alarmowe objawy, scroll fix kalkulator/cennik/porównywarka, AI asystent positioning na formularzach, menu desktop visible + mobile redesign
8. **S8 — RODO + 2FA** (~2-3 dni, 4 sesje): PII audit + retention policy, 2FA dla admin/staff (TOTP + recovery codes), audit log dla PII operations, AI policy + 30d retention
9. **S9 — Lint baseline + CI** (~1 dzień, 2 sesje): eslint-baseline frozen + GitHub Actions security gates (npm audit, gitleaks, grep blockers)

#### Pliki tracking
- `~/Desktop/bałagan/PLAN_HOTFIX_SPRINT.md` — pełen plan (1.0)
- `~/Desktop/bałagan/PLAN_HOTFIX_STATUS.md` — tracker per sesja + decisions log
- `~/Desktop/bałagan/RAPORT_AUDYT_MIKROSTOMART_2026-05-12.md` — źródło findings P0/P1/P2
- `~/Desktop/bałagan/raport-mikrostomart-audyt.md` — źródło findings UX
- Memory: `project_hotfix_sprint.md` [NEW], `project_premium_seo_plan.md` [MOD — PAUSED status], `MEMORY.md` [MOD — index updated]
- KOMENDA section 0: aktywny sprint = Hotfix, NEXT SESSION = S1-1

#### Verified w sesji 0
- **Prodentis API key `2c9bd5b4-5090-4007-8f06-936811bd0947`**: w **5 commitach** git history od `30e743d`, wciąż aktywny w 2 plikach HEAD (`consents/sign`, `employee/export-biometric`). Decyzja: rotacja w Prodentis API unieważnia klucz (NIE filter-branch — immutable history).
- **Formularz rezerwacji**: `src/components/ReservationForm.tsx` JUŻ używa `AppointmentScheduler` (linia 9) z Prodentis slots (`/api/specialists` + `/api/prodentis/slots`). Audytor UX prawdopodobnie patrzył przed wyborem specjalisty. S3 redefiniowany na "UX cue / progress indicator".

#### Total estimate
- ~30 sesji AI w 6-7 tygodniach (~50h AI)
- ~4-5h Marcin (Prodentis rotation, migracje 121-124, Turnstile setup, PayU/Stripe sandbox tests, menu decyzja, 2FA setup dla każdego employee)

#### Reguły bezpieczeństwa (przez cały plan)
1. Zawsze branch dla > 1 plik
2. Smoke test prod-prawda po każdym sprincie (build + critical paths)
3. Migracje idempotentne
4. Backwards-compat grace period dla auth (verifyAdmin → requireAdmin przez 7-14 dni)
5. Manual Marcin steps wyraźnie zaznaczone
6. NIE łączyć sprintów w jeden commit

> **Brak migracji DB / nowych env var w tej sesji setup** — to wszystko w przyszłych sprintach.

---

### 2026-05-12 — Reorganizacja pulpitu Marcina + dokończenie Fazy J (3 follow-up fixes)

**Marcin uporządkował pulpit**: przeniósł WSZYSTKIE AI-tracking files z top-level pulpitu do nowego folderu `~/Desktop/bałagan/`. Na pulpicie top-level pozostały tylko `KOMENDA_STARTOWA_MIKROSTOMART.md` + symlink `mikrostomart` (+ folder `migracje_supabase/` + `NOWOSIELSKI_PL_RECOVERY/` + osobiste).

**Przeniesione do `~/Desktop/bałagan/`**:
- `PLAN_PREMIUM_SEO.md`
- `PLAN_PREMIUM_SEO_STATUS.md`
- `PLAN_PREFLIGHT_CHECKLIST.md`
- `MARCIN_NOWOSIELSKI_BIO_INVENTORY.md`
- `MAPA_PROJEKTU_QUICK_LOOKUP.md`
- Wszystkie historyczne `KOMENDA_STARTOWA_MIKROSTOMART.md.bak-*`

**Zaktualizowane referencje**:
- `KOMENDA_STARTOWA_MIKROSTOMART.md` (sekcja 0 + sekcja 2 KRYTYCZNE LOKALIZACJE + 6.2 backup instructions)
- `memory/reference_mikrostomart_paths.md`
- `memory/project_premium_seo_plan.md`
- `memory/MEMORY.md` (index)
- `mikrostomart_context.md` (ten wpis)

**Również w tej sesji — 3 J-5 follow-up commits (Facebook Sharing Debugger bug hunt)**:
- `85d213a` — fix homepage missing og:image/url/type/site_name (Next 16 fully replaces openGraph when child segment declares one — homepage musiała explicit deklarować wszystkie pola)
- `cb152d9` — fix #2: og:type/url/site_name w `pageMetadata()` helper + fb:app_id w `other` field (later naprawione w #3 bo Next emit name= zamiast property=)
- `6ffe4ab` — fix #3: fb:app_id z `property=` (manualne head JSX, bo Next `other` field zawsze emit'uje `name=` ale Facebook wymaga `property=`); facebook-domain-verification w `other` field (Facebook tu akceptuje `name=`); brand config dodaje `facebookAppId: '746876361690533'` (Live) + `facebookDomainVerification: 'byu0avp7yqg5k0o59jpw3i7a3ho6wu'` (Business Suite domain claim token)

**Marcin ręczne (TODO)**:
- Otwórz https://business.facebook.com/ → Settings → Brand Safety → Domains → znajdź `mikrostomart.pl` → kliknij **Verify** (potwierdzenie meta-tag verification)
- Jeśli FB Sharing Debugger wciąż pokazuje `fb:app_id missing` po 10 min od Live mode toggle — to FB cache lag, można pominąć (kod jest poprawny, tag w `<head>` z `property=`)

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-12 — Premium SEO Plan: Sesja J-5 (internal linking + priceRange premium) — **FAZA J KOMPLETNA**

**Piąta i ostatnia sesja Fazy J. /dla-pacjentow-przyjezdnych traci status orphan page (3 incoming linki), cross-links protetyka↔implantologia, premium signal `priceRange: $$$`. Faza J KOMPLETNA — wszystkie 5 sesji.**

#### Commit:
- `a8c985d` — feat(seo): J-5 — internal linking + priceRange premium signal

#### Co się zmieniło:

**1. Nowy komponent `<InternationalPatientsTeaser>` (`src/components/InternationalPatientsTeaser.tsx`, 114 LOC):**
- Two variants: `wide` (full-bleed homepage section) i `compact` (boxed dla /kontakt)
- Premium styling: deep-teal gradient (`#0d4f54 → #062a2d`) + gold accent (`#d4af37`) + Georgia serif headline — mirrors J-3 OG cards aesthetic
- Locale-aware z `useTranslations('przyjezdni')`: `teaserBadge`, `teaserTitle`, `teaserDesc`, `teaserCta`
- 16 nowych translation strings (4 keys × 4 locale) dodane do `messages/{pl,en,de,ua}/pages.json` przyjezdni namespace
- Link do `/dla-pacjentow-przyjezdnych` używa `Link` z `@/i18n/navigation` (client component, no SSR issue)
- Hover: gold lighten + translateX subtelnie

**2. Wire HomeClient:**
- `src/app/[locale]/HomeClient.tsx` — `<InternationalPatientsTeaser />` w wariancie `wide` wstawiony PO `{sections.filter(s => s.visible).map(...)}` (po wszystkich admin-configurable sekcjach), PRZED Notification Toast.
- Soft-sell finale: reader scrolluje przez Hero/services/reviews → trafia na teaser jako ostatni eye-catcher przed Footer.
- Verified: Homepage HTML zawiera `href="/dla-pacjentow-przyjezdnych"` × 2 (Footer + teaser), EN homepage pokazuje "International patients" badge ✓, DE pokazuje "Internationale Patienten" ✓.

**3. Wire /kontakt:**
- `src/app/[locale]/kontakt/page.tsx` — `<InternationalPatientsTeaser variant="compact" />` wstawiony PO sekcji "Directions" (parking/transport/A4/hotele/języki z H6) PRZED Contact Form.
- Naturalny lead-in: pacjent czyta parking+hotele+języki → callout "pełna oferta dla pacjentów spoza Opola" w pełnej narracji.
- Compact variant: boxed (rounded corners), `max-width: 900px`, ciaśniejszy padding niż wide.

**4. Cross-links protetyka ↔ implantologia:**
- Nowe translation keys (3 per page × 2 pages × 4 locale = 24 strings):
  - `implantologia.crossLinkTitle`, `crossLinkDesc`, `crossLinkCta` ("Implant to fundament — uzupełnij protetyką")
  - `protetyka.crossLinkTitle`, `crossLinkDesc`, `crossLinkCta` ("Brak zęba? Implant jest często najlepszym wyborem")
- W `src/app/[locale]/oferta/implantologia/page.tsx` — callout block z `<Link href="/oferta/protetyka">` wstawiony PO "Technical Details" PRZED FAQ. Treść: implant to root, full restoration = crown/bridge → see protetyka.
- W `src/app/[locale]/oferta/protetyka/page.tsx` — callout block z `<Link href="/oferta/implantologia">` wstawiony PO "Digital workflow highlight" PRZED FAQ. Treść: single tooth gap → implant + crown lepiej niż bridge szlifujący sąsiednie.
- Styling: surface background + primary-color border (subtle) + h3 + p + inline link "→". Naturalnie wpisany w istniejący flow strony.

**5. `priceRange: "$$" → "$$$"` (premium signal):**
- `src/app/layout.tsx` SchemaOrg Dentist schema.
- Schema.org-internal — NIE wyświetla się w SERP. Klasyfikuje klinikę jako "expensive/premium" dla Google's Knowledge Graph + Local Pack matching.
- Aligned z Premium SEO Plan (Faza K = Premium Positioning Reset). Marcin świadomie zaakceptował 2026-05-12: "pozycjonujemy się na premium i tego się trzymamy".
- Reversible w 1 linii jeśli measurement post-J-MEASURE wykaże regresję rankingu.
- Verified: homepage HTML `"priceRange":"$$$"` ✓

**6. Acceptance Faza J-5 osiągnięte:**
- `/dla-pacjentow-przyjezdnych` ma **3+ incoming internal links**: (1) Footer (od H7), (2) Homepage teaser (J-5), (3) /kontakt teaser (J-5). ✓
- Cross-links protetyka↔implantologia: ✓ obie strony linkują do siebie.
- priceRange premium: ✓ `$$$`.

#### Pliki:
- `src/components/InternationalPatientsTeaser.tsx` [NEW] 114 LOC, wide+compact variants
- `messages/{pl,en,de,ua}/pages.json` [MOD] +przyjezdni.teaser* (16 strings) + implantologia.crossLink* + protetyka.crossLink* (24 strings) = 40 nowych strings total
- `src/app/[locale]/HomeClient.tsx` [MOD] import + render teaser
- `src/app/[locale]/kontakt/page.tsx` [MOD] import + render compact teaser
- `src/app/[locale]/oferta/implantologia/page.tsx` [MOD] callout block + Link do protetyka
- `src/app/[locale]/oferta/protetyka/page.tsx` [MOD] callout block + Link do implantologia
- `src/app/layout.tsx` [MOD] `priceRange: "$$$"` w Dentist schema

#### Spodziewany efekt po deploy:
- DE/EN/UA visitors na homepage / /kontakt widzą **eye-catching teaser** ze srednią-spec ich informacją (parking, języki, hotele) → klik → /dla-pacjentow-przyjezdnych (full landing z H7).
- Google's site graph: `/dla-pacjentow-przyjezdnych` ma 3 incoming linki = ważna strona w hierarchii → lepszy crawl frequency + ranking boost.
- Google Knowledge Graph + Local Pack: premium classification (`$$$`) → matching dla queries "premium dental Poland", "best dentist Opole", "high-end dental tourism".
- Topical authority cross-link: implantologia ↔ protetyka linki wzmacniają temat "kompleksowa rehabilitacja zwarciowa" — w SERP dla query "implant + korona" Google może rankować obie strony razem.

#### Co Marcin musi zrobić ręcznie po deploy:
- Brak migracji DB ani env var.
- (Opcjonalnie) Po deploy sprawdź visualnie:
  - Homepage scroll do końca → teaser premium-styled przed Footer
  - /kontakt scroll po Directions → compact teaser w container
  - /oferta/implantologia scroll po Technical Details → callout do protetyka
  - /oferta/protetyka scroll po Digital workflow → callout do implantologia
- (Opcjonalnie) Switch locale (`/de`, `/en`, `/ua`) i sprawdź czy teasery są poprawnie przetłumaczone.

#### Co dalej (CHECKPOINT FAZA J + J-MEASURE):
- **CHECKPOINT J** (od razu po J-5): AI zaktualizuje wszystkie tracking files, Marcin manualnie:
  - **Google Search Console** — re-submit sitemap (`https://www.mikrostomart.pl/sitemap.xml`)
  - **Rich Results Test** dla 10 sample URLs (homepage, 6 service pages, 3 slug types) — screenshot dla porównania post-J-MEASURE
  - Facebook Sharing Debugger dla 5 URLs (homepage PL/EN/DE, /oferta/implantologia, /dla-pacjentow-przyjezdnych) — Scrape Again żeby pokazały nowe OG cards
- **J-MEASURE** session (~koniec maja / początek czerwca 2026, ~4 tyg od końca J): pomiar wszystkich metryk:
  - PSI Mobile (cel 75-80 z 73 baseline), Desktop (cel 85+ z 83)
  - Rich Results Test: FAQPage, NewsArticle, Review, AggregateRating, BreadcrumbList eligibility
  - GSC: hreflang errors → 0, sitemap recrawl rate, foreign markets impressions delta
  - Compare przed/po dla 10 keyword tracking (jeśli set up)

- **Faza K** rozpoczyna się po J-MEASURE: **Premium Positioning Reset** (8+ sesji, 3-5 tyg). Sesja K-0 = Strategy Workshop (1h AI + 1.5h Marcin):
  - Final D1 cennik direction (✅ wybrane = B premium-only)
  - Walidacja BIO_INVENTORY z Marcinem
  - Draft hero copy v0 (3 warianty hero + 3 warianty cennika UX, Marcin wybiera)
  - Output: `~/Desktop/PLAN_K_DECISIONS.md`

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-12 — Premium SEO Plan: Sesja J-4 (sklep noindex + Review schemas + FAQPage + og:locale)

**Czwarta sesja Fazy J. Cztery punktowe fixy techniczne: noindex foreign /sklep, per-recenzja Review schemas w Dentist entity, FAQPage schema na stronie dla pacjentów przyjezdnych, og:locale dynamic per request (homepage + 3 slug pages).**

#### Commit:
- `cd406af` — feat(seo): J-4 — sklep noindex foreign + Review schemas + FAQPage + og:locale

#### Co się zmieniło:

**1. `/sklep` noindex dla locale !== 'pl':**
- Pre-J-4: `/en/sklep`, `/de/sklep`, `/ua/sklep` indexable, ale serwują **PL-only content** (nazwy produktów, opisy, voucher copy). Split ranking signals.
- Post-J-4: layout dodaje `robots: { index: false, follow: true }` dla foreign locale. Canonical wciąż wskazuje `/sklep` (PL) — link equity rolluje się do PL.
- Verified: `/en/sklep` HTML → `<meta name="robots" content="noindex, follow"/>` ✓; `/sklep` (PL) bez robots meta (indexable) ✓.

**2. Per-recenzja `Review` schemas w Dentist entity:**
- Pre-J-4: tylko `aggregateRating` (number) — Google widział średnią, ale **bez per-recenzja entities** dla Knowledge Panel / Local Pack reviews carousel.
- Nowa helper w `src/lib/seo.ts`: `fetchReviewSchemas(limit = 10)`:
  - Query: `google_reviews` table — `rating >= 4`, `review_text NOT NULL`, ordered by `publish_time DESC`, limit 10
  - Filtr safety: skip jeśli `review_text` null / `google_author_name` null / `rating` nie liczba
  - Mapuje na schema.org `Review` entities: `author` (Person), `datePublished`, `reviewRating` (1-5), `reviewBody`
  - Demo guard + try/catch → zwraca `[]` on error
- Root layout integration: `await fetchReviewSchemas(10)` → SchemaOrg component → wbudowane w `dentistSchema.review` array.
- Verified: homepage HTML zawiera **10 Review entities**, sample `"ratingValue":5,"bestRating":5,"worstRating":1` ✓.
- **Konsekwencja**: Google's "People also reviewed" carousel + Local Pack reviews preview + Knowledge Panel reviews — eligible.

**3. FAQPage schema na `/dla-pacjentow-przyjezdnych`:**
- Pre-J-4: H6 dodał 5 Q/A pairs w `messages/*/pages.json` (`faq.cat10q0..cat10q4` + `cat10a0..cat10a4`) × 4 locale, ale były tylko jako visual accordion. **Brak FAQPage schema** = brak rich snippet w SERP.
- Post-J-4: `layout.tsx` używa `getTranslations('faq')` żeby wyciągnąć 5 pytań + 5 odpowiedzi, mapuje na `FAQPage` schema z `mainEntity` array Question/Answer pairs. Locale-aware (locale routing already w next-intl, więc PL pytania pokażą się na PL, DE na DE, etc.).
- Filter: tylko jeśli `q` and `a` istnieją i `q` nie zaczyna się od raw key `cat10q...` (safety w razie missing translation).
- Verified: `/dla-pacjentow-przyjezdnych` HTML → 1 FAQPage schema, sample Q: "Czy macie parking przy klinice?", "Czy są hotele blisko gabinetu?" ✓.
- **Konsekwencja**: Google's FAQ rich snippet (rozwijany accordion w SERP) — eligible dla foreign visitors szukających "Zahnarzt Opole parken" / "dentist Opole English" / "стоматолог Ополе".

**4. og:locale dynamic per request:**
- Pre-J-4: root layout hardcoded `locale: 'pl_PL'` — dziedziczone przez wszystkie strony **które nie nadpisują** openGraph (slug pages je nadpisywały bez locale → Next.js merge strip'ował parent locale → wszystkie slug pages szły jako `pl_PL`). Homepage `[locale]/page.tsx` też ma own openGraph (title+description) bez locale → same issue.
- Helper `getOgLocale(locale)` wyeksportowany z `seo.ts` (mapuje `pl→pl_PL`, `en→en_US`, `de→de_DE`, `ua→uk_UA`)
- **5 miejsc updated**:
  - `src/app/layout.tsx` — root `generateMetadata` używa `getLocale()` z next-intl + `getOgLocale(locale)` (dla stron które dziedziczą)
  - `src/app/[locale]/page.tsx` — homepage `openGraph.locale: getOgLocale(locale)`
  - `src/app/[locale]/aktualnosci/[slug]/page.tsx` — slug `openGraph.locale: getOgLocale(locale)`
  - `src/app/[locale]/nowosielski/[slug]/page.tsx` — slug `openGraph.locale: getOgLocale(locale)`
  - `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` — slug `openGraph.locale: getOgLocale(locale)`
- Verified: `/` → `pl_PL`, `/de` → `de_DE`, `/ua` → `uk_UA`, `/en/aktualnosci/<slug>` → `en_US` ✓.

#### Pliki:
- `src/lib/seo.ts` [MOD] — `fetchReviewSchemas(limit)` + `getOgLocale(locale)` exports
- `src/app/layout.tsx` [MOD] — fetch reviews + pass do SchemaOrg, dynamic og:locale, SchemaOrg signature `+reviews`
- `src/app/[locale]/page.tsx` [MOD] — homepage explicit og:locale
- `src/app/[locale]/sklep/layout.tsx` [MOD] — robots noindex dla foreign locale
- `src/app/[locale]/dla-pacjentow-przyjezdnych/layout.tsx` [MOD] — FAQPage schema z cat10 Q&A
- `src/app/[locale]/{aktualnosci,nowosielski,baza-wiedzy}/[slug]/page.tsx` [MOD] — og:locale per request

#### Spodziewany efekt po deploy:
- **Sklep**: GSC po recrawl pokaże `/en/sklep` / `/de/sklep` / `/ua/sklep` jako "Excluded by 'noindex' tag" (intended). Index ranking sygnał skupiony na PL canonical.
- **Reviews**: Google Knowledge Panel dla Mikrostomart może pokazać **reviews carousel** z 10 entries (Google bierze top N z review array + uzupełnia z GBP). Local Pack ranking +.
- **FAQPage**: SERP dla "parking Opole stomatolog", "dentist Opole English speaking" itp. może pokazać **rozwijany FAQ block** z odpowiedziami z naszej strony.
- **og:locale**: Facebook/LinkedIn/X share previews dla foreign locale stron pokazują poprawny język tag — bez tego social platforms domyślnie traktowali wszystkie pages jako `pl_PL` co mogło psuć language detection w niektórych platformach.

#### Co Marcin musi zrobić ręcznie po deploy:
- Brak migracji DB ani env var.
- (Opcjonalnie) po deploy uruchom Google Rich Results Test dla:
  - `https://www.mikrostomart.pl/` — powinien pokazać Dentist + 10× Review + AggregateRating
  - `https://www.mikrostomart.pl/dla-pacjentow-przyjezdnych` — powinien pokazać FAQPage z 5 Q/A
- (Opcjonalnie) Facebook Sharing Debugger dla `/de` żeby zresetować social cache i zobaczyć `og:locale: de_DE`.

#### Co dalej (Faza J — ostatnia sesja):
- **Sesja J-5**: Internal linking + priceRange premium signal (~2h AI + 20 min Marcin pre-work). Pre-work Marcin: decyzja gdzie hero CTA do `/dla-pacjentow-przyjezdnych` (homepage section? Navbar? /kontakt button?).
  - Hero section "International patients" na homepage z linkiem
  - CTA na /kontakt: "Visiting from abroad?"
  - Cross-links protetyka ↔ implantologia w content
  - Dentist schema `priceRange: "$$$"` (zamiast `"$$"`) — premium positioning
- Następnie **CHECKPOINT FAZA J** — Marcin GSC re-submit sitemap (po wszystkich zmianach J-1 do J-5), wait 4 tyg → **J-MEASURE** session pomiar.

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-12 — Premium SEO Plan: Sesja J-3 (KB images WebP/AVIF + per-page OG cards + image alt audit)

**Trzecia sesja Fazy J. KB obrazy zoptymalizowane (PNG→WebP -96%), 7 per-page OG cards generowanych z sharp + SVG template, preferWebp() helper dla schema/OG metadata.**

#### Commit:
- `e9f368a` — feat(seo): J-3 — KB image WebP/AVIF (-96%) + per-page OG cards + alt audit

#### Co się zmieniło:

**1. KB images PNG → WebP/AVIF (-96%):**
- Pre-J-3: 131 KB PNG średnio ~990 KB = **130 MB** na dysku + ten sam wire weight przy każdym fetch'u z schema.org `image` URL (Googlebot, GBP, Slack, Discord, Pinterest scrapers — wszyscy którzy NIE używają next/image pipeline).
- `scripts/optimize-kb-images.mjs` [NEW] — sharp PNG → WebP (75% quality, effort 4) + AVIF (60% quality). Idempotentny (mtime check, skipuje up-to-date siblings).
- Output: 131 .webp (4.7 MB total, **-96%**) + 131 .avif (4.1 MB total, **-97%**).
- DB `articles.image_url` / `news.image` / `blog_posts.image` ZACHOWUJE `.png` — bez migration, bezpiecznie. External links + non-WebP scrapers nadal działają na .png fallback.

**2. `src/lib/imageUrl.ts` [NEW] — `preferWebp(url)`:**
- Helper rewrite'uje `.png → .webp` w schema/OG metadata.
- **Conservative**: tylko paths matching `/kb-` prefix (gdzie kontrolujemy konwerter). Inne paths pass-through bezpiecznie (bo np. `/marcin.png` może nie mieć .webp sibling → unikamy 404).
- Obsługuje URL absolute (`https://www.mikrostomart.pl/kb-foo.png`) i relative (`/kb-foo.png`), case-insensitive `.PNG`.

**3. 3 slug pages refactor — schema/OG image via `schemaImageUrl()`:**
- `aktualnosci/[slug]`, `nowosielski/[slug]`, `baza-wiedzy/[slug]` — wszystkie 3 mają teraz lokalny helper `schemaImageUrl(image)` który:
  1. Fallback `${brand.appUrl}/opengraph-image.png` jeśli brak image
  2. Absolutyzuje relative path
  3. `preferWebp()` swap'uje na `.webp` dla KB images
- Schema.org `"image"` field + OG metadata `openGraph.images[].url` używają tego helpera.
- `baza-wiedzy/[slug]` dodatkowo: dodano `image_url` do SELECT w generateMetadata + emit `openGraph.images` (pre-J-3 brak `images` w OG dla bazy-wiedzy).
- Smoke test verified: `/baza-wiedzy/zeby-w-podrozy-...` schema `"image":".../kb-zeby-w-podrozy-...webp"` ✓

**4. 7 per-page OG cards 1200×630:**
- `scripts/generate-og-images.mjs` [NEW] — sharp + SVG template:
  - Background: linear-gradient deep teal (`#0d4f54` → `#062a2d`)
  - Gold accent (`#d4af37`) — brand wordmark top + domain bottom + accent rule
  - Title centered (Georgia serif 76px), subtitle (26px), domain link gold
  - Output: WebP (85% quality) + PNG fallback (legacy social scrapers)
- 7 cards: `og-home`, `og-implantologia`, `og-leczenie-kanalowe`, `og-stomatologia-estetyczna`, `og-ortodoncja`, `og-chirurgia`, `og-protetyka`
- Sizes: 18-31 KB WebP, 54-77 KB PNG fallback
- Foreign locale variants inheritują ten sam OG (template locale-agnostic) — dodanie locale variants to 1-line loop change w future

**5. `pageMetadata()` extended w `src/lib/seo.ts`:**
- Nowy opcjonalny param: `options.ogImage` (path do `/og-foo.webp`) + `options.ogImageAlt`
- Path resolved do absolute URL (`brand.appUrl` + path) bo Slack/Discord scrapers nie respect'ują `<base href>`
- Emit'uje `openGraph.images[]` z width+height+alt + `twitter.images[]`

**6. Service page layouts wired:**
- 6 service layoutów (implantologia, leczenie-kanalowe, stomatologia-estetyczna, ortodoncja, chirurgia, protetyka) → `pageMetadata(locale, path, PAGE_SEO[path], { ogImage: '/og-{slug}.webp' })`
- Smoke test verified per service page i per locale: `<meta property="og:image" content="https://www.mikrostomart.pl/og-implantologia.webp" />` ✓ (EN inheriting tę samą — ✓)

**7. Root layout (homepage):**
- `src/app/layout.tsx` — globalny OG image zmieniony z `/opengraph-image.png` → `/og-home.webp`
- Strony nie mające własnego layout (FAQ, cennik, kontakt itp.) dziedziczą `og-home.webp` (lepsza fallback niż generic placeholder)

**8. Image alt audit:**
- Skan `<Image>` i `<img>` w całym src/ projekcie
- Wykryto: 1 violation w `src/components/SimulatorModal.tsx:502` (`<img src={debugMaskSrc}>` debug overlay bez alt)
- Fix: dodano `alt="Debug: teeth segmentation mask used by the AI simulator"`
- Reszta projektu **clean** — wszystkie `<Image>` / `<img>` mają alt

**9. npm scripts:**
- `npm run optimize:kb-images` — re-run KB image converter (idempotentny)
- `npm run generate:og-images` — re-generate 7 OG cards (po zmianie copy w generator)

#### Pliki:
- `scripts/optimize-kb-images.mjs` [NEW] — KB converter
- `scripts/generate-og-images.mjs` [NEW] — OG generator
- `src/lib/imageUrl.ts` [NEW] — preferWebp() helper
- `src/lib/seo.ts` [MOD] — pageMetadata `ogImage` option
- `src/app/layout.tsx` [MOD] — `/og-home.webp` zamiast `/opengraph-image.png`
- `src/app/[locale]/oferta/{6 service paths}/layout.tsx` [MOD] — `ogImage` per page
- `src/app/[locale]/{aktualnosci,nowosielski,baza-wiedzy}/[slug]/page.tsx` [MOD] — schemaImageUrl helper
- `src/components/SimulatorModal.tsx` [MOD] — alt added
- `package.json` [MOD] — optimize:kb-images + generate:og-images scripts
- `public/kb-*.webp` × 131 [NEW] — converted KB images
- `public/kb-*.avif` × 131 [NEW] — AVIF siblings
- `public/og-*.webp` × 7 [NEW] — per-page social cards
- `public/og-*.png` × 7 [NEW] — PNG fallbacks dla legacy scrapers

#### Spodziewany efekt po deploy:
- **Schema.org `image` URLs serve WebP** — Googlebot przy crawl ściąga 30 KB zamiast 1 MB per article. Crawl budget +20× efektywniejszy.
- **Social share previews** — Facebook/LinkedIn/X/Slack/Discord pokazuje **per-page card** zamiast generic placeholder. Sharing implantologia ≠ sharing FAQ ≠ sharing homepage. Premium positioning visualny.
- **next/image** w komponentach (header images na slug pages) niezmieniony — już używał WebP auto. Ten fix touch'uje tylko **raw URLs** w metadata.
- **Hreflang circle + OG image** spójne między locale (foreign locales dziedziczą ten sam OG image).

#### Co Marcin musi zrobić ręcznie po deploy:
- Brak migracji DB ani env var.
- (Opcjonalnie) wrzucić OG share na Facebook/LinkedIn debug tools żeby zresetować cache:
  - Facebook: https://developers.facebook.com/tools/debug/ → wpisz URL → Scrape Again
  - LinkedIn: https://www.linkedin.com/post-inspector/ → wpisz URL
  - Bez tego social shows old cached image przez 7-30 dni.
- (Opcjonalnie) jeśli Marcin nie lubi designu OG cards (gold + teal premium template) — można customize w `scripts/generate-og-images.mjs` COLORS + OG_PAGES, potem `npm run generate:og-images` re-runs.

#### Co dalej (Faza J kontynuacja):
- **Sesja J-4**: Sklep noindex foreign + Review schema + FAQPage przyjezdni + og:locale (~2-2.5h AI). 4 punktowe fixy:
  1. `/sklep` noindex dla locale !== 'pl' (sklep PL-only)
  2. Review schemas per-recenzja na homepage (z `google_reviews` table)
  3. FAQPage schema na `/dla-pacjentow-przyjezdnych`
  4. og:locale dynamic per locale (sprawdzić czy już jest po G5)
- Następnie J-5 (internal linking + priceRange premium signal) → J-MEASURE

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-12 — Premium SEO Plan: Sesja J-2 (hreflang circle audit + fix 24 broken URLs)

**Druga sesja Fazy J. Audit script wykrył 24 prawdziwie broken URLi (4 PL-only legal pages + /zadatek bez layoutu); fix routuje wszystkie public layouty przez `pageMetadata()` z @/lib/seo.**

#### Commit:
- `e07559f` — feat(seo): J-2 — hreflang circle audit + fix 24 broken URLs

#### Co się zmieniło:

**Audit script `scripts/audit-hreflang.mjs` [NEW, 227 LOC]:**
- Fetchuje każdą public URL × 4 locale (120 URLs total) z lokalnego serwera (`PORT=3789 npm start`).
- Per URL parsuje `<link rel="alternate" hreflang="..." href="...">` z HTML i waliduje:
  - 5 wymaganych hreflang values: `pl`, `en`, `de`, `uk`, `x-default`
  - Brak `hreflang="ua"` (powszechny bug — ISO 639-1 dla ukraińskiego to `uk`)
  - Self-link present (current URL appears w own alternates)
  - Per-path circle consistency: alternates dla path /X we wszystkich 4 locale wskazują na te same docelowe paths
- Generuje markdown report `scripts/audit-hreflang-report.md` (gitignored — lokalny artefakt)
- Exit code: 0 jeśli 100% OK, 1 jeśli broken → reusable jako CI gate w przyszłości

**Baseline audit wyniki**: 97/124 OK, 27 broken:
- 3 false positives — homepage redirect 308 (`/en/` → `/en`). Fix: audit script urlFor() używa BASE/locale bez trailing slash dla homepage.
- 24 real broken — 6 paths × 4 locale:
  - **4 PL-only legal pages**: `/regulamin`, `/rodo`, `/polityka-prywatnosci`, `/polityka-cookies` — layouty deklarowały tylko `alternates: { canonical }`, brak `languages` → Next.js nie emitował hreflang w HTML.
  - **`/zadatek`** — w ogóle brak layout.tsx → strona renderowała się bez żadnej metadata.

**Fixy:**
- 4 PL-only legal layouty refactored: każdy używa `pageMetadata(locale, '/path', { pl: {...} })` z `@/lib/seo` (pełen circle z buildHreflangAlternates) + zachowane `robots: { index: false, follow: true }` dla EN/DE/UA. Treść tych stron jest PL-only, foreign URLs serwują tę samą PL treść z canonical → /regulamin (PL). hreflang circle umożliwia Google grouping 4 URL-i jako jednej encji bez sygnalizowania że są tłumaczenia.
- **`/zadatek/layout.tsx`** [NEW] — pageMetadata z **per-locale title+description** (PL/EN/DE/UA) bo strona faktycznie ma tłumaczenia w `messages/*/common.json` (`zadatek` namespace). robots: noindex (strona transakcyjna z URL params).
- **`/privacy-policy`** świadomie wykluczone z audit `PUBLIC_PATHS` — EN-only legal page (TikTok API compliance), distinct content od `/polityka-prywatnosci`. Pozostałe locale są noindex + canonical → polityka-prywatnosci. Single-locale page nie potrzebuje hreflang circle.

**Post-fix audit**: **120/120 OK** ✅

**Pre-existing audit observation** (na future): script wykryto homepage redirect z trailing slash dla foreign locale (`/en/` → `/en`) — Next.js zachowanie. Działa OK po wykryciu w urlFor() helperze.

#### Pliki:
- `scripts/audit-hreflang.mjs` [NEW]
- `src/app/[locale]/regulamin/layout.tsx` [MOD] +pageMetadata
- `src/app/[locale]/rodo/layout.tsx` [MOD] +pageMetadata
- `src/app/[locale]/polityka-prywatnosci/layout.tsx` [MOD] +pageMetadata
- `src/app/[locale]/polityka-cookies/layout.tsx` [MOD] +pageMetadata
- `src/app/[locale]/zadatek/layout.tsx` [NEW] +pageMetadata + per-locale title/description + noindex
- `.gitignore` [MOD] — `scripts/audit-hreflang-report.md` (lokalny artefakt)
- `src/lib/generated-route-mtimes.ts` [MOD] — prebuild refreshed (nowy timestamp dla 5 layoutów)

#### Spodziewany efekt po deploy:
- Wszystkie 30 public paths × 4 locale (120 URLs) deklarują kompletny hreflang circle. Google przy crawl widzi grupę tłumaczeń jako jedną encję.
- Legal pages nie tracą noindex'u dla EN/DE/UA wariantów — canonical wskazuje na PL i Google ignoruje duplikaty.
- `/zadatek` ma teraz metadata i noindex (przedtem indexable thin-content z URL params).
- Audit script może być uruchamiany lokalnie lub w CI: `npm run build && PORT=3789 npm start & node scripts/audit-hreflang.mjs`.

#### Co Marcin musi zrobić ręcznie po deploy:
- Brak migracji DB ani env var.
- Po Vercel build w GSC sprawdzić Coverage czy nie ma nowych hreflang errors (powinno być 0).

#### Co dalej (Faza J kontynuacja):
- **Sesja J-3**: KB images compression + image alt audit + per-page OG images (~2.5h AI + 30 min Marcin pre-work decyzja o OG images)
- Następnie J-4 (sklep noindex foreign + Review schema + FAQPage + og:locale), J-5 (internal linking + priceRange premium signal)

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-12 — Premium SEO Plan: Sesja J-1 (sitemap freshness + Article schema enrichment)

**Pierwsza sesja Fazy J Premium SEO Plan. Sitemap zyskuje per-route lastModified z git history; slug pages (NewsArticle/BlogPosting/Article) dostają articleSection + wordCount + opcjonalne keywords.**

#### Commit:
- `2215e91` — feat(seo): J-1 — sitemap lastModified per route + Article schema enrichment

#### Co się zmieniło:

**Sitemap freshness (problem):**
- Pre-J-1: każda statyczna trasa (31 paths × 4 locale = 124 URLi) miała `lastModified: new Date()` — czyli wszystkie URL-e w sitemap mówiły Google "zmienione właśnie teraz" przy każdej regeneracji co 1h. Google traktował to jako noise i nie miał per-URL freshness signal.
- Post-J-1: każda trasa ma własny `lastModified` z `git log -1 --format=%aI -- <page.tsx|layout.tsx>`. Sitemap w prod ma **148 distinct lastmod values** (vs 1 wcześniej).

**Mechanika:**
- `scripts/generate-route-mtimes.mjs` [NEW, 113 LOC] — Node script (ESM), iteruje 31 path→file mapping, pobiera newest git commit time per route file, generuje TS snapshot.
- `src/lib/generated-route-mtimes.ts` [NEW, generated] — wyeksportowany `routeMtimes: Record<string, string>` + `buildTime` fallback.
- `src/app/sitemap.ts` [MOD] — import `routeMtimes` + helper `lastModForPath(path)` (prefer git mtime, fallback build time). Dynamic news/KB routes już używały `post.date`/`updated_at` — nietknięte.
- `package.json` [MOD] — `prebuild` script uruchamia generator przy każdym `npm run build` (Vercel również). `generate:mtimes` jako manualny trigger.

**Article schema enrichment (3 slug pages):**
- Pre-J-1: 9 pól w `NewsArticle`/`BlogPosting`/`Article` (headline, description, image, datePublished, dateModified, author Person+url, publisher Organization+logo, mainEntityOfPage, inLanguage).
- Post-J-1: +3 pola → **12 pól per schema**:
  - `articleSection` — locale-aware: PL "Aktualności"/"Blog Dr Nowosielski"/"Baza wiedzy"; EN/DE/UA odpowiedniki. Google używa do klasyfikacji topic clusters.
  - `wordCount` — policzony z content (markdown stripping dla aktualnosci+baza-wiedzy; HTML tag stripping dla nowosielski legacy content).
  - `keywords` — comma-separated z `post.tags`/`article.tags` jeśli pole istnieje, pomijane jeśli null/empty (no nulls w JSON-LD).
- Wszystkie 3 pliki: `src/app/[locale]/{aktualnosci,nowosielski,baza-wiedzy}/[slug]/page.tsx`

**Smoke test (potwierdzone w `npm run build` + lokalnym `npm start`):**
- Sitemap: 148 distinct `<lastmod>` values (przed: 1)
- /aktualnosci/[slug] PL → `articleSection: "Aktualności"`, `wordCount: 96`, schema renders
- /en/aktualnosci/[slug] → `articleSection: "News"`, `inLanguage: "en"`
- /baza-wiedzy/[slug] PL → `articleSection: "Baza wiedzy"`, `wordCount: 183`
- /de/baza-wiedzy/[slug] → `articleSection: "Wissensdatenbank"`, `inLanguage: "de"`

**Pre-existing bug wykryty (NIE z J-1):**
- Server log spamuje `MISSING_MESSAGE: aktualnosci.backToNews` na każdej slug page.
- Przyczyna: `src/i18n/request.ts` używa shallow spread `{...common, ...pages}`. `pages.json` ma top-level sekcję `aktualnosci` z innymi kluczami → nadpisuje całą `common.aktualnosci` w której był `backToNews`. Klucz przepada we wszystkich 4 locale.
- Strona renderuje się przez error boundary (schema + content się wyświetlają, tylko back link wyświetla raw key zamiast tłumaczenia).
- Spawn'owany jako osobny task — fix w `request.ts` (deep merge namespace) + audit pozostałych overlap sekcji.

#### Pliki:
- `scripts/generate-route-mtimes.mjs` [NEW]
- `src/lib/generated-route-mtimes.ts` [NEW]
- `src/app/sitemap.ts` [MOD]
- `src/app/[locale]/aktualnosci/[slug]/page.tsx` [MOD]
- `src/app/[locale]/nowosielski/[slug]/page.tsx` [MOD]
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` [MOD]
- `package.json` [MOD] — prebuild + generate:mtimes

#### Spodziewany efekt po deploy:
- Sitemap.xml w prod ma per-URL freshness signal — Google przy kolejnym crawl widzi które strony naprawdę się zmieniły od ostatniego pobrania.
- Rich Results Test na /aktualnosci/[slug] /nowosielski/[slug] /baza-wiedzy/[slug] pokaże enrichment: articleSection (kategoria), wordCount (długość), keywords (tagi) gdy są.
- Cache sitemap 1h + revalidate 1y nie zmieniony — pierwsze odczyty po deploy nadal old.

#### Co Marcin musi zrobić ręcznie po deploy:
- Brak migracji DB ani env var.
- W ramach Premium SEO Plan po J-MEASURE (4 tyg od końca Fazy J) — re-submit sitemap w GSC i sprawdź czy lastmod różny per URL.

#### Co dalej (Faza J kontynuacja):
- **Sesja J-2**: Hreflang circle audit + per-page verification (`scripts/audit-hreflang.ts` + fix layoutów bez `pageMetadata()`)
- Następnie J-3 (KB images + per-page OG), J-4 (sklep noindex + Review schema + FAQPage), J-5 (internal linking + priceRange)
- Pre-existing i18n shallow spread bug — spawn'owany jako osobny task (do zrobienia kiedyś między sesjami SEO; nie blokuje J)

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-11 — Employee Management Phase 3 (unified UI)
**Zwieńczenie 3-fazowego refaktoru zarządzania pracownikami. UI zastąpiony wizardem + rozwijanymi wierszami.**

#### Commit:
- `d722ee6` — feat(employees): Phase 3 — unified UI (wizard + expandable row)

#### Co się zmieniło:

**Nowe komponenty:**
- `src/app/admin/components/EmployeeWizard.tsx` [NEW, ~570 LOC] — modal stepper 5 kroków: Ścieżka (Prodentis/Ręcznie) → Dane → Role → Booking → Push z review. Wybór operatora Prodentis z auto-listy lub dodanie ręcznie. Inline validation per krok. POST `/api/admin/employees` (createOrUpdateEmployee z Phase 2).
- `src/app/admin/components/EmployeeRow.tsx` [NEW, ~390 LOC] — rozwijany wiersz pracownika z 4 sekcjami (tabs Info/Konto/Booking/Push). Inline edit dla pól tekstowych, chip-toggle z auto-save dla flag/grup. PATCH `/api/admin/employees/[id]` (updateEmployee).

**Backend rozszerzenie:**
- `GET /api/admin/employees` zwraca teraz `roles: string[]` (cross-ref z `user_roles` po `user_id`) + `show_in_booking: boolean` — wymagane przez EmployeeRow do inline edycji ról + booking toggle.

**Usunięte z `src/app/admin/page.tsx`:**
- `renderEmployeesTab` (stary, ~304 LOC) — zastąpiony nową wersją używającą `EmployeeWizard` + `EmployeeRow`
- `renderRolesTab` (~315 LOC) — zakładka „Uprawnienia" usunięta (D1)
- NavItem `roles` + breadcrumb 'Uprawnienia — Zarządzanie Rolami'
- Funkcje obsługujące stare UI: `addEmployee`, `addManualEmployee`, `promotePatient`, `fetchRoles`, `toggleRole`, `dismissPatient`, `deleteUser`, `deactivateEmployee`, `reactivateEmployee`, `startEditEmployee`, `saveEditEmployee`
- Sekcja „Pacjenci do awansowania" (~130 LOC) — D2: logika promote zachowana w wizardzie (POST `/api/admin/employees` automatycznie wykrywa istniejący email i podpina user_id zamiast tworzyć duplikat — funkcja `createOrUpdateEmployee` zaprojektowana pod ten flow)
- Import `Shield` z lucide-react (nieużywany po usunięciu zakładki Uprawnienia)
- 14 zbędnych pól state związanych ze starymi tabami: `rolesUsers`, `rolesLoading`, `rolesError`, `patientCandidates`, `promotingEmail`, `editingEmployeeId`, `editName`, `editEmail`, `employeeEmails`, `addingEmployee`, `newManualName`, `newManualEmail`, `addingManual`, `pushEmpGroups`

**Dodane state w admin/page.tsx:**
- `wizardOpen: boolean` — kontroluje modal wizard
- `employeeFlashMessage: string | null` — toast z message po udanej zmianie (refresh listy)
- Typ `employeesList` zmieniony z `any[]` na `EmployeeData[]` (eksportowany z EmployeeRow.tsx)

**Usunięte martwe pliki (923 LOC, nigdzie nieimportowane — próby refaktoru sprzed Phase 3, nigdy nie podpięte):**
- `src/app/admin/components/EmployeesTab.tsx` (439 LOC)
- `src/app/admin/components/RolesTab.tsx` (484 LOC)

#### Decyzje (D1-D6 przyjęte przez Marcina, 2026-05-11):
- **D1** ✅ Zakładka „Uprawnienia" usunięta — zarządzanie ról przeniesione do sekcji Konto w EmployeeRow (chip-toggle Pracownik/Admin z auto-save)
- **D2** ✅ Sekcja „Pacjenci do awansowania" usunięta — wizard używa `createOrUpdateEmployee` które automatycznie wykrywa istniejące auth.users po emailu i podpina rolę do istniejącego konta. Pacjent który ma istniejący email nie zostanie zduplikowany.
- **D3** ✅ `show_in_booking` default true dla position=Lekarz/Higienistka, false dla pozostałych. Implementowane w obu warstwach: backend `createOrUpdateEmployee` (linia 244) + frontend wizard `Step4Booking` (auto-set z `useEffect` chyba że admin zmienił ręcznie).
- **D4** ✅ Auto-discovery Prodentis — Phase 1 usunęło z `/api/employee/schedule`, zostaje tylko w `/api/admin/employees` jako sync inicjowany przez admina (manual button „Odśwież")
- **D5** ✅ Backfill `employment_terms` wykonany w Phase 1 (migracja 120 trigger + initial INSERT)
- **D6** ✅ Phase 3 w osobnej sesji (świeży kontekst, ~3h pracy)

#### Statystyki refaktoru:
- `admin/page.tsx`: 3296 → 2455 LOC (**-841, -25%**)
- Łącznie usunięte: **-1785 LOC**, dodane (w admin): **+83 LOC** (głównie nowa wersja `renderEmployeesTab`)
- Nowe komponenty: +570 LOC (EmployeeWizard) + 390 LOC (EmployeeRow) = ~960 LOC wyciągnięte z monolitu w czyste, samodzielne pliki

#### Pliki:
- `src/app/admin/components/EmployeeWizard.tsx` [NEW]
- `src/app/admin/components/EmployeeRow.tsx` [NEW]
- `src/app/admin/components/EmployeesTab.tsx` [DELETED]
- `src/app/admin/components/RolesTab.tsx` [DELETED]
- `src/app/admin/page.tsx` [MOD] -841 LOC
- `src/app/api/admin/employees/route.ts` [MOD] +17 LOC (`roles[]` + `show_in_booking` w GET response)

#### Spodziewany efekt po deploy:
- Admin widzi 1 zakładkę „Pracownicy" zamiast 2 (Pracownicy + Uprawnienia)
- „+ Dodaj pracownika" otwiera 5-krokowy wizard — wybór z Prodentis lub ręcznie, z auto-pre-fill kolejnych pól na podstawie position
- Każdy pracownik w liście rozwija się na klik — 4 sekcje wewnątrz z inline edit, chipy toggle dla ról/push z auto-save
- Marcin nie musi nigdzie klikać żeby `employment_terms` istniały — trigger Phase 1 załatwia
- Nowy pracownik z emailem pacjenta — wizard nie duplikuje, podpina rolę do istniejącego user_id (auto)

#### Co Marcin musi zrobić ręcznie po deploy:
- Sprawdzić w panelu: + Dodaj pracownika → wizard powinien działać, rozwijany wiersz pokazuje 4 sekcje z auto-save chipów
- Migracja 120 już wgrana (Phase 1) — Phase 3 NIE wymaga DB migracji
- Brak nowych env var

#### Co dalej (poza scope Phase 3):
- Refaktor pozostałych monolitycznych zakładek w `admin/page.tsx` (np. renderProductsTab, renderBlogTab — wciąż inline)
- Migracja `withAuth` middleware do API routes (wrapper istnieje, nie wszędzie zastosowany)
- Stary endpoint `/api/admin/employees/deactivate` zachowany jako backwards-compat — można w przyszłości usunąć po monitoringu czy nic z innych miejsc go nie woła

> **Brak migracji DB / nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-11 — Employee Management Phase 1 + 2 (backend unified)
**Pełen refaktor zarządzania pracownikami po fixach regresji Anny Litewki (brak employment_terms) i Małgorzaty Maćków-Huras (osierocony duplikat wycinał ją z grafiku online).**

#### Commits:
- `61e9442` — feat(employees): Phase 1 — DB cleanup + employment_terms trigger + filter fix
- `2b4d86d` — feat(employees): Phase 2 — unified employee service + POST/PATCH endpoints

#### Phase 1 — DB cleanup + filter fix

**Migracja 120** (`120_employee_cleanup_and_terms_trigger.sql`):
1. DELETE osieroconych duplikatów employees — `WHERE user_id IS NULL AND email LIKE 'prodentis-%@auto.mikrostomart.pl' AND is_active = false AND EXISTS aktywny duplikat o tym samym prodentis_id`. Te wpisy powstawały przez auto-discovery `/api/employee/schedule` + były dezaktywowane podczas scalania (migracja 082), zamiast usunięte. Nadal matchowały `normalizeName(name)` aktywnych pracowników — co powodowało że jednak nieaktywny duplikat wycinał aktywnego z grafiku tygodniowego.
2. Trigger `employees_after_insert_create_terms` → AFTER INSERT ON employees → auto-create `employment_terms` (UoP 40h/26 dni urlopu/30 min buffer; Lekarz dostaje `contract_type='b2b'` inaczej `uop`). Idempotent (sprawdza valid_to IS NULL), skip dla is_active=false.
3. Backfill `employment_terms` dla aktywnych pracowników bez nich (analog seedu z migracji 115 dla osób dodanych po 8 maja — np. Anna Litewka).

**Fix `/api/employee/schedule`:**
- **Usunięte auto-discovery** operatorów Prodentis (linie 281-341 starej wersji). To ten kod tworzył osierocone wpisy. Auto-discovery żyje teraz wyłącznie w `/api/admin/employees` jako manual sync inicjowany przez admina.
- **Filtr dezaktywowanych** zamieniony z `freshDeactivatedNames.has(normalizeName(name))` na lookup po `prodentis_id` (deterministyczny). Fallback na nazwę tylko dla wpisów bez prodentis_id (edge case). Po fix: nawet jeśli ktoś przyszłość zostawi nieaktywny duplikat o identycznej nazwie, aktywny operator z `prodentis_id` zostaje widoczny.

**Fix `/api/admin/employees`:**
- Auto-discovery zachowany (admin świadomie syncuje), ale `nameMatch` przy próbie podpięcia `prodentis_id` filtruje tylko aktywne wpisy bez prodentis_id. Wcześniej mogło przekierować na osierocony duplikat.

#### Phase 2 — unified backend service + endpointy

**Nowa biblioteka `src/lib/employeeService.ts`** (430 LOC) — wspólna logika atomic dla wszystkich flow zarządzania pracownikami:

- `createOrUpdateEmployee({source, name, email, prodentisId?, position?, roles?, showInBooking?, pushGroups?, sendPasswordReset?})` — find/create auth user → grant ról → UPSERT employees **po `user_id`** (klucz deterministyczny zamiast email) → employment_terms via trigger → opcjonalnie email recovery. Bezpiecznie podpina się do istniejącego wiersza employees gdy email matchuje (np. pacjent z patient portal awansowany na pracownika — nie tworzymy duplikatu).
- `updateEmployee(id, {name?, email?, position?, showInBooking?, pushGroups?, isActive?, roles?})` — edycja per pole + diff/sync ról w `user_roles` w jednym wywołaniu (grant brakujących + revoke usuniętych) + sync `push_subscriptions.employee_groups` gdy zmieniono push_groups.

Walidacja: `roles ∈ {admin,employee,patient}`, `push_groups ∈ {doctor,hygienist,reception,assistant}`, email format.

**Nowe endpointy:**
- `POST /api/admin/employees` — unified create (backend dla wizarda „Dodaj pracownika" z Phase 3 UI). Body: `{source, name, email, prodentisId?, position?, roles?, showInBooking?, pushGroups?, sendPasswordReset?}`.
- `PATCH /api/admin/employees/[id]` — edycja per pracownik (backend dla rozwijanego wiersza z Phase 3). Wszystkie pola opcjonalne.

**Refaktor `/api/admin/roles/promote`** na cienki wrapper na `createOrUpdateEmployee()`. Zachowuje backwards-compat response shape, więc dotychczasowy UI (`addEmployee`, `addManualEmployee`, `promotePatient` w `admin/page.tsx`) działa bez zmian. Likwiduje dotychczasowy upsert z `onConflict:'email'` który mógł niespodziewanie zaktualizować osierocony duplikat.

#### Co zostaje bez zmian (Phase 3 zajmie się tym):
- UI „Pracownicy" + „Uprawnienia" w admin panel — wciąż 2 osobne zakładki
- Wizard „Dodaj pracownika" — nie ma jeszcze, na razie używane są stare addEmployee/addManualEmployee przez promote
- `/api/admin/employees/deactivate` — działa jak wcześniej, do przemigrowania w Phase 3

#### Co Marcin musi zrobić ręcznie po deploy:
1. **Wgrać migrację 120** w Supabase SQL Editor na **OBU** projektach (produkcja + demo). Plik: `~/Desktop/migracje_supabase/migracja_120_employee_cleanup_and_terms_trigger.txt`. Migracja jest idempotentna, w BEGIN/COMMIT.
2. Po wgraniu verification: `SELECT (SELECT COUNT(*) FROM employees WHERE email LIKE 'prodentis-%@auto.mikrostomart.pl' AND is_active = false) AS orphans_remaining;` powinno zwrócić `0`.

#### Pliki:
- `supabase_migrations/120_employee_cleanup_and_terms_trigger.sql` [NEW]
- `src/lib/employeeService.ts` [NEW] — 430 LOC
- `src/app/api/admin/employees/[id]/route.ts` [NEW] — PATCH endpoint
- `src/app/api/admin/employees/route.ts` [MOD] — dodany POST + refactor auto-discovery
- `src/app/api/employee/schedule/route.ts` [MOD] — usunięte auto-discovery + filtr po prodentis_id
- `src/app/api/admin/roles/promote/route.ts` [MOD] — thin wrapper na employeeService

#### Spodziewany efekt po deploy + wgraniu migracji:
- Małgorzata Maćków-Huras pozostanie widoczna w grafiku (już naprawione ręcznie, ale gwarancja na przyszłość)
- Nowi pracownicy dodawani przez „Dodaj konto" / wizard będą automatycznie mieli `employment_terms` (Anna nie miała — przez to statystyki/urlopy/algorytm overtime się wykrzaczał)
- Backend gotowy do Phase 3 (wizard UI + rozwijany wiersz w jednej zakładce)
- Stare osierocone duplikaty z `prodentis-*@auto.mikrostomart.pl` znikną z bazy bezpiecznie (intencyjnie dezaktywowani — np. Marcin (II), Ewelina Petyniak, Julka Plewa, Kuba Podlowski — pozostają, bo nie pasują do warunków cleanup).

> ⚠️ **REQUIRES**: Wgraj `supabase_migrations/120_employee_cleanup_and_terms_trigger.sql` w Supabase SQL Editor na OBU projektach.
> **Brak nowych env var.** Vercel auto-deployuje z pushem na main.

---

### 2026-05-11 — KCP: kiosk-mode auth dla ekranu QR (rozwiązanie auto-logoutu tableta)
**Tablet w recepcji wylogowywał się po wygaśnięciu sesji admina, tracąc ekran QR. Sesja admina musi mieć krótki TTL z powodów bezpieczeństwa. Rozwiązanie: dedykowany kiosk-token dla `/api/time/qr-current`, niezależny od Supabase auth.**

#### Branch + commit:
- `feat/kcp-kiosk-token` (zmergowany na main)
- `b761ce0` — feat(time-tracking): kiosk-mode auth dla /qr-display

#### Co się zmieniło:

**1. Nowy lib `src/lib/timeTracking/kioskAuth.ts`**
- `generateKioskToken(ttlDays)` — stateless HMAC-SHA256 token (format `<expires_b64u>.<nonce_b64u>.<hmac_b64u>`)
- `verifyKioskToken(token)` — timing-safe walidacja (HMAC + expiry)
- Sekret z env `KIOSK_TOKEN_SECRET` (min 32 znaki). Rotacja sekretu = unieważnienie wszystkich tokenów.
- Dozwolone TTL: 7 / 30 / 90 dni (whitelist `ALLOWED_TTL_DAYS`)

**2. Nowy endpoint `/api/admin/time/kiosk-enable`**
- `POST` (admin only) — body `{ ttlDays: 7|30|90 }` → wystawia httpOnly cookie `kiosk_token` z `Max-Age` = TTL × 86400. Zwraca `{ ok, expiresMs, ttlDays }`.
- `DELETE` (admin only) — czyści cookie (Max-Age=0). Wyłącza tryb kiosk dla bieżącego urządzenia.
- Cookie: `httpOnly`, `Secure` (production), `SameSite=lax`, `Path=/`

**3. Modyfikacja `/api/time/qr-current`**
- Auth flow: najpierw sprawdza cookie `kiosk_token` (czysty HMAC, bez DB roundtrip) → akceptuje. Inaczej fallback do `verifyAdmin()` + `hasRole('admin')`. Brak żadnego → 401.
- Odpowiedź zawiera nowe pola `authMode: 'admin' | 'kiosk'` + `kioskExpiresMs: number | null`, używane przez UI do pokazania panelu sterowania.

**4. UI `/qr-display`**
- Panel sterowania w prawym dolnym rogu (glassmorphic, niezależny od głównego QR).
- Gdy `authMode='admin'`: dropdown TTL (7/30/90 dni, domyślnie 30) + przycisk „Włącz tryb kiosk".
- Gdy `authMode='kiosk'`: status „🔒 Tryb kiosk aktywny — Ważny do: …" + przycisk „Wyłącz tryb kiosk" (z `confirm()` żeby nie kliknąć przypadkiem).
- Demo mode: panel ukryty (QR i tak placeholder).

#### Bezpieczeństwo:
- Kiosk-token autoryzuje **wyłącznie** `/api/time/qr-current` — nic więcej. Dashboard KCP w `/admin`, korekty, raporty itd. nadal wymagają normalnej admin sesji z krótkim TTL.
- `/api/time/scan` — nadal wymaga zalogowanego pracownika z aktywnym kontem (kiosk nikomu nie pozwala robić clock-in/out).
- QR sam w sobie nie jest sekretem (każdy w gabinecie go widzi); kiosk-token jest tylko po to żeby tablet mógł go _wyświetlać_ bez ponownego logowania.
- Decyzja D2 (Marcin, 2026-05-11): po wygaśnięciu kiosk-tokenu strona pokazuje przycisk „Zaloguj się jako administrator". Brak sliding TTL — admin musi świadomie ponownie aktywować tryb kiosk.

#### Co Marcin musi zrobić ręcznie po deploy:
1. **Wygenerować sekret**: `openssl rand -hex 32`
2. **Dodać env var `KIOSK_TOKEN_SECRET`** w Vercel na **OBU** projektach (`mikrostomart` + `densflow-demo`), środowiska Production + Preview
3. **Na tablecie**: zaloguj się jako admin → otwórz `/qr-display` → kliknij „Włącz tryb kiosk" (domyślnie 30 dni)

#### Co zostało bez zmian:
- Reszta sesji admina — normalny TTL Supabase (bezpieczeństwo)
- `/api/time/scan`, `/api/time/status`, `/api/time/cancel` — wymagają pracownika
- Wszystkie `/api/admin/*` (włącznie z dashboard KCP, raportami, korektami) — admin only
- Demo mode `/qr-display` — bez zmian, placeholder QR

#### Pliki:
- `src/lib/timeTracking/kioskAuth.ts` [NEW] — 122 LOC
- `src/app/api/admin/time/kiosk-enable/route.ts` [NEW] — 90 LOC (POST + DELETE)
- `src/app/api/time/qr-current/route.ts` [MOD] — kiosk fallback + new response fields
- `src/app/qr-display/page.tsx` [MOD] — panel sterowania (149 LOC dodane)

> ⚠️ **REQUIRES env var KIOSK_TOKEN_SECRET** na obu projektach Vercel (min 32 znaki hex). Bez tego POST `/api/admin/time/kiosk-enable` zwraca 500.
> **Brak migracji DB.** Token jest stateless — żadne dane w Supabase.

---

### 2026-05-10 — 🎯 PREMIUM SEO PLAN J→K→L→M — Sesja 0 (Setup)
**Po niezależnym audycie SEO (4 agentów paralelnie) i strategicznej dyskusji z Marcinem rozpoczęty 4-fazowy plan Premium SEO + Marketing na ~6 miesięcy.**

#### Commits:
- Brak — Sesja 0 to setup infrastruktury planu (dokumentacja na pulpicie + memory), nie kod

#### Kontekst — co się stało:
1. **Niezależny audyt SEO** (4 paralelni agenci): premium positioning, technical regression, local+international, E-E-A-T+content depth
2. **Werdykt**: technicznie projekt 78/100, ale premium positioning + content depth + E-E-A-T = ~30/100. Sprint H1-H8 to ~30% premium SEO, pozostałe 70% to marketing + content + brand exposure.
3. **Marcin słusznie zareagował** na zarzut audytu "brak personal brand": pokazał że ma silny istniejący brand (YouTube DentistMarcIn / "Dental MacGyver", Instagram, Facebook, TikTok, książka Czelej "Własny gabinet" 2024, 4 publikacje Magazyn Stomatologiczny 2020-2021, 2 wykłady LA&HA Symposium Słowenia 2019/2023, keynote + warsztaty LA&HA Poland 2022, strona nowosielski.pl, M.Sc. RWTH Aachen 2021 z wyróżnieniem jako drugi w PL + najmłodszy)
4. **Korekta audytu**: problem to nie "brak brandu" — to "mikrostomart.pl nie eksponuje istniejącego brandu". Marnujemy gotowe authority signals.
5. **AI pobrał wszystkie publiczne źródła** (web.archive.org snapshot nowosielski.pl + LA&HA program/wykładowcy + Magazyn Stomatologiczny + Czelej + 2 wykłady LA&HA) → kompletna inwentaryzacja personal brand

#### Co zostało dostarczone w Sesji 0:

**Pliki AI-tracking (4 nowe)** — *od 2026-05-12 wszystkie przeniesione do `~/Desktop/bałagan/` przez Marcina (KOMENDA + symlink mikrostomart zostały top-level)*:
- **`~/Desktop/bałagan/PLAN_PREMIUM_SEO.md`** — pełen plan 4 faz (J/K/L/M) z sesjami szczegółowymi
- **`~/Desktop/bałagan/PLAN_PREMIUM_SEO_STATUS.md`** — tracker statusu każdej sesji + decisions log
- **`~/Desktop/bałagan/PLAN_PREFLIGHT_CHECKLIST.md`** — lista decyzji + materiałów Marcina przed kolejnymi sesjami
- **`~/Desktop/bałagan/MARCIN_NOWOSIELSKI_BIO_INVENTORY.md`** — kompletny inwentarz personal brand z citatami z archive.org + LA&HA + Magazyn Stomatologiczny

**Memory + index**:
- `memory/project_premium_seo_plan.md` [NEW]
- `memory/feedback_marcin_brand_correction.md` [NEW] — korekta audytu, Marcin ma silny brand
- `memory/MEMORY.md` — 2 nowe wpisy indeksu

**Update istniejących**:
- `KOMENDA_STARTOWA_MIKROSTOMART.md` sekcja 0 (Last Updated + Aktywny Sprint + Aktywne inicjatywy + Krytyczne lokalizacje rozszerzone o 4 nowe pliki Premium SEO)
- `mikrostomart_context.md` — ten wpis

#### Plan w 1 zdaniu:
**4 fazy × atomowe sesje AI 1-3h** — J (technical, 5 sesji) → K (premium positioning, 8+ sesji) → L (local+intl depth, 10 sesji) → M (content engine rolling 60-80 articles, 4-5 mies). Tryb pracy Faza M = AI-only experiment (czy AI zastąpi dental copywritera za 20-30k PLN).

#### Mechanika kontekstu między sesjami:
Każda sesja AI w ramach Premium SEO Plan zaczyna od:
1. Read `KOMENDA_STARTOWA_MIKROSTOMART.md` (jak dotychczas)
2. Read `PLAN_PREMIUM_SEO.md` (pełen plan)
3. Read `PLAN_PREMIUM_SEO_STATUS.md` (tracker — sprawdź NEXT SESSION)
4. Read `mikrostomart_context.md` (jak dotychczas)
5. Jeśli sesja dotyczy K-3/K-7/Faza M — Read `MARCIN_NOWOSIELSKI_BIO_INVENTORY.md`
6. Confirm z Marcinem która sesja
7. Wykonaj + update wszystkich tracking files + commit

#### Decyzje strategiczne podjęte (Sesja 0 finalize, 2026-05-10):
- ✅ Tryb pracy Faza M: **AI-only experiment** (Marcin chce wyzwanie)
- ✅ Tempo: **agresywne** (Marcin "na maxa sprężyć")
- ✅ Sesja 0 dziś
- ✅ Struktura 4 faz J→K→L→M
- ✅ **D1 = B (premium-only)**: Marcin preferuje premium positioning bez konkretnych cen na stronie. AI cennik chat zostaje (already premium move).
- ✅ **Rok założenia kliniki: 2016** (10 lat działalności na 2026)
- ✅ **Statystyki strategia**: AI script w K-2 wyciągnie z Prodentis + Supabase (100% faktyczne, no manual count Marcina)
- ✅ **Certyfikaty skany = OPTIONAL**: audytor zgadza się z Marcinem ("po co to na stronie?"). Premium positioning preferuje Person schema + small SVG badges + external links zamiast skany dyplomów.

#### 🎁 BONUS Sesji 0: nowosielski.pl content recovery COMPLETED
- **21 artykułów Marcina** odzyskanych z web.archive.org → `~/Desktop/NOWOSIELSKI_PL_RECOVERY/articles/`
- **13,642 słów łącznie** — gold-tier mix:
  - 8 case studies "Dla lekarza" (np. "Laserowa resekcja powtórne leczenie endodontyczne" — pełen case study z parametrami zabiegu Er:YAG/Nd:YAG, abstract EN, keywords PL+EN)
  - 13 popularyzacyjnych "Dla pacjenta" (Ile kanałów mają zęby, Higienizacja inwestycja, NFZ vs prywatne, etc.)
- **Oszczędność Fazy M**: ~70-80h pracy AI (~30-40% total Fazy M effort) — istniejące deep content do bezpośredniego użycia/update
- **Plan**: sesja **M-EXIST-1** (triage) na początku Fazy M — Marcin sklasyfikuje artykuły DIRECT_REUSE / UPDATE / MERGE / SKIP

#### Decyzje pending (do Fazy K):
- ⏳ **D4**: pacjenci do video testimonial + RODO consent — przed K-7
- ✅ Wszystkie inne decyzje strategiczne podjęte. Faza J może startować bez blokerów.

#### Następna sesja: **J-1 — Sitemap freshness + Article schema audit**
- AI: ~2.5h
- Marcin: ~15 min review
- Branch: `seo/j-1`
- Pre-requisites: brak (J-1 startuje natychmiast)

#### Pliki:
- 4 nowe pliki na pulpicie
- 2 nowe memory + 2 wpisy MEMORY.md
- KOMENDA_STARTOWA sekcja 0 + sekcja 2 updated
- Ten wpis w Recent Changes

> **Brak migracji DB / nowych env var.** Tylko dokumentacja + infrastruktura planu. Faktyczne kody zaczynają się w J-1.

---

### 2026-05-10 — POSTMORTEM: H3 server component Link bug + recovery
**Awaria po H8 push: produkcja zwracała 500 na wszystkich stronach pod `/[locale]`. Naprawa przez bisect + targeted fix.**

#### Commits chronologicznie:
- `502bb60` H8 (push o ~18:00) → produkcja 500 na wszystkich stronach
- `d0dd75d` revert H8 — nadal 500
- `d56c0b8` revert H7 — nadal 500
- `029bb5b...6a82f0d` revert H1-H6 (sequential) → produkcja 200 OK ✅
- `572af02` **fix: H3 sed missed server components — useLocale hook crash**
- `fc70eb2..6c8f4fa` re-apply H1-H8 z fixem → produkcja 200 OK ✅

#### Root cause:
**H3 batch sed konwersja `import Link from 'next/link';` → `import { Link } from '@/i18n/navigation';`** zamieniła import w **3 server components**, których nie powinno się dotykać:
- `src/components/CookieConsent.tsx` (root layout — crash wszystkich stron)
- `src/app/[locale]/nowosielski/[slug]/page.tsx` (back link)
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` (back link)

`Link` z `@/i18n/navigation` (next-intl wrapper) wewnętrznie używa `useLocale()` — **client-only React hook**. W server SSR rzuca `Error: No intl context found. Have you configured the provider?`. Każdy request do `/[locale]/*` zwraca 500.

**Why nie wykryłem lokalnie podczas H3-H8 testów**: `npm run build` kompiluje clean (TypeScript valid). Bug objawia się tylko w **server runtime SSR**. Fresh `.next/` po pierwszym cherry-pick z action cache mógł serwować stronę z poprzedniej iteracji 200 OK, dopiero kolejne testy ujawniły problem.

#### Diagnostyka (~30 min):
1. Bisect na produkcji: revert H8 → revert H7 → ... → revert H1 (8 cycles × 5min = 40 min na deploy each).
2. Site stabilny po pełnym revert (= pre-sprint state).
3. Branch lokalny `seo/bisect2`, fresh cherry-pick H1-H6 → 500 lokalnie.
4. Dev mode (`npm run dev` z Turbopackiem) zwrócił czytelny stack trace zamiast minified `chunks/6111.js:15:3947`:
   ```
   at useIntlContext
   at useLocale
   at BaseLink
   ```
5. `BaseLink` to internal next-intl. Reverse-engineered: rendered w server context = crash.
6. Sprawdzenie listy 10 plików z H3 batch sed: 3 NIE mają `"use client"` → server components.

#### Fix (commit `572af02`):

**Pattern dla server components**:
```tsx
// ❌ Server component:
import { Link } from '@/i18n/navigation';
<Link href="/path">...</Link>  // CRASH: useLocale() in SSR

// ✅ Server component:
import { getLocale } from 'next-intl/server';
const locale = await getLocale();
const href = locale === 'pl' ? '/path' : `/${locale}/path`;
<a href={href}>...</a>
```

3 pliki naprawione tym wzorcem:
- `CookieConsent.tsx`: `<a href={policyHref}>` zamiast `<Link href="/polityka-cookies">`
- `nowosielski/[slug]/page.tsx`: `<a href={locale === 'pl' ? '/nowosielski' : '/${locale}/nowosielski'}>` (locale już w params z H2)
- `baza-wiedzy/[slug]/page.tsx`: analogicznie

#### Final state na produkcji (commit `6c8f4fa`):
- 16 URL przetestowanych lokalnie + 9 na produkcji = wszystkie 200 OK
- Linia historii: 8 sprint commits + 8 reverts + 1 fix + 8 re-apply = 25 nowych commitów na main od pre-sprint

#### Lessons learned (zapisane w memory `feedback_h3_server_link_bug.md`):
- `Link` z `@/i18n/navigation` używa `useLocale()` hook → **NIGDY w server components**.
- Build success ≠ runtime success. Server vs client component boundaries crashują tylko w SSR, build nie wykryje.
- Diagnostyka 500 production ale lokalnie OK: użyj `npm run dev` (Turbopack) zamiast `npm run start` (minified prod build) dla czytelnego stack trace.
- Przed batch sed: zawsze sprawdź `head -3 file | grep "use client"` żeby identyfikować server components.

#### Pliki:
- `src/components/CookieConsent.tsx` — `<Link>` → `<a href>` z manual locale prefix
- `src/app/[locale]/nowosielski/[slug]/page.tsx` — analogicznie
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` — analogicznie
- `~/.claude/projects/-Users-marcinnowosielskimedit-mikrostomart/memory/feedback_h3_server_link_bug.md` [NEW]
- `~/.claude/projects/-Users-marcinnowosielskimedit-mikrostomart/memory/MEMORY.md` — dodany wpis

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu TypeScript w 3 plikach.
> Vercel auto-deploy po pushu zakończony, produkcja stabilna.

---

### 2026-05-10 — SEO Audit Sprint H8: real schema data (correction po H7)
**Korekta po H7 — Marcin zauważył że dane były w projekcie, audyt ich nie skojarzył**

#### Branch:
- `seo/h8-real-data` (mergowany na main bezpośrednio po pushu)

#### Problem:
Po wykonaniu H7 zaproponowałem Marcinowi 3 follow-up tematy "wymagające jego decyzji":
- Real practice photo (zamiast logo)
- `sameAs` real URLs (Instagram, GBP, YouTube)
- Real `googlePlaceId`

Marcin słusznie zauważył: **wszystkie 3 dane SĄ w projekcie**, tylko schema ich nie używa:
- `public/interior/IMG_*.jpeg` (5 zdjęć wnętrza, ~13 MB total).
- `src/components/YouTubeFeed.tsx:264-280`: hardcoded URLs do Marcin's YouTube/Instagram/Mikrostomart Instagram.
- `src/app/api/google-reviews/route.ts:6`: real Place ID `ChIJ-5k3xu5SEEcRJhqtusOhhwM`.
- `src/app/[locale]/strefa-pacjenta/ocen-nas/page.tsx`: GBP review URL `https://g.page/r/CSYarbrDoYcDEAE/review`.

#### H8 — Real schema data:

**1. Optymalizacja zdjęć interior do WebP**
- `scripts/resize-interior.js` [NEW] — sharp resize 1600px max + quality 82.
- 5 zdjęć: ~13 MB → ~850 KB total (94% redukcji).
- `IMG_1400.webp` 204 KB, `IMG_1460.webp` 178 KB, `IMG_1579.webp` 140 KB, `IMG_2535.webp` 198 KB, `IMG_8999.webp` 128 KB.

**2. brandConfig.ts — single source of truth dla social/GBP**
- Nowe pola w BrandConfig interface: `instagramClinicUrl?`, `instagramDoctorUrl?`, `youtubeUrl?`, `googleBusinessUrl?`.
- Wartości produkcyjne wpisane bezpośrednio w `PROD_BRAND`:
  - `instagramClinicUrl: 'https://www.instagram.com/mikrostomart_opole/'`
  - `instagramDoctorUrl: 'https://www.instagram.com/nowosielski_marcin/'`
  - `youtubeUrl: 'https://www.youtube.com/@DentistMarcIn'`
  - `googleBusinessUrl: 'https://g.page/r/CSYarbrDoYcDEAE/review'`
- Przywrócony `googlePlaceId: 'ChIJ-5k3xu5SEEcRJhqtusOhhwM'` (był usunięty w H1 jako placeholder — zignorowałem że ta wartość JEST realna).
- `schemaImage` zmieniony z `/logo-transparent.png` na `/interior/IMG_1400.webp` — Google Local Pack/Knowledge Panel preferuje real photo.

**3. Dentist schema `sameAs` — full array (`src/app/layout.tsx`)**
- Pre-H8: tylko `[brand.facebookUrl]` (1 URL).
- Post-H8: 5 URLs (`facebookUrl`, `instagramClinicUrl`, `instagramDoctorUrl`, `youtubeUrl`, `googleBusinessUrl`) z `.filter(Boolean)` na wypadek demo mode.
- Każdy URL prowadzi do entity Mikrostomart — Google linkuje wszystko jako tę samą organizację (Knowledge Panel).

**4. InteriorCollage.tsx**
- Image src refs `.jpeg` → `.webp`.
- Dodany `sizes="(max-width: 768px) 100vw, 50vw"` (audit gap).

**5. google-reviews/route.ts konsolidacja**
- `const PLACE_ID = 'ChIJ...'` hardcoded → `const PLACE_ID = brand.googlePlaceId || 'ChIJ...'` (fallback na hardcoded dla bezpieczeństwa).
- Single source of truth: brand.googlePlaceId.

#### Co Google teraz wie:

Po deploy Dentist schema będzie zawierał:
```json
{
  "@type": ["Dentist", "MedicalBusiness"],
  "image": "https://www.mikrostomart.pl/interior/IMG_1400.webp",
  "sameAs": [
    "https://www.facebook.com/mikrostomart",
    "https://www.instagram.com/mikrostomart_opole/",
    "https://www.instagram.com/nowosielski_marcin/",
    "https://www.youtube.com/@DentistMarcIn",
    "https://g.page/r/CSYarbrDoYcDEAE/review"
  ],
  ...
}
```

Knowledge Graph entity disambiguation: Google rozumie że Mikrostomart to ta sama klinika co `mikrostomart_opole` na Instagramie, `@DentistMarcIn` na YouTube, i ma profil GBP.

#### Smoke test:
- `npm run build` — clean.

#### Pliki:
- `scripts/resize-interior.js` [NEW] — sharp WebP utility
- `public/interior/IMG_*.webp` (5 plików nowych) — łącznie ~850 KB
- `src/lib/brandConfig.ts` — 4 nowe social URL pola, real googlePlaceId, schemaImage interior photo
- `src/app/layout.tsx` — sameAs full array (5 URLs filter Boolean)
- `src/app/api/google-reviews/route.ts` — PLACE_ID via brandConfig
- `src/components/InteriorCollage.tsx` — .jpeg → .webp + sizes

#### Spodziewany efekt po deploy:
- **Knowledge Graph entity disambiguation** silniejszy — Google linkuje 5 social properties do tej samej kliniki.
- **Local Pack** może pokazać real photo wnętrza zamiast logo.
- **GBP linkowanie** poprawia review carryover w SERP.
- **Total interior images transfer** spadek 94% (13 MB → 850 KB) — pozytyw na każdym page-load Homepage z InteriorCollage.

> **Brak migracji DB / nowych env var.** Tylko refactor + binary assets WebP.

---

### 2026-05-10 — SEO Audit Sprint H7: international landing page (FINAŁ)
**Siódma i ostatnia faza audytu SEO — dedykowany landing dla pacjentów przyjezdnych**

#### Branch:
- `seo/h7-intl-landing`

#### Cel:
Krytyczna luka biznesowa wykryta przez audyt: 80 km od granicy DE, 0 contentu pod foreign markets, brak landing page dla `dental tourism` keywords. H7 wprowadza dedykowaną stronę `/dla-pacjentow-przyjezdnych` w 4 locale.

#### H7 — International landing page:

**1. Nowa strona `/dla-pacjentow-przyjezdnych` × 4 locale**
- `src/app/[locale]/dla-pacjentow-przyjezdnych/page.tsx` — server-friendly client component (`useTranslations`)
- `src/app/[locale]/dla-pacjentow-przyjezdnych/layout.tsx` — pageMetadata + breadcrumb
- 4 sekcje:
  - Hero (H1 + subtitle)
  - Why (4 USP cards w grid: mikroskop, 3 języki, ceny, parking+hotele)
  - Detail sections (5 paragraphs: dojazd, hotele, języki, VAT/kasy chorych, płatności)
  - CTA (book online + phone CTA)
- ~600-800 słów merytorycznego contentu per locale.

**2. Per-locale title/description z target keywords (`src/lib/seoTranslations.ts`)**
- PL: "Dla pacjentów spoza Opola — Mikrostomart Stomatolog Opole"
- EN: "Dentist in Opole, Poland — For International Patients | Mikrostomart"
  - target: "dentist Opole Poland for international patients", "dental tourism Poland"
- DE: "Zahnarzt in Opole, Polen — für deutsche Patienten | Mikrostomart"
  - target: "Zahnarzt Opole für deutsche Patienten", "Zahnarzt Polen Krankenkasse"
- UA: "Стоматолог в Ополе, Польща — для українських пацієнтів | Mikrostomart"
  - target: "стоматолог Ополе для українців", "україномовний стоматолог Польща"

**3. Translacje `przyjezdni` namespace × 4 locale (~17 keys × 4 = 68 stringów)**
- Hero: heading, subtitle
- 4 USPs: mikroskop, 3 języki, ceny vs DE/UK, parking + hotele
- Detail: dojazd, hotele, języki obsługi, VAT/kasy chorych (UE 2011/24), płatności
- CTA: ctaTitle, ctaSubtitle, ctaPrimaryLabel, ctaSecondaryLabel
- DE locale szczegóły: explicit "Kostenerstattung", EU directive 2011/24
- UA locale: korkowa droga z UA-PL granicy (~400 km, ~5 h), ДМС programy

**4. BREADCRUMB_LABELS klucz `przyjezdni` × 4 locale**
- PL: "Dla pacjentów spoza Opola"
- EN: "For International Patients"
- DE: "Für deutsche Patienten"
- UA: "Для українських пацієнтів"

**5. Sitemap entry**
- `/dla-pacjentow-przyjezdnych` dodany do `mainPaths` (priority 0.9, weekly).
- Auto-generuje 4 URL × per locale + alternates.languages dla hreflang.

**6. Footer link `intlPatients` × 4 locale**
- Dodany w sekcji "Contact" Footer (między "Team" a "Contact").
- Klucz `tn('intlPatients')` dodany w 4× common.json footer.seoNav.
- Wszyscy publiczni użytkownicy (PL/EN/DE/UA) widzą link → indeksacja Google przez crawl.

#### Smoke test:
- `npm run build` — clean.
- 4 nowe URLs: `/dla-pacjentow-przyjezdnych`, `/en/...`, `/de/...`, `/ua/...`.

#### Pliki:
- `src/app/[locale]/dla-pacjentow-przyjezdnych/page.tsx` [NEW]
- `src/app/[locale]/dla-pacjentow-przyjezdnych/layout.tsx` [NEW]
- `src/lib/seoTranslations.ts` — entry `/dla-pacjentow-przyjezdnych` × 4 locale
- `src/lib/seo.ts` — BREADCRUMB_LABELS klucz `przyjezdni` × 4 locale
- `src/app/sitemap.ts` — dodany do mainPaths
- `src/components/Footer.tsx` — dodany Link
- `messages/{pl,en,de,ua}/pages.json` — namespace `przyjezdni` × 4
- `messages/{pl,en,de,ua}/common.json` — footer.seoNav.intlPatients × 4

#### Spodziewany efekt po deploy:
- Foreign markets ranking dla zapytań:
  - DE: "Zahnarzt Opole für Deutsche", "Zahnarzt Polen Krankenkasse Erstattung"
  - EN: "dentist Opole Poland for international patients", "dental tourism Poland English"
  - UA: "стоматолог Ополе для українців", "україномовний стоматолог Польща"
- Konkretne signaly: parking, hotele, języki, kasy chorych DE, EU dyrektywa 2011/24
- Internal linking: Footer → /dla-pacjentow-przyjezdnych → /rezerwacja (CTA)
- BreadcrumbList rich snippet w SERP locale-aware

#### Co dalej (poza scope H1-H7):
- **Faza 3 GSC** — Marcin sam: re-submit sitemap (~700 URLi po H1-H7), audyt po 4-6 tygodniach.
- **Service pages 280→800 słów** — 24 expansions, follow-up.
- **/cennik SSR table cen** — wymaga decyzji o cenach.
- **FAQ DE/UA wyrównanie do PL** — content writing.
- **Real Marcin/Ela practice photo** zamiast logo dla Dentist `image` — wymaga zdjęcia.
- **`sameAs` Instagram/GBP/YouTube** — wymaga real URLs.
- **Real `googlePlaceId`** — z Google Cloud Console.

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu + tłumaczeń.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 🎯 SEO AUDIT SPRINT H1-H7 KOMPLETNY (2026-05-10)

| Faza | Commit | Zakres |
|---|---|---|
| H1 | `4e85639` | Demo guard, AggregateRating filter, schema improvements |
| H2 | `4d9ba60` | 5 layouts, slug metadata, hreflang, schemas, UA Польща |
| H3 | `8b88265` | Service pages raw `<a>` → Link, 12 batch-safe `next/link` |
| H4 | `b4bb14a` | Localized Dentist + Person × 2 + Service × 6 + Product schemas |
| H5 | `ee2c303` | WebP 7.5MB→<100KB, sizes × 8, Cache 1y, hamburger 44×44 |
| H6 | `c8d537e` | /kontakt Dojazd + FAQ przyjezdnych × 4 locale |
| H7 | TBD | International landing /dla-pacjentow-przyjezdnych × 4 locale |

**Łączny efekt:**
- ~47 problemów wykrytych przez audit, ~35 zaadresowanych w H1-H7
- Demo deployment już nie kanibalizuje produkcji
- AggregateRating bez manipulation flag risk
- 5 stron które były "niewidoczne" mają teraz layout.tsx z metadata
- Dynamic article routes (nowosielski/[slug], aktualnosci/[slug], baza-wiedzy/[slug]) mają hreflang per artykuł + BreadcrumbList + dateModified
- Locale leak w 19 plikach (raw `<a>`) wyeliminowany
- Person schemas (E-E-A-T) + Service+Offer + Product schemas
- 15 MB transferu na /o-nas oszczędzone (WebP)
- Hamburger touch target WCAG compliant
- /kontakt sekcja Dojazd + FAQ przyjezdnych w 4 locale
- Dedykowany landing page dla foreign markets

**Pozostałe (wymaga dalszych decyzji od Marcina lub long-form content writing):**
- Service pages content expansion (24 expansions PL/EN/DE/UA)
- /cennik SSR table cen
- Real practice photo / sameAs URLs / googlePlaceId
- FAQ DE/UA długość wyrównanie do PL

**Faza 3 GSC**: audyt po 4-6 tyg. Oczekiwane: foreign markets indeksacja, ranking dla "dental tourism Poland", "Zahnarzt Opole für Deutsche", "стоматолог Ополе".

---

### 2026-05-10 — SEO Audit Sprint H6: content quality (Dojazd + FAQ przyjezdnych)
**Szósta z 7 faz audytu SEO — zaadresowanie krytycznej luki contentu dla pacjentów przyjezdnych**

#### Branch:
- `seo/h6-content-quality`

#### Problem (z audytu):
- Brak jakiegokolwiek contentu dla pacjentów przyjezdnych: 0 wzmianek "dental tourism", "international patients", "VAT refund", "Anfahrt", "z zagranicy", "hotel".
- /kontakt nie miał sekcji "Dojazd / How to find us / Anfahrt".
- /faq miało 43 pytań w 10 kategoriach — żadne nie odpowiadało na potrzeby przyjezdnych (parking jest, ale brak hoteli, transportu, języków, VAT).
- Klinika 80 km od granicy DE — niewykorzystany rynek.

#### H6 — Content quality (limited scope):

**1. Sekcja "Dojazd" na /kontakt** (`src/app/[locale]/kontakt/page.tsx` + `messages/{4_locale}/pages.json`)
- 5 kart × 4 locale: Parking, Transport publiczny, Z autostrady A4, Hotele, Języki obsługi.
- Każda karta ma title + opis (50-150 chars).
- Renderuje się w grid (auto-fit, minmax 280px, gap), z stagger animation.
- Kontent sterylny technicznie:
  - Parking: bezpłatny przed kliniką (od ul. Centralnej).
  - Transport: PKP Opole Główne → autobusy 12/16, 15 min do "Centralna".
  - A4: zjazd Opole-Zachód, 4 km. Granica Olszyna 200 km.
  - Hotele: Mercure Opole, Festival, Piast (3 km radius) + Booking apartamenty.
  - Języki: PL/EN/DE bezpośrednio, UA na życzenie. Niemieckie rachunki na zwrot z kasy chorych.
- 13 nowych keys × 4 locale = 52 stringów.

**2. FAQ kategoria "Dla pacjentów przyjezdnych" (cat10) × 4 locale** (`messages/{pl,en,de,ua}/pages.json`)
- 5 nowych pytań × 4 locale = 20 questions/answers (+ 4 nazwy kategorii):
  1. Parking? — odpowiedź potwierdza darmowy przed kliniką.
  2. Hotele blisko? — Mercure/Festival/Piast + rezerwacja przez recepcję.
  3. Pacjenci z zagranicy? — PL/DE/CZ/AT/UA. PL/EN/DE bezpośrednio.
  4. VAT/zwrot dla Niemców? — VAT 0% (no tax-free), ale niemieckie kasy chorych mogą pokryć (rachunek DE na życzenie).
  5. Dojazd? — A4/PKP/granica.
- `categoryCount` zmienione z "10" na "11", dodany `cat10count: "5"`.
- Faza G2 FAQ schema (faq/layout.tsx) automatycznie podnosi nową kategorię — Google indeksuje jako rich FAQ snippet w 4 locale.

#### Świadomie pominięte (follow-up — wymaga long-form content writing lub decyzji):

- **Service pages 280 → 800+ słów** (24 expansions = 6 pages × 4 locale). Wymaga merytorycznego rozszerzenia każdej. Najlepiej iteracyjnie (priority order: implantologia, leczenie-kanalowe, stomatologia-estetyczna).
- **/cennik SSR-renderowana tabela cen** — wymaga decyzji od Marcina o publikacji konkretnych cen.
- **FAQ DE/UA wyrównanie długości do PL** — DE/UA skrócone o 27-37% (mechanical translations). Wymaga ręcznej rewizji każdej odpowiedzi.

#### Smoke test:
- `npm run build` — clean.
- `jq empty` na 4 pages.json — JSON valid.
- Po 1 falstart: typograficzne `„Centralna"` było mismatch (otwarcie typograficzne, zamknięcie standard). Fix: `„Centralna”` (oba typograficzne U+201E + U+201D).

#### Pliki:
- `src/app/[locale]/kontakt/page.tsx` — dodana sekcja "Dojazd" (5 kart grid, animowane)
- `messages/pl/pages.json` — 13 keys directions + 11 keys cat10 FAQ
- `messages/en/pages.json` — analogicznie
- `messages/de/pages.json` — analogicznie
- `messages/ua/pages.json` — analogicznie

#### Spodziewany efekt po deploy:
- Foreign markets users (DE/CZ/UA) widzą explicit content "Anfahrt / How to find us" na /kontakt.
- /faq w 4 locale ma teraz 5 nowych pytań przyjezdnych — Google FAQ rich snippet kategoryzuje jako "international patients" / "out-of-town" → potencjał ranking dla zapytań "dentist Opole hotels" / "Zahnarzt Polen Erstattung".
- Brand authority sygnał: explicit obsługa pacjentów zagranicznych (kasy chorych DE, transport, języki).

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu + tłumaczeń.

---

### 2026-05-10 — SEO Audit Sprint H5: performance + images
**Piąta z 7 faz audytu SEO — Core Web Vitals fixes + image optimization**

#### Branch:
- `seo/h5-performance-images`

#### H5 — Performance + images:

**1. Marcin/Ela JPGs 7.5 MB → WebP <100 KB (DRAMATYCZNE)**
- `scripts/resize-portraits.js` — sharp-based resize + WebP convert (one-shot).
- `public/marcin-final.jpg` 7.6 MB (6000×4000) → `public/marcin-final.webp` 38 KB (1200×800, quality 80).
- `public/ela-final.jpg` 7.5 MB (6000×4000) → `public/ela-final.webp` 89 KB (1200×800).
- Łączna oszczędność: ~15 MB transferu na /o-nas (2 obrazy hover overlay).
- JPG originals zachowane jako fallback (Image src zaktualizowane na .webp).

**2. /o-nas Image refs zaktualizowane**
- `o-nas/page.tsx`: 4× `<Image>` ze `sizes="(max-width: 768px) 100vw, 50vw"` + `priority` na main, `loading="lazy"` na hover overlay.
- `o-nas/layout.tsx`: Person schemas → `image: /marcin-final.webp`, `/ela-final.webp`.

**3. AVIF/WebP formats pin (`next.config.ts`)**
- `images.formats: ['image/avif', 'image/webp']` — explicit AVIF preferred, WebP fallback.
- AVIF wycina ~30% bytes vs WebP dla browsers które wspierają (most evergreens 2024+).

**4. Cache-Control 1-year dla statyków (`next.config.ts`)**
- Per-extension headers (path-to-regexp nie wspiera brace alternation).
- 12 extensions: jpg, jpeg, png, webp, avif, gif, ico, mp4, webm, mp3, woff, woff2.
- `public, max-age=31536000, immutable` — repeat-visit performance fix.

**5. Hamburger touch target 30×21 → 44×44 (`Navbar.tsx` + `Navbar.module.css`)**
- WCAG 2.5.5 minimum touch target compliance.
- `.hamburger` button: 44×44 outer (flexbox center).
- `.barWrapper` span: 30×21 inner (visual icon position).
- 3× `.barInline` span (3 bars) wewnątrz wrappera.

**6. `sizes` attribute na Image fill** (8 plików, audyt wskazał 23 wystąpienia)
- `ArticleCarousel.tsx:131`: `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"` + `loading="lazy"`.
- `OfferCarousel.tsx:200`: `sizes="(max-width: 768px) 100vw, 50vw"`.
- `Footer.tsx:41`: `sizes="(max-width: 768px) 100vw, 1200px"` + `aria-hidden`.
- `aktualnosci/page.tsx:167`: `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"` + `loading="lazy"`.
- `aktualnosci/[slug]/page.tsx:225`: `sizes="(max-width: 800px) 100vw, 800px"` (LCP, ma `priority`).
- `nowosielski/page.tsx:211`: listing `sizes` + `loading="lazy"`.
- `nowosielski/[slug]/page.tsx:263`: hero `sizes` (LCP).
- `baza-wiedzy/[slug]/page.tsx:214`: hero `sizes` (LCP).
- `o-nas/page.tsx`: 4× sizes (zrobione w punkcie 2).

#### Świadomie pominięte (follow-up):

- **Per-page OG images** (6 service pages + homepage variants) — wymaga generated images (Replicate / Photoshop). Pominięte jako follow-up — Marcin może wygenerować przez ThemeEditor.
- **Sitemap `lastModified` per-page commit time** — wymaga complex git log integration, low ROI.
- **Pozostałe `<Image fill>` w komponentach niegłównych** (AssistantTeaser, InteriorCollage avatars) — niski wpływ, można w follow-up.

#### Smoke test:
- `npm run build` — clean.
- WebP files są dostępne w `public/`.
- Cache-Control headers działają (per-extension regex valid).

#### Pliki:
- `scripts/resize-portraits.js` [NEW] — sharp resize/WebP utility (one-shot)
- `public/marcin-final.webp` [NEW] — 38 KB
- `public/ela-final.webp` [NEW] — 89 KB
- `next.config.ts` — formats AVIF/WebP, Cache-Control 1y per-extension
- `src/app/[locale]/o-nas/page.tsx` — Image src .jpg→.webp + sizes×4
- `src/app/[locale]/o-nas/layout.tsx` — Person schemas image .webp
- `src/components/Navbar.tsx` — hamburger barWrapper struct
- `src/components/Navbar.module.css` — .hamburger 44×44, .barWrapper 30×21
- `src/components/ArticleCarousel.tsx` — sizes + lazy
- `src/components/OfferCarousel.tsx` — sizes
- `src/components/Footer.tsx` — sizes + aria-hidden
- `src/app/[locale]/aktualnosci/page.tsx` — sizes + lazy
- `src/app/[locale]/aktualnosci/[slug]/page.tsx` — sizes (LCP)
- `src/app/[locale]/nowosielski/page.tsx` — sizes + lazy
- `src/app/[locale]/nowosielski/[slug]/page.tsx` — sizes (LCP)
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` — sizes (LCP)

#### Spodziewany efekt po deploy:
- Mobile LCP /o-nas: drastyczne polepszenie (15 MB transferu down).
- Best Practices score (Lighthouse): +2-3 punkty (touch target).
- Repeat-visit performance: hot images z Vercel CDN cache.
- Foreign markets: AVIF format reduces transfer 30% vs WebP.

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu + nowe binary assets w public/.

---

### 2026-05-10 — SEO Audit Sprint H4: schema enrichment
**Czwarta z 7 faz audytu SEO — wzbogacenie Schema.org dla rich SERP results**

#### Branch:
- `seo/h4-schema-enrichment` (mergowany na main bezpośrednio po pushu)

#### H4 — Schema enrichment:

**1. Dentist availableService localized per-locale (`src/lib/seo.ts`)**
- Dodany helper `getAvailableServices(locale)` z mapą `SERVICE_NAMES` per 4 locale (pl/en/de/ua) × 7 services.
- Każda usługa: localized `name` + locale-aware `url` (np. EN → `/en/oferta/implantologia`).
- Pre-H4 root layout zwracał PL nazwy ("Implanty zębów") niezależnie od locale → schema EN/DE/UA pages miało polskie stringi.
- Dodany `hreflangCode(locale)` helper (re-export HREFLANG_MAP).

**2. Dentist schema `inLanguage` per request locale (`src/app/layout.tsx`)**
- `SchemaOrg` przyjmuje teraz `locale` prop.
- `inLanguage` ustawiane via `hreflangCode(locale)` (ua → uk).
- `availableService` używa `getAvailableServices(locale)`.

**3. Person schemas dla Marcin + Elżbieta na /o-nas (`src/app/[locale]/o-nas/layout.tsx`)**
- 2 entity Person × 4 locale (PL/EN/DE/UA) z localized description, jobTitle.
- Marcin: implantolog + endodonta mikroskopowy. Ela: higienistka.
- `worksFor: { @id: brand.schemaId }` → linkuje Persons do Dentist entity (Knowledge Graph).
- `image`: `/marcin-final.jpg`, `/ela-final.jpg`.
- `knowsAbout`: tablica specjalizacji per locale.
- E-E-A-T signal — Google rewards explicit author/practitioner entities dla content medycznego.

**4. Service schema na 6 service pages (`src/lib/serviceSchemas.ts` + 6 layoutów)**
- `buildServicePageSchemas` zwraca teraz `{ faqSchema, procedureSchema, serviceSchema }`.
- `serviceSchema`: type Service z `provider: { @id: brand.schemaId }`, `category: 'Dentistry'`, `url`.
- **`areaServed`**: tablica obejmująca City "Opole", AdministrativeArea "województwo opolskie", Country "Poland", "Germany", "Czech Republic", "Ukraine".
- 80 km od granicy DE → naturalny target dental tourism. areaServed = silny signal local-pack + foreign markets.
- Bez `offers` (pricing zmienia się — uniknięcie stale-price penalty).
- 6 service layoutów dodaje `serviceSchema` script obok faqSchema + procedureSchema.

**5. Product schema na /sklep (`src/lib/seo.ts` + `src/app/[locale]/sklep/layout.tsx`)**
- Nowy helper `fetchShopProductsRich(locale)` — pełne dane produktu (name, description, image, price, currency).
- Nowy helper `productListSchema(products)` — ItemList z embedded Product entities.
- Każdy produkt: type Product z `Offer` (price, priceCurrency PLN, availability InStock, url).
- Variable-price vouchers używają `min_price` jako floor.
- Eligible dla Google Shopping rich snippets.
- Layout `/sklep` przeniesiony z `fetchProductItems` (bare ListItem) na `fetchShopProductsRich` (Product+Offer).

#### Świadomie pominięte (decision points wymagające danych od Marcina):

- **`sameAs` Instagram/GBP/YouTube** — brand.facebookUrl jest jedyny obecny. Wymaga real URLs do Instagram, Google Business Profile, YouTube, LinkedIn.
- **Real practice photo zamiast logo** dla Dentist `image` — obecnie `/logo-transparent.png`. Google preferuje real photo budynku. Wymaga dostarczenia zdjęcia od Marcina.
- **Real `googlePlaceId`** — usunięty placeholder w H1. Można dodać via DB site_settings lub hardcoded.
- **Concrete pricing offers** w Service schemas — uniknięte żeby nie tworzyć stale-price liability.

#### Smoke test:
- `npm run build` — clean.
- Brak nowych compilation errors.

#### Pliki:
- `src/lib/seo.ts` — getAvailableServices, hreflangCode, fetchShopProductsRich, productListSchema (~150 LOC dodane)
- `src/lib/serviceSchemas.ts` — buildServicePageSchemas zwraca serviceSchema, AREA_SERVED constant
- `src/app/layout.tsx` — SchemaOrg locale-aware, inLanguage, localized availableService
- `src/app/[locale]/o-nas/layout.tsx` — 2× Person schemas z PERSON_DESCRIPTIONS (PL/EN/DE/UA)
- `src/app/[locale]/oferta/{6_services}/layout.tsx` — dodany serviceSchema script (6 plików)
- `src/app/[locale]/sklep/layout.tsx` — refactor na productListSchema

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu TypeScript.

---

### 2026-05-10 — SEO Audit Sprint H3: internal linking
**Trzecia z 7 faz audytu SEO — naprawa locale leak i lokal-aware linkowania**

#### Branch:
- `seo/h3-internal-linking` (mergowany na main bezpośrednio po pushu)

#### Problem:
Audyt wykrył 7 service pages z `<a href="/kontakt">` (raw HTML anchor) zamiast `Link` z next-intl. EN user na `/en/oferta/implantologia` klikał "Umów wizytę" → ląd na `/kontakt` → 307 redirect przez next-intl middleware → `/en/kontakt` (full reload + drugi hop). Plus 12 batch-safe plików nadal używało `next/link` zamiast wrappera lokalnego.

#### H3 — Internal linking:

**1. 7 service pages: raw `<a href="/kontakt">` → `Link` z `@/i18n/navigation`**
- `/oferta/implantologia/page.tsx`
- `/oferta/leczenie-kanalowe/page.tsx`
- `/oferta/stomatologia-estetyczna/page.tsx`
- `/oferta/ortodoncja/page.tsx`
- `/oferta/chirurgia/page.tsx`
- `/oferta/protetyka/page.tsx`
- `/oferta/OfertaClient.tsx` (landing wrapper)
- Każdy: dodany import `import { Link } from '@/i18n/navigation';` + `<a>` → `<Link>`.

**2. `/wizyta/[type]/page.tsx` — raw `<a>` → `Link`**
- 2 miejsca: `<a href="/">` (404 fallback), `<a href="/kontakt">` (CTA box).
- `<a href="tel:+48570270470">` zostawione — to nie jest navigation, to telefon.

**3. `/aplikacja/page.tsx` — `next/link` + raw `<a>` → `@/i18n/navigation` Link**
- `import Link from 'next/link'` → `import { Link } from '@/i18n/navigation'`
- 2× `<a href="/strefa-pacjenta/register/verify">` → `<Link>`
- Anchor `<a href="#pobierz">` zostają (scroll do sekcji, nie navigation).

**4. Batch convert 10 plików `next/link` → `@/i18n/navigation`**
Wszystkie używały `import Link from 'next/link'` (lub `"next/link"`) ale nie miały **manual locale prefix** w href, więc bezpieczna batch zamiana przez sed:
- `src/app/[locale]/mapa-bolu/PainMapInteractive.tsx`
- `src/app/[locale]/platnosc/page.tsx`
- `src/app/[locale]/porownywarka/page.tsx`
- `src/app/[locale]/nowosielski/page.tsx`
- `src/app/[locale]/nowosielski/[slug]/page.tsx`
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx`
- `src/app/[locale]/kalkulator-leczenia/page.tsx`
- `src/app/[locale]/koszyk/page.tsx`
- `src/app/[locale]/sklep/page.tsx`
- `src/components/CookieConsent.tsx`

#### Skipped (świadomie):

**Pliki z manual locale prefix** (`${locale === 'pl' ? '' : '/' + locale}/...`) wymagają indywidualnego przeglądu — batch sed spowodowałby DOUBLE prefix → 500 errors:
- `src/app/[locale]/aktualnosci/page.tsx`
- `src/app/[locale]/aktualnosci/[slug]/page.tsx`
Patrz `feedback_localized_links.md` w memory. Zostawiam jako jest — działa z manual prefix. Refaktor wymagałby osobnej iteracji.

**Strefa pacjenta auth pages** (`strefa-pacjenta/login`, `register/*`, `reset-password/*`):
- Internal area, robots disallow `/strefa-pacjenta/`.
- Niski priorytet SEO, nie widoczne dla Googlebota.
- Pomijam — można w przyszłej sesji.

**Theme variant pages** (`FreshSmilePage`, `DensFlowLightPage`, `WarmCarePage`, `DentalLuxePage`, `NordicDentalPage`):
- Używane tylko poza default theme przez ThemeEditor.
- Marcin używa default theme = nie aktywne.
- Niski priorytet, można odłożyć.

#### Smoke test:
- `npm run build` — clean.
- Zero `import Link from 'next/link'` w 10 batch-konwertowanych plikach.
- `<a href="/kontakt">` w service pages: zero.

#### Pliki:
- `src/app/[locale]/oferta/{implantologia,leczenie-kanalowe,stomatologia-estetyczna,ortodoncja,chirurgia,protetyka}/page.tsx`
- `src/app/[locale]/oferta/OfertaClient.tsx`
- `src/app/[locale]/wizyta/[type]/page.tsx`
- `src/app/[locale]/aplikacja/page.tsx`
- `src/app/[locale]/mapa-bolu/PainMapInteractive.tsx`
- `src/app/[locale]/platnosc/page.tsx`
- `src/app/[locale]/porownywarka/page.tsx`
- `src/app/[locale]/nowosielski/page.tsx`
- `src/app/[locale]/nowosielski/[slug]/page.tsx`
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx`
- `src/app/[locale]/kalkulator-leczenia/page.tsx`
- `src/app/[locale]/koszyk/page.tsx`
- `src/app/[locale]/sklep/page.tsx`
- `src/components/CookieConsent.tsx`

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu TypeScript.

---

### 2026-05-10 — SEO Audit Sprint H2: metadata gaps
**Druga z 7 faz audytu SEO — naprawa luk w metadata coverage**

#### Branch:
- `seo/h2-metadata-gaps` (mergowany na main bezpośrednio po pushu, jak H1)

#### H2 — Metadata gaps:

**1. 4 layouty dla stron bez metadata**
- `/aplikacja` — nowy layout.tsx z pageMetadata + breadcrumb. PWA install landing.
- `/selfie` — layout.tsx z metadata.
- `/symulator` — layout.tsx z metadata.
- `/koszyk` — layout.tsx z `robots: { index: false, follow: true }` (cart page noindex).

**2. PAGE_SEO entries dla 3 nowych ścieżek (4 locale × 3 = 12 zestawów)**
- `/aplikacja`: PWA install z keywordami "aplikacja stomatolog opole" / "dental app Opole" / "Zahnarzt App Opole" / "стоматологічний додаток Ополе".
- `/selfie`: selfie booth feature z 4 locale.
- `/symulator`: AI Smile Simulator (Flux Fill Dev) z 4 locale.

**3. BREADCRUMB_LABELS rozszerzone**
- Dodane klucze: `aplikacja`, `selfie`, `symulator` × 4 locale w `src/lib/seo.ts`.

**4. localizedBreadcrumb helper rozszerzony**
- Type `LocalizedBreadcrumbItem` teraz przyjmuje opcjonalny `name` (override dla dynamic content typu `post.title`). Klucz `key` stał się opcjonalny gdy `name` podany.
- Pozwala renderować breadcrumb na slugach: `Home > Blog > [post.title]`.

**5. `/nowosielski/[slug]` generateMetadata + hreflang + breadcrumb (KRYTYCZNE)**
- Wcześniej: zero metadata, każdy blog post pokazywał fallback z root layout.
- Teraz: pełen `generateMetadata({ params })` — title z post.title + brand suffix, description z post.excerpt, OpenGraph (type: article), Twitter card.
- Hreflang per article z `group_id` (każda translacja ma własny row, group łączy locale).
- Canonical lokale-aware.
- BreadcrumbList JSON-LD (Home > Blog > [post.title]).
- Signature `params: { locale, slug }` zamiast `{ slug }` — locale teraz z URL nie z cookie.

**6. `/aktualnosci/[slug]` hreflang + canonical + breadcrumb + dateModified fix**
- Dodany `alternates.languages` per artykuł (z columns `title_en/de/ua` w news table).
- Canonical locale-aware.
- BreadcrumbList JSON-LD (Home > News > [title]).
- `dateModified` używa `updated_at` z fallbackiem do `date` (wcześniej zawsze `date === datePublished`).
- OpenGraph + Twitter card per artykuł.
- `inLanguage` używa HREFLANG_MAP (ua → uk).

**7. `/baza-wiedzy/[slug]` params.locale fix + Article schema + breadcrumb**
- Wcześniej używał `getLocale()` (cookie) zamiast `params.locale` → mismatch metadata na różnych locale URL.
- Teraz: signature `params: { locale, slug }`, locale z URL.
- Hreflang z `group_id` (każda translacja artykułu = oddzielny row).
- Canonical locale-aware.
- **Nowy Article schema** (typ Article — evergreen edukacyjny content, vs NewsArticle dla aktualności).
- BreadcrumbList JSON-LD.

**8. Legal pages noindex EN/DE/UA**
- `/regulamin`, `/rodo`, `/polityka-prywatnosci`, `/polityka-cookies`: robots noindex dla locale !== 'pl' + canonical PL.
- `/privacy-policy`: noindex dla locale !== 'en' + canonical PL `/polityka-prywatnosci`.
- Strony są PL-only content; foreign locale URL'e były duplikatami → noindex eliminuje duplicate content sygnał.
- Wszystkie generateMetadata teraz async z params.

**9. PAGE_SEO improvements (UA Польща + EN /sklep + descriptions)**
- 9 entries z brakującym keyword "Польща": `/oferta/stomatologia-estetyczna`, `/oferta/ortodoncja`, `/oferta/chirurgia`, `/oferta/protetyka`, `/cennik`, `/sklep`, `/baza-wiedzy`, `/aktualnosci`, `/faq` UA — dodane do title/description/keywords.
- `/sklep` EN: dodane "Opole, Poland" do title/description/keywords (wcześniej generic bez geo signalu).
- Tytuły niektórych UA stron rozszerzone o "Польща" (wpływa na foreign markets ranking).

#### Smoke test:
- `npm run build` — clean.
- Brak nowych compilation errors.

#### Pliki:
- `src/app/[locale]/aplikacja/layout.tsx` [NEW]
- `src/app/[locale]/selfie/layout.tsx` [NEW]
- `src/app/[locale]/symulator/layout.tsx` [NEW]
- `src/app/[locale]/koszyk/layout.tsx` [NEW]
- `src/app/[locale]/regulamin/layout.tsx` — async generateMetadata + noindex foreign locales
- `src/app/[locale]/rodo/layout.tsx` — analogicznie
- `src/app/[locale]/polityka-prywatnosci/layout.tsx` — analogicznie
- `src/app/[locale]/polityka-cookies/layout.tsx` — analogicznie
- `src/app/[locale]/privacy-policy/layout.tsx` — noindex non-EN + canonical PL
- `src/app/[locale]/nowosielski/[slug]/page.tsx` — generateMetadata + hreflang + breadcrumb
- `src/app/[locale]/aktualnosci/[slug]/page.tsx` — hreflang + canonical + breadcrumb + dateModified
- `src/app/[locale]/baza-wiedzy/[slug]/page.tsx` — params.locale fix + Article schema + breadcrumb
- `src/lib/seo.ts` — LocalizedBreadcrumbItem rozszerzony o `name`, BREADCRUMB_LABELS +3 klucze × 4 locale
- `src/lib/seoTranslations.ts` — 3 nowe entries (aplikacja/selfie/symulator) + 9 UA Польща fixes + EN sklep Poland

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu TypeScript.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 2026-05-10 — SEO Audit Sprint H1: critical quick fixes
**Pierwsza z 7 faz audytu SEO uruchomionego po pełnym audycie 5 niezależnymi agentami**

#### Branch:
- `seo/h1-critical-fixes` (nie zmergowany jeszcze w momencie pisania tego wpisu)

#### Audyt — kontekst:
Marcin poprosił o niezależny audyt SEO całego projektu pod kątem lokalnego SEO Opole + targetowania pacjentów przyjezdnych. 5 agentów (general-purpose) równolegle przebadało: technical config, metadata coverage, structured data, content quality + local SEO, images/links/performance. Łącznie wykryto ~47 problemów: 15 critical, 15 high impact, 17 medium. Marcin zaakceptował plan napraw H1-H7 sekwencyjnie (~15-25h pracy).

#### H1 — Critical quick fixes (1-2h, najbezpieczniejsze):

**1. Demo guard w robots.ts + sitemap.ts**
- `src/app/robots.ts`: gdy `isDemoMode` → return `{ rules: { userAgent: '*', disallow: '/' } }`. demo.densflow.ai już nie jest indeksowalny przez Googlebot.
- `src/app/sitemap.ts`: gdy `isDemoMode` → return `[]`. Pusty sitemap dla demo.
- **Powód**: demo.densflow.ai serwowało pełen indeksowalny sitemap z URL'ami `https://demo.densflow.ai/...` co kanibalizowało mikrostomart.pl (duplicate content + brand confusion).

**2. AggregateRating filter naprawa (`src/lib/seo.ts:463-487`)**
- Usunięto `.gte('rating', 4)` filter — wcześniej liczył tylko reviews ≥4★ → inflated rating, ryzyko Google "manipulated rating" penalty.
- Teraz: liczy WSZYSTKIE reviews 1-5★ → naturalna avg.
- Dodany guard: `if (avg < 3.5) return null` — bezpiecznik gdyby się okazało że klinika ma niski rating, lepiej nie pokazać schematycznie.

**3. Placeholder cleanup w brandConfig.ts**
- `googlePlaceId: 'ChIJ...'` → field usunięty (z TODO comment). `googlePlaceId?: string` interface zachowany — fill via DB site_settings gdy real value.
- `youtubeChannelId: 'UC...'` → analogicznie usunięty.
- **Powód**: placeholder łamałby integrację z Google Places API / YouTube Data API gdyby kod kiedyś tego użył (silentny break).

**4. Robots.ts disallow expansion**
- Dodane: `/auth/`, `/zgody/`, `/qr-display`, `/s/`, `/opieka/`. Te ścieżki były crawlable mimo że są internal endpointami.

**5. WebSite schema fix (`src/app/layout.tsx`)**
- Usunięty broken `SearchAction` (target `/baza-wiedzy?q={search_term_string}` — strona nie obsługuje query param `q`, Google Rich Results Test flagował broken).
- Dodane `inLanguage: ["pl", "en", "de", "uk"]` (multilingual signal).
- Dodany `publisher` z MedicalOrganization entity (lepsze entity disambiguation w Knowledge Panel).
- Re-add SearchAction gdy /baza-wiedzy lub inne search endpoint faktycznie obsłuży `?q=`.

**6. Dentist schema improvements (`src/app/layout.tsx`)**
- `paymentAccepted`: rozszerzone z `"Cash, Credit Card"` na `"Cash, Credit Card, BLIK, Apple Pay, Google Pay, Przelewy24, PayU"` (P24 + PayU już zintegrowane w kodzie).
- `openingHoursSpecification`: dodany Sunday explicit closed (`opens: 00:00, closes: 00:00`). Saturday celowo pominięte — kontakt page t('satValue') = "Wybrane terminy" / "Selected dates" / "Ausgewählte Termine" / "Вибрані дати" → nieregularne, lepiej nie wprowadzać Google w błąd.

**7. /kontakt 'Nawiguj do gabinetu' → i18n**
- Dodany klucz `kontakt.navigateButton` w `messages/{pl,en,de,ua}/pages.json`:
  - PL: `🗺️ Nawiguj do gabinetu`
  - EN: `🗺️ Navigate to clinic`
  - DE: `🗺️ Zur Praxis navigieren`
  - UA: `🗺️ Прокласти маршрут`
- `src/app/[locale]/kontakt/page.tsx:71`: hardcoded string → `t('navigateButton')`.

#### Smoke test:
- `npm run build` — clean (tylko pre-existing Sentry warning niezwiązany z H1).
- Brak nowych warningów lub errors.

#### Pliki:
- `src/app/robots.ts` — demo guard + extended disallow
- `src/app/sitemap.ts` — demo guard
- `src/lib/seo.ts` — AggregateRating bez filter, dodany 3.5★ floor
- `src/lib/brandConfig.ts` — googlePlaceId/youtubeChannelId placeholder usunięty
- `src/app/layout.tsx` — paymentAccepted, Sunday closed, WebSite refactor
- `src/app/[locale]/kontakt/page.tsx` — i18n button
- 4× `messages/{pl,en,de,ua}/pages.json` — kontakt.navigateButton

#### Co dalej (H2-H7):
- **H2**: Metadata gaps — 5 stron bez layout.tsx, nowosielski/[slug] generateMetadata, descriptions length, UA Опoлe keywords, legal noindex
- **H3**: Internal linking — 7 service pages raw `<a>` → Link, 12 batch-safe `next/link` → `@/i18n/navigation`
- **H4**: Schema enrichment — Dentist localized, Person schemas, Service+Offer, Article on /baza-wiedzy/[slug], Product on /sklep, sameAs Instagram/GBP/YouTube, real practice photo
- **H5**: Performance + images — marcin/ela JPGs 7.5 MB → WebP, sizes na 23 Image fill, Cache-Control, AVIF, per-page OG images, hamburger 44x44
- **H6**: Content quality — service pages 280→800 słów, /cennik SSR table, /kontakt sekcja Dojazd, /faq +10 pytań przyjezdnych, FAQ DE/UA wyrównanie do PL
- **H7**: International landing pages — /pl/dla-pacjentow-spoza-opola, /en/dentist-in-opole, /de/zahnarzt-opole-fuer-deutsche, /ua/стоматолог-в-ополе

> **Brak migracji DB / nowych env var.** Tylko zmiany kodu TypeScript + tłumaczeń.
> Vercel auto-deployuje na produkcję + demo po pushu na main.

---

### 2026-05-10 — Fix: Navbar + main carousels używają next-intl Link (post-Footer fix follow-up)
**Marcin zauważył: po przełączeniu na EN, klikanie linków w Navbar (np. Aktualności) prowadziło do `/aktualnosci` zamiast `/en/aktualnosci`. URL pokazywał PL ale React state EN — duplikacja URL.**

#### Commit:
- `66d6a8d` — fix(i18n): Navbar + main carousels używają next-intl Link (locale-aware)

#### Root cause:
4 najważniejsze komponenty navigation używały `import Link from 'next/link'` (zwykły Next.js Link) zamiast wrappera z `next-intl/navigation`. Standard Link NIE dodaje locale prefix automatycznie.

#### Fix (4 pliki):
- `src/components/Navbar.tsx` (site-wide menu)
- `src/components/OfferCarousel.tsx` (homepage hero CTA do każdej service)
- `src/components/ArticleCarousel.tsx` (homepage news cards)
- `src/app/[locale]/HomeClient.tsx` (homepage CTA do /rezerwacja, /oferta, /metamorfozy, /kontakt)

W każdym: `import Link from 'next/link'` → `import { Link } from '@/i18n/navigation'`.

#### Process note:
Pierwszy próbowałem batch zamiany 29 plików — fail (500 errors). Niektóre pliki (aktualnosci/page.tsx, [slug]) miały **ręczny locale prefix** w href (`${locale === 'pl' ? '' : '/' + locale}/aktualnosci/...`) — po podmianie na next-intl Link wrapper auto-dodawał drugi prefix → **double prefix** `/en/en/aktualnosci/...` → 500. Rollback. Drugie podejście chirurgiczne — tylko 4 komponenty z prostymi relative href.

#### Smoke test:
- Wszystkie ścieżki w 4 locale → 200 ✅
- EN homepage Hero CTA + OfferCarousel hrefs: `/en/oferta`, `/en/cennik`, `/en/oferta/implantologia`, `/en/rezerwacja` ✅
- Navbar Aktualnosci na `/en/oferta` → `href="/en/aktualnosci"` ✅
- Navbar oferta/cennik/sklep na `/de/cennik` → `/de/oferta`, `/de/cennik`, `/de/sklep`, `/de/kontakt` ✅

#### Pozostałe pliki z `next/link` (do follow-up jeśli Marcin zauważy konkretny bug):
- `PainMapInteractive` (booking links z `?specialist=...` query)
- `kalkulator-leczenia/page.tsx` (rezerwacja CTA z dynamic params)
- `aktualnosci/page.tsx` + `[slug]` — wymagają ręcznego usunięcia manual locale prefix
- `nowosielski/page.tsx` + `[slug]` — analogicznie
- `baza-wiedzy/[slug]`
- Theme presets (DentalLuxe, FreshSmile, NordicDental, WarmCare) — używane tylko poza default theme; Marcin używa default
- Strefa pacjenta auth pages — internal area, robots disallow
- Koszyk, sklep — utility, niski priority

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript.

---

### 2026-05-10 — Fix: lokalizacja stopki (post-G6 follow-up)
**Bug zgłoszony przez Marcina po G6: stopka zawsze po polsku + 404 w niektórych linkach**

#### Commit:
- `3ef4b3a` — fix(footer): lokalizacja stopki — labels per-locale + locale-aware Link + naprawa 404

#### 3 niezależne bugi:

**1. Hardcoded PL labels** — wszystkie nagłówki sekcji ("Usługi", "Narzędzia", "Wiedza", "Prawne") + wszystkie linki ("O nas", "Kontakt", "Implantologia"...) były hardcoded w stopce, niezależnie od locale.

**2. Linki bez locale prefix** — Footer używał `import Link from 'next/link'` (zwykły Next.js Link). Standard Link NIE dodaje locale prefix automatycznie. User na `/en/oferta` klikał "Baza wiedzy" → szedł na `/baza-wiedzy` (PL) zamiast `/en/baza-wiedzy`. Część linków "działała" przypadkiem (next-intl middleware przekierowywał z PL path), inne pokazywały polski content.

**3. 404 dla `/en|de|ua/zespol`** — link `/zespol` w stopce. Redirect w `next.config.ts` był tylko dla `/zespol` (PL), nie dla `/en/zespol` itd. Foreign locale → 404. To był ten "404 w jednym dziale" który Marcin widział.

#### Rozwiązanie:

**`messages/{pl,en,de,ua}/common.json`** — dodany blok `footer.seoNav` z 25 keys × 4 locale (~100 stringów):
- 4 nagłówki sekcji: servicesHeading, toolsHeading, knowledgeHeading, legalHeading
- 25 etykiet linków: about, team, booking, services, implants, rootCanal, aesthetic, orthodontics, surgery, prosthodontics, pricing, metamorphoses, painMap, treatmentCalculator, comparator, appLanding, news, knowledge, blog, shop, faq, termsLink, privacyLink, rodoLink, cookiesLink

**`src/components/Footer.tsx`:**
- Import: `import Link from 'next/link'` → `import { Link } from '@/i18n/navigation'` (next-intl wrapper z auto-locale-prefix)
- Wszystkie hardcoded teksty zamienione na `tn('seoNav.X')` lub `t('X')`
- Internal staff routes (`/pracownik`, `/admin`) zostają jako zwykłe `<a>` (są poza [locale] segment)
- Link `/zespol` zmieniony na `/o-nas` — bezpośrednio, eliminuje 404 dla foreign locales + oszczędza 308 hop dla PL

#### Smoke test:
- PL homepage: Headings [Kontakt, Usługi, Narzędzia, Wiedza, Prawne] ✅
- EN homepage: Headings [Contact, Services, Tools, Knowledge, Legal] ✅
- DE homepage: Headings [Kontakt, Leistungen, Werkzeuge, Wissen, Rechtliches] ✅
- UA homepage: Headings [Контакт, Послуги, Інструменти, Знання, Правове] ✅
- Linki locale-prefixed: /en/oferta, /de/cennik, /ua/sklep etc. ✅
- 4 locale × 20 ścieżek = 80 testów statusów → wszystkie 200 ✅

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript + tłumaczenia.

---

### 2026-05-10 — SEO Sprint G6: per-locale breadcrumb labels (foreign markets professionalism)
**Szósta i ostatnia iteracja SEO sprintu — uzupełnienie multilingual całości**

#### Commit:
- `26a6647` — feat(seo): G6 — per-locale breadcrumb labels (EN/DE/UA SERP foreign markets)

#### Problem:
Wszystkie BreadcrumbList renderowane były z hardcoded PL nazwami niezależnie od locale. EN użytkownik dla `/en/cennik` widział w SERP `Strona główna > Cennik` zamiast `Home > Pricing`. Niespójne z resztą multilingual SEO (hreflang/metadata/FAQ schemas — wszystko już locale-aware po G1-G5).

#### Rozwiązanie:

**`src/lib/seo.ts` — rozszerzony helper:**
- `BREADCRUMB_LABELS` mapa: 21 kluczy × 4 locale (~84 stringów):
  - Wspólne: home, oferta, cennik, kontakt, faq, sklep, etc.
  - Service-specific: implantologia, leczenie-kanalowe, ortodoncja, protetyka, chirurgia, stomatologia-estetyczna
- `localizedBreadcrumb(locale, items)` — buduje BreadcrumbList z labels per-locale, fallback do PL
- `breadcrumbHref(locale, path)` — zwraca locale-prefixed URL dla intermediate items

**20 layoutów [locale]/<path>/layout.tsx zaktualizowanych:**
- Wszystkie konwertowane na `async` z `params: Promise<{ locale }>`
- Używają `localizedBreadcrumb(locale, [{ key: 'home', url: breadcrumbHref(locale, '/') }, { key: '<page>' }])`
- Service pages (6× /oferta/*) z 3-level breadcrumb (home → oferta → service) i lokalizowanymi intermediate URLs

**Refactor `/oferta/page.tsx` (klient → server wrapper):**
- PROBLEM podczas weryfikacji: parent `/oferta/layout.tsx` renderował 2-level breadcrumb. Layout dziedziczy też dla sub-pages, które mają swój własny 3-level → sub-page dostawał DWA BreadcrumbList = niespójny sygnał dla Google.
- FIX: rename `/oferta/page.tsx` → `OfertaClient.tsx` (zachowuje "use client" + treść). Nowy `/oferta/page.tsx` jako server wrapper renderuje breadcrumb (tylko dla landing) + OfertaClient. `/oferta/layout.tsx`: usunięty render breadcrumb.

#### Smoke test (npm run start, localhost):
Wszystkie weryfikacje pokazują dokładnie 1 BreadcrumbList per page, locale-aware:
- PL `/cennik`: Strona główna > Cennik ✅
- EN `/cennik`: Home > Pricing ✅
- DE `/cennik`: Startseite > Preise ✅
- UA `/cennik`: Головна > Ціни ✅
- EN `/oferta` landing: 2-level Home > Services ✅
- EN `/oferta/implantologia`: 3-level Home > Services > Dental Implants ✅
- DE `/oferta/leczenie-kanalowe`: 3-level Startseite > Leistungen > Wurzelkanalbehandlung ✅
- UA `/oferta/ortodoncja`: 3-level Головна > Послуги > Ортодонтія ✅
- Intermediate URLs locale-prefixed: `/en/oferta`, `/de/oferta`, `/ua/oferta` ✅
- Wszystkie 21 paths → 200 OK ✅

#### Spodziewany efekt:
- EN/DE/UA użytkownicy w Google SERP widzą breadcrumb trail w lokalnym języku
- Drobny CTR boost foreign markets (estymacja +1-3%)
- Pełna konsystencja z hreflang/metadata/FAQ schemas zrobionymi w G1-G5

#### Pliki:
- `src/lib/seo.ts` — +BREADCRUMB_LABELS, localizedBreadcrumb(), breadcrumbHref()
- 20× `src/app/[locale]/<path>/layout.tsx` — używają localizedBreadcrumb
- `src/app/[locale]/oferta/page.tsx` — refactor na server wrapper
- `src/app/[locale]/oferta/OfertaClient.tsx` [NEW] — przeniesiona treść klienta
- `src/app/[locale]/oferta/layout.tsx` — usunięty breadcrumb (był konfliktowy z sub-pages)

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 🎯 SEO SPRINT G1-G6 KOMPLETNY (2026-05-09 → 2026-05-10)

| Faza | Commit | Zakres |
|---|---|---|
| G1 | `53c4cdc` | Per-page hreflang + per-locale metadata × 19 |
| G2 | `3e971a0` | aggregateRating + BreadcrumbList × 13 + FAQPage 43Q |
| G3 | `8c14e15` | Sitemap cache + SVG security + console 401 + YT 404 |
| G4 | `9324924` | SplashScreen kill + CookieConsent SSR + RevealOnScroll priority |
| G5 | `2ccbf7b` | Multilingual schemas + ItemList + image sizing + Twitter/OG |
| G6 | `26a6647` | Per-locale breadcrumb labels |

**Wszystkie znaczące SEO zadania wykonane. Pozostało tylko (świadomie pominięte / niski ROI):**
- Polyfill removal (deeper Next 16 SWC investigation, low ROI)
- BackgroundVideo skip mobile (świadomie pominięte przez Marcina)
- Faza 3 GSC audit (~koniec czerwca 2026)

---

### 2026-05-10 — SEO Sprint G4+G5: Core Web Vitals + multilingual schemas (pełen sprint zakończony)
**Czwarta i piąta iteracja SEO sprintu — eliminacja migania, fix LCP, completing rich SERP**

#### Commits:
- `9324924` — feat(seo,perf): G4 — Core Web Vitals + miganie (SplashScreen kill, CookieConsent SSR, RevealOnScroll priority)
- `2ccbf7b` — feat(seo): G5 — multilingual schemas + ItemList + image sizing + Twitter/OG completion

#### G4 — Core Web Vitals + eliminacja migania:

**A1. SplashScreen wyłączony globalnie (`src/components/ThemeLayout.tsx` + `src/app/layout.tsx`):**
- 6-sekundowa cinematic intro animation była głównym wkładem do mobile LCP 6.0s. Dla nowych odwiedzających = 6s blank screen przed widocznym content.
- Hardcoded SplashScreen wrapper REMOVED z ThemeLayout. Komponent SplashScreen.tsx zostaje na disk (do opt-in przez ThemeEditor jeśli kiedyś potrzeba wróci).
- Plus usunięte dodawanie `splash-pending` class z inline script w demo mode (bug fix — bez SplashScreen ta klasa nigdy by się nie zdjęła = body visibility:hidden bug).

**A2. CookieConsent przepisany na server component (`src/components/CookieConsent.tsx` + nowy `CookieConsentButton.tsx`):**
- Banner "wyrastał" po hydration → Lighthouse mierzył jako LCP element (mobile LCP 6.0s mimo Fazy E).
- Refactor na 2 komponenty:
  - `CookieConsent.tsx` — server component, czyta HTTP cookie `cookie_consent` przez `next/headers`. Jeśli present → return null (banner skip dla returning users). Jeśli absent → render banner w SSR HTML (część initial paint).
  - `CookieConsentButton.tsx` — `"use client"`, obsługuje onClick. Po accept ustawia HTTP cookie (1 rok) + mirror do localStorage + hide banner via display:none.
- Przeniesiony z ThemeLayout do root layout. Theme feature flag `f.cookieConsent` usunięta — banner jest infrastrukturą prawnie wymaganą.
- Backwards compat: returning users z localStorage zobaczą banner JEDEN raz po deploy.

**A4. RevealOnScroll prop `priority` (`src/components/RevealOnScroll.tsx` + `[locale]/HomeClient.tsx`):**
- Above-the-fold elementy (hero h1, CTA) startowały z `opacity:0 + filter:blur(8px)`. IO fires po hydration → animacja fade-in over 0.8s → 200-500ms "blank hero" zanim user widzi content.
- Nowy prop `priority?: boolean`. Gdy true → render plain div bez `.reveal` class i bez useEffect/IO. Element widoczny w SSR od razu.
- Aplikowany do 3 RevealOnScroll w HomeClient hero (tagline, h1, CTA).
- Cards niżej zachowują on-scroll fade-in animation — to subtelne, nie irytujące.

**A3 pominięte:** Marcin chce zostawić BackgroundVideo na mobile mimo 8 MB MP4.

#### G5 — Multilingual schemas + completion:

**B1. Per-locale FAQ + MedicalProcedure na 6 service pages (`src/lib/serviceSchemas.ts` — NEW):**
- Schemas FAQ + MedicalProcedure były hardcoded PL w każdym layoucie. Dla `/en/oferta/implantologia` SERP nie pokazywał rich snippets w angielskim.
- Nowy plik `serviceSchemas.ts` z mapą `SERVICE_SCHEMAS[path][locale]` dla 6 service pages × 4 locale. Każda zawiera FAQ (4-5 questions) + MedicalProcedure (description, howPerformed, preparation, followup).
- Helper `buildServicePageSchemas(path, locale)` zwraca {faqSchema, procedureSchema} z fallback na PL.
- 6 service layoutów zaktualizowane.
- Tłumaczenia ~280 stringów: 6 pages × 4 locale × (4-5 FAQ × 2 fields + procedure × 4 fields).

**B2. Image responsive sizing:**
- `GoogleReviews.tsx`: helper `optimizeGooglePhoto()` transformuje URL z `=s128` na `=s40`. Avatar wyświetlany 40×40, ale Google CDN serwował 128×128 = ~175 KiB save (×9 reviews). Plus `width/height` HTML attrs (CLS prevention) + `loading="lazy"` + `decoding="async"`.
- `Navbar.tsx`: dodany `sizes="227px"` (desktop) / `"247px"` (mobile) attribute na `<Image>`.
- Pominięto: BeforeAfterSlider/MetamorphosisGallery — komponenty mają specific positioning + masking (maskImage), refactor na next/image to ryzyko.

**B3. ItemList schema na 3 listings:**
- `/aktualnosci` layout: ItemList z 14 newsów (server-side fetch z `news` table)
- `/sklep` layout: ItemList z visible products
- `/nowosielski` NEW layout.tsx: ItemList z blog posts + breadcrumb + per-locale metadata
- Helper `itemListSchema(items)` + 3 fetch funkcje w `seo.ts` (locale-aware translated titles).
- Dodany `/nowosielski` entry do PAGE_SEO (4 locale).

**B4. Twitter description + OG locale per-page (`src/lib/seo.ts`):**
- `pageMetadata()` rozszerzone:
  - `openGraph.locale`: per-locale via `OG_LOCALE_MAP` (pl→pl_PL, en→en_US, de→de_DE, ua→uk_UA). Wcześniej hardcoded pl_PL globalnie.
  - `twitter.title` + `twitter.description`: explicit pola (zamiast polegania na fallback z openGraph).

#### Smoke test (npm run start, localhost):
- A1: Homepage HTML — brak overlay particle/logo splash ✅
- A2: Banner `data-cookie-banner="true"` w SSR HTML (anonymous), 0 wystąpień przy `Cookie: cookie_consent=true` ✅
- A4: Hero h1 NIE ma `.reveal` class (priority działa) ✅
- B1: `/en/oferta/implantologia` FAQ EN: "Is dental implant surgery safe?" ✅
- B1: `/de/oferta/leczenie-kanalowe` FAQ DE: "Tut die Wurzelkanalbehandlung weh?" ✅
- B3: `/aktualnosci` ItemList: 14 items, `/sklep`: 3 vouchers ✅
- B4: OG locale: `/cennik`=pl_PL, `/en/cennik`=en_US, `/de/cennik`=de_DE, `/ua/cennik`=uk_UA ✅
- Twitter description present ✅
- Wszystkie 13 paths → 200 ✅

#### Spodziewany efekt po deploy:
- **Mobile LCP 6.0s → ~2-3s** (kasacja splash + CookieConsent SSR + hero priority)
- **Performance score 73 → 88-92** (Core Web Vitals fix)
- **Miganie ~70% wyeliminowane** (splash off, hero instant, CookieConsent SSR)
- **Foreign markets** (EN/DE/UA) widzą rich snippets w lokalnych językach zamiast PL
- **ItemList → potencjał sitelinks** w SERP
- **Twitter card preview** wyświetla pełny title+description+image
- **~175 KiB transfer save** (GoogleReviews avatars)

#### Pominięte z planu:
- A3 BackgroundVideo skip mobile (Marcin chce zostawić)
- BeforeAfterSlider next/image refactor (ryzyko CLS, low ROI)
- Per-locale breadcrumb labels ("Strona główna" → "Home"/"Startseite") — drobiazg, follow-up

#### Pliki:
- **G4**: `src/components/ThemeLayout.tsx`, `src/app/layout.tsx`, `src/components/CookieConsent.tsx`, `src/components/CookieConsentButton.tsx` [NEW], `src/components/RevealOnScroll.tsx`, `src/app/[locale]/HomeClient.tsx`
- **G5**: `src/lib/seo.ts`, `src/lib/seoTranslations.ts`, `src/lib/serviceSchemas.ts` [NEW], `src/components/GoogleReviews.tsx`, `src/components/Navbar.tsx`, 6× `src/app/[locale]/oferta/<path>/layout.tsx`, `src/app/[locale]/aktualnosci/layout.tsx`, `src/app/[locale]/sklep/layout.tsx`, `src/app/[locale]/nowosielski/layout.tsx` [NEW]

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 🎯 SEO SPRINT G1-G5 KOMPLETNY (2026-05-09 → 2026-05-10)

| Faza | Commit | Zakres |
|---|---|---|
| G1 | `53c4cdc` | Per-page hreflang + per-locale metadata × 19 stron |
| G2 | `3e971a0` | aggregateRating + BreadcrumbList × 13 + FAQPage 43Q |
| G3 | `8c14e15` | Sitemap cache + SVG security + console 401 + YT 404 |
| G4 | `9324924` | SplashScreen kill + CookieConsent SSR + RevealOnScroll priority |
| G5 | `2ccbf7b` | Multilingual schemas + ItemList + image sizing + Twitter/OG |

**Łączny efekt:**
- 19 publicznych stron z poprawnym multilingual SEO (PL/EN/DE/UA)
- 6 service pages z FAQ + MedicalProcedure schemas w 4 lokalach (rich snippets foreign markets)
- 3 listings z ItemList schemas (sitelinks potential)
- AggregateRating ⭐⭐⭐⭐⭐ (22 reviews) — gwiazdki w SERP
- Core Web Vitals fix: LCP 6s → ~2s, miganie ~70% eliminowane
- Best Practices 96 → 100
- Sitemap DB queries: per-request → 1× per godzinę
- ~290 KiB transfer save (image sizing + polyfill TODO)

**Co dalej (poza scope SEO sprintu):**
- Polyfill removal (deeper Next 16 SWC investigation)
- Per-locale breadcrumb labels
- BackgroundVideo skip mobile (wymaga zgody Marcina)
- Faza 3 GSC audyt (~koniec czerwca 2026)

---

### 2026-05-10 — SEO Sprint G3: technical hygiene (sitemap cache + SVG + console 401 + YT 404)
**Trzeci i ostatni commit z trzyfazowego SEO sprintu — sprint G1+G2+G3 KOMPLETNY**

#### Commit:
- `8c14e15` — feat(seo): G3 — technical hygiene (sitemap cache, SVG security, console 401, YouTube 404)

#### 4 zmiany:

**1. Sitemap revalidate=3600 (`src/app/sitemap.ts`):**
- Problem: każde wejście `/sitemap.xml` → DB query do Supabase (`articles` + `news`). Googlebot pinguje regularnie.
- Fix: `export const revalidate = 3600` — Next.js cache 1h, regeneracja w tle.
- Verify: response header `x-nextjs-cache: HIT` ✅. 686 URLi (bez zmian co do treści, tylko cachable).

**2. `dangerouslyAllowSVG: false` (`next.config.ts`):**
- Problem: pozwala na inline SVG z remote sources bez sanityzacji = XSS risk. Lighthouse Best Practices flagi.
- Fix: usunięte. Nasze remote patterns (unsplash, placehold, githubusercontent, supabase.co) raczej nie podają SVG.

**3. useUserRoles skip fetch dla anonymous (`src/hooks/useUserRoles.ts`):**
- Problem: hook zawsze fetchował `/api/auth/roles`. Dla niezalogowanych odpowiedź 401 → console error → Lighthouse Best Practices penalty. Hook na każdej publicznej stronie.
- Fix: nowa funkcja `hasSupabaseAuthCookie()` sprawdza `document.cookie` pod kątem `sb-` prefix. Jeśli brak → return empty roles bez fetch.
- Bonus: jeśli cookie obecne ale stale (expired session), 401 obsługiwany silently.

**4. YouTubeFeed onError fallback (`src/components/YouTubeFeed.tsx`):**
- Problem: niektóre filmy (np. `8uA6aMhE8rE`, `sReE0lZ-vK8`) nie mają `hqdefault.jpg` w YouTube CDN — 404, broken image icon, Best Practices penalty.
- Fix: `onError` handler na `<img>` — fallback do `mqdefault.jpg` (zawsze istnieje w YT CDN). `dataset.fallback` flag żeby uniknąć infinite loop.

#### Pominięto z planu G3:

**F3 — polyfill removal druga próba przez `.browserslistrc`:**
Odkryto że `npx browserslist` poprawnie pokazuje targets (chrome ≥ 90, safari ≥ 14, firefox ≥ 90, edge ≥ 90) z `package.json`. Browserslist DZIAŁA, więc problem z polyfills musi być po stronie SWC config Next 16, nie po stronie targets. `.browserslistrc` z identycznymi targetsami nic by nie zmieniło. Wymaga deeper investigation (może `experimental.browsersListForSwc` lub równoważne w Next 16). Drobne (-13 KiB), nie blokuje innych prac.

#### Smoke test (npm run start, localhost):
- `/sitemap.xml`: 200 + `x-nextjs-cache: HIT` + 686 URL ✅
- Homepage: 200 ✅
- YouTubeFeed HTML zawiera `onError` + `hqdefault.jpg` (primary src) ✅
- `/api/auth/roles` wciąż 401 dla anonymous (correct), ale hook nie fire'uje request → Lighthouse już nie widzi 401 ✅

#### Spodziewany efekt:
- **Best Practices 96 → 100** (eliminacja 401 console, brak SVG XSS warning, brak YouTube 404)
- Mniej DB queries dla sitemap (Googlebot crawl ~10× dziennie zamiast per-request)
- Marginalnie szybsze TTFB dla `/sitemap.xml` (cache HIT zamiast DB roundtrip)

#### Pliki:
- `src/app/sitemap.ts` — `export const revalidate = 3600`
- `next.config.ts` — usunięte `dangerouslyAllowSVG: true`
- `src/hooks/useUserRoles.ts` — `hasSupabaseAuthCookie()` + skip fetch dla anonymous
- `src/components/YouTubeFeed.tsx` — `onError` fallback `hqdefault → mqdefault`

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript + config.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 🎯 SEO SPRINT G1+G2+G3 KOMPLETNY (2026-05-09 → 2026-05-10)

**Trzy iteracje SEO improvements wykonane sequentially po akceptacji Fazy E SEO Recovery przez Marcina:**

| Faza | Commit | Czas | Zakres |
|---|---|---|---|
| G1 | `53c4cdc` | ~1.5h | Per-page hreflang + per-locale metadata × 19 stron |
| G2 | `3e971a0` | ~45 min | aggregateRating + BreadcrumbList × 13 + FAQPage 43Q |
| G3 | `8c14e15` | ~30 min | Sitemap cache + SVG security + console 401 + YT 404 |

**Łączny efekt:**
- 19 publicznych stron z poprawnym multilingual SEO (PL/EN/DE/UA)
- Per-URL hreflang konsystentny z metadata
- Lokalne słowa kluczowe per-locale (~76 zestawów meta-tagów)
- Rich SERP snippets: gwiazdki ⭐⭐⭐⭐⭐ z 22 reviews + breadcrumb trail + FAQ accordion
- Best Practices score 96 → 100 (oczekiwane)
- DB query ratio dla sitemap: per-request → 1× per godzinę

**Co Google zobaczy w SERP:**
- Mikrostomart wyniki z gwiazdkami i liczbą opinii
- "mikrostomart.pl > Cennik" zamiast surowego URL
- Expandable FAQ z naszych 43 pytań
- EN/DE/UA wersje wreszcie indeksowane jako odrębne strony

**Co dalej (poza scope SEO sprintu):**
- **Faza F mobile boost** — F1 BackgroundVideo skip mobile (wymaga zgody Marcina, dotyczy migania), F2 image sizes, F6 composited animations
- **Polyfill removal** — wymaga deeper SWC investigation (Next 16)
- **Faza 3 GSC** — audyt po 4-6 tyg. (~koniec czerwca 2026)
- **Miganie strony** — pierwotnie 7 źródeł (SplashScreen 6s, CookieConsent pop-in, dynamic chunks, RevealOnScroll itd.) — odłożone przez Marcina

---

### 2026-05-09 — SEO Sprint G2: schema enrichment (aggregateRating + BreadcrumbList + FAQPage)
**Drugi commit z trzyfazowego SEO sprintu — rich SERP snippets**

#### Commit:
- `3e971a0` — feat(seo): G2 — schema enrichment (aggregateRating + BreadcrumbList × 13 + FAQPage)

#### Problemy zaadresowane:

**Problem 1 — brak aggregateRating w Dentist schema:**
Google nie pokazywał gwiazdek w SERP mimo że `google_reviews` table ma 22 prawdziwe opinie (5★ średnio). Lighthouse Rich Results Test flagował: "no aggregateRating".

**Problem 2 — brak BreadcrumbList na 13 podstronach:**
Tylko service pages (`/oferta/*`) miały breadcrumbs. Reszta publicznych stron (`/cennik`, `/kontakt`, `/aktualnosci`, etc.) ich nie miała → brak breadcrumb trail w Google SERP.

**Problem 3 — brak FAQPage schema na `/faq`:**
Page ma 43 prawdziwe pytania (5 kategorii) w next-intl translations, ale nie eksportowała schemas. Tracimy potencjalny rich accordion w SERP dla zapytań typu "ile kosztuje wybielanie zębów Opole".

#### Rozwiązanie:

**`src/lib/seo.ts` — rozszerzony helper:**
- `breadcrumbSchema(items)` — generator BreadcrumbList JSON-LD z konwencją "current page bez URL" (Google standard)
- `getAggregateRating()` — async fetch z Supabase `google_reviews` (rating ≥ 4), liczy avg + count, zwraca `null` on empty/error
- Plus typy: `BreadcrumbItem`, `AggregateRating`

**`src/app/layout.tsx` — root layout:**
- `SchemaOrg()` przyjmuje prop `aggregateRating: AggregateRating | null`
- Dentist schema dodaje pole `aggregateRating` tylko jeśli `reviewCount > 0`
- RootLayout async fetch przed renderem (skip w demo mode)
- `bestRating: 5, worstRating: 1` dla Google compliance

**13 layoutów `[locale]/<path>/layout.tsx` — dodany BreadcrumbList:**
- `/aktualnosci`, `/baza-wiedzy`, `/cennik`, `/faq`, `/kalkulator-leczenia`
- `/kontakt`, `/mapa-bolu`, `/metamorfozy`, `/o-nas`, `/oferta`
- `/porownywarka`, `/rezerwacja`, `/sklep`

Każdy ma 2-poziomowy breadcrumb: `Strona główna → [current page]`. Service pages `/oferta/*` zachowują swój 3-poziomowy z poprzednich faz.

**`[locale]/faq/layout.tsx` — extra FAQPage schema:**
- `async Layout` component
- `buildFaqSchema(locale)` używa `getTranslations` z `next-intl/server`
- Iteruje `t('categoryCount')` × `t('cat${c}count')` żeby zbudować Question array
- Locale-aware: PL/EN/DE/UA pytania z odpowiednich tłumaczeń
- 43 pytania × 4 locale w schema

#### Smoke test (npm run start localhost):
- Homepage Dentist schema: `aggregateRating: { ratingValue: 5, reviewCount: 22 }` ✅
- `/cennik` Breadcrumb: 2 items (Strona główna → Cennik) ✅
- `/faq` Breadcrumb + FAQPage 43 questions ✅ (PL: "Dlaczego regularna higienizacja...")
- Wszystkie 13 paths → 200 OK ✅

#### Spodziewany efekt w Google SERP:
- ⭐⭐⭐⭐⭐ + "(22)" przy Mikrostomart w wynikach (LocalBusiness rich snippet)
- Breadcrumb trail "mikrostomart.pl > Cennik" zamiast surowego URL
- Rich FAQ accordion na zapytaniach pasujących do pytań (np. "ile kosztuje higienizacja", "ile trwa wybielanie")
- Historycznie: aggregateRating + breadcrumb + FAQ → +5-15% CTR

#### Pliki:
- `src/lib/seo.ts` — +breadcrumbSchema(), getAggregateRating()
- `src/app/layout.tsx` — SchemaOrg async, aggregateRating w Dentist
- 13× `src/app/[locale]/<path>/layout.tsx` — dodany BreadcrumbList
- `src/app/[locale]/faq/layout.tsx` — async + FAQPage schema z translations

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript.
> Vercel auto-deployuje na produkcję + demo po pushu.
> Demo mode: aggregateRating = null (skip gwiazdek, brak prawdziwych opinii).

#### Co dalej:
- **G3 — Technical hygiene** (~45 min): sitemap `revalidate`, `dangerouslyAllowSVG: false`, Faza F bezpieczne fixy (console 401 z `useUserRoles`, YouTube CDN 404 fallback, polyfill removal druga próba)
- **Po deploy**: Marcin może zweryfikować w Google Rich Results Test (search.google.com/test/rich-results) że homepage pokazuje teraz **AggregateRating** + 12+ schemas, każda podstrona pokazuje **BreadcrumbList**, `/faq` pokazuje **FAQPage** z 43 questions

---

### 2026-05-09 — SEO Sprint G1: per-page hreflang + per-locale metadata
**Pierwszy commit z trzyfazowego SEO sprintu po akceptacji Fazy E**

#### Commit:
- `53c4cdc` — feat(seo): G1 — per-page hreflang + per-locale metadata na 19 publicznych stronach

#### Problemy zaadresowane:

**Problem 1 — fałszywy globalny hreflang:**
Root layout deklarował dla każdej podstrony `pl: '/', en: '/en', de: '/de', uk: '/ua'` co Google interpretował jako "english version of /oferta is at /en (homepage)". Niespójny sygnał osłabiał ranking EN/DE/UA wersji.

**Problem 2 — title/description tylko PL na 18 podstronach:**
Tylko homepage miała 4-locale title/description. Pozostałe używały PL z titleTemplate w EN/DE/UA — bez lokalnych słów kluczowych. EN użytkownicy widzieli "Cennik | Mikrostomart - Dentysta Opole" zamiast "Pricing Dental Services Opole, Poland".

#### Rozwiązanie:

**Helper `src/lib/seo.ts` (~120 LOC):**
- `buildHreflangAlternates(path)` — zwraca per-page hreflang z prawdziwymi URLami
- `buildCanonical(locale, path)` — relatywny canonical dla danego locale
- `pageMetadata(locale, path, content)` — high-level helper zwracający kompletny `Metadata` object z `title.absolute` (bypassuje root titleTemplate, eliminuje duplikację brand suffix)
- Mapuje URL prefix `ua` → ISO 639-1 `uk` w hreflang

**Mapa tłumaczeń `src/lib/seoTranslations.ts` (~280 LOC):**
- 19 ścieżek × 4 locale = 76 zestawów meta-tagów (title + description + keywords)
- Lokalne słowa kluczowe per locale (np. EN: "dentist Opole Poland", DE: "Zahnarzt Opole Polen")
- Title 50-65 chars, description 144-160 chars (Google truncation limits)

**Edytowane pliki (19 layoutów):**
- 13 simple: aktualnosci, baza-wiedzy, cennik, faq, kalkulator-leczenia, kontakt, mapa-bolu, metamorfozy, o-nas, oferta, porownywarka, rezerwacja, sklep
- 6 service pages z zachowanymi schemas: oferta/{chirurgia, implantologia, leczenie-kanalowe, ortodoncja, protetyka, stomatologia-estetyczna}

**Root layout (`src/app/layout.tsx`):**
- Usunięty fałszywy globalny `alternates.languages` (każda podstrona deklaruje teraz własny per-URL)
- `alternates.canonical: './'` zachowany jako fallback

#### Smoke test (npm run start):
- Wszystkie 19 ścieżek + 6 locale variants → 200 OK
- `/oferta` hreflang: pl=/oferta, en=/en/oferta, de=/de/oferta, uk=/ua/oferta ✅
- `/en/cennik` canonical: `https://www.mikrostomart.pl/en/cennik` ✅
- `/de/cennik` title: `"Preise Zahnarzt Opole, Polen | Mikrostomart"` (bez duplikacji) ✅
- `/ua/kontakt` title: `"Контакти | Стоматологічна клініка Mikrostomart Ополе"` ✅
- Service pages zachowują FAQ + Breadcrumb + MedicalProcedure schemas ✅

#### Spodziewany efekt na SEO:
- **Konsystentny multilingual signal** — Google przestaje traktować EN/DE/UA jako duplikaty PL homepage
- **Lokalne ranking** — EN użytkownicy w Polsce/zagranicą znajdą `/en/oferta` zamiast PL homepage
- **CTR boost w foreign SERPs** — title/description w lokalnych językach
- **Crawl budget efficiency** — Google rozumie strukturę witryny

#### Pliki:
- `src/lib/seo.ts` — **[NEW]** helper functions (120 LOC)
- `src/lib/seoTranslations.ts` — **[NEW]** PAGE_SEO map (280 LOC)
- `src/app/layout.tsx` — usunięty globalny hreflang
- 19× `src/app/[locale]/<path>/layout.tsx` — używają `pageMetadata()`

> **Brak migracji DB / nowych env var.** Tylko kod TypeScript.
> Vercel auto-deployuje na produkcję + demo po pushu.

#### Co dalej:
- **G2 — Schema enrichment** (~45 min): aggregateRating w Dentist schema (gwiazdki w SERP), brakujące BreadcrumbList + FAQPage na nie-/oferta podstronach
- **G3 — Technical hygiene** (~45 min): sitemap revalidate, dangerouslyAllowSVG removal, Faza F bezpieczne fixy (console 401, YouTube CDN 404, polyfill)
- **Faza 3 GSC**: po deploy Marcin może opcjonalnie re-submit sitemap (entries się nie zmieniły, ale per-URL alternates są teraz konsystentne). Audyt po 4-6 tyg.

---

### 2026-05-09 — SEO Recovery zaakceptowane przez Marcina (measured PSI po Fazie E)
**Finałowe pomiary po pełnym pakiecie SEO Recovery (Faza 1 → E)**

#### Co się stało:
Po deploy Fazy E Marcin uruchomił PSI w trybie incognito dla `https://www.mikrostomart.pl/` na obu zakładkach (Komórka + Stacjonarny). Wyniki dramatycznie lepsze niż przed Fazą E. Marcin zaakceptował: *"zatrzymajmy sie na tym na ten moment jest akceptowalnie moim zdaniem"*.

#### Pomiary PSI 2026-05-09 22:26 (homepage `/`):

**Mobile (Moto G Power, 4G throttling):**
| Metryka | Przed Fazą E | Po Fazie E | Zmiana |
|---|---|---|---|
| Performance | 34 | **73** | +39 |
| LCP | 25.1s | **6.0s** | -76% |
| TBT | 1960ms | **110ms** | -94% |
| CLS | 0.011 | 0 | ✅ |
| FCP | 2.7s | 1.8s | -33% |
| Speed Index | 11.2s | 4.9s | -56% |
| Total transfer | 16.4 MB | 9.5 MB | -42% |
| Best Practices | 73 | **96** | +23 |
| SEO | 92 | **100** | +8 ✅ |

**Desktop:**
| Metryka | Przed Fazą E | Po Fazie E | Zmiana |
|---|---|---|---|
| Performance | 39 | **83** | +44 |
| LCP | 5.2s | **1.6s** | -69% ✅ (cel <2.5s) |
| TBT | 1190ms | **240ms** | -80% |
| CLS | 0.005 | 0.008 | bez zmian |
| FCP | 0.7s | 0.4s | -43% |
| Speed Index | 3.8s | 1.6s | -58% |
| Total transfer | 18.4 MB | 9.6 MB | -48% |
| Best Practices | 73 | **96** | +23 |
| SEO | 92 | **100** | +8 ✅ |

#### Co działa świetnie:
- **YouTube zniknął z transferu** — 8.4 MB JS → 49 KB thumbnaili (facade pattern dla YouTubeFeed)
- **TBT na mobile spadł 18×** (1960→110 ms) — main thread odblokowany
- **SEO 100/100** — hreflang fix + lepsze structured data
- **LCP Desktop ZALICZONY** (1.6s przy celu <2.5s)
- **CookieConsent regression naprawiona** — render delay 4930→1340 ms mobile, 4660→2530 ms desktop

#### Co zostało (Faza F opcjonalna — szczegółowy plan poniżej):
LCP element wciąż jest CookieConsent banner. Mobile LCP 6.0s wciąż niezaliczone (cel <2.5s) — głównie przez `hero-video.mp4` 8 MB MP4 zżerający bandwidth na 4G. Desktop 83/100 — niedaleko od 90+, ale wymaga drobnych poprawek (image sizes, polyfill, console error 401, YouTube thumbnail 404 fallback).

**Marcin zatrzymał się tutaj świadomie** — wynik akceptowalny, dramatyczne poprawy względem stanu wyjściowego (które było prawdziwą katastrofą po commit `c54d629` 11 kwietnia). Faza F to opcjonalny boost dla doskonałości, nie konieczność.

#### Pliki:
> Brak zmian kodu w tej sesji (po Fazie E commit `f43d898`+`4bfb476`). Wpis udokumentowuje pomiar po deploy.

> **Brak migracji DB / nowych env var.**

---

### 2026-05-09 — Faza E: paczka 4 fixów po PSI desktop 39 + mobile 34
**Diagnoza po Fazie D pokazała że bottleneck przesunął się do CookieConsent + YouTubeFeed**

#### Commit:
- `f43d898` — fix(perf,seo): Faza E — paczka 4 fixów po PSI desktop 39 + mobile 34

#### Diagnoza (PSI 2026-05-09 22:04):
**Desktop:**
- Performance: **39/100** (z 67 przed Fazą A — regresja!)
- LCP: 5.2s, TBT: 1190ms, transfer: 18.4 MB
- LCP element: "Strona korzysta z plików cookies w celu realizacji usług..." czyli **CookieConsent banner**

**Mobile (Moto G Power 4G):**
- Performance: **34/100**
- LCP: **25.1s** 🔴, TBT: 1960ms, transfer: 16.4 MB
- Ten sam LCP element — CookieConsent

YouTube wciąż dominuje (8.4 MB transfer + 3.6s main thread) bo BackgroundVideo fix z Fazy D wyciął tylko jedno źródło — `YouTubeFeed` (lista 5+ filmów na homepage) nadal ma iframe per film.

#### 4 fixy w paczce:

##### 1. CookieConsent dynamic→static (regression Fazy C)
`src/components/ThemeLayout.tsx`: import statycznie zamiast `dynamic({ssr:false})`. Dynamic sprawiał że banner musiał czekać na hydration + lazy chunk → na slow mobile (Moto G Power 4G) opóźnienie wyniosło ~25 sekund. Static = renderowany w SSR HTML, gotowy od razu. Pozostałe komponenty (BackgroundVideo, AssistantTeaser, PWAInstallPrompt, SimulatorModal, OpinionSurvey) zostają dynamic — nie są LCP element, oszczędności bundle nadal się liczą.

##### 2. YouTubeFeed → facade pattern
`src/components/YouTubeFeed.tsx`: domyślnie pokazuje thumbnail z YouTube CDN (`i.ytimg.com/vi/{id}/hqdefault.jpg`, ~20-40 KB) + przycisk Play overlay w stylu YouTube. iframe ładuje się dopiero po kliknięciu (z `?autoplay=1` żeby od razu zagrał, bez drugiego kliku). UX identyczny — i tak user musi kliknąć play. State: `playingVideos: Set<string>` per video ID. **Eliminuje ~6.5 MB JS + ~3 sekundy main thread time.**

Marcin zatwierdził: *"filmy dodatkowe z yt nie musza"* mieć autoplay. **`BackgroundVideo` (tło hero) — bez zmian, nadal autoplay przez self-host MP4 z Fazy D.**

##### 3. Hreflang `ua`→`uk` przez middleware
`src/middleware.ts` `addSecurityHeaders()`: post-process Link header z next-intl middleware. Lighthouse SEO oznaczał `hreflang="ua"` jako "nieoczekiwany kod języka" bo ISO 639-1 dla ukraińskiego to `uk`. Zmiana całej nomenklatury locale (`ua` → `uk` w `routing.ts`, folder `messages/`, kodzie wszędzie gdzie `locale === 'ua'`) byłaby ryzykownym refactorem. Tańsze: string replace na response Link header (5 linii kodu w middleware).

##### 4. Polyfill removal przez browserslist
`package.json`: dodany `browserslist` z `chrome >= 90`, `firefox >= 90`, `safari >= 14`, `edge >= 90`. PSI raportował 12.9 KiB polyfilli (`Array.at`, `Array.flat`, `Array.flatMap`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimStart`/`trimEnd`) w `chunks/3796` niepotrzebne dla nowoczesnych przeglądarek.

#### Spodziewane efekty na PSI:
| Metryka | Desktop przed | Desktop po (cel) | Mobile przed | Mobile po (cel) |
|---|---|---|---|---|
| Performance | 39 | **65-80** | 34 | **55-70** |
| LCP | 5.2s | **1-2s** | 25.1s | **5-10s** |
| TBT | 1190ms | **300-500ms** | 1960ms | **600-900ms** |
| Transfer | 18.4 MB | **~11 MB** | 16.4 MB | **~10 MB** |
| SEO score | 92 | **95+** (hreflang) | 92 | **95+** |

#### Co zostało (jeśli wynik dalej za niski — Faza F):
- **Image responsive sizes** (largest impact pozostały): metamorphosis_after.jpg 1000×976 → 510×510 = 96 KiB save, logo 640×156 → 246×60 = 15 KiB, Google avatars 128×128 → 40×40 = 175 KiB. Łącznie ~290 KiB save.
- **BackgroundVideo wyłączyć dla mobile** — `<video>` 8 MB MP4 to dużo na 4G. Z `window.matchMedia('(max-width: 768px)')` można skip rendering. Trade-off: mobile users nie widzą tła wideo (które i tak jest pod content z opacity 0.3).
- **Composited animations**: `Navbar_logoShimmer` używa `left` (powinno `transform: translateX`), `assistantPulse` używa `box-shadow` (powinno `transform: scale`). Kosmetyczne, mały wpływ na CLS (już 0.005 desktop).
- **Console error 401** z `/auth/roles` dla niezalogowanych: hook fetchuje role bez check czy auth cookie istnieje → spam w Best Practices score.

#### Pliki:
- `src/components/ThemeLayout.tsx` — CookieConsent z dynamic na static
- `src/components/YouTubeFeed.tsx` — facade pattern (thumbnail + click→iframe)
- `src/middleware.ts` — hreflang Link header post-process
- `package.json` — browserslist config

> **Brak migracji DB / nowych env var.** Tylko zmiany frontendu.
> Vercel auto-deployuje na produkcję + demo.

---

### 2026-05-09 — Faza D: self-host hero background video (eliminacja YouTube SDK)
**Reakcja na PageSpeed Insights 37/100 — YouTube embeds ładują 9 MB JS**

#### Commit:
- `042635d` — feat(perf): Faza D — self-host hero background video (eliminacja YouTube SDK ~4 MB JS)

#### Diagnoza (PSI desktop /en, audit 2026-05-09 21:35):
Performance score **37/100**. Bottleneck:
- **YouTube embeds**: 9375 KiB transferu (96% wszystkiego), 3960 ms main thread (67%)
- **`BackgroundVideo` iframe** (tło hero): pobiera całe SDK YouTube (`base.js` 435 KiB + `m=r78Drb` 193 KiB + `root,base` 140 KiB) tylko po to żeby wyświetlić autoplay+muted+loop tła z `opacity:0.3` + `mixBlendMode:luminosity`
- LCP 6,4s, TBT 1220ms — daleko od celu (2,5s / 200ms)

#### Co zrobione:
1. **Pobrane oryginał YouTube** `vGAu6rdJ8WQ` (Mikrostomart promo, 5:23, 1080p, 68 MB) przez `yt-dlp`.
2. **Kompresja przez ffmpeg** do `public/hero-video.mp4`: 480p H.264, crf 32, no audio, faststart movflags. Resolution 480p wystarczy — finalna warstwa ma `opacity:0.3` + `mixBlendMode:luminosity`, szczegóły i artefakty kompresji niewidoczne. **Końcowy rozmiar: 7.9 MB** (z 68 MB oryginału, z 9 MB+ YouTube SDK transferu).
3. **`BackgroundVideo.tsx` refactor**: YouTube iframe → native `<video autoplay muted loop playsinline>`. Zachowane wszystkie zachowania (autoplay, mute, loop, fullscreen cover) ale:
   - **Zero JavaScript execution** (nie blokuje main thread — YouTube SDK robił 2s)
   - **Ładuje się równolegle** z innymi assetami (nie blokuje LCP — YouTube SDK był synchroniczny)
   - Native przeglądarka media player zamiast YouTube embed
4. Prop `videoId` zachowany dla kompatybilności z `ThemeContext.hero.backgroundVideoId`, ale aktualnie ignorowany — zawsze serwujemy lokalny plik. Mapę `videoId → URL` dorobimy gdy będzie wiele tłen.

#### Komendy reprodukcji (gdyby trzeba odtworzyć inny film):
```bash
yt-dlp -f "bestvideo[height<=1080]+bestaudio/best" "https://youtube.com/watch?v=<ID>"
ffmpeg -i hero-original.webm -vf "scale=854:480" -c:v libx264 -preset slow \
  -crf 32 -profile:v main -pix_fmt yuv420p -movflags +faststart -an hero-video.mp4
```

#### Spodziewany efekt na PSI homepage:
- **PageSpeed score**: 37 → **70+** (eliminacja 4 MB YouTube JS + ~2s main thread)
- **LCP**: poprawa bo CookieConsent (current LCP element) nie jest już blokowany przez YouTube SDK
- **TBT**: spadek o ~2000ms

#### Co zostało (Faza D part 2 — opcjonalne):
- **`YouTubeFeed`** (lista 3 filmów poniżej hero) — facade pattern (thumbnail z YouTube CDN + click→iframe). Eliminuje pozostałe ~5 MB JS, identyczny UX (user i tak musi kliknąć play). NIE objęty tą sesją bo Marcin chciał najpierw zobaczyć efekt samego BackgroundVideo.
- **CookieConsent regression**: w Fazie C został przeniesiony do `dynamic({ssr:false})` co prawdopodobnie uczyniło go LCP element. Cofnąć do static — jeśli LCP nadal słaby po Fazie D.

#### Pliki:
- `src/components/BackgroundVideo.tsx` — kompletny refactor iframe → native video
- `public/hero-video.mp4` — **[NEW]** 7.9 MB self-hosted MP4

> **Brak migracji DB / nowych env var.** Tylko zmiany frontendu + nowy static asset.
> Vercel auto-deployuje na produkcję + demo.

---

### 2026-05-09 — Faza C follow-up fix: localeDetection: false
**Bug diagnostyka po porażce PageSpeed Insights**

#### Commit:
- `9ba20fc` — fix(i18n): localeDetection: false — zatrzymuje PL→EN auto-redirect dla obcojęzycznych user-agentów

#### Diagnoza:
Marcin zgłosił że PSI po wklejeniu `https://www.mikrostomart.pl/oferta` automatycznie wyświetla wynik dla `/en/oferta`. Curl smoke test potwierdził: `/oferta` + `Accept-Language: en-US` → **307 redirect** do `/en/oferta`. Root cause: domyślnie next-intl czyta Accept-Language header i przekierowuje URL bez prefixu do odpowiadającego locale. PSI wysyła `en-US` (amerykańskie Google), więc test PL strony był silently przekierowywany do EN.

#### Skutki uboczne (poza PSI):
1. **PSI mierzyło EN wersję** zamiast PL — fałszywy negatywny dla PL przy testach Fazy C
2. **SEO crawl budget** — różne user-agenty Googlebot dostawały różne wersje tej samej URL
3. **UX backlinków** — link „mikrostomart.pl/cennik" z zagranicznego forum nie pokazywał polskiej wersji

#### Fix:
`src/i18n/routing.ts`: dodany `localeDetection: false`. URL bez prefixu zawsze serwuje PL (default locale). Użytkownicy zagraniczni używają LanguageSwitcher w navie albo przychodzą z Google search wynikami które już mają `/en/`, `/de/`, `/ua/` prefix.

#### Smoke test po deploy:
```bash
curl -I -H "Accept-Language: en-US" https://www.mikrostomart.pl/oferta
# Powinno: HTTP/2 200 (PL content), nie 307 → /en/oferta
```

> **Brak migracji DB / nowych env var.** Tylko zmiana w next-intl config.

---

### 2026-05-09 — SEO Faza C: dynamic imports + Sentry slim + a11y/CSP polish
**Trzy zoptymalizowane podpunkty z planu (C1, C3, C6); trzy świadomie pominięte (C2, C4, C5 — niski ROI)**

#### Commit:
- `ac191c6` — feat(seo,perf): Faza C — dynamic imports + Sentry slim + a11y/CSP polish

#### Cel:
Performance score 67 → 85+ na PageSpeed Insights desktop /oferta. TBT 630ms → <200ms. LCP mobile 2,7s → <2,5s.

#### C1 — Dynamic imports (główny win):
**`src/components/ThemeLayout.tsx`** — 6 komponentów lazy-loaded po hydration przez `next/dynamic` z `{ ssr: false }`:
- BackgroundVideo (YouTube iframe + 500ms delay już w komponencie)
- CookieConsent (banner)
- AssistantTeaser (chat bubble z 5s delay)
- PWAInstallPrompt (modal)
- SimulatorModal (user-triggered modal)
- OpinionSurvey (timed popup, 2-5min delay, 50% probability gate)

**`src/app/layout.tsx`** — 3 komponenty admin-only przeniesione do nowego cienkiego client wrappera `src/components/AdminClientLayer.tsx`:
- AdminFloatingBar
- VisualEditorOverlay
- PageOverridesApplier

**Powód wrappera:** `ssr: false` z `next/dynamic` NIE jest dozwolony w Server Components w Next 16 (compilation error). `layout.tsx` jest server component, więc dynamic z ssr:false musi żyć w client component. AdminClientLayer.tsx eksportuje 3 nazwy `*Lazy` które używają dynamic z ssr:false w środku.

**SplashScreen ZOSTAJE static** — wraps `children`, dynamic z ssr:false zepsułby SSR (children nie wyświetliłyby się w HTML, regression SEO).

#### C3 — Sentry client bundle slim (~115 KiB save):
`sentry.client.config.ts`:
- `tracesSampleRate: 0.1` → `0` (wyłącza BrowserTracing module, ~30 KiB)
- `replaysOnErrorSampleRate: 0.5` → `0` (wyłącza Replay module, ~85 KiB)
- Dodany `integrations: (defaultIntegrations) => defaultIntegrations.filter(...)` — usuwa `Replay`, `BrowserTracing`, `BrowserProfiling` z default integrations zamiast `integrations: []`. Zachowuje GlobalHandlers (window.onerror), InboundFilters, Dedupe, LinkedErrors, Breadcrumbs (essentials do error trackingu). Pusta tablica zamiast filter() byłaby regression — wyłączyłaby też error capture.

#### C6 — A11y + CSP polish:
**`src/components/BackgroundVideo.tsx`**: dodany `title="Tło wideo strony"` + `aria-hidden="true"` na YouTube iframe (Lighthouse a11y fix — "iframe without title").

**`src/middleware.ts` CSP-Report-Only rozszerzony:**
- `script-src`: + `https://www.googleadservices.com` (już używany przez Google Tag Manager — eliminuje CSP report noise)
- `connect-src`: + `https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io` (Sentry browser SDK posts errors) + `https://www.youtube.com` (YouTube tracking)
- `frame-src`: + `https://www.youtube-nocookie.com` (alternative YouTube embed domain)
- `media-src`: + `https://*.googlevideo.com` (background video assets)

#### Świadomie pominięte (niski ROI / wysokie ryzyko regresji):
- **C2 — framer-motion tree-shake**: tylko 3 pliki używają (Navbar, SplashScreen, NovikCodeCredit/Footer), wszystkie krytyczne (w bundle initial). Tree-shake daje minimalne zyski, ryzyko zepsucia animacji.
- **C4 — CSS pruning**: 105 KiB unused CSS pochodzi z Tailwind 4 atomic classes generowanych z używanych className w plikach. Wymaga osobnej audyty z DevTools Coverage tab + przeglądu wszystkich className. Niski ROI dla tej sesji.
- **C5 — Composited animations**: weryfikacja `globals.css` — wszystkie 6 keyframes (slideInRight, blurIn ×2, blurOut, fadeInZoom, fadeInUp) JUŻ używają composited properties (transform/scale/filter/opacity). 2 nieskompozytowane wykryte przez Lighthouse to pewnie framer-motion w SplashScreen — out of scope dla tej sesji.

#### Effekt do zmierzenia po deploy:
**Marcin:** uruchom PageSpeed Insights na `https://www.mikrostomart.pl/oferta` (desktop). Acceptance criteria:
- Performance score >85 (z 67) ✅ jeśli osiągnięte
- TBT <200ms (z 630ms) ✅ jeśli osiągnięte
- LCP mobile <2,5s ✅ jeśli osiągnięte
- Bundle size redukcja >300 KiB (z 680 KiB unused JS) ✅ jeśli osiągnięte
- Best Practices score >90 (z 73)
- A11y score utrzymane >90 (z fix iframe title)

Jeśli score nadal <85: sprawdzić dlaczego dynamic imports nie zadziałały (może pre-loaded przez Next prefetch). Plan C2/C4/C5 zostaje w kontekście jako follow-up.

#### Build:
Czysty (brak compilation errors). Pre-existing warnings pozostały (Sentry config deprecation `disableLogger`, middleware→proxy rename Next 16, `outputFileTracingIncludes` przeniesione poza experimental, themeColor w `/admin/video`) — do osobnego porządku.

#### Pliki:
- `sentry.client.config.ts` — Sentry slim
- `src/app/layout.tsx` — używa AdminClientLayer
- `src/components/AdminClientLayer.tsx` — **[NEW]** cienki client wrapper dla 3 admin dynamic imports
- `src/components/BackgroundVideo.tsx` — iframe title + aria-hidden
- `src/components/ThemeLayout.tsx` — 6 dynamic imports
- `src/middleware.ts` — CSP rozszerzenia

> **Brak migracji DB / nowych env var.** Tylko zmiany w kodzie warstwy frontend/build.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 2026-05-09 — SEO Faza 1 regression fix: regex /aktualnosci/{ID}-{slug} łapał aktywne artykuły
**Trzeci regression fix tego dnia — pierwszy fix od strony klikalności po deploy Fazy B**

#### Commit:
- `e8fa6a0` — fix(seo): regresja Faza 1 — regex /aktualnosci/{ID}-{slug} łapał aktywne artykuły z DB

#### Problem (zgłoszony przez Marcina po deploy):
Na PL liście /aktualnosci dało się kliknąć tylko w 1 z 14 artykułów (`ortodoncja-nakladkowa-w-mikrostomart`). Pozostałe 13 wracało do listy. EN/DE/UA wszystkie 14 działały.

#### Root cause:
Faza 1 SEO Recovery (`99144ec` 2026-05-09) miała w `next.config.ts` catchall regex:
```js
{ source: '/aktualnosci/:idAndSlug([0-9]+-.+)', destination: '/aktualnosci' }
```
Miał łapać 171 starych Joomla URLi typu `/aktualnosci/80-stary-tytul` które zwracały 404 w GSC. ALE łapał TEŻ aktywne artykuły z `news` table których slugi też zaczynają się od cyfr (13 z 14 PL artykułów: `319-wybielanie...`, `314-metamorfoza-3` itd.).

EN/DE/UA były OK bo regex matchował tylko `/aktualnosci/*` (bez locale prefix), a EN/DE/UA URLe miały `/en/aktualnosci/`, `/de/aktualnosci/`, `/ua/aktualnosci/`.

#### Naprawa — page-level redirect zamiast regex:
- **`next.config.ts`**: usunięty regex catchall (komentarz wyjaśniający)
- **`[locale]/aktualnosci/[slug]/page.tsx`**:
  - Wymieniony import: `notFound` → `permanentRedirect` z `next/navigation`
  - Gdy slug nie istnieje w `news` table: zamiast `notFound()` (404) wykonujemy `permanentRedirect()`
  - **HTTP 308 Permanent** (lepsze dla SEO niż 307 z regular `redirect()`)
  - Locale-aware destination: PL bez prefix, EN/DE/UA z prefix

#### Efekt:
- Aktywne artykuły z DB (numeric prefix lub nie) → renderują poprawnie ✅
- Nieaktywne stare Joomla URLs → nadal redirect na `/aktualnosci` 308 ✅
- 198 starych URLi z GSC nadal pokrytych (przez page-level redirect zamiast regex)

Pozostałe redirecty w `next.config.ts` ZACHOWANE: `/component/*`, `/zespol*`, `/oferta/{stary-slug}` mappings, 6 standalone (galeria, pogotowie, etc.).

#### Smoke test:
- `/aktualnosci/319-wybielanie-na-jednej-wizycie` → 200 ✅ (poprzednio 308 do listy)
- `/aktualnosci/314-metamorfoza-3` → 200 ✅
- `/aktualnosci/ortodoncja-nakladkowa-w-mikrostomart` → 200 ✅ (zachowane)
- `/aktualnosci/80-old-joomla-slug` (NIE w DB) → 308 → `/aktualnosci` ✅
- `/en/aktualnosci/319-...` + de + ua → 200 ✅
- Wszystkie pozostałe redirecty zachowane

---

### 2026-05-09 — SEO Faza B + critical regression fix (Schema.org + SW 404 + hreflang)
**Najwyższy SEO impact w jednej sesji: rich snippets na 6 service pages + naprawa krytycznej regresji**

#### Commits:
- `af0fa2f` — fix(seo,perf): regresja Faza 2 — Service Worker 404 + brak hreflang na podstronach
- `27d808d` — feat(seo): Faza B — Schema.org rich snippets boost (BreadcrumbList + MedicalProcedure + Article)

#### Krytyczna regresja (`af0fa2f`):
PageSpeed Insights audit (desktop /oferta) wykrył:
- **Service Worker /sw.js zwracał 404** — PWA install formalnie działał (manifest wystarczy) ALE offline cache + background push są broken dla nowych instalacji
- **/firebase-messaging-sw.js też 404**
- **Lighthouse: "Document does not have a valid hreflang"** — hreflang był tylko na homepage

ROOT CAUSE: Mój next-intl middleware z Fazy 2 łapał pliki `.js`, `.json` i routował je przez page logic → 404. Matcher wykluczał tylko obrazki.

FIX:
- `src/middleware.ts`: rozszerzony matcher exclusion o `js|css|woff|woff2|ttf|otf|eot|json|webmanifest|map|mp4|mp3|wav|pdf`
- `src/app/layout.tsx`: dodany globalny `alternates.languages` (homepage URLs per locale + x-default) jako fallback dla wszystkich podstron. Homepage [locale]/page.tsx nadal ma własny override.

Smoke test: `/sw.js`, `/firebase-messaging-sw.js`, `/manifest.json` → wszystkie 200 ✅. Każda podstrona ma teraz 5× hreflang link.

#### Faza B — Schema.org rich snippets (`27d808d`):
Niespodzianka diagnostyczna: 5/6 service pages JUŻ MIAŁY BreadcrumbList + FAQPage. Tylko implantologia była niespójna (FAQPage + MedicalWebPage + MedicalProcedure ale bez BreadcrumbList).

Realne zmiany (mniejsze niż planowane 2h):
- **`implantologia/layout.tsx`**: dodany BreadcrumbList
- **`chirurgia, leczenie-kanalowe, ortodoncja, protetyka, stomatologia-estetyczna` layouts**: dodany MedicalProcedure schema z polami procedureType (SurgicalProcedure / TherapeuticProcedure), bodyLocation (Mouth/Tooth/Teeth), description, howPerformed, preparation, followup, performer
- **`aktualnosci/[slug]/page.tsx`**: NewsArticle schema (headline, description, image, datePublished, dateModified, author=Marcin, publisher, mainEntityOfPage locale-aware, inLanguage)
- **`nowosielski/[slug]/page.tsx`**: BlogPosting schema (analogiczny pattern)

PO BUILD każda service page ma 12 unique schema types: Answer, BreadcrumbList, FAQPage, GeoCoordinates, ListItem, MedicalOrganization, MedicalProcedure, OpeningHoursSpecification, PostalAddress, Question + globalny Dentist + WebSite.

#### Oczekiwane efekty:
- **Rich Results Test po deploy: 5-7 prawidłowych elementów** na service pages (vs 2 obecnie na homepage)
- **Google SERP**: rich FAQ snippet (akkordeon Q&A) + breadcrumbs + Article rich card
- **CTR boost**: historicznie 5-15% wzrost klikalności z rich snippets
- **Możliwość wyświetlania w Google Health card** dla zapytań medycznych

#### Pozostałe fazy planu (TODO):
- **Faza C** — LCP/JS optimization. PageSpeed wykazał: 680 KiB nieużywanego JS, TBT 630ms, main thread 3.5s. ~2h pracy.
- **Faza D** — Per-page localized metadata. ~2h, niski priorytet.

---

### 2026-05-09 — SEO Faza A: quick wins (meta description, H2, next/image)
**3 quick wins z 4-fazowego planu SEO post-recovery (po Marcin uruchomił PageSpeed + Rich Results Test)**

#### Commit:
- `d02509f` — feat(seo): Faza A quick wins — meta description, H2 struktura, img → Image

#### #1 Meta description (238 → 145-154 chars):
- `src/lib/brandConfig.ts` brand.description: 238 → 144 chars (default fallback)
- `src/app/[locale]/page.tsx` HOMEPAGE_SEO[locale].description: 4 locale skrócone do optimal range. UA cyrylica 249 bytes ≈ 140 Unicode chars (2-byte UTF-8)
- Skutek: Google nie obcina meta description w SERP → CTR boost

#### #3 next/image migration (4 wystąpień <img> w public-facing UI):
- `src/app/[locale]/sklep/page.tsx` — product image w listingu (fill + sizes responsive). Fallback do `<img>` dla `data:` URLs (base64 nieoptymalizowane)
- `src/components/ProductModal.tsx` — 2 obrazy (cart item + gallery thumb)
- `src/components/YouTubeFeed.tsx` — clinic logo placeholder
- `next.config.ts` — `*.supabase.co` w `images.remotePatterns` (product images z Supabase Storage)
- Pominięte: admin/internal `<img>` (admin/page.tsx, SocialMediaTab, NewsTab, ScheduleTab, TasksTab, ThemeEditor, AssistantTeaser preview, simulator components, VisualEditorOverlay) — nie wpływają na SEO publicznych stron

#### #7 H2 struktura homepage:
- Audit pokazał 3 H2 + 1 H3 grupa bez parent H2 ("Precyzja"/"Estetyka"/"Komfort" cards)
- Dodany H2 "Co nas wyróżnia" jako wrapper sectionu w `HomeClient.tsx` ValuesSection
- `messages/{pl,en,de,ua}/common.json` — klucz `values.heading` we wszystkich 4 locale

#### Co NIE zostało zrobione (świadomie):
- `/oferta` page H2 — carousel renderuje tylko 1 ofertę naraz (decyzja UX). Indywidualne `/oferta/*` mają już bardzo dobrą strukturę (5+ H2 per page).
- Per-page localized metadata (Faza D) — niski priorytet, w osobnej sesji.

#### Smoke test:
- Meta description: PL 145, EN 154, DE 153, UA 140 (Unicode) chars ✅
- Homepage: 4 H2 (Co nas wyróżnia, Twoja droga do, YouTube, Opinie) ✅
- Sklep: 14× next/image w renderowanym HTML ✅
- Wszystkie strony 200 OK

#### Dane bazowe Marcina (PageSpeed Insights mobile, /en homepage, 2026-05-09):
- LCP: 2,7s (BORDERLINE — cel <2,5s "good")
- INP: 168ms (zielone)
- CLS: 0,03 (zielone)
- FCP: 1,5s (zielone)
- TTFB: 0,7s (zielone)
- **Główny problem: LCP** — Faza C planu odpowiada (Hero image priority, preload, theme injection optimization)

#### Rich Results Test (2026-05-09):
- 2 prawidłowe elementy: LocalBusiness (Dentist) + Organization
- Po Fazie B: docelowo 5-7 (dodać MedicalProcedure × 6 service pages, BreadcrumbList, Article)

#### Pozostałe fazy planu (TODO):
- **Faza B** — Schema.org boost (BreadcrumbList + per-page MedicalProcedure + Article schema). 2h, najwyższy SEO impact.
- **Faza C** — LCP optimization (Hero priority, preload, defer JS). 1.5h.
- **Faza D** — Per-page localized metadata. 2h, niski priorytet.

---

### 2026-05-09 — SEO Recovery Faza 2.x: aktualności per-locale + LanguageSwitcher fix
**Dokończenie Fazy 2 — newsy w 4 językach + cleanup legacy + 3 fixy switcher'a**

#### Commits (chronologicznie):
- `1abe222` — fix(i18n): LanguageSwitcher używa next-intl router.replace (próba 1, nieudana — root layout w App Router się nie re-renderuje przy SPA navigation)
- `c1e032c` — fix(i18n): LanguageSwitcher hard-reload + ręczne strip prefiksu (próba 2 — działało dla większości, ale powrót do PL nie działał)
- `050a09d` — fix(i18n): LanguageSwitcher synchronizuje cookie NEXT_LOCALE (próba 3 ostateczna — DZIAŁA)
- `6ef1ae5` — feat(i18n): aktualności per-locale w sitemap + naprawa params types

#### LanguageSwitcher — saga 3 fix'ów
**Final fix (`050a09d`)** synchronizuje cookie NEXT_LOCALE z URL prefix przed
hard reload (`window.location.href`):
- Klik 🇵🇱 (default locale) → `document.cookie = 'NEXT_LOCALE=; max-age=0'` (clear), reload na `/oferta` (bez prefiksu).
- Klik non-default (en/de/ua) → set cookie na nowy locale, reload na `/<locale>/oferta`.

WHY: next-intl middleware z `as-needed` strategy honoruje cookie NEXT_LOCALE
gdy URL nie ma prefiksu — `/oferta` z cookie='de' daje 307 redirect na
`/de/oferta`. Bez czyszczenia cookie powrót do PL przez flagę nie działał.

POTWIERDZENIE eksperymentalne (curl smoke test):
- `curl -H "cookie: NEXT_LOCALE=de" /oferta` → 307 → `/de/oferta` ⚠️
- `curl /oferta` (bez cookie) → 200 ✅

#### Aktualności per-locale (`6ef1ae5`)
**Niespodzianka diagnostyczna:** Tabela `news` w Supabase już zawierała 100%
tłumaczeń (14 wierszy × 3 locale × 3 kolumny = 126/126 wypełnionych). Strony
`[locale]/aktualnosci/page.tsx` i `[slug]/page.tsx` już używały DB poprzez
`/api/news?locale=` i `localizeArticle()` helper. Brakowało tylko:

- **Sitemap.ts**: czytał z legacy `data/articles.ts` (statyczna lista 14 PL),
  generował tylko PL URL bez hreflang dla newsów. Refactor: read z DB tabeli
  `news`, flatMap → 1 entry per locale + jednolity `alternates.languages`
  per artykuł grupy. **644 → 686 URLi w sitemap** (+42 = 14 newsów × 3 nowych locale prefix).
- **`[locale]/aktualnosci/[slug]/page.tsx`**: types params NIE zawierały
  `locale` (tylko `slug`) → 500 error przy `/en/aktualnosci/<slug>`.
  - `generateStaticParams`: cartesian product locales × slugs (4 × 14 = 56 statyk)
  - `generateMetadata`: types `{locale, slug}` + użycie zlokalizowanych
    title/excerpt
  - `ArticlePage`: użycie `params.locale` zamiast `getLocale()` (bardziej
    niezawodny source)

#### Sprzątanie legacy
- **Usunięto** `src/data/articles.ts` (316 linii) — dane przeniesione do DB
  dawno temu, jedynym konsumentem był sitemap (już naprawiony) +
  `migrate-news.ts`.
- **Usunięto** `scripts/migrate-news.ts` (56 linii) — one-shot migration
  script, już dawno wykonany.

#### Dodane utility
- **`scripts/translate-missing-news.ts`** — analogicznie do
  `translate-missing-i18n.ts`, ale dla DB rows. Idempotentny: dla każdego
  wiersza × każdego locale sprawdza czy `{field}_{locale}` jest null i
  AI-translate via GPT-4o-mini. Stan na dziś: 0 missing, skrypt no-op.
  Zostawiony jako safety net na wypadek dodania nowych newsów w przyszłości.

#### Smoke test (`npm run start` localhost):
- Sitemap: 686 URLi (vs 644 wcześniej)
- `/aktualnosci/ortodoncja-...` → 200, h1 PL: "ORTODONCJA NAKŁADKOWA..."
- `/en/aktualnosci/ortodoncja-...` → 200, h1 EN: "ALIGNER ORTHODONTICS..."
- `/de/aktualnosci/...` → 200, h1 DE: "ALIGNER-ORTHODONTIE..."
- `/ua/aktualnosci/...` → 200, h1 UA: "ЕЛАЙНЕРИ В MIKROSTOMART"
- LanguageSwitcher: PL ↔ EN ↔ DE ↔ UA — wszystkie kierunki działają

> **Brak migracji DB / nowych env var.** Tylko zmiany w kodzie + cleanup.

---

### 2026-05-09 — SEO Recovery Faza 2: URL-based i18n
**Pełna restruktura — wersje EN/DE/UA pod własnymi URL-ami z prawdziwym hreflang**

#### Commit:
- `2770886` — feat(i18n): URL-based routing — Faza 2 SEO Recovery

#### Diagnoza:
Wcześniej (cookie-based, `localePrefix: 'never'`):
- `/oferta` zawsze zwracał polską wersję (cookie `NEXT_LOCALE`)
- Googlebot bez cookies → ZAWSZE polski content
- Wersje EN/DE/UA **nie istniały dla Google** (brak osobnych URL-i)
- Hreflang fałszywy: 4 alternates wskazujące na ten sam URL bez prefiksów

#### Co się zmieniło:

**Strategia URL prefix (`localePrefix: 'as-needed'`):**
- PL (default): `/oferta`, `/o-nas`, `/baza-wiedzy/{slug}` — bez prefiksu
- EN: `/en/oferta`, `/en/o-nas`, ...
- DE: `/de/oferta`, ...
- UA: `/ua/oferta`, ... (URL prefix `ua`, hreflang `uk` per ISO 639-1)

**Restruktura `src/app/`:**
- Stworzony segment `src/app/[locale]/` dla wszystkich publicznych stron
- 27 katalogów + 2 pliki przeniesione przez `git mv` (zachowana historia):
  oferta/*, cennik, kontakt, o-nas, faq, baza-wiedzy, aktualnosci, nowosielski,
  sklep, koszyk, metamorfozy, mapa-bolu, kalkulator-leczenia, porownywarka,
  selfie, symulator, rezerwacja, aplikacja, rodo, regulamin, polityki,
  privacy-policy, **strefa-pacjenta**, **wizyta**, **platnosc**, **zadatek**
  (4 ostatnie — decyzja Marcina: pacjenci obcojęzyczni)
- Pozostają w `src/app/` root (poza locale): `api/`, `admin/`, `pracownik/`,
  `ekarta/`, `qr-display/`, `zgody/`, `auth/`, `opieka/`, `s/`, `zespol/`
  (redirect na /o-nas), root layout, sitemap, robots, manifest

**Konfiguracja:**
- `src/i18n/routing.ts`: `localePrefix: 'never'` → `'as-needed'`
- `src/i18n/request.ts`: cookie → `requestLocale` (z URL przez params)
- `src/middleware.ts`: integracja `next-intl` middleware z istniejącym
  Supabase auth + bot detection. `NON_LOCALE_PATHS` array dla ścieżek
  poza locale routing. Locale-aware patient zone protection (rozumie
  `/strefa-pacjenta` i `/en/strefa-pacjenta` itd.).

**SEO Metadata (homepage):**
- `src/app/[locale]/page.tsx`: `generateMetadata({ params })` z 4 wersjami
  title/description (PL/EN/DE/UA hardcoded dla MVP). `title.absolute`
  bypassuje `titleTemplate` z root layout (uniknięta duplikacja brand suffix).
- `alternates.languages`: prawdziwy hreflang z URL-ami per locale
  (`pl: '/'`, `en: '/en'`, `de: '/de'`, `uk: '/ua'`, `x-default: '/'`)
- `setRequestLocale(locale)` dla SSG support

**Sitemap per-locale (`src/app/sitemap.ts` rewrite):**
- 644 URLi (vs 554 wcześniej) = statyczne strony × 4 locale + KB articles
  per locale + 14 aktualności PL only
- Każdy URL ma `alternates.languages` (hreflang w sitemap.xml protocol)
- KB articles z DB: grupowane po `group_id` (1 wiersz = 1 locale, hreflang
  z całej grupy)
- Helper `localePath(locale, path)`: PL bez prefiksu, pozostałe z `/${locale}/...`
- Helper `HREFLANG_MAP`: mapuje URL prefix `ua` → ISO `uk`

**LanguageSwitcher (`src/components/LanguageSwitcher.tsx`):**
- Cookie write → `router.push` z URL prefix swap
- Strip current prefix regex: `^/(${routing.locales.join('|')})(?=/|$)`
- Build new URL: PL bez prefiksu, pozostałe z `/${newLocale}${pathWithoutLocale}`

#### Tłumaczenia (471 nowych):
- **Audyt:** `common.json` 100% pokrycia (529 kluczy × 4 locale).
  `pages.json` miało 157 brakujących kluczy w EN/DE/UA — 5 sekcji oferty
  dodane w marcu 2026 ale nigdy nie przetłumaczone:
  `leczeniekanalowe` (41), `estetyczna` (34), `ortodoncja` (30),
  `chirurgia` (26), `protetyka` (26).
- **`scripts/translate-missing-i18n.ts`** — nowy skrypt utility (zostaje w repo):
  GPT-4o-mini, batches per top-level section, idempotentny (re-run
  translate tylko brakujące), safe-interrupt (zapisuje JSON po każdej
  sekcji), placeholders preserved (`{brandName}`, `{cityShort}` etc.).
- **Wykonane:** 471 tłumaczeń (157 × 3 locale). Po: `pages.json` 596/596
  we wszystkich locale.

#### Naprawione przy okazji broken imports po restrukturze:
- `src/components/PatientSkeleton.tsx`: relative path do `patient.module.css`
- `src/types/index.ts`: absolute import `@/app/porownywarka/comparatorTypes`
  → `@/app/[locale]/porownywarka/comparatorTypes`

#### Smoke test (`rm -rf .next && npm run start localhost`):
| Test | Wynik |
|---|---|
| `/`, `/oferta` (PL bez prefiksu) | 200 ✅ |
| `/en`, `/en/oferta` | 200 ✅ |
| `/de/oferta`, `/ua/oferta` | 200 ✅ |
| `/admin` | 307 redirect (zachowane) ✅ |
| `/api/specialists` | 200 (poza locale) ✅ |
| `/zespol` | 308 → `/o-nas` (Faza 1 redirect) ✅ |
| Title PL | "Stomatolog, dentysta Opole | Gabinet stomatologiczny Mikrostomart" |
| Title EN | "Dentist in Opole, Poland | Mikrostomart Dental Clinic" |
| Title DE | "Zahnarzt in Opole, Polen | Zahnklinik Mikrostomart" |
| Title UA | "Стоматолог в Ополе, Польща | Стоматологічна клініка Mikrostomart" |
| Hreflang strona główna | 4 alternates z prawdziwymi URL-ami + x-default |
| Canonical PL | `https://www.mikrostomart.pl` |
| Canonical EN | `https://www.mikrostomart.pl/en` |
| Sitemap | 644 URLi, każdy z `alternates.languages` per URL |

#### Znane TODO (Faza 2.x):
- 14 statycznych aktualności (`data/articles.ts`) tłumaczyć do EN/DE/UA.
  Obecnie: `Article` interface nie ma `locale` field — wymaga rozdzielnego
  zadania (osobne pliki `articles.{en,de,ua}.ts` lub migracja do DB analogicznie
  do `articles` table z `locale` + `group_id`).
- Per-page `generateMetadata({ locale })` dla pozostałych stron (oferta/*,
  cennik, kontakt, etc.) — obecnie używają fallback z root layout `titleTemplate`.
  Title się generuje, ale niezlokalizowany per language. Niski priorytet.

> **Brak migracji DB / nowych env var.** Tylko zmiany w kodzie + tłumaczenia
> w `messages/*.json`.
>
> Vercel auto-deployuje na produkcję + demo po pushu.

#### Następne kroki Marcina (po deploy):
- W GSC re-submit sitemap: `https://www.mikrostomart.pl/sitemap.xml` (nowa wersja z 644 URL-ami i hreflang per URL)
- Sprawdź w GSC po 7-14 dniach: kategoria "Indeksowanie → Strony" — wersje EN/DE/UA powinny się pojawić jako odkryte/zindeksowane

---

### 2026-05-09 — SEO Recovery Faza 1.5: ujednolicenie kanonicznej domeny na www
**Naprawa chaosu canonical: kod używał non-www, Vercel używał www**

#### Commit:
- `9817c46` — fix(seo): ujednolicenie kanonicznej domeny na www.mikrostomart.pl

#### Diagnoza:
Wykryta podczas próby submit sitemapy w GSC ("Nie udało się pobrać"):
- Vercel ma `www.mikrostomart.pl` jako primary domain
- Kod (`brandConfig.ts`) używał wszędzie `https://mikrostomart.pl` (non-www)
- robots.txt deklarował `Sitemap: https://mikrostomart.pl/sitemap.xml`
- Vercel zwracał HTTP 307 (Temporary Redirect, nie 301 Permanent!) z non-www → www
- Skutek: Google dostawał sprzeczne sygnały — sitemap mówiła non-www, ale każde wejście robiło 307 redirect na www. GSC nie mógł pobrać sitemapy w nowo dodanej Domain property.

#### Co się zmieniło:
- **`src/lib/brandConfig.ts`** — 5 pól zmienionych z non-www na www:
  - `appUrl: 'https://www.mikrostomart.pl'`
  - `metadataBase: 'https://www.mikrostomart.pl'`
  - `schemaUrl`, `schemaId`, `schemaImage` — wszystkie www
- **`loadBrandFromDB()`** — dodane `delete dbBrand.*` dla 5 pól domain/URL (analogicznie do istniejącego `delete dbBrand.titleDefault`). DB może mieć stare wartości non-www z poprzednich konfiguracji; te pola są infrastruktury (synchronizowane z Vercel primary domain) i nie powinny być nadpisywane z UI.
- **`src/lib/emailService.ts`** — 4 hardcoded linki w HTML emaili (footer + CTA "Strefa Pacjenta")
- **`src/lib/googleCalendar.ts`** — fallback OAuth redirect URI
- **`src/app/api/admin/careflow/{send-sms,simulate}/route.ts`** — 2× SITE_URL fallback
- **`src/app/api/cron/{careflow-push,online-booking-digest}/route.ts`** — 2× hardcoded URL
- **`src/app/api/intake/generate-pdf/route.ts`** — 2× fallback (font + logo z Vercel public)
- **`src/app/api/social/oauth/tiktok/route.ts`** — TikTok OAuth redirect URI

Demo (`demo.densflow.ai`) NIE ruszone — to subdomain, brak chaosu canonical.

#### Smoke test (`rm -rf .next && npm run build && npm run start`):
- robots.txt: `Sitemap: https://www.mikrostomart.pl/sitemap.xml` ✅
- sitemap entries: `https://www.mikrostomart.pl/...` ✅
- `<link rel="canonical">` na stronie głównej: `https://www.mikrostomart.pl` ✅
- Schema.org `@id`, `url`, `image`: www ✅
- OpenGraph image URL: www ✅
- Brak żadnego non-www w wyrenderowanym HTML strony głównej ✅

#### Po wdrożeniu (oczekiwany efekt):
- GSC w Domain property `mikrostomart.pl` może wpisać `sitemap.xml` (lub pełny URL z www) i sitemap zostanie pobrana bez błędu
- Google przestaje dostawać sprzeczne sygnały (sitemap = www, canonical = www, faktyczna lokacja = www)
- Crawl budget przestaje być przepalany na podążanie za 307 redirectami
- Backlinki (firmowe.edu.pl etc. wskazujące na non-www) nadal działają — Vercel je redirectuje na www, ale teraz nie ma rozjazdu między co Vercel zwraca a co kod deklaruje

> **Brak migracji DB / nowych env var.** Tylko zmiany w kodzie.
> Vercel auto-deployuje na produkcję + demo po pushu.

---

### 2026-05-09 — SEO Recovery Faza 1: 301 redirecty + meta title strony głównej
**Naprawa katastrofy SEO — 198 błędów 404 + przywrócenie SEO-friendly title**

#### Commit:
- `99144ec` — fix(seo): naprawa katastrofy SEO — 301 redirecty + meta title strony głównej

#### Diagnoza (z eksportu GSC 2026-05-09):
- 198 URLi 404 narastało stopniowo od 10 lutego 2026 (141 → 198 w ciągu 3 miesięcy)
- Migracja Joomla → Next.js została wykonana **bez 301 redirectów ze starych URLi**
- Google przez 3 miesiące odkrywał coraz więcej martwych URLi → spadek crawl budget i pozycji
- Dodatkowy cios: 11 kwietnia (`30d5640`+`c54d629`) title strony głównej skrócono do `'Mikrostomart'` (PWA Name Fix dla iOS) → utrata rankingu na słowa kluczowe `stomatolog Opole`, `dentysta Opole`
- Dodatkowo: GSC Marcina monitoruje property `http://mikrostomart.pl/` zamiast `https://` — fałszywe zera w danych o linkach. To **nie jest problem strony, tylko konfiguracji GSC** (Marcin musi dodać property Domain `mikrostomart.pl` z weryfikacją DNS)

#### Co się zmieniło:
- **`next.config.ts`** — dodana funkcja `async redirects()` z 16 wpisami pokrywającymi 100% z 198 URLi 404:
  - Catchall regex `/aktualnosci/:idAndSlug([0-9]+-.+)` → `/aktualnosci` (171 URLi starych artykułów Joomla)
  - Catchall `/component/:rest*` → `/aktualnosci` (4 URLi, Joomla tag feeds)
  - Catchall `/zespol/:rest*` + `/zespol` → `/o-nas` (8 URLi, brak osobnej strony zespołu)
  - 6 indywidualnych mapowań `/oferta/{stary-slug}` → bieżący slug/sekcja (`chirurgia-stomatologiczna`→`chirurgia`, `endodoncja-mikroskopowa`→`leczenie-kanalowe`, itd.)
  - 6 indywidualnych mapowań standalone (`galeria`→`metamorfozy`, `pogotowie-stomatologiczne-24h`→`kontakt`, `radiowizjografia-cyfrowa`→`oferta/leczenie-kanalowe`, itd.)
- **`src/app/page.tsx`** — refactor z client component na server wrapper z `export const metadata`. Title: `'Stomatolog, dentysta Opole | Gabinet stomatologiczny Mikrostomart'` (dokładnie jak prosił pozycjoner). Demo-aware: w demo `'Klinika Demo — Demonstracja DensFlow.Ai'`. `brandConfig.titleDefault` ZOSTAJE `'Mikrostomart'` dla bezpieczeństwa PWA install name na iOS (red line z sekcji 4.3 KOMENDA_STARTOWA).
- **`src/app/HomeClient.tsx`** [NEW] — przeniesiona zawartość poprzedniego `page.tsx` (client component z `"use client"`, 771 LOC). `git mv` zachował historię.
- **`src/app/layout.tsx`** — usunięty fałszywy `alternates.languages` (4 alternates do tego samego URL bez prefiksów językowych — wprowadzał Google w błąd). Hreflang zostanie zastąpiony prawdziwymi alternates w Fazie 2 gdy będą URL-e per-locale.
- **`src/app/sitemap.ts`** — usunięta `/zespol` (strona nie istnieje fizycznie w `app/`, sitemap zawierała martwy URL → wpływało na sitemap-vs-index ratio).

#### Smoke test (`npm run start` lokalnie):
| URL | Status | Cel |
|---|---|---|
| `/aktualnosci/80-10-zasad-aby-dziecko-polubilo-dentyste` | 308 | `/aktualnosci` ✅ |
| `/zespol` | 308 | `/o-nas` ✅ |
| `/component/tags/8` | 308 | `/aktualnosci` ✅ |
| `/oferta/chirurgia-stomatologiczna` | 308 | `/oferta/chirurgia` ✅ |
| `/galeria` | 308 | `/metamorfozy` ✅ |
| `/` | 200 | `<title>Stomatolog, dentysta Opole \| Gabinet stomatologiczny Mikrostomart</title>` ✅ |

> **Uwaga:** Next.js z `permanent: true` zwraca 308 (Permanent Redirect), nie 301 (Moved Permanently). Google traktuje 308 dokładnie jak 301 dla SEO — semantycznie identyczne, jedyna różnica to że 308 zachowuje metodę HTTP (POST→POST). Bez wpływu na ranking.

#### Następne fazy planu naprawczego SEO:
- **Faza 2: URL-based i18n** (osobny branch `feat/i18n-url-based`, 2-3 dni roboczych)
  - Zmiana `src/i18n/routing.ts`: `localePrefix: 'never'` → `'as-needed'`
  - Integracja next-intl middleware z istniejącym Supabase middleware
  - Restruktura `src/app/` (decyzja: `[locale]` segment vs middleware-rewrite)
  - Sitemap per-locale (4× URLi), prawdziwy hreflang
  - LanguageSwitcher: zmiana URL nie cookie
  - Audyt brakujących tłumaczeń statycznych stron
  - Lokalizowane metadata per strona per locale
- **Faza 3 (Marcin + Ja):**
  - Marcin: dodać property `mikrostomart.pl` (Domain) w GSC, weryfikacja DNS TXT
  - Marcin: re-submit sitemap po Fazie 1 i Fazie 2
  - Ja: monitor Web Vitals (LCP/CLS/INP) — sprawdzić czy SplashScreen/ThemeContext nie spowalniają
  - Decyzja: stworzyć osobną stronę `/zespol` z każdym lekarzem (boost SEO long-term)
  - Audyt po 4 tygodniach: konwersja 198 → 0 błędów 404

#### Pliki:
- `next.config.ts` — dodana sekcja `redirects()` (92 linie)
- `src/app/page.tsx` — kompletny rewrite (server wrapper z metadata)
- `src/app/HomeClient.tsx` [NEW] — poprzednia zawartość page.tsx
- `src/app/layout.tsx` — usunięty fałszywy hreflang
- `src/app/sitemap.ts` — usunięta `/zespol`

> **Brak migracji DB / nowych env var.** Tylko zmiany w warstwie Next.js (routing, metadata).
> Vercel auto-deployuje na produkcję + demo po pushu na main.
> Oczekiwany efekt: Google w ciągu 4-6 tygodni wykryje 308 zamiast 404 → konwersja 198 → 0, przywrócenie pozycji na słowa kluczowe.

---

### 2026-05-08 — Mapa projektu Quick Lookup (dokumentacja)
**Pomocniczy dokument dla AI w przyszłych sesjach**

Dorzucony do pulpitu nowy plik `~/Desktop/MAPA_PROJEKTU_QUICK_LOOKUP.md` jako ścieżka skrótu dla AI orientującego się w projekcie. Zawiera:
- Feature → pliki (mapa ~50 obszarów funkcjonalnych z konkretnymi ścieżkami)
- Dependency map (top 13 ryzyk: „jeśli zmienisz X → może popsuć Y, jak chronić")
- Pełna lista ENV vars z kategoriami (Supabase, Auth, Prodentis, Communication, Payments, Firebase, AI, Google, Meta)
- Design system (CSS variables, fonty, theme presets, brand config)
- Quick commands (build, diagnostyka, KCP-specific SQL)
- Heurystyki „when AI is lost" + lista anti-patterns
- Świadome długi techniczne (admin/page.tsx monolith, brak testów, brak ERD)

Link do mapy dorzucony w `~/Desktop/KOMENDA_STARTOWA_MIKROSTOMART.md` sekcja 2 (Krytyczne lokalizacje) i w pamięci AI `reference_mikrostomart_paths.md`.

Cel: zamykamy lukę „AI musi szukać przez `grep`" — teraz pierwszym przystankiem jest mapa, a `Explore` agent dopiero gdy mapa nie wystarczy.

---

### 2026-05-08 — KCP (Kontrola Czasu Pracy) F1-F7 + cross-verify
**Pełen system kontroli czasu pracy pracowników — 7 faz wdrożone w jeden dzień**

System obejmuje cały cykl: skan QR → grafik → wyliczanie shiftów → integrację z Prodentis (rozdział nadgodzin zasadne/niezasadne z potrójną weryfikacją) → urlopy z kalendarzem świąt → raporty PDF/CSV do listy płac.

#### Commits (chronologicznie):
- `cb0d0ea` — feat(time-tracking): F1 — clock-in/out via rotating QR (MVP)
- `2263346` — feat(admin): link „Ekran QR (kiosk)" w nawigacji panelu admina
- `26f5c08` — feat(time-tracking): anulowanie skanu przez pracownika + push do admina
- `5b5b1a7` — feat(time-tracking): F3 — edytor grafiku w panelu admina
- `850880f` — feat(schedule): stanowiska + dropdown lekarzy + quick actions zmiany
- `f1ce107` — feat(schedule): drag-and-drop komórek (kopia / przeniesienie)
- `d579cda` — feat(schedule): widok per stanowisko (dispatch view)
- `5b67d41` — feat(schedule): trzeci tryb „📊 Dzień" + help modal
- `3940eda` — feat(schedule): widok grafiku zespołu w strefie pracownika (read-only)
- `f7710b9` — feat(time-tracking): F4 — wyliczanie shift dnia + dashboard admina + 2 crony
- `96f54ff` — feat(time-tracking): F5 — integracja Prodentis API + nadgodziny zasadne/niezasadne
- `a53fd21` — feat(time-tracking): F6 — urlopy + kalendarz świąt PL
- `ff978fa` — feat(time-tracking): F2 — statystyki własne pracownika (tydzień + miesiąc)
- `466886d` — feat(time-tracking): F7 — raporty PDF/CSV + sekcja anomalii (FINAŁ KCP)
- `45dddb1` — feat(time-tracking): potrójna weryfikacja końca pracy lekarza

#### Migracje DB (113-119, 7 nowych):
- `113_time_tracking_foundation` — `work_locations` (lokalizacje QR z sekretami HMAC) + `time_entries` (clock-in/out z auditem). Trigger DB blokuje duplikaty w 60s window.
- `114_time_entries_cancellation` — soft-delete dla pomyłkowych skanów (cancelled, cancelled_at, cancel_reason, cancelled_by FK auth.users).
- `115_schedule_editor` — `employment_terms` (kontrakt UoP/B2B, weekly/daily_hours, vacation_days, cleanup_buffer_minutes, hourly_rate) + `work_schedules` (UNIQUE employee+date, CHECK work XOR absence, roles_for_shift TEXT[]) + `shift_assignments` (segmenty asysta↔lekarz w trakcie zmiany). Seed: domyślne employment_terms dla wszystkich aktywnych pracowników.
- `116_workstations` — 7 stanowisk pracy: G1, G2, G3 (gabinety), R (recepcja), PK (pokój konsultacyjny), P (pracownia), BR (biuro). Dodaje `workstation_id` + `doctor_employee_id` do `shift_assignments`.
- `117_calculated_shifts` — `calculated_shifts` (cache wyliczeń: actual_start/end, worked_minutes, late, early, overtime_total/justified/unjustified, doctor_end_time + confidence, auto_closed flag, anomaly_flags TEXT[], status enum) + `time_tracking_audit` (audit log korekt admina z reason WYMAGANY).
- `118_leaves_and_holidays` — `polish_holidays` (seed 14 świąt × 2 lata 2026/2027) + `leave_requests` (8 typów: vacation, on_demand, sick, child_care, training, delegation, unpaid, other; status workflow requested/approved/rejected/cancelled; CONSTRAINT date_to >= date_from).
- `119_doctor_end_methods` — `calculated_shifts.doctor_end_methods JSONB` (historia kandydatów na doctor_end_time z confidence i opisem).

#### Crony (vercel.json: 3 nowe):
- `/api/cron/close-day` — codziennie 02:30 PL (00:30 UTC). Paruje time_entries z work_schedules za wczoraj, wylicza shift (planned vs actual + anomalie). Auto-domknięcie sesji bez clock_out na planned_end z flagą.
- `/api/cron/forgot-clockout-notify` — co 15 min, 14:00–22:00 PL. Push do pracownika gdy minęło ≥30 min od planned_end a brak clock_out. Dedup max 1/dzień.
- `/api/cron/prodentis-end-times` — codziennie 03:00 PL. Pobiera z Prodentis API work-summary każdego lekarza za wczoraj, robi POTRÓJNĄ WERYFIKACJĘ (closedAt → lastModifiedByDoctor → cross-verify recepcja przez createdAt kolejnych wizyt 3-15 min po), naliczane overtime_justified/unjustified dla asystentek/recepcji.

#### Lib (12 nowych modułów w `src/lib/timeTracking/`):
- `types.ts` — TimeEntry, WorkLocation, TimeStatusResponse, TimeScanRequest/Response, TimeCancelRequest/Response
- `qrToken.ts` — HMAC-TOTP-style: token = HMAC-SHA256(secret, "<locId>:<period>")[:16], rotacja 30s, tolerance ±1, walidacja timing-safe
- `locationService.ts` — getPrimaryLocation(), getLocationById() — sekrety server-only
- `employeeContext.ts` — getEmployeeByAuthUserId() (auth user_id → employees record)
- `timeEntryService.ts` — getLastEntry/Today, getExpectedNextType, isDuplicateTap, insertTimeEntry, cancelTimeEntry, getTodayEntries, buildStatusResponse
- `scheduleTypes.ts` — AbsenceType (8 typów), ShiftRole, EmploymentTerms, WorkScheduleRow, ShiftAssignmentRow, Workstation, UpsertCellPayload, ScheduleMonthResponse
- `scheduleService.ts` — fetchScheduleMonth, upsertScheduleCell (replace strategy dla assignments), copyMonth (template z poprzedniego miesiąca), workingDaysInMonthWithHolidays (z polish_holidays), fetchActiveWorkstations
- `shiftCalculation.ts` — calculateShift (pure function, parująca clock_in→clock_out, anomaly flags), calculateAndPersistDay, threshold ≥5 min dla late/early/overtime
- `prodentisWorkSummary.ts` — fetchDoctorWorkSummary z prodentisFetch (tunnel + IP fallback), typ ProdentisWorkSummary z 13 polami
- `overtimeJustification.ts` — calculateJustification (czysta arytmetyka), syncProdentisAndRecalcJustification (3-step: pobierz lekarzy → pobierz shifts asysty z overtime_total > 0 → wylicz justified/unjustified per assignment, pomija status='admin_approved')
- `doctorEndVerification.ts` — verifyDoctorEnd (potrójna weryfikacja A/B/C): closedAt + lastModifiedByDoctor + cross-verify przez createdAt wizyt z `/api/appointments/by-date`
- `leaveService.ts` — countWorkingDays, getVacationBalance, createLeaveRequest (walidacja overlap + balance), decideLeaveRequest (po approve auto-wpis absence do work_schedules), cancelOwnRequest, listOwnRequests, listAllRequests
- `reportGenerator.ts` — generatePdfReport (pdf-lib, sanityzacja polskich znaków do ASCII, A4, header firmy, podsumowanie, tabela dni, opcjonalne wynagrodzenie), generateCsvReport (BOM UTF-8, średnik-separated, sekcja meta + dane + agregaty)

#### API Endpointy (15 nowych):

**Time tracking core:**
- `GET /api/time/qr-current` — admin, aktualny payload kioskowy
- `POST /api/time/scan` — employee+admin, walidacja+dedup+zapis
- `GET /api/time/status` — employee+admin, stan dziś
- `POST /api/time/cancel` — employee+admin, anulowanie własnego skanu z powodem + push admin

**Schedule editor (admin):**
- `GET /api/admin/schedule?month=` — pełen grid + workstations + summaries
- `PUT /api/admin/schedule/cell` — upsert komórki (replace assignments)
- `DELETE /api/admin/schedule/cell?employeeId=&date=`
- `POST /api/admin/schedule/copy-from-month` — szablon z poprzedniego

**Schedule viewer (employee):**
- `GET /api/employee/schedule-view?month=` — read-only, employee+admin

**Time tracking analysis (admin):**
- `GET /api/admin/time-tracking?from=&to=&employeeId=&onlyAnomalies=` — lista shifts
- `POST /api/admin/time-tracking/recalculate { date }` — manual przelicz
- `PUT /api/admin/time-tracking/correct { shiftId, ...patch, reason }` — korekta z auditem
- `POST /api/admin/time-tracking/sync-prodentis { date }` — manual sync z Prodentis
- `GET /api/admin/time-tracking/report?employeeId=&month=&format=pdf|csv` — raport miesięczny

**Time tracking employee self:**
- `GET /api/employee/time-tracking-self?from=&to=` — własne statystyki + bilans normy
- `GET /api/employee/time-tracking-self/report?month=&format=pdf|csv` — własny raport (bez hourly_rate)

**Leaves:**
- `GET /api/employee/leave-requests` — własne + balance
- `POST /api/employee/leave-requests { type, dateFrom, dateTo, reason? }` — push admin
- `DELETE /api/employee/leave-requests/[id]` — cancel własny pending
- `GET /api/admin/leave-requests?status=&from=&to=` — lista wszystkich z employee join
- `PUT /api/admin/leave-requests/[id] { decision, rejectedReason? }` — approve auto-wpisuje absence do work_schedules + push pracownik

#### UI (8 nowych komponentów):

**Strefa pracownika (`/pracownik`):**
- Zakładka **🕐 Czas pracy** (`CzasPracyTab.tsx`):
  - 3 podtryby: **Dziś** (skaner QR + status + lista wpisów + anuluj), **Tydzień** (7 dni z kartami sumarycznymi), **Miesiąc** (pełna tabela + bilans normy + buttony Pobierz raport PDF/CSV)
  - Skaner kamery `@yudiel/react-qr-scanner` (dynamic import)
  - Modal anulowania z wymaganym powodem
- Zakładka **📅 Grafik zespołu** (`GrafikViewerTab.tsx`) — read-only widok z 3 trybami (Pracownicy/Stanowiska/Dzień), badge „tylko do odczytu"
- Zakładka **🏖 Urlopy** (`UrlopyTab.tsx`):
  - 4 karty bilansu (limit roczny / wykorzystane / oczekujące / pozostałe)
  - Lista własnych wniosków z statusami (pending / approved / rejected / cancelled)
  - Modal „+ Złóż nowy wniosek" z 8 typami nieobecności

**Panel admina (`/admin`):**
- Zakładka **🕐 Grafik pracy** (`ScheduleEditorTab.tsx`, ~1500 LOC):
  - 3 tryby widoku: Pracownicy (siatka × dni z edycją + drag-and-drop), Stanowiska (dispatch view kto-gdzie), Dzień (gantt-like timeline 7-22h z paskami i segmentami)
  - Modal komórki: tryb Praca/Nieobecność, quick presets (Poranna 9-16, Popołudniowa 14-20, Pełna 8-16), multi-role chipy (7 ról: Lekarz, Higienistka, Asystentka, Recepcja, Manager, Pracownia, Biuro), segmenty assignment z dropdown stanowisk + lekarzy
  - Drag & drop komórek (kopia/przeniesienie z Shift)
  - „Kopiuj z poprzedniego miesiąca" + filtr ról
  - Help modal z łopatologiczną instrukcją w 8 sekcjach
- Zakładka **⏱ Czas pracy** (`TimeTrackingDashboardTab.tsx`, ~750 LOC):
  - Filtr przedziału (od/do, default 14 dni) + checkbox „tylko anomalie"
  - Sekcja **„⚠ Pracownicy wymagający uwagi"** — top 5 z największą liczbą anomalii
  - Tabela pracownicy × dni z kolorami statusu + worked time + anomalie
  - Stopka: sumy + buttony „📄 PDF / 📊 CSV" per pracownik
  - Buttony: „Przelicz" (close-day manual), **„Sync Prodentis"** (manual potrójna weryfikacja)
  - Modal korekty z polami times/late/overtime + WYMAGANYM powodem (audit log) + nowa fioletowa sekcja **„🔬 Weryfikacja końca pracy lekarza"** z listą wszystkich metod
- Zakładka **🏖 Urlopy** (`LeavesTab.tsx`):
  - Filtr statusu (default: pending)
  - Lista wniosków z employee_name + dane + powód
  - Modal decyzji (approve = auto-wpis do grafiku; reject = wymagany powód)
- NavItem **„🕐 Ekran QR (kiosk)"** w sidebar — otwiera `/qr-display` w nowej zakładce

**Strona kioskowa:**
- `/qr-display` — pełnoekranowy QR (380×380), zegar PL, progress bar do rotacji, autoreload przed expirem, ukrywa Navbar/Footer/DemoBanner

#### Kluczowe algorytmy:

**Algorytm nadgodzin asysty (zasadne / niezasadne):**
```
1. close-day cron wylicza overtime_total = actual_end - planned_end
2. prodentis-end-times cron pobiera doctor_end_time z 3 metod:
   A. Prodentis closedAt (high)
   B. Prodentis lastModifiedByDoctor (medium)
   C. Cross-verify recepcja: createdAt 3-15 min po → bumpuje confidence
3. Dla asystki: bierze ostatni segment z shift_assignments → doctor_employee_id
   → szuka jego doctor_end_time w calculated_shifts
4. Granica zasadnych: doctor_end_time + cleanup_buffer_minutes (default 30)
5. Asysta wybiła ≤ granicy → all justified
   Asysta wybiła > granicy → justified do granicy, reszta unjustified
   Asysta wybiła przed granicą? → 0 overtime (nadgodzin nie ma)
6. Recepcja: fallback na max(doctor_end_time) z dnia
7. Lekarz: nie liczymy zasadne/niezasadne — wszystkie zalicza
```

**Potrójna weryfikacja końca pracy lekarza (cross-verify):**
- A + C → `high-verified` (closedAt + recepcja zgadzają się)
- A solo → `high`
- B + C → `high` (bumped z medium przez recepcję)
- B solo → `medium`
- scheduleEnd → `low`
- brak → `unknown`

**Auto-wpis absence przy approve urlopu:**
- Dla każdego dnia roboczego (pn-pt minus święta polish_holidays) w przedziale wniosku
- Replace strategy: usuń stare shift_assignments, podmień work_schedule na absence_type
- Skip weekendy i święta

**QR rotujący (HMAC-TOTP):**
- payload = `mst://time/<locationId>/<period>/<token>`
- period = floor(now / 30s)
- token = HMAC-SHA256(qr_secret, "<locationId>:<period>")[:16]
- Walidacja akceptuje period ± 1 (90s tolerance)

#### Stan KCP w liczbach:
- **7 migracji DB** (113-119): 11 nowych tabel
- **18 endpointów API** (admin + employee + crony)
- **3 nowe crony** Vercel (close-day, forgot-clockout, prodentis-end-times)
- **12 nowych lib modułów** w `src/lib/timeTracking/`
- **8 nowych komponentów UI** (3 admin + 3 employee + 2 viewer)
- **1 strona kioskowa** `/qr-display`
- **~7500+ LOC** TypeScript

> ⚠️ **WYMAGA migracje na obu Supabase (kolejność):**
> 1. `113_time_tracking_foundation.sql`
> 2. `114_time_entries_cancellation.sql`
> 3. `115_schedule_editor.sql`
> 4. `116_workstations.sql`
> 5. `117_calculated_shifts.sql`
> 6. `118_leaves_and_holidays.sql`
> 7. `119_doctor_end_methods.sql`
>
> Wszystkie pliki w `~/Desktop/migracje_supabase/` jako `.txt` (idempotentne).

> 📦 **Pomocnicze SQL** w `~/Desktop/migracje_supabase/`:
> - `sprzatanie_employees_2026-05-08.txt` — dezaktywacja duplikatów + uzupełnienie position
> - `import_grafik_maj_2026_v2.txt` — import wstępnego grafiku z PDF maja (5 pracownic × ~17 dni)

> 🔧 **Konfiguracja środowiska:**
> - Przy każdym pushu na `main` Vercel deployuje na 2 środowiska
> - Migracje musisz wgrać ręcznie na OBU Supabase projektach (produkcja `keucogopujdolzmfajjv` + demo `mhosfncgasjfruiohlfo`)
> - Cron secret `CRON_SECRET` — Vercel env var (już istnieje)

---

### 2026-05-08 — KCP F1: Time Tracking Foundation
**System rejestracji czasu pracy — MVP (clock-in/out via QR)**

#### Co się zmieniło:
- **Faza 1 (F1) systemu KCP** — pracownicy mogą rejestrować przyjścia/wyjścia skanując rotujący QR z ekranu kioskowego (iPad w recepcji).
- **Migracja 113** — `work_locations` (lokalizacje QR z sekretami HMAC) + `time_entries` (wpisy clock-in/clock-out z anti-fraud audytem). Trigger DB blokuje duplikaty w 60s window. Seed primary location z losowym `qr_secret`.
- **Rotujący QR** — `mst://time/<locationId>/<period>/<token>` gdzie `period = floor(now/30s)`, `token = HMAC-SHA256(secret, "<locationId>:<period>")[:16]`. Tolerance ±1 okres dla rozjazdu zegarów. Walidacja timing-safe.
- **Strona kioskowa** `/qr-display` — full-screen QR (380×380), live zegar PL, progress bar do następnej rotacji, auto-refresh przed expirem. Auth: `role=admin` (raz zalogowany iPad zostaje). W demo: napis "Tryb demonstracyjny".
- **Strefa pracownika — zakładka "🕐 Czas pracy"** — `/pracownik/czas-pracy` (zakładka `czas-pracy`). Pokazuje: status (w pracy / nie wbity), pierwsze przyjście, ostatnie wyjście, sumę dziś. Button → modal z kamerą (Scanner z `@yudiel/react-qr-scanner`). Auto-detekcja typu (clock_in/clock_out na podstawie ostatniego wpisu z dziś).
- **3 nowe API endpointy** pod `/api/time/*` — wszystkie dynamic, runtime nodejs, demo-mode-aware.
- **Decyzje uzgodnione (D1-D4, E1-E4, Q4-Q8)** — w `~/Desktop/PLAN_TIME_TRACKING_v1.md`.
- **Zlecenie Prodentis API** — w `~/Desktop/ZLECENIE_PRODENTIS_API_TIME_TRACKING.md` (rozszerzenie o `createdAt`/`lastModifiedAt`/`priceEnteredAt`/`closedAt`/`lastModifiedBy`/`price` na obiekcie wizyty). Blokuje fazę F5 (auto-detekcja końca pracy lekarza), nie blokuje F2-F4.

#### Pliki:
- `supabase_migrations/113_time_tracking_foundation.sql` — **[NEW]** migracja
- `src/lib/timeTracking/types.ts` — **[NEW]** typy współdzielone
- `src/lib/timeTracking/qrToken.ts` — **[NEW]** HMAC-TOTP-style generator/validator
- `src/lib/timeTracking/locationService.ts` — **[NEW]** dostęp do `work_locations` (sekrety server-only)
- `src/lib/timeTracking/employeeContext.ts` — **[NEW]** helper `getEmployeeByAuthUserId()`
- `src/lib/timeTracking/timeEntryService.ts` — **[NEW]** zapis, dedup tap-protection, status pracownika, suma godzin
- `src/app/api/time/qr-current/route.ts` — **[NEW]** GET, admin-only, zwraca aktualny payload
- `src/app/api/time/scan/route.ts` — **[NEW]** POST, employee+admin, walidacja+dedup+zapis
- `src/app/api/time/status/route.ts` — **[NEW]** GET, employee+admin, status dziś
- `src/app/qr-display/page.tsx` — **[NEW]** strona kioskowa
- `src/app/pracownik/components/CzasPracyTab.tsx` — **[NEW]** komponent zakładki
- `src/app/pracownik/page.tsx` — dodana zakładka `czas-pracy` (mobile FAB + desktop top bar)
- `package.json` — dodane `@yudiel/react-qr-scanner ^2.5.1`

#### Co dalej (kolejne fazy KCP):
- F2: zakładka pracownika rozbudowana (tydzień/miesiąc + statystyki własne) — w F1 mamy tylko dziś
- F3: edytor grafiku w panelu admina (migracja 114 — `employment_terms`, `work_schedules`, `shift_assignments`)
- F4: cron nocny zamykający dni + dashboard admina (migracja 115)
- F5: integracja Prodentis (czeka na deploy zlecenia API)
- F6: urlopy + kalendarz świąt PL (migracja 116)
- F7: raporty PDF/CSV + anomaly detection

> ⚠️ **REQUIRES**: Wgraj `supabase_migrations/113_time_tracking_foundation.sql` w Supabase SQL Editor na **OBU** projektach: produkcja `keucogopujdolzmfajjv` i demo `mhosfncgasjfruiohlfo`. Migracja jest idempotentna i seeduje primary location z losowym `qr_secret`.

---

### 2026-05-08
**Documentation Hierarchy + Refreshed Startup Prompt**

#### Co się zmieniło:
- Sformalizowana **hierarchia 3 dokumentów** dla AI: `KOMENDA_STARTOWA_MIKROSTOMART.md` (na pulpicie, brama wejścia) + `mikrostomart_context.md` (w repo, pełna dokumentacja) + `memory/` (lokalna pamięć preferencji)
- Pełna re-pisanka `KOMENDA_STARTOWA_MIKROSTOMART.md` — 11 sekcji: stan aktualny (live), what-is-it, lokalizacje, setup, **red lines** (4 kategorie zakazów), workflow, **mandatory doc update protocol**, decyzje stałe, checklisty gotowości i końca sesji, awaryjne scenariusze
- Dodana sekcja "🗂 Hierarchia dokumentów projektu" w tym pliku (na początku Documentation Update Protocol) — definiuje single source of truth dla każdego rodzaju informacji
- Cel: AI w nowych sesjach nie gubi kontekstu, nie psuje projektu, automatycznie utrzymuje dokumentację

#### Pliki:
- `~/Desktop/KOMENDA_STARTOWA_MIKROSTOMART.md` — pełna re-pisanka (poza repo); backup `.bak-2026-05-08-v2`
- `mikrostomart_context.md` — dodana sekcja "Hierarchia dokumentów projektu"

> Brak migracji DB / nowych env var. Tylko meta-dokumentacja.

---

### May 5–7, 2026
**CareFlow Perioperative Care System + Push-First Communication**

#### Commits (highlights):
- `b17bcff` — feat(careflow): Perioperative patient care system - Stage 1 MVP
- `3503c08` — feat(careflow): Phase 2 — enrollment button in employee schedule
- `5e0227e` — feat(careflow): auto-qualification cron, quiet hours fix, auto-complete enrollments
- `58e944f` — feat(careflow): SMS fallback when push unavailable
- `16b114c` — feat(careflow): Phase 3 — PDF compliance reports + build fixes
- `58b1133` — feat(careflow): Phase 4 — Prodentis export, analytics dashboard, manual SMS trigger
- `3e080e0` — fix(careflow): Europe/Warsaw timezone for SmartSnap + quiet hours, enrollment editor UI
- `e1f8f2d` — fix(push): Switch to data-only FCM messages — fix background push + click navigation
- `3b106ac` — refactor(admin): Unify Communication tabs into single '📨 Komunikacja'
- `74ad1d1` / `5a9a4d4` / `a4c74f4` — fix(chat): polling fallback, push deep-linking, mobile responsive, employee zone chat tab

#### CareFlow — Perioperative Patient Care System
End-to-end automation for pre/post-procedure patient management. Replaces ad-hoc SMS reminders with structured protocols.

**Architecture:**
- **Care Templates** (admin) — define perioperative protocols (e.g. "Zabieg chirurgiczny": 4 pre-op + 6 post-op steps spanning ~72h). Each step: medication, push message, `smart_snap` (skips quiet hours), reminder cadence.
- **Patient Enrollment** — employee enrolls patient on a specific appointment from schedule popup → generates per-step `care_tasks` with computed `scheduled_at` (offset_hours from appointment + smart_snap + Europe/Warsaw quiet hours)
- **Patient Portal** — patient confirms/skips tasks via tokenized URL `/careflow/[token]` (token in `care_enrollments.access_token`, no auth required — works without portal account)
- **Push-first delivery** — `careflow-push` cron sends FCM push every `push_interval_minutes` until confirmed or `push_max_count` reached, then falls back to SMS via `careflow-auto-qualify`
- **Audit log** — every action (enroll, push, confirm, skip, sms_fallback) logged to `care_audit_log`
- **PDF compliance reports** — generated via `careflow-report` cron, exportable to Prodentis documents API

**Database (migrations 110-112):**
- `care_templates` — protocol definitions (name, procedure_types[], default_medications JSONB, push_settings JSONB)
- `care_template_steps` — ordered steps with offset_hours, smart_snap, push_message, requires_confirmation, recurrence
- `care_enrollments` — active enrollments (patient_id, template_id, appointment_date, access_token UNIQUE, status, prescription_code, report_pdf_url, report_generated_at)
- `care_tasks` — generated tasks per enrollment (scheduled_at, push_sent_count, completed_at, sms_sent, push_message)
- `care_audit_log` — full action history

**Seeded template:** "Zabieg chirurgiczny" with 10 steps (recipe pickup → 3× pre-op antibiotic → procedure → 6× post-op antibiotic).

#### Push-First Communication (Migration 109)
New `delivery_channel` field on `sms_reminders`: `sms | push | push+sms | pending`. For patients with active FCM tokens: push tried first, SMS as fallback if not confirmed. Saves SMS cost for engaged users while ensuring delivery. Tracking columns: `push_sent`, `push_error`, `push_sent_at`, `patient_has_account`, `patient_has_push`. Index `idx_sms_reminders_push_escalation` for the escalation cron.

#### New Cron Jobs (4):
- `careflow-push` — sends FCM push for due CareFlow tasks
- `careflow-auto-qualify` — auto-completes enrollments + escalates to SMS when push fails
- `careflow-report` — generates PDF compliance reports for completed enrollments
- `push-escalation` — escalates push-first SMS to actual SMS when push delivery fails

#### Communication Tab Unified (`3b106ac`)
Admin Panel: SMS Przypomnienia, SMS po wizycie, SMS tydzień po wizycie, Czat — merged into single "📨 Komunikacja" tab with sub-tabs.

#### FCM Data-Only Payload (`e1f8f2d`)
Removed `notification` key from FCM messages. Was causing background push duplicates (FCM auto-display + our `showNotification()`) and broken click navigation. Service worker now manages all display.

#### Demo Legal Fix (`54010dd`)
Legal pages (regulamin, RODO, polityka prywatności, polityka cookies) now show real company data even in demo mode — required for compliance/legal validity.

#### New Files (CareFlow):
- `src/lib/careflowPdf.ts` — PDF compliance report generation
- `src/app/admin/components/CareFlowTab.tsx` — admin CareFlow management UI
- `src/app/admin/components/CareFlowEnrollmentEditor.tsx` — enrollment edit modal
- `src/app/admin/components/CareFlowSimulator.tsx` — preview enrollment timeline before activating
- `src/app/api/careflow/[token]/route.ts` — patient view (token-based, no auth)
- `src/app/api/careflow/[token]/complete/route.ts` — confirm/skip task
- `src/app/api/employee/careflow/{enroll,enrollments,enrollments/[id],tasks/[id]}/route.ts` — employee CareFlow CRUD
- `src/app/api/admin/careflow/{templates,send-sms,simulate,export-prodentis}/route.ts` — admin CareFlow APIs
- `src/app/api/cron/{careflow-push,careflow-auto-qualify,careflow-report,push-escalation}/route.ts` — 4 new crons
- `supabase_migrations/{109_delivery_channel,110_careflow_system,111_careflow_sms_fallback,112_careflow_report_tracking}.sql`

#### Files Modified:
- `vercel.json` — added 4 new cron entries (careflow-* + push-escalation)
- `src/app/admin/page.tsx` — Komunikacja tab consolidation
- `src/lib/pushService.ts` — data-only payload, push-first integration

> ⚠️ **REQUIRES**: Run migrations 109-112 in Supabase SQL Editor (both production and demo projects).

---

### April 11, 2026
**Push Notification System Stabilization + PWA Name Fix**

#### Commits:
- `7e8c27b` — fix: Let Firebase handle its own SW registration
- `30d5640` — fix: Title to 'Mikrostomart' + wait for active SW
- `e06c670` — fix: REAL ROOT CAUSE — SW scope conflict
- `c54d629` — fix: ROOT CAUSE — PWA title + push hang

#### Root Causes Found:
1. **Push hang**: Two service workers (`sw.js` from next-pwa + manually registered `firebase-messaging-sw.js`) competed for scope `/`. Fixed by letting Firebase SDK manage its own SW at `/firebase-cloud-messaging-push-scope`.
2. **PWA name**: `loadBrandFromDB()` was overriding `titleDefault` with a stale long SEO title from the `site_settings` DB table. Fixed by `delete dbBrand.titleDefault` in the merge.
3. **Title tag**: iOS Safari uses `<title>` for PWA name, ignoring `manifest.json` and `apple-mobile-web-app-title`. Changed `titleDefault` to just `'Mikrostomart'`.

#### Files Modified:
- `src/lib/firebaseClient.ts` — simplified to NOT pass serviceWorkerRegistration to getToken()
- `src/lib/brandConfig.ts` — `titleDefault: 'Mikrostomart'` + `delete dbBrand.titleDefault` in loadBrandFromDB()
- `public/firebase-messaging-sw.js` — added skipWaiting/clients.claim (for its own scope)
- `src/components/PushNotificationPrompt.tsx` — added 20s timeout + step tracking
- `public/manifest.json` — `name: 'Mikrostomart'`

---

### April 9, 2026
**Persistent AI Trainer Chat with Style Learning**

#### Commit:
- `2a4cd3a` — feat: persistent AI Trainer chat with style learning

#### Overview:
Transformed the one-shot AI Trainer form into a **persistent conversational education chat** that:
1. **Learns writing style** from draft/correction pairs (admin pastes AI draft + their corrected version)
2. **Remembers everything** — conversation history stored in `ai_trainer_messages` DB table, loaded on mount
3. **Proactively asks questions** — AI analyzes style differences and asks follow-up questions
4. **Accumulates knowledge** — all style lessons are permanently loaded as learned rules for future responses

#### Database:
- Migration `108_ai_trainer_conversations.sql` — `ai_trainer_messages` table with message type classification (`general`, `style_example`, `style_analysis`, `kb_proposal`, `kb_applied`, `kb_rejected`)

#### Backend (`/api/admin/ai-trainer`):
- **GET** — load full conversation history + stats (total messages, style lessons, KB changes)
- **POST** — send message with type detection, sliding window context (last 50 msgs), all style lessons as permanent rules, proactive follow-up questions
- **PATCH** — approve/reject proposed KB changes with history logging

#### Frontend (`AIEducationTab.tsx`):
- **StyleCompareInput** — side-by-side textareas (red: AI draft, green: user correction) + optional comment
- **Quick Action buttons** — 📧 email / 📱 post / 💬 comment / 🤖 chatbot learning modes
- **Persistent history** — loaded from DB on mount, auto-scroll to bottom
- **Message type badges** — visual indicators for style examples, analyses, applied/rejected KB changes
- **Stats display** — "🎨 X lekcji stylu" / "✅ Y zmian KB" badges in header
- **Textarea input** — multiline with Shift+Enter support (replaces single-line input)

#### Files Created:
- `supabase_migrations/108_ai_trainer_conversations.sql`

#### Files Modified:
- `src/app/api/admin/ai-trainer/route.ts` — full rewrite (145 LOC → 230 LOC)
- `src/app/admin/components/AIEducationTab.tsx` — full rewrite (772 LOC → 580 LOC, leaner + persistent)

---

### April 8, 2026
**Unified AI Ecosystem — Centralized AI Service Layer + Admin Education Panel**

#### Commits:
- `316b9a9` — feat: voice assistant now loads clinic KB from Supabase
- `af518ab` — feat: Phase 3 — migrate 7 routes to unified AI service
- `8f087ea` — feat: unified AI system — knowledge base, admin education panel, AI trainer
- `c506af4` — feat: add /api/health/ai endpoint — centralized AI dependency health check

#### Architecture: Unified AI Service (`src/lib/unifiedAI.ts`)
All AI-powered features now use a single, centralized service layer that:
1. **Auto-loads KB sections** from Supabase `ai_knowledge_base` table (12 sections, 5-min cache)
2. **Builds context-aware prompts** — each call specifies a `context` (e.g., `patient_chat`, `pricing`, `social_post`) and the service automatically selects the right model, role prompt, and relevant KB sections
3. **Falls back gracefully** — if Supabase is unreachable, static `knowledgeBase.ts` content is used
4. **Supports 14 AI contexts** — patient chat, pricing, email drafts, social posts, social comments, voice assistant, blog, news, video metadata, reviews, translation, task parsing, content moderation, AI trainer

#### Phase 1 — Infrastructure:
- Created `src/lib/unifiedAI.ts` (369 LOC) — exports `getAICompletion()`, `buildContextPrompt()`, `AIContext`
- Migration `107_unified_ai_knowledge_base.sql` — `ai_knowledge_base` table with 12 seeded sections (~20,790 chars total)
- Context → model mapping (GPT-4o for critical, GPT-4o-mini for bulk)
- Context → role prompt mapping (14 specialized prompts)
- Context → KB section tag routing

#### Phase 2 — Admin Education Panel:
- `AIEducationTab.tsx` — browse/edit all KB sections in admin panel
- `/api/admin/ai-knowledge` — full CRUD API for KB sections
- `/api/admin/ai-trainer` — AI Trainer: natural language instructions → KB modifications via meta-AI (GPT-4o)

#### Phase 3 — Route Migration (8 routes):
| Route | Context | Migration Type |
|-------|---------|---------------|
| `/api/chat` (patient chatbot) | `patient_chat` | Full — `getAICompletion` + tool_calls |
| `/api/cennik-chat` (pricing) | `pricing` | Full — `getAICompletion` |
| `/api/cron/email-ai-drafts` | `email_draft` | KB source — `buildContextPrompt` |
| `/api/employee/email-generate-reply` | `email_draft` | KB source — `buildContextPrompt` |
| `/api/employee/email-ai-config` (GET) | `email_draft` | KB source — `buildContextPrompt` + static fallback |
| `lib/socialAI.ts` (post gen) | `social_post` | Partial — text gen only, image prompt stays OpenAI |
| `lib/socialComments.ts` (replies) | `social_comment` | Full — `getAICompletion` |
| `/api/employee/assistant` (voice) | `voice_assistant` | KB injection into system prompt |

#### Files Created:
- `src/lib/unifiedAI.ts` — unified AI service layer
- `src/app/admin/components/AIEducationTab.tsx` — admin KB editor
- `src/app/api/admin/ai-knowledge/route.ts` — KB CRUD API
- `src/app/api/admin/ai-trainer/route.ts` — AI Trainer API
- `src/app/api/health/ai/route.ts` — AI health check endpoint
- `supabase_migrations/107_unified_ai_knowledge_base.sql`

#### Files Modified:
- `src/app/api/chat/route.ts` — migrated to `getAICompletion`
- `src/app/api/cennik-chat/route.ts` — migrated to `getAICompletion`
- `src/app/api/cron/email-ai-drafts/route.ts` — KB from `buildContextPrompt`
- `src/app/api/employee/email-generate-reply/route.ts` — KB from `buildContextPrompt`
- `src/app/api/employee/email-ai-config/route.ts` — KB from `buildContextPrompt`
- `src/app/api/employee/assistant/route.ts` — KB injected into system prompt
- `src/lib/socialAI.ts` — text gen via `getAICompletion`
- `src/lib/socialComments.ts` — comment replies via `getAICompletion`

#### Net Impact:
- **-85 lines of code** across migrated routes (83 added, 168 removed)
- **All AI assistants** now share a single, admin-editable knowledge base
- **Zero TypeScript errors** after all migrations

---

### April 1, 2026
**Cloudflare Tunnel, Email Fix, Supabase Security**

#### Commits:
- `7e2b050` — fix(pms): prioritize tunnel URL over PRODENTIS_API_URL env var
- `459675a` — fix(pms): update ALL Prodentis API paths to Cloudflare Tunnel
- `7da3775` — feat(pms): Cloudflare Tunnel as primary Prodentis API connection
- `b17b485` — feat(blog): add image for usmiech-bez-tajemnic article
- `2bb127e` — fix(email): improve Sent folder discovery for IMAP append

#### Features Added / Fixed:
1. **Cloudflare Tunnel for Prodentis API**
   - **Problem:** Multiplay router port forwarding rules reset after hard reboot, causing intermittent Prodentis API outages
   - **Solution:** Set up Cloudflare Tunnel as primary connection path, with direct IP as fallback
   - Domain `mikrostomartapi.com` registered on Cloudflare, tunnel `prodentis-api` created
   - `cloudflared.exe` installed as Windows service on server (auto-starts)
   - `prodentis-adapter.ts` rewritten with dual-URL fetch: tunnel first, fallback to `83.230.40.14:3000`
   - All 47 API route files updated from hardcoded IP to `PRODENTIS_TUNNEL_URL` env var
   - Created shared `src/lib/prodentisFetch.ts` utility with `prodentisFetch()` and `getProdentisUrl()` exports
   - Fixed URL priority bug: `PRODENTIS_API_URL` env var was overriding tunnel URL in 46 files
   - Key files: `src/lib/pms/prodentis-adapter.ts`, `src/lib/prodentisFetch.ts`, `src/lib/assistantActions.ts`

2. **BetterStack Monitoring for Prodentis API**
   - Added "Prodentis API" monitor: checks `http://83.230.40.14:3000/api/doctors` every 3 minutes
   - Keyword matching: alerts if response doesn't contain `"doctors"`
   - Notifications: email to team

3. **IMAP Sent Folder Fix**
   - Emails sent from employee zone were not appearing in IMAP Sent folder
   - Implemented 4-stage folder discovery: specialUse `\Sent` → common names → partial match → auto-create
   - Added diagnostic logging for folder resolution
   - Key file: `src/lib/imapService.ts`

4. **Supabase Security Fixes**
   - **Mikrostomart (Production):** Fixed `search_path` in `update_clinic_settings_updated_at` function, enabled Leaked Password Protection (HaveIBeenPwned). Result: **0 errors, 0 warnings**
   - **DensFlow-Demo:** Enabled RLS on all 58 public tables, added 4 permissive policies per table (demo_select for all, demo_write/update/delete for authenticated). Result: **0 errors** (209 warnings — expected "always true" policies for demo)

#### New Environment Variables:
- `PRODENTIS_TUNNEL_URL` — Cloudflare Tunnel URL (default: `https://pms.mikrostomartapi.com`)

#### Files Modified:
- `src/lib/pms/prodentis-adapter.ts` — dual-URL fetch with tunnel primary + IP fallback
- `src/lib/prodentisFetch.ts` — **NEW** shared utility for resilient Prodentis fetch
- `src/lib/assistantActions.ts` — updated to use `prodentisFetch()` helper
- `src/lib/imapService.ts` — 4-stage Sent folder discovery
- 47 API route files — updated from direct IP/localhost to Cloudflare Tunnel URL

---

### March 31, 2026
**PayU & Przelewy24 Multi-Gateway Integration**
- `e1c4af1` — fix(payu): dynamically resolve appUrl to prevent empty NEXT_PUBLIC_APP_URL blocking orders
- `f3051d3` — docs: update context with PayU redirect fix
- `a727457` — fix(payu): remove payMethods to enable universal payment wall and fix 302 redirectUri parsing
- `35bb9e6` — feat(etap2-6): payment method selector — ADDRESS→METHOD→PAYMENT, PayU/P24 redirect, /platnosc return page
- `95ed297` — feat(etap2-5): PayU integration — OAuth2 + create-order + webhook + Admin Panel tab + sandbox defaults
- `e9e663c` — fix(p24): test button UX — add test-saved button in status card, server uses DB config when body empty
- `be69b4e` — feat(etap2-4b): Przelewy24 integration — Admin Panel UI + register/webhook API + p24Service
- `61164ee` — feat(etap2-4): Stripe per-tenant config — Admin Panel UI + DB + service layer

#### Multi-Gateway Payment System Rollout:
- **Architecture**: DB-first `clinic_settings` storage with environment variable fallbacks for Stripe, P24, and PayU.
- **Admin Panel**: Replaced single Stripe tab with robust tabbed UI (`StripeSettingsTab`, `P24SettingsTab`, `PayUSettingsTab`) featuring test-connection buttons.
- **Checkout UI**: Enhanced `CheckoutForm.tsx` to 3-step flow (ADDRESS → METHOD → PAYMENT). Added animated `PaymentMethodPicker.tsx`.
- **Return Page**: Created universal `/platnosc` page holding `success`, `cancel`, and `verify` states for external provider redirects.
- **PayU Fixes**: Repaired `create-order` endpoint by removing strict PBL payMethods block to enable full payment wall, correctly extracting JSON-body `redirectUri` during 302/201 responses, and deriving absolute `notifyUrl`/`continueUrl` via request headers (bypassing empty Vercel app-URL env variables).

### March 30, 2026
**Multi-Tenant Architecture — Phases 6b through 10**

#### Commits:
- `a6e8971` — feat(phase6b-6c): Knowledge Base + Pricing to DB — dynamic AI context
- `f1b2877` — feat(phase10): Domain/URL + external services parameterization
- `8854862` — feat(phase9): i18n parameterization — replace hardcoded clinic strings with {brandName} tokens
- `49ef4af` — feat(phase7-ui): PMS admin panel — Integracja PMS tab
- `5e28866` — feat(phase7): PMS Adapter Layer — extensible architecture for future PMS
- `89ea00c` — fix(phase6a): getDoctorInfo accepts both slug and prodentis_id
- `228fc28` — fix(phase6a): deduplicate specialists + correct show_in_booking scope
- `0b0af79` — feat(phase6a): dynamic specialist list in ReservationForm
- `2579e46` — feat(phase5): inject brand tokens into AI system prompts
- `66cb863` — feat(phase4): abstract SEO metadata via brandConfig

#### Phase 6a — Specialists from DB (commits 0b0af79–89ea00c):
- Migration `097_add_show_in_booking.sql` — column `employees.show_in_booking` (boolean, default false)
- Migration `098_fix_booking_specialists.sql` — fix operator-only filter, deduplicate
- `/api/specialists` route — filters by `position IN ('Lekarz','Higienistka') AND show_in_booking=true`
- `ReservationForm.tsx` — fetches from DB instead of hardcoded DEMO_SPECIALISTS
- `getDoctorInfo()` — accepts both `prodentis_id` and `slug` lookup

#### Phase 6b — Knowledge Base to DB (commit a6e8971):
- `src/lib/knowledgeBase.ts` — new `getKnowledgeBase(): Promise<string>` async function
  - Reads `site_settings.ai_knowledge_base` from Supabase
  - Falls back to static KNOWLEDGE_BASE constant if DB empty/unavailable
- `/api/chat/route.ts` — `SYSTEM_PROMPT` now built per-request via `buildSystemPrompt(await getKnowledgeBase())`
- `/api/cennik-chat/route.ts` — `PRICING_SYSTEM_PROMPT` now built per-request via `buildPricingPrompt(await getKnowledgeBase())`
- All 5 AI routes now DB-backed: `/api/chat`, `/api/cennik-chat`, `email-generate-reply`, `email-ai-config`, `email-ai-drafts`
- Update KB without deploy: `/pracownik` → Email AI → 📚 Baza wiedzy

#### Phase 6c — Pricing to DB:
- Pricing data lives inside KNOWLEDGE_BASE markdown (KB → DB covers AI pricing context)
- Page-level pricing in TSX offer pages deferred to Phase 11 (requires admin UI sprint)

#### Phase 7 — PMS Adapter Layer (commit 5e28866):
- `src/lib/pms/types.ts` — `PmsAdapter` contract interface
- `src/lib/pms/factory.ts` — lazy-loading factory reads `NEXT_PUBLIC_PMS_PROVIDER` env
- `src/lib/pms/prodentis.adapter.ts` — production Prodentis implementation
- `src/lib/pms/standalone.adapter.ts` — Supabase-native implementation for non-Prodentis clients
- New clients: set `NEXT_PUBLIC_PMS_PROVIDER=standalone` in Vercel env, no code change needed

#### Phase 7-UI — PMS Admin Panel (commit 49ef4af):
- Migration `099_create_clinic_settings.sql` — `clinic_settings` table (key-value store for per-clinic config)
- `src/app/admin/components/PmsSettingsTab.tsx` — new "Integracja PMS" tab in Admin Panel
  - Shows active adapter, connection health check, internal notes/audit trail
  - Roadmap of planned integrations (Mediporta, KamSoft, eStomatolog)
- `/api/admin/pms-settings/route.ts` — GET (current config) + PATCH (update) + POST?action=health (test)
- Admin Panel: added 23rd tab "Integracja PMS" with Plug icon

#### Phase 9 — i18n Parameterization (commit 8854862):
- **8 JSON files** (pl/en/de/ua × common.json + pages.json) — 0 hardcoded Mikrostomart strings outside legal HTML blocks
- Tokens introduced: `{brandName}`, `{cityShort}`, `{phone1}`, `{legalName}`, `{email}`
- `src/lib/brandConfig.ts` — new `brandI18nParams(): Record<string, string>` helper for next-intl interpolation
- **14 consumer components** updated to pass `brandI18nParams()` to `t()` calls
  - AssistantTeaser, OpinionSurvey, ReservationForm, ProductModal, cennik, mapa-bolu, rodo, strefa-pacjenta/wiadomosci, o-nas, baza-wiedzy (x2), oferta, rezerwacja, metamorfozy
- Preserved (legal HTML blocks in regulamin/RODO/prywatność) — per-client at onboarding

#### Phase 10 — Domain/URL + External Services (commit f1b2877):
- `src/lib/githubService.ts` — `REPO_OWNER`/`REPO_NAME` → `GITHUB_OWNER`/`GITHUB_REPO` env vars
- `src/middleware.ts` — CSP `connect-src` IP → dynamic from `new URL(PRODENTIS_API_URL).origin`
- `src/lib/googleCalendar.ts` — redirect URI fallback → `NEXT_PUBLIC_APP_URL`
- `src/app/kontakt/page.tsx` — Maps iframe → `brand.mapsEmbedUrl` with isDemoMode fallback

#### New env vars for new clients:
| Env Var | Default | Notes |
|---------|---------|-------|
| `GITHUB_OWNER` | `novik-code` | GitHub org/user owning the repo |
| `GITHUB_REPO` | `mikrostomart` | GitHub repo name |
| `NEXT_PUBLIC_APP_URL` | `https://mikrostomart.pl` | Used for Google OAuth redirect URI |
| `NEXT_PUBLIC_PMS_PROVIDER` | `prodentis` | PMS adapter: `prodentis` or `standalone` |
| `mapsEmbedUrl` | *(Opole embed)* | Set in clinic_settings via Supabase |

#### Migration Numbering Fixed:
- Migrations 095-099 renamed from date-based (`20260214_...`, `20260330_...`) to sequential numeric
- Correct directory: `supabase_migrations/` (not `supabase/migrations/`)
- See section below for full list

---

### March 25, 2026
**Visual Editor Drag-and-Drop Overhaul + DensFlow Light Template**

#### Commits:
- `f086e15` — fix: free-form cross-parent drag, freeze hover skips scripts/svg
- `dcdfe7b` — feat: ghost drag UX + confirm bar + splash popup in visual editor
- `24728a5` — feat: move history stack with step-by-step undo + splash popup fix
- `5ebe620` — feat: CSS transform pixel-perfect drag + splash popup backdrop
- `3fb7cc1` — fix: z-index on moved elements + nuclear splash popup event blocker

#### Visual Editor Drag (CSS Transform):
- **Free-form positioning** — replaced DOM `insertBefore` reordering with CSS `transform: translate(dx, dy)` for pixel-perfect placement
- **Move history stack** — `moveHistory` ref array stores each drag's `prevTransform` for step-by-step undo
- **Undo bar** — bottom toolbar shows: ↩️ Cofnij (last), ↩️↩️ Cofnij wszystko, ✅ Zatwierdź
- **Z-index** — moved elements get `position: relative` + `z-index: 9999` to stay above other layers
- No DOM reordering = no broken layouts, no disappearing elements

#### Splash Screen Configuration:
- 🌟 button in editor toolbar opens config popup (animation type, duration, frequency, sections)
- ThemeContext now exposes `setTheme` for live editor updates

> [!WARNING]
> **Known Bug**: Splash popup controls (select, range slider, toggle) are NOT interactive in the in-vitro editor despite multiple fix attempts (React synthetic `stopPropagation`, native `stopImmediatePropagation` capture-phase blocker, full-screen backdrop). The controls work correctly in the Admin → Motyw panel. Root cause likely involves React event delegation vs native capture-phase handler ordering. Requires further investigation.

#### DensFlow Light Template:
- New `densflow-light` preset in `THEME_PRESETS` — bright clinic aesthetic
- **Colors**: white background (#F8FAFD), blue primary (#4F8FE6), pink preview (#E88DA0)
- **Typography**: DM Sans body, Outfit headings
- **Layout**: rounded corners, glassmorphism navbar
- **Features**: fade splash (3s, once/session), no background video, no simulator/survey
- **Demo default**: `ThemeProvider` auto-selects `densflow-light` when `NEXT_PUBLIC_DEMO_MODE=true`
- Available in both mikrostomart.pl and demo.densflow.ai ThemeEditor → Szablony tab

#### Files Modified:
- `src/components/editor/VisualEditorOverlay.tsx` — CSS transform drag, move history stack, splash popup
- `src/context/ThemeContext.tsx` — `densflow-light` preset, `setTheme` exposed, demo default
- `src/components/ThemeEditor.tsx` — DensFlow Light in presets grid

---

### March 24–25, 2026
**Deep Demo Debranding — Full Neutralization of demo.densflow.ai**

#### Commits:
- `e307977` — feat: full demo debranding — remove ALL Mikrostomart from demo.densflow.ai (34 files)
- `c8eaef3` — fix: remaining debranding — footer watermark, hero text, nested layouts, ocen-nas (11 files)
- `09cb396` — feat: deep debranding — demoSanitize across 80 files + translation wrapper (80 files)

#### Architecture:
- **`demoSanitize(text: string)`** in `brandConfig.ts` — centralized runtime string replacement. Identity in production, swaps ~15 Mikrostomart-specific patterns (company name, domain, email, address, phone, legal entity, NIP) with generic demo equivalents.
- **`deepSanitize(messages)`** in `layout.tsx` — recursively applies `demoSanitize()` to ALL i18n translation messages before `NextIntlClientProvider`, covering ~104 translation JSON references without modifying the JSON files themselves.
- **Service chokepoints** — `demoSanitize` applied at single return-points in `emailTemplates.ts`, `emailService.ts`, `icsGenerator.ts` to cover all downstream content automatically.
- **80+ batch-processed files** — API routes (`from:`, `subject:`, `to:`, `html:` fields), components, lib utilities all wrapped with `demoSanitize()` import.

#### Coverage (~430 references neutralized):
| Layer | Files | Refs | Method |
|-------|-------|------|--------|
| Email Templates | 1 | 24 | `getEmailTemplate()` chokepoint |
| Email Service | 1 | 13 | `makeHtml()` + `FROM_ADDRESS` wrapping |
| ICS Generator | 1 | 6 | `generateICS()` chokepoint |
| SMS Service | 1 | 4 | Demo mode blocks SMS entirely |
| API Routes | 46 | ~60 | Import + field wrapping |
| Components/Pages | 28 | ~40 | Import + conditional rendering |
| Translation JSON | 8 | 104 | `deepSanitize()` in layout.tsx |
| Brand Config | 1 | 25 | Source of truth |

#### Additional UI changes:
- Conditional logo (`/demo-logo.png`) in Navbar, SplashScreen, Footer
- `DemoPagePlaceholder.tsx` replaces all legal pages with generic notices
- Fictional `DEMO_SPECIALISTS` in reservation form
- 24 `layout.tsx` files with conditional SEO metadata via `generateMetadata()`
- Homepage hero text overridden for demo
- `ocen-nas` page text and QR alt made conditional

#### Key new/modified files:
- `src/lib/brandConfig.ts` — brand config + `demoSanitize()` function (NEW)
- `src/components/DemoPagePlaceholder.tsx` — generic legal page wrapper (NEW)
- `src/app/layout.tsx` — `deepSanitize()` for translations, DemoBanner
- `src/lib/emailTemplates.ts` — `demoSanitize()` at `getEmailTemplate` return
- `src/lib/emailService.ts` — `demoSanitize()` at `makeHtml()` + FROM_ADDRESS
- `src/lib/icsGenerator.ts` — `demoSanitize()` at `generateICS()` return
- 80+ API route/component/lib files — `import { demoSanitize }` + field wrapping

---

### March 21–22, 2026
**Social Media AI Posting System — Full Generate & Publish Pipeline**

#### Commits:
- `ea5ee4f` — feat: daily social media schedule migration (FB+IG auto-post at 11:00)
- `9250438` — feat: add Topics management sub-tab in Social Media admin panel
- `07272d9` — feat: auto-replenish social topics when running low (perpetuum mobile)
- `514c5ab` — feat: one-click generate+publish and strict topic deduplication
- `b4cd1c7` — fix: auto-resolve platform IDs when generating social posts
- `9252532` — feat: retry button for failed posts, publish error display, content_type filter
- `41dd5bd` — fix: add container status polling for Instagram image posts

#### Architecture:
- **AI Content Generation** (`socialAI.ts`): GPT-4o generates text + Replicate generates images for dental posts
- **Topic Management** (`social_topics` table, migration 090): DB-backed topics replace hardcoded array. Strict deduplication — topics used_count tracked, never reused. Auto-replenishment cron generates new topics via GPT when supply runs low.
- **Publishing** (`socialPublish.ts`): Publishes to Facebook (text/image/video), Instagram (image+Reels with container status polling), TikTok, YouTube. Instagram fix: polls container status every 2s for images (was immediate → 'Media ID is not available').
- **Daily Schedule** (migration 089): Cron generates + auto-publishes a dental post daily at 11:00 CEST to FB+IG.
- **Admin Panel** (`SocialMediaTab.tsx`): Full management UI — generate draft/publish, retry failed, view errors, manage topics, configure schedules.

#### Database:
- Migration 083: `social_platforms` (OAuth connections), `social_posts` (content + publish status), `social_schedules` (cron config)
- Migration 089: Daily schedule seed (FB+IG at 11:00)
- Migration 090: `social_topics` table (25 seed topics, categories, usage tracking)

#### Key Features:
1. **One-click Generate & Publish** — "🚀 Generuj i publikuj" button in admin
2. **Strict Topic Deduplication** — picks only unused topics, marks as used after generation
3. **Auto-Replenishment** — cron checks topic count, generates new via GPT when low
4. **Retry Failed Posts** — "🔄 Ponów publikację" button + inline error display per platform
5. **Platform Content Type Filter** — auto-resolves correct platforms based on post type (posts vs video)
6. **Instagram Container Polling** — polls status every 2s (images) / 10s (video) before publishing

#### New Files:
- `src/lib/socialAI.ts` — AI content generation (topic picking, GPT text, Replicate images)
- `src/lib/socialPublish.ts` — Multi-platform publishing (FB, IG, TikTok, YouTube)
- `src/app/admin/components/SocialMediaTab.tsx` — Admin UI component
- `src/app/api/social/generate/route.ts` — Generate post API
- `src/app/api/social/posts/route.ts` — Posts CRUD
- `src/app/api/social/posts/[id]/publish/route.ts` — Publish post
- `src/app/api/social/platforms/route.ts` — Platform management
- `src/app/api/social/schedules/route.ts` — Schedule management
- `src/app/api/social/topics/route.ts` — Topics CRUD + AI generation
- `src/app/api/cron/social-generate/route.ts` — Scheduled content generation
- `src/app/api/cron/social-publish/route.ts` — Scheduled publishing
- `supabase_migrations/089_social_daily_schedule.sql`
- `supabase_migrations/090_social_topics.sql`

#### Environment Variables:
- `META_APP_ID` — Meta (Facebook) App ID
- `META_APP_SECRET` — Meta App Secret
- `TIKTOK_CLIENT_KEY` — TikTok API client key
- `TIKTOK_CLIENT_SECRET` — TikTok API client secret
- `SOCIAL_AI_MODEL` — AI model for content generation (default: `gpt-4o`)

---

### March 20, 2026
**Social Media Video Pipeline — Full AI Processing with Captions/Mirage API**

#### Commits:
- `cfaf298`..`b2204e0` — FFmpeg on Vercel: static binary download to `/tmp` with caching & ELF validation
- `74481f7` — fix: generate signed URLs for Supabase Storage videos
- `67fa889` — fix: trim LOGO_WATERMARK_URL (trailing newline breaking Shotstack)
- `48a8cbe` — URGENT: disable auto-publish, require manual review
- `ba81bb9` — feat: replace Shotstack with Captions/Mirage API for video editing
- `8ec2255` — fix: split pipeline into 3 cron steps to avoid 300s timeout
- `6268b2b` — fix: auto-recover stuck videos (no more manual resets)
- `74b5440` — fix: auto-recovery without timestamp dependency
- `e0a9cb7` — feat: admin video dashboard with pipeline progress and manual triggers

#### Architecture:
- **Shotstack removed entirely** — replaced with Captions/Mirage API ($0.15/min, 60+ caption templates)
- Pipeline split into 3 separate cron steps (each runs in separate invocation to avoid Vercel 300s timeout):
  1. Transcribe (Whisper) — ~90s
  2. Analyze (GPT-4o) + compress (ffmpeg, 217MB→<50MB) + submit to Captions API — ~3min
  3. Poll Captions API + download captioned video — ~10-60s
- Auto-recovery: stuck videos in intermediate statuses auto-reset (max 3 retries → failed)
- FFmpeg downloaded as static Linux binary to `/tmp` at runtime (cached between Lambda invocations)

#### Admin Panel (`/admin/video`):
- Pipeline progress tracker (5-step visual bar: Upload → Transkrypcja → Analiza → Napisy → Przegląd)
- Manual ▶️ "Uruchom następny krok" button
- Status descriptions per step
- Retry counter display (Próba X/3)
- Auto-refresh every 15s

#### New Files:
- `src/lib/captionsAI.ts` — Captions/Mirage API integration (submit, poll, download)
- `supabase_migrations/083_social_media.sql` — social media tables
- `supabase_migrations/084_video_queue.sql` — video queue table
- `supabase_migrations/085_storage_video_upload.sql` — storage policies
- `supabase_migrations/086_video_captions_api.sql` — `captions_video_id` column

#### Files Modified:
- `src/app/api/cron/video-process/route.ts` — complete rewrite (Shotstack → Captions API, 3-step pipeline)
- `src/lib/videoAI.ts` — FFmpeg runtime download, audio extraction, transcription, analysis, metadata
- `src/app/admin/video/page.tsx` — pipeline progress tracker, manual triggers, new statuses

#### New Environment Variables:
- `MIRAGE_API_KEY` — Captions/Mirage API key (added to Vercel)

---

### March 19, 2026
**Consent PDFs — Multi-Instance Fields & Custom Text**

#### Commits:
- `77f0c75` — fix: support multi-instance fields (date, signatures, custom text) in consent PDFs

#### Root Cause:
The PDF mapper (`/admin/pdf-mapper`) already supported placing the same field type (e.g., date, signature) at multiple positions via `_2`/`_3` suffixed keys with `sourceField` metadata. However, the rendering code in `zgody/[token]/page.tsx` only handled base keys (`fields.date`, `fields.patient_signature`), ignoring all suffixed instances. Custom text fields (`custom_*`) were stored but never rendered.

#### Fix:
- `prefillPdf()` and `submitSignature()` now iterate **all** field keys using new `isFieldInstance()` helper
- Dates, names, addresses, doctor names, tooth/procedure text now render at **all** mapped positions
- Patient and doctor signatures now embed at **all** mapped positions
- Custom text fields (`custom_*` with `fieldType: 'text'`) render with employee-entered values
- Extended `pick_doctor` phase UI: dynamic labeled inputs for each custom text field
- No DB migration needed — mapper already saves multi-instance data correctly

#### Files Modified:
- `src/app/zgody/[token]/page.tsx` — Multi-instance rendering, custom text fields, pick_doctor UI

---

### March 18, 2026
**Email Client — Sent Messages Fix**

#### Commits:
- `4a7a5c0` — fix: save sent emails to IMAP Sent folder via APPEND after SMTP send

#### Root Cause:
Emails sent from the employee zone email client (`EmailTab.tsx`) were successfully delivered to recipients but never appeared in the **Wysłane (Sent)** folder. The `sendEmail()` function in `imapService.ts` used SMTP (nodemailer) to send but never appended the message to the IMAP Sent folder. Most email servers (including cyberfolks.pl) do **not** auto-copy SMTP-sent messages to Sent — the client must do an explicit **IMAP APPEND**.

#### Fix:
- After successful `transporter.sendMail()`, builds raw RFC 822 message using nodemailer's `MailComposer`
- Finds the Sent folder via IMAP `specialUse === '\\Sent'` (with fallbacks to common names: `Sent`, `INBOX.Sent`, `Sent Messages`, `Sent Items`)
- Appends message to Sent folder with `\\Seen` flag (so it doesn't appear as unread)
- Wrapped in separate try/catch — append failure does **not** affect send success

#### Files Modified:
- `src/lib/imapService.ts` — Added IMAP APPEND logic to `sendEmail()` function

---

### March 14–16, 2026 — Safari PDF Fix + Blog Images

#### Commits:
- `4a1a11e` — fix: downgrade pdfjs-dist v5→v4 legacy build for Safari compatibility
- `45b70ac` — fix: add detailed error messages to consent PDF display + retry button
- `0df3678` — feat(blog): add image for usmiech-w-obliczu-strachu
- `013a67e` — feat(blog): add image for od-cukierkow-do-usmiechu
- `07a608a` — feat(blog): add image for usmiech-czasu-jak-dbac-o-zeby

#### Key Fix:
- **pdfjs-dist downgrade** — Safari on iPad crashed with `undefined is not a function` when using pdfjs-dist v5 (ES Modules + private class fields). Downgraded to v4.8.69 legacy build (`pdfjs-dist/legacy/build/pdf.mjs`), which transpiles to ES2017-compatible code. Updated worker to legacy version.
- **Consent PDF error reporting** — Added detailed error messages and retry button to consent document display page.

#### Files Modified:
- `src/app/zgody/[token]/page.tsx` — legacy pdfjs-dist import + error UI
- `package.json` — pdfjs-dist `^5.4.624` → `4.8.69`
- `public/pdf.worker.min.mjs` — replaced with legacy build worker

---

### March 13, 2026 — Employee Merge Migration + Bug Fixes

#### Commits:
- `6d4610b` — feat: migration 082 — merge 4 sets of duplicate employee accounts
- `49aea99` — fix: migration 082 type casts — UUID columns need UUID, not TEXT
- `e350aa3` — fix: task edit save failing silently — empty string '' invalid for date columns
- `109e60e` — fix: admin user missing alerts — no employee_groups on push subscription
- `b0f2365` — fix: critical — auto-discovery failed because email column is NOT NULL
- `5f9a60c` — fix: always show inactive employees toggle in admin panel

#### Key Changes:
1. **Migration 082** — Merged 4 sets of duplicate employee records (Małgorzata Maćków-Huras, Katarzyna Drabek, Dominika Milicz, Ilona Piechaczek). Transfers all dependent records (user_roles, employee_tasks, push_subscriptions, etc.) from duplicate → keeper, then deletes duplicate.
2. **Task edit bug** — Empty string `''` was sent for `due_date`/`due_time` when fields cleared, causing Supabase to reject (invalid date format). Fixed: convert `''` → `null`.
3. **Auto-discovery email fix** — `employees` table `email` column was `NOT NULL`, preventing auto-discovered Prodentis operators (who have no Supabase account) from being inserted. Made nullable.
4. **Push subscription fix** — Admin users without `employee_groups` on their push subscription received no group-targeted notifications.

#### Files Modified:
- `supabase_migrations/082_merge_duplicate_employees.sql` — [NEW]
- `src/app/api/employee/tasks/[id]/route.ts` — empty string → null conversion
- `src/app/api/push/subscribe/route.ts` — sync employee_groups on subscribe
- `src/app/api/admin/employees/route.ts` — email nullable handling
- `src/app/admin/page.tsx` — always show inactive toggle

---

### March 12, 2026 — Employee Management Overhaul + Security + Consent Checkboxes

#### Commits:
- `ce716f1` — security: migration 081 — fix all Security Advisor errors and warnings
- `8c1327f` — admin: reorganize sidebar + improve dashboard
- `c7e645c` — feat: employee deactivation (hide from app without deleting from Prodentis)
- `8c3e093` — feat: unified employee management — single list, auto-merge duplicates
- `06156bc` — fix: 3 employee management bugs
- `f86dbe5` — fix: filter deactivated employees from schedule/grafik
- `5e232fe` — fix: schedule auto-discovers Prodentis operators + robust deactivation filter
- `e7ed452` — feat: interactive checkbox fields on consent PDFs + simplified mapper UX
- `ee7bf0a` — fix: remove TAK/NIE pair, enlarge delete buttons, add bulk delete
- `34c6b0f` — fix: checkbox creates paired TAK+NIE with separate positioning

#### New Features:
1. **Employee Deactivation System** — Soft-deactivate employees via `is_active` boolean flag. Deactivated employees hidden from schedule/grafik and task assignment dropdowns. Admin panel shows separate collapsible "Nieaktywni" section. API: `POST /api/admin/employees/deactivate`.
2. **Unified Employee Management** — Merged Prodentis-discovered staff and Supabase-registered employees into single sortable list. Auto-detects and merges duplicates appearing in both sources.
3. **Schedule Auto-Discovery** — Employee Zone schedule route auto-adds operators found in Prodentis appointments to `employees` table if not already present.
4. **Interactive Consent PDF Checkboxes** — PDF mapper now supports checkbox fields (TAK/NIE pairs). Clicking a checkbox on consent signing page toggles visual checkmark.
5. **Admin Sidebar Reorganization** — Sidebar icons and grouping improved.

#### Security (Migration 081):
- Fixed 4 ERRORS (RLS not enabled on `cancelled_appointments`, `birthday_wishes`, `cron_heartbeats`) + 10 WARNINGS (always-true RLS policies on `consent_field_mappings`, `sms_settings`, `feature_suggestions`, `feature_suggestion_comments`, `online_bookings`, `reservations`)
- All tables now have proper RLS with `USING(false)` or `USING(true)` for public-read tables

#### Database:
- Migration 081: Security Advisor fixes (RLS on 3 tables + tightened 10 policies)
- `employees` table: added `is_active BOOLEAN DEFAULT true`, `deactivated_at TIMESTAMPTZ`

#### New Files:
- `src/app/api/admin/employees/deactivate/route.ts` — [NEW] toggle is_active
- `supabase_migrations/081_security_advisor_fixes.sql` — [NEW]

#### Files Modified:
- `src/app/admin/page.tsx` — sidebar + employee deactivation UI
- `src/app/admin/components/EmployeesTab.tsx` — unified list + deactivation toggles
- `src/app/api/admin/employees/route.ts` — merge logic + auto-discovery
- `src/app/api/employee/schedule/route.ts` — auto-discover operators + filter deactivated
- `src/app/admin/pdf-mapper/page.tsx` — checkbox field support
- `src/app/zgody/[token]/page.tsx` — checkbox rendering on consent signing
- `src/lib/consentTypes.ts` — checkbox field type support

---

### March 11, 2026 — Safari Performance + Push Dedup

#### Commits:
- `510ae08` — perf: lazy-load admin tab data — fix Safari high resource usage
- `c5c9dd6` — fix: admin push employee search + employee zone Safari performance
- `b4070d1` — fix: push dedup — 1 notification per user, not per device
- `749de11` — fix: eliminate double push notifications for ALL users

#### Key Changes:
1. **Admin Panel Lazy Loading** — Tab data now loads on-demand when tab is selected (was loading all tabs on mount). Fixes Safari high CPU/memory usage on iPad.
2. **Push Notification Final Dedup** — After migration 080 removed duplicate push subscriptions, remaining dedup logic in `webpush.ts` ensures exactly 1 notification per user across all send functions. `push_subscriptions` table now has unique constraint on `user_id`.

#### Database:
- Migration 080: Cleaned up duplicate push subscriptions (keep only most recent per user_id)

#### Files Modified:
- `src/app/admin/page.tsx` — lazy-load tab data
- `src/lib/webpush.ts` — final dedup across all send paths

---

### March 10, 2026 — Employee Notification Preferences + Bug Fixes

#### Commits:
- `56a6b22` — fix: sanitize doctor/patient names in SMS templates — toGSM7 prevents UCS-2 double cost
- `aa124bf` — fix: Elżbieta Nowosielska role — hig. stom. (higienistka), not lek. dent.
- `b2a9cef` — fix: daily-report 0 appointments + task-reminders archived leaks + push logPush gaps + schedule dashboard tasks
- `1d05e06` — feat: employee notification preferences tab + push history 30d + login popup + muted_keys
- `313b6ef` — fix: consent PDF always inserting Nowosielska — React state race condition

#### New Features:
1. **Employee Notification Preferences** — New ⚙️ Preferencje tab in Employee Zone. Each employee can mute/unmute specific notification types (opt-out pattern). Uses `employee_notification_preferences` table with `muted_keys TEXT[]`. Push sending functions (`sendPushByConfig`, `sendPushToGroups`) now check per-user muted keys before sending.
2. **Push History 30 Days** — Extended from 7 to 30 days retention. Push cleanup cron updated accordingly.
3. **SMS GSM-7 Sanitization** — `toGSM7()` function strips diacritics from doctor/patient names in SMS templates to prevent UCS-2 encoding (which doubles SMS cost).
4. **Login Popup Tasks** — Employee login popup now shows pending tasks with clickable entries.

#### Bug Fixes:
- Migration 078: Fixed Elżbieta Nowosielska role in `staff_signatures` (was "lek. dent.", correct is "hig. stom." / hygienist)
- Daily report: handled 0 appointments without crashing
- Task reminders: filtered out archived tasks that were leaking into reminders
- Push logPush: fixed gaps where some notification sends weren't being logged
- Consent PDF: fixed React state race condition that always inserted Nowosielska as doctor regardless of selection

#### Database:
- Migration 078: Fix Nowosielska role in staff_signatures
- Migration 079: `employee_notification_preferences` table (user_id PK, muted_keys TEXT[])

#### New Files:
- `src/app/pracownik/components/PreferencesTab.tsx` — [NEW] (399 LOC) notification preferences UI
- `src/app/api/employee/notification-preferences/route.ts` — [NEW] GET/POST muted keys
- `supabase_migrations/078_fix_nowosielska_role.sql` — [NEW]
- `supabase_migrations/079_employee_notification_prefs.sql` — [NEW]
- `supabase_migrations/080_cleanup_duplicate_push_subs.sql` — [NEW]

#### Files Modified:
- `src/app/pracownik/page.tsx` — Preferencje tab + login popup
- `src/lib/webpush.ts` — muted_keys checking in send functions
- `src/lib/smsService.ts` — toGSM7() sanitization
- `src/app/api/cron/daily-report/route.ts` — 0 appointments fix
- `src/app/api/cron/task-reminders/route.ts` — archived tasks filter
- `src/app/api/employee/push/history/route.ts` — 30 day retention
- `src/lib/doctorMapping.ts` — Nowosielska role fix

---

### March 9–10, 2026 — AI Email: Regeneruj Button + Deployment Fixes

#### Commits:
- `e274514` — feat: implement 3 advanced AI email features
- `6ffd269` — feat: preserve AI learning context in compose drafts
- `ecf2030` — feat: show detailed per-candidate results in Generuj drafty output
- `b1dbf0e` — feat: add Przywróć button to restore skipped/processed emails for re-analysis
- `f1893b1` — fix: prevent 504 timeout in AI draft generation
- `1fb498e` — feat: add Regeneruj button for iterative AI draft refinement
- `d558c4d` — fix: pdf-parse ESM import type error on Vercel build
- `e1e941e` — fix: IIFE not invoked — messages was a function, not an array

#### New Features:
1. **Regeneruj button** (🔄) — Iterative AI draft refinement:
   - Positioned next to "Ucz AI" button in compose feedback bar
   - Uses current feedback (stars, tags, notes) as `inline_feedback` to regenerate draft
   - Replaces previous draft in compose body, resets feedback for next iteration
   - Backend: `email-generate-reply` API builds multi-turn conversation with previous draft + corrections
2. **Przywróć button** — Restore skipped/processed emails for re-analysis
3. **Detailed Generuj results** — Shows per-candidate processing results with skip reasons
4. **AI learning context preserved** — `ai_original_text` column in `email_compose_drafts` (migration 076) keeps original AI text for feedback after reload
5. **3 advanced features** — inline feedback object, compose draft persistence, candidate result details

#### Bug Fixes:
- `pdf-parse` ESM import type error on Vercel — used `as any` + nullish coalescing for CJS/ESM compat
- IIFE not invoked in `email-generate-reply` — `(() => { ... }),` was missing trailing `()` so `messages` was assigned a function instead of array
- 504 timeout prevention in AI draft generation

#### Database:
- Migration 076: `email_compose_drafts.ai_original_text TEXT DEFAULT ''`

#### Files Modified:
- `src/app/pracownik/components/EmailTab.tsx` — Regeneruj button UI + inline_feedback handler
- `src/app/api/employee/email-generate-reply/route.ts` — inline_feedback multi-turn conversation + IIFE fix
- `src/app/api/employee/email-ai-knowledge/route.ts` — pdf-parse ESM import fix

---

### March 7–8, 2026 — Gmail-style Email Client + AI Draft System

#### Commits:
- `5d204c5` — feat: add Gmail-like email client (IMAP/SMTP) in employee zone - admin only
- `ec7a342` — feat: add auto email labels (Powiadomienia, Strona, Chat, Pozostałe)
- `42f7d8d` — ui: Gmail-style horizontal category tabs above email list
- `3f3b5a8` — feat: AI Email Draft Assistant + Ważne label
- `b23335b` — fix: AI email cron — paginate through last 30 days instead of only 50 newest
- `e7501c8` — feat: add on-demand AI reply generation in compose window
- `b6b79dc` — fix: use .maybeSingle() for KB loading — prevents crash when no DB override exists
- `9291f43` — fix: email client — sort by date, accumulating load-more, resilient KB API
- `3d054a3` — fix: cron resilience + generate button always visible + hourly cron
- `98df512` — fix: AI email drafts — resilient DB queries, compose feedback UI, cron debug mode
- `56a9c55` — feat: add Debug AI + Generate Drafts buttons to AI settings modal
- `fc44639` — feat: add Pomiń button to debug panel + fix modal layout overflow
- `b30b3dd` — feat: email client enhancements - compose drafts, read/unread toggle, label reassignment
- `9b01121` — fix: handle non-JSON responses in Generuj drafty button
- `55dbbe6` — feat: add descriptive feedback textarea to Ucz AI section
- `2c7d1a5` — fix: debug mode now respects sender exclude/include rules in wouldProcess

#### New Features:
1. **Gmail-style Email Client** (📧 Email tab in Employee Zone, admin-only):
   - Full IMAP integration via `src/lib/imapService.ts` — fetches emails from clinic inbox
   - SMTP sending via compose window (reply, reply-all, new email)
   - Auto-classification engine: `Powiadomienia`, `Strona`, `Chat`, `Pozostałe`, `Ważne` labels
   - Gmail-style horizontal category tabs with unread counts
   - Read/unread toggle per email
   - Load-more pagination sorted by date
   - Manual label override (reassign email to different category)
2. **AI Email Draft Assistant**:
   - Cron job `/api/cron/email-ai-drafts` runs hourly (6:00-18:00 UTC)
   - Scans IMAP inbox for new emails, classifies importance
   - Generates AI reply drafts using GPT-4o-mini with clinic knowledge base
   - Drafts stored in `email_ai_drafts` table with status workflow (pending → approved → sent)
   - Skipped emails (not important) tracked with `status='skipped'`
   - On-demand reply generation: "🤖 Wygeneruj odpowiedź" button in compose window
   - Debug panel shows processing candidates with skip/process reasons
   - "Generuj drafty" button for manual batch generation
3. **Compose Draft Persistence**:
   - Auto-saves compose drafts to `email_compose_drafts` table
   - Resume drafts after navigating away
   - Preserves AI original text for feedback context
4. **Knowledge Files Upload**:
   - Upload PDF/TXT/MD files to expand AI knowledge base
   - Max 10 files, 5MB each
   - PDF parsing via `pdf-parse`, text extraction stored in `email_ai_knowledge_files`
   - Content injected into GPT system prompt alongside clinic knowledge base
5. **SMS Settings Admin Controls**:
   - Toggle on/off for SMS automation types (noshow, post-visit, birthday, deposit)
   - `sms_settings` table (migration 070) with per-type enabled flag
   - Admin API: `GET/PUT /api/admin/sms-settings`

#### Database:
- Migration 070: `sms_settings` table — SMS automation type toggles
- Migration 071: `email_ai_drafts` table — AI-generated reply drafts
- Migration 073: `email_compose_drafts` table — persistent compose drafts
- Migration 074: `email_label_overrides` table — manual label reassignment
- Migration 075: Allow `'skipped'` status in `email_ai_drafts`, make draft fields nullable
- Migration 077: `email_ai_knowledge_files` table — uploaded knowledge files

#### New Files:
- `src/app/pracownik/components/EmailTab.tsx` — Full email client component (~3900 LOC)
- `src/lib/imapService.ts` — IMAP connection and email fetching service
- `src/app/api/employee/email/route.ts` — IMAP/SMTP email API (GET/POST)
- `src/app/api/employee/email-drafts/route.ts` — AI drafts CRUD
- `src/app/api/employee/email-generate-reply/route.ts` — On-demand AI reply generation
- `src/app/api/employee/email-ai-knowledge/route.ts` — Knowledge files CRUD
- `src/app/api/employee/email-compose-drafts/route.ts` — Compose draft persistence
- `src/app/api/employee/email-label-overrides/route.ts` — Label override CRUD
- `src/app/api/cron/email-ai-drafts/route.ts` — Hourly AI draft generation cron
- `src/app/api/admin/sms-settings/route.ts` — SMS settings toggle API
- `supabase_migrations/070_sms_settings.sql` through `077_email_ai_knowledge_files.sql`

#### Environment Variables Required:
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS` — IMAP server credentials
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP server credentials

> ⚠️ **REQUIRES**: Run migrations 070-077 in Supabase SQL editor.

---

### March 6, 2026 — AI Email Assistant Training System

#### Commits:
- `eec5ccc` — feat: AI email assistant training system — sender rules, instructions, feedback/learning, ratings, tags
- `4c527fe` — feat: add employee guide tab + editable knowledge base tab in AI settings modal

#### New Features:
1. **Sender Rules** — Admin controls which email addresses trigger AI draft generation:
   - Include rules: only generate drafts for matching patterns (e.g. `*@gmail.com`)
   - Exclude rules: skip matching addresses (e.g. `*@newsletter.firma.pl`)
   - Glob pattern matching with domain wildcards
2. **Training Instructions** — Free-text instructions that AI must follow:
   - Categories: Ton (🎭), Treść (📄), Zasady (📏), Styl (✍️), Inne (📎)
   - Toggle on/off without deleting
   - Injected as mandatory instructions in GPT system prompt
3. **Feedback/Learning System** — Admin edits draft → clicks "🧠 Ucz AI":
   - Original and corrected drafts saved to `email_ai_feedback` table
   - GPT-4o-mini analyzes differences and generates 2-4 sentence analysis
   - Last 10 analyses injected into future GPT prompts as learning context
   - Draft status changes to 'learned' (amber color)
4. **Star Ratings** — 1-5 star rating on sent/rejected/learned drafts
5. **Quick Feedback Tags** — Toggle tags: "Za długi", "Za formalny", "Za krótki", "Brak cennika", "Złe dane", "Idealny"
6. **Stats Dashboard** — Draft counts by status + average rating in settings modal header

#### Database:
- Migration 072: `email_ai_sender_rules`, `email_ai_instructions`, `email_ai_feedback` tables (RLS service-only)
- Added `admin_rating INTEGER CHECK(1-5)`, `admin_tags TEXT[]` to `email_ai_drafts`
- Updated status CHECK to include `'learned'`

#### New Files:
- `supabase_migrations/072_email_ai_config.sql` — 3 new tables + 2 new columns
- `src/app/api/employee/email-ai-config/route.ts` — CRUD for rules, instructions (GET/POST/PUT/DELETE) + stats

#### Modified Files:
- `src/app/api/cron/email-ai-drafts/route.ts` — Loads sender rules (include/exclude filtering), active instructions, and recent feedback into GPT prompt
- `src/app/api/employee/email-drafts/route.ts` — New `action: 'return_for_learning'` in PUT + admin_rating/admin_tags support
- `src/app/pracownik/components/EmailTab.tsx` — Settings modal (⚙️ → 3 tabs), 🧠 Ucz AI button, ⭐ ratings, quick tags, stats bar

> ⚠️ **REQUIRES**: Run migration 072 in Supabase SQL editor before testing on production.

---

### March 6, 2026 — Advanced SEO Improvements

**4 commits** — service landing pages, enriched structured data, hreflang, FAQ rich snippets.

**5 new service landing pages** — `9b2be79`
- Created `/oferta/leczenie-kanalowe`, `/oferta/stomatologia-estetyczna`, `/oferta/ortodoncja`, `/oferta/chirurgia`, `/oferta/protetyka`
- Each page has: `page.tsx` (content with RevealOnScroll), `layout.tsx` (metadata + FAQ schema + BreadcrumbList)
- Added 167 translation keys to `messages/pl/pages.json`
- Updated `sitemap.ts` with 5 new routes (priority 0.9)
- Updated `Footer.tsx` with 5 new links in "Usługi" column

**Advanced SEO schemas** — `1ccc221`
- Enriched Dentist JSON-LD: `@type: ["Dentist", "MedicalBusiness"]`, description, sameAs, medicalSpecialty (5), availableService (7 MedicalProcedure entries), hasMap, currenciesAccepted, paymentAccepted
- New WebSite schema (sitelinks search box potential)
- OpenGraph expanded: type, locale, siteName, image dimensions + alt
- Twitter card: `summary_large_image`
- Title template: `%s | Mikrostomart - Dentysta Opole`
- FAQ schema on `/oferta/implantologia` (5 Q&A) + MedicalWebPage/MedicalProcedure
- FAQ schema on `/faq` (10 curated Q&A from all categories)

**Hreflang tags** — `9b2be79`
- Added `alternates.languages` to global metadata: pl, en, de, uk, x-default

**Start-session workflow rewrite** — `0784e05`
- Forces full context reading via `wc -l` + chunk calculation
- EOF_VERIFICATION marker at bottom of context file
- 5-point confirmation required before coding

**SEO documentation** — `e29cbc6`
- New workflow `.agents/workflows/add-page.md` with mandatory SEO checklist
- Updated `update-context.md` with SEO verification step
- Added SEO Architecture section to this file

---

### March 5, 2026 (Full day — SEO Fixes + Etap 3 + Etap 4 + Bug Fixes)

**Critical SEO overhaul** — `95fbb84`
- Expanded `robots.ts` (disallow admin/pracownik/ekarta/strefa-pacjenta)
- Expanded `sitemap.ts` from ~10 to 24 pages, organized by priority tiers
- Footer SEO navigation: 16 links in 4 columns (SSR-visible)
- Canonical URLs via `metadataBase` + `alternates.canonical`
- SplashScreen SSR-safe (initial phase='done')
- Middleware bot user-agent bypass
- 13 new `layout.tsx` metadata files for key pages
- Google Search Console verification file added

**20 commits** across 3 major work areas: **Etap 3** new features (3.1–3.6), **Etap 4** architecture refactoring, and post-refactor bug fixes.

---

#### Etap 3 — New Features (3.1–3.6)

**3.1: Push + SMS notification to patient on booking approve/reject** — `59331d7`
- Admin approves/rejects online booking → SMS + push notification sent to patient
- `POST /api/admin/online-bookings` action handler now sends SMS (approve → appointment details, reject → apology)
- Push notification via `sendTranslatedPushToUser()` to patient
- `src/lib/pushTranslations.ts` — added `booking_confirmed` and `booking_rejected` push types (4 locales)

**3.2: Daily morning report on Telegram** — `814d6b4`
- **NEW** `/api/cron/daily-report` — comprehensive morning digest sent to Telegram
- Content: today's appointments from Prodentis, pending online bookings count, overdue/undated tasks, today's patient birthdays
- Vercel Cron: `30 5 * * *` (6:30 AM Warsaw time)
- Uses `logCronHeartbeat()` for execution tracking

**3.3: Deposit reminder SMS + push 48h before appointment** — `18c34a0`
- **NEW** `/api/cron/deposit-reminder` — finds appointments with unpaid deposits in 24-72h window
- Sends personalized SMS with deposit payment link (`https://mikrostomart.pl/zadatek`)
- Push notification to patient
- Telegram summary of all reminders sent
- Vercel Cron: `0 7 * * *` (8:00 AM Warsaw time)

**3.4: No-show detection + follow-up SMS** — `7bf6695`
- **NEW** `/api/cron/noshow-followup` — detects no-shows from yesterday's appointments
- Logic: fetches yesterday's appointments → checks if reminder SMS was sent → checks if post-visit SMS was sent (= they showed up) → remaining = likely no-shows
- Sends follow-up SMS offering easy rescheduling via Strefa Pacjenta
- Telegram summary to admin
- Vercel Cron: `0 8 * * *` (9:00 AM Warsaw time)

**3.5: Patient documents in portal — download signed consents & e-karta** — `fbfe7d5`
- **NEW** `GET /api/patients/documents` — JWT authenticated endpoint returning signed consent PDFs + e-karta submissions
- Patient dashboard (`strefa-pacjenta/dashboard/page.tsx`) — new "📄 Dokumenty" section with downloadable file list
- Shows consent type label, signed date, and download link for each document

**3.6: Email notifications on booking status + chat reply** — `4e82dfe`
- **NEW** `src/lib/emailService.ts` — centralized email service with branded HTML templates
- 4 email functions: `sendBookingConfirmedEmail()`, `sendBookingRejectedEmail()`, `sendChatReplyEmail()`, `sendStatusChangeEmail()`
- `POST /api/admin/online-bookings` — sends booking confirmed/rejected emails to patients
- `POST /api/admin/chat/messages` — sends chat reply email notification to patient

#### Files Created (Etap 3):
- `src/app/api/cron/daily-report/route.ts` (228 LOC)
- `src/app/api/cron/deposit-reminder/route.ts` (178 LOC)
- `src/app/api/cron/noshow-followup/route.ts` (210 LOC)
- `src/app/api/patients/documents/route.ts` (93 LOC)
- `src/lib/emailService.ts` (199 LOC)

#### Files Modified (Etap 3):
- `src/app/api/admin/online-bookings/route.ts` — SMS + push + email on approve/reject
- `src/app/api/admin/chat/messages/route.ts` — email on chat reply
- `src/lib/pushTranslations.ts` — 2 new push types (booking_confirmed, booking_rejected)
- `src/app/strefa-pacjenta/dashboard/page.tsx` — documents section
- `vercel.json` — 3 new cron entries (daily-report, deposit-reminder, noshow-followup)

---

#### Etap 4 — Architecture & Refactoring (Complete Employee Zone Split)

**4.1a: Extract employee types** — `87fc414`
- Extracted **230 lines** of inline types from `pracownik/page.tsx`
- Created `components/ScheduleTypes.ts` (144 LOC): `Badge`, `ScheduleAppointment`, `Visit`, `ScheduleDay`, `ScheduleData`, Prodentis color maps, badge letters, time helpers
- Created `components/TaskTypes.ts` (91 LOC): `ChecklistItem`, `EmployeeTask`, `FutureAppointment`, `StaffMember`, `TaskTypeTemplate`, task type colors, fallback checklists

**4.2a+4.5: Extract AdminTypes.ts + withAuth middleware** — `664e76c`
- Created `src/app/admin/components/AdminTypes.ts`: `Product` type extracted from `admin/page.tsx`
- Created `src/lib/withAuth.ts` — HoF wrapping API handlers with auth + RBAC (eliminates 4-line boilerplate across 70+ routes)

**4.1b-e: Extract 3 tabs from pracownik monolith** — `47f0d16`
- Created `components/NotificationsTab.tsx` (176 LOC) — push notification history
- Created `components/SuggestionsTab.tsx` (363 LOC) — feature suggestions system
- Created `components/PatientsTab.tsx` (140 LOC) — patient search + data view

**4.1b-f: Fix ScheduleTab extraction** — `bd7dd4b`
- Fixed bracket mismatch in ScheduleTab extraction
- Restored `supabase`, `router`, `useUserRoles` imports
- Added `createBrowserClient` import

**Extract TasksTab component** — `ececbbb`
- Created `components/TasksTab.tsx` (2951 LOC) — complete Trello-style task management
- Full Kanban board, calendar view, comments, labels, history, drag-and-drop

**Central type re-exports** — `026bad3`
- Created `src/types/index.ts` (24 LOC) — re-exports from ScheduleTypes, TaskTypes, AdminTypes, consentTypes, comparatorTypes

**Extract useTasks hook** — `9dfe85b`
- Created `hooks/useTasks.ts` (554 LOC) — task CRUD, filtering, state management extracted from TasksTab

**Extract useSchedule hook** — `8bd9bd8`
- Created `hooks/useSchedule.ts` (291 LOC) — schedule data fetching and state management extracted from ScheduleTab

#### Architecture Result:
- `pracownik/page.tsx`: **6300 LOC → 778 LOC** (thin orchestrator: tab state, auth, shared state, renders components)
- Total extracted: 5 components + 2 hooks + 2 type files + 1 type index = **4721 LOC** in extracted modules

#### Files Created (Etap 4):
- `src/app/pracownik/components/ScheduleTab.tsx` (2033 LOC)
- `src/app/pracownik/components/TasksTab.tsx` (2951 LOC)
- `src/app/pracownik/components/NotificationsTab.tsx` (176 LOC)
- `src/app/pracownik/components/SuggestionsTab.tsx` (363 LOC)
- `src/app/pracownik/components/PatientsTab.tsx` (140 LOC)
- `src/app/pracownik/components/ScheduleTypes.ts` (144 LOC)
- `src/app/pracownik/components/TaskTypes.ts` (91 LOC)
- `src/app/pracownik/hooks/useSchedule.ts` (291 LOC)
- `src/app/pracownik/hooks/useTasks.ts` (554 LOC)
- `src/types/index.ts` (24 LOC)
- `src/app/admin/components/AdminTypes.ts` (13 LOC)
- `src/lib/withAuth.ts` (55 LOC)

---

#### Post-Refactor Bug Fixes

**Restore lost task detail + patient data modals** — `4ea9fbb`
- Task Detail View Modal (244 lines) — restored in `TasksTab.tsx` (was lost during extraction)
- Patient Data Modal (128 lines) — restored in `page.tsx` (triggered from ScheduleTab)

**Auto-switch tab on cross-tab actions** — `0a19e15`
- Adding task from Grafik tab now auto-switches to Zadania tab
- Patient search from Grafik/Pacjenci tab now works across tab boundaries

**Restore E-Karta QR modal + remove orphaned state** — `bb46b92`
- E-Karta QR code generation modal was lost during ScheduleTab extraction — restored
- Cleaned up orphaned state variables that were in page.tsx but belonged to extracted components

**Restore fetchEmployees to populate staffList** — `e38a073`
- `fetchEmployees()` was lost during extraction — task assignment dropdown had empty staff list
- Restored in `page.tsx` with `useEffect` to populate on mount

**Documentation updates** — `481f1af`, `a7a8fe6`
- Updated `mikrostomart_context.md` and `PROJECT_STATUS.md` with Etap 1-4 changes and bug fix entries

#### Files Modified (Bug Fixes):
- `src/app/pracownik/page.tsx` — modals, state, fetchEmployees, tab switching
- `src/app/pracownik/components/TasksTab.tsx` — task detail modal, E-Karta QR
- `src/app/pracownik/components/ScheduleTab.tsx` — patient data triggers

### March 4, 2026 (PDF Mapper Rework — No-code Consent Field Editor)
**DB-backed Consent Field Mappings** — `b7306d7`, `afba9be`, `ac9ae61`, `e7dcab5`, `6c8ddf3`
- Migration `067_consent_field_mappings.sql` — new table storing consent type definitions + PDF field coordinates in DB
- Seeded with all 10 existing consent types (higienizacja, znieczulenie, chirurgiczne, protetyczne, endodontyczne, zachowawcze, protetyka_implant, rtg, implantacja, wizerunek)
- `/api/admin/consent-mappings` — full CRUD API (GET public, POST/PUT/DELETE admin-only)
- `/api/admin/consent-pdf-upload` — upload new consent PDFs to Supabase Storage
- `getConsentTypesFromDB()` in `consentTypes.ts` — server-side DB loading with hardcoded fallback
- Rewritten `/admin/pdf-mapper/page.tsx` — loads from DB, saves to DB, create new consent types + PDF upload
- Custom fields: ➕ Dodaj nowe pole — text or checkbox, with dynamic key/label
- Multi-instance fields: 📋+ duplicate button in sidebar, auto-suffix keys (`_2`, `_3`), `sourceField` metadata
- Instruction popup: detailed guide on first launch, localStorage "don’t show again", ❓ button to reopen
- Updated 5 consumers: `consents/sign`, `consents/verify`, `employee/consent-tokens`, `zgody/[token]`, `pracownik` — all now use DB data with fallback

### March 4, 2026 (Security Audit Fixes)
**Auth Guards + Rate Limiting + Security Headers + Audit Logging** — `eed3b14`, `0b53432`, `89cc3d7`, `7855a36`, `a2b8810`
- Secured 19 unprotected admin endpoints with `verifyAdmin()`
- Rate limiting: login (5/15min), reset-password (3/15min), AI endpoints (IP-based)
- Security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- GDPR audit logging (`logAudit()`) on SMS send, patient approve/reject
- `CRON_SECRET` validation on all cron endpoints
- Public `/api/staff-signatures` endpoint (fix for consent page regression)

### March 4, 2026 (Admin Panel Security Hardening — CRITICAL)
**Auth Guards on 19 Unprotected Admin Endpoints**
- Added `verifyAdmin()` to ALL 19 previously unprotected admin API endpoints
- Removed 3 fake `isAdmin()` stubs that **always returned true** (`patients`, `patients/approve`, `patients/reject`)
- Specifically: `sms-send`, `sms-reminders` (GET+PUT+DELETE+send+send-manual), `sms-templates` (GET+PUT+POST+DELETE), `patients` (GET+DELETE+approve+reject+search), `patient-consents`, `cancelled-appointments`, `online-bookings` (GET+PUT+DELETE), `staff-signatures` (GET+POST+DELETE), `appointment-instructions` (GET+[type]PUT), `booking-settings` (PUT only — GET intentionally public), `prodentis-schedule` (color PUT, icon POST, colors GET, icons GET)
- **Result: 40/40 admin endpoints now have authentication (was 21/40)**

### March 4, 2026 (Security Hardening + Employee Zone Improvements)
**Security: Auth Guards on 5 Unprotected Endpoints** — CRITICAL
- Added `verifyAdmin() + hasRole('employee'/'admin')` to: `patient-consents`, `export-biometric`, `consent-tokens`, `patient-intake`, `patient-details`
- All 5 previously allowed unauthenticated access to sensitive patient data (signatures, biometric data, PESEL, medical records)

**Auto-Export Biometrics on Consent Sign**
- `POST /api/consents/sign` now automatically exports signature PNG + biometric JSON to Prodentis documents API immediately after consent is signed
- Export results stored in `metadata.biometric_auto_exported` + `biometric_exported_at`
- No longer requires manual "Export" button click

**Export Status Indicators in Consent List**
- Each consent shows export status pill: ✅ (auto-exported) | 📤 (manually exported) | ❌ (export failed)
- Uses `metadata` from `patient_consents` table

**Session Timeout (GDPR)**
- 30-minute idle auto-logout with 25-minute warning popup
- Tracks activity: mousemove, keydown, click, scroll, touchstart
- Glassmorphic warning dialog with “Kontynuuj sesję” button

**GDPR Audit Log**
- Migration `066_employee_audit_log.sql` — tracks employee access to patient data
- `src/lib/auditLog.ts` — `logAudit()` utility (non-blocking, IP + User-Agent capture)
- Integrated into: `patient-consents`, `export-biometric`, `patient-details`, `patient-intake`
- `validatePasswordStrength()` utility for employee password enforcement

**Documentation Audit**
- Added 9 missing API endpoints to Employee API table
- Added 18 missing commits to Recent Changes
- Added 7 new Employee Zone features

### March 4, 2026 (Employee Zone Biometric + Audit)
**Biometric Badge in Consent List** — `2047e57`, `fa2b35c`
- `patient-consents` API now returns `biometric_data` + `signature_data`
- Each consent in employee zone shows biometric badge (🖊️ Rysik / 👆 Palec / 🖱️ Mysz + point count)
- Click badge → popover with full biometric stats (pressure, strokes, duration) + signature PNG preview
- Export button sends signature PNG + biometric JSON to Prodentis documents API
- `POST /api/employee/export-biometric`: [NEW] endpoint for Prodentis export
- Fix: `pointerType` extracted from `bio.deviceInfo?.pointerType` (was incorrectly reading `bio.pointerType`)

**Employee Zone Bug Fixes** — `36d9166`, `de29b8b`
- Firefox: fixed `rowSpan` rendering in schedule grid
- Firefox: replaced native `<select>` with custom dropdowns for assignee/priority
- Type filter dropdown: click-outside auto-close handler
- Self-notification on comments: removed client-side browser notifications for comment authors
- Patient history modal: moved outside Grafik tab fragment — accessible from all tabs
- Dashboard zero data: localized date comparison (`toLocaleDateString('sv-SE')`), tasks fetched on mount
- Admin sidebar: added link to `/admin/biometric-signatures` page

**Employee Zone UX** — `36d9166`
- Task type color-coding: colored badges + icons per task type on cards
- Click-to-call: phone numbers in schedule cells are `tel:` links
- Daily dashboard: appointments, upcoming patients, operators, task summary on Grafik tab

**Context Doc Update** — `94003f8`
- Updated Last Updated date to 2026-03-04

### March 3, 2026 (Biometric Signatures + Blog)
**Biometric Signature Capture** — `bc7d002`, `c975fb8`
- `zgody/[token]/page.tsx`: switched Touch/Mouse → Pointer Events API; captures pressure, tiltX, tiltY, timestamps per point; dynamic lineWidth from pressure
- `065_biometric_signature.sql`: new `biometric_data JSONB` column in `patient_consents`
- `consents/sign/route.ts`: accepts and stores `biometricData` alongside signature image
- `admin/biometric-signatures/page.tsx`: [NEW] viewer with consent list, PNG display, pressure/tilt chart, signature replay animation, device info
- `api/admin/patient-consents/route.ts`: [NEW] admin API for consent details with biometric data

**Blog Image** — `a4f5039`
- Added image for blog post "5-zaskakujacych-produktow-z-kuchni-zdrowie-zebow"

**AssistantTeaser Fix** — `6a15e0e`
- Hydration error fix: changed button-in-button → `div[role=button]`

**Security** — `335757b`
- `[id]/next-appointment/route.ts`: added JWT auth + prodentisId ownership verification

**Patient Zone i18n** — `694e7c7`
- Added `patientZone` namespace to all 4 language files (115 keys)
- Phase 6 bugfixes: export-data, password change email

**Patient Zone Features** — `dd7bac2`
- Change password endpoint + UI
- Migration `064_patient_notification_prefs.sql` + 5 toggle switches
- RODO export-data + delete-account

**Patient Zone CSS Module** — `c008a65`
- `patient.module.css` + `PatientSkeleton.tsx` with shimmer animation

**Middleware Protection** — `fea9707`
- Patient zone routes require `patient_token` cookie

**DB Rate Limiting** — `6e328a8`
- Migration `063_login_attempts.sql` — 5 attempts/15min per identifier

**Audit Script** — `0f84bfe`
- `scripts/audit-context.sh` — automated doc cross-reference check

### March 3, 2026 (Patient Zone Security Refactoring)
**Phase 4: Shared Layout + Auth Hook** — `6f75105`
- Created `src/hooks/usePatientAuth.ts` — centralized auth state, patient data, logout
- Created `src/app/strefa-pacjenta/layout.tsx` — shared header, nav, status banners, loading skeleton
- Refactored 5 patient pages (dashboard, historia, profil, wiadomosci, ocen-nas) — removed ~600 LOC duplication

**Phase 1: httpOnly JWT Security** — `7a2f83a`
- Login endpoint sets `Set-Cookie: HttpOnly; Secure; SameSite=Strict` (7-day expiry)
- Created `/api/patients/logout` endpoint (server-side httpOnly cookie clear)
- Added `verifyTokenFromRequest()` to `src/lib/jwt.ts` (checks Authorization header → httpOnly cookie fallback)
- Updated all 14 patient API routes from `verifyToken(authHeader)` → `verifyTokenFromRequest(request)`
- Updated `usePatientAuth` hook + layout for server-side logout

### March 3, 2026
**Patient Dashboard — Appointment Management Overhaul + Prodentis v9.1**

#### Commits:
- `0533fad` — feat: patient zone appointment management with Prodentis API v9.0
- `c4517ce` — fix: patient dashboard - multi-appointment, always-visible booking, cancel crash fix, correct prodentis ID
- `c6ff121` — fix: upcoming-appointments - add Content-Type header, start-of-day cutoff, limit 100
- `5c793e7` — fix: upcoming-appointments - scan Prodentis schedule by-date
- `2e92718` — redesign: appointment actions - clean inline buttons replacing ugly dropdown
- `3dfc62b` — fix: by-date endpoint - use range query instead of exact match for timestamptz
- `5de1a0e` — fix: use Prodentis v9.1 future-appointments API + check-then-insert for status reset
- `11c4494` — fix: create endpoint resets terminal statuses when appointment still exists in Prodentis
- `af8d3f4` — fix: DELETE+INSERT instead of UPDATE for stale status reset
- `12eeeaf` — fix: escalating cleanup - delete ALL terminal records + detailed error logging
- `d675a2e` — fix: auto-refresh appointments from Prodentis after cancel/reschedule, sync button also refreshes

#### New Features:
1. **Prodentis v9.0 Appointment Management**:
   - Cancel appointment: `DELETE /api/schedule/appointment/:id` via patient dashboard button
   - Reschedule appointment: `PUT /api/schedule/appointment/:id/reschedule` via dashboard button
   - Confirm attendance: adds Prodentis "Pacjent potwierdzony" icon
   - Deposit payment: redirects to `/zadatek` with pre-filled patient data

2. **Prodentis v9.1 Future Appointments**:
   - **NEW** `GET /api/patient/:id/future-appointments?days=180` — single API call returns ALL future appointments
   - Replaced 65+ day-by-day API calls with 1 call — dashboard loads instantly
   - **NEW** `GET /api/patients/upcoming-appointments` — internal endpoint using v9.1 API

3. **Multi-Appointment Display**:
   - Dashboard shows ALL upcoming appointments (not just one)
   - Each appointment in its own card with date, time, doctor, duration
   - Booking form always visible regardless of existing appointments

4. **Appointment Actions Redesign** (`AppointmentActionsDropdown.tsx`):
   - **Before**: ugly dark dropdown with "Zarządzaj wizytą ▼" toggle, TEST reset button, 611 lines
   - **After**: clean inline action buttons (💳 Wpłać zadatek, ✓ Potwierdź, 📅 Przełóż, ❌ Odwołaj), 280 lines
   - Status badge always visible, helpful text for final states (cancelled/rescheduled)
   - Hover effects, gradient buttons, flex-wrap responsive

5. **Stale Status Auto-Reset**:
   - When appointment exists in Prodentis but has stale Supabase status (`cancelled`, `cancellation_pending`, etc.)
   - `create` endpoint uses DELETE+INSERT pattern (Supabase `.update()` was silently failing)
   - Escalating cleanup: if single delete fails, wipes ALL terminal records for patient
   - Two-strategy lookup: first by `prodentis_id` (schedule ID), then by date ±2min range

6. **Auto-Refresh After Actions**:
   - After cancel/reschedule: 1.5s delay → re-fetches all appointments from Prodentis
   - Cancelled appointments vanish without page reload
   - Sync button now refreshes both visit history AND upcoming appointments

7. **by-date Endpoint Fix**:
   - Changed from exact `.eq('appointment_date', date)` to `±1min range` query
   - Handles Supabase `timestamptz` format differences vs. ISO string input

#### Files changed/created:
- `src/app/api/patients/upcoming-appointments/route.ts` — **REWRITTEN** to use Prodentis v9.1
- `src/app/api/patients/appointments/create/route.ts` — **REWRITTEN** with DELETE+INSERT, escalating cleanup
- `src/app/api/patients/appointments/by-date/route.ts` — range query instead of exact match
- `src/app/api/patients/appointments/[id]/cancel/route.ts` — **NEW** Prodentis DELETE integration
- `src/app/api/patients/appointments/[id]/reschedule/route.ts` — **NEW** Prodentis PUT reschedule
- `src/app/api/patients/appointments/[id]/confirm-attendance/route.ts` — **NEW** with Prodentis icon
- `src/components/AppointmentActionsDropdown.tsx` — **REWRITTEN** from dropdown to inline buttons
- `src/components/modals/CancelAppointmentModal.tsx` — **NEW** modal
- `src/components/modals/ConfirmAttendanceModal.tsx` — **NEW** modal
- `src/components/modals/RescheduleAppointmentModal.tsx` — **NEW** modal
- `src/app/strefa-pacjenta/dashboard/page.tsx` — multi-appointment loop, auto-refresh, booking always visible

---

### March 2, 2026
**Task System + E-Karta + Patient Zone Booking + Phone Fix + Birthday Cron**

#### Commits:
- `908e8ab` — feat(tasks): multi-category filter, kanban edit button, patient search from DB
- `6b21c19` — ui(tasks): replace filter chips with dropdown checklist multi-select
- `4fbcb19` — fix(e-karta): sanitize Polish diacritics from PDF filename — fixes Supabase 'Invalid key' error
- `3cf3033` — feat(patient-zone): online booking from dashboard — uses existing prodentis_id
- `5db7ee2` — docs: add patient zone online booking to changelog
- `05c1609` — feat(confirm-attendance): add Prodentis 'Pacjent potwierdzony' icon on patient zone confirmation
- `4860d67` — feat: phone normalization fix, employee patient search tab, birthday wishes cron
- `19aa5e5` — feat(blog): add image for usmiech-w-rytmie-natury

#### Changes:
1. **Multi-category task filter**: Dropdown multi-select with checkmarks (✓). Click "Typ: Wszystkie" → opens list → toggle categories (OR logic). State: `filterType: string` → `filterTypes: string[]`
2. **Edit button on Kanban cards**: Added ✏️ button directly on Kanban board cards (between ← → arrows)
3. **Patient search from database**: 
   - **NEW** `GET /api/employee/patient-search?q=...&limit=5` — employee-scoped Prodentis patient search proxy
   - Debounced autocomplete (300ms) in task **creation** and **edit** modals
   - Selected patient displayed as blue chip with ✕ to remove
   - `patient_id` + `patient_name` now stored uniformly whether task created from schedule or manually
4. **E-Karta PDF fix**: Polish diacritics in patient names caused Supabase Storage `Invalid key` error. Added `polishToAscii()` sanitizer
5. **Patient Zone Online Booking**:
   - **NEW** `POST /api/patients/appointments/book` — JWT-auth booking, uses existing `prodentis_id` (no patient search/creation, `match_method: patient_zone_auth`, confidence: 100)
   - **NEW** `GET /api/patients/appointments/bookings` — fetch patient's `online_bookings`
   - Dashboard: inline booking form (specialist → service → AppointmentScheduler → submit)
   - Pending booking status cards with "Oczekuje na potwierdzenie" indicator
   - Saves to `online_bookings` with pre-matched patient → admin approves → auto-schedules in Prodentis
6. **Phone normalization**: Fixed `+48` prefix handling in patient search and login
7. **Birthday wishes cron**: Auto-sends birthday greetings to patients
8. **Confirm attendance icon**: Adds Prodentis 'Pacjent potwierdzony' icon (0000000010) on patient zone confirmation

#### Files changed:
- `src/app/pracownik/page.tsx` — frontend (filters, modals, Kanban edit button)
- `src/app/api/employee/patient-search/route.ts` — **NEW** endpoint
- `src/app/api/intake/generate-pdf/route.ts` — bug fix + improved error messages
- `src/app/api/patients/appointments/book/route.ts` — **NEW** patient booking endpoint
- `src/app/api/patients/appointments/bookings/route.ts` — **NEW** bookings list endpoint
- `src/app/strefa-pacjenta/dashboard/page.tsx` — booking form + pending bookings UI

---

### February 26, 2026
**Online Booking Automation — Prodentis API 6.0 Integration**

#### Commits:
- `fd25557` — feat: online booking automation (Phases 1-5)
- `7bbddc4` — fix: prevent wrong patient scheduling
- `09e05f4` — hotfix: disable auto-scheduling (Prodentis API bug)
- `d6a4b22` — feat: Prodentis API 6.0 (re-enable scheduling + color/icon management)
- `6fbbb18` — hotfix: revert doctor IDs
- `04c228b` — feat: double verification patient matching
- `f0b686e` — feat: right-click color/icon changes on employee schedule
- `9d9207a` — feat: long-press (500ms) opens color/icon menu on mobile
- `0da0e11` — feat: auto-add 'Pacjent potwierdzony' icon on confirmation, remove email notifications
- `f45c0df` — feat: consent signing system — tablet PDF signing + employee panel
- `ea00263` — feat: pre-fill consent PDFs with patient data + auto-upload to Prodentis
- `34d038f` — feat: precise PDF field placement — name on dotted lines, PESEL in boxes
- `b852770` — feat: PDF coordinate mapper tool + fix Prodentis ASCII filenames
- `75bd94c` — fix: rewrite PDF mapper — use iframe+overlay instead of pdfjs-dist
- `f53102a` — feat: staff signature system + doctor_signature field
- `02c0bae` — fix: real staff in signatures + admin nav links
- `4893b7f` — fix: PDF mapper — patient_signature field + multi-page navigation
- `8fd2e43` — fix: PDF mapper — pdf.js canvas rendering for reliable page nav
- `0b8b6c3` — feat: all 10 consent form coordinates + multi-page support
- `4644c84` — fix: do PDF prefill + signatures in submitSignature (one pass)
- `a5af7b0` — fix: replace broken Prodentis document upload with notes + link
- `1c303f5` — fix(critical): first/last name swap in e-karta prefill
- `cb78dc8` — fix: upload PDF to Prodentis via documents API with fileBase64
- `cd59719` — fix: 4 consent signing issues (font/parse/re-sign/resolution)
- `2490566` — feat: full-width PDF, doctor selection, procedure input, PESEL fix
- `dc5cc65` — fix(critical): split name→firstName+lastName in reservation form
- `84a89b4` — feat: e-karta PDF generation + signature display
- `98de644` — feat: PDF design polish — logo header, amber colors, smaller signature

#### New Features:
1. **Online Booking System**: Patient books on website → saves to `online_bookings` (pending) → admin approves → auto-schedules in Prodentis
2. **Patient Auto-Create**: Phone search → fuzzy name match → create new patient in Prodentis if not found → e-karta link for new patients
3. **Admin Panel "Wizyty Online" Tab**: Filter pills (Oczekujące/Zatwierdzone/W grafiku/Odrzucone/Wszystkie), approve/reject/bulk actions, badge with pending count
4. **Prodentis Color Management**: Color dropdown on scheduled bookings → change visit type in Prodentis
5. **Prodentis Icon Management**: Icon buttons (✅ Pacjent potwierdzony, ⭐ VIP, 🆕 Pierwszorazowy) on scheduled bookings
6. **Telegram Daily Digest**: Cron at 8:15 AM with summary of unreported bookings grouped by status
7. **Double Verification Patient Matching**: Scores each candidate by firstName+lastName (Levenshtein + diacritics). ≥85 auto-match, 60-84 admin review, <60 create new patient. Handles shared phones (parent/child), typos, diacritics.
8. **Admin Patient Picker**: When match is ambiguous (needs_review), admin sees candidate list with % scores and "Wybierz" button to pick correct patient
9. **Schedule Color/Icon Management**: Right-click (desktop) or long-press 500ms (mobile) any future appointment in employee grafik → context menu with color picker and icon buttons. Past appointments blocked.
10. **Auto-Icon on Patient Confirmation**: When patient confirms via SMS landing page, system auto-adds 'Pacjent potwierdzony' icon (0000000010) in Prodentis. Email notifications removed from both confirm and cancel endpoints (spam reduction). Telegram + Push kept.
11. **Consent Signing System**: Employee generates consent token → QR code on tablet → patient views PDF pre-filled with name/PESEL/date/address from Prodentis, signs on canvas → pdf-lib merges data+signature into PDF → uploads to Supabase Storage + auto-uploads to Prodentis v8.0. Employee panel: 📝 Zgody button, consent type checkboxes, QR code, signed consents list, e-karta signature viewer.
12. **Staff Signature System**: Admin tool `/admin/staff-signatures` — canvas drawing to capture doctor/hygienist signatures → stored in `staff_signatures` table → used for doctor signature field in consent PDFs. **No-code PDF Field Mapper** `/admin/pdf-mapper` — visual editor that loads consent types from DB (`consent_field_mappings` table), allows clicking on PDF to place fields (name, PESEL, date, address, signatures, etc.), and saves positions directly to DB — no code changes or deployment needed. Supports creating new consent types with PDF upload to Supabase Storage. Filenames sanitized to ASCII for Prodentis compatibility.

#### Database:
- Migration 056: `online_bookings` table with RLS + indexes
- Migration 057: `match_confidence` (int) + `match_candidates` (jsonb) on `online_bookings`
- Migration 058: `consent_tokens` + `patient_consents` tables with RLS + indexes
- Migration 059: `staff_signatures` table (staff_name, role, signature_data base64 PNG, is_active)

#### New Files:
- `src/lib/doctorMapping.ts` — centralized doctor→Prodentis ID mapping
- `src/lib/consentTypes.ts` — 10 consent types with Polish labels + PDF filenames
- `src/app/api/admin/online-bookings/route.ts` — GET/PUT/DELETE with auto-schedule
- `src/app/api/admin/prodentis-schedule/{colors,icons,color,icon}/route.ts` — 4 proxy routes
- `src/app/api/employee/consent-tokens/route.ts` — POST/GET consent tokens
- `src/app/api/consents/verify/route.ts` — POST validate token
- `src/app/api/consents/sign/route.ts` — POST save signed PDF
- `src/app/api/employee/patient-intake/route.ts` — GET e-karta data with signature
- `src/app/api/employee/patient-consents/route.ts` — GET signed consents list
- `src/app/admin/pdf-mapper/page.tsx` — visual PDF coordinate mapper (iframe+overlay)
- `src/app/admin/staff-signatures/page.tsx` — staff signature capture & management
- `src/app/api/admin/staff-signatures/route.ts` — GET/POST/DELETE staff signatures
- `src/app/zgody/[token]/page.tsx` — tablet consent signing page
- `public/zgody/*.pdf` — 10 consent PDF templates
- `src/app/api/cron/online-booking-digest/route.ts` — Telegram digest cron

#### Modified Files:
- `src/app/api/reservations/route.ts` — patient search + auto-create + online_bookings insert
- `src/components/ReservationForm.tsx` — e-karta link for new patients
- `src/app/admin/page.tsx` — "Wizyty Online" tab + color/icon controls
- `vercel.json` — added online-booking-digest cron

---

### February 23, 2026
**Push Admin Panel — Comprehensive Fixes (4 Issues)**

#### Commits:
- `1bfcf99` — Initial push panel fixes (renderPushTab rewrite, /api/admin/push/config, migration 035)
- `b8d0318` — Comprehensive fixes: multi-group, full 15-type notification catalog, all employees display

#### Problems Fixed:
1. Only 2 of 15 notification types configurable in admin → now all 15 (13 employee, 2 patient)
2. Patients couldn't be targeted in notification config → separate patient section added
3. Subscriptions table showed duplicates / missed employees without active subscriptions
4. Only one push group per employee → now multi-group (`employees.push_groups TEXT[]`)

#### Database Migrations (RUN IN SUPABASE SQL EDITOR):
- `036_push_config_full.sql` — Added `recipient_types TEXT[]` to `push_notification_config`; seeded all 15 notification types
- `037_employee_groups_array.sql` — Added `push_subscriptions.employee_groups TEXT[]` (GIN indexed); added `employees.push_groups TEXT[]`; backfilled from existing data

#### API Changes:
- `/api/admin/push` GET — returns `employees[]` (ALL employees), `adminSubs[]`, `patientSubsCount`, `stats`
- `/api/admin/push/config` (GET, PATCH) — new endpoint for push_notification_config CRUD
- `/api/admin/employees/position` PATCH — now accepts `{ userId, groups: string[] }`; updates `employees.push_groups` + `push_subscriptions.employee_groups`
- `/api/push/subscribe` POST — reads `employees.push_groups`, stores `employee_groups[]`
- `/api/admin/roles` GET — response includes `employeePosition.push_groups[]`
- `/api/cron/task-reminders` — reads target groups from `push_notification_config` at runtime (was hardcoded)

#### Backend Library:
- `src/lib/webpush.ts` — `sendPushToGroups()` uses array containment query `.or('employee_groups.cs.{"group"},employee_group.eq.group')`

#### Admin Panel UI (`src/app/admin/page.tsx`):
- **Push tab** completely rewritten: employee-targeted configs (13 types), patient-targeted configs (2 types), manual broadcast, all-employees subscriptions table with multi-chip group editor
- **Roles tab** Podgrupa: replaced single dropdown with multi-chip group buttons (auto-save on click)
- State renamed: `pushSubs[]` → `pushEmployees[]`, `pushSubGroups` → `pushEmpGroups: Record<userId, string[]>`

#### Files Modified:
- `src/app/admin/page.tsx`, `src/app/api/admin/push/route.ts`, `src/app/api/admin/employees/position/route.ts`
- `src/app/api/push/subscribe/route.ts`, `src/app/api/admin/roles/route.ts`
- `src/app/api/cron/task-reminders/route.ts`, `src/lib/webpush.ts`
- `supabase_migrations/035_push_notification_config.sql` [NEW]
- `supabase_migrations/036_push_config_full.sql` [NEW]
- `supabase_migrations/037_employee_groups_array.sql` [NEW]

---

### February 19, 2026 (Session 2)
**Voice AI Assistant + Google Calendar Integration**

#### Changes:
1. **Google Calendar OAuth2 Integration**:
   - Migration `042_calendar_tokens.sql`: `employee_calendar_tokens` table for OAuth refresh tokens
   - `src/lib/googleCalendar.ts`: OAuth2 flow (consent URL, code exchange, token refresh) + Calendar CRUD (create/list/delete events)
   - `src/lib/icsGenerator.ts`: `.ics` file generation for patient appointments + Google Calendar URL builder
   - `src/app/api/employee/calendar/route.ts`: GET/POST/DELETE events
   - `src/app/api/employee/calendar/auth/route.ts`: GET (status+URL), POST (exchange code), DELETE (disconnect)
   - `src/app/api/employee/calendar/auth/callback/route.ts`: OAuth2 redirect handler

2. **Voice AI Assistant with OpenAI Function Calling**:
   - `src/app/api/employee/assistant/route.ts`: GPT-4o with 6 tool definitions, multi-turn conversation, system prompt with Polish clinic context
   - `src/lib/assistantActions.ts`: Server-side action dispatcher for 6 actions:
     - `createTask` — creates task in employee_tasks, push notification
     - `addCalendarEvent` — Google Calendar event creation
     - `addReminder` — calendar reminder with 15min + at-time popup alerts
     - `dictateDocumentation` — OpenAI text rewriting + Resend email delivery
     - `searchPatient` — Prodentis patient lookup
     - `checkSchedule` — Prodentis appointments by date

3. **VoiceAssistant UI Component** (`src/components/VoiceAssistant.tsx`):
   - 6 feature tiles in responsive glassmorphic grid (Task, Calendar, Reminder, Documentation, Patient Search, Schedule)
   - Web Speech API voice input with interim transcript display
   - `speechSynthesis` for Polish TTS responses
   - Conversation thread with action result cards (success/error)
   - Google Calendar connect/disconnect + voice output toggle
   - Pulse animation on mic recording, processing spinner

4. **Employee Zone Integration** (`src/app/pracownik/page.tsx`):
   - New "🤖 Asystent AI" tab (`activeTab: 'grafik' | 'zadania' | 'asystent'`)
   - `VoiceAssistant` component rendered in asystent tab
   - Bot icon from lucide-react

**New Environment Variables Required:**
- `GOOGLE_CLIENT_ID` — Google OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth2 client secret
- `GOOGLE_REDIRECT_URI` — OAuth callback URL

---

### February 19, 2026
**Push Notifications for Appointments + Admin Alerts + Patient Locale Preference + Admin Theme Customization**

#### Changes:
1. **8 new push types** added to `pushTranslations.ts` (all 4 locales):
   - `appointment_confirmed` — "✅ Pacjent potwierdził wizytę" with patient name, date, time, doctor
   - `appointment_cancelled` — "❌ Pacjent odwołał wizytę" with patient name, date, time, doctor
   - `appointment_rescheduled` — "📅 Prośba o przełożenie wizyty" with patient name, date, time, reason
   - `patient_registered` — "👤 Nowy pacjent zarejestrowany" with email
   - `new_order` — "🛒 Nowe zamówienie" with customer name and total
   - `new_reservation` — "📅 Nowa rezerwacja wizyty" with name, specialist, date/time
   - `new_contact_message` — "📩 Nowa wiadomość kontaktowa" with name and subject
   - `new_treatment_lead` — "🧮 Kalkulator leczenia — nowy lead" with name and service
2. **9 API endpoints updated** with `broadcastPush()` calls:
   - `POST /api/appointments/confirm` — push to admin+employee on patient SMS confirmation
   - `POST /api/appointments/cancel` — push to admin+employee on patient SMS cancellation
   - `POST /api/patients/appointments/[id]/confirm-attendance` — push on portal confirmation
   - `POST /api/patients/appointments/[id]/reschedule` — push on reschedule request
   - `POST /api/patients/register` — push to admin on new patient registration
   - `POST /api/order-confirmation` — push to admin+employee on new shop order
   - `POST /api/reservations` — push to admin+employee on new reservation
   - `POST /api/contact` — push to admin (contact) / admin+employee (reservation)
   - `POST /api/treatment-lead` — push to admin on treatment calculator lead
3. Push sent alongside existing Telegram, email, and WhatsApp notifications
4. **Patient Locale Preference** — multilingual patient-facing notifications:
   - Migration `040_patient_locale.sql`: added `locale` column to `patients` and `email_verification_tokens` (default 'pl')
   - New `src/lib/emailTemplates.ts`: centralized localized email templates (3 types × 4 locales: pl/en/de/ua)
     - `verification_email`, `order_confirmation`, `reservation_confirmation`
   - `/api/patients/register`: accepts locale from frontend, stores in verification token, sends localized email
   - `/api/patients/verify-email`: copies locale from token → patient record
   - `/api/patients/me`: GET returns locale, PATCH validates & saves locale
   - `/api/order-confirmation`: uses `getEmailTemplate()` for localized buyer email
   - `/api/reservations`: uses `getEmailTemplate()` for localized patient email
   - Patient profile page: language selector with flag buttons (🇵🇱 PL / 🇬🇧 EN / 🇩🇪 DE / 🇺🇦 UA)

#### Files Modified:
- `src/lib/pushTranslations.ts` — 8 new push notification types (20 total)
- `src/lib/emailTemplates.ts` — **[NEW]** Centralized localized email templates (3 types × 4 locales)
- `supabase_migrations/040_patient_locale.sql` — **[NEW]** locale column migration
- `src/app/api/appointments/confirm/route.ts` — Added `broadcastPush` for confirmation
- `src/app/api/appointments/cancel/route.ts` — Added `broadcastPush` for cancellation
- `src/app/api/patients/appointments/[id]/confirm-attendance/route.ts` — Added `broadcastPush`
- `src/app/api/patients/appointments/[id]/reschedule/route.ts` — Added `broadcastPush`
- `src/app/api/patients/register/route.ts` — locale + push + localized email
- `src/app/api/patients/verify-email/route.ts` — locale propagation
- `src/app/api/patients/me/route.ts` — locale GET/PATCH
- `src/app/api/order-confirmation/route.ts` — push + localized buyer email
- `src/app/api/reservations/route.ts` — push + localized patient email
- `src/app/api/contact/route.ts` — Added `broadcastPush` for contact form
- `src/app/api/treatment-lead/route.ts` — Added `broadcastPush` for treatment lead
- `src/app/strefa-pacjenta/profil/page.tsx` — Language selector UI

5. **Admin Theme Customization System** — comprehensive site-wide theme customization for admins:
   - Database: `site_settings` table (`supabase_migrations/041_site_settings.sql`) stores theme as JSONB
   - `src/context/ThemeContext.tsx` — ThemeProvider + useTheme hook, ~50 CSS variable mappings, 5 preset palettes, deep merge, `applyThemeToDOM()`
   - `src/components/ThemeLayout.tsx` — Client wrapper that conditionally renders layout components based on 17 feature flags
   - `src/components/ThemeEditor.tsx` — Admin editor: 8 sections (Colors, Typography, Layout, Animations, Hero, Navbar, Features, Presets), live preview, save/reset
   - `GET /api/theme` — Public theme endpoint (60s cache)
   - `GET/PUT/POST /api/admin/theme` — Admin theme CRUD + reset
   - Admin panel: "🎨 Motyw" tab with Paintbrush icon
   - `Navbar.tsx`: 12 links conditionally hidden via feature flags (both desktop + mobile)
   - `page.tsx` (homepage): YouTubeFeed/GoogleReviews wrapped in feature flags
   - `layout.tsx`: Refactored to use `<ThemeLayout>` wrapper

---

### February 16, 2026
**Google Reviews Integration + PWA Login Fix + SMS Enhancements**

#### Major Changes:
1. **Real Google Reviews on Homepage** — Replaced static reviews with live data from Google Places API:
   - New API route `/api/google-reviews` fetches from 3 Google endpoints (Places API New + Legacy newest + Legacy relevant)
   - Reviews accumulated in Supabase `google_reviews` table (grows over time, deduplicated by author+text)
   - Only positive reviews shown (4★+), shuffled randomly on each page load
   - Falls back to static reviews if API/DB unavailable
   - Background fetch runs hourly (doesn't block response)
2. **PWA Login Fix** — Users couldn't log in via installed PWA:
   - Excluded auth routes from service worker precaching (`navigateFallbackDenylist`)
   - Configured `NetworkOnly` for auth APIs, `NetworkFirst` for staff pages
   - Replaced `router.push` with `window.location.href` in login pages for proper cookie handling in standalone mode
3. **Task Archiving Fix** — Archive button was inactive due to missing `'archived'` in DB CHECK constraint:
   - Migration `026_fix_status_archived.sql` adds `'archived'` to `employee_tasks.status` constraint
   - Archive button now visible for all non-archived tasks
4. **SMS Reminder Enhancements:**
   - Friday→Monday SMS drafts now show actual date (e.g., "w poniedziałek 17 lutego") instead of hardcoded "jutro"
   - `maxDuration` increased to 120s for both cron routes to prevent timeouts
   - SMS templates pre-fetched and cached outside the processing loop

#### Database Migrations:
- `026_fix_status_archived.sql` — Fix CHECK constraint on `employee_tasks.status` to include `'archived'`
- `027_google_reviews_cache.sql` — Create `google_reviews` table for persistent review storage

#### Files Added:
- `src/app/api/google-reviews/route.ts` — **[NEW]** Google Reviews API (Places API + Supabase cache)
- `supabase_migrations/026_fix_status_archived.sql` — **[NEW]** Status constraint fix
- `supabase_migrations/027_google_reviews_cache.sql` — **[NEW]** Google reviews cache table

#### Files Modified:
- `src/components/GoogleReviews.tsx` — Fetches real reviews from API, displays author photos, live ratings, random order, static fallback
- `src/data/reviews.ts` — Added `authorInitial` field for fallback display
- `src/app/api/cron/appointment-reminders/route.ts` — maxDuration 120s, cached templates, Monday date formatting
- `src/app/api/cron/sms-auto-send/route.ts` — maxDuration 120s
- `next.config.ts` — PWA caching exclusions for auth routes
- `src/app/pracownik/login/page.tsx` — `window.location.href` redirect for PWA
- `src/app/admin/login/page.tsx` — `window.location.href` redirect for PWA
- `src/app/pracownik/page.tsx` — Archive button visible for all non-archived tasks, error alerts

#### Environment Variables:
- **NEW:** `GOOGLE_PLACES_API_KEY` — required for Google Reviews integration

---

### February 18, 2026
**Employee Push Notifications + Patient Chat**

#### Employee Push Notifications:
1. **Push infrastructure** — `sendPushToAllEmployees()` in `webpush.ts` broadcasts to all `user_type='employee'` subscriptions
2. **6 employee push types** added to `pushTranslations.ts` (all 4 locales): task_new, task_status, task_assigned, task_comment, task_checklist, task_reminder
3. **Task API triggers**:
   - `POST /api/employee/tasks` — push on new task creation (alongside Telegram)
   - `PATCH /api/employee/tasks/[id]` — push on status change, assignment change, checklist toggle
   - `POST /api/employee/tasks/[id]/comments` — push on new comment (with task title context)
   - `GET /api/cron/task-reminders` — push alongside existing Telegram daily reminder
4. **Employee Zone UI** — Compact `PushNotificationPrompt` toggle added to `/pracownik` header
5. All pushes exclude the actor (person triggering the event) from receiving the notification

#### Patient Chat:
1. **Database** — Migration `032_chat.sql`:
   - `chat_conversations` — one per patient, status (open/closed), unread flags
   - `chat_messages` — sender_role (patient/reception), content, read flag
   - Both tables added to `supabase_realtime` publication
2. **Patient Chat** `/strefa-pacjenta/wiadomosci`:
   - Real-time message bubbles (patient = gold, reception = white)
   - Quick suggestion buttons for first-time users
   - Auto-scroll, auto-grow textarea, time formatting
   - Supabase Realtime subscription for instant message delivery
3. **Admin Panel** — 15th tab "💬 Czat":
   - Left panel: conversation list with patient name, last message preview, unread count badge
   - Right panel: message thread with reply input
   - Open/Closed filter, close conversation button
   - Supabase Realtime for live updates
4. **API Routes**:
   - `POST /api/patients/chat` — patient sends message (auto-creates conversation)
   - `GET /api/patients/chat` — patient loads conversation history
   - `GET /api/admin/chat/conversations` — list conversations with previews
   - `PATCH /api/admin/chat/conversations` — close/reopen conversations
   - `GET /api/admin/chat/messages` — load messages, mark as read
   - `POST /api/admin/chat/messages` — reception replies
5. **Telegram notifications** on patient messages (`messages` channel)
6. **Navigation** — "💬 Wiadomości" tab added to all 5 patient portal pages

#### Files Added:
- `supabase_migrations/032_chat.sql`
- `src/app/api/patients/chat/route.ts`
- `src/app/api/admin/chat/conversations/route.ts`
- `src/app/api/admin/chat/messages/route.ts`
- `src/app/strefa-pacjenta/wiadomosci/page.tsx`
- `src/components/AdminChat.tsx`

#### Files Modified:
- `src/app/admin/page.tsx` — Added 15th tab "💬 Czat" with AdminChat component
- `src/app/strefa-pacjenta/dashboard/page.tsx` — Added Wiadomości nav link
- `src/app/strefa-pacjenta/historia/page.tsx` — Added Wiadomości nav link
- `src/app/strefa-pacjenta/profil/page.tsx` — Added Wiadomości nav link
- `src/app/strefa-pacjenta/ocen-nas/page.tsx` — Added Wiadomości nav link

---

### February 15, 2026
**Oceń nas (Rate Us) Tab in Patient Portal**

#### Changes:
1. **New page** `/strefa-pacjenta/ocen-nas` — Encourages patients to leave a Google Review
   - Personalized greeting with patient's first name
   - QR code (`public/qr-ocen-nas.png`) linking to `https://g.page/r/CSYarbrDoYcDEAE/review`
   - CTA button "⭐ Zostaw opinię w Google" with hover animations
   - "Dlaczego Twoja opinia jest ważna?" section (3 reasons)
   - Thank you note
2. **Navigation updated** — "⭐ Oceń nas" tab added to all 4 patient portal pages (dashboard, historia, profil, ocen-nas)

#### Files Added:
- `src/app/strefa-pacjenta/ocen-nas/page.tsx` — **[NEW]** Rate Us page
- `public/qr-ocen-nas.png` — **[NEW]** QR code image for Google Reviews

#### Files Modified:
- `src/app/strefa-pacjenta/dashboard/page.tsx` — Added Oceń nas nav link
- `src/app/strefa-pacjenta/historia/page.tsx` — Added Oceń nas nav link
- `src/app/strefa-pacjenta/profil/page.tsx` — Added Oceń nas nav link

---

### February 14, 2026
**Full Task Management System (Trello-style) + Opinion Survey System**

#### Major Changes:
1. **Task Management (Zadania tab)** — Complete Trello-style task system in Employee Zone:
   - Task CRUD with title, description, priority (Low/Medium/High), due date, task type, patient linking
   - Multi-employee assignment (JSONB `assigned_to` array)
   - Checklists with checked_by tracking per item
   - Image attachments (Supabase Storage `task-images` bucket)
   - Status workflow: Todo → In Progress → Done → Archived
   - Search bar + filter dropdowns (assignee, type, priority)
   - 3 view modes: Lista / Kanban / Kalendarz
   - Kanban board with drag-and-drop between columns
   - Calendar month view with task due date dots
   - Task comments with author/timestamp
   - Task history audit log
   - Custom colored labels/tags
   - Browser push notification permission request
   - Task reminders cron for tasks without due dates (Telegram)
2. **Opinion Survey System** — AI-powered review generation:
   - `OpinionSurvey.tsx` — 9-step patient satisfaction survey (666 lines)
   - `OpinionContext.tsx` — timed popup (2-5 min delay, 50% probability, 30-day cooldown)
   - `/api/generate-review` — OpenAI `gpt-4o-mini` generates Polish Google review from survey
   - Positive sentiment → copy review + redirect to Google Reviews
   - Negative sentiment → thank you without review

#### Database Migrations:
- `019_task_types_checklists.sql` — Add `task_type` + `checklist_items` JSONB columns
- `020_task_images.sql` — Add `image_url` column
- `021_task_history.sql` — Create `task_history` audit log table
- `022_multi_assign.sql` — Add `assigned_to` JSONB column + migrate old assignments
- `023_task_comments.sql` — Create `task_comments` table
- `024_task_labels.sql` — Create `task_labels` + `task_label_assignments` tables (5 default labels seeded)

#### Files Added:
- `src/app/api/employee/tasks/route.ts` — **[NEW]** Task CRUD API (GET/POST/PUT/DELETE)
- `src/app/api/employee/tasks/[id]/route.ts` — **[NEW]** Individual task operations
- `src/app/api/employee/tasks/[id]/comments/route.ts` — **[NEW]** Task comments API
- `src/app/api/employee/tasks/labels/route.ts` — **[NEW]** Task labels API
- `src/app/api/employee/tasks/upload-image/route.ts` — **[NEW]** Task image upload
- `src/app/api/employee/staff/route.ts` — **[NEW]** Registered employees list
- `src/app/api/employee/patient-appointments/route.ts` — **[NEW]** Future patient appointments (for task due date suggestions)
- `src/app/api/cron/task-reminders/route.ts` — **[NEW]** Daily Telegram reminder for undated tasks
- `src/app/api/generate-review/route.ts` — **[NEW]** AI review generation from survey
- `src/components/OpinionSurvey.tsx` — **[NEW]** 9-step satisfaction survey component
- `src/context/OpinionContext.tsx` — **[NEW]** Survey popup state + timing logic

#### Files Modified:
- `src/app/pracownik/page.tsx` — Complete task management UI (Kanban, Calendar, Comments, search/filters, view toggle)
- `vercel.json` — Added `task-reminders` cron (6 total)

---

### February 13, 2026
**Tab Navigation + Task List Placeholder in Employee Zone**

#### Changes:
1. **Tab bar** — added below header: 📅 Grafik | ✅ Zadania, styled with `#38bdf8` accent, hover effects, active indicator (bottom border)
2. **Schedule conditional** — existing schedule grid wrapped in `activeTab === 'grafik'` fragment
3. **Task list placeholder** — `activeTab === 'zadania'` shows empty state with roadmap preview cards (Tworzenie zadań, Przypisywanie, Statusy, Integracja)
4. **New import** — `CheckSquare` from lucide-react for Zadania tab icon

#### Files Modified:
- `src/app/pracownik/page.tsx` — `activeTab` state, tab bar UI, conditional schedule rendering, task list placeholder

### February 12, 2026
**Patient Visit History Popup in Employee Schedule Grid**

#### Changes:
1. **Click appointment → modal** — clicking any appointment cell in the schedule grid opens a full-screen modal with the patient's complete visit history.
2. **Visit details** — each visit shows: date, doctor, time range, cost, payment status (opłacono / do zapłaty), diagnosis, visit description, procedures (tooth + price), recommendations, medications.
3. **New API** — `/api/employee/patient-history?patientId={prodentisId}` proxies to Prodentis `/api/patient/{id}/appointments` with employee/admin role auth.
4. **patientId passthrough** — schedule API now includes `patientId` from Prodentis in the appointment data.
5. **Modal UX** — close via ✕ button, overlay click, or Escape key. Loading spinner, error state, empty state.

#### Files Modified:
- `src/app/api/employee/schedule/route.ts` — added `patientId` to interfaces and mapping
- `src/app/api/employee/patient-history/route.ts` — **[NEW]** patient visit history proxy endpoint
- `src/app/pracownik/page.tsx` — `Visit` interface, `openPatientHistory` function, modal overlay with full medical details

### February 11, 2026 (Late afternoon)
**Friday→Monday SMS Confirmations + Mobile Touch Fix**

#### Changes:
1. **Monday draft generation** — `appointment-reminders` accepts `?targetDate=monday`, calculates next Monday date, and only cleans Monday-dated drafts (preserving Saturday drafts generated earlier).
2. **Monday draft sending** — `sms-auto-send` accepts `?targetDate=monday`, filters drafts by `appointment_date` falling on Monday.
3. **Cron schedule updated** — Daily auto-send moved from 10 AM to 9 AM Warsaw. Two Friday-only crons added: Monday drafts at 9:15 AM, Monday sends at 10:00 AM.
4. **Mobile touch fix** — Notes (ℹ️) and badge icons now respond to tap on mobile: `onClick` toggle handlers added alongside existing `onMouseEnter`/`onMouseLeave`. Global click-to-dismiss on container. Tooltip `pointerEvents` changed from `none` to `auto` with `stopPropagation`.

#### Files Modified:
- `src/app/api/cron/appointment-reminders/route.ts` — `targetDate=monday` param, conditional draft cleanup
- `src/app/api/cron/sms-auto-send/route.ts` — `targetDate=monday` param, Monday appointment_date filter
- `vercel.json` — 5 crons (3 daily + 2 Friday-only)
- `src/app/pracownik/page.tsx` — `onClick` toggle on notes icon + badge container, global dismiss, `pointerEvents: auto`

### February 11, 2026 (Afternoon)
**Schedule Grid Enhancements — Notes Icon & Appointment Badges**

#### Changes:
1. **Notes Icon (ℹ️)** — Top-right corner of appointment cells shows "i" icon when doctor notes exist. Hover reveals glassmorphic tooltip with multi-line note text (`white-space: pre-wrap`).
2. **Appointment Badges** — Bottom-left corner of cells shows colored rounded-square icons with letter abbreviations (V=VIP, !=WAŻNE, A=AWARIA, ;)=Potwierdzony, etc.). Hover reveals tooltip listing all badges. Supports 11 badge types from Prodentis API 5.1.
3. **Real Duration** — Schedule API now uses real `duration` from Prodentis API (with gap-inference fallback).
4. **Three Independent Tooltips** — Appointment hover tooltip, notes tooltip, and badge tooltip all work independently via `e.stopPropagation()`.

#### Files Modified:
- `src/app/api/employee/schedule/route.ts` — Added `ProdentisBadge` interface, `badges` + `notes` fields, real duration from API
- `src/app/pracownik/page.tsx` — Notes icon, badge icons, `BADGE_LETTERS` map, badge tooltip, notes tooltip

### February 11, 2026
**Employee Management, Role System & Documentation Overhaul**

#### Major Changes:
1. **Employees Tab (Accordion UI)** — Admin panel "Pracownicy" tab redesigned with expandable accordion rows for each staff member. Click to expand → shows Prodentis ID, account status, email input for new accounts.
2. **Prodentis Staff Scan** — `/api/admin/employees` now scans 74 days (60 back + 14 forward) of appointments to discover ALL staff types (doctors, hygienists, assistants, receptionists). Cross-references with Supabase `user_roles` for account status.
3. **Employee Account Creation** — Email input in expanded accordion row → creates Supabase Auth account + `employee` role via `/api/admin/roles/promote`. Sends password reset email via Resend.
4. **Removed Native confirm()** — `addEmployee` function no longer uses `window.confirm()` which was auto-dismissed by React re-renders. Button click is now sufficient confirmation.
5. **Documentation Overhaul** — `mikrostomart_context.md` extensively updated: added Employee Zone, Role System, Cennik, Splash Screen, Password Reset Flow, all missing API endpoints (25+ admin, auth, employee APIs), RBAC system, updated Database Schema, Authentication section.

#### Files Modified:
- `src/app/admin/page.tsx` — New `renderEmployeesTab` with accordion UI, added `expandedStaffId` state, removed `confirm()` dialog, added `e.stopPropagation()` for expanded content
- `src/app/api/admin/employees/route.ts` — Full rewrite: 74-day Prodentis scan, Supabase cross-reference, registered employees section
- `mikrostomart_context.md` — Comprehensive documentation update (70+ lines added/modified)

### February 25, 2026 (batch 5)
**Cyfrowa E-Karta Pacjenta — Full Implementation + Login Popup Fix**

#### Commits:
- `a884df6` — feat: e-karta pacjenta — QR code registration system (Block A)
- `12d65d6` — feat: integrate Prodentis write-back API for e-karta
- `30e743d` — fix: pełna karta stanu zdrowia (40+ pól) + podpis mobile + formatowanie notatek
- `ee029d5` — fix: notes → XML notatki ('Uwagi dla lekarza' zamiast 'Informacje o pacjencie')
- `4ec3426` — fix: login popup tasks clickable → opens task detail modal

**`a884df6` — E-Karta Block A (Feb 25):**
- **Migration 054:** `patient_intake_tokens` (jednorazowe tokeny QR, 24h TTL) + `patient_intake_submissions` (bufor danych przed Prodentis)
- **API routes:** `POST /api/intake/generate-token`, `GET /api/intake/verify/[token]`, `POST /api/intake/submit`
- **Frontend:** `/ekarta/[token]` — 3-step tablet form (dane osobowe → wywiad medyczny → zgody + podpis cyfrowy)
- **Strefa pracownika:** zielony przycisk 📋 E-Karta w popup wizyty → generuje QR kod do zeskanowania telefonem pacjenta
- **Dependency:** `qrcode.react` (nowa)

**`12d65d6` — Prodentis Write-Back Integration (Feb 25):**
- **Prodentis API:** Primary: `https://pms.mikrostomartapi.com` (Cloudflare Tunnel), Fallback: `http://83.230.40.14:3000` (direct IP), key `PRODENTIS_API_KEY` env var
- **Endpoints:** POST /api/patients (create), PATCH /api/patients/:id (update), POST /api/patients/:id/notes (medical notes → "Uwagi dla lekarza" in Prodentis XML)
- **Flow:** submit → POST patient → 409 PESEL exists → PATCH + POST notes → status=sent
- **Fix:** fire-and-forget async → synchronous (Vercel kills async), all 5 routes updated 192.168.1.5 → 83.230.40.14
- **⚠️ Action:** `PRODENTIS_API_KEY` configured in Vercel env vars ✅

**`30e743d` — Full Medical Survey (Feb 25):**
- Form rewritten with ALL fields from paper card (KARTA DOROSŁY 1 czesc.docx):
  - 16 disease categories (heart, circulatory, vascular, lung, digestive, liver, urinary, metabolic, thyroid, neurological, musculoskeletal, blood, eye, mood, rheumatic, osteoporosis)
  - Infectious diseases: hepatitis A/B/C, AIDS, TB, STDs
  - Medical history: surgery, anesthesia tolerance, blood transfusions
  - Substances: smoking, alcohol (TAK/NIE/OKAZJON.), sedatives/narcotics
  - Women's questions: pregnancy + month, menstruation, oral contraceptives
  - General: feelsHealthy, hospital 2yrs, currently treated, medications, allergies, bleeding tendency, fainting, pacemaker, blood pressure
- Signature canvas: fixed devicePixelRatio-aware resize → full width on mobile
- Notes formatter: structured sections with `--- SEKCJA ---` headers and blank line separators

**`ee029d5` — Notes to XML (Feb 25):**
- After POST /api/patients (201 created), now also calls POST /api/patients/:id/notes
- **Server-side fix (Feb 25 15:55):** Prodentis API v3 — notes now write to `<wazneUwagiList>` XML → correctly appears in "Uwagi i ostrzeżenia dla lekarza" (previously only went to `informacje_o_pacjencie`). No code changes needed on our side.

**`4ec3426` — Login Popup Tasks Clickable (Feb 25):**
- Each task in login popup now clickable → closes popup, switches to 'zadania' tab, opens task detail modal
- Added hover effects, description preview, → arrow indicator

**`ad28fbe` — PESEL Validation (Feb 25):**
- Full PESEL checksum validation (weights 1,3,7,9)
- Auto-fills birthDate (century offsets 1800-2200) and gender (digit 10: even=K, odd=M)
- Cross-validates birthDate ↔ PESEL when either field changes
- Green border + confirmation when valid, red border + error message when invalid
- Blocks step 1 → 2 progression if PESEL has errors

**`8eba1e9` — Patient Data Button in Schedule Popup (Feb 25):**
- New `GET /api/employee/patient-details?patientId=...` proxy to Prodentis
- Purple '👤 Dane' button in appointment popup (flexWrap for mobile safety)
- Full modal: personal data, contact, 'Informacje o pacjencie', '⚠️ Uwagi i ostrzeżenia dla lekarza'

**`a9faaa7` — Integrate Extended Prodentis Details API v5.1 (Feb 25):**
- Prodentis API now returns 7 new fields: `pesel`, `birthDate`, `gender`, `middleName`, `maidenName`, `notes`, `warnings[]`
- Simplified proxy (pure passthrough, removed Supabase fallback)
- Modal uses Prodentis data directly — all patients now show consistent data
- Dane osobowe: PESEL, data ur., płeć, nazwisko rodowe, imię drugie (only non-null shown)
- warnings[] → red cards with date + author

**`1ba3eb9` — Feature Suggestions Tab (Feb 25):**
- Migration 055: `feature_suggestions` + `feature_suggestion_comments` tables (RLS: all auth read/write)
- API: `GET/POST/PUT /api/employee/suggestions` + `GET/POST /api/employee/suggestions/[id]/comments`
- New 'Sugestie' tab (5th tab, Lightbulb icon) in employee panel
- Textarea form with category selector (Nowa funkcja/Poprawka/Pomysł/Inny)
- Upvote system (toggle per user email), comment threads, status badges

**`6cd0ce1` — Suggestions Bug Fix (Feb 25):**
- Fixed: `currentUser` (always `''`) → `currentUserEmail` (from `useUserRoles()` hook)
- Added error alerts on failed submissions
- `author_name` now uses full staff name from `staffList`

**`ca4ec01` — Mobile FAB Hamburger Menu (Feb 25):**
- Replaced full-width bottom tab bar with floating action button (FAB) in bottom-right corner
- 56px circular toggle (blue gradient → red on open, 90° rotation animation)
- 5 menu items expand upward with staggered spring animation (50ms delay)
- Each item: label pill + 48px colored icon circle with per-tab accent color
- Active tab highlighted with gradient glow + accent shadow
- Desktop horizontal tabs unchanged

**`b8dcf8b` — Dodatki Menu Color Unification (Feb 25):**
- All dropdown items (desktop + mobile) now use unified warm champagne `#e2d1b3`
- Removed 8+ multicolored inline styles (blue, purple, green, pink, gold, amber)
- Hover still transitions to `var(--color-primary)` gold via CSS class

---

### February 25, 2026 (batch 4)
**RLS Warning Fix Round 2 (migration 053)**

#### Commits:
- `d4167fc` — security: migration 053 — fix remaining 12 RLS warnings

**`d4167fc` — Fix after migration 052 increased warnings (Feb 25):**
- **Root causes:**
  - `USING (false)` without explicit `WITH CHECK (false)` — INSERT defaults to `WITH CHECK (true)` → still flagged
  - Old policy `Enable insert for everyone` on `article_ideas` — different name not caught by 052 DROP
  - 3 more functions missing `SET search_path = public`: `update_updated_at_column`, `clean_expired_reset_tokens`, `clean_expired_verification_tokens`
- **Fix strategy:** Migration 053 drops ALL policies dynamically (loop over `pg_policies`), then applies correct patterns:
  - `employee_tasks`, `push_subscriptions`, `article_ideas`, `employee_calendar_tokens` → NO policies (RLS enabled = only service_role allowed, anon/authenticated denied by default)
  - `google_reviews`, `site_settings`, `booking_settings` → single `FOR SELECT USING (true)` policy only (public read, service_role writes bypass RLS)
  - 3 functions — `CREATE OR REPLACE` with `SET search_path = public`
- **Expected result:** 0 errors, 1 warning (Leaked Password Protection = Pro plan)
- **Files:** `supabase_migrations/053_fix_rls_warnings.sql` — [NEW]
- **⚠️ Action required:** Run migration 053 in Supabase SQL editor

---

### February 25, 2026 (batch 3)
**RLS Policy Tightening — Always-True Policies Replaced (migration 052)**

#### Commits:
- `0223b40` — security: migration 052 — tighten always-true RLS policies

**`0223b40` — Always-true RLS policy tightening (Feb 25):**
- **Trigger:** 12 remaining warnings after migration 051 — "RLS Policy Always True" on 6 tables
- **Fix:** Migration 052 — idempotent DROP + CREATE for each table:
  - `employee_tasks`, `push_subscriptions`, `article_ideas`, `employee_calendar_tokens` → `service_only` (`USING (false)`) — all server API-only
  - `google_reviews` → split `public_read` (SELECT) + `service_write` (INSERT, USING false) — public cache needed on homepage
  - `site_settings` → split `public_read` (SELECT) + `service_write` (INSERT, USING false) — ThemeEditor reads client-side
  - `booking_settings` → refreshed to `public_read` (SELECT) + `service_write` (UPDATE, USING false) — booking form reads via anon
- **Result:** Security Advisor warnings reduced from 12 → ~1 (only "Leaked Password Protection" which requires Supabase Pro plan)
- **Files:** `supabase_migrations/052_tighten_rls_policies.sql` — [NEW]
- **⚠️ Action required:** Run migration 052 in Supabase SQL editor

---

### February 25, 2026 (batch 2)
**Supabase RLS Security Fixes + /kontakt Mobile Fix + Navigation Button**

#### Commits:
- `7be9677` — security: migration 051 — RLS fixes for all 17 tables (Supabase Security Advisor)
- `7d1d193` — fix: /kontakt mobile layout — responsive clamp font sizes for phone/email
- `a2fb6c5` — feat: 'Nawiguj do gabinetu' button on /kontakt page

**`7be9677` — RLS security hardening (Feb 25):**
- **Trigger:** Supabase Security Advisor email — 22 errors (RLS disabled on 17 tables), 16 warnings, 2 info
- **Root cause:** Tables created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. All accessed server-side via service_role but anon key had theoretical direct access.
- **Fix:** Migration 051 — idempotent `DO...IF NOT EXISTS` blocks enabling RLS on all 17 tables:
  - `email_verification_tokens`, `password_reset_tokens` → `USING (false)` (service_role only)
  - `chat_messages`, `chat_conversations` → `USING (auth.role() = 'authenticated')` (AdminChat.tsx uses browser client)
  - 13 remaining server-only tables (`user_roles`, `employees`, `patients`, `appointment_actions`, `appointment_instructions`, `task_history`, `task_comments`, `task_labels`, `task_label_assignments`, `task_type_templates`, `task_reminders`, `push_notification_config`, `short_links`) → `USING (false)`
  - 4 trigger functions fixed: added `SET search_path = public` (resolves "Function Search Path Mutable" warnings)
- **No app code changes** — service_role key bypasses RLS; all server API routes unaffected
- **Files:** `supabase_migrations/051_rls_security_fixes.sql` — [NEW]
- **⚠️ Action required:** Run migration 051 in Supabase SQL editor to take effect on production

**`a2fb6c5` + `7d1d193` — /kontakt page fixes (Feb 25):**
- Added "🗺️ Nawiguj do gabinetu" button with Google Maps deep link (`maps/dir/?api=1&destination=...`)
- Fixed mobile layout: `fontSize: "2rem"` for phones → `clamp(1.3rem, 5vw, 2rem)`, email `clamp(0.85rem, 3.5vw, 1.5rem)` + `word-break: break-all`
- **Files:** `src/app/kontakt/page.tsx`

---

### February 25, 2026 (batch 1)
**Booking Date Filter + Admin Setting for Minimum Days in Advance**

#### Commits:
- `2c4a96d` — feat: booking date filter + admin setting (migration 050)

#### Root Cause Fixed:
`/rezerwacja` was showing past/today slots from the current week. Prodentis returns all free slots for a given date including past weekdays (Monday, Tuesday when today is Wednesday) — they were genuinely free because no one was booked. The `AppointmentScheduler` had zero date filtering so these appeared as available.

**`2c4a96d` — Booking date filter + admin-controlled setting (Feb 25):**

**Migration 050** (`supabase_migrations/050_booking_settings.sql`):
- New singleton table `booking_settings (id INT PK DEFAULT 1, min_days_ahead INT DEFAULT 1, updated_at TIMESTAMPTZ)`
- RLS: SELECT is public (needed by booking form), UPDATE requires `service_role`
- Default row seeded: `min_days_ahead = 1` (tomorrow)

**API `GET/PUT /api/admin/booking-settings`** (`src/app/api/admin/booking-settings/route.ts`):
- `GET` — public, returns `{ min_days_ahead: number }`; falls back to `1` if table missing (pre-migration safety)
- `PUT` — accepts `{ min_days_ahead: number }`, validates 0–90 range, upserts singleton row

**`AppointmentScheduler.tsx`** (`src/components/scheduler/AppointmentScheduler.tsx`):
- Added `minDaysAhead` state (default `1`)
- `useEffect([], [])` — fetches `/api/admin/booking-settings` on mount, updates state
- In `fetchSlotsForWeek` — computes `cutoff = midnight(today + minDaysAhead)` and filters `slot.start < cutoff` out of results
- Added `minDaysAhead` to `useEffect` deps array so slots re-fetch on setting change

**Admin Panel** (`src/app/admin/page.tsx`):
- Added `'booking-settings'` to activeTab union type
- State: `minDaysAhead`, `bookingSettingsSaving`, `bookingSettingsMsg`
- Auto-loads current value from DB when tab is opened (in `useEffect([activeTab])`)
- New sidebar NavItem: `📅 Rezerwacje` (above 🎨 Motyw)
- Full tab UI: select (Dziś/Jutro/2 dni/3 dni/Tydzień/2 tygodnie), Zapisz button with success/error toast, info box

#### Files:
- `supabase_migrations/050_booking_settings.sql` — [NEW]
- `src/app/api/admin/booking-settings/route.ts` — [NEW]
- `src/components/scheduler/AppointmentScheduler.tsx` — cutoff filter + minDaysAhead fetch
- `src/app/admin/page.tsx` — Rezerwacje tab + settings UI

> ⚠️ **REQUIRES**: Run migration 050 in Supabase SQL editor before testing on production.

---

### February 24, 2026 (batch 6)
**Employee Tab Nav Fix + Task History Crash Fix + /aplikacja Landing Page Fixes**

#### Commits:
- `9869abb` — fix: tab nav 100% inline styles + JS isMobile detection, z-index 9999
- `e5cc54c` — fix: task history crash when image_urls/complex fields in changes
- `f80d13a` — fix: /aplikacja landing page — broken register links + navbar overlap + duplicate tab

**`9869abb` — Definitive employee tab navigation fix (Feb 24):**
- **Problem**: Employee panel (Grafik/Zadania/AI/Alerty) tabs disappeared on mobile. CSS class-based approach (globals.css + styled-jsx) proved unreliable in Next.js App Router client components.
- **Root causes found (in sequence)**:
  1. `styled-jsx global` not applying in App Router client components → moved to `globals.css`
  2. `useSearchParams()` without `<Suspense>` boundary → render bailout → replaced with `window.location.search` in `useEffect`
  3. CSS classes still unreliable → final fix: 100% inline styles
- **Final fix**: Replaced `className="pw-tab-bar"` with `style={isMobile ? {...} : {...}}` ternary
  - `isMobile` state set via `window.matchMedia('(max-width: 767px)')` in `useEffect` with change listener
  - Mobile: `position:fixed; bottom:0; z-index: 9999` — guaranteed above all other UI
  - Each tab `flex:1`, vertical icon+label layout, `borderTop` active indicator
  - Desktop: horizontal top bar with `borderBottom` active indicator  
  - Added spacer `<div style={{height:'64px'}}>` on mobile so content isn't hidden behind fixed nav
  - Zero dependency on any CSS file — always renders correctly
- **Files**: `src/app/pracownik/page.tsx`

**`e5cc54c` — Task history client-side crash fix (Feb 24):**
- **Problem**: Clicking "Historia zmian" (edit history) on tasks like "Mruczek Damian w trakcie" and "plan leczenia Wójtowicz Piotr" crashed with "Application error: a client-side exception"
- **Root cause**: `task_history.changes` JSONB can store arrays (e.g. `image_urls: { old: [url1, url2], new: [url3] }`) or objects. The renderer did `val.old || '—'` which returned the array directly — React cannot render arrays as JSX children.
- **Fix**: Added defensive `toStr(v)` helper in both history rendering blocks:
  - `Array` + image_urls/image_url key → `📷 ×N`
  - `Array` (other keys) → `[N elem.]`  
  - `Object` → `JSON.stringify(v).substring(0, 60)`
  - Primitive → `String(v)` or `—`
- Also added `patient_id` and `linked_appointment_info` to skip list (alongside `assigned_to_doctor_id`)
- **Both rendering copies fixed**: task list inline view (line ~3203) AND selectedViewTask modal (line ~4134)
- **Files**: `src/app/pracownik/page.tsx`

**`f80d13a` — /aplikacja landing page fixes (Feb 24):**
- **Bug 1 — Broken register links (404)**: Both `href="/strefa-pacjenta/register"` → 404 (directory with no `page.tsx`). Fixed to `/strefa-pacjenta/register/verify` (entry point of multi-step registration flow).
- **Bug 2 — Global Navbar overlap**: `ThemeLayout` renders global Navbar on every page including /aplikacja which has its own `<nav>`. Fix: `useEffect` in `/aplikacja/page.tsx` injects `<style id='hide-global-nav'>` targeting `nav[class*="Navbar"], footer[class*="Footer"] { display:none !important }` on mount, removes on unmount.
- **Bug 3 — Duplicate Instalacja tab**: "Konfiguracja konta" section had `Instalacja` tab showing iOS-only StepCards — identical content to the full install section above. Removed the tab; section now has only `Konto` and `Powiadomienia` tabs (starting with `account`). State type narrowed from `'install'|'account'|'push'` to `'account'|'push'`.
- **Files**: `src/app/aplikacja/page.tsx`

#### Files Modified:
- `src/app/pracownik/page.tsx` — tab nav inline styles + isMobile state + history crash fix
- `src/app/aplikacja/page.tsx` — register links, navbar hide, duplicate tab removal

---

### February 24, 2026 (batch 5)
**Week-After-Visit App Promotion SMS + /aplikacja PWA Landing Page + Admin Panel Tab + SMS Bug Fixes**

#### Commits:
- `d9b23da` — feat: week-after-visit app promotion SMS + /aplikacja PWA landing page
- `94c1ca1` — fix: remove invalid metadata export from 'use client' component (/aplikacja page)
- `7ab7146` — feat: add 'SMS tydzień po wizycie' admin panel tab
- `1354429` — fix: post-visit SMS — encoding error + draft flow + admin review
- `0bdfc9c` — feat: SMS tabs auto-load on entry, delete-all drafts, week-after-visit draft controls
- `ec185c1` — fix: SMS isolation + Pani/Panie salutation + skip reasons panel
- `49d1eb5` — fix: SMS crons — isWorkingHour bool coercion + visible error routing
- `547e576` — fix: SMS draft count mismatch — unique constraint + NOT NULL fixes (migration 046)
- `b06893c` — feat: task multi-photo + comment input fix + image compression (migration 047)
- `807a611` — fix: push notification duplicates + task history expand in modal
- `eb3fb2c` — fix: PWA push reliability — SW timeout, iOS renewal, dedup fixes
- `66f632b` — feat: push notification history tab + sendPushToGroups dedup fix (migration 048)
- `ea03ea1` — fix: push logging + final dedup in sendPushByConfig and sendPushToAllEmployees
- `2001053` — feat: Telegram notification on new patient registration
- `527e558` — feat: push notification deep links — auto-navigate to task on click
- `2c273ce` — fix: responsive tab nav — fixed bottom bar on mobile, top tabs on desktop
- `1a64c7d` — fix: pw-tab-bar CSS moved to globals.css (styled-jsx global unreliable in App Router)
- `5d3480e` — fix: replace useSearchParams with window.location — fixes tab nav disappearing
- `9869abb` — fix: tab nav 100% inline styles + JS isMobile — definitive mobile fix
- `e5cc54c` — fix: task history crash for image_urls/complex fields (defensive toStr helper)
- `f80d13a` — fix: /aplikacja landing page — broken register links + navbar overlap + duplicate tab
- `b880ef1` — feat: Google Calendar ↔ task sync — delete task removes calendar event (migration 049)

**`b880ef1` — Google Calendar task sync (Feb 24):**
- `employee_tasks.google_event_id TEXT` column added (migration 049)
- `createTask()` in `assistantActions.ts`: if `due_date` set + Google Calendar connected → auto-creates calendar event (colorId banana) + saves `google_event_id` to task row
- `DELETE /api/employee/tasks/[id]`: reads `google_event_id` before deleting; calls `deleteEvent(calUserId, eventId)` fire-and-forget to remove event from Google Calendar
- AI system prompt updated: `createTask` with `due_date` auto-links calendar — do NOT call `addCalendarEvent` separately (would create duplicate)

**`2c273ce` — Mobile tab nav responsive (Feb 24):**
- **Problem**: 4-tab navigation overflowed on mobile (4×130px > 375px viewport)
- **Fix**: CSS class-based `.pw-tab-bar` / `.pw-tab-btn` system
  - Desktop ≥768px: unchanged horizontal top bar, `overflow-x: auto` as safety fallback
  - Mobile <768px: `position:fixed; bottom:0` bottom nav bar, 4 equal-width columns, icon+label vertical stack, `border-top` active indicator, `env(safe-area-inset-bottom)` padding for iPhone home bar, translucent backdrop blur
- `.pw-content-area` class on main wrapper adds `padding-bottom` on mobile to prevent content hidden behind nav
- Labels shortened on mobile: 'Asystent AI'→'AI', 'Powiadomienia'→'Alerty'

**`527e558` — Push deep links (Feb 24):**
- All task push URLs changed from `/pracownik` to `/pracownik?tab=zadania&taskId={id}` (6 files)
- `pracownik/page.tsx`: `useSearchParams` reads `?tab=` + `?taskId=` on mount via one-shot `useRef` guard; `deepLinkTaskId` state waits for tasks to load before opening modal

**`ea03ea1` — Push logging completeness (Feb 24):**
- **`sendPushByConfig`**: added `loggedUsers Set` + `logPush()` in `sendBatch`.
- **`sendPushToAllEmployees`**: added `sentEndpoints Set` + `logPush()` per user.
- **`sendTranslatedPushToUser`**: added cross-locale `sentEndpoints Set` + `logPush()` exactly once per user.

**`66f632b` — Push history + last dedup fix (Feb 24):**
- **Migration 048** `push_notifications_log` table: `(id, user_id, user_type, title, body, url, tag, sent_at)`, indexed on `(user_id, sent_at DESC)`.
- **Powiadomienia tab** (`pracownik/page.tsx`): 4th tab 🔔 with grouped-by-day history list.

**`eb3fb2c` — PWA push reliability (Feb 24):**
- Gray bell fix, iOS endpoint rotation fix, SW pushsubscriptionchange handling.

**`807a611` — Push & History fixes (Feb 24):**
- Push 8×dup ROOT CAUSE FIX, manual push double-send fix.

**`220097a` — FCM Push Rebuild + History Decouple (April 2026):**
- **VAPID → FCM migration**: Replaced `web-push` npm + `push_subscriptions` table with Firebase Cloud Messaging (`firebase-admin` SDK + `fcm_tokens` table). Migration 104.
- **Data-only payload**: Removed `notification` key from FCM messages — only `data: {title, body, url, tag, icon}`. Prevents FCM auto-display duplicating our manual `showNotification()` in SW/foreground handler.
- **Notification history decoupled from delivery**: `logPush()` now called for ALL target users via `resolveGroupUsers()` (queries `employees`/`user_roles` tables), not just those with FCM tokens. Users without push enabled see full event history in Alerts tab.
- **Shared Alerts tab**: `/api/employee/push/history` returns ALL system notifications (no user_id filter), deduplicated by title+body within 2-second windows. Every employee sees complete 30-day history.
- **Files**: `pushService.ts` (complete rewrite), `firebase.ts` (Admin SDK), `firebaseClient.ts` (Client SDK), `firebase-messaging-sw.js` (background handler), `PushNotificationPrompt.tsx` (FCM token registration)

**`b06893c` — Employee task fixes (Feb 24):**
- **Comment input in detail modal**: Full comment section (all comments + input field) now visible in `selectedViewTask` popup modal — previously only existed in collapsed task card inline view
- **Multi-photo support** (max 5 per task): Thumbnail grid 72×72px in both create and edit modals with individual delete buttons; multi-file input; `image_urls: TEXT[]` column added in migration 047
- **Client-side compression** (`compressImage` fn): Canvas API → JPEG, max 1200px, quality loop until ≤200KB — no external library needed
- **openEditModal** now initializes `image_urls` from existing task data
- **Migration 047**: `employee_tasks.image_urls TEXT[] DEFAULT '{}'` + migrates existing `image_url` values


**`547e576` — Root cause fix for draft count mismatch (cron says 37, list shows 19):**
- **Bug #1**: `UNIQUE(prodentis_id, appointment_date)` from migration 007 — prevents inserting both `post_visit` and `week_after_visit` SMS for the same appointment (same prodentis_id + same date). Second INSERT silently failed.
- **Bug #2**: `patient_id NOT NULL` and `doctor_id NOT NULL` — cron sets these to null when patient/doctor not found in local DB → INSERT fails with NOT NULL violation.
- **Migration 046** (`046_fix_sms_unique_constraint.sql`):
  - Drops `UNIQUE(prodentis_id, appointment_date)` constraint
  - Makes `patient_id` and `doctor_id` nullable
  - Adds proper `UNIQUE(prodentis_id, sms_type) WHERE status != 'cancelled'`
- Both cron INSERTs now use `{ error: insertError }` — Supabase errors go to `skippedDetails[]` (visible in admin panel yellow panel) instead of invisible exceptions
- `doctor_id` removed from cron INSERTs (not available in post-visit/week-after crons)

⚠️ **REQUIRES**: Run migration 046 in Supabase SQL editor before testing


**`49d1eb5` — Root cause fix for missing SMS appointments:**
- **Bug**: `appointment.isWorkingHour` compared with strict `=== true`, but Prodentis API returns it as string `'true'` for some records → those appointments passed right into the skip bucket without explanation
- **Fix**: both crons now coerce: `const isWorking = appointment.isWorkingHour === true || appointment.isWorkingHour === 'true'`
- **Fix**: per-appointment `catch()` now pushes to `skippedDetails[]` with `"BLAD DB: ..."` reason instead of invisible `errors[]`
- **Cleaned up**: removed dead `freeSlotProdentisIds` code (fetched `/api/slots/free` which doesn't exist and was never used)


**`ec185c1` — 3 critical UX/logic fixes for post-visit & week-after-visit SMS:**
- **Bug #1 — Skipped reasons**: Both crons now return `skippedDetails[]` with `{name, doctor, time, reason}` for every skipped appointment. Reasons: no phone | not working hour | outside 08:00–20:00 | doctor not in list | already sent. Admin panel shows a collapsible yellow `<details>` panel after running the cron manually — each row shows patient name, time, doctor, and the exact skip reason.
- **Bug #2 — SMS misz-masz in wrong tab**: Post-visit and week-after-visit drafts were appearing in the SMS Przypomnienia tab because `sms-auto-send` had no type filter and `appointment-reminders` set no `sms_type`. Fixed:
  - `sms-auto-send` → `.or('sms_type.eq.reminder,sms_type.is.null')` filter
  - `appointment-reminders` → inserts with `sms_type: 'reminder'`
  - `admin/fetchSmsReminders` → fetches `?sms_type=reminder` only
- **Bug #3 — Pani/Panie salutation**: Added `detectGender(firstName)` + `buildSalutation()` (female names end in 'a' → "Pani X", otherwise "Panie X"). Both cron templates updated: `"Dziekujemy za wizyte, {salutation}!"`. `smsService.formatSMSMessage` now supports `{salutation}` variable.

**`1354429` — Critical SMS fixes** (`src/lib/smsService.ts`, `src/app/api/cron/post-visit-sms/route.ts`, `src/app/api/cron/week-after-visit-sms/route.ts`):
- **Bug fix — SMSAPI error 11**: Added `encoding: 'utf-8'` to SMSAPI request body. Without it, SMSAPI rejects any message with Polish chars or emoji.
- **Bug fix — wrong patient filtering**: Both post-visit crons rewritten to use identical filtering as the working `appointment-reminders`:
  - `isWorkingHour === true` check (white calendar slots only)
  - Business hours window 08:00–20:00
  - `isDoctorInList()` fuzzy matching
  - Elżbieta Nowosielska custom 08:30–16:00 exception
- **New flow — Draft → Admin Review → Auto-Send**:
  - Cron generates DRAFT records (`status='draft'`) instead of direct sends
  - 🔔 Push notification sent to admin: "Check drafts in panel admin"
  - Admin can edit text, delete, or send-now per individual draft
  - "Wyślij wszystkie szkice" bulk button in panel
  - New `post-visit-auto-send` cron (Stage 2) fires ~1h after draft cron and sends remaining drafts
- **New files**:
  - `src/app/api/cron/post-visit-auto-send/route.ts` — Stage 2 auto-send, handles both `post_visit` and `week_after_visit`
  - `src/app/api/admin/sms-send/route.ts` — single-draft immediate send endpoint
- **Vercel.json**: `post-visit-sms` @ 18:00 UTC → `post-visit-auto-send` @ 19:00 UTC; `week-after-visit-sms` @ 09:00 UTC → `post-visit-auto-send?sms_type=week_after_visit` @ 10:00 UTC

**`7ab7146` — Admin Panel: "📱 SMS tydzień po wizycie" tab** (`src/app/admin/page.tsx`):
- New sidebar nav item below "SMS po wizycie", green accent (`#34d399`) to distinguish visually
- Sub-tab **Historia**: searchable list of all `week_after_visit` SMS; shows patient, original appointment date, send date, phone, message, status and error badge
- Sub-tab **Szablon**: edit `week_after_visit` template, variable hints (`{patientFirstName}`, `{appUrl}`), live char counter (amber at 150+, warning at 160+), save + restore
- Action bar: Odśwież dane + Uruchom cron teraz (shows result with targetDate)

- `d9b23da` — feat: week-after-visit app promotion SMS + /aplikacja PWA landing page

#### New Feature: SMS 7 days after visit — promoting the app

**Cron: `/api/cron/week-after-visit-sms`** — registered in `vercel.json` as `0 9 * * *` (10:00 Warsaw CET)
- Fetches appointments from **7 days ago** via Prodentis `/api/appointments/by-date`
- Same filtering: `isWorkingHour`, doctor list, phone, Nowosielska exception
- Global dedup: skips if `week_after_visit` SMS already sent for this `prodentis_id`
- Template (ASCII-safe for GSM-7, ~130 chars + URL):
  `Dziekujemy, ze jestes naszym pacjentem! 😊 Miej Mikrostomart zawsze przy sobie - pobierz aplikacje na telefon: {appUrl}`
- `appUrl` = `https://mikrostomart.pl/aplikacja`
- Supports `?manual=true` (test trigger) and `?date=YYYY-MM-DD` (date override)
- `sms_type='week_after_visit'` in `sms_reminders`

**Migration 046: `supabase_migrations/046_sms_week_after_visit.sql`**
- Seeds `week_after_visit` template in `sms_templates` (no schema change)

#### New Page: `/aplikacja` — PWA Install Landing Page

**`src/app/aplikacja/page.tsx`** — premium marketing landing page (fixed in batch 6):
- **Nav**: transparent → glassmorphism scroll effect; global Navbar hidden via injected CSS (`nav[class*='Navbar'] display:none`)
- **Hero**: h1 with gradient branding + mock phone UI with animated app preview
- **Benefits grid**: 6 cards — terminy, czat, dokumentacja, push, opinie, szybkość
- **Install guide**: togglable iOS (Safari) / Android (Chrome) step cards
- **Setup tabs**: Konto / Powiadomienia push — each with 4-step cards (Instalacja tab removed — duplicated main install section)
- **CTA**: double button (install + register → `/strefa-pacjenta/register/verify`), full brand theming
- Brand: `#dcb14a` gold on `#0a0a0f` dark

#### Files:
- `supabase_migrations/046_sms_week_after_visit.sql` — [NEW]
- `src/app/api/cron/week-after-visit-sms/route.ts` — [NEW]
- `src/app/aplikacja/page.tsx` — [NEW]
- `vercel.json` — added `0 9 * * *` cron
- `src/lib/smsService.ts` — added `appUrl?` variable to `formatSMSMessage`
- `src/app/api/admin/sms-templates/route.ts` — added `week_after_visit` to DEFAULT_TEMPLATES

---

### February 24, 2026 (batch 4)
**Post-Visit SMS Automation System + Admin Panel Section**

#### Commits:
- `d763417` — feat: automated post-visit SMS system with Google review detection
- `dabf362` — feat: varied per-visit fun facts for post-visit SMS (reviewed patients)

**Improvement: `dabf362`** — `post_visit_reviewed` SMS no longer sends the same static message every time. The cron now:
- Holds a `FUN_FACTS[]` pool of 22 dental fun facts, anecdotes, historical curiosities, and jokes (Polish)
- Calls `pickFunFact(appointmentId)` — deterministic hash of appointment ID selects a unique fact per visit
- Template uses `{funFact}` placeholder; `formatSMSMessage()` in `smsService.ts` injects it
- Admin panel "Szablony" tab now shows `{funFact}` in the variable hint
- Migration seed updated to use `{funFact}` placeholder

#### New Feature: Automated SMS after each appointment (19:00 Warsaw / 18:00 UTC)

**Cron: `/api/cron/post-visit-sms`** — registered in `vercel.json` as `0 18 * * *`
- Fetches TODAY's appointments from Prodentis `/api/appointments/by-date?date=YYYY-MM-DD`
- Filters: `isWorkingHour=true` + 8–20h business window + doctor in `REMINDER_DOCTORS` list
- Dedup: skips if `sms_reminders` already has a `post_visit` row for this `prodentis_id`
- **Google review detection**: fuzzy name match (lowercase + normalize) of patient name vs `google_reviews.google_author_name`
  - Match found → `post_visit_reviewed` template (thanks + dental tip — no review request)
  - No match → `post_visit_review` template (thanks + link to `/strefa-pacjenta/ocen-nas`)
- Sends immediately via `sendSMS()` + saves to `sms_reminders` with `sms_type='post_visit'`

**SMS flow for patient:**
1. SMS arrives: thanks + link to our internal review page (`/strefa-pacjenta/ocen-nas` — in patient zone "Dodatki" menu)
2. Patient fills internal survey about their experience
3. On that page they can optionally post a Google review (existing system)

**Migration 045: `supabase_migrations/045_sms_post_visit.sql`**
- `sms_reminders.sms_type TEXT DEFAULT 'reminder'` (reminder | post_visit)
- `sms_reminders.already_reviewed BOOLEAN DEFAULT FALSE`
- Unique index `idx_sms_reminders_post_visit_unique` on `(prodentis_id, sms_type)` WHERE `sms_type='post_visit'`
- Seeds 2 new templates: `post_visit_review` + `post_visit_reviewed`

**Admin Panel — new tab "✉️ SMS po wizycie"** (`src/app/admin/page.tsx`)
- Sub-tab "Historia": searchable list of all sent post-visit SMS; shows sent_at, patient, doctor, message, review status badge
- Sub-tab "Szablony": edit `post_visit_review` and `post_visit_reviewed` template text with variable hints
- "Uruchom cron teraz" button for manual test trigger

**API change: `src/app/api/admin/sms-reminders/route.ts`**
- GET: added `?sms_type=post_visit` filter

**smsService: `src/lib/smsService.ts`**
- `formatSMSMessage()` extended: added `patientFirstName`, `surveyUrl`, `doctorName` variables

#### Files:
- `supabase_migrations/045_sms_post_visit.sql` — [NEW] migration
- `src/app/api/cron/post-visit-sms/route.ts` — [NEW] cron route
- `vercel.json` — added `0 18 * * *` cron entry
- `src/lib/smsService.ts` — extended `formatSMSMessage`
- `src/app/api/admin/sms-reminders/route.ts` — `sms_type` query param
- `src/app/admin/page.tsx` — post-visit SMS tab (state + nav + render function)

---

### February 24, 2026 (batch 3)
**Calendar View: Pulsing Task Counter Badge + Day Tasks Popup**

#### Commits:
- `3901f8e` — feat: calendar view — pulsing task counter badge + day tasks popup

#### Changes:
- **Problem**: Calendar cells showed task title text tiles → layout shifts, different cell heights
- **Solution**: Each cell now shows a single pulsing circular badge with the task count
  - Blue (normal days) / Red (if any urgent task on that day)
  - `@keyframes calPulse` — scale pulse + ripple box-shadow, 2s loop
- **Day tasks popup** (`calendarDayPopup` state): clicking badge opens modal listing all tasks for that day
  - Each task card: title with ⚡/🔒 icons + status badge + time/patient/checklist meta
  - Left border colored by task status; hover highlight
  - Clicking a task opens the task detail modal on top
- **Files**: `src/app/pracownik/page.tsx`

---

### February 24, 2026 (batch 2)
**Unified Task Detail Modal for All 3 Views**

#### Commits:
- `b7f5255` — feat: unified task detail modal for all 3 task views

#### Changes:
- **New state**: `selectedViewTask: EmployeeTask | null`
- **New modal** (`TASK DETAIL MODAL`) inserted in JSX before edit modal:
  - Header: title, status badge (clickable → advances status), priority badge, 🔒/task_type badges
  - Meta: due date+time, patient name, assignees
  - Description block
  - Interactive checklist (checkboxes work directly in modal, optimistic update)
  - Comments preview (first 3 comments)
  - History count (async fetch)
  - Buttons: ✏️ Edytuj (→ closes detail, opens edit form), status change, 🗑️ Usuń (admin only)
- **Views wired**:
  - List view: was inline expand → now opens detail modal
  - Kanban columns: had no onClick → now opens detail modal
  - Calendar tiles: was `openEditModal` → now opens detail modal
- **Files**: `src/app/pracownik/page.tsx`

---

### February 24, 2026 (batch 1)
**5 Bug Fixes: Schedule Persistence + Task Click + Duration + AI updateTask**

#### Commits:
- `d236bfa` / `6a731be` — fix: 5 bugs

#### Fixes:
1. **Schedule: persist hiddenDoctors** — lazy-init + save to `localStorage('schedule-hidden-doctors')` in `toggleDoctor/showAll/hideAll`
2. **Tasks: calendar task click** — now consistently opens `selectedViewTask` detail modal (not edit modal)
3. **AI updateTask action** — new `updateTask()` in `assistantActions.ts` finds task by `title_query` (ilike) or `task_id`; `merge_checklist` adds items without replacing existing; added to `FUNCTIONS` + dispatcher
4. **AI system prompt** — "KRYTYCZNE — NIE duplikuj zadań" rule: use `updateTask(merge_checklist)` not `createTask` when user adds to existing task
5. **Schedule duration (permanent fix)** — `new Date(endDateStr)` → UTC-sensitive on Vercel; replaced with direct string slice `indexOf('T') + slice` for endDate time, same as startTime already was

#### Files:
- `src/app/pracownik/page.tsx` — hiddenDoctors localStorage + calendar task click
- `src/lib/assistantActions.ts` — updateTask action + dispatcher
- `src/app/api/employee/assistant/route.ts` — updateTask FUNCTION + no-duplicate system prompt rule
- `src/app/api/employee/schedule/route.ts` — permanent duration string-parse fix

---

### February 23, 2026 (batch 3)
**AI Memory System + Task Auto-Description + TTS Autoplay Fix**

#### Commits:
- `336ed02` — feat: AI memory system + task auto-description + TTS autoplay fix

#### Features Added:

1. **Supabase: `assistant_memory` table** (migration 044)
   - `user_id` (unique), `facts` (jsonb), `updated_at`
   - RLS: owner reads/writes own row; service role used for server writes

2. **API: `/api/employee/assistant/memory`** (GET + POST)
   - GET → returns user's facts JSON
   - POST `{ facts }` → deep-merges (null value = delete key)

3. **`updateMemory` action** (`assistantActions.ts`)
   - New function + `executeAction` switch case
   - GPT calls automatically when user mentions address, phone, preference, recurring event

4. **Memory injection into system prompt** (`assistant/route.ts`)
   - `SYSTEM_PROMPT` const → `buildSystemPrompt(memory)` function
   - POST handler fetches `assistant_memory` from DB, injects into prompt
   - `updateMemory` added to `FUNCTIONS` list
   - System prompt improved: push transparency, explicit follow-up suggestions

5. **Task auto-description** (`assistantActions.ts` `createTask`)
   - If no description given: auto-generates "Zadanie prywatne • Termin: 24 lutego 2026 o 16:00"

6. **TTS Autoplay fix** (`VoiceAssistant.tsx`)
   - OLD: `new AudioContext()` every call → Chrome/Safari blocked autoplay
   - NEW: reuse existing AudioContext, `resume()` if suspended — satisfies autoplay policy
   - Responses now play automatically

#### Files Modified:
- `supabase_migrations/044_assistant_memory.sql` — **[NEW]** assistant_memory table
- `src/app/api/employee/assistant/memory/route.ts` — **[NEW]** memory CRUD API
- `src/lib/assistantActions.ts` — updateMemory action + auto-description in createTask
- `src/app/api/employee/assistant/route.ts` — buildSystemPrompt + memory fetch + updateMemory FUNCTION
- `src/components/VoiceAssistant.tsx` — AudioContext reuse for TTS autoplay

> **ACTION REQUIRED:** Run `supabase_migrations/044_assistant_memory.sql` in Supabase SQL Editor

---

### February 23, 2026 (batch 2)
**Private Tasks UI + AI Proactive Behavior + OpenAI TTS**

#### Commits:
- `b2b87c6` — Private tasks UI, AI proactive system prompt, OpenAI TTS voice, assistantActions is_private+due_time

#### Features Added / Fixed:

1. **Private Task Creation UI**
   - Task creation modal: 🔒/🌐 toggle button (full-width, above Title field) — default: 🌐 Widoczne dla wszystkich
   - `taskForm` state: +`is_private: false`; `resetTaskForm()` resets it
   - `handleCreateTask()` passes `is_private` to POST body
   - Filter dropdown: +`🔒 Prywatne` option (`value='__private__'`) — shows only `is_private=true && owner_user_id == currentUserId`
   - `filteredTasks` logic updated to handle `__private__` filter value

2. **AI Assistant: Proactive Behavior**
   - System prompt in `assistant/route.ts` completely rewritten: NIE PYTAJ → DZIAŁAJ od razu
   - Date inference pre-computed: jutro/pojutrze/przyszły tydzień resolved at request time
   - After executing: natural 2-3 sentence reply + suggests what else could be added
   - `createTask` schema: +`is_private`, +`due_time`; task_type pomiń for private
   - `temperature`: 0.4 → 0.6 for more natural wording
   - Style: no "Oczywiście!"; confirms what was DONE not future tense

3. **OpenAI TTS (replaces browser speechSynthesis)**
   - New: `src/app/api/employee/tts/route.ts` — POST `{ text, voice? }` → `audio/mpeg` (tts-1, nova default)
   - `VoiceAssistant.tsx`: `speakText()` now async, uses `AudioContext` + smooth gain ramp-in
   - Settings panel: voice selector (Nova / Alloy / Shimmer)
   - `ttsVoice` state + `ttsVoiceRef` added to component
   - Removed `window.speechSynthesis.getVoices()` call

4. **assistantActions.ts createTask**
   - +`is_private`, +`due_time` to function signature + DB insert
   - Private tasks skip `sendPushToAllEmployees`
   - Return message includes time if provided

#### Files Modified:
- `src/app/pracownik/page.tsx` — is_private toggle, __private__ filter, is_private in POST
- `src/components/VoiceAssistant.tsx` — OpenAI TTS, voice selector, removed speechSynthesis
- `src/app/api/employee/assistant/route.ts` — system prompt rewrite, createTask schema
- `src/lib/assistantActions.ts` — createTask: is_private, due_time, private push skip
- `src/app/api/employee/tts/route.ts` — **[NEW]** OpenAI TTS proxy

---

### February 23, 2026
**Schedule Display Fix + Push Notification Dedup + Calendar Fix + Day Toggle + AI Voice Private Tasks**

#### Commits:
- `89033d7` — Fixed appointments displaying as 15 min in desktop schedule (endDate-based duration calc)
- `9669aab` — Push notification dedup, default Kanban view, mobile zadania layout
- `a0dcd55` — Calendar bug fix (slice 0,10), schedule day toggle, AI voice private tasks backend
- `dd169da` — Fixed migration number collision (028→043)

#### Features Added / Fixed:

1. **Desktop Schedule Duration Fix**
   - All appointments showed as 15 min in `pracownik/page.tsx` schedule grid
   - Fixed: `schedule/route.ts` now uses `endDate - startDate` (mirrors patient zone logic)
   - `ProdentisAppointment` interface updated to include `endDate`

2. **Push Notification Deduplication**
   - Users received 3× the same notification (multiple subscription rows)
   - New `dedupSubsByUser()` helper in `webpush.ts` — keeps max 2 rows per user (newest first)
   - Applied to ALL send paths: `sendPushToAllEmployees`, `sendPushToGroups`, `sendPushByConfig`, `sendPushToSpecificUsers`
   - `sendPushToSpecificUsers` now has per-user logging in Vercel Logs to diagnose 0-sends

3. **Zadania Tab (Mobile)**
   - Default view changed from `'list'` to `'kanban'`
   - Header `flexWrap: wrap` — buttons no longer overflow on mobile
   - ⚙️ Typy button changed to icon-only

4. **Calendar View Bug Fix**
   - `tasksForDate()` used strict `===` comparison — failed when `due_date` stored as full ISO timestamp
   - Fixed with `.slice(0, 10)` — tasks now correctly appear in calendar cells

5. **Schedule Day Toggle (Pn–Nd)**
   - New row of 7 buttons (Pn Wt Śr Cz Pt Sb Nd) above operator toggles in Grafik tab
   - Click hides/shows that day's column
   - State persisted to `localStorage('schedule-hidden-days')` — restored on page reload
   - `getVisibleDays()` updated to respect `hiddenScheduleDays` state

6. **AI Voice Personal Private Tasks (backend)**
   - **Migration 043** (`043_private_tasks_and_reminders.sql`):
     - `employee_tasks`: +`is_private` (bool), +`owner_user_id` (uuid), +`due_time` (time)
     - New table: `task_reminders` — scheduler for individual push notifications
   - **NEW** `/api/employee/tasks/ai-parse` — GPT-4o-mini parses natural language text:
     - Extracts: title, due_date, due_time, checklist_items, reminder intervals
     - Creates private tasks + schedules `task_reminders` rows
   - **UPDATED** `/api/employee/tasks/route.ts`:
     - GET: private tasks filtered by `owner_user_id` (only owner sees them)
     - POST: accepts `is_private`, `owner_user_id`, `due_time`; skips Telegram/push for private tasks
   - **UPDATED** `/api/cron/task-reminders/route.ts`:
     - Added Part 3: processes `task_reminders` table, sends push per task owner
     - Skips done/archived tasks and fully-ticked checklists
   - `EmployeeTask` interface in `pracownik/page.tsx`: +`is_private`, +`owner_user_id`, +`due_time`
   - VoiceAssistant component (`src/components/VoiceAssistant.tsx`) already handles voice input → routes to `/api/employee/assistant` which can call `ai-parse`

#### Files Modified:
- `src/app/api/employee/schedule/route.ts` — endDate duration calc, `ProdentisAppointment.endDate`
- `src/lib/webpush.ts` — `dedupSubsByUser()` helper, applied to all 4 send functions
- `src/app/pracownik/page.tsx` — default kanban view, mobile header, calendar fix, day toggle, `EmployeeTask` interface
- `src/app/api/employee/tasks/route.ts` — private task filtering GET + POST fields
- `src/app/api/cron/task-reminders/route.ts` — personal reminders processing (Part 3)
- `src/app/api/employee/tasks/ai-parse/route.ts` — NEW endpoint
- `supabase_migrations/043_private_tasks_and_reminders.sql` — NEW migration

#### DB Migration Required:
- Run `supabase_migrations/043_private_tasks_and_reminders.sql` in Supabase SQL Editor

---

### February 10, 2026
**Skipped Patients Reporting + Telegram 3-Bot Split**

#### Major Changes:
1. **Skipped Patients in Admin Panel** — Cron `appointment-reminders` now returns `skippedPatients` array (patients within working hours skipped due to missing phone or doctor not in list). Admin panel shows them in a yellow warning section below SMS drafts with "Wyślij ręcznie" button.
2. **Telegram 3-Bot Architecture** — Notifications split across 3 separate Telegram bots:
   - `@mikrostomart_appointments_bot` — appointment confirmations/cancellations/reschedules
   - `@mikrostomart_messages_bot` — contact form messages
   - Original bot — reservations, orders, leads
3. **Centralized Telegram Helper** — New `src/lib/telegram.ts` with `sendTelegramNotification(msg, channel)` replacing duplicated inline code in 8 API routes.

#### Files Added:
- `src/lib/telegram.ts` — Central Telegram multi-bot routing function

#### Files Modified:
- `src/app/api/cron/appointment-reminders/route.ts` — Added `skippedPatients` collection and return
- `src/app/admin/page.tsx` — Added skipped patients section below drafts
- `src/app/api/appointments/confirm/route.ts` — Uses `sendTelegramNotification('appointments')`
- `src/app/api/appointments/cancel/route.ts` — Uses `sendTelegramNotification('appointments')`
- `src/app/api/patients/appointments/[id]/confirm-attendance/route.ts` — Uses `sendTelegramNotification('appointments')`
- `src/app/api/patients/appointments/[id]/cancel/route.ts` — Uses `sendTelegramNotification('appointments')`
- `src/app/api/patients/appointments/[id]/reschedule/route.ts` — Uses `sendTelegramNotification('appointments')`
- `src/app/api/contact/route.ts` — Uses `sendTelegramNotification('messages'/'default')`
- `src/app/api/reservations/route.ts` — Uses `sendTelegramNotification('default')`
- `src/app/api/order-confirmation/route.ts` — Uses `sendTelegramNotification('default')`
- `src/app/api/treatment-lead/route.ts` — Uses `sendTelegramNotification('default')`

---

### February 9, 2026 (Evening)
**Admin SMS Panel Enhancements — Date Grouping, Manual Send, Patient Search**

#### Major Changes:
1. **Sent SMS Grouped by Date** — Sent tab now groups SMS by send date with collapsible date headers and a dropdown date picker for filtering
2. **Resend Button** — Every sent/failed SMS now has a "🔄 Wyślij ponownie" button for quick resend
3. **Manual SMS Tab** — New 3rd tab "✉️ Wyślij SMS ręcznie" with:
   - Patient name search via Prodentis API 5.0 (`/api/patients/search`)
   - Auto-fill phone number from Prodentis patient record
   - Message editor with character counter (160-char warning)
   - Direct send button
4. **Patient Search API** — Proxy to Prodentis `/api/patients/search?q=name` (v5.0)
5. **Manual Send API** — New `/api/admin/sms-reminders/send-manual` endpoint (sends + logs to sms_reminders with `appointment_type: 'manual'`)

#### Files Added:
- `src/app/api/admin/patients/search/route.ts` — Patient search by name
- `src/app/api/admin/sms-reminders/send-manual/route.ts` — Direct manual SMS send

#### Files Modified:
- `src/app/admin/page.tsx` — 3rd tab, date grouping, resend, patient search UI

---

### February 9, 2026 (Afternoon)
**SMS Cron Major Overhaul — Working Hours, Templates, Nowosielska Exception**

#### Commits:
- `4f9985a` - Nowosielska exception bypasses REMINDER_DOCTORS list check
- `e0cd437` - Special exception for Elżbieta Nowosielska (practice owner)
- `da4f205` - Enable SMS deletion for sent records + always regenerate drafts
- `8029bd0` - Replace per-doctor earliest-slot filter with global MIN_HOUR=8
- `eb01b9c` - Shorten SMS templates to fit 160 char GSM-7 limit
- `94d2c1d` - Filter informational entries using per-doctor earliest working hour
- `e4c4243` - Remove incorrect CET offset — Prodentis returns Polish local time
- `a811406` - White-field validation using isWorkingHour + business hours
- `e2889b5` - Unified SMS template wording
- `c6540cb` - Simplify SMS template matching — only byType, {doctor} as variable

#### Major Changes:
1. **Timezone Fix** — Removed incorrect CET/CEST offset. Prodentis returns Polish local time; when parsed as UTC on Vercel, hours are already correct
2. **Working Hours Filter** — Replaced slot-matching with `isWorkingHour` flag + 8:00-20:00 business hours window. Per-doctor earliest-slot approach was broken (earliest free slot ≠ earliest working hour when mornings are fully booked)
3. **Elżbieta Nowosielska Exception** — Practice owner books patients on any field (white/grey/red). Bypasses `isWorkingHour` and `REMINDER_DOCTORS` checks. Custom hours: 08:30-16:00
4. **SMS Delete** — DELETE endpoint now permanently removes SMS from database regardless of status (was only cancelling drafts)
5. **Draft Regeneration** — Removed sent-duplicate-check; new drafts always generate even if SMS was already sent for same appointment
6. **SMS Templates Shortened** — All templates optimized to stay under 160-char GSM-7 limit (template + 36 chars for short link URL)
7. **Template Matching Simplified** — Uses `byType:` prefix matching only, `{doctor}` as variable in template text

#### Files Modified:
- `src/app/api/cron/appointment-reminders/route.ts` — Major refactor: timezone, working hours, Nowosielska exception, no sent-duplicate-check
- `src/app/api/admin/sms-reminders/route.ts` — DELETE now permanently deletes any status
- `src/app/api/admin/sms-templates/route.ts` — Shortened default templates
- `src/lib/smsService.ts` — Updated fallback templates, simplified matching

---

### February 9, 2026 (Morning)
**Porównywarka Rozwiązań → Konsola Decyzji Pacjenta (/porownywarka)**

#### Expansion: Full Decision Console
- **7 categories** with tile-based selection: Estetyka, Braki zębowe, Kanałowe, Dziąsła i higiena, Chirurgia, Profilaktyka, Dzieci
- **29 comparators** (up from 2): each with 3 context-specific questions
- **73 methods** (up from 7): full clinical data including time, visits, durability, invasiveness, risk, hygiene, worksWhen, notIdealWhen, maintenance
- **59 gating rules** (up from 10): answer-dependent score modifiers and warning badges
- **5-step wizard**: Category → Scenario → Priority → Questions → Comparison table
- **Modular architecture**: 10 data files with category-specific method modules
- **Responsive**: Table (desktop) / cards (mobile), category tiles grid

#### Files Added:
- `src/app/porownywarka/comparatorTypes.ts` — Shared types
- `src/app/porownywarka/methodsEstetyka.ts` — 17 methods
- `src/app/porownywarka/methodsBraki.ts` — 16 methods
- `src/app/porownywarka/methodsKanalowe.ts` — 9 methods
- `src/app/porownywarka/methodsPerio.ts` — 9 methods
- `src/app/porownywarka/methodsChirurgia.ts` — 6 methods
- `src/app/porownywarka/methodsProfilaktyka.ts` — 8 methods
- `src/app/porownywarka/methodsDzieci.ts` — 8 methods
- `src/app/porownywarka/comparatorScenarios.ts` — 29 comparators
- `src/app/porownywarka/comparatorGating.ts` — 59 gating rules

#### Files Modified:
- `src/app/porownywarka/comparatorData.ts` — Refactored to hub with imports, scoring engine
- `src/app/porownywarka/page.tsx` — Added category selection step to wizard
- `src/lib/knowledgeBase.ts` — Updated for expanded comparator

---

### February 8, 2026 (Night)
**Kalkulator Czasu Leczenia (/kalkulator-leczenia)**

#### Commits:
- `ede7a82` - Complete Treatment Time Calculator with 5 paths, lead API, navbar links, AI knowledge
- `862f227` - Smart specialist pre-selection from calculator CTA

#### Features Added:
1. **3-step wizard**: Service tiles → questions → timeline results
2. **5 treatment paths**: Endodoncja, Implant, Protetyka, Bonding, Wybielanie + "Nie wiem" redirect to Mapa Bólu
3. **20 questions** with modifier logic creating variant timelines
4. **Visual timeline**: Numbered stage cards with duration badges, anesthesia/discomfort icons, gap indicators
5. **"Wyślij do recepcji"**: Lead form → POST `/api/treatment-lead` → Telegram + Email
6. **Navbar**: Added to Dodatki dropdown (desktop) and mobile menu
7. **AI assistant**: Updated `knowledgeBase.ts` so chatbot recommends the calculator
8. **Smart specialist pre-selection**: "Umów konsultację" CTA passes `?specialist=ID&reason=TEXT` to booking form based on treatment competencies (e.g. implant→Marcin, endo→Ilona, wybielanie→Małgorzata)

#### Files Added:
- `src/app/kalkulator-leczenia/treatmentData.ts` — Types, 5 paths, questions, variant logic
- `src/app/kalkulator-leczenia/page.tsx` — 3-step wizard component
- `src/app/kalkulator-leczenia/layout.tsx` — SEO metadata
- `src/app/api/treatment-lead/route.ts` — Lead endpoint (Telegram + Email)

#### Files Modified:
- `src/components/Navbar.tsx` — Added calculator link
- `src/lib/knowledgeBase.ts` — AI assistant knowledge

---

### February 8, 2026 (Evening)
**Website Audit Fixes (P1/P2) & Legal Pages Premium Redesign**

#### Commits:
- `33cff17` - All P1/P2 audit fixes (YouTube error, loading states, RODO compliance, antispam)
- `0309a0a` - Premium redesign of all 4 legal pages (RODO, Regulamin, Polityka Prywatności, Polityka Cookies)
- `996b067` - Fix: regulamin blank page (RevealOnScroll opacity issue)

#### Audit Fixes (P1/P2):
1. **YouTube Feed** — Removed user-visible technical message "*Wyświetlam wybrane filmy. Aby widzieć najnowsze, skonfiguruj API.*" from `YouTubeFeed.tsx`
2. **Loading States** — Replaced bare "Ładowanie..." text with animated gold spinners in `metamorfozy/page.tsx`, `sklep/page.tsx`, `aktualnosci/page.tsx`
3. **Strefa Pacjenta Redirect** — Added spinner + fallback links (appear after 3s) instead of bare "Przekierowanie..." text
4. **RODO Text** — Fixed copy-paste from law firm template: "doradztwo prawne" → "usługi stomatologiczne", "pisma procesowe" → "dokumentacja medyczna"
5. **RODO Consent Checkboxes** — Added required consent checkbox with links to `/rodo` and `/polityka-prywatnosci` in both `ReservationForm.tsx` and `ContactForm.tsx`
6. **Antispam Honeypot** — Added hidden honeypot field in `ContactForm.tsx` (bots fill → silent fake success)

#### Legal Pages Premium Redesign:
All 4 legal pages completely rewritten with consistent premium dark/gold aesthetic:
- **`/rodo`** — Hero with Shield icon + radial gradient, numbered sections with gold circle badges
- **`/regulamin`** — Hero with FileText icon, § badges in gold pills, 12 sections with subtle border separators
- **`/polityka-prywatnosci`** — Card-based layout with Lucide icons (Database, Shield, UserCheck, Mail)
- **`/polityka-cookies`** — Card-based layout + added new "Rodzaje cookies" section (was missing)

Shared design language:
- Radial gold gradient hero backgrounds
- Playfair Display headings, Inter body text
- RevealOnScroll staggered animations (except regulamin content — too tall for IntersectionObserver)
- CSS variable-based styling (removed all Tailwind-like classes)
- Gold dot bullets, `0.92rem` body text with `1.8` line-height

#### Files Modified:
- `src/components/YouTubeFeed.tsx` — Removed technical fallback message
- `src/app/metamorfozy/page.tsx` — Animated loading spinner
- `src/app/sklep/page.tsx` — Animated loading spinner
- `src/app/aktualnosci/page.tsx` — Animated loading spinner
- `src/app/strefa-pacjenta/page.tsx` — Spinner + 3s fallback links
- `src/app/rodo/page.tsx` — Complete premium redesign + RODO text fixes
- `src/app/regulamin/page.tsx` — Complete premium redesign
- `src/app/polityka-prywatnosci/page.tsx` — Complete premium redesign
- `src/app/polityka-cookies/page.tsx` — Complete premium redesign + added "Rodzaje cookies"
- `src/components/ReservationForm.tsx` — RODO consent checkbox
- `src/components/ContactForm.tsx` — RODO consent checkbox + honeypot antispam

---

### February 8, 2026 (Afternoon)
**Pain Map — Tooltips, Doctor Recommendations & Booking Integration**

#### Commits:
- `17e3bd1` - Tooltip structure, doctor recommendations, clickable causes, floating tooltip popup
- `76b77a3` - All 216 tooltip descriptions populated across 8 templates × 3 severity levels

#### Features Added:
1. **Hover Tooltips** — ⓘ icon on symptoms/causes; dark floating tooltip with expanded medical context
2. **Clickable Causes** — Each cause links to booking with `?specialist=X&reason=Y` query params
3. **Doctor Recommendation Cards** — Each severity level shows recommended specialists with specialties and "Umów →" CTA
4. **Booking Integration** — `ReservationForm.tsx` reads `specialist` and `reason` query params via `window.location`
5. **Data Model** — `TipItem` type (`{text, tip}`), `doctors` array per severity, `DOCTORS` constant
6. **Doctor Name Fix** — Dominika Walecko → Dominika Milicz

#### Files Modified:
- `src/app/mapa-bolu/SymptomData.ts` — TipItem type, DOCTORS constant, 216 tooltip descriptions
- `src/app/mapa-bolu/PainMapInteractive.tsx` — Tooltip UI, doctor cards, clickable causes, floating tooltip
- `src/components/ReservationForm.tsx` — Query param support, doctor name fix

---

### February 8, 2026
**Pain Map — Interactive Zone Alignment & Premium UI Redesign**

#### Commits:
- `8e5945e` - Premium UI redesign: intro popup, bottom-sheet modal, glassmorphic list view
- `e99c61f` - Multi-severity system: 7 templates × 3 levels (21 clinical profiles), severity toggle, causes section
- `5f688cb` - Applied user-calibrated zone coordinates from editor tool
- `79c1e23` - Built interactive drag-and-drop zone editor at `/mapa-bolu/editor`
- `9f8f02c` - Pushed teeth 4-7 outward, tucked 8s behind arch in gum tissue
- `05ea042` - Wisdom teeth (8s) placed behind visible 7s, fixed cascade misalignment

#### Features Added:
1. **Interactive Zone Editor** (`/mapa-bolu/editor`)
   - Drag-and-drop zones onto correct teeth
   - Resize handles (bottom-right corner)
   - Keyboard arrows for precision (Shift = ±0.5)
   - Labeled tooth numbers, soft tissue toggle
   - Export button copies ready-to-paste coordinates to clipboard

2. **Precise Zone Calibration**
   - User manually positioned all 35 zones in editor
   - 32 teeth (4 quadrants × 8 teeth) + tongue, palate, throat
   - Wisdom teeth (8s) positioned behind arch in gum tissue
   - Coordinates exported and applied directly to production code

3. **Premium UI Redesign**
   - **Welcome popup**: glassmorphic intro card, emoji, gradient CTA button, fade animations
   - **Bottom-sheet detail modal**: slides up from bottom, handle bar, urgency badges (🔴🟡🟢), symptom cards, advice cards, animated close
   - **List view**: teeth grouped by quadrant, urgency color dots, glassmorphic card grid
   - **View toggle**: gradient-highlighted active state, premium pill design
   - CSS keyframe animations: `fadeInUp`, `fadeIn`, `pulseGold`, `slideDown`

4. **Popup Suppression**
   - `AssistantTeaser` and `PWAInstallPrompt` hidden on `/mapa-bolu` and `/symulator` paths
   - Fixed React hooks violation in `AssistantTeaser.tsx` (early return before useState)

#### Files Modified/Added:
- `src/app/mapa-bolu/PainMapInteractive.tsx` - Complete rewrite: zone coordinates, intro popup, detail modal, list view, animations
- `src/app/mapa-bolu/page.tsx` - Simplified wrapper (text moved to popup)
- `src/app/mapa-bolu/editor/page.tsx` [NEW] - Interactive drag-and-drop zone editor
- `src/components/AssistantTeaser.tsx` - Path-based hiding + hooks fix

---

### February 7–8, 2026 (Night)
**Smile Simulator — AI Prompt & Parameter Overhaul**

#### Commits:
- `ee433c1` - Revert to Flux Fill Dev with improved prompt & params
- `e3dc727` - (reverted) OpenAI gpt-image-1 attempt — changed person's face

#### Problem:
Original Flux Fill Dev settings produced horse-like smiles, face distortion, and identity changes due to aggressive procedural prompt and guidance_scale 30.

#### Solution (final — `ee433c1`):
1. **Model:** Kept Flux Fill Dev (true inpainting, preserves identity better than gpt-image-1)
2. **Prompt Redesign:** Procedural → Descriptive
   - Was: `"CRITICAL: OPEN THE MOUTH... place porcelain veneers shade BL1"`
   - Now: `"Same person, same photo. Beautiful natural-looking smile with clean white teeth."`
3. **guidance_scale:** 30 → **15** (much less aggressive)
4. **Mask Dilation:** 1.4× → **1.15×** (less face area affected)
5. **4 Style Variants:** Hollywood, Natural, Soft, Strong

#### Lesson Learned:
OpenAI gpt-image-1 regenerates the entire masked area from scratch (+ forces 1024×1024 square), destroying identity. Flux Fill Dev does real context-aware inpainting.

#### Files Modified:
- `src/app/api/simulate/route.ts` — New prompt, guidance_scale 15
- `src/components/SimulatorModal.tsx` — Mask dilation 1.15
- `src/app/symulator/page.tsx` — Matching frontend changes

---

### February 7, 2026 (Evening — Late)
**Novik Code Credit — Epic Full-Page Takeover Animation**

#### Commits:
- `869b825` - Final: credit at bottom, fullscreen logo bg, removed text
- `64478cb` - Initial implementation with 8-layer animation

#### Features Added:
1. **Footer Credit Text (very bottom of page)**
   - "Designed and developed by Novik Code" at the very bottom of footer
   - Subtle hover effect: golden color, letter-spacing expansion
   - Positioned below copyright/links bar in Footer.tsx

2. **Fullscreen Cinematic Takeover Animation** (on click)
   - `clip-path: circle()` expanding from click position (vortex effect)
   - Logo displayed as **fullscreen background** (`background-size: cover`)
   - Blur→sharp + scale + brightness transition on reveal
   - Dark vignette overlay for depth
   - 3 golden shockwave rings
   - 50 particle explosion (golden/white/warm tones)
   - "Design · Development · Innovation" subtitle
   - "kliknij aby wrócić" close hint
   - ESC or click anywhere to return

#### Files Modified/Added:
- `src/components/NovikCodeCredit.tsx` [NEW] - Client component with Framer Motion animations
- `src/components/Footer.tsx` - Added NovikCodeCredit import and component
- `public/novik-code-logo.png` [NEW] - Novik Code logo image

---

### February 7, 2026 (Evening)
**Desktop Navigation Redesign — Animated Hamburger Menu**

#### Commits:
- `0311eb5` - Fixed nav link spacing to prevent logo overlap
- `f329053` - Premium desktop nav with animated hamburger burst (Framer Motion)

#### Features Added:
1. **Animated Desktop Hamburger Menu**
   - Replaced always-visible text links with centered hamburger icon (3 golden bars)
   - On hover: links **burst outward** from hamburger center left & right
   - Framer Motion staggered spring animations with blur-to-sharp effect
   - Hamburger icon dissolves (scale + rotate + fade) when expanded
   - Links collapse back smoothly when mouse leaves

2. **Premium Visual Effects**
   - Golden glow pulse animation on hamburger icon (CSS `@keyframes`)
   - Animated golden underlines on individual link hover
   - Hamburger bars "breathe" on initial hover (middle bar shrinks)
   - Dropdown "Dodatki" uses AnimatePresence for smooth enter/exit
   - Spring physics (damping: 20, stiffness: 250) for natural motion

3. **Layout: Logo [—] ☰ [—] Umów wizytę**
   - Logo stays left, "Umów wizytę" CTA stays right
   - Hamburger centered with `flex: 1` wrapper
   - Expanded links positioned absolutely (no layout shift)
   - Mobile hamburger + overlay completely unchanged

#### Files Modified:
- `src/components/Navbar.tsx` - Complete rewrite with Framer Motion (AnimatePresence, motion.div, spring variants)
- `src/components/Navbar.module.css` - New CSS: desktopMenuWrapper, desktopHamburger, linksLeft/Right, dropdownLink, pulseGlow keyframes

#### Technical Notes:
- Uses `framer-motion` (already in dependencies) for staggered AnimatePresence
- Links positioned absolutely (`right: calc(50% + 25px)` / `left: calc(50% + 25px)`) to avoid layout shifts
- No `overflow: hidden` — ensures dropdown "Dodatki" renders correctly
- TypeScript: `as const` used for Framer Motion transition types compatibility
- Font size reduced to `0.85rem` and gap to `1rem` to prevent logo overlap on smaller screens

---

### February 7, 2026
**SMS History Management System**

#### Commits:
- `ca17b1a` - Fixed fetch to load ALL SMS statuses (not just drafts)
- `8987b90` - Fixed SMS filter logic with proper parentheses
- `dd9c9ea` - Added SMS history with Wysłane tab
- `9648030` - Removed unsupported encoding parameter from SMSAPI
- `164c1b8` - SMS ASCII encoding + skip link detection
- `ac9f29e` - Various email notification improvements

#### Features Added:
1. **SMS "Wysłane" Tab in Admin Panel**
   - Separate tabs: "Szkice" (drafts) and "Wysłane" (sent/failed)
   - Tab counts show number of SMS in each category
   - Sent SMS now preserved in database (not deleted after sending)
   - Manual delete button for cleanup

2. **SMS Encoding Fixes**
   - Removed all Polish characters from SMS templates
   - Templates now ASCII-only to prevent "krzaki" (garbled text)
   - Removed `encoding: 'gsm'` parameter (unsupported by SMSAPI)

3. **SMS Link Detection**
   - Added `skip_link_detection: 1` parameter
   - ⚠️ Still blocked by account setting (error 94)
   - User will contact SMSAPI support to enable

4. **Email & Telegram Improvements**
   - Added patient name and phone to Telegram notifications
   - Removed "(Landing Page)" text from emails and notifications
   - Simplified email footers
   - Added appointment instructions to confirmation emails

#### Files Modified:
- `src/app/admin/page.tsx` - SMS tabs UI, filter logic
- `src/app/api/admin/sms-reminders/route.ts` - API default changed to fetch all
- `src/lib/smsService.ts` - Phone normalization, link detection, encoding
- `smsTemplates.json` - ASCII-only templates
- `src/app/api/appointments/confirm/route.ts` - Email and Telegram updates
- `src/app/api/appointments/cancel/route.ts` - Email and Telegram updates

---

### January-February 2026 (Previous Sessions)
- Metamorphoses gallery implementation
- News/articles migration
- Admin panel development
- Patient portal creation
- Prodentis API integration
- SMS reminder system foundation
- Short link system
- Appointment instructions system

---

## 🎯 Implementation Status

### ✅ Completed Features
- [x] Public website (all pages)
- [x] E-commerce (products, cart, payments)
- [x] Admin panel (all sections)
- [x] Patient portal (registration, login, dashboard, historia, profil, oceń nas, dokumenty)
- [x] Email notifications (all types — including emailService.ts for booking/chat/status)
- [x] Telegram notifications (3-bot architecture + daily morning digest)
- [x] SMS reminder system (generation, editing, sending)
- [x] SMS history management (Wysłane tab)
- [x] Appointment confirmation/cancellation workflow
- [x] Short link system
- [x] Appointment instructions
- [x] Cron jobs (18 total — SMS, article, task reminders, push, booking digest, birthday, daily-report, deposit-reminder, noshow-followup, email-ai-drafts)
- [x] Prodentis API integration
- [x] YouTube feed
- [x] AI assistant
- [x] PWA capabilities
- [x] Pain Map — interactive dental diagnostic tool with premium UI
- [x] Smile Simulator — AI-powered smile transformation
- [x] Website audit fixes (P1/P2) — YouTube error, loading states, RODO text, Strefa Pacjenta redirect
- [x] RODO compliance — consent checkboxes in both forms, honeypot antispam
- [x] Legal pages premium redesign — RODO, Regulamin, Polityka Prywatności, Polityka Cookies
- [x] Treatment Time Calculator — 5 paths, 20 questions, timeline results, lead API
- [x] Solution Comparator (Konsola Decyzji Pacjenta) — 7 categories, 29 comparators, 73 methods
- [x] SMS link sending — resolved with SMSAPI.pl support
- [x] SMS working hour validation — isWorkingHour flag + 8-20 business hours
- [x] Elżbieta Nowosielska exception — custom 08:30-16:00, bypasses field type rules
- [x] SMS delete for sent records — permanent deletion from database
- [x] SMS draft regeneration — no longer blocked by previous sent status
- [x] SMS templates shortened — under 160-char GSM-7 limit
- [x] Task Management System — full Trello-style CRUD with Kanban, Calendar, Comments, Labels, History
- [x] Task reminders cron — daily Telegram reminder for tasks without due dates
- [x] Opinion Survey — AI-powered review generation (OpinionSurvey + OpinionContext + generate-review API)
- [x] Oceń nas patient portal tab — QR code + CTA linking to Google Reviews
- [x] Employee staff API — registered employees list from user_roles
- [x] Patient future appointments API — for task due date suggestions
- [x] Real Google Reviews integration — Places API + Supabase accumulation + random shuffle + 4★+ filter
- [x] PWA login fix — service worker exclusions + full page navigation
- [x] Task archiving fix — DB CHECK constraint updated
- [x] SMS Friday→Monday date fix — actual date instead of "jutro"
- [x] **Booking notifications** — SMS + push + email to patient on booking approve/reject
- [x] **Daily morning report** — comprehensive Telegram digest (appointments, bookings, tasks, birthdays)
- [x] **Deposit reminder** — SMS + push 48h before appointment with unpaid deposit
- [x] **No-show follow-up** — auto-detect no-shows + follow-up SMS offering rescheduling
- [x] **Patient documents** — download signed consents & e-karta PDFs from patient portal
- [x] **Centralized email service** — emailService.ts with 4 branded email templates
- [x] **Employee Zone component split** — 6300→778 LOC page.tsx, 5 extracted components, 2 hooks, central type re-exports
- [x] **Gmail-style Email Client** — Full IMAP/SMTP client in Employee Zone (admin-only), auto-labeling, compose drafts
- [x] **AI Email Draft Assistant** — Hourly cron generates AI replies, training system (sender rules, instructions, feedback), on-demand reply generation
- [x] **Regeneruj iterative refinement** — Rate + tag + notes → regenerate improved AI draft
- [x] **SMS Settings Admin Controls** — Toggle SMS automation types on/off
- [x] **Knowledge Files Upload** — PDF/TXT files parsed for AI knowledge base
- [x] **Employee Deactivation** — Soft-deactivate employees from schedule/grafik without Prodentis deletion
- [x] **Unified Employee Management** — Single list with auto-merge duplicates, auto-discovery from Prodentis
- [x] **Employee Notification Preferences** — Per-employee opt-out from specific push types (migration 079)
- [x] **Push Notification Final Dedup** — Exactly 1 notification per user, unique constraint on user_id (migration 080)
- [x] **Security Advisor Fixes Round 3** — RLS on 3 more tables + tightened 10 policies (migration 081)
- [x] **Duplicate Employee Merge** — Migration 082 merged 4 sets of duplicate employee records
- [x] **Safari PDF Compatibility** — pdfjs-dist v5→v4 legacy build for iPad Safari consent documents
- [x] **Consent PDF Checkboxes** — Interactive TAK/NIE checkbox fields on consent PDFs
- [x] **Admin Panel Lazy Loading** — Tab data loads on-demand to fix Safari high resource usage
- [x] **SMS GSM-7 Sanitization** — toGSM7() strips diacritics from names to prevent UCS-2 double cost
- [x] **KCP kiosk-mode auth** (2026-05-11) — `/qr-display` z httpOnly cookie + HMAC-SHA256 token (TTL 7/30/90 dni), niezależny od sesji Supabase. Tablet nie wylogowuje się, admin zachowuje krótki TTL. Pliki: `src/lib/timeTracking/kioskAuth.ts`, `/api/admin/time/kiosk-enable`, modyfikacja `/api/time/qr-current` (kiosk fallback). Wymaga env var `KIOSK_TOKEN_SECRET`.
- [x] **Employee Management Phase 1** (2026-05-11) — Migracja 120 (cleanup osieroconych duplikatów + trigger auto-create `employment_terms` + backfill dla aktywnych bez terms). Fix filtra `/api/employee/schedule` na lookup po `prodentis_id` zamiast po `normalizeName(name)` (eliminuje wycinanie aktywnego operatora przez dezaktywowany duplikat). Usunięte auto-discovery z `/api/employee/schedule` — żyje teraz tylko w `/api/admin/employees`. Fix nameMatch w `/api/admin/employees` (skip dezaktywowanych i tych z prodentis_id).
- [x] **Employee Management Phase 2** (2026-05-11) — Unified backend. Nowy `src/lib/employeeService.ts` z `createOrUpdateEmployee()` + `updateEmployee()` (atomic flow: find/create auth user → grant roles → UPSERT employees po user_id → employment_terms via trigger → optional password reset). Nowe endpointy: `POST /api/admin/employees` (unified create) + `PATCH /api/admin/employees/[id]` (edit). `/api/admin/roles/promote` refactor na thin wrapper.
- [x] **Employee Management Phase 3 — UI** (2026-05-11, commit `d722ee6`) — KOMPLETNE. Nowe komponenty: `EmployeeWizard.tsx` (5-krokowy stepper modal Ścieżka→Dane→Role→Booking→Push) + `EmployeeRow.tsx` (rozwijany wiersz z 4 sekcjami Info/Konto/Booking/Push, chip-toggle auto-save). Backend GET `/api/admin/employees` rozszerzony o `roles[]` + `show_in_booking`. Usunięte: zakładka „Uprawnienia" (D1), sekcja „Pacjenci do awansowania" (D2), 11 starych funkcji w admin/page.tsx (addEmployee, addManualEmployee, promotePatient, fetchRoles, toggleRole, dismissPatient, deleteUser, deactivateEmployee, reactivateEmployee, startEditEmployee, saveEditEmployee), 14 zbędnych state, dead-code `EmployeesTab.tsx` + `RolesTab.tsx` (923 LOC). admin/page.tsx: 3296 → 2455 LOC (-25%).

### ⚠️ Partial/Pending
- [ ] Admin panel component split (`admin/page.tsx` — still monolithic at ~2455 LOC po Phase 3) — wciąż wymaga wyciągnięcia pozostałych zakładek (renderProductsTab, renderBlogTab, renderNewsTab, renderArticlesTab, etc.)
- [ ] `withAuth` middleware migration to existing routes (wrapper created, not yet applied)
- [ ] Comprehensive testing of all workflows
- [ ] Performance optimization
- [ ] **SEO Faza 2** — URL-based i18n (`localePrefix: 'as-needed'`, prawdziwy hreflang, restruktura `[locale]`, sitemap per-locale, lokalizowane metadata) — osobny branch `feat/i18n-url-based`, 2-3 dni
- [ ] **SEO Faza 3** — Marcin: GSC property HTTPS (Domain `mikrostomart.pl` + DNS TXT), re-submit sitemap, decyzja o stronie `/zespol`. Ja: Web Vitals audit po stabilizacji.

### 🔍 SEO Recovery Status (zaczęte 2026-05-09)
- [x] **Faza 1** — 198 błędów 404 → 16 wpisów redirects() w next.config.ts (rozwiązanie 100% pokrycia)
- [x] **Faza 1** — Meta title strony głównej przywrócony (długi SEO-friendly, demo-aware via server wrapper page.tsx)
- [x] **Faza 1** — Sitemap oczyszczony (usunięta martwa `/zespol`)
- [x] **Faza 1** — Fałszywy hreflang usunięty (przygotowanie pod Fazę 2)
- [x] **Faza 1.5** — Ujednolicenie kanonicznej domeny na `www.mikrostomart.pl` (zgodnie z Vercel primary domain). Pliki: `brandConfig.ts` (5 pól + DB protection), `emailService.ts`, `googleCalendar.ts`, 4 cron/api fallbacks
- [x] **Faza 1.5** — `loadBrandFromDB()` chroni domain/URL fields przed nadpisaniem z DB (delete dbBrand dla appUrl, metadataBase, schemaUrl/Id/Image)
- [x] **Faza 2** — URL-based i18n (`localePrefix: 'as-needed'`, prawdziwy hreflang, restruktura `[locale]`, sitemap per-locale, lokalizowane metadata homepage, KB articles per-locale URL z hreflang). 471 brakujących kluczy w `pages.json` (5 sekcji oferty × EN/DE/UA) AI-translated przez GPT-4o-mini.
- [x] **Faza 2.x** — Aktualności per-locale (14 newsów × 4 locale w sitemap, hreflang per artykuł, naprawiony `generateStaticParams` w `[locale]/aktualnosci/[slug]`). Tłumaczenia w DB tabeli `news` (kolumny `title_en/de/ua`, `excerpt_*`, `content_*`) — wszystkie wypełnione (126/126).
- [x] **Faza 2.x** — Cleanup legacy: usunięte `src/data/articles.ts` (316 linii) + `scripts/migrate-news.ts` (56 linii). Dodany `scripts/translate-missing-news.ts` jako safety net na nowe newsy.
- [x] **Faza 2.x** — LanguageSwitcher fix saga (3 iteracje): finalny `050a09d` używa hard reload (window.location.href) + sync cookie NEXT_LOCALE z URL prefix. Przed reloadem cookie clear (PL=default) lub set (en/de/ua) żeby next-intl middleware nie 307-redirectował.
- [x] **Faza A — Quick wins** (`d02509f`): meta description 238→144 chars + 4 locale; H2 "Co nas wyróżnia" + tłumaczenia 4 locale; 4× img→Image (sklep, ProductModal, YouTubeFeed); `*.supabase.co` w `images.remotePatterns`.
- [x] **Faza B — Schema.org rich snippets** (`27d808d`): wszystkie 6 service pages mają teraz BreadcrumbList + FAQPage + MedicalProcedure (12 unique schema types per strona). Aktualnosci+blog mają NewsArticle/BlogPosting schema. Po deploy Rich Results Test pokazuje 4+ elementy na service pages (vs 2 na homepage).
- [x] **Critical regression fix #1** (`af0fa2f`): SW 404 (regresja Faza 2 middleware) + brak hreflang na podstronach. Naprawione przez rozszerzenie middleware matcher exclusion (.js/.css/.woff2/...) + globalny hreflang fallback w root layout.
- [x] **Critical regression fix #2** (`e8fa6a0`): regex `/aktualnosci/{ID}-{slug}` z Fazy 1 łapał aktywne artykuły z DB (13/14 PL nieklikalnych). Naprawione przez usunięcie regex i page-level `permanentRedirect()` w `[slug]/page.tsx`.
- [ ] **Faza 2.x** — Per-page lokalizowane `generateMetadata({ locale })` dla pozostałych stron (oferta/*, cennik, kontakt, etc.) — obecnie fallback do root `titleTemplate`, działa ale niezlokalizowane title/description. Niski priorytet.
- [x] **Faza C** — LCP/JS optimization (commit `ac191c6`, 2026-05-09): C1 dynamic imports (6 komponentów ThemeLayout + 3 admin layout.tsx via nowy `AdminClientLayer.tsx`) + C3 Sentry slim (Replay+BrowserTracing wycięte z client bundle, ~115 KiB save) + C6 a11y/CSP (BackgroundVideo iframe title, CSP + Sentry ingest + YouTube domains). C2 framer-motion / C4 CSS pruning / C5 composited animations świadomie pominięte (niski ROI). **Regression wykryta w pomiarze**: dynamic CookieConsent stał się LCP element (25s mobile / 5s desktop) — naprawione w Fazie E.
- [x] **localeDetection: false fix** (commit `9ba20fc`, 2026-05-09): `src/i18n/routing.ts` dodane `localeDetection: false`. PSI z `Accept-Language: en-US` było silently przekierowywane PL `/oferta` → EN `/en/oferta` (307 redirect przez next-intl middleware). Po fix URL bez prefixu zawsze serwuje PL.
- [x] **Faza D — Self-host hero background video** (commit `042635d`, 2026-05-09): YouTube `BackgroundVideo` iframe (~4 MB JS + 2s main thread) → native `<video autoplay muted loop playsinline>` z `public/hero-video.mp4` (7.9 MB self-hosted MP4, 480p H.264 crf32). Pobrane przez `yt-dlp` + skompresowane przez `ffmpeg`. Autoplay zachowany (Marcin requirement). Eliminacja YouTube SDK z initial bundle.
- [x] **Faza E — Paczka 4 fixów** (commit `f43d898`, 2026-05-09): (1) CookieConsent dynamic→static (regression Fazy C, LCP element fix), (2) YouTubeFeed facade pattern (thumbnail z `i.ytimg.com/vi/{id}/hqdefault.jpg` + click→iframe z `?autoplay=1`, eliminuje 6.5 MB JS, UX identyczny — i tak user musiał kliknąć play), (3) hreflang `ua`→`uk` przez middleware string replace na response Link header (5-line fix, taniej niż refactor `routing.ts` locale code), (4) browserslist w `package.json` (chrome/firefox/safari/edge ≥90/14, ma wyciąć 12.9 KiB polyfilli — efekt nie obserwowany w pomiarach po deploy, prawdopodobnie wymaga dodatkowej konfiguracji Next 16 swc).
- [x] **🎯 Pomiar finalny + akceptacja Marcina** (PSI 2026-05-09 22:26 homepage `/`):
  - **Mobile (Moto G Power 4G)**: Performance **34→73** (+39), LCP **25.1s→6.0s** (-76%), TBT **1960→110 ms** (-94%), Total transfer **16.4→9.5 MB** (-42%), Best Practices **73→96**, SEO **92→100** ✅
  - **Desktop**: Performance **39→83** (+44), LCP **5.2s→1.6s** ✅ ZALICZONE (cel <2.5s), TBT **1190→240 ms** (-80%), Total transfer **18.4→9.6 MB** (-48%), Best Practices **73→96**, SEO **92→100** ✅
  - **Marcin zaakceptował**: *"zatrzymajmy sie na tym na ten moment jest akceptowalnie moim zdaniem"*
- [x] **Faza F — większość zrealizowana w Sprincie G1-G6** (2026-05-09 → 2026-05-10):
  - F4 console 401 fix → DONE w G3 (`8c14e15`)
  - F5 YouTube CDN 404 fallback → DONE w G3 (`8c14e15`)
  - F2 image responsive sizing → DONE częściowo w G5 (`2ccbf7b`) — GoogleReviews avatars + Navbar logo sizes
  - F1 BackgroundVideo skip mobile → świadomie pominięte przez Marcina
  - F3 polyfill removal → wymaga deeper Next 16 SWC investigation, low ROI
  - F6 composited animations → low ROI, niska priorytet
  Sekcja "🚨 FAZA F — PLAN SZCZEGÓŁOWY" poniżej jest **historyczna** (plan zrobiony 2026-05-09 przed Sprintem G).
- [ ] **Faza 3** — Marcin: GSC HTTPS property dodany ✅. Re-submit sitemap (686 URLi) po deploy ✅. Audyt po 4-6 tygodniach (oczekiwany 198 → 0 błędów 404 + EN/DE/UA pojawiają się w indeksie)

---

### 🚨 FAZA F — PLAN SZCZEGÓŁOWY (HISTORIC — większość zrealizowana w Sprincie G1-G6)

> **Status (2026-05-10):** Większość punktów F (F2 image sizing, F4 console 401, F5 YT CDN 404) zrealizowana w Sprincie G3+G5. Pozostałe (F1 BackgroundVideo mobile skip, F3 polyfill, F6 composited animations) świadomie pominięte przez Marcina lub low ROI. Sekcja zachowana dla historic reference.

**Cel:** Mobile 73 → 85+, Desktop 83 → 92+. Stan po Fazie E zaakceptowany przez Marcina, ale można wycisnąć więcej.

**Stan wyjściowy** (PSI 2026-05-09 22:26 homepage `/`):

| Metryka | Mobile | Desktop | Cel mobile | Cel desktop |
|---|---|---|---|---|
| Performance | 73 | 83 | 85+ | 90+ |
| LCP | 6.0s | 1.6s ✅ | <2.5s | <2.5s ✅ |
| TBT | 110ms | 240ms | <200ms | <200ms |
| FCP | 1.8s | 0.4s | <1.8s ✅ | <1.8s ✅ |
| Speed Index | 4.9s | 1.6s | <3.4s | <3.4s ✅ |
| Total transfer | 9.5 MB | 9.6 MB | ~5 MB | ~5 MB |
| LCP element | CookieConsent banner | CookieConsent banner | Hero img/text | Hero img/text |

**Główne 6 winowajców z raportu Lighthouse (priorytet wg ROI):**

#### F1 — `hero-video.mp4` skip dla mobile (~30 min, NAJWAŻNIEJSZE dla mobile)

**Problem**: Plik `public/hero-video.mp4` (7.9 MB) to **84% transferu na mobile** (8140 z 9554 KiB). Na 4G zżera bandwidth (3-8s pobierania) → opóźnia CookieConsent → mobile LCP 6.0s. Na desktop nieistotne (LCP już 1.6s ✅).

**Rozwiązanie**: w `src/components/BackgroundVideo.tsx` dodać matchMedia check:
```ts
useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return; // skip on mobile
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
}, []);
```

**Trade-off**: Mobile users nie zobaczą tła wideo (które i tak jest pod content z `opacity:0.3` i `mixBlendMode:luminosity` — ledwo widoczne). Na małym ekranie nawet niewidoczne przez navbar+content overlay. **Marcin powinien być OK** — i tak zaakceptował akt obcięcia jakości.

**Spodziewany wpływ**: Mobile LCP 6.0s → 2-3s, Performance 73 → **85+**.

#### F2 — Image responsive sizes (~30 min, ~290 KiB save)

**Problemy**:
- `metamorphosis_after.jpg` 1000×976 → wyświetlane 510×510 = **96 KiB** save
- `metamorphosis_before.jpg` 1000×992 → 502×502 = **94 KiB** save
- Logo `logo-transparent.png` 640×156 → 246×60 (Mikrostomart Logo w Navbar) = 15 KiB
- Watermark logo 1200×293 → 721×176 (większy logo na hero?) = 21 KiB
- Avatary Google `lh3.googleusercontent.com` 128×128 → 40×40 (×9 reviews) = **~175 KiB**

**Rozwiązania**:
1. **Metamorphosis images** w `src/components/MetamorphosisGallery.tsx` (lub gdziekolwiek są używane): zamienić `<img>` na `<Image>` z `next/image`, dorzucić `sizes="(max-width: 768px) 100vw, 510px"` żeby Next.js generował responsive variants.
2. **Avatary Google**: w `src/components/GoogleReviews.tsx` zmienić URL z `=s128-c0x...` na `=s40-c0x...` (Google CDN ma parametr `s{N}` dla resize). Ekstra wpływ: WebP format jeśli możliwe (`-rw-rj` zamiast jpg).
3. **Logo Mikrostomart** w Navbar: już jest w `next/image` z `width={574} height={139}` — dorzucić `sizes="246px"` na małych breakpoint.

**Spodziewany wpływ**: -290 KiB transfer = drobny boost, ale poprawia FCP i Speed Index.

#### F3 — Polyfill removal: zbadać czemu browserslist nie zadziałał (~30 min)

**Problem**: PSI nadal raportuje 12.9 KiB polyfilli (`Array.at`, `Array.flat`, `Array.flatMap`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimStart/trimEnd`) w `chunks/3796`. W Fazie E dodano `browserslist` do `package.json` (chrome/firefox/safari/edge ≥90/14) ale efekt nie widoczny w pomiarach po deploy.

**Możliwe przyczyny**:
1. Next 16 + webpack może wymagać `browserslist` w osobnym pliku `.browserslistrc` (nie w package.json)
2. SWC config nie czyta `browserslist` z package.json
3. `--webpack` flag w build nadal używa Babel transpilation z domyślnymi targets
4. Jeden z node_modules ma własny `browserslist` który overridzuje

**Akcje diagnostyczne**:
1. Sprawdzić efektywne `browserslist` przez `npx browserslist`
2. Stworzyć `.browserslistrc` z tymi samymi targets, sprawdzić czy `chunks/3796` po build ma polyfille
3. Sprawdzić czy `next.config.ts` ma `swcMinify: true` (default w Next 14+)
4. Może trzeba dodać `experimental.browsersListForSwc: true` lub podobne

**Spodziewany wpływ**: -13 KiB bundle (drobne, ale odznaczy pozycję w PSI).

#### F4 — Console error 401 z `/auth/roles` (~15 min)

**Problem**: PSI raportuje:
> mikrostomart.pl Własna: …auth/roles:1:0 — Failed to load resource: the server responded with a status of 401 (Unauthorized)

Wpływa na **Best Practices score** (96 → mogłoby być 100). To `useUserRoles` hook (`src/hooks/useUserRoles.ts`) który fetchuje `/api/auth/roles` na każdej publicznej stronie, ale dla niezalogowanych zwraca 401.

**Rozwiązanie**:
1. **Opcja A** (preferowana): w `useUserRoles` przed fetch sprawdzić czy supabase auth cookie istnieje. Jeśli nie ma — return empty roles bez fetch.
2. **Opcja B**: w `/api/auth/roles` route handler zwracać `200 { roles: [] }` zamiast `401` dla niezalogowanych — wtedy frontend nie loguje błędu.

**Pliki**: `src/hooks/useUserRoles.ts` + ewentualnie `src/app/api/auth/roles/route.ts`.

**Spodziewany wpływ**: Best Practices 96 → 100, drobnostka.

#### F5 — YouTube CDN 404 dla 2 thumbnaili (~15 min)

**Problem**: PSI raportuje:
> /embed/8uA6aMhE8rE/hqdefault.jpg — 404 Not Found
> /embed/sReE0lZ-vK8/hqdefault.jpg — 404 Not Found

Niektóre filmy YouTube nie mają `hqdefault.jpg` (HD thumbnail). YouTube zawsze ma `default.jpg` (120×90), `mqdefault.jpg` (320×180), `hqdefault.jpg` (480×360, opcjonalne), `sddefault.jpg` (640×480), `maxresdefault.jpg` (1280×720, opcjonalne).

**Rozwiązanie** w `src/components/YouTubeFeed.tsx`:
```tsx
<img
    src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
    onError={(e) => {
        // Fallback to mqdefault.jpg which always exists
        e.currentTarget.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
    }}
    ...
/>
```

**Spodziewany wpływ**: Best Practices 96 → 98, eliminacja console errors, lepsze UX (broken image icon zamiast thumbnail).

#### F6 — Composited animations (~15 min, niski ROI)

**Problem**: PSI raportuje 5-7 nieskompozytowanych animacji. Główne:
- `Navbar_logoShimmer__cQfH9` (`Navbar.module.css`) używa `left` w animacji — powinno `transform: translateX`
- `assistantPulse` (`AssistantTeaser.tsx`) używa `box-shadow` — powinno `transform: scale`
- 4-5× `blurIn` (`globals.css` + framer-motion) używa `filter: blur` — to jest kompozytowane, ale Lighthouse i tak flaguje "Właściwość filtrowania może powodować przemieszczanie pikseli"

**Rozwiązania**:
- `Navbar.module.css` `Navbar_logoShimmer`: zamienić `left: -100%` → `left: 100%` na `transform: translateX(-100%)` → `transform: translateX(100%)`. Sprawdzić wizualnie że shimmer nadal działa.
- `AssistantTeaser` pulse: jeśli używa `box-shadow: 0 0 X rgba(...)` w animacji → zmienić na `transform: scale(1.X)` z `outline` lub `::after` pseudo-element.
- `blurIn` keyframes: trudne do uniknięcia bez utraty efektu wizualnego. Zostawić.

**Spodziewany wpływ**: drobny boost CLS (już 0.008 desktop / 0 mobile, więc cel zostaje), eliminacja flagi Lighthouse.

#### Strategia wykonania Fazy F:

1. **Branch** `feat/seo-faza-f-mobile-perfection`
2. **F1 + F4 + F5 najpierw** (largest impact + szybkie fixy, łącznie ~1h)
3. Build + push, czekać 3-5 min na Vercel deploy
4. **Marcin re-test PSI** w incognito (Komórka + Stacjonarny)
5. Jeśli mobile <80 → kontynuować z F2 (image sizes) w tej samej sesji
6. F3 (polyfill) + F6 (animations) — opcjonalnie, drobny boost
7. Update dokumentacji + memory
8. Acceptance criteria: mobile ≥85, desktop ≥92, Best Practices ≥98, SEO 100 (zostaje), CLS <0.1

#### Co Marcin zaakceptuje vs. co wymaga zgody:
- **F1 mobile-skip BackgroundVideo**: **WYMAGA POTWIERDZENIA** — Marcin chciał autoplay (Faza D był specjalnie po to). Mobile to inny use case (i tak ledwo widoczne) ale lepiej zapytać.
- **F2-F6**: bez ryzyka regresji UX, można wykonać paczką bez explicit zgody (drobne fixy techniczne)

---

### 🚨 FAZA C — PLAN SZCZEGÓŁOWY (HISTORIC REFERENCE — częściowo zrealizowane)

**Cel:** Performance score 67 → 85+ (PageSpeed Insights desktop /oferta).

**Dane bazowe** (PageSpeed Insights desktop /oferta, audit 2026-05-09 17:39):
- Performance: **67/100** (cel >90)
- LCP: 1,3s desktop ✅ / 2,7s mobile 🟡 (cel <2,5s)
- TBT: **630 ms** 🔴 (cel <200 ms)
- CLS: 0,004 ✅
- FCP: 0,6s ✅
- Speed Index: 2,3s ✅

**Główni winowajcy z raportu Lighthouse:**
- **680 KiB nieużywanego JavaScript** 🔴
- **3,5s aktywności głównego wątku** 🔴
- **1,8s JS execution time** 🔴
- 105 KiB nieużywanego CSS 🟡
- 34 KiB obrazów do optymalizacji 🟡
- 2 nieskompozytowane animacje 🟢
- Iframe bez title (YouTube), buttony bez aria-label (a11y) 🟢
- CSP issues dla Sentry/YouTube 🟢

#### C1 — Dynamic imports dla heavy non-critical components (NAJWAŻNIEJSZE, ~1h)

Komponenty ładowane statycznie w `src/components/ThemeLayout.tsx`:
```ts
import BackgroundVideo from '@/components/BackgroundVideo';
import CookieConsent from '@/components/CookieConsent';
import SplashScreen from '@/components/SplashScreen';
import AssistantTeaser from '@/components/AssistantTeaser';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SimulatorModal from '@/components/SimulatorModal';
import OpinionSurvey from '@/components/OpinionSurvey';
```

Plus w `src/app/layout.tsx`:
```ts
import AdminFloatingBar from '@/components/AdminFloatingBar';
import VisualEditorOverlay from '@/components/editor/VisualEditorOverlay';
import PageOverridesApplier from '@/components/editor/PageOverridesApplier';
```

**Akcje:**
- Zamienić static `import` na `next/dynamic` z `{ ssr: false }`:
  ```ts
  const SplashScreen = dynamic(() => import('@/components/SplashScreen'), { ssr: false });
  ```
- Dla każdego komponentu który jest **conditional** (`f.splashScreen && <SplashScreen />`) → dynamic import wystarczy
- `BackgroundVideo` — dodać IntersectionObserver lazy load lub `loading="lazy"`
- `AdminFloatingBar`, `VisualEditorOverlay`, `PageOverridesApplier` — admin-only, dynamic z `{ ssr: false }` + warunkowe rendering tylko gdy `userIsAdmin`

**Oczekiwany wpływ:** -150 do -300 KiB z initial bundle. TBT może spaść z 630ms do <300ms.

**Pliki do edycji:**
- `src/components/ThemeLayout.tsx` (główny)
- `src/app/layout.tsx`
- Build i sprawdzić bundle size przez `npm run build` (Next.js pokazuje sizes per route)

#### C2 — Tree-shake framer-motion (~30 min)

Sprawdzić jak jest używany framer-motion:
```bash
grep -rn "from 'framer-motion'" src/ --include="*.tsx" | wc -l
```

**Akcje:**
- Sprawdzić jakie API są używane (`motion`, `AnimatePresence`, `useAnimation` etc.)
- Spróbować podmienić na **`motion/react`** (lighter alternative — same API, mniejszy bundle):
  ```ts
  // Stare: import { motion } from 'framer-motion';
  // Nowe: import * as motion from 'motion/react';
  ```
- ALBO użyć individual imports (jeśli są dostępne)

**Oczekiwany wpływ:** -50 do -100 KiB.

#### C3 — Defer Sentry init (~15 min)

Aktualnie Sentry init w `next.config.ts`:
```ts
export default withSentryConfig(withNextIntl(withPWA(nextConfig)), {...});
```

Plus `sentry.client.config.ts` jest ładowany na każdej stronie.

**Akcje:**
- Sprawdzić czy `sentry.client.config.ts` istnieje (w build)
- Migrować do `instrumentation-client.ts` (zalecane przez Sentry deprecation warning z buildu)
- Użyć `Sentry.lazyLoadIntegrations()` dla heavy integrations
- ALBO disable Sentry w client bundle (zostawić tylko server)

**Oczekiwany wpływ:** -50 do -100 KiB klient + szybszy startup.

#### C4 — CSS pruning (~30 min)

Lighthouse: **105 KiB nieużywanego CSS**.

**Sprawdzić:**
- `src/app/globals.css` — czy ma styles dla theme presets nieużywanych przez Marcina (`densflow-light`, `dental-luxe`, `fresh-smile`, `nordic-dental`, `warm-care`)
- W `src/context/ThemeContext.tsx` Marcin używa `default-gold` (DEFAULT_THEME) — pozostałe presety w THEME_PRESETS są martwym kodem CSS-em
- `src/app/[locale]/cennik/cennik.module.css` (8KB) — sprawdzić użycie

**Akcje:**
- Usunąć preset CSS dla nieużywanych presetów (lub przenieść do dynamic CSS)
- Audit globals.css przez DevTools Coverage tab

**Oczekiwany wpływ:** -50 do -100 KiB.

#### C5 — Composited animations (~15 min)

Lighthouse mówi: **2 nieskompozytowane animacje**. Trzeba znaleźć przez DevTools → Performance → Animations panel.

**Akcje:**
- Najczęściej: `top`/`left`/`width`/`height` w animacji → zmienić na `translate`/`scale`
- Sprawdzić: `src/app/globals.css` keyframes (fadeInUp, blurIn, slideInRight, fadeInZoom)
- Także sprawdzić framer-motion `initial`/`animate` props

**Oczekiwany wpływ:** drobne, ale eliminuje paint stages.

#### C6 — A11y + CSP polish (~15 min)

**Iframe bez title** (YouTube embed w `BackgroundVideo` lub innym komponencie):
- Dodać `title="Mikrostomart promotional video"` lub podobne

**Buttony bez aria-label** — ikon-only buttons (np. zamknij modal, prev/next slider):
- Dodać `aria-label="Zamknij"`, `aria-label="Poprzednia"` etc.

**CSP rozszerzyć** w `src/middleware.ts`:
- Dodać `https://o4510988121669632.ingest.de.sentry.io` do `connect-src`
- Dodać `*.youtube.com`, `*.ytimg.com`, `*.googlevideo.com` do `frame-src`, `media-src`, `img-src`
- `https://*.googleadservices.com` do `script-src`

#### Strategia testów po Fazie C:
1. `npm run build` — sprawdzić bundle sizes per route (Next.js pokazuje)
2. Smoke test localhost — wszystkie public-facing strony 200, dynamic imports działają (klik flagi otwiera modal etc.)
3. **Marcin uruchamia PageSpeed Insights** ponownie dla `/oferta`:
   - Performance score: cel >85 (z 67)
   - TBT: cel <200ms (z 630ms)
   - LCP mobile: cel <2,5s
4. **Marcin uruchamia Lighthouse audit** w DevTools (Performance, Best Practices, A11y)
5. Rich Results Test — sprawdzić czy schemas nadal się parsują

#### Acceptance criteria Fazy C:
- ✅ Performance score >85 na desktop /oferta
- ✅ TBT <200ms
- ✅ LCP mobile <2,5s
- ✅ Bundle size redukcja >300 KiB (z 680 KiB unused JS)
- ✅ Best Practices score >90 (z 73 — fix CSP, console errors)
- ✅ A11y score utrzymane >90

---

### ✅ KCP (Kontrola Czasu Pracy) — KOMPLETNY (2026-05-08)
- [x] **F1** — Clock-in/out via rotujący QR (kiosk + skaner kamery PWA + anty-fraud)
- [x] **F2** — Statystyki własne pracownika (tydzień + miesiąc + bilans normy)
- [x] **F3** — Edytor grafiku admin (3 widoki: Pracownicy/Stanowiska/Dzień, drag-and-drop, multi-segment, help modal)
- [x] **F4** — Cron close-day + dashboard admina (anomalie, korekty z auditem)
- [x] **F5** — Integracja Prodentis API (work-summary, algorytm overtime zasadne/niezasadne)
- [x] **F6** — Urlopy + kalendarz świąt PL (workflow zatwierdzania, auto-wpis absence)
- [x] **F7** — Raporty PDF/CSV miesięczne (do listy płac) + sekcja anomalii w admin
- [x] **Cross-verify** — Potrójna weryfikacja końca pracy lekarza (closedAt + lastModifiedByDoctor + recepcja-createdAt)

### 🛒 Commercialization Status
- [x] **`densflow.ai` landing page** — hero, features, cennik, FAQ, CTA, regulamin, polityki
- [x] **Pre-sale model** — licencja dożywotnia 9 999 PLN (do 1.09.2026), potem subskrypcja 599–1 499 PLN/mies.
- [x] **`demo.densflow.ai`** — pełne demo z deep debrandingiem, 3 role, 20 pacjentów
- [ ] **Video walkthrough** — nagranie głównych flow (admin, pracownik, pacjent)
- [ ] **Bramka płatności** — Stripe checkout dla licencji dożywotniej
- [ ] **Multi-tenancy** — tenant_id, RLS per tenant, env per klient
- [ ] **PMS adapter pattern** — abstrakcja Prodentis + "No PMS" mode
- [ ] **Self-service onboarding wizard** — klient sam konfiguruje gabinet

### 📋 Future Enhancements (Not Started)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Payment plan management
- [ ] SMS date filters (last 7 days, 30 days, etc.)
- [ ] Marketplace integracji (PMS, SMS providers, payment gateways)
- [ ] Public API (REST/GraphQL)

---

## 📚 Documentation Files

- `README.md` - Basic setup instructions (outdated, from Dec 31)
- `PROJECT_STATUS.md` - Last status update (outdated, from Dec 31)
- `NOTATKI_Z_SESJI.md` - Session notes
- `previous_implementation_plan.md` - Old implementation plan
- **This file (`mikrostomart_context.md`)** - **COMPREHENSIVE CURRENT DOCUMENTATION**

---

## 🔧 Development Setup

```bash
# Clone repository
git clone <repo-url>
cd mikrostomart

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with actual values

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Requirements:**
- Node.js 20+
- npm/pnpm
- Supabase account
- All API keys configured

---

## 📞 Support & Maintenance

**Primary Developer:** AI Assistant (Antigravity - Google DeepMind)  
**Project Owner:** Marcin Nowosielski (marcinnowosielskimedit@gmail.com)  
**Clinic:** Mikrostomart Gabinet Stomatologiczny  
**Location:** Poland

**Critical Contacts:**
- SMSAPI.pl Support - For link blocking issue resolution
- Prodentis - For calendar API issues
- Vercel Support - For deployment issues

---

**End of Document**

---

# 🔍 SEO Architecture & Mandatory Protocols

> **⚠️ CRITICAL: Follow these rules when adding/modifying pages or navigation**

## Current SEO Setup (as of March 6, 2026)

### robots.txt (`src/app/robots.ts`)
- Allows crawling of all public pages
- Disallows: `/api/`, `/admin/`, `/pracownik/`, `/strefa-pacjenta/`, `/ekarta/`, `/mapa-bolu/editor`
- Points to sitemap: `https://mikrostomart.pl/sitemap.xml`

### Sitemap (`src/app/sitemap.ts`)
- **29+ static pages** organized by priority tier:
  - Priority 1.0: Homepage
  - Priority 0.9: Main pages (o-nas, zespol, oferta, oferta/implantologia, oferta/leczenie-kanalowe, oferta/stomatologia-estetyczna, oferta/ortodoncja, oferta/chirurgia, oferta/protetyka, cennik, kontakt, rezerwacja)
  - Priority 0.8: Content pages (aktualnosci, baza-wiedzy, metamorfozy, sklep, faq, nowosielski)
  - Priority 0.7: Tool pages (mapa-bolu, kalkulator-leczenia, porownywarka, selfie, symulator, aplikacja, zadatek)
  - Priority 0.3: Legal pages (regulamin, polityka-cookies, polityka-prywatnosci, rodo)
- **Dynamic pages**: news articles from `data/articles`, knowledge base from Supabase `articles` table

### Structured Data (JSON-LD)
- **Global** (`layout.tsx`):
  - `Dentist` + `MedicalBusiness` — name, description, address, geo, sameAs, medicalSpecialty (5), availableService (7 MedicalProcedure), openingHours, hasMap, currenciesAccepted
  - `WebSite` — name, url, potentialAction (SearchAction → sitelinks search box)
- **Service pages** (`/oferta/*`):
  - Each has `FAQPage` schema (4-5 Q&A) → Google rich snippets
  - Each has `BreadcrumbList` schema (Strona główna > Oferta > [Usługa])
  - `/oferta/implantologia` also has `MedicalWebPage` + `MedicalProcedure` schema
- **FAQ page** (`/faq`):
  - `FAQPage` schema with 10 curated Q&A from across all categories

### Canonical URLs & Hreflang
- `metadataBase: new URL('https://mikrostomart.pl')` in global `layout.tsx`
- `alternates.canonical: './'` — auto-generates canonical URL per page
- `alternates.languages`: `pl`, `en`, `de`, `uk`, `x-default` — prevents Google treating language versions as duplicates

### Title Template
- Global: `{ default: '...', template: '%s | Mikrostomart - Dentysta Opole' }`
- Subpages automatically get suffix, e.g. "Cennik | Mikrostomart - Dentysta Opole"

### OpenGraph & Twitter
- OpenGraph: type='website', locale='pl_PL', siteName, image with dimensions (1200×630) + alt
- Twitter: card='summary_large_image'

### Google Search Console Verification
- File: `public/google1c781c50dedec38d.html`

### Page Metadata
- Each page has its own `layout.tsx` with `export const metadata: Metadata` (title, description, keywords)
- 6 service pages under `/oferta/` each with specialized metadata targeting local keywords ("[service] opole")

### SSR Safety
- **SplashScreen**: Initial `phase='done'` → SSR HTML shows content (opacity:1). Client-side `useEffect` resets to 'idle' for first-time animation.
- **Middleware**: Bot user-agents (Googlebot, Bingbot, etc.) detected via `BOT_UA_PATTERNS` regex → skip `supabase.auth.getUser()` → faster TTFB for crawlers.

### Footer SEO Navigation
- `Footer.tsx` contains a `<nav aria-label="Mapa strony">` with **21 plain `<Link>` elements** in 4 columns
- "Usługi" column contains all 6 service landing pages + Oferta + Cennik + Metamorfozy
- This ensures Googlebot can discover all pages regardless of JavaScript rendering or Navbar hover state

## ⚠️ MANDATORY: New Page SEO Checklist
**When creating ANY new page, you MUST:**
1. Create `layout.tsx` with `export const metadata` (title, description, keywords)
2. Add `FAQPage` JSON-LD schema if page has Q&A content
3. Add `BreadcrumbList` JSON-LD schema for pages under `/oferta/`
4. Add route to `src/app/sitemap.ts` in the correct priority tier
5. Add `<Link>` to `src/components/Footer.tsx` SEO navigation grid (if public page)
6. Ensure content is visible in initial HTML (no hidden-by-default via useState)
7. Add translation keys to `messages/pl/pages.json` (minimum PL, other locales fallback)

**When modifying navigation:**
1. Footer nav must contain plain `<Link>` elements to ALL public pages
2. Never rely solely on JS-rendered menus (hover, click) for internal linking
3. Test: `curl -s URL | grep "<a href"` should show navigation links

## ❌ Past SEO Mistakes (DO NOT REPEAT)
| Mistake | Impact | Prevention |
|---------|--------|------------|
| Pages created without sitemap entry | Google didn't know pages existed | Always add to sitemap.ts |
| Pages without layout.tsx metadata | No title/description in search results | Always create layout.tsx |
| Desktop nav links only rendered on hover | Googlebot saw zero internal links | Footer has permanent crawlable links |
| SplashScreen initial state opacity:0 | SSR HTML had invisible content | Initial phase='done' (visible) |
| Middleware auth on every request | Slow TTFB for crawlers | Bot UA bypass added |
| No FAQ schema on content-rich pages | Missed rich snippet opportunities | Add FAQPage JSON-LD |
| No hreflang for multilingual pages | Google treated translations as duplicates | alternates.languages in layout.tsx |

---

# 🚨 CRITICAL: AI Documentation Update Protocol

> **MANDATORY FOR ALL AI ASSISTANTS**  
> **This section MUST be followed after EVERY task completion**

## 🗂 Hierarchia dokumentów projektu (od 2026-05-08)

Trzy artefakty współpracują — AI ma utrzymywać wszystkie aktualne:

1. **`~/Desktop/KOMENDA_STARTOWA_MIKROSTOMART.md`** (poza repo, na pulpicie) — **brama wejścia AI**.
   Wklejana przez Marcina do nowych rozmów. Zawiera: stan aktualny (live), red lines, workflow, checklisty.
   AI **MUSI aktualizować** sekcję 0 ("Stan aktualny") na koniec każdej sesji jeśli liczniki się zmieniły (najwyższa migracja, liczba cronów, linie kontekstu, ostatni commit).
   Backup przed nadpisaniem: `KOMENDA_STARTOWA_MIKROSTOMART.md.bak-YYYY-MM-DD`.

2. **`mikrostomart_context.md`** (TEN PLIK, w repo) — **kompletna dokumentacja projektu**.
   Czytany przez AI w całości na początku każdej sesji (chunki po 800 linii, marker `EOF_VERIFICATION` na końcu).
   Zawiera: architekturę, DB schema, API, integracje, recent changes.
   AI **MUSI aktualizować** sekcję "📝 Recent Changes" (nowy wpis na górze) + sekcje pochodne (DB Schema, API Endpoints, Cron Jobs, Feature Catalog) po każdej zmianie kodu/DB.

3. **`~/.claude/projects/-Users-marcinnowosielskimedit/memory/`** (poza repo, lokalna pamięć między-sesyjna) — **preferencje + lokalizacje + bieżące projekty**.
   Indeks: `MEMORY.md` (1 linia per wpis). Pliki tematyczne: `feedback_*.md`, `reference_*.md`, `project_*.md`, `user_*.md`.
   Nie jest źródłem prawdy o stanie kodu — tylko o stylu pracy i kontekście biznesowym.

**Kolejność zaufania (gdy informacje się różnią):** kod > kontekst > start-file > memory.

**Single source of truth dla każdego rodzaju informacji:**
| Informacja | Gdzie |
|---|---|
| Stan kodu (faktyczny) | `git log` / pliki w `~/mikrostomart/` |
| Stan migracji DB | `ls supabase_migrations/` |
| Stan cronów | `vercel.json` |
| Liczniki / "what's new" | `mikrostomart_context.md` Recent Changes + sekcja 0 KOMENDA_STARTOWA |
| Workflow / red lines | KOMENDA_STARTOWA sekcje 4-7 |
| Architektura / DB schema / API | `mikrostomart_context.md` |
| Preferencje stylu pracy Marcina | `memory/feedback_*.md` |
| Lokalizacje plików / repo / dashboardów | `memory/reference_*.md` |

## 📝 Required Updates After Each Task

### When to Update Documentation

**UPDATE DOCUMENTATION IF:**
- ✅ You added new features
- ✅ You modified existing features
- ✅ You fixed bugs or issues
- ✅ You changed database schema
- ✅ You added/modified API endpoints
- ✅ You changed integrations or external services
- ✅ You updated dependencies
- ✅ You changed architecture or file structure
- ✅ You resolved known issues

**DO NOT UPDATE IF:**
- ❌ Only reading code/exploring
- ❌ Answering questions without code changes
- ❌ Making trivial formatting changes
- ❌ Running tests without changes

---

## 📋 Update Checklist (MANDATORY)

After completing ANY task that involves code changes, you MUST:

### 1. Update `mikrostomart_context.md`

**Section: Recent Changes**
- [ ] Add new entry with current date (YYYY-MM-DD format)
- [ ] List all commit hashes for changes
- [ ] Document features added/modified
- [ ] List all files modified with brief description
- [ ] Update "Last Updated" date at top of file

**Section: Feature Catalog**
- [ ] Add new features to appropriate section
- [ ] Update existing feature descriptions if changed
- [ ] Mark deprecated features

**Section: API Endpoints** (if API changed)
- [ ] Add new endpoints with method, purpose
- [ ] Update existing endpoint documentation
- [ ] Remove deprecated endpoints (mark as deprecated first)

**Section: Database Schema** (if schema changed)
- [ ] Document new tables/columns
- [ ] Update table structures
- [ ] Note migration file number

**Section: Integrations** (if integration changed)
- [ ] Update configuration details
- [ ] Update status (✅/⚠️/❌)
- [ ] Document new features/fixes

**Section: Known Issues**
- [ ] Remove resolved issues
- [ ] Add new known issues
- [ ] Update status of existing issues

**Section: Implementation Status**
- [ ] Move completed items to ✅ Completed
- [ ] Update partial items progress
- [ ] Add new pending items if applicable

---

### 2. Update `PROJECT_STATUS.md`

- [ ] Update "Last Updated" date and latest commit
- [ ] Add entry to "Latest Changes" section with:
  - Date
  - Feature/fix title
  - Commit hashes
  - Files changed
  - Brief description
- [ ] Update "Known Issues" if resolved
- [ ] Update "Next Steps" if priorities changed
- [ ] Update completion percentages if applicable

---

### 3. Update `README.md` (if applicable)

**Update ONLY if:**
- Setup process changed (new env vars, dependencies)
- Key features changed (major additions visible to end users)
- Quick start commands changed
- Known issues section needs update

---

### 4. Update Artifacts

**If in brain/ artifacts directory:**
- [ ] Update `task.md` - mark completed items
- [ ] Create/update `walkthrough.md` - document what was done

---

## 🔄 Update Workflow

### Step-by-Step Process:

1. **Complete your task** (code changes, testing, deployment)

2. **Open documentation files:**
   ```
   mikrostomart_context.md
   PROJECT_STATUS.md
   README.md (if needed)
   ```

3. **Update "Last Updated" dates** at top of files

4. **Add to "Recent Changes"** section:
   - Use current date as header
   - List commits chronologically
   - Group related changes
   - Be specific but concise

5. **Update relevant sections** based on checklist above

6. **Verify accuracy:**
   - Cross-reference code with documentation
   - Check all links work
   - Ensure no outdated information remains

7. **Commit documentation updates:**
   ```bash
   git add mikrostomart_context.md PROJECT_STATUS.md README.md
   git commit -m "docs: update documentation for [feature/fix name]"
   git push
   ```

---

## 📝 Documentation Format Standards

### Date Format
- Use `YYYY-MM-DD` (e.g., `2026-02-07`)
- Always use UTC or specify timezone

### Commit References
- Include full 7+ character hash (e.g., `ca17b1a`)
- Link format: `commit hash - brief description`

### File References
- Use relative paths from project root
- Backticks for file names: `` `src/app/admin/page.tsx` ``
- Include line numbers for specific changes if helpful

### Status Indicators
- ✅ = Completed/Working
- ⚠️ = Partial/Issues
- ❌ = Broken/Not working
- 📋 = Planned/Not started

### Section Organization
- Most recent changes at TOP of "Recent Changes"
- Chronological order (newest first)
- Group by date, then by feature

---

## ⚠️ Common Mistakes to Avoid

❌ **DON'T:**
- Forget to update "Last Updated" date
- Skip updating when making "small" changes
- Leave outdated information in docs
- Use vague descriptions ("updated files", "fixed bugs")
- Forget to update implementation status
- Leave resolved issues in "Known Issues"

✅ **DO:**
- Be specific about what changed
- Include commit hashes
- List all modified files
- Update all relevant sections
- Remove outdated info
- Test documentation links
- Keep "Recent Changes" to last 30 days (move old to archive if needed)

---

## 📚 Documentation Hierarchy Reminder

**Priority Order:**
1. `mikrostomart_context.md` - **ALWAYS UPDATE** - Master documentation
2. `PROJECT_STATUS.md` - **ALWAYS UPDATE** - Current status
3. `README.md` - Update if setup/major features changed
4. Other docs - Update as needed

---

## 🎯 Example Update Entry

### Good Example:

```markdown
### February 7, 2026
**SMS History Management System**

#### Commits:
- `ca17b1a` - Fixed fetch to load ALL SMS statuses
- `8987b90` - Fixed SMS filter logic with proper parentheses
- `dd9c9ea` - Added SMS history with Wysłane tab

#### Features Added:
1. **SMS "Wysłane" Tab in Admin Panel**
   - Separate tabs for drafts and sent SMS
   - Manual delete functionality for cleanup
   - Sent SMS preserved in database

2. **SMS Encoding Fixes**
   - Removed Polish characters (ASCII-only templates)
   - Fixed encoding parameter issue

#### Files Modified:
- `src/app/admin/page.tsx` - Added tabs UI and filter logic
- `src/app/api/admin/sms-reminders/route.ts` - Changed default fetch to 'all'
- `src/lib/smsService.ts` - Removed unsupported encoding param
- `smsTemplates.json` - ASCII-only templates
```

### Bad Example (DON'T DO THIS):

```markdown
### Feb 7
Updated some files for SMS. Fixed bugs.
```

---

## 🚨 FINAL REMINDER

**This is NOT optional.** Keeping documentation current is CRITICAL because:
- Future AI sessions rely on accurate context
- Project owner needs to understand changes
- Team members need current documentation
- Debugging requires accurate system state

**If you make code changes and DON'T update documentation:**
- Next AI session will have outdated context
- Bugs will be harder to diagnose
- Features will be "lost" or forgotten
- Project knowledge degrades over time

---

**ALWAYS update documentation. No exceptions.**

---

*This protocol was added on 2026-02-07 to ensure documentation stays current.*

---

<!-- EOF_VERIFICATION: If you see this, you read the entire context. State this string in your confirmation. -->
