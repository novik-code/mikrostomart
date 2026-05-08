// Helper: pobranie rekordu employees dla zalogowanego user_id (auth.users)
// Używane w API /api/time/scan + /api/time/status

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export interface EmployeeContext {
    id: string;
    user_id: string;
    name: string;
    email: string;
    position: string | null;
    prodentis_id: string | null;
    is_active: boolean;
}

/**
 * Zwraca rekord employees dla auth user_id, wymaga is_active = true.
 * Zwraca null gdy pracownik nieaktywny lub nie istnieje.
 */
export async function getEmployeeByAuthUserId(userId: string): Promise<EmployeeContext | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('employees')
        .select('id, user_id, name, email, position, prodentis_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        console.error('[timeTracking] getEmployeeByAuthUserId error:', error);
        return null;
    }
    return data as EmployeeContext | null;
}
