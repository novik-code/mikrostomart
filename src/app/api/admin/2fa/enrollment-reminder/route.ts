import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { requireAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { brand } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { mfaEnrollmentHtml, mfaEnrollmentSubject } from '@/lib/mfaEnrollmentEmail';
import { MFA_DEADLINE_LABEL_PL, daysUntilMfaDeadline } from '@/lib/mfaPolicy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/2fa/enrollment-reminder
 *
 * Wysyła zespołowi wezwanie do włączenia 2FA przed terminem (1 września 2026).
 * Odbiorcy wyliczani ZAWSZE na bieżąco: aktywni pracownicy z adresem e-mail
 * i `totp_enabled = false`. Nie ma listy do utrzymywania — kto się skonfiguruje,
 * ten sam wypada z kolejnych przypomnień.
 *
 * Ciało (opcjonalne): `{ "dryRun": true }` — zwraca listę odbiorców i podgląd
 * tematu, NIE wysyłając niczego.
 *
 * 🔑 `dryRun` jest domyślnie… wyłączony, ale istnieje z konkretnego powodu: to jedyna
 * wysyłka w systemie, która idzie do WSZYSTKICH pracowników naraz. Pomyłka w zapytaniu
 * (np. zgubione `totp_enabled = false`) oznacza mail do osób, które już to zrobiły —
 * a taki mail podkopuje wiarygodność następnych. Najpierw `dryRun`, potem wysyłka.
 *
 * ⚠️ Trasa NIE tworzy żadnego tokenu aktywacyjnego i nie może — link włączający drugi
 * składnik bez logowania byłby drogą do przejęcia konta. Mail prowadzi do panelu,
 * a konfiguracja wymaga hasła.
 */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    let dryRun = false;
    try {
        const body = await request.json();
        dryRun = body?.dryRun === true;
    } catch {
        // brak ciała = normalna wysyłka
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: rows, error } = await admin
        .from('employees')
        .select('id, name, email, totp_enabled, is_active')
        .eq('is_active', true)
        .eq('totp_enabled', false);

    if (error) {
        // 🔑 Fail-closed: przy błędzie odczytu NIE wysyłamy „na wszelki wypadek" do nikogo.
        // supabase-js nie rzuca, więc bez tego warunku poszłaby pusta pętla i cichy sukces.
        console.error('[2FA reminder] odczyt pracowników padł:', error.message);
        return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    const targets = (rows ?? []).filter((r) => typeof r.email === 'string' && r.email.includes('@'));
    const skippedNoEmail = (rows ?? []).length - targets.length;

    if (dryRun) {
        return NextResponse.json({
            ok: true,
            dryRun: true,
            deadline: MFA_DEADLINE_LABEL_PL,
            daysLeft: daysUntilMfaDeadline(),
            subject: mfaEnrollmentSubject(),
            recipients: targets.map((r) => ({ name: r.name, email: r.email })),
            skippedNoEmail,
        });
    }

    const results: { email: string; ok: boolean; error?: string }[] = [];
    for (const r of targets) {
        // Imię z pola `name` („Jan Kowalski" → „Jan”); puste = neutralne powitanie.
        const firstName = String(r.name ?? '').trim().split(/\s+/)[0] || undefined;
        const res = await sendEmail({
            to: r.email as string,
            subject: mfaEnrollmentSubject(),
            html: mfaEnrollmentHtml(firstName),
            // Decyzja właściciela: nadawcą jest gabinet@, nie noreply@ — na tę wiadomość
            // ludzie będą chcieli odpisać.
            from: brand.email,
            replyTo: brand.email,
        });
        results.push({ email: r.email as string, ok: res.success, error: res.error });
    }

    const sent = results.filter((x) => x.ok).length;
    const failed = results.length - sent;

    await logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email ?? '',
        action: 'send_2fa_enrollment_reminder',
        resourceType: 'employees',
        metadata: { sent, failed, skippedNoEmail, deadline: MFA_DEADLINE_LABEL_PL },
        request,
    });

    return NextResponse.json({ ok: true, sent, failed, skippedNoEmail, results });
}
