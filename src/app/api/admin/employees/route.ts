import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createOrUpdateEmployee } from '@/lib/employeeService';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProdentisDoctor {
    id: string;
    name: string;
}

/**
 * Normalize a name for fuzzy matching:
 * lowercase, strip accents, remove extra whitespace.
 */
function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[-()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * GET /api/admin/employees
 *
 * Returns a SINGLE UNIFIED employee list.
 * Source of truth: `employees` table.
 *
 * Prodentis scan runs in background to auto-discover new operators
 * and link existing employees via prodentis_id.
 *
 * Response: { employees: [...], prodentisAvailable: boolean }
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // ─── Step 1: Prodentis scan (background enrichment) ───────────
        const prodentisDoctors = new Map<string, ProdentisDoctor>();
        const today = new Date();
        const fetchPromises: Promise<void>[] = [];
        const DAYS_BACK = 60;
        const DAYS_FORWARD = 14;

        for (let i = -DAYS_BACK; i < DAYS_FORWARD; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            fetchPromises.push(
                (async () => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        const res = await fetch(
                            `${PRODENTIS_API_URL}/api/appointments/by-date?date=${dateStr}`,
                            { signal: controller.signal, headers: { 'Content-Type': 'application/json' } }
                        );
                        clearTimeout(timeoutId);
                        if (res.ok) {
                            const data = await res.json();
                            for (const apt of (data.appointments || [])) {
                                if (apt.doctor?.id && apt.doctor?.name) {
                                    const cleanName = apt.doctor.name.replace(/\s*\(I\)\s*/g, ' ').trim();
                                    if (!prodentisDoctors.has(apt.doctor.id)) {
                                        prodentisDoctors.set(apt.doctor.id, { id: apt.doctor.id, name: cleanName });
                                    }
                                }
                            }
                        }
                    } catch { /* individual day failed — fine */ }
                })()
            );
        }

        await Promise.all(fetchPromises);
        const prodentisAvailable = prodentisDoctors.size > 0;

        // ─── Step 2: Get ALL employees from DB (active + inactive) ───
        const { data: allEmployees } = await supabase
            .from('employees')
            .select('*')
            .order('name', { ascending: true });

        const employeesList = allEmployees || [];

        // ─── Step 3: Get user_roles for has_account cross-reference ──
        const { data: employeeRoles } = await supabase
            .from('user_roles')
            .select('user_id, email, granted_at')
            .eq('role', 'employee');

        const roleByEmail = new Map((employeeRoles || []).map(r => [r.email?.toLowerCase(), r]));

        // ─── Step 4: Auto-merge Prodentis operators into employees ───
        // Dla każdego operatora z Prodentis:
        //   1. Jeśli już istnieje wiersz z tym prodentis_id (aktywny LUB nieaktywny)
        //      → nic nie rób (admin świadomie decyduje czy go reaktywować)
        //   2. Inaczej szukaj fuzzy match po nazwie — ale TYLKO w aktywnych
        //      bez prodentis_id (żeby nie przekierować na osierocony duplikat
        //      i nie podpiąć prodentis_id do dezaktywowanego konta).
        //   3. Brak match → INSERT nowego wpisu z placeholder email.
        if (prodentisAvailable) {
            for (const [prodId, doc] of prodentisDoctors) {
                // (1) Already linked by prodentis_id — skip
                const linkedEmployee = employeesList.find(e => e.prodentis_id === prodId);
                if (linkedEmployee) continue;

                // (2) Fuzzy name match — tylko aktywne BEZ prodentis_id
                const normalizedDocName = normalizeName(doc.name);
                const nameMatch = employeesList.find(e => {
                    if (!e.name) return false;
                    if (e.is_active === false) return false;          // skip dezaktywowanych
                    if (e.prodentis_id) return false;                 // skip już zlinkowanych
                    return normalizeName(e.name) === normalizedDocName;
                });

                if (nameMatch) {
                    // Link existing active employee to Prodentis ID
                    await supabase.from('employees')
                        .update({ prodentis_id: prodId, updated_at: new Date().toISOString() })
                        .eq('id', nameMatch.id);
                    nameMatch.prodentis_id = prodId; // update in-memory too
                } else {
                    // (3) Brand new Prodentis operator — auto-create
                    const placeholderEmail = `prodentis-${prodId}@auto.mikrostomart.pl`;
                    const { data: newEmp, error: insertErr } = await supabase.from('employees')
                        .insert({
                            name: doc.name,
                            email: placeholderEmail,
                            prodentis_id: prodId,
                            is_active: true,
                        })
                        .select()
                        .single();
                    if (insertErr) {
                        console.error(`[Employees] Failed to auto-create "${doc.name}":`, insertErr.message);
                    }
                    if (newEmp) employeesList.push(newEmp);
                }
            }
        }

        // ─── Step 5: Also find user_roles employees not in employees table ──
        // (edge case: someone has employee role but no employees record)
        for (const role of (employeeRoles || [])) {
            const alreadyInList = employeesList.some(e =>
                e.email?.toLowerCase() === role.email?.toLowerCase() ||
                e.user_id === role.user_id
            );
            if (!alreadyInList && role.email) {
                // Auto-create employee record
                const { data: newEmp } = await supabase.from('employees')
                    .upsert({
                        email: role.email,
                        user_id: role.user_id,
                        name: role.email, // will be overwritten when admin sets name
                        is_active: true,
                    }, { onConflict: 'email' })
                    .select()
                    .single();
                if (newEmp) employeesList.push(newEmp);
            }
        }

        // ─── Step 6: Build unified response ──────────────────────────
        const employees = employeesList
            .sort((a: any, b: any) => {
                // Active first, then alphabetical
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                return (a.name || '').localeCompare(b.name || '', 'pl');
            })
            .map((emp: any) => {
                const roleInfo = roleByEmail.get(emp.email?.toLowerCase());
                return {
                    id: emp.id,            // employees table UUID
                    name: emp.name,
                    email: emp.email || null,
                    user_id: emp.user_id || roleInfo?.user_id || null,
                    position: emp.position || null,
                    push_groups: emp.push_groups || [],
                    prodentis_id: emp.prodentis_id || null,
                    is_active: emp.is_active ?? true,
                    has_account: !!(emp.user_id || roleInfo),
                    created_at: emp.created_at,
                };
            });

        return NextResponse.json({ employees, prodentisAvailable });
    } catch (error) {
        console.error('[Employees] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/employees
 * Update employee name or email.
 * Body: { id: string, name?: string, email?: string }
 */
export async function PATCH(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, name, email } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name.trim();
        if (email !== undefined) updates.email = email.trim() || null;

        const { error } = await supabase.from('employees').update(updates).eq('id', id);
        if (error) {
            console.error('[Employees PATCH] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Also update name in push_subscriptions if the employee has a user_id
        if (name !== undefined) {
            const { data: emp } = await supabase.from('employees').select('user_id').eq('id', id).single();
            if (emp?.user_id) {
                await supabase.from('push_subscriptions')
                    .update({ employee_name: name.trim() })
                    .eq('user_id', emp.user_id)
                    .eq('user_type', 'employee');
            }
        }

        console.log(`[Employees PATCH] Updated employee ${id} by ${user.email}`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Employees PATCH] Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/employees
 *
 * Unified create flow — backend dla wizarda „Dodaj pracownika".
 *
 * Body: {
 *   source: 'prodentis' | 'manual',
 *   name: string,
 *   email: string,
 *   prodentisId?: string,
 *   position?: 'Lekarz' | 'Higienistka' | 'Asystentka' | 'Recepcja' | 'Pracownik pomocniczy' | string,
 *   roles?: ('admin'|'employee'|'patient')[],   // default ['employee']
 *   showInBooking?: boolean,                    // default: true dla Lekarz/Higienistka
 *   pushGroups?: ('doctor'|'hygienist'|'reception'|'assistant')[],
 *   sendPasswordReset?: boolean,                // default true
 * }
 *
 * Atomic flow przez `createOrUpdateEmployee()`:
 *   1. Find/create auth.users
 *   2. Grant roles
 *   3. UPSERT employees (klucz: user_id)
 *   4. employment_terms — przez trigger z migracji 120
 *   5. Send password reset email (opcjonalnie)
 *
 * Jeśli email pasuje do istniejącego konta (np. pacjent z patient portal,
 * istniejący pracownik), wpis NIE jest duplikowany — istniejący zostaje
 * podpięty do nowej roli.
 */
export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    try {
        const result = await createOrUpdateEmployee(
            {
                source: body.source === 'prodentis' ? 'prodentis' : 'manual',
                name: body.name,
                email: body.email,
                prodentisId: body.prodentisId ?? null,
                position: body.position ?? null,
                roles: body.roles,
                showInBooking: body.showInBooking,
                pushGroups: body.pushGroups,
                sendPasswordReset: body.sendPasswordReset !== false,
            },
            user.email || 'admin'
        );

        console.log(`[Employees POST] ${result.message} (by ${user.email})`);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Employees POST] Error:', error);
        return NextResponse.json(
            { error: error?.message || 'Server error' },
            { status: 400 }
        );
    }
}
