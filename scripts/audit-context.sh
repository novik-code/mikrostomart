#!/bin/bash
# =============================================================================
# audit-context.sh — Automated cross-reference check
# Compares filesystem state against mikrostomart_context.md
# Run from project root: bash scripts/audit-context.sh
# =============================================================================

set -e

CONTEXT="mikrostomart_context.md"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍  MIKROSTOMART CONTEXT AUDIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "$CONTEXT" ]; then
    echo -e "${RED}❌ ERROR: $CONTEXT not found!${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────────────
# 1. MIGRATION COUNT
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}${BOLD}📦 1. MIGRATION COUNT${NC}"

LAST_MIGRATION=$(ls supabase_migrations/ | sort | tail -1 | sed 's/_.*//')
LAST_MIGRATION_NUM=$((10#$LAST_MIGRATION))
TOTAL_MIGRATION_FILES=$(ls supabase_migrations/*.sql | wc -l | tr -d ' ')
DOC_MIGRATION_NUM=$(grep -o 'Database: [0-9]* migrations' "$CONTEXT" | head -1 | grep -o '[0-9]*')

echo "   Latest migration file: ${LAST_MIGRATION} | Total files: ${TOTAL_MIGRATION_FILES}"
echo "   Doc says: ${DOC_MIGRATION_NUM} migrations"

if [ "$LAST_MIGRATION_NUM" -gt "$DOC_MIGRATION_NUM" ] 2>/dev/null; then
    echo -e "   ${RED}❌ OUTDATED: doc says $DOC_MIGRATION_NUM, filesystem has up to $LAST_MIGRATION_NUM${NC}"
    for f in supabase_migrations/*.sql; do
        mig_num=$((10#$(basename "$f" | sed 's/_.*//')))
        if [ "$mig_num" -gt "$DOC_MIGRATION_NUM" ]; then
            echo -e "   ${YELLOW}   → UPDATE NEEDED: $(basename $f)${NC}"
        fi
    done
    ERRORS=$((ERRORS + 1))
else
    echo -e "   ${GREEN}✅ OK${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────
# 2. API ROUTES
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}${BOLD}🔌 2. API ROUTES${NC}"

TOTAL_ROUTES=$(find src/app/api -name "route.ts" | wc -l | tr -d ' ')
echo "   Total route files: $TOTAL_ROUTES"

MISSING_ROUTES=()
SKIP_ROUTES="fix-db-images theme auth/callback short-links"

for route_file in $(find src/app/api -name "route.ts" | sort); do
    route_path=$(echo "$route_file" | sed 's|src/app/api/||' | sed 's|/route\.ts||')
    
    # Skip known utility/internal routes
    skip=0
    for sr in $SKIP_ROUTES; do
        if echo "$route_path" | grep -q "^$sr"; then
            skip=1; break
        fi
    done
    [ "$skip" -eq 1 ] && continue
    
    # Extract the most distinctive keyword (last meaningful segment)
    keyword=$(echo "$route_path" | tr '/' '\n' | grep -v '^\[' | tail -1)
    
    # For bracket-heavy paths, try parent
    if [ -z "$keyword" ] || [ ${#keyword} -lt 3 ]; then
        keyword=$(echo "$route_path" | tr '/' '\n' | grep -v '^\[' | tail -2 | head -1)
    fi
    
    if [ -n "$keyword" ] && [ ${#keyword} -ge 3 ]; then
        if ! grep -qi "$keyword" "$CONTEXT" 2>/dev/null; then
            MISSING_ROUTES+=("$route_path")
        fi
    fi
done

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
    echo -e "   ${GREEN}✅ All routes have matching doc entries${NC}"
else
    for r in "${MISSING_ROUTES[@]}"; do
        echo -e "   ${RED}❌ NOT IN DOC: /api/$r${NC}"
    done
    ERRORS=$((ERRORS + ${#MISSING_ROUTES[@]}))
fi
echo ""

# ─────────────────────────────────────────────────────────
# 3. CRON JOBS
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}${BOLD}⏰ 3. CRON JOBS (vercel.json)${NC}"

if [ -f "vercel.json" ]; then
    VERCEL_CRONS=$(python3 -c "import json; d=json.load(open('vercel.json')); print(len(d.get('crons',[])))")
    DOC_CRONS=$(grep -c '| `/cron/' "$CONTEXT" 2>/dev/null || echo "0")
    
    echo "   vercel.json: $VERCEL_CRONS cron entries"
    echo "   Doc table:   $DOC_CRONS cron rows"
    
    # Check each cron by name
    MISSING_CRONS=()
    while IFS= read -r cron_name; do
        if ! grep -qi "$cron_name" "$CONTEXT" 2>/dev/null; then
            MISSING_CRONS+=("$cron_name")
        fi
    done < <(python3 -c "
import json
d = json.load(open('vercel.json'))
for c in d.get('crons', []):
    name = c['path'].split('/')[-1].split('?')[0]
    print(name)
" 2>/dev/null | sort -u)

    if [ ${#MISSING_CRONS[@]} -eq 0 ]; then
        echo -e "   ${GREEN}✅ All cron jobs documented${NC}"
    else
        for c in "${MISSING_CRONS[@]}"; do
            echo -e "   ${RED}❌ CRON NOT IN DOC: $c${NC}"
        done
        ERRORS=$((ERRORS + ${#MISSING_CRONS[@]}))
    fi
else
    echo -e "   ${YELLOW}⚠️  vercel.json not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ─────────────────────────────────────────────────────────
# 4. COMPONENTS (key files check)
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}${BOLD}🧩 4. COMPONENTS${NC}"

TOTAL_COMPONENTS=$(ls src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')
TOTAL_MODALS=$(ls src/components/modals/*.tsx 2>/dev/null | wc -l | tr -d ' ')
echo "   $TOTAL_COMPONENTS main + $TOTAL_MODALS modals"
echo -e "   ${GREEN}✅ Inventory logged${NC}"
echo ""

# ─────────────────────────────────────────────────────────
# 5. DOC DATE vs LATEST COMMIT
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}${BOLD}📅 5. DOC DATE${NC}"

DOC_DATE=$(grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' <<< "$(grep 'Last Updated:' "$CONTEXT" | head -1)")
LATEST_COMMIT_DATE=$(git log -1 --format="%as")
echo "   Doc:    $DOC_DATE"
echo "   Git:    $LATEST_COMMIT_DATE"

if [ "$DOC_DATE" != "$LATEST_COMMIT_DATE" ]; then
    echo -e "   ${YELLOW}⚠️  Date mismatch${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "   ${GREEN}✅ OK${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────
# 6. UNREPORTED COMMITS (last 2 days, non-docs)
# ─────────────────────────────────────────────────────────
echo -e "${BLUE}${BOLD}📋 6. RECENT COMMITS (last 2 days)${NC}"

UNREPORTED=0
TOTAL_RECENT=0
while IFS= read -r line; do
    hash=$(echo "$line" | awk '{print $1}')
    msg=$(echo "$line" | cut -d' ' -f2-)
    TOTAL_RECENT=$((TOTAL_RECENT + 1))
    
    # Skip docs-only commits
    case "$msg" in
        docs:*|chore:*) continue ;;
    esac
    
    if ! grep -q "$hash" "$CONTEXT" 2>/dev/null; then
        echo -e "   ${YELLOW}⚠️  $hash — $msg${NC}"
        UNREPORTED=$((UNREPORTED + 1))
    fi
done < <(git log --oneline --since="2 days ago")

if [ "$UNREPORTED" -eq 0 ]; then
    echo -e "   ${GREEN}✅ All $TOTAL_RECENT recent commits documented${NC}"
else
    echo -e "   ${YELLOW}   → $UNREPORTED of $TOTAL_RECENT commits not in doc${NC}"
    WARNINGS=$((WARNINGS + UNREPORTED))
fi
echo ""

# ─────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}✅ ALL CHECKS PASSED — context doc is up to date${NC}"
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "  ${YELLOW}${BOLD}⚠️  PASSED with $WARNINGS warning(s)${NC}"
else
    echo -e "  ${RED}${BOLD}❌ FAILED: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo -e "  ${RED}   Fix all ❌ items in mikrostomart_context.md before proceeding${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
