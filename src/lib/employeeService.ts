// employeeService — wspólna logika atomic create/update pracownika.
//
// Stanowi backend dla:
//   POST   /api/admin/employees           — unified create flow (wizard)
//   PATCH  /api/admin/employees/[id]      — edycja istniejącego (rozwijany wiersz)
//   POST   /api/admin/roles/promote       — thin wrapper (backwards compat)
//
// Założenia projektowe:
//   1. Idempotentne — re-run nie psuje stanu
//   2. Bezpieczne: nigdy nie modyfikuje wiersza employees BEZ dopasowania
//      po user_id (po cleanu z migracji 120 to deterministyczne)
//   3. Powiązane tabele aktualizowane w spójnej kolejności:
//      auth.users → user_roles → employees → employment_terms (przez trigger)
//   4. Sygnalizuje izolowane awarie (np. email send) bez przerwania całości

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { grantRole, revokeRole, type UserRole } from '@/lib/roles';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_ROLES: UserRole[] = ['admin', 'employee', 'patient'];
const VALID_PUSH_GROUPS = ['doctor', 'hygienist', 'reception', 'assistant'] as const;

export interface CreateEmployeeInput {
    /** Skąd przychodzi pracownik — z Prodentis sync albo ręcznie z formularza */
    source: 'prodentis' | 'manual';
    name: string;
    email: string;
    /** Prodentis operator ID — wymagany dla source='prodentis' */
    prodentisId?: string | null;
    /** Stanowisko: 'Lekarz' / 'Higienistka' / 'Asystentka' / 'Recepcja' / 'Pracownik pomocniczy' / inne */
    position?: string | null;
    /** Role w aplikacji — domyślnie ['employee'] */
    roles?: UserRole[];
    /** Czy pojawia się w formularzu rezerwacji `/rezerwacja` */
    showInBooking?: boolean;
    /** Grupy push notifications */
    pushGroups?: string[];
    /** Wysłać email z linkiem do ustawienia hasła */
    sendPasswordReset?: boolean;
}

export interface CreateEmployeeResult {
    success: boolean;
    employeeId: string;
    userId: string;
    isNewAccount: boolean;
    isNewEmployee: boolean;
    grantedRoles: UserRole[];
    failedRoles: UserRole[];
    /** Komunikat dla admina, gotowy do alert() lub toast */
    message: string;
    /** Niekrytyczne ostrzeżenia (np. email reset się nie wysłał) */
    warnings: string[];
}

export interface UpdateEmployeeInput {
    name?: string;
    email?: string;
    position?: string | null;
    showInBooking?: boolean;
    pushGroups?: string[];
    isActive?: boolean;
    /** Pełna lista ról — funkcja policzy diff i zrobi grant/revoke */
    roles?: UserRole[];
}

export interface UpdateEmployeeResult {
    success: boolean;
    employeeId: string;
    grantedRoles: UserRole[];
    revokedRoles: UserRole[];
    warnings: string[];
    message: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function validateRoles(roles: unknown): { ok: true; value: UserRole[] } | { ok: false; error: string } {
    if (!Array.isArray(roles)) return { ok: false, error: 'roles musi być tablicą' };
    for (const r of roles) {
        if (!VALID_ROLES.includes(r as UserRole)) {
            return { ok: false, error: `Nieprawidłowa rola: ${r}` };
        }
    }
    return { ok: true, value: roles as UserRole[] };
}

function validatePushGroups(groups: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
    if (!Array.isArray(groups)) return { ok: false, error: 'pushGroups musi być tablicą' };
    for (const g of groups) {
        if (!(VALID_PUSH_GROUPS as readonly string[]).includes(g)) {
            return { ok: false, error: `Nieprawidłowa grupa push: ${g}` };
        }
    }
    return { ok: true, value: groups as string[] };
}

function validateEmail(email: unknown): { ok: true; value: string } | { ok: false; error: string } {
    if (typeof email !== 'string' || !email.includes('@') || email.length < 5) {
        return { ok: false, error: 'Wymagany poprawny adres email' };
    }
    return { ok: true, value: email.toLowerCase().trim() };
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
    const { data: users } = await supabase.auth.admin.listUsers();
    const match = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    return match?.id ?? null;
}

async function sendPasswordResetMail(email: string, employeeName: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
        });
        if (linkError || !linkData?.properties?.hashed_token) {
            return { ok: false, error: linkError?.message || 'Nie udało się wygenerować linku recovery' };
        }
        const tokenHash = linkData.properties.hashed_token;
        const recoveryUrl = `${siteUrl}/admin/update-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
        const firstName = employeeName.split(' ')[0] || '';

        await sendEmail({
            to: email,
            subject: 'Ustaw hasło do panelu Mikrostomart',
            html: demoSanitize(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #38bdf8, #0ea5e9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: #fff; margin: 0; font-size: 24px;">🦷 Mikrostomart</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
      <h2>Witaj${firstName ? `, ${firstName}` : ''}!</h2>
      <p>Twoje konto w panelu Mikrostomart zostało skonfigurowane. Aby się zalogować, ustaw hasło klikając poniższy przycisk:</p>
      <div style="text-align: center;">
        <a href="${recoveryUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #38bdf8, #0ea5e9); color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Ustaw hasło</a>
      </div>
      <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 0.85rem;">${recoveryUrl}</p>
      <p>📞 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
    </div>
  </div>
</body></html>`),
        });
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Email send failed' };
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Atomic flow:
 *   1. Walidacja inputu
 *   2. Find or create auth.users wpis dla emaila
 *   3. Grant ról w user_roles
 *   4. UPSERT employees (klucz: user_id) z position, show_in_booking, push_groups, prodentis_id
 *   5. employment_terms — automatycznie przez trigger z migracji 120
 *   6. (Optional) wyślij email z reset hasła
 */
