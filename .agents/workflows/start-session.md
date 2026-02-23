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
```
view_file: mikrostomart/mikrostomart_context.md lines 1-400
view_file: mikrostomart/mikrostomart_context.md lines 400-800
view_file: mikrostomart/mikrostomart_context.md lines 800-1200
view_file: mikrostomart/mikrostomart_context.md lines 1200-1600
view_file: mikrostomart/mikrostomart_context.md lines 1600-2030
```
(Read Recent Changes — last 30 days — to know current state)

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
