/**
 * SMS Settings helper — checks if a given SMS type is enabled.
 * Reads from sms_settings table in Supabase.
 * 
 * SMS Types:
 *   - noshow_followup
 *   - post_visit
 *   - week_after_visit
 *   - birthday
 *   - deposit_reminder
 * 
 * Default: enabled (if the row doesn't exist yet)
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function isSmsTypeEnabled(type: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('sms_settings')
            .select('enabled')
            .eq('id', type)
            .maybeSingle();

        if (error) {
            console.warn(`[SMS Settings] Error checking ${type}:`, error.message);
            return true; // Default: enabled on error
        }

        // If no row exists, default to enabled
        if (!data) return true;

        return data.enabled !== false;
    } catch (err) {
        console.warn(`[SMS Settings] Exception checking ${type}:`, err);
        return true; // Default: enabled on exception
    }
}
