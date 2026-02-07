# Mikrostomart - Project Architecture Overview

> **Last Updated:** 2026-02-07  
> **Purpose:** Complete reference to prevent recreating existing functionality

---

## 🏗️ System Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS + Custom CSS
- **Database:** Supabase (PostgreSQL)
- **External APIs:** 
  - Prodentis (patient data, appointments)
  - Resend (email notifications)
  - Telegram Bot API (appointment notifications)
  - Stripe (payments)
  - YouTube API (video feed)
- **Deployment:** Vercel

### Core Modules
1. **Public Website** - Marketing pages, blog, shop
2. **Patient Portal** (`/strefa-pacjenta`) - Authenticated patient area
3. **Admin Panel** (`/admin`) - Administrative interface
4. **E-commerce** - Product catalog, cart, checkout
5. **Knowledge Base** - Articles, FAQ, educational content

---

## 📄 All Pages (40 total)

### Public Pages (18)
- `/` - Homepage
- `/o-nas` - About us
- `/oferta` - Services overview
- `/oferta/implantologia` - Implantology details
- `/kontakt` - Contact page
- `/faq` - Frequently asked questions
- `/rezerwacja` - Appointment booking
- `/sklep` - Shop (product catalog)
- `/koszyk` - Shopping cart
- `/zadatek` - Deposit payment
- `/selfie` - Selfie photo booth
- `/symulator` - Treatment simulator
- `/mapa-bolu` - Pain map tool
- `/metamorfozy` - Before/after gallery
- `/polityka-prywatnosci` - Privacy policy
- `/polityka-cookies` - Cookie policy
- `/regulamin` - Terms of service
- `/rodo` - GDPR information

### Blog/Content Pages (4)
- `/aktualnosci` - News listing
- `/aktualnosci/[slug]` - News article
- `/baza-wiedzy` - Knowledge base listing
- `/baza-wiedzy/[slug]` - Knowledge base article
- `/nowosielski` - Doctor's blog listing
- `/nowosielski/[slug]` - Doctor's blog article

### Patient Portal (11)
- `/strefa-pacjenta` - Portal entrance (redirects)
- `/strefa-pacjenta/login` - Patient login
- `/strefa-pacjenta/dashboard` - Patient dashboard
- `/strefa-pacjenta/historia` - Visit history
- `/strefa-pacjenta/profil` - Patient profile
- `/strefa-pacjenta/register/verify` - Step 1: Verify Prodentis ID
- `/strefa-pacjenta/register/confirm` - Step 2: Confirm details
- `/strefa-pacjenta/register/password` - Step 3: Set password
- `/strefa-pacjenta/register/verify-email/[token]` - Email verification
- `/strefa-pacjenta/reset-password` - Request password reset
- `/strefa-pacjenta/reset-password/[token]` - Confirm password reset

### Admin Panel (3)
- `/admin/login` - Admin login
- `/admin` - Admin dashboard (patients, orders, reservations, news, SMS reminders, appointment instructions)
- `/admin/update-password` - Update admin password

### Appointment Landing Pages (2)
- `/wizyta/[type]` - Appointment preparation instructions (dynamic per type)
- `/s/[code]` - Short link redirect (SMS-friendly URLs)

---

## 🔌 API Endpoints (46 total)

### Patient Portal API (15)
- `POST /api/patients/register` - Create account (sends verification email)
- `POST /api/patients/verify-email` - Verify email token
- `POST /api/patients/login` - Patient login
- `POST /api/patients/verify` - Verify Prodentis ID
- `GET /api/patients/me` - Get current patient data
- `GET /api/patients/me/visits` - Get patient visit history
- `GET /api/patients/[id]/next-appointment` - Get next appointment from Prodentis
- `POST /api/patients/reset-password/request` - Request password reset
- `POST /api/patients/reset-password/confirm` - Confirm password reset
- `POST /api/patients/appointments/[id]/reschedule` - **NEW!** Request appointment reschedule (email + Telegram)
- `POST /api/patients/appointments/[id]/cancel` - **NEW!** Request appointment cancellation (email + Telegram)
- `POST /api/patients/appointments/[id]/confirm-attendance` - **NEW!** Confirm attendance 24h before (email + Telegram)
- `GET /api/patients/appointments/[id]/status` - **NEW!** Get appointment action status
- `POST /api/patients/appointments/[id]/reset-status` - **NEW!** Reset appointment status (testing only)

