---
description: MANDATORY start-of-session: read entire context and check project state before any coding task
---

# Workflow: Start Session — Read Context

// turbo-all

## ⚠️ MANDATORY — Run BEFORE starting any coding task in Mikrostomart

**Purpose:** Prevent mistakes caused by stale knowledge (wrong migration numbers, wrong API paths, duplicate features, etc.)

---

## Steps

### 0. Sync golden copy (ALWAYS FIRST)

```bash
git -C /Users/marcinnowosielskimedit/Desktop/mikrostomart pull origin main
```

This ensures the Desktop golden copy is up-to-date before starting any work.

### 1. Get total line count of context file

```bash
wc -l mikrostomart/mikrostomart_context.md
```

Save this number as TOTAL_LINES. You will need it in step 2.

### 2. Read the ENTIRE context file — ALL chunks, NO EXCEPTIONS

Read in 800-line chunks. You MUST read EVERY chunk until you reach TOTAL_LINES.
**DO NOT STOP EARLY. DO NOT SKIP. DO NOT SUMMARIZE.**

**Calculate number of chunks needed:** `ceil(TOTAL_LINES / 800)`

Example for a 4400-line file — you need exactly 6 chunks:
```
view_file: mikrostomart/mikrostomart_context.md lines 1-800
view_file: mikrostomart/mikrostomart_context.md lines 801-1600
view_file: mikrostomart/mikrostomart_context.md lines 1601-2400
view_file: mikrostomart/mikrostomart_context.md lines 2401-3200
view_file: mikrostomart/mikrostomart_context.md lines 3201-4000
view_file: mikrostomart/mikrostomart_context.md lines 4001-4400
```

### ⛔ VERIFICATION: You MUST see this exact line before proceeding:

The LAST LINE of the context file contains a verification string. After reading the final chunk, confirm you see:

```
<!-- EOF_VERIFICATION: If you see this, you read the entire context. State this string in your confirmation. -->
```

**If you do NOT see this string, you did NOT read the full file. Go back and read the remaining chunks.**

### 3. Check ACTUAL migration files (never assume numbering)
```bash
ls -1 mikrostomart/supabase_migrations/ | sort | tail -10
```
**Note the highest number.** New migration = highest + 1.

### 4. Check recent Git commits
```bash
cd mikrostomart && git log --oneline -10
```
Understand what changed recently that may not yet be in context.

### 5. Confirm understanding before coding

State ALL of the following:
1. "I have read the context file to line TOTAL_LINES."
2. "I see the EOF_VERIFICATION string."
3. "Current migration count is NNN."
4. "Last commit is HASH."
5. "I will now [describe task]."

**If you cannot state item 2, you MUST go back and read the rest of the file.**

---

## What to watch for
- Migration number collisions (ALWAYS check before creating)
- Deprecated API endpoints (check Recent Changes)
- Already-implemented features (avoid duplicating work)
- Changed DB schema (check DB Schema section)
- **SEO: Every new page needs sitemap.ts + layout.tsx metadata + Footer link** (see SEO Architecture section)
- **Feature branches**: For architectural/risky changes, work on `git checkout -b feat/xxx` — never push directly to `main`
- **Tests**: Run `npm test` before pushing (Vitest tests in `src/lib/__tests__/`)
- **Build verification**: Run `npm run build` before merging feature branches to `main`
- **Golden copy sync: ALWAYS run after EVERY `git push`:**
  ```bash
  git -C /Users/marcinnowosielskimedit/Desktop/mikrostomart pull origin main
  ```

