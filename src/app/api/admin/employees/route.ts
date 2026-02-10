import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Hardcoded clinic staff list.
 * Prodentis API has no /operators or /doctors endpoint —
 * staff data only comes from appointment/slot data.
 * This list matches REMINDER_DOCTORS and AppointmentScheduler mappings.
 */
const CLINIC_STAFF = [
    { id: 'marcin', prodentisId: '0100000001', name: 'Marcin Nowosielski', title: 'lek. dent.', specialties: 'Chirurgia, zaawansowana endodoncja, protetyka na implantach' },
    { id: 'ilona', prodentisId: '0100000024', name: 'Ilona Piechaczek', title: 'lek. dent.', specialties: 'Endodoncja, protetyka' },
    { id: 'katarzyna', prodentisId: '0100000031', name: 'Katarzyna Halupczok', title: 'lek. dent.', specialties: 'Stomatologia zachowawcza, stomatologia dziecięca' },
    { id: 'malgorzata', prodentisId: '0100000030', name: 'Małgorzata Maćków Huras', title: 'lek. dent.', specialties: 'Stomatologia ogólna' },
    { id: 'dominika', prodentisId: '', name: 'Dominika Milicz', title: 'lek. dent.', specialties: 'Stomatologia zachowawcza, stomatologia dziecięca' },
    { id: 'elzbieta', prodentisId: '', name: 'Elżbieta Nowosielska', title: '', specialties: 'Zarządzanie gabinetem' },
];

/**
 * GET /api/admin/employees
 * Returns the clinic staff list with their Supabase Auth account status.
 */
export async function GET() {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch all Supabase Auth users to check which staff members already have accounts
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('[Employees] Error listing auth users:', authError);
        }

        // Fetch all user_roles to check who has the 'employee' role
        const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('email, role')
            .eq('role', 'employee');

        if (rolesError) {
            console.error('[Employees] Error fetching roles:', rolesError);
        }

        const employeeEmails = new Set(
            (roles || []).map(r => r.email?.toLowerCase()).filter(Boolean)
        );

        // Build a map of auth users by email for quick lookup
        const authUsersByEmail = new Map<string, { id: string; email: string }>();
        if (authUsers?.users) {
            for (const au of authUsers.users) {
                if (au.email) {
                    authUsersByEmail.set(au.email.toLowerCase(), { id: au.id, email: au.email });
                }
            }
        }

        // Enrich staff list with account status
        const staffWithStatus = CLINIC_STAFF.map(staff => {
            // Try to find a matching auth user (by name parts in email, or exact email match)
            let authUser: { id: string; email: string } | undefined;
            let hasEmployeeRole = false;

            // Check all auth users for a matching email
            for (const [email, au] of authUsersByEmail) {
                if (employeeEmails.has(email)) {
                    // Check if this employee email might belong to this staff member
                    const nameParts = staff.name.toLowerCase().split(' ');
                    const emailLower = email.toLowerCase();
                    const matchesName = nameParts.some(part =>
                        emailLower.includes(part.replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n'))
                    );

                    if (matchesName) {
                        authUser = au;
                        hasEmployeeRole = true;
                        break;
                    }
                }
            }

            return {
                ...staff,
                hasAccount: !!authUser,
                hasEmployeeRole,
                accountEmail: authUser?.email || null,
                authUserId: authUser?.id || null,
            };
        });

        return NextResponse.json({ staff: staffWithStatus });
    } catch (error) {
        console.error('[Employees] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
