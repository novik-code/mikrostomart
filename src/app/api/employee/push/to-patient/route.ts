import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushToUser, PushPayload } from '@/lib/pushService';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/push/to-patient
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * Wariant `admin/push-send` dla personelu: wysyła powiadomienie push do KONKRETNEGO
 * pacjenta (identyfikowanego prodentis_id lub telefonem). `pushToUser(...,'patient')`
 * dostarcza je i na FCM (web/PWA) i na apkę mobilną pacjenta (patient_push_tokens).
 *
 * Body: { prodentis_id?, phone?, patient_name?, title, body, url? }
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: {
        prodentis_id?: string;
        phone?: string;
        patient_name?: string;
        title?: string;
        body?: string;
        url?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const { prodentis_id, phone, patient_name, title, body: pushBody, url } = body;

    if (!title || !pushBody) {
        return NextResponse.json({ error: 'Missing required fields: title, body' }, { status: 400 });
    }
    if (!prodentis_id && !phone) {
        return NextResponse.json({ error: 'Provide prodentis_id or phone' }, { status: 400 });
    }

    // Znajdź konto portalu pacjenta (patients.id = user_id dla push tokenów).
    let patientUserId: string | null = null;

    // Preferuj prodentis_id (deterministyczne).
    if (prodentis_id) {
        const { data } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', prodentis_id)
            .limit(1);
        if (data && data.length > 0) patientUserId = data[0].id;
    }

    // Fallback: telefon (wszystkie warianty formatu, jak admin/push-send).
    if (!patientUserId && phone) {
        const digits = phone.replace(/[^\d]/g, '');
        const variants: string[] = [];
        if (digits.startsWith('48') && digits.length >= 11) {
            const local = digits.slice(2);
            variants.push(digits, `+${digits}`, local);
        } else if (digits.length === 9) {
            variants.push(digits, `48${digits}`, `+48${digits}`);
        } else {
            variants.push(digits, `+${digits}`, phone.replace(/\s+/g, ''));
        }
        const orFilter = [...new Set(variants)].map((v) => `phone.eq.${v}`).join(',');
        const { data } = await supabase.from('patients').select('id').or(orFilter).limit(1);
        if (data && data.length > 0) patientUserId = data[0].id;
    }

    if (!patientUserId) {
        return NextResponse.json({
            success: false,
            error: 'Pacjent nie ma konta w Strefie Pacjenta lub aktywnego tokenu push',
        });
    }

    // Sprawdź, czy pacjent ma tokeny push (web FCM lub mobilny Expo).
    const [{ data: fcmRows }, { data: expoRows }] = await Promise.all([
        supabase.from('fcm_tokens').select('id').eq('user_id', patientUserId).eq('user_type', 'patient'),
        supabase.from('patient_push_tokens').select('id').eq('user_id', patientUserId),
    ]);
    const hasTokens = (fcmRows?.length || 0) + (expoRows?.length || 0) > 0;
    if (!hasTokens) {
        return NextResponse.json({
            success: false,
            hasAccount: true,
            hasPush: false,
            error: 'Pacjent ma konto, ale nie włączył powiadomień push',
        });
    }

    const payload: PushPayload = { title, body: pushBody, url: url || '/strefa-pacjenta/powiadomienia' };
    const pushResult = await pushToUser(patientUserId, 'patient', payload);

    // UWAGA: `pushToUser` już zapisuje wiersz do `push_notifications_log` (logPush),
    // a `sent_at` ma DEFAULT now() → wiersz jest widoczny w historii pacjenta.
    // Ręczny insert tutaj dawałby DRUGI wiersz = duplikat w historii pacjenta
    // (pre-existing bug w admin/push-send — tu świadomie NIE powielamy).
    // Metadane sent_by/devices trzymamy w audycie personelu poniżej.

    // Audyt RODO — personel wysłał push do pacjenta.
    logAudit({
        userId: auth.user.id, userEmail: auth.user.email || '',
        action: 'employee_push_to_patient', resourceType: 'patient',
        resourceId: prodentis_id || undefined,
        patientName: patient_name || undefined,
        metadata: { sent: pushResult.sent, failed: pushResult.failed },
        request: req,
    });

    return NextResponse.json({
        success: pushResult.sent > 0,
        sent: pushResult.sent,
        failed: pushResult.failed,
        message:
            pushResult.sent > 0
                ? `Push wysłany na ${pushResult.sent} urządzeń`
                : 'Push nie dotarł do żadnego urządzenia',
    });
}
