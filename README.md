# Mikrostomart - Dental Clinic Web Application

> **Last Updated:** February 7, 2026  
> **Status:** Production (Vercel)  
> **Version:** 4.0 - Full-Featured Clinic Management System

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

## 📋 What is Mikrostomart?

A comprehensive web application for **Mikrostomart G abinet Stomatologiczny** (dental clinic in Poland) featuring:

✅ **Public Website** - Marketing, services showcase, booking  
✅ **Patient Portal** - Appointment management, medical history  
✅ **Admin Panel** - Complete clinic operations management  
✅ **E-commerce** - Dental products shop with Stripe payments  
✅ **Automated Communications** - SMS/Email reminders & notifications  
✅ **AI Assistant** - OpenAI-powered chat support  

---

## 🛠 Technology Stack

- **Framework:** Next.js 16.1.1 (App Router), React 19, TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 4.1.18
- **Payments:** Stripe
- **APIs:** Prodentis (appointments), SMSAPI.pl (SMS), Resend (email), Telegram (notifications)
- **AI:** OpenAI (chat), Replicate (images), MediaPipe (face detection)

---

## 📂 Project Structure

```
mikrostomart/
├── src/
│   ├── app/              # Next.js pages & API routes
│   │   ├── admin/        # Admin panel
│   │   ├── strefa-pacjenta/  # Patient portal
│   │   ├── api/          # 21 API directories
│   │   └── ...           # Public pages (sklep, oferta, kontakt, etc.)
│   ├── components/       # React components (37 files)
│   ├── lib/              # Services & utilities (9 files)
│   └── context/          # React Context providers
├── supabase_migrations/  # Database schema (11 migrations)
├── public/               # Static assets
├── smsTemplates.json     # SMS message templates
└── mikrostomart_context.md  # 📘 COMPREHENSIVE DOCUMENTATION
```

---

## 🔑 Environment Variables

Create `.env.local` with the following:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prodentis API
PRODENTIS_API_KEY=
PRODENTIS_API_BASE_URL=

# Communications
SMSAPI_TOKEN=
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI
OPENAI_API_KEY=
REPLICATE_API_TOKEN=

# YouTube
YOUTUBE_API_KEY=
YOUTUBE_CHANNEL_ID=

# App
NEXT_PUBLIC_BASE_URL=https://mikrostomart.pl
```

See `.env.example` for template.

---

## ✨ Key Features

### Public Website
- Homepage with video hero
- Services catalog (`/oferta`)
- Metamorphoses gallery (`/metamorfozy`)
- News & articles (`/aktualnosci`)
- Product shop (`/sklep`)
- Booking system (`/rezerwacja`)
- Contact with Google Maps (`/kontakt`)

### Patient Portal (`/strefa-pacjenta`)
- Registration with email verification
- Login & password reset
- Appointment dashboard
- Confirm/cancel appointments via SMS short links
- Medical history

### Admin Panel (`/admin`)
**Tabs:**
1. Dashboard
2. Products - CRUD, AI image generation
3. Orders - E-commerce management
4. Patients - Patient database
5. **SMS Przypomnienia** - SMS reminder system
   - 📝 Szkice (Drafts) - Review/edit/send
   - 📤 Wysłane (Sent) - History with manual delete
6. Reservations
7. Questions (FAQ)
8. Articles
9. News
10. Blog
11. Appointment Instructions - Pre-appointment templates

### Automation
- **Cron Job:** Generate SMS reminders daily (5:00 AM UTC)
- **Email:** Appointment confirmations, password resets, order confirmations
- **Telegram:** Real-time admin notifications
- **SMS:** Appointment reminders with confirm/cancel links

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 📚 Documentation

👉 **For complete, detailed documentation, see:**  
**[`mikrostomart_context.md`](./mikrostomart_context.md)**

This file contains:
- Complete feature catalog
- API endpoint documentation
- Database schema details
- Integration guides (Prodentis, SMSAPI, Resend, etc.)
- Recent changes & implementation status
- Troubleshooting & support info

---

## 🚨 Known Issues

⚠️ **SMSAPI Link Blocking (Error 94)**
- SMS sending works for basic messages
- Links in SMS are blocked by account setting
- **Resolution:** Admin will contact SMSAPI support on Monday to enable link sending
- Workaround parameter added: `skip_link_detection: 1`

---

## 📅 Recent Updates (Feb 7, 2026)

### SMS History Management System
- ✅ Added "Wysłane" tab in admin panel
- ✅ Sent SMS preserved in database (not auto-deleted)
- ✅ Manual delete functionality for cleanup
- ✅ Fixed SMS fetch to load all statuses (not just drafts)
- ✅ ASCII-only SMS templates to prevent encoding issues

### Email & Notifications
- ✅ Appointment confirmation emails with instructions
- ✅ Cancellation emails
- ✅ Telegram notifications with patient name and phone
- ✅ Cleaned up email footers

See `mikrostomart_context.md` → Recent Changes for full changelog.

---

## 🤝 Support

**Primary Developer:** AI Assistant (Antigravity - Google DeepMind)  
**Project Owner:** Marcin Nowosielski  
**Clinic:** Mikrostomart Gabinet Stomatologiczny  

**For Development Context:**
1. Read [`mikrostomart_context.md`](./mikrostomart_context.md) first
2. Check [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for current status
3. Review recent commits for latest changes

---

## 📄 License

Private - All Rights Reserved

---

*Documentation generated and maintained by AI Assistant (Antigravity)*
