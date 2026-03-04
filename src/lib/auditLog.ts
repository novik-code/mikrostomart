import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Logs an employee action for GDPR audit compliance.
 * Non-blocking — errors are logged but don't interrupt the request.
 */
export async function logAudit(params: {
    userId: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    patientName?: string;
    metadata?: Record<string, unknown>;
    request?: Request;
}) {
    try {
        const ipAddress = params.request?.headers.get('x-forwarded-for')
            || params.request?.headers.get('x-real-ip')
            || null;
        const userAgent = params.request?.headers.get('user-agent') || null;

        await supabase.from('employee_audit_log').insert({
            user_id: params.userId,
            user_email: params.userEmail,
            action: params.action,
            resource_type: params.resourceType,
            resource_id: params.resourceId || null,
            patient_name: params.patientName || null,
            metadata: params.metadata || {},
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    } catch (err) {
        // Non-blocking — don't fail the request due to audit logging
        console.error('[AuditLog] Failed to log:', err);
    }
}

/**
 * Validates password strength for employee accounts.
 * Returns null if valid, or error message string if invalid.
 */
export function validatePasswordStrength(password: string): string | null {
    if (password.length < 8) return 'Hasło musi mieć minimum 8 znaków';
    if (!/[A-Z]/.test(password)) return 'Hasło musi zawierać przynajmniej jedną wielką literę';
    if (!/[0-9]/.test(password)) return 'Hasło musi zawierać przynajmniej jedną cyfrę';
    if (!/[a-z]/.test(password)) return 'Hasło musi zawierać przynajmniej jedną małą literę';
    return null;
}
