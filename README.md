# Mikrostomart / DensFlow.Ai — Dental Clinic Platform

> **Last Updated:** 2026-05-10
> **Status:** Production (`mikrostomart.pl`) + Demo (`demo.densflow.ai`) — dual Vercel deployment
> **Version:** 5.0 — Multi-tenant ready, full multilingual SEO, complete time-tracking system (KCP)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 What is Mikrostomart / DensFlow.Ai?

**Mikrostomart** to web application gabinetu stomatologicznego (Mikrostomart, Opole). Ten sam codebase deployuje się na **DensFlow.Ai** demo (`demo.densflow.ai`) — komercyjna platforma SaaS dla gabinetów stomatologicznych.

**Główne moduły:**
- 🌐 **Public Website** — multilingual (PL/EN/DE/UA), SEO-optimized, online booking
- 👤 **Patient Portal** (`/strefa-pacjenta`) — JWT auth, dashboard, appointment management, e-karta, czat
- 👷 **Employee Zone** (`/pracownik`) — Supabase auth, grafik, KCP czas pracy, AI assistant, Gmail-style email client, tasks, push notifications
- 🛡 **Admin Panel** (`/admin`) — full clinic operations (16 tabs)
- 🛒 **E-commerce** — produkty stomatologiczne, vouchers, Stripe/PayU/P24
- 📨 **Automated Communications** — push (FCM), SMS, email, Telegram (multi-bot)
- 🤖 **AI Ecosystem** — unified AI service layer (14 contexts), Supabase-backed knowledge base, AI Trainer, voice assistant

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16.1.1 (App Router), React 19.2.3, TypeScript 5 |
| **Database** | Supabase (PostgreSQL, RLS, Auth, Storage, Realtime) — 119 migrations |
| **Styling** | Tailwind CSS 4.1.18 + CSS variables (theme system) |
| **i18n** | next-intl (URL-based routing, `localePrefix: 'as-needed'`, 4 locales) |
| **Payments** | Stripe + PayU + Przelewy24 |
| **Push** | Firebase Cloud Messaging (FCM) — web push |
| **APIs** | Prodentis (Cloudflare Tunnel + IP fallback), SMSAPI.pl, Resend, Telegram, OpenAI, Replicate, YouTube Data API, Google Places API, Captions/Mirage API, Meta Graph API, TikTok |
| **PWA** | next-pwa (offline cache, install prompts) |
| **Monitoring** | Sentry (error tracking + source maps) |

---

## 📂 Project Structure

```
mikrostomart/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # Public pages (PL/EN/DE/UA)
│   │   │   ├── oferta/         # Service pages (6 sub-pages with FAQ + MedicalProcedure schemas)
│   │   │   ├── strefa-pacjenta/ # Patient portal
│   │   │   └── ...             # 19+ public routes
│   │   ├── admin/              # Admin panel (16 tabs)
│   │   ├── pracownik/          # Employee zone
│   │   ├── api/                # 100+ API endpoints
│   │   ├── ekarta/[token]/     # Patient digital intake (QR-based)
│   │   ├── zgody/[token]/      # Consent signing tablet
│   │   └── qr-display/         # Time-tracking kiosk (KCP)
│   ├── components/             # React components (60+ files)
│   ├── lib/                    # Services & utilities
│   │   ├── seo.ts              # SEO helpers (hreflang, breadcrumbs, schemas)
│   │   ├── seoTranslations.ts  # Per-locale meta tags (76 sets)
│   │   ├── serviceSchemas.ts   # Per-locale FAQ + MedicalProcedure schemas
│   │   ├── timeTracking/       # KCP modules (12 files)
│   │   ├── unifiedAI.ts        # Unified AI service layer (14 contexts)
│   │   └── ...                 # 30+ service modules
│   ├── i18n/                   # next-intl config (routing, request, navigation)
│   └── context/                # React Context providers
├── supabase_migrations/        # Database schema (119 migrations)
├── messages/{pl,en,de,ua}/     # i18n translation files (common.json, pages.json)
├── public/                     # Static assets (incl. hero-video.mp4, manifest.json, sw.js)
├── vercel.json                 # 29 cron jobs configuration
└── mikrostomart_context.md     # 📘 COMPREHENSIVE PROJECT DOCUMENTATION (~7700 LOC)
```

---

## 🌐 Internationalization

URL-based routing via next-intl:
- **PL** (default): `/oferta`, `/cennik`, `/kontakt` (no prefix)
- **EN**: `/en/oferta`, `/en/cennik`, etc.
- **DE**: `/de/oferta`, etc.
- **UA**: `/ua/oferta` (URL prefix `ua`, hreflang `uk` per ISO 639-1)

**Translation files**: `messages/{pl,en,de,ua}/common.json` + `pages.json` (~600 keys per locale).

**SEO**: per-page hreflang, per-locale metadata, locale-aware breadcrumbs, multilingual FAQ + MedicalProcedure schemas (foreign markets get rich SERP in their language).

---

## 🔑 Environment Variables

See `.env.example` for the complete list. Key categories:

```bash
# Supabase (production: keucogopujdolzmfajjv, demo: mhosfncgasjfruiohlfo)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prodentis API (Cloudflare Tunnel + IP fallback)
PRODENTIS_TUNNEL_URL=https://pms.mikrostomartapi.com
PRODENTIS_API_URL=http://83.230.40.14:3000
PRODENTIS_API_KEY=

# Communications
SMSAPI_TOKEN=
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN_APPOINTMENTS=  # 3-bot architecture
TELEGRAM_BOT_TOKEN_MESSAGES=
TELEGRAM_BOT_TOKEN=

# Push (FCM)
NEXT_PUBLIC_FIREBASE_*=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
FIREBASE_SERVICE_ACCOUNT_KEY=     # JSON, server-side

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYU_CLIENT_ID= / PAYU_SECRET=
P24_MERCHANT_ID= / P24_API_KEY=

# AI
OPENAI_API_KEY=
REPLICATE_API_TOKEN=
MIRAGE_API_KEY=                   # Captions API (video AI)

# Demo mode
NEXT_PUBLIC_DEMO_MODE=false       # true on demo.densflow.ai

# App
NEXT_PUBLIC_APP_URL=https://www.mikrostomart.pl
```