export async function createOrUpdateEmployee(
    input: CreateEmployeeInput,
    adminEmail: string
): Promise<CreateEmployeeResult> {
    const warnings: string[] = [];

    // ── 1. Walidacja ────────────────────────────────────────────────────────
    if (!input.name || input.name.trim().length < 2) {
        throw new Error('Wymagane imię i nazwisko (min 2 znaki)');
    }
    const emailV = validateEmail(input.email);
    if (!emailV.ok) throw new Error(emailV.error);
    const email = emailV.value;

    if (input.source === 'prodentis' && !input.prodentisId) {
        throw new Error('Dla źródła prodentis wymagany prodentisId');
    }

    const requestedRoles: UserRole[] = input.roles && input.roles.length > 0 ? input.roles : ['employee'];
    const rolesV = validateRoles(requestedRoles);
    if (!rolesV.ok) throw new Error(rolesV.error);

    const pushGroups = input.pushGroups || [];
    if (pushGroups.length > 0) {
        const pgV = validatePushGroups(pushGroups);
        if (!pgV.ok) throw new Error(pgV.error);
    }

    // ── 2. Find or create auth user ─────────────────────────────────────────
    let userId = await findAuthUserByEmail(email);
    const isNewAccount = !userId;

    if (!userId) {
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
        });
        if (createErr || !newUser?.user) {
            throw new Error(`Nie udało się utworzyć konta: ${createErr?.message || 'unknown'}`);
        }
        userId = newUser.user.id;
    }

    // ── 3. Grant requested roles ────────────────────────────────────────────
    const grantedRoles: UserRole[] = [];
    const failedRoles: UserRole[] = [];
    for (const role of rolesV.value) {
        const ok = await grantRole(userId!, email, role, adminEmail);
        (ok ? grantedRoles : failedRoles).push(role);
    }

    // ── 4. UPSERT employees (klucz: user_id) ────────────────────────────────
    const { data: existingEmp } = await supabase
        .from('employees')
        .select('id, name, email, position, show_in_booking, push_groups, prodentis_id, is_active')
        .eq('user_id', userId!)
        .maybeSingle();

    const empData: Record<string, any> = {
        user_id: userId!,
        name: input.name.trim(),
        email,
        is_active: true,
    };
    if (input.position !== undefined) empData.position = input.position;
    if (input.prodentisId !== undefined) empData.prodentis_id = input.prodentisId;
    if (input.showInBooking !== undefined) {
        empData.show_in_booking = input.showInBooking;
    } else if (!existingEmp) {
        // Default dla nowych: Lekarz + Higienistka pojawiają się w bookingu
        empData.show_in_booking = input.position === 'Lekarz' || input.position === 'Higienistka';
    }
    if (pushGroups.length > 0) empData.push_groups = pushGroups;

    let employeeId: string;
    let isNewEmployee: boolean;

    if (existingEmp) {
        // Update
        employeeId = existingEmp.id;
        isNewEmployee = false;
        const { error: updateErr } = await supabase
            .from('employees')
            .update({ ...empData, updated_at: new Date().toISOString() })
            .eq('id', existingEmp.id);
        if (updateErr) {
            throw new Error(`Nie udało się zaktualizować employees: ${updateErr.message}`);
        }
    } else {
        // Insert — sprawdzamy najpierw czy nie ma osieroconego po emailu (sanity)
        const { data: byEmail } = await supabase
            .from('employees')
            .select('id, user_id')
            .eq('email', email)
            .maybeSingle();
        if (byEmail) {
            // Podłącz user_id do istniejącego wiersza (zamiast tworzyć duplikat)
            employeeId = byEmail.id;
            isNewEmployee = false;
            const { error: linkErr } = await supabase
                .from('employees')
                .update({ ...empData, updated_at: new Date().toISOString() })
                .eq('id', byEmail.id);
            if (linkErr) {
                throw new Error(`Nie udało się podłączyć user_id do employees: ${linkErr.message}`);
            }
        } else {
            const { data: inserted, error: insertErr } = await supabase
                .from('employees')
                .insert(empData)
                .select('id')
                .single();
            if (insertErr || !inserted) {
                throw new Error(`Nie udało się utworzyć employees: ${insertErr?.message || 'unknown'}`);
            }
            employeeId = inserted.id;
            isNewEmployee = true;
        }
    }
    // employment_terms zostanie utworzony automatycznie przez trigger z migracji 120

    // ── 5. (Optional) password reset email ──────────────────────────────────
    if (input.sendPasswordReset) {
        const sent = await sendPasswordResetMail(email, input.name);
        if (!sent.ok) {
            warnings.push(`Email recovery nie wysłany: ${sent.error}`);
        }
    }

    const message = isNewEmployee
        ? `Pracownik ${input.name} utworzony${isNewAccount ? ' (nowe konto)' : ' (do istniejącego konta)'}.`
        : `Pracownik ${input.name} zaktualizowany.`;

    return {
        success: true,
        employeeId,
        userId: userId!,
        isNewAccount,
        isNewEmployee,
        grantedRoles,
        failedRoles,
        message,
        warnings,
    };
}

