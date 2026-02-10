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
 * Fetches staff from Prodentis appointments (current + next week) and 
 * cross-references with Supabase to show account status.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch unique doctors from Prodentis by scanning 14 days of appointments
        const doctors = new Map<string, ProdentisDoctor>();
        const today = new Date();
        const fetchPromises: Promise<void>[] = [];

        for (let i = 0; i < 14; i++) {
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
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const { data: employeeRoles } = await supabase
            .from('user_roles')
            .select('user_id, email, granted_at')
            .eq('role', 'employee');

        const employeeEmails = new Set((employeeRoles || []).map(r => r.email));
        const employeeMap = new Map((employeeRoles || []).map(r => [r.email, r]));

        // Build staff list from Prodentis
        const staff = Array.from(doctors.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
            .map(doc => {
                // Try to find matching Supabase user by name similarity in email
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
        // (e.g. reception, assistants who don't have their own appointments)
        const registeredEmployees = (employeeRoles || [])
            .filter(r => !staff.some(s => s.accountEmail === r.email))
            .map(r => ({
                id: `supabase-${r.user_id}`,
                name: r.email, // We only have email for these
                hasAccount: true,
                accountEmail: r.email,
                grantedAt: r.granted_at,
                userId: r.user_id,
            }));

        return NextResponse.json({
            staff,
            registeredEmployees,
            prodentisAvailable: doctors.size > 0,
        });
    } catch (error) {
        console.error('[Employees] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
