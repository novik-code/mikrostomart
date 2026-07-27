import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { loadStaffActivity } from '@/lib/pushService';
import { checkRateLimit } from '@/lib/rateLimit';
import { assigneeUserIds } from '@/lib/taskAssignees';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Lista osób z nazwiskami nie może osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

type DirectoryPerson = {
    /**
     * `auth.users.id` — JEDYNY identyfikator, który wolno wpisać do
     * `staff_conversation_members.user_id` / `staff_messages.sender_user_id`.
     * `null` dla pracownika bez konta (patrz `hasAccount`).
     */
    userId: string | null;
    name: string;
    position: string | null;
    role: 'admin' | 'employee' | null;
    isActive: boolean;
    hasAccount: boolean;
    /** `hasAccount && isActive` — do tej osoby da się wysłać wiadomość prywatną. */
    canMessage: boolean;
};

type EmployeeRow = {
    id: string;
    user_id: string | null;
    email: string | null;
    name: string | null;
    position: string | null;
    is_active: boolean | null;
};

type RoleRow = { user_id: string | null; email: string | null; role: string | null };

/** Jedno miejsce na test „to jest prawdziwe konto", wspólne z przypisaniami zadań. */
function toAuthUserId(value: unknown): string | null {
    return assigneeUserIds([{ id: value }])[0] ?? null;
}

function normEmail(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase();
}

/**
 * GET /api/employee/messaging/directory
 * Auth: employee lub admin (Bearer OK — strefa personelu w apce).
 *
 * Katalog osób do rozmowy prywatnej (czat zespołowy, migracja 183).
 *
 * 🔑 Dlaczego to NIE jest `/api/employee/staff`: tamten endpoint zwraca identyfikatory
 * dwojakie — realne UUID kont ORAZ sztuczne `emp-<employees.id>` dla pracownika bez
 * konta. `staff_conversation_members.user_id` jest typu UUID, więc `emp-*` odbiłoby się
 * błędem 22P02, a w gorszym wariancie (gdyby kolumna była tekstowa) powstałaby rozmowa
 * bez odbiorcy. Tutaj `userId` jest albo prawdziwym `auth.users.id`, albo `null`.
 *
 * DECYZJA: zwracamy TAKŻE pracowników bez konta, z `hasAccount:false`, `canMessage:false`
 * i `userId:null` — interfejs pokazuje ich jako niedostępnych zamiast ukrywać. Ukrycie
 * byłoby gorsze: te osoby widać w przypisaniach zadań, więc ich brak w czacie wyglądałby
 * jak błąd wyszukiwarki, a nie jak „nie ma konta w aplikacji". `null` zamiast `emp-<id>`
 * jest celowe — przypadkowa próba założenia rozmowy z taką osobą pada głośno (NOT NULL),
 * zamiast zapisać wiarygodnie wyglądający, ale martwy identyfikator.
 *
 * Zwraca: { people: DirectoryPerson[], selfUserId: string }
 * Autor zapytania jest wycięty z listy — `dm_key` w migracji 183 wymaga DWÓCH RÓŻNYCH
 * uuid (CHECK: pierwszy < drugi), więc rozmowa z samym sobą i tak nie przeszłaby INSERT-a.
 */
