---
description: MANDATORY start-of-session: read entire context and check project state before any coding task
---

# Workflow: Start Session — Read Context

// turbo-all

## ⚠️ MANDATORY — Run BEFORE starting any coding task in Mikrostomart

**Purpose:** Prevent mistakes caused by stale knowledge (wrong migration numbers, wrong API paths, duplicate features, etc.)

---

## Steps

### 1. Read the full context file — ALL sections

**First**, check total line count:
```bash
wc -l mikrostomart/mikrostomart_context.md
```

**Then**, read the ENTIRE file in 800-line chunks. Start at line 1 and keep reading until you've covered all lines. Example for a 4100-line file — adjust the last chunk to the actual line count:
```
view_file: mikrostomart/mikrostomart_context.md lines 1-800
view_file: mikrostomart/mikrostomart_context.md lines 801-1600
view_file: mikrostomart/mikrostomart_context.md lines 1601-2400
view_file: mikrostomart/mikrostomart_context.md lines 2401-3200
view_file: mikrostomart/mikrostomart_context.md lines 3201-4000
view_file: mikrostomart/mikrostomart_context.md lines 4001-<TOTAL>
```

⚠️ **IMPORTANT**: Do NOT stop early. Always read ALL chunks until you reach the total line count from `wc -l`. The file grows with every feature — skipping the end means missing Recent Changes, architecture, and key files.

### 2. Check ACTUAL migration files (never assume numbering)
```bash
ls -1 supabase_migrations/ | sort | tail -10
```
**Note the highest number.** New migration = highest + 1.

### 3. Check recent Git commits
```bash
git log --oneline -10
```
Understand what changed recently that may not yet be in context.

### 4. Confirm understanding before coding
State: "I have read the context. Current migration count is NNN. Last commit is HASH. I will now..."

---

## What to watch for
- Migration number collisions (ALWAYS check before creating)
- Deprecated API endpoints (check Recent Changes)
- Already-implemented features (avoid duplicating work)
- Changed DB schema (check DB Schema section)
