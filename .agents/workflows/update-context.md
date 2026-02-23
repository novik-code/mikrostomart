---
description: Update mikrostomart_context.md after completing any coding task
---

# Workflow: Update Context After Task

// turbo-all

## MANDATORY — Run this workflow after EVERY coding task in the Mikrostomart project.

This ensures the context file remains accurate for future AI sessions and prevents:
- Wrong migration numbers (e.g., creating 028 when 028 already exists)
- Stale API endpoint docs
- Missing DB table descriptions
- Outdated feature lists

---

## Steps

### 1. Check what migrations exist BEFORE creating new ones
```bash
ls -1 supabase_migrations/ | sort | tail -5
```
**Use the NEXT available number.** Never assume — always check first.

### 2. Update `mikrostomart_context.md` — Last Updated header
Change the date at the top of the file:
```
> **Last Updated:** YYYY-MM-DD
```

### 3. Update migration count (line ~55)
```
- Database: N migrations (003-NNN: ...)
```

### 4. Add entry to Recent Changes (top of section, line ~2030+)
Format:
```markdown
### [Month Day], 2026
**[Short description of what was done]**

#### Commits:
- `abc1234` — description

#### Features Added / Fixed:
1. **Feature name** — what changed, what was broken, what was fixed

#### Files Modified:
- `path/to/file.ts` — what changed

#### DB Migration Required: (if applicable)
- Run `supabase_migrations/NNN_name.sql` in Supabase SQL Editor
```

### 5. Update Database Schema section (if new tables/columns added)
Find the relevant section and add:
- New tables with their full column list
- New columns on existing tables

### 6. Update API Endpoints section (if new routes added)
Find `## 🔌 API Endpoints` and add new routes.

### 7. Commit the context update
```bash
git add mikrostomart_context.md
git commit -m "docs: update context file after [feature name]"
git push
```

---

## Common Mistakes to Avoid

❌ **WRONG:** Creating migration `028` without checking → collision  
✅ **RIGHT:** `ls supabase_migrations/ | sort | tail -5` → pick next number

❌ **WRONG:** Completing a task without updating context  
✅ **RIGHT:** Update context as the LAST STEP of every task

❌ **WRONG:** Vague entries like "Fixed bugs"  
✅ **RIGHT:** Specific: commit hash, file names, what exactly changed