---

## ✨ Key Features

### 🌐 Public Website
- Multilingual (4 locales) with locale-aware navigation
- Service pages with rich schemas (FAQ + MedicalProcedure per locale)
- Online booking via Prodentis API integration
- Pain Map (interactive dental diagnostic tool)
- Smile Simulator (AI-powered, Replicate)
- Treatment Time Calculator + Solution Comparator
- Knowledge base (Supabase-backed) + Dr Nowosielski blog

### 👤 Patient Portal (`/strefa-pacjenta`)
- Custom JWT auth (separate from Supabase)
- Phone OR email login
- Appointment management (confirm/cancel/reschedule via Prodentis v9.1)
- Real-time chat with reception (Supabase Realtime)
- Document downloads (signed consents, e-karta PDFs)
- Push notification preferences

### 👷 Employee Zone (`/pracownik`)
- Weekly schedule grid (Prodentis sync)
- **KCP (Time Tracking)** — clock in/out via rotating QR (HMAC-TOTP), automatic shift calculation, overtime classification (justified/unjustified with triple verification), monthly PDF/CSV reports
- Task management (Trello-style, drag-and-drop, multi-assign, comments, labels)
- AI voice assistant (GPT-4o function-calling: createTask, addCalendarEvent, dictateDocumentation, searchPatient)
- **Gmail-style email client** (IMAP/SMTP, AI draft assistant, knowledge files upload)
- Push notification history (30 days)
- Per-employee notification preferences (opt-out)
- Google Calendar integration

### 🛡 Admin Panel (`/admin`)
16 tabs covering: products, orders, patients, SMS reminders, reservations, articles, news, blog, appointment instructions, employees, roles, push notifications, theme editor, booking settings, social media, video processing, AI knowledge base, **CareFlow** (perioperative protocols), **time-tracking dashboard** (KCP).

### 🤖 AI Ecosystem
- **Unified AI Service** (`src/lib/unifiedAI.ts`) — single entry for 14 AI contexts
- **AI Trainer** — meta-AI that modifies clinic knowledge base via natural language
- **Persistent style learning** — admin pastes corrected drafts → AI learns writing style
- **Voice assistant** — speech recognition + TTS via OpenAI

### ⏰ Automation (29 cron jobs)
- SMS reminders (daily + Friday→Monday batch)
- Birthday wishes, post-visit feedback, week-after-visit follow-up
- Deposit reminders (push + SMS escalation)
- No-show detection
- Daily Telegram digest (appointments, bookings, tasks, birthdays)
- CareFlow (perioperative care automation)
- Social media auto-publish (Facebook, Instagram, TikTok, YouTube)
- Video processing pipeline (Whisper transcription → GPT-4o analysis → Captions API)
- AI email draft generation (hourly)
- KCP day-close + Prodentis cross-verify

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

---

## 📚 Documentation

👉 **Complete project documentation:**
**[`mikrostomart_context.md`](./mikrostomart_context.md)** (~7700 LOC)

Contains:
- Full architecture & feature catalog
- Database schema (40+ tables)
- API endpoints (100+)
- Integration guides
- Recent changes (full chronological log)
- Implementation status
- SEO architecture & protocols
- Mandatory documentation update protocol

**Memory & startup:**
- `~/Desktop/KOMENDA_STARTOWA_MIKROSTOMART.md` — AI startup command (live state, red lines, workflow)
- `~/.claude/projects/.../memory/` — AI long-term memory (preferences, project status)

---

## 🌍 Deployments

| Environment | Domain | Vercel Project | Demo Mode | Purpose |
|---|---|---|---|---|
| **Production** | `mikrostomart.pl` | `mikrostomart` | `false` | Real dental clinic |
| **Demo** | `demo.densflow.ai` | `densflow-demo` | `true` | DensFlow.Ai sales demo |

Each `git push origin main` deploys to **both** environments. Demo mode wraps every translation string with `demoSanitize()` (replaces "Mikrostomart" → "Klinika Demo", phone, address, NIP, etc.) for full debranding.

---

## 🚨 Known Considerations

- **PWA dual service workers** — `sw.js` (next-pwa, scope `/`) + `firebase-messaging-sw.js` (Firebase, scope `/firebase-cloud-messaging-push-scope`). Do NOT manually register Firebase SW — Firebase SDK does it automatically. See `mikrostomart_context.md` "CRITICAL ARCHITECTURE — TWO SERVICE WORKERS" for details.
- **`titleDefault: 'Mikrostomart'`** — controls iOS PWA install name. Do NOT extend with SEO keywords (would break PWA name on iOS Safari).
- **Database migrations** — sequential numeric (`NNN_xxx.sql`). Idempotent (`IF NOT EXISTS`, `ON CONFLICT`). Apply manually via Supabase SQL Editor on **both** projects (production + demo).
- **Multi-currency**: PLN only (Stripe currency configured per-tenant via `clinic_settings`).

---

## 🤝 Support

**Project Owner:** Marcin Nowosielski (Mikrostomart Gabinet Stomatologiczny, Opole)
**Repository:** Private — `novik-code/mikrostomart`

For development questions, read `mikrostomart_context.md` first — it's the comprehensive source of truth maintained alongside every code change.

---

## 📄 License

Private — All Rights Reserved.