### Admin API (16)
- `GET /api/admin/patients` - List all patients
- `POST /api/admin/patients/approve` - Approve patient account
- `POST /api/admin/patients/reject` - Reject patient account (with reason)
- `GET /api/admin/orders` - List all orders
- `GET /api/admin/reservations` - List all reservations
- `GET /api/admin/questions` - List expert questions
- `GET/POST/PATCH/DELETE /api/admin/news` - News management
- `GET/POST/PATCH/DELETE /api/admin/blog` - Blog management
- `GET/POST/PATCH/DELETE /api/admin/articles` - Knowledge base management
- `POST /api/admin/news/generate` - AI-generate news article
- `GET /api/admin/sms-reminders` - List SMS drafts with filters (status, date)
- `PUT /api/admin/sms-reminders` - Edit SMS message before sending
- `DELETE /api/admin/sms-reminders` - Cancel/delete SMS draft
- `POST /api/admin/sms-reminders/send` - Send SMS (single or bulk)
- `GET /api/admin/appointment-instructions` - **NEW!** Get appointment type instructions
- `PUT /api/admin/appointment-instructions/:type` - **NEW!** Update instruction content

### Public API (16)
- `POST /api/contact` - Contact form submission
- `POST /api/reservations` - Create reservation
- `POST /api/ask-expert` - Submit expert question
- `GET /api/products` - Get product catalog
- `GET /api/news` - Get news articles
- `POST /api/create-payment-intent` - Stripe payment
- `POST /api/order-confirmation` - Confirm order
- `GET /api/youtube` - Get YouTube videos
- `POST /api/chat` - AI chat assistant
- `POST /api/simulate` - Treatment simulation
- `GET /api/prodentis/slots` - Get available appointment slots
- `POST /api/fix-db-images` - Database image migration utility
- `GET /api/appointment-instructions/:type` - **NEW!** Get landing page instructions
- `POST /api/appointments/confirm` - **NEW!** Confirm appointment (public, no JWT)
- `POST /api/appointments/cancel` - **NEW!** Cancel appointment (public, no JWT)
- `POST /api/short-links` - **NEW!** Create short link
- `GET /api/short-links/:code` - **NEW!** Resolve short link + track clicks

### Cron Jobs (3)
- `POST /api/cron/daily-article` - Generate daily article at 8:00 AM Warsaw
- `POST /api/cron/appointment-reminders` - Generate SMS drafts + appointment_actions + short links at 8:00 AM Warsaw
- `POST /api/cron/sms-auto-send` - Auto-send unsent SMS drafts at 10:00 AM Warsaw

---

## 🗄️ Database Schema (Supabase)

### Main Tables

#### `patients`
Patient portal accounts linked to Prodentis.

**Key Columns:**
- `id` UUID (PK)
- `prodentis_id` VARCHAR(50) UNIQUE - Links to Prodentis
- `phone` VARCHAR(15) UNIQUE - Login identifier
- `password_hash` TEXT - Bcrypt password
- `email` VARCHAR(255) - Email (optional override)
- `account_status` VARCHAR(50) - Verification workflow status
  - `pending_email_verification`
  - `pending_admin_approval`
  - `active`
  - `rejected`
- `email_verified` BOOLEAN
- `email_verified_at` TIMESTAMPTZ
- `admin_approved` BOOLEAN
- `admin_approved_at` TIMESTAMPTZ
- `admin_approved_by` VARCHAR(255)
- `admin_rejection_reason` TEXT
- `last_login` TIMESTAMP
- `created_at`, `updated_at` TIMESTAMP

**Indexes:**
- `phone`, `prodentis_id`, `created_at`

#### `email_verification_tokens`
Temporary tokens for email verification during registration.

