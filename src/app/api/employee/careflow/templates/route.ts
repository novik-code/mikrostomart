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

/** Wiersz `care_templates` w zakresie pól wybranych niżej (klient Supabase jest nietypowany). */
type TemplateRow = {
    id: string;
    name: string;
    description: string | null;
    procedure_types: string[] | null;
    default_medications: unknown[] | null;
    push_settings: Record<string, unknown> | null;
    is_active: boolean;
    care_template_steps?: { count: number }[] | null;
};

/**
 * GET /api/employee/careflow/templates
 * Auth: employee lub admin (Bearer OK — strefa personelu w apce).
 *
 * Lista protokołów CareFlow dla personelu. Świadomie NOWA trasa zamiast poszerzania
 * guarda `/api/admin/careflow/templates` (tam zostaje requireAdmin): węższy zestaw pól
 * — bez `created_by`/`created_at` — i tylko aktywne szablony, bo personel wybiera
 * protokół do zaordynowania, a nie zarządza katalogiem.
 */
export async function GET(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const { data, error } = await supabase
        .from('care_templates')
        .select('id, name, description, procedure_types, default_medications, push_settings, is_active, care_template_steps(count)')
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('[CareFlow] GET employee templates error:', error);
        return NextResponse.json(
            { error: 'Nie udało się pobrać protokołów' },
            { status: 500, headers: NO_STORE }
        );
    }

    const templates = ((data || []) as TemplateRow[]).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        procedureTypes: t.procedure_types || [],
        defaultMedications: t.default_medications || [],
        pushSettings: t.push_settings || {},
        stepCount: t.care_template_steps?.[0]?.count || 0,
        isActive: t.is_active,
    }));

    logAudit({
        userId: auth.user.id, userEmail: auth.user.email || '',
        action: 'view_careflow_templates', resourceType: 'careflow_template',
        metadata: { count: templates.length },
        request: req,
    });

    return NextResponse.json({ templates }, { headers: NO_STORE });
}
