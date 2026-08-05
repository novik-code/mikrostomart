import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Wiersz `care_template_steps` (`select('*')`, klient Supabase jest nietypowany). */
type TemplateStepRow = {
    id: string;
    sort_order: number;
    title: string;
    description: string | null;
    icon: string | null;
    offset_hours: number;
    smart_snap: boolean | null;
    // Tryb siatki dawkowania 07/15/23 ('loading' | 'pre_op' | 'grid'). Ma PIERWSZEŃSTWO
    // przed smart_snap — termin z siatki jest kliniczny, strażnik ciszy zepchnąłby dawkę 23:00.
    dose_snap: string | null;
    push_message: string | null;
    requires_confirmation: boolean | null;
    medication_index: number | null;
    visible_hours_before: number | null;
    reminder_interval_minutes: number | null;
    reminder_max_count: number | null;
    is_recurring: boolean | null;
    recurrence_count: number | null;
    recurrence_interval_hours: number | null;
};

/**
 * GET /api/employee/careflow/templates/[id]
 * Auth: employee lub admin (Bearer OK — strefa personelu w apce).
 *
 * Protokół z pełną listą kroków — zasila podgląd „co dokładnie zaordynuje ten protokół",
 * pokazywany lekarzowi PRZED zapisaniem pacjenta. Zwraca też pola rekurencji, bo jeden
 * krok cykliczny generuje wiele zadań (recurrence_count × recurrence_interval_hours).
 * Bez filtra is_active — szablon może być wygaszony, a lekarz i tak podgląda istniejący zapis.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;
    const { id } = await params;

    const { data: template, error } = await supabase
        .from('care_templates')
        .select('id, name, description, procedure_types, default_medications, push_settings, is_active')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[CareFlow] GET employee template error:', error);
        return NextResponse.json(
            { error: 'Nie udało się pobrać protokołu' },
            { status: 500, headers: NO_STORE }
        );
    }

    if (!template) {
        return NextResponse.json({ error: 'Nie znaleziono protokołu' }, { status: 404, headers: NO_STORE });
    }

    const { data: steps, error: sErr } = await supabase
        .from('care_template_steps')
        .select('*')
        .eq('template_id', id)
        .order('sort_order', { ascending: true });

    if (sErr) {
        console.error('[CareFlow] GET employee template steps error:', sErr);
        return NextResponse.json(
            { error: 'Nie udało się pobrać protokołu' },
            { status: 500, headers: NO_STORE }
        );
    }

    logAudit({
        userId: auth.user.id, userEmail: auth.user.email || '',
        action: 'view_careflow_template', resourceType: 'careflow_template',
        resourceId: id,
        metadata: { templateName: template.name, stepCount: (steps || []).length },
        request: req,
    });

    return NextResponse.json({
        template: {
            id: template.id,
            name: template.name,
            description: template.description || '',
            procedureTypes: template.procedure_types || [],
            defaultMedications: template.default_medications || [],
            pushSettings: template.push_settings || {},
            isActive: template.is_active,
            steps: ((steps || []) as TemplateStepRow[]).map((s) => ({
                id: s.id,
                sortOrder: s.sort_order,
                title: s.title,
                description: s.description || '',
                icon: s.icon,
                offsetHours: s.offset_hours,
                smartSnap: s.smart_snap,
                // 🔴 BRAKOWAŁO TEGO POLA. Apka ma FORK planisty, który rysuje lekarzowi podgląd
                // ordynacji przed akceptacją i czyta `s.doseSnap ?? s.dose_snap`. Bez tego liczyła
                // godziny BEZ siatki dawkowania — podgląd rozjeżdżał się z tym, co realnie wygeneruje
                // serwer (do 3-4 h), dla WSZYSTKICH protokołów z migracji 185. Lekarz odrzucałby
                // poprawne propozycje. Wykryte 2026-08-05.
                doseSnap: s.dose_snap,
                pushMessage: s.push_message || '',
                requiresConfirmation: s.requires_confirmation,
                medicationIndex: s.medication_index,
                visibleHoursBefore: s.visible_hours_before,
                reminderIntervalMinutes: s.reminder_interval_minutes,
                reminderMaxCount: s.reminder_max_count,
                isRecurring: s.is_recurring,
                recurrenceCount: s.recurrence_count,
                recurrenceIntervalHours: s.recurrence_interval_hours,
            })),
        },
    }, { headers: NO_STORE });
}