**Key Columns:**
- `id` UUID (PK)
- `prodentis_id` VARCHAR(50)
- `email` VARCHAR(255)
- `phone` VARCHAR(15)
- `password_hash` TEXT - Stored until verified
- `token` UUID UNIQUE
- `expires_at` TIMESTAMPTZ - 24h expiry
- `used` BOOLEAN
- `used_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ

#### `password_reset_tokens`
One-time tokens for password reset.

**Key Columns:**
- `id` UUID (PK)
- `prodentis_id` VARCHAR(50)
- `phone` VARCHAR(15)
- `token` VARCHAR(255) UNIQUE
- `expires_at` TIMESTAMPTZ - 1h expiry
- `used` BOOLEAN
- `used_at` TIMESTAMP
- `created_at` TIMESTAMP

#### `sms_reminders`
**NEW!** SMS reminder drafts for 2-stage send system (admin review before sending).

**Key Columns:**
- `id` UUID (PK)
- `patient_id` UUID FK → patients.id
- `prodentis_id` VARCHAR(50) - Prodentis appointment ID
- `phone` VARCHAR(20) - Patient phone number
- `appointment_date` TIMESTAMPTZ - Appointment datetime
- `doctor_name` VARCHAR(255) - Doctor name
- `appointment_type` VARCHAR(100) - Appointment type (implantologia, chirurgia, etc.)
- `sms_message` TEXT - SMS content (editable by admin)
- `status` VARCHAR(20) - `draft` | `sent` | `failed` | `cancelled`
- `sent_at` TIMESTAMPTZ - When SMS was sent
- `manually_sent_by` VARCHAR(255) - Admin email who sent manually (NULL if auto-sent)
- `edited_by` VARCHAR(255) - Admin who last edited message
- `edited_at` TIMESTAMPTZ - Last edit timestamp
- `sms_message_id` VARCHAR(255) - SMSAPI message ID
- `send_error` TEXT - Error message if send failed
- `created_at` TIMESTAMPTZ - When draft was generated

**Workflow:**
1. Cron generates drafts (status='draft') at 8 AM
2. Admin reviews/edits in `/admin` → SMS tab
3. Admin sends manually OR auto-sent at 10 AM if not sent
4. Status updated to 'sent' or 'failed'

#### `appointment_instructions`
**NEW!** Landing page content for appointment types (editable via admin CMS).

**Key Columns:**
- `id` UUID (PK)
- `appointment_type` VARCHAR(100) UNIQUE - URL slug (e.g. 'chirurgia', 'pierwsza-wizyta')
- `title` VARCHAR(255) - Page heading
- `subtitle` TEXT - Subheading
- `icon` VARCHAR(50) - Emoji icon
- `content` TEXT - HTML content (instructions, preparation)
- `preparation_time` VARCHAR(100) - How long before to prepare
- `what_to_bring` JSONB - Array of items to bring
- `important_notes` JSONB - Array of warning/important notes
- `created_at`, `updated_at` TIMESTAMPTZ

#### `short_links`
**NEW!** URL shortener for SMS appointment reminders.

**Key Columns:**
- `id` UUID (PK)
- `short_code` VARCHAR(20) UNIQUE - 6-char nanoid (e.g. 'abc123')
- `destination_url` TEXT - Full URL to redirect to
- `appointment_id` UUID FK - Links to appointment_actions
- `patient_id` UUID FK - Links to patients
- `appointment_type` VARCHAR(100) - Type slug
- `click_count` INTEGER - Analytics
- `last_clicked_at` TIMESTAMPTZ
- `expires_at` TIMESTAMPTZ - Auto-expires 3 days after appointment
- `created_at`, `updated_at` TIMESTAMPTZ

**Usage:** `/s/abc123` → `/wizyta/chirurgia?appointmentId=...&date=...&time=...`

#### Other Tables
- `orders` - E-commerce orders
- `reservations` - Appointment bookings
- `products` - Shop products
- `blog_posts` - Doctor's blog
- `news` - News articles
- `knowledge_base` - Educational articles
- `expert_questions` - Patient questions

---

## 🧩 Key Components (28 total)

### Layout & Navigation
- `Navbar.tsx` - Main navigation with cart, patient portal links
- `Footer.tsx` - Site footer
- `BackgroundVideo.tsx` - Video background component

### Forms & Interactions
- `ContactForm.tsx` - Contact form with validation
- `ReservationForm.tsx` - Appointment booking
- `CheckoutForm.tsx` - Shopping cart checkout
- `StripePaymentForm.tsx` - Stripe payments
- `AskExpertModal.tsx` - Expert question modal
- `AskExpertButton.tsx` - Trigger button

### Content Display
- `ArticleCarousel.tsx` - Article slider
- `OfferCarousel.tsx` - Services carousel
- `YouTubeFeed.tsx` - YouTube video grid
- `GoogleReviews.tsx` - Google reviews display
- `MetamorphosisGallery.tsx` - Before/after gallery
- `InteriorCollage.tsx` - Office photos

### Interactive Tools
- `SimulatorModal.tsx` - Treatment simulator
- `BeforeAfterSlider.tsx` - Before/after slider
- `SelfieBooth.tsx` - Selfie photo capture
- `OverlayEditor.tsx` - Image overlay editor
- `ProductModal.tsx` - Product details modal

### UI Elements
- `RevealOnScroll.tsx` - Scroll animations
- `AnimatedPhone.tsx` - Animated phone number
- `AnimatedAt.tsx` - Animated @ symbol
- `CookieConsent.tsx` - Cookie banner
- `PWAInstallPrompt.tsx` - PWA installation

### Admin Components
- `AppointmentInstructionsEditor.tsx` - **NEW!** CMS editor for landing page content (split-screen edit/preview)

### Subdirectories
- `components/scheduler/` - Appointment scheduling
- `components/simulator/` - Treatment simulation tools

---

## 🔐 Authentication & Authorization

### Patient Portal
- **Login:** Phone + Password
- **Registration:** 3-step flow (Verify → Confirm → Password)
- **Email Verification:** Required before admin approval
- **Admin Approval:** Manual review before full access
- **Access Levels:**
  - `pending_email_verification` - Cannot login
  - `pending_admin_approval` - Can login, restricted data access
  - `active` - Full access
  - `rejected` - Restricted access with reason displayed

### Admin Panel
- **Login:** Email + Password
- **Auth Token:** Stored in cookies
- **Middleware:** Protected routes with auth check

---

## 🎨 UI/UX Features

### Brand Colors
- Primary Gold: `#dcb14a`
- Dark Background: Gradients with transparency
- Video backgrounds on auth pages

