---
description: How to add a new page or modify text in the multilingual Mikrostomart app
---

# Adding/Modifying Pages with i18n Support

This project uses `next-intl` for multilingual support (PL, EN, DE, UA).
**All public-facing text MUST go through the translation system.**

## Rules

1. **NEVER hardcode Polish text** in public pages or components
2. **Always use `t('key')`** from `useTranslations()` hook (client) or `getTranslations()` (server)
3. **Admin, employee, and patient portal routes** (`/admin`, `/pracownik`, `/strefa-pacjenta`) are exempt — they stay Polish-only

## Adding a New Public Page

// turbo-all

1. Create the page in `src/app/[locale]/your-page/page.tsx`
2. Add translation keys to ALL 4 files:
   - `messages/pl/common.json` (or new namespace file)
   - `messages/en/common.json`
   - `messages/de/common.json`
   - `messages/ua/common.json`
3. Add pathname mapping in `src/i18n/routing.ts`:
   ```ts
   '/your-page': {
       pl: '/twoja-strona',
       en: '/your-page',
       de: '/deine-seite',
       ua: '/ваша-сторінка',
   },
   ```
4. Use `useTranslations()` in client components:
   ```tsx
   import { useTranslations } from 'next-intl';
   const t = useTranslations('yourNamespace'); // or just useTranslations()
   // Then: {t('key')}
   ```
5. Use `Link` from `@/i18n/navigation` (NOT from `next/link`) for locale-preserving links:
   ```tsx
   import { Link } from '@/i18n/navigation';
   <Link href="/your-page">...</Link>
   ```

## Modifying Existing Text

1. Find the translation key in `messages/pl/common.json`
2. Update the value in ALL 4 locale files
3. The component already uses `t('key')` so no code change needed

## File Structure

```
messages/
├── pl/common.json    # Polish (source of truth)
├── en/common.json    # English
├── de/common.json    # German
└── ua/common.json    # Ukrainian

src/i18n/
├── routing.ts        # Locale config + pathname mappings
├── request.ts        # Server-side message loader
└── navigation.ts     # i18n-aware Link, useRouter, usePathname
```

## Important Components

- `LanguageSwitcher.tsx` — language dropdown in Navbar
- `src/app/[locale]/layout.tsx` — public layout with NextIntlClientProvider
- All public pages live under `src/app/[locale]/`