/**
 * Edycja pojedynczego pracownika. Dotyczy:
 *   - name, email
 *   - position
 *   - show_in_booking
 *   - push_groups
 *   - is_active (toggle aktywności)
 *   - roles — funkcja zlicza diff vs aktualny stan w user_roles i robi grant/revoke
 */
export async function updateEmployee(
    employeeId: string,
    input: UpdateEmployeeInput,
    adminEmail: string
): Promise<UpdateEmployeeResult> {
    const warnings: string[] = [];

    // Pobierz aktualny stan
    const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id, user_id, email, name, position, show_in_booking, push_groups, is_active')
        .eq('id', employeeId)
        .maybeSingle();
    if (empErr || !emp) {
        throw new Error(`Pracownik nie znaleziony: ${employeeId}`);
    }

    // Walidacja
    if (input.email !== undefined) {
        const ev = validateEmail(input.email);
        if (!ev.ok) throw new Error(ev.error);
    }
    if (input.pushGroups !== undefined) {
        const pgV = validatePushGroups(input.pushGroups);
        if (!pgV.ok) throw new Error(pgV.error);
    }
    if (input.roles !== undefined) {
        const rv = validateRoles(input.roles);
        if (!rv.ok) throw new Error(rv.error);
    }

    // Update employees row
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.email !== undefined) updates.email = input.email.toLowerCase().trim();
    if (input.position !== undefined) updates.position = input.position;
    if (input.showInBooking !== undefined) updates.show_in_booking = input.showInBooking;
    if (input.pushGroups !== undefined) updates.push_groups = input.pushGroups;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    if (Object.keys(updates).length > 1) {
        const { error: updateErr } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', employeeId);
        if (updateErr) throw new Error(`Update employees: ${updateErr.message}`);
    }

    // Sync user_roles
    const grantedRoles: UserRole[] = [];
    const revokedRoles: UserRole[] = [];

    if (input.roles !== undefined && emp.user_id) {
        const desired = new Set(input.roles);
        const { data: currentRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', emp.user_id);
        const current = new Set((currentRoles || []).map(r => r.role as UserRole));

        // Grant: w desired, nie w current
        for (const role of desired) {
            if (!current.has(role)) {
                const ok = await grantRole(emp.user_id, emp.email, role, adminEmail);
                if (ok) grantedRoles.push(role);
                else warnings.push(`Nie udało się przyznać roli ${role}`);
            }
        }
        // Revoke: w current, nie w desired
        for (const role of current) {
            if (!desired.has(role)) {
                const ok = await revokeRole(emp.user_id, role);
                if (ok) revokedRoles.push(role);
                else warnings.push(`Nie udało się odebrać roli ${role}`);
            }
        }
    }

    // Synchronizuj push_subscriptions.employee_groups jeśli zmieniono push_groups
    if (input.pushGroups !== undefined && emp.user_id) {
        await supabase
            .from('push_subscriptions')
            .update({ employee_groups: input.pushGroups })
            .eq('user_id', emp.user_id)
            .eq('user_type', 'employee');
    }

    const message = input.isActive === false
        ? `Pracownik ${emp.name} dezaktywowany`
        : input.isActive === true
            ? `Pracownik ${emp.name} reaktywowany`
            : `Pracownik ${emp.name} zaktualizowany`;

    return {
        success: true,
        employeeId,
        grantedRoles,
        revokedRoles,
        warnings,
        message,
    };
}
