/**
 * GET  /api/employee/incidents?status=  — lista awarii
 * POST /api/employee/incidents          — zgłoszenie nowej
 *
 * Guard: `requireEmployeeOrAdmin()` (Bearer-first) — awarie widzi i zgłasza
 * każdy pracownik. To jest cel funkcji: żeby cały zespół był świadom problemu.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { pushToGroups } from '@/lib/pushService';
import { recordPushPath } from '@/lib/pushHealth';
import { isDemoMode } from '@/lib/demoMode';
import {
    MAX_PHOTOS_PER_INCIDENT,
    resolveStaffName,
    SEVERITIES,
    STATUSES,
    type IncidentSeverity,
    type IncidentStatus,
} from '@/lib/incidents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

export async function GET(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const status = new URL(request.url).searchParams.get('status');
    let q = supabase().from('incidents').select('*').order('created_at', { ascending: false });
    if (status && STATUSES.includes(status as IncidentStatus)) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ incidents: data ?? [] });
}

export async function POST(request: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    let body: {
        title?: string;
        description?: string | null;
        location?: string | null;
        severity?: IncidentSeverity;
        photoPaths?: string[];
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const title = (body.title ?? '').trim();
    if (!title) return NextResponse.json({ error: 'Tytuł jest wymagany' }, { status: 400 });

    const severity: IncidentSeverity = SEVERITIES.includes(body.severity as IncidentSeverity)
        ? (body.severity as IncidentSeverity)
        : 'hinders';

    // Zdjęcia trafiły już do bucketa osobną trasą; tutaj tylko przypinamy ścieżki.
    const photoPaths = Array.isArray(body.photoPaths)
        ? body.photoPaths.filter((p) => typeof p === 'string').slice(0, MAX_PHOTOS_PER_INCIDENT)
        : [];

    const reporterName = await resolveStaffName(auth.user.id, auth.user.email ?? null);

    const { data, error } = await supabase()
        .from('incidents')
        .insert({
            title: title.slice(0, 200),
            description: (body.description ?? null)?.toString().trim().slice(0, 4000) || null,
            location: (body.location ?? null)?.toString().trim().slice(0, 120) || null,
            severity,
            status: 'reported',
            photo_paths: photoPaths,
            reported_by: auth.user.id,
            reporter_name: reporterName,
        })
        .select('*')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void logAudit({
        userId: auth.user.id,
        userEmail: auth.user.email ?? '',
        action: 'create_incident',
        resourceType: 'incident',
        resourceId: data.id,
        metadata: { severity, hasPhotos: photoPaths.length > 0 },
        request,
    });

    /**
     * D2 — PUSH ZALEŻY OD WAGI.
     *
     * Tylko `blocking` budzi cały zespół. Niższe wagi zostają cichym wpisem
     * (licznik w apce), bo ogłoszenie z automatycznym pushem do kilkunastu osób
     * zamienia się w hałas — ludzie wyciszają kanał i prawdziwe alarmy przestają
     * docierać. To ta sama decyzja co przy kanale czatu zespołu.
     *
     * `alsoApp` — bez tego `pushToGroups` idzie wyłącznie web-pushem FCM i nie ma
     * ŻADNEJ drogi na telefon.
     */
    if (!isDemoMode && severity === 'blocking') {
        const where = data.location ? ` (${String(data.location).slice(0, 40)})` : '';
        void pushToGroups(
            ['admin', 'doctors', 'hygienists', 'reception', 'assistant'],
            {
                title: '🚨 Awaria blokuje gabinet',
                body: `${reporterName}: ${title.slice(0, 90)}${where}`,
                url: '/pracownik?tab=awarie',
                tag: `incident-${data.id}`,
                data: { type: 'incident_new', incidentId: data.id },
            },
            { alsoApp: true },
        )
            .then((res) => void recordPushPath('incident_blocking', { sent: res.sent, failed: res.failed }))
            .catch((err) => console.error('[incidents] push nieudany:', err));
    }

    return NextResponse.json({ ok: true, incident: data }, { status: 201 });
}