### Special Pages
- **One-time workflow popup** - Explains registration process (login page)
- **Next appointment widget** - Shows upcoming visit using real Prodentis API 3.0 (dashboard)
- **Selfie booth** - Photo capture with face detection
- **Treatment simulator** - Visual treatment planning
- **Pain map** - Interactive tooth pain locator

---

## 📧 Notifications (Resend + Telegram)

### Patient Portal Emails
1. **Email Verification** - Registration confirmation (24h expiry)
2. **Account Approved** - Welcome message with login link
3. **Account Rejected** - Explanation with admin reason + contact
4. **Password Reset** - Reset link (1h expiry)

### Admin Notifications (Email + Telegram)
- Contact form submissions
- New reservations
- New expert questions
- **Appointment Actions** (NEW):
  - Reschedule requests (with reason)
  - Cancellation requests (with reason)
  - Attendance confirmations (24h before)

### Telegram Integration
- **Bot Token:** `TELEGRAM_BOT_TOKEN`
- **Chat IDs:** `TELEGRAM_CHAT_ID` (comma-separated for multiple recipients)
- **Parallel Delivery:** Telegram sends alongside email notifications
- **Formatted Messages:** HTML format with clickable phone links

---

## 🔄 External Integrations

### Prodentis API
- Patient data verification
- Visit history
- Appointment slots
- **Base URL:** Configured in environment

### Resend (Email)
- Transactional emails
- **API Key:** `RESEND_API_KEY`

### Stripe (Payments)
- Product purchases
- Deposits
- **Keys:** `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`

### YouTube API
- Featured videos
- **Key:** `YOUTUBE_API_KEY`

