/**
 * PATCH /api/employee/reports/[id] — zmień status i/lub odpowiedz na zgłoszenie
 *
 * Guard: `requireEmployeeOrAdmin()`. Odpowiada każdy pracownik — ten, kto rozpoznał
 * usterkę, jest zwykle tym, kto umie ją opisać.
 *
 * 🔑 Odpowiedź jest WIDOCZNA DLA ZGŁASZAJĄCEGO (jeśli był zalogowany). To nie jest
 * notatka wewnętrzna — pisząc ją, pracownik pisze do pacjenta. Powiedziane wprost,
 * bo pole „reply" w panelu wygląda jak pole techniczne.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { resolveStaffName } from '@/lib/incidents';
import {
    closingNeedsReply,
    MAX_REPLY,
    REPORT_STATUSES,
    type ReportStatus,
} from '@/lib/appReports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: 'Brak id' }, { status: 400 });

    let body: { status?: string; reply?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Stan OBECNY jest potrzebny, bo żądanie może zmieniać sam status, sam tekst
    // albo oba — a warunek „zamknięcie wymaga odpowiedzi" dotyczy stanu WYNIKOWEGO.
    const { data: current, error: readErr } = await supabase()
        .from('app_reports')
        .select('id, status, reply')
        .eq('id', id)
        .maybeSingle();

    if (readErr) {
        console.error('[AppReports/staff] odczyt przed zapisem nieudany:', readErr.message);
        return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }
    // 🔑 404 rozdzielone od 500: „nie ma takiego zgłoszenia" to inna informacja niż
    // „zapytanie się wywróciło". Zlepienie ich ukryło już raz awarię na pięć miesięcy
    // (eksport RODO oddawał 404 także przy błędzie zapytania).
    if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const nextStatus: ReportStatus = REPORT_STATUSES.includes(body.status as ReportStatus)
        ? (body.status as ReportStatus)
        : (current.status as ReportStatus);

    const replyGiven = typeof body.reply === 'string';
    const nextReply = replyGiven
        ? body.reply!.trim().slice(0, MAX_REPLY) || null
        : ((current.reply as string | null) ?? null);

    // Lustro CHECK-a z migracji 199 — sprawdzamy TUTAJ, żeby oddać czytelny komunikat
    // zamiast surowego błędu Postgresa. Baza i tak zablokuje to niezależnie.
    if (closingNeedsReply(nextStatus, nextReply)) {
        return NextResponse.json(
            {
                error: 'reply_required',
                message: 'Zamknięcie zgłoszenia wymaga odpowiedzi — zgłaszający ją zobaczy.',
            },
            { status: 400 }
        );
    }

    const patch: Record<string, unknown> = { status: nextStatus };

    // Autora odpowiedzi stemplujemy WYŁĄCZNIE wtedy, gdy tekst realnie się zmienił.
    // Inaczej samo przełączenie statusu przepisywałoby cudzą odpowiedź na siebie.
    if (replyGiven && nextReply !== ((current.reply as string | null) ?? null)) {
        patch.reply = nextReply;
        patch.replied_by = auth.user.id;
        patch.replied_name = await resolveStaffName(auth.user.id, auth.user.email ?? null);
        patch.replied_at = new Date().toISOString();
    }

    const { data, error } = await supabase()
        .from('app_reports')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('[AppReports/staff] zapis nieudany:', error.message);
        return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    return NextResponse.json({ report: data });
}
