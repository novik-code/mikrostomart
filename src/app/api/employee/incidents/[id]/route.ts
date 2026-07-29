/**
 * PATCH /api/employee/incidents/[id] — przejęcie, zamknięcie, edycja wagi.
 *
 * D3: zamyka KAŻDY pracownik, ale notatka „co zrobiono" jest WYMAGANA.
 * Bramka istnieje w dwóch miejscach celowo: tutaj (czytelny komunikat po polsku)
 * oraz jako CHECK w migracji 187 (nie do ominięcia skryptem ani przyszłą trasą).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { pushToUser } from '@/lib/pushService';
import { isDemoMode } from '@/lib/demoMode';
import { resolveStaffName, SEVERITIES, type IncidentSeverity } from '@/lib/incidents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIN_NOTE = 3;

const supabase = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    let body: { action?: 'take' | 'resolve' | 'reopen' | 'severity'; note?: string; severity?: IncidentSeverity };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { data: existing } = await supabase()
        .from('incidents')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Awaria nie istnieje' }, { status: 404 });

    const name = await resolveStaffName(auth.user.id, auth.user.email ?? null);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };

    if (body.action === 'take') {
        if (existing.status !== 'reported') {
            return NextResponse.json({ error: 'Tę awarię ktoś już przejął albo jest zamknięta' }, { status: 409 });
        }
        patch.status = 'in_progress';
        patch.taken_by = auth.user.id;
        patch.taken_name = name;
        patch.taken_at = now;
    } else if (body.action === 'resolve') {
        if (existing.status === 'resolved') {
            return NextResponse.json({ error: 'Awaria jest już zamknięta' }, { status: 409 });
        }
        const note = (body.note ?? '').trim();
        if (note.length < MIN_NOTE) {
            return NextResponse.json(
                { error: 'Napisz krótko, co zrobiono — bez tego po miesiącach nie da się odróżnić nawrotu usterki od nowej.' },
                { status: 400 },
            );
        }
        patch.status = 'resolved';
        patch.resolved_by = auth.user.id;
        patch.resolver_name = name;
        patch.resolved_at = now;
        patch.resolution_note = note.slice(0, 2000);
    } else if (body.action === 'reopen') {
        // Usterka wróciła. Notatkę z poprzedniego zamknięcia ZOSTAWIAMY — to ona
        // jest dowodem, że problem nawraca, i najcenniejszą informacją serwisową.
        if (existing.status !== 'resolved') {
            return NextResponse.json({ error: 'Ta awaria nie jest zamknięta' }, { status: 409 });
        }
        patch.status = 'reported';
        patch.taken_by = null;
        patch.taken_name = null;
        patch.taken_at = null;
        patch.resolved_by = null;
        patch.resolver_name = null;
        patch.resolved_at = null;
        // ⚠️ `resolution_note` zostaje NULL-owane, bo CHECK dopuszcza notatkę wyłącznie
        // przy statusie `resolved`; treść przenosimy na koniec opisu, żeby nie zniknęła.
        patch.resolution_note = null;
        patch.description = [existing.description, existing.resolution_note ? `— poprzednio zamknięte: ${existing.resolution_note}` : null]
            .filter(Boolean)
            .join('\n')
            .slice(0, 4000) || null;
    } else if (body.action === 'severity') {
        if (!SEVERITIES.includes(body.severity as IncidentSeverity)) {
            return NextResponse.json({ error: 'Nieznana waga' }, { status: 400 });
        }
        patch.severity = body.severity;
    } else {
        return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 });
    }

    const { data, error } = await supabase()
        .from('incidents')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email ?? '',
        action: `incident_${body.action}`,
        resourceType: 'incident',
        resourceId: id,
        request,
    });

    /**
     * Zgłaszający dowiaduje się, że ktoś się zajął albo domknął jego zgłoszenie —
     * bez tego zgłaszanie usterek jest wrzucaniem kartek do pudełka.
     * Nie powiadamiamy samego siebie (najczęstszy przypadek: zgłosił i sam naprawił).
     */
    if (!isDemoMode && existing.reported_by && existing.reported_by !== auth.user.id) {
        if (body.action === 'take' || body.action === 'resolve') {
            void pushToUser(existing.reported_by, 'employee', {
                title: body.action === 'take' ? '🔧 Ktoś zajął się awarią' : '✅ Awaria zamknięta',
                body: `${name}: ${String(existing.title).slice(0, 90)}`,
                url: '/pracownik?tab=awarie',
                tag: `incident-${id}`,
                data: { type: 'incident_update', incidentId: id },
            });
        }
    }

    return NextResponse.json({ ok: true, incident: data });
}
