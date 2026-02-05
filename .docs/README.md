# Project Documentation

This directory contains comprehensive documentation for the Mikrost omart project.

## 📋 Available Documents

### [`architecture.md`](./architecture.md)
**Complete project reference** - Read this BEFORE starting any new work!

Contains:
- All 38 pages (public, patient portal, admin panel)
- All 31 API endpoints
- Database schema (Supabase tables)
- 27+ React components
- External integrations (Prodentis, Resend, Stripe, YouTube)
- Authentication & authorization flows
- **MANDATORY workflow checklist**

## 🎯 Purpose

**Prevent recreating existing functionality** by:
1. Providing complete system overview
2. Documenting all existing features
3. Establishing search workflow before coding

## ⚠️ CRITICAL: Always Check Before Coding

Before implementing ANY new feature:

1. ✅ Read [`architecture.md`](./architecture.md)
2. ✅ Search codebase for existing implementation
3. ✅ Verify database schema
4. ✅ Check admin panel UI
5. ✅ ONLY THEN propose solution

## 🚫 Common Mistakes

The following have been recreated in the past - **DON'T repeat these mistakes:**

- ❌ Admin panel (exists at `/admin`)
- ❌ Patient approval system (exists with email notifications)
- ❌ Visit history (exists in Historia tab)
- ❌ API endpoints (31 already exist - check first!)

## 📝 Keeping Documentation Updated

When adding new features, also update:
- `architecture.md` - Add to relevant section
- Database schema files if tables/columns change
- This README if adding new docs

---

**Last Updated:** 2026-02-05
