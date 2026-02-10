import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { grantRole, type UserRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/roles/promote
 * Promote a patient-zone user to admin/employee by creating a Supabase Auth account
 * and granting the requested roles.
 * 
 * Body: {
 *   patientEmail: string,     - email from patients table
 *   roles: ('admin' | 'employee' | 'patient')[]  - roles to grant
 *   sendPasswordReset?: boolean  - if true, send password reset email (default true)
 * }
 */
export async function POST(request: Request) {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { patientEmail, roles, sendPasswordReset = true } = await request.json();

        if (!patientEmail || !roles || !Array.isArray(roles) || roles.length === 0) {
            return NextResponse.json(
                { error: 'Wymagany email pacjenta i co najmniej jedna rola' },
                { status: 400 }
            );
        }

        const validRoles: UserRole[] = ['admin', 'employee', 'patient'];
        for (const r of roles) {
            if (!validRoles.includes(r)) {
                return NextResponse.json(
                    { error: `Nieprawidłowa rola: ${r}` },
                    { status: 400 }
                );
            }
        }

        // Check if patient exists in patients table
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, email, phone, prodentis_id')
            .eq('email', patientEmail)
            .single();

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'Nie znaleziono pacjenta z tym adresem email' },
                { status: 404 }
            );
        }

        // Check if Supabase Auth account already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
            u => u.email?.toLowerCase() === patientEmail.toLowerCase()
        );

        let userId: string;

        if (existingUser) {
            // Auth account already exists — just grant the roles
            userId = existingUser.id;
        } else {
            // Create Supabase Auth account with a random temporary password
            const tempPassword = crypto.randomBytes(16).toString('hex');

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: patientEmail,
                password: tempPassword,
                email_confirm: true, // auto-confirm since they already verified via patient portal
            });

            if (createError || !newUser?.user) {
                console.error('[Promote] Failed to create auth account:', createError);
                return NextResponse.json(
                    { error: `Nie udało się utworzyć konta: ${createError?.message || 'Unknown error'}` },
                    { status: 500 }
                );
            }

            userId = newUser.user.id;

            // Send password reset email so the user can set their own password
            if (sendPasswordReset) {
                const { error: resetError } = await supabase.auth.admin.generateLink({
                    type: 'recovery',
                    email: patientEmail,
                    options: {
                        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl'}/admin/update-password`,
                    },
                });

                if (resetError) {
                    console.error('[Promote] Failed to send password reset:', resetError);
                    // Don't fail — account was created, just log the error
                }
            }
        }

        // Grant the requested roles
        const grantedRoles: string[] = [];
        const failedRoles: string[] = [];

        for (const role of roles) {
            const success = await grantRole(userId, patientEmail, role, adminUser.email || 'admin');
            if (success) {
                grantedRoles.push(role);
            } else {
                failedRoles.push(role);
            }
        }

        return NextResponse.json({
            success: true,
            userId,
            email: patientEmail,
            grantedRoles,
            failedRoles,
            isNewAccount: !existingUser,
            message: `Konto ${existingUser ? 'zaktualizowane' : 'utworzone'}. Nadano role: ${grantedRoles.join(', ')}${failedRoles.length > 0 ? `. Nie udało się nadać: ${failedRoles.join(', ')}` : ''
                }`,
        });
    } catch (error) {
        console.error('[Promote] Error:', error);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}
