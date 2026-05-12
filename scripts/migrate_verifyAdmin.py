#!/usr/bin/env python3
"""S1-2 migration: verifyAdmin -> requireAdmin in src/app/api/admin/** + selected misc.

Strategy:
- Pattern A1 (single-line, 4-space): `    const user = await verifyAdmin();\n    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`
- Pattern A2 (single-line, 8-space inside try): same shape, 8 spaces.
- Pattern B (single-line return null): `    const user = await verifyAdmin();\n    if (!user) return null;` — used in helpers (brand-logo, sections)
- Pattern C (multi-line if with braces): `const user = await verifyAdmin();\n    if (!user) {\n        return NextResponse.json(...);\n    }`
- Pattern D (boolean form): `if (!(await verifyAdmin())) {\n    return NextResponse.json({ error: 'Unauthorized' }, ...);` — products
- Pattern E (with hasRole admin redundant): leave for cleanup pass

After Pattern A/B/C/D replace: also rename adminUser variable if used.
Import: `import { verifyAdmin } from '@/lib/auth';` -> `import { requireAdmin } from '@/lib/authGuards';`
        `import { verifyAdmin } from "@/lib/auth";` (double quote) -> same with double quote.

Skip files (manual employee-or-admin migration):
- src/app/api/admin/chat/messages/route.ts
- src/app/api/admin/chat/conversations/route.ts
- src/app/api/admin/careflow/stats/route.ts

Usage:
    python3 scripts/migrate_verifyAdmin.py --dry-run
    python3 scripts/migrate_verifyAdmin.py --apply
"""

import argparse
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

SKIP = {
    "src/app/api/admin/chat/messages/route.ts",
    "src/app/api/admin/chat/conversations/route.ts",
    "src/app/api/admin/careflow/stats/route.ts",
}

# Pattern A: single-line if, 4 or 8 space indent
# Captures indent and variable name (user / adminUser)
RE_A = re.compile(
    r"^(?P<ind>[ \t]+)const (?P<var>\w+) = await verifyAdmin\(\);\n"
    r"(?P=ind)if \(!(?P=var)\) return NextResponse\.json\(\{ error: ['\"]Unauthorized[^'\"]*['\"] \}, \{ status: 401 \}\);",
    re.MULTILINE,
)

# Pattern C: multi-line if with braces (curly inside)
RE_C = re.compile(
    r"^(?P<ind>[ \t]+)const (?P<var>\w+) = await verifyAdmin\(\);\n"
    r"(?P=ind)if \(!(?P=var)\) \{\n"
    r"(?P=ind)    return NextResponse\.json\(\{ error: ['\"]Unauthorized[^'\"]*['\"] \}, \{ status: 401 \}\);\n"
    r"(?P=ind)\}",
    re.MULTILINE,
)

# Pattern B: returns null (helper fn) — leave for manual; would change semantics if blindly replaced.
# Just flag presence.
RE_B = re.compile(
    r"const (?P<var>\w+) = await verifyAdmin\(\);\s*\n\s*if \(!(?P=var)\) return null;",
    re.MULTILINE,
)

# Pattern D: boolean inline
RE_D = re.compile(
    r"^(?P<ind>[ \t]+)if \(!\(await verifyAdmin\(\)\)\) \{\n"
    r"(?P=ind)    return NextResponse\.json\(\{ error: ['\"]Unauthorized['\"] \}, \{ status: 401 \}\);\n"
    r"(?P=ind)\}",
    re.MULTILINE,
)

IMPORT_RE = re.compile(
    r"""import \{ verifyAdmin \} from ['"]@/lib/auth['"];"""
)


def repl_a(m):
    ind = m.group("ind")
    var = m.group("var")
    return (
        f"{ind}const auth = await requireAdmin();\n"
        f"{ind}if (!auth.ok) return auth.response;\n"
        f"{ind}const {var} = auth.user;"
    )


def repl_c(m):
    ind = m.group("ind")
    var = m.group("var")
    return (
        f"{ind}const auth = await requireAdmin();\n"
        f"{ind}if (!auth.ok) return auth.response;\n"
        f"{ind}const {var} = auth.user;"
    )


def repl_d(m):
    ind = m.group("ind")
    return (
        f"{ind}const auth = await requireAdmin();\n"
        f"{ind}if (!auth.ok) return auth.response;"
    )


def process(path: Path, apply: bool):
    content = path.read_text()
    original = content

    if "verifyAdmin" not in content:
        return "skip-no-verify"

    rel = str(path.relative_to(REPO))
    if rel in SKIP:
        return "skip-employee-or-admin"

    # Bail out on Pattern B unless it's the only one and is the auth helper we expect
    # (brand-logo / sections both have a helper that returns user|null and then checks
    # hasRole(admin) downstream — those need manual treatment.)
    if RE_B.search(content):
        return "manual-pattern-B"

    # Apply A, C, D
    n_a = 0
    n_c = 0
    n_d = 0
    content, n_a = RE_A.subn(repl_a, content)
    content, n_c = RE_C.subn(repl_c, content)
    content, n_d = RE_D.subn(repl_d, content)

    total = n_a + n_c + n_d
    if total == 0:
        return f"manual-no-pattern (still references verifyAdmin)"

    # Update import (preserve quote style)
    content = IMPORT_RE.sub(
        lambda m: "import { requireAdmin } from '@/lib/authGuards';"
        if "'" in m.group(0)
        else 'import { requireAdmin } from "@/lib/authGuards";',
        content,
    )

    # Verify no residual verifyAdmin
    if "verifyAdmin" in content:
        return f"residual-verifyAdmin (replaced {total}, still uses verifyAdmin somewhere)"

    if apply:
        path.write_text(content)

    return f"ok ({n_a} A, {n_c} C, {n_d} D)"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--paths", nargs="*", default=[
        "src/app/api/admin",
        "src/app/api/products/route.ts",
        "src/app/api/health/ai/route.ts",
    ])
    args = parser.parse_args()

    files = []
    for p in args.paths:
        full = REPO / p
        if full.is_dir():
            files.extend(full.rglob("route.ts"))
        elif full.is_file():
            files.append(full)

    results = {}
    for f in sorted(files):
        rel = str(f.relative_to(REPO))
        results[rel] = process(f, apply=args.apply)

    # Print sorted by status
    by_status = {}
    for rel, status in results.items():
        by_status.setdefault(status.split(" ")[0], []).append((rel, status))

    for status, items in sorted(by_status.items()):
        print(f"\n=== {status} ({len(items)}) ===")
        for rel, msg in items:
            print(f"  {rel} — {msg}")

    print(f"\n\nTotal: {len(results)}")
    if not args.apply:
        print("(dry-run; pass --apply to write)")


if __name__ == "__main__":
    main()
