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
 * GET /api/admin/employees
 * Fetches ALL staff from Prodentis by scanning 60 days back + 14 days forward.
 * This captures doctors, hygienists, assistants, receptionists — anyone who 
 * appears as an operator in appointment data.
 * Cross-references with Supabase to show account status.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Scan 60 days back + 14 days forward = 74 days total
        const doctors = new Map<string, ProdentisDoctor>();
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
                            {
                                signal: controller.signal,
                                headers: { 'Content-Type': 'application/json' },
                            }
                        );
                        clearTimeout(timeoutId);

                        if (res.ok) {
                            const data = await res.json();
                            const appointments = data.appointments || [];
                            for (const apt of appointments) {
                                if (apt.doctor?.id && apt.doctor?.name) {
                                    const cleanName = apt.doctor.name.replace(/\s*\(I\)\s*/g, ' ').trim();
                                    if (!doctors.has(apt.doctor.id)) {
                                        doctors.set(apt.doctor.id, {
                                            id: apt.doctor.id,
                                            name: cleanName,
                                        });
                                    }
                                }
                            }
                        }
                    } catch {
                        // Individual day fetch failed — that's fine, we try many days
                    }
                })()
            );
        }

        await Promise.all(fetchPromises);

        // Get all Supabase Auth users + employee roles for cross-reference
        const { data: employeeRoles } = await supabase
            .from('user_roles')
            .select('user_id, email, granted_at')
            .eq('role', 'employee');

        const employeeMap = new Map((employeeRoles || []).map(r => [r.email, r]));

        // Get employees from the dedicated employees table
        const { data: employeesFromDb } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true);

        const employeesDbList = employeesFromDb || [];

        // Build staff list from Prodentis
        const staff = Array.from(doctors.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
            .map(doc => {
                // 1. Try exact match from employees table (by prodentis_id or name)
                const matchingEmployee = employeesDbList.find(e =>
                    e.prodentis_id === doc.id || e.name === doc.name
                );

                if (matchingEmployee) {
                    // Auto-update prodentis_id if not set
                    if (!matchingEmployee.prodentis_id && matchingEmployee.email) {
                        supabase.from('employees')
                            .update({ prodentis_id: doc.id, updated_at: new Date().toISOString() })
                            .eq('email', matchingEmployee.email)
                            .then();
                    }

                    return {
                        id: doc.id,
                        name: doc.name,
                        hasAccount: true,
                        accountEmail: matchingEmployee.email,
                        grantedAt: matchingEmployee.created_at,
                        employeeId: matchingEmployee.id,
                    };
                }

                // 2. Fallback: fuzzy match name in email (backward compatibility)
                const matchingRole = Array.from(employeeMap.entries()).find(([email]) => {
                    const emailLower = email.toLowerCase();
                    const nameParts = doc.name.toLowerCase().split(' ').filter(p => p.length > 2);
                    return nameParts.some(part => emailLower.includes(part));
                });

                return {
                    id: doc.id,
                    name: doc.name,
                    hasAccount: !!matchingRole,
                    accountEmail: matchingRole?.[0] || null,
                    grantedAt: matchingRole?.[1]?.granted_at || null,
                };
            });

        // Also get currently registered employees that may not appear in Prodentis
        const registeredEmployees = (employeeRoles || [])
            .filter(r => !staff.some(s => s.accountEmail === r.email))
            .map(r => ({
                id: `supabase-${r.user_id}`,
                name: r.email,
                hasAccount: true,
                accountEmail: r.email,
                grantedAt: r.granted_at,
                userId: r.user_id,
            }));

        return NextResponse.json({
            staff,
            registeredEmployees,
            prodentisAvailable: doctors.size > 0,
            scannedDays: DAYS_BACK + DAYS_FORWARD,
        });
    } catch (error) {
        console.error('[Employees] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

