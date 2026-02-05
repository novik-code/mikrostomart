# Mikrostomart - Project Architecture Overview

> **Last Updated:** 2026-02-05  
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

## 📄 All Pages (38 total)

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
- `/admin` - Admin dashboard (patients, orders, reservations, news, etc.)
- `/admin/update-password` - Update admin password

---

## 🔌 API Endpoints (32 total)

### Patient Portal API (11)
- `POST /api/patients/register` - Create account (sends verification email)
- `POST /api/patients/verify-email` - Verify email token
- `POST /api/patients/login` - Patient login
- `POST /api/patients/verify` - Verify Prodentis ID
- `GET /api/patients/me` - Get current patient data
- `GET /api/patients/me/visits` - Get patient visit history
- `GET /api/patients/[id]/next-appointment` - **NEW!** Get next appointment from Prodentis
- `POST /api/patients/reset-password/request` - Request password reset
- `POST /api/patients/reset-password/confirm` - Confirm password reset

### Admin API (11)
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

### Public API (10)
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
- `POST /api/cron/daily-article` - Automated daily article generation
- `POST /api/fix-db-images` - Database image migration utility

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

#### Other Tables
- `orders` - E-commerce orders
- `reservations` - Appointment bookings
- `products` - Shop products
- `blog_posts` - Doctor's blog
- `news` - News articles
- `knowledge_base` - Educational articles
- `expert_questions` - Patient questions

---

## 🧩 Key Components (27 total)

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

## 📧 Email Notifications (Resend)

### Patient Portal Emails
1. **Email Verification** - Registration confirmation (24h expiry)
2. **Account Approved** - Welcome message with login link
3. **Account Rejected** - Explanation with admin reason + contact
4. **Password Reset** - Reset link (1h expiry)

### Admin Notifications
- Contact form submissions
- New reservations
- New expert questions

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
✅ **Visit history** - Full visit list in Historia tab  
✅ **Profile** - Personal data management  
✅ **Password reset** - Email-based reset flow

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
