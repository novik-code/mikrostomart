import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

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
        // For each Prodentis doctor, find or create a matching employee record.
        if (prodentisAvailable) {
            for (const [prodId, doc] of prodentisDoctors) {
                // Already linked by prodentis_id?
                const linkedEmployee = employeesList.find(e => e.prodentis_id === prodId);
                if (linkedEmployee) continue;

                // Fuzzy match by name
                const normalizedDocName = normalizeName(doc.name);
                const nameMatch = employeesList.find(e => {
                    if (!e.name) return false;
                    return normalizeName(e.name) === normalizedDocName;
                });

                if (nameMatch) {
                    // Link existing employee to Prodentis
                    await supabase.from('employees')
                        .update({ prodentis_id: prodId, updated_at: new Date().toISOString() })
                        .eq('id', nameMatch.id);
                    nameMatch.prodentis_id = prodId; // update in-memory too
                } else {
                    // Brand new Prodentis operator — auto-create
                    const { data: newEmp } = await supabase.from('employees')
                        .insert({
                            name: doc.name,
                            prodentis_id: prodId,
                            is_active: true,
                        })
                        .select()
                        .single();
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
