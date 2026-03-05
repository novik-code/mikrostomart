---
description: How to add a new page or modify text in the multilingual Mikrostomart app. MANDATORY SEO checklist included.
---

# Workflow: Add/Edit Page in Mikrostomart

// turbo-all

## ⚠️ EVERY new page MUST complete the SEO checklist at the end

---

## Adding a New Page

### 1. Create page file
```
src/app/<page-name>/page.tsx
```

### 2. Create layout with SEO metadata (MANDATORY)
```
src/app/<page-name>/layout.tsx
```
Content:
```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '<Page Title> | Mikrostomart - Dentysta Opole',
    description: '<Compelling description with keywords, max 160 chars>',
    keywords: '<comma-separated keywords related to page>',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
```

### 3. Add to sitemap (MANDATORY)
File: `src/app/sitemap.ts`

Add the route to the appropriate priority tier:
- **Main pages** (priority 0.9): o-nas, oferta, cennik, kontakt, rezerwacja
- **Content pages** (priority 0.8): aktualnosci, baza-wiedzy, metamorfozy, sklep
- **Tool pages** (priority 0.7): mapa-bolu, kalkulator-leczenia, porownywarka
- **Legal pages** (priority 0.3): regulamin, rodo, polityka-cookies

### 4. Add to Footer navigation (if public-facing page)
File: `src/components/Footer.tsx`

Add `<Link>` to the appropriate column in the SEO navigation grid:
- Gabinet: o-nas, zespol, kontakt, rezerwacja
- Usługi: oferta, cennik, metamorfozy
- Narzędzia: mapa-bolu, kalkulator-leczenia, porownywarka, aplikacja
- Wiedza: aktualnosci, baza-wiedzy, blog, sklep

### 5. Add translations (if i18n content)
Add keys to all 4 locale files:
```
src/messages/pl/common.json
src/messages/en/common.json
src/messages/de/common.json
src/messages/ua/common.json
```

---

## Editing Text on Existing Page

1. Identify the page file in `src/app/<page-name>/page.tsx`
2. Check if text uses `useTranslations()` — if yes, edit `src/messages/*/common.json`
3. If text is hardcoded, edit the `.tsx` file directly
4. Update metadata in `layout.tsx` if page topic/title changed

---

## ⚠️ SEO Checklist (MANDATORY for every new page)

- [ ] `layout.tsx` created with title, description, keywords
- [ ] Route added to `src/app/sitemap.ts`
- [ ] Link added to `Footer.tsx` SEO navigation (if public page)
- [ ] Page accessible without JavaScript (SSR content visible)
- [ ] Page does NOT use `'use client'` at top level (if possible — prefer Server Component)
- [ ] If `'use client'` required: key content is not hidden behind useState/useEffect
- [ ] Internal links to/from this page exist (other pages link here)

## ❌ Common SEO Mistakes

| Wrong | Right |
|-------|-------|
| Creating page.tsx without layout.tsx | ALWAYS create layout.tsx with metadata |
| Forgetting to add to sitemap.ts | ALWAYS add to sitemap after creating page |
| Hiding content behind hover/click JS events | Content must be in initial HTML |
| Using `'use client'` + `useState` for main content | Server Components for static content |
| Navigation links only in JS-rendered hamburger | Footer has plain `<Link>` elements for crawlers |
