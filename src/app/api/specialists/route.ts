import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';

// Fallback list — used when DB has no bookable specialists yet (safety net during migration)
const FALLBACK_PROD_SPECIALISTS = [
    { id: 'marcin',     name: 'lek. dent. Marcin Nowosielski',        role: 'doctor',    durationMin: 30 },
    { id: 'ilona',      name: 'lek. dent. Ilona Piechaczek',          role: 'doctor',    durationMin: 30 },
    { id: 'katarzyna',  name: 'lek. dent. Katarzyna Hałupczok',       role: 'doctor',    durationMin: 30 },
    { id: 'dominika',   name: 'lek. dent. Dominika Milicz',           role: 'doctor',    durationMin: 30 },
    { id: 'malgorzata', name: 'hig. stom. Małgorzata Maćków-Huras',   role: 'hygienist', durationMin: 60 },
];

const FALLBACK_DEMO_SPECIALISTS = [
    { id: 'jan',           name: 'lek. dent. Jan Kowalski',      role: 'doctor',    durationMin: 30 },
    { id: 'anna',          name: 'lek. dent. Anna Nowak',        role: 'doctor',    durationMin: 30 },
    { id: 'piotr',         name: 'lek. dent. Piotr Wiśniewski', role: 'doctor',    durationMin: 30 },
    { id: 'maria',         name: 'lek. dent. Maria Zielińska',   role: 'doctor',    durationMin: 30 },
    { id: 'katarzyna-demo', name: 'hig. stom. Katarzyna Wójcik', role: 'hygienist', durationMin: 60 },
];

/**
 * GET /api/specialists
 * Returns the list of specialists available in the booking form.
 * Source: employees.show_in_booking = true (DB-driven, per-tenant).
 * Falls back to hardcoded list if DB returns empty (safety net).
 * No auth required — public endpoint (only returns name + role, no PII).
 */
export async function GET() {
    // Demo mode: always return demo specialists without a DB call
    if (isDemoMode) {
        return NextResponse.json({ specialists: FALLBACK_DEMO_SPECIALISTS, source: 'demo' });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data, error } = await supabase
            .from('employees')
            .select('id, name, prodentis_id, booking_role, booking_duration_minutes')
            .eq('show_in_booking', true)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('[Specialists] DB error, using fallback:', error.message);
            return NextResponse.json({ specialists: FALLBACK_PROD_SPECIALISTS, source: 'fallback_db_error' });
        }

        if (!data || data.length === 0) {
            // DB not yet seeded — use fallback until migration runs
            console.warn('[Specialists] No bookable specialists in DB, using fallback');
            return NextResponse.json({ specialists: FALLBACK_PROD_SPECIALISTS, source: 'fallback_empty' });
        }

        // Deduplicate by prodentis_id — Prodentis auto-scan can create multiple
        // employee rows for the same doctor (one manual + one auto-created)
        const seen = new Set<string>();
        const specialists = data
            .filter((emp) => {
                const key = emp.prodentis_id || emp.id;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map((emp) => ({
                id: emp.prodentis_id || emp.id,
                dbId: emp.id,
                name: emp.name,
                role: emp.booking_role || 'doctor',
                durationMin: emp.booking_duration_minutes || 30,
            }));

        return NextResponse.json({ specialists, source: 'db' });
    } catch (err: any) {
        console.error('[Specialists] Unexpected error, using fallback:', err.message);
        return NextResponse.json({ specialists: FALLBACK_PROD_SPECIALISTS, source: 'fallback_exception' });
    }
}