export async function GET(request: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    // Ekran „nowa rozmowa" otwiera się rzadko; limit chroni audyt i bazę przed
    // pętlą renderującą po stronie apki.
    const rl = await checkRateLimit(`staff-directory:${auth.user.id}`, 60, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele zapytań — spróbuj za chwilę' },
            { status: 429, headers: NO_STORE }
        );
    }

    try {
        const [rolesRes, employeesRes] = await Promise.all([
            supabase
                .from('user_roles')
                .select('user_id, email, role')
                .in('role', ['employee', 'admin']),
            // Celowo BEZ filtra `is_active` (inaczej niż /api/employee/staff): wiersz
            // z `is_active=false` jest tu potrzebny, żeby wyciąć konto osoby, która
            // odeszła — samo `user_roles` nie wie nic o zatrudnieniu.
            supabase
                .from('employees')
                .select('id, user_id, email, name, position, is_active'),
        ]);

        if (rolesRes.error || employeesRes.error) {
            console.error('[MessagingDirectory] Query failed:', rolesRes.error || employeesRes.error);
            return NextResponse.json(
                { error: 'Nie udało się pobrać listy osób' },
                { status: 500, headers: NO_STORE }
            );
        }

        const roleRows = (rolesRes.data || []) as RoleRow[];
        const employeeRows = (employeesRes.data || []) as EmployeeRow[];

        // 1. Konta personelu, po jednym wpisie na user_id (admin+employee = jeden wiersz).
        const accounts = new Map<string, { userId: string; email: string; isAdmin: boolean }>();
        for (const row of roleRows) {
            const userId = toAuthUserId(row.user_id);
            if (!userId) continue;
            const email = normEmail(row.email);
            const existing = accounts.get(userId);
            if (existing) {
                existing.isAdmin = existing.isAdmin || row.role === 'admin';
                if (!existing.email && email) existing.email = email;
            } else {
                accounts.set(userId, { userId, email, isAdmin: row.role === 'admin' });
            }
        }

        // 2. Kartoteka pracowników — nazwa i stanowisko. Dopasowanie po user_id (pewne),
        //    z odwrotem na e-mail (tak wiąże je /api/employee/staff).
        const empByUserId = new Map<string, EmployeeRow>();
        const empByEmail = new Map<string, EmployeeRow>();
        for (const emp of employeeRows) {
            const empUserId = toAuthUserId(emp.user_id);
            if (empUserId && !empByUserId.has(empUserId)) empByUserId.set(empUserId, emp);
            const email = normEmail(emp.email);
            if (email && !empByEmail.has(email)) empByEmail.set(email, emp);
        }

        const people: DirectoryPerson[] = [];
        const matchedEmployeeIds = new Set<string>();

        const activity = await loadStaffActivity();

        for (const acc of accounts.values()) {
            const emp = empByUserId.get(acc.userId) || (acc.email ? empByEmail.get(acc.email) : undefined);
            if (emp) matchedEmployeeIds.add(emp.id);
            // Osoba wyrejestrowana z zespołu znika z katalogu, ale jej dotychczasowe
            // rozmowy zostają (D6 — historia ustaleń drugiej strony).
            // Rozstrzyga WSPÓLNY indeks aktywności, a nie pierwszy napotkany wiersz:
            // kartoteka ma zdublowane wpisy (migracja porządkowa 2026-05-08), więc
            // „pierwszy wygrywa" potrafiło ukryć czynnego pracownika, gdy jego stary
            // wiersz był nieaktywny. Indeks skleja duplikaty i traktuje NULL jak aktywny.
            if (!activity.isActive(acc.userId, acc.email)) continue;

            const empName = (emp?.name || '').trim();
            const usableName = empName && normEmail(empName) !== acc.email ? empName : '';
            people.push({
                userId: acc.userId,
                name: usableName || acc.email || 'Pracownik',
                position: (emp?.position || '').trim() || null,
                role: acc.isAdmin ? 'admin' : 'employee',
                isActive: true,
                hasAccount: true,
                canMessage: true,
            });
        }

        // 3. Pracownicy bez konta personelu. „Bez konta" = brak wiersza w `user_roles`
        //    z rolą employee/admin — samo `employees.user_id` nie wystarcza, bo bez roli
        //    ta osoba i tak nie wejdzie do strefy personelu.
        for (const emp of employeeRows) {
            if (matchedEmployeeIds.has(emp.id)) continue;
            if (emp.is_active === false) continue;
            const name = (emp.name || '').trim() || (emp.email || '').trim();
            if (!name) continue;
            people.push({
                userId: null,
                name,
                position: (emp.position || '').trim() || null,
                role: null,
                isActive: true,
                hasAccount: false,
                canMessage: false,
            });
        }

        const visible = people
            .filter((p) => p.userId !== auth.user.id)
            .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

        await logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'view_staff_directory',
            resourceType: 'staff_messaging',
            metadata: {
                total: visible.length,
                contactable: visible.filter((p) => p.canMessage).length,
            },
            request,
        });

        return NextResponse.json(
            { people: visible, selfUserId: auth.user.id },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[MessagingDirectory] Error:', err);
        return NextResponse.json(
            { error: 'Nie udało się pobrać listy osób' },
            { status: 500, headers: NO_STORE }
        );
    }
}