### Telegram Bot API
- Appointment action notifications (reschedule, cancel, confirm)
- **Keys:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

---

## 📁 Project Structure

```
mikrostomart/
├── src/
│   ├── app/                    # Next.js pages (App Router)
│   │   ├── api/               # API routes
│   │   ├── strefa-pacjenta/   # Patient portal
│   │   ├── admin/             # Admin panel
│   │   └── [public pages]     # Marketing pages
│   ├── components/            # React components
│   ├── context/               # React context providers
│   ├── helpers/               # Utility functions
│   └── lib/                   # Core libraries
├── supabase_migrations/       # Database migrations
├── .docs/                     # Project documentation
└── public/                    # Static assets
```

---

## 🚀 Deployment

- **Platform:** Vercel
- **Production URL:** https://www.mikrostomart.pl
- **Auto-deploy:** On push to `main` branch

### Recent Updates (2026-02-07)
- ✅ **Appointment Landing Pages** - Dynamic pages per appointment type (`/wizyta/[type]`)
- ✅ **Short Links System** - SMS-friendly URLs (`/s/code`) with click analytics
- ✅ **Admin CMS** - Editable appointment instructions with split-screen preview
- ✅ **Appointment Actions** - Confirm/cancel buttons on landing pages (public, no JWT)
- ✅ **Manual Trigger** - Admin panel button to invoke cron job for testing
- ✅ **SMS Integration** - Short links appended to SMS messages automatically
- ✅ **Appointment Type Mapper** - Smart mapping from Prodentis names to landing page slugs

---

## ⚠️ IMPORTANT: Before Adding New Features

### Admin Panel Already Has:
✅ **Patients Tab** - Approve/reject with email notifications  
✅ **Orders Tab** - E-commerce management  
✅ **Reservations Tab** - Appointment bookings  
✅ **News Tab** - News articles management  
✅ **Knowledge Base Tab** - Educational articles  
✅ **Blog Tab** - Doctor's blog posts  
✅ **Questions Tab** - Expert questions from patients

### Patient Portal Already Has:
✅ **3-phase registration** - Verify ID → Confirm → Password  
✅ **Email verification** - 24h token system  
✅ **Admin approval** - Manual review workflow  
✅ **Dashboard** - Next appointment widget with real Prodentis API  
✅ **Appointment Actions** - Reschedule, cancel, confirm attendance (24h window)  
✅ **Visit history** - Full visit list in Historia tab  
✅ **Profile** - Personal data management  
✅ **Password reset** - Email-based reset flow  
✅ **Payment auto-fill** - Address data from patient profile

---

## 📝 WORKFLOW: Before Starting ANY Work

**MANDATORY CHECKLIST:**

### 1. Read Documentation
- ✅ Read this `architecture.md`
- ✅ Check relevant section above

### 2. Search Existing Code
```bash
# Search for similar features
grep -r "keyword" src/

# Find API endpoints
find src/app/api -name "route.ts" | grep "feature"

# Check components
ls src/components/ | grep "Feature"
```

### 3. Verify Database
- ✅ Check `supabase_patient_portal_schema.sql`
- ✅ Check `supabase_migrations/003_email_verification_system.sql`
- ✅ Verify table/column doesn't exist

### 4. Check Admin Panel
- ✅ Login to `/admin`
- ✅ Check all tabs
- ✅ Verify feature doesn't exist

### 5. ONLY THEN: Propose Solution

---

## 🎯 Common Mistakes to Avoid

❌ **DON'T recreate admin panel** - It exists at `/admin`  
❌ **DON'T recreate patient approval** - API endpoints exist  
❌ **DON'T duplicate visit history** - Already in Historia tab  
❌ **DON'T add duplicate API routes** - Check `/api` first  
❌ **DON'T modify database without checking schema** - Tables may exist

✅ **DO check this document first**  
✅ **DO search codebase before coding**  
✅ **DO ask if feature exists**  
✅ **DO extend existing code when possible**

---

## 📚 Additional Documentation

For more details, see:
- `README.md` - Setup instructions
- `supabase_patient_portal_schema.sql` - Full database schema
- `supabase_migrations/` - Migration history
