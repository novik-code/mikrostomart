// Service do operacji na work_locations.
// Sekrety lokalizacji NIGDY nie wychodzą poza ten plik (server-side).

import { createClient } from '@supabase/supabase-js';
import type { WorkLocation } from './types';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

/**
 * Zwraca primary location (podstawową lokalizację kliniki).
 * Tworzy ją gdy nie istnieje (defensive — w prod migracja 113 ją zaseeduje).
 */
export async function getPrimaryLocation(): Promise<WorkLocation | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('work_locations')
        .select('*')
        .eq('is_primary', true)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        console.error('[timeTracking] getPrimaryLocation error:', error);
        return null;
    }
    return data as WorkLocation | null;
}

export async function getLocationById(id: string): Promise<WorkLocation | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('work_locations')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        console.error('[timeTracking] getLocationById error:', error);
        return null;
    }
    return data as WorkLocation | null;
}
