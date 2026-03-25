import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { grantRole, type UserRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { demoSanitize } from '@/lib/brandConfig';

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
        const { patientEmail, roles, sendPasswordReset = true, employeeName } = await request.json();

        if (!patientEmail) {
            return NextResponse.json(
                { error: 'Wymagany email pacjenta' },
                { status: 400 }
            );
        }

        const rolesToGrant = Array.isArray(roles) ? roles : [];

        const validRoles: UserRole[] = ['admin', 'employee', 'patient'];
        for (const r of rolesToGrant) {
            if (!validRoles.includes(r)) {
                return NextResponse.json(
                    { error: `Nieprawidłowa rola: ${r}` },
                    { status: 400 }
                );
            }
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

            // Also send a password reset email in case user doesn't know their password
            if (sendPasswordReset) {
                try {
                    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
                    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                        type: 'recovery',
                        email: patientEmail,
                    });
                    if (!linkError && linkData?.properties?.hashed_token) {
                        const tokenHash = linkData.properties.hashed_token;
                        const recoveryUrl = `${siteUrl}/admin/update-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
                        const resend = new Resend(process.env.RESEND_API_KEY!);
                        await resend.emails.send({
                            from: demoSanitize('Mikrostomart <noreply@mikrostomart.pl>'),
                            to: patientEmail,
                            subject: demoSanitize('Ustaw hasło do panelu Mikrostomart'),
                            html: demoSanitize(`
                                <!DOCTYPE html><html><head><meta charset="utf-8"></head>
                                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <div style="background: linear-gradient(135deg, #38bdf8, #0ea5e9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                        <h1 style="color: #fff; margin: 0; font-size: 24px;">🦷 Mikrostomart</h1>
                                    </div>
                                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                                        <h2>Witaj${employeeName ? `, ${employeeName.split(' ')[0]}` : ''}!</h2>
                                        <p>Ustaw hasło do panelu klikając poniższy przycisk:</p>
                                        <div style="text-align: center;">
                                            <a href="${recoveryUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #38bdf8, #0ea5e9); color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Ustaw hasło</a>
                                        </div>
                                        <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 0.85rem;">${recoveryUrl}</p>
                                        <p>📞 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                                    </div>
                                </div></body></html>
                            `)
                        });
                        console.log('[Promote] Recovery email sent to existing user', patientEmail);
                    }
                } catch (e) {
                    console.error('[Promote] Failed to send recovery email to existing user:', e);
                }
            }
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
                try {
                    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');

                    // Generate a recovery link (admin API - returns the link but doesn't send email)
                    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                        type: 'recovery',
                        email: patientEmail,
                    });

                    if (linkError || !linkData?.properties?.hashed_token) {
                        console.error('[Promote] Failed to generate recovery link:', linkError);
                    } else {
                        // Send direct link via Resend (no Supabase redirect)
                        const resend = new Resend(process.env.RESEND_API_KEY!);
                        const tokenHash = linkData.properties.hashed_token;
                        const recoveryUrl = `${siteUrl}/admin/update-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

                        await resend.emails.send({
                            from: demoSanitize('Mikrostomart <noreply@mikrostomart.pl>'),
                            to: patientEmail,
                            subject: demoSanitize('Ustaw hasło do panelu Mikrostomart'),
                            html: demoSanitize(`
                                <!DOCTYPE html>
                                <html>
                                <head><meta charset="utf-8"></head>
                                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                        <div style="background: linear-gradient(135deg, #38bdf8, #0ea5e9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                            <h1 style="color: #fff; margin: 0; font-size: 24px;">🦷 Mikrostomart</h1>
                                        </div>
                                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                                            <h2>Witaj${employeeName ? `, ${employeeName.split(' ')[0]}` : ''}!</h2>
                                            <p>Twoje konto w systemie Mikrostomart zostało aktywowane z dodatkowymi uprawnieniami.</p>
                                            <p>Aby się zalogować, najpierw ustaw hasło klikając poniższy przycisk:</p>
                                            <div style="text-align: center;">
                                                <a href="${recoveryUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #38bdf8, #0ea5e9); color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Ustaw hasło</a>
                                            </div>
                                            <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
                                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 0.85rem;">${recoveryUrl}</p>
                                            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                                                <strong>⚠️ Ważne:</strong> Link jest jednorazowy. Po ustawieniu hasła możesz się logować na <a href="${siteUrl}/pracownik/login">${siteUrl}/pracownik/login</a> lub <a href="${siteUrl}/admin">${siteUrl}/admin</a>.
                                            </div>
                                            <p>📞 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                            `)
                        });
                        console.log('[Promote] Password setup email sent to', patientEmail);
                    }
                } catch (emailError) {
                    console.error('[Promote] Failed to send password reset email:', emailError);
                    // Don't fail — account was created, just log the error
                }
            }
        }

        // Grant the requested roles
        const grantedRoles: string[] = [];
        const failedRoles: string[] = [];

        for (const role of rolesToGrant) {
            const success = await grantRole(userId, patientEmail, role, adminUser.email || 'admin');
            if (success) {
                grantedRoles.push(role);
            } else {
                failedRoles.push(role);
            }
        }

        // Auto-insert into employees table when employee role is granted
        if (grantedRoles.includes('employee')) {
            try {
                await supabase.from('employees').upsert({
                    user_id: userId,
                    email: patientEmail,
                    name: employeeName || patientEmail,
                }, { onConflict: 'email' });
                console.log(`[Promote] Upserted employee record for ${patientEmail}`);
            } catch (empError) {
                console.error('[Promote] Failed to upsert employee record:', empError);
                // Don't fail — role was granted, just log the error
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
