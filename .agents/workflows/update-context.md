---
description: MANDATORY end-of-session: update the entire mikrostomart_context.md after any coding task
---

# Workflow: Update Context After Task

// turbo-all

## ⚠️ MANDATORY — Run AFTER completing any coding task in Mikrostomart

Go through EVERY section below and update what changed. Do not skip sections — check each one.

---

## Step 1 — Update "Last Updated" header
Line ~1 of `mikrostomart_context.md`:
```
> **Last Updated:** YYYY-MM-DD
```

---

## Step 2 — Update Project Overview (if scope changed)
Lines ~45–70. Update if:
- New major feature added → add to feature list
- New tech/library used → add to stack
- Migration count changed → update number
- New cron job added → update cron count in vercel.json description

---

## Step 3 — Update Directory Structure (if new files/dirs added)
Lines ~200–280. Update if:
- New API route created → add to `src/app/api/...`
- New component created → add to `src/components/`
- New library file → add to `src/lib/`
- New migration → update count comment
- New workflow → update `.agents/workflows/`

---

## Step 4 — Update Database Schema (if DB changed)
Search for `## 🗄️ Database Schema`. Update if:
- New table created → add with all columns
- New column added → add to existing table definition
- Column type changed → update
- New index → note it

---

## Step 5 — Update API Endpoints (if routes changed)
Search for `## 🔌 API Endpoints`. Update if:
- New endpoint created → add with method, path, auth, description
- Endpoint behavior changed → update description
- Endpoint deleted → remove

---

## Step 6 — Update Features & Components (if UI changed)
Search for `## ✨ Features` or `## 🧩 Components`. Update if:
- New UI tab/section added
- New state variable added to major component
- New props added to shared component
- Behavior changed (e.g., default view changed from 'list' to 'kanban')

---

## Step 7 — Update Push Notification section (if push changed)
Search for `Push Notification`. Update if:
- New push send path added
- Dedup logic changed
- New cron for push created

---

## Step 8 — Update Environment Variables (if new envs added)
Search for `## 🔐 Environment Variables`. Add any new `process.env.*` used.

---

## Step 9 — Update Known Issues / Pending Work
Search for `## ⚠️ Known Issues` or `## 🔧 Pending`. Update if:
- Bug was fixed → remove from Known Issues
- New bug found → add
- Feature partially implemented → note what's pending

---

## Step 10 — Add to Recent Changes (ALWAYS)
At the TOP of Recent Changes section (line ~2030+):

```markdown
### [Month Day], 2026
**[Short title of what was done]**

#### Commits:
- `abc1234` — description (get from: git log --oneline -5)

#### Features Added / Fixed:
1. **Feature name**
   - What was broken / what changed
   - How it was fixed / implemented
   - Key files involved

#### Files Modified:
- `src/path/to/file.ts` — what changed

#### DB Migration Required: (if applicable)
- Run `supabase_migrations/NNN_name.sql` in Supabase SQL Editor
```

---

## Step 11 — Commit and push (ALWAYS auto-run)

// turbo
```bash
git add -A
git commit -m "docs: update context after [feature name]"
git push origin main
```

// turbo
```bash
git -C /Users/marcinnowosielskimedit/.gemini/antigravity/playground/galactic-schrodinger/golden-mikrostomart pull origin main
```


---

## Step 12 — SEO Verification (if new pages or navigation changed)
Check EVERY item below if you created a new page or changed navigation:

1. **Sitemap** — is the new page in `src/app/sitemap.ts`?
2. **Metadata** — does the new page have a `layout.tsx` with `export const metadata`?
3. **Footer nav** — is the new page linked in `Footer.tsx` SEO navigation grid?
4. **robots.ts** — should this page be crawlable? If private (admin/employee), add to disallow.
5. **SSR visibility** — does the page content render in HTML without JavaScript? 
   - Check: `curl -s https://mikrostomart.pl/<page> | grep "<h1"` — should return content
   - Content behind `useState` + conditional rendering = invisible to Google

---

## ✅ Checklist (tick each before finishing)
- [ ] Last Updated date changed
- [ ] Migration count updated (if applicable)
- [ ] New tables/columns added to DB Schema (if applicable)
- [ ] New API routes added to API Endpoints (if applicable)
- [ ] New UI features added to Features section (if applicable)
- [ ] New env vars added (if applicable)
- [ ] Known Issues updated (if applicable)
- [ ] Recent Changes entry added (ALWAYS)
- [ ] **SEO: New page added to sitemap.ts** (if new page created)
- [ ] **SEO: New page has layout.tsx with metadata** (if new page created)
- [ ] **SEO: New page linked in Footer.tsx** (if new public page)
- [ ] Committed and pushed

---

## ❌ Common Mistakes

| Wrong | Right |
|-------|-------|
| Only updating Recent Changes | Go through ALL sections |
| "Fixed bugs" as description | Specific: what exact bug, which file, which fix |
| Creating migration 028 without checking | Always `ls supabase_migrations/ \| sort \| tail -5` first |
| Skipping context update entirely | Context update = mandatory last step of every task |
| Leaving fixed bugs in Known Issues | Remove them when resolved |
| **Creating page without sitemap entry** | **ALWAYS add to sitemap.ts** |
| **Creating page without layout.tsx metadata** | **ALWAYS create layout.tsx with title + description** |
| **Hiding nav links behind JS hover/click** | **Footer must have plain crawlable `<Link>` elements** |
| **Using `'use client'` for pages with static content** | **Server Components by default — `'use client'` only when needed** |

