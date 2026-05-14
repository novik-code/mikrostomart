import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { demoSanitize } from '@/lib/brandConfig';
import { requireAdmin } from '@/lib/authGuards';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Destination allowlist for short_links created via HTTP.
 *
 * The threat: without auth and validation, anyone could POST to this endpoint
 * and create `mikrostomart.pl/s/<code>` redirecting to phishing-site.com. The
 * short URL carries the mikrostomart domain's trust into SMS/email — a clean
 * vector for phishing patients.
 *
 * Allow:
 *   - Internal relative paths starting with `/<lowercase>` (e.g. /wizyta/abc,
 *     /api/appointments/confirm). Excludes absolute URLs and protocol-relative.
 *   - Explicit external hosts the clinic legitimately links to from comms
 *     (publishing partners, academic sites). Curated list — anything outside
 *     it returns 400.
 *
 * Note: the SMS cron itself inserts into `short_links` table directly via
 * Supabase service role (not through this HTTP endpoint), so this guard does
 * NOT affect SMS reminder generation. It only constrains ad-hoc / admin /
 * malicious HTTP callers.
 */
const EXTERNAL_DESTINATION_ALLOWLIST = [
    'mikrostomart.pl',
    'www.mikrostomart.pl',
    'demo.densflow.ai',
    'densflow.ai',
    'czelej.com.pl',
    'laserandhealthacademy.com',
    'magazyn-stomatologiczny.pl',
];

function isAllowedDestination(url: string): boolean {
    if (typeof url !== 'string' || url.length === 0) return false;
    // Internal: must start with `/<letter>` and not contain protocol or `//`.
    if (/^\/[a-z]/i.test(url) && !url.includes('://')) return true;
    // External: parse and check hostname against allowlist.
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        return EXTERNAL_DESTINATION_ALLOWLIST.includes(parsed.hostname.toLowerCase());
    } catch {
        return false;
    }
}

/**
 * POST /api/short-links
 *
 * Create a short link for appointment landing pages. Admin-only.
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { destinationUrl, appointmentId, patientId, appointmentType, expiresInDays } = await req.json();

        if (!destinationUrl) {
            return NextResponse.json(
                { error: 'Missing destinationUrl' },
                { status: 400 }
            );
        }

        if (!isAllowedDestination(destinationUrl)) {
            console.warn(`[SHORT-LINKS] Rejected destination ${destinationUrl} from ${auth.user.email}`);
            return NextResponse.json(
                { error: 'Destination URL is not on the allowlist. Use internal path or a whitelisted external host.' },
                { status: 400 }
            );
        }

        // Generate short code (6 characters, URL-safe)
        const shortCode = nanoid(6);

        // Calculate expiration date
        let expiresAt = null;
        if (expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        // Insert into database
        const { data, error } = await supabase
            .from('short_links')
            .insert({
                short_code: shortCode,
                destination_url: destinationUrl,
                appointment_id: appointmentId || null,
                patient_id: patientId || null,
                appointment_type: appointmentType || null,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (error) {
            console.error('[SHORT-LINKS] Insert error:', error);
            throw error;
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || demoSanitize('https://www.mikrostomart.pl');
        const shortUrl = `${baseUrl}/s/${shortCode}`;

        return NextResponse.json({
            success: true,
            shortCode,
            shortUrl,
            destinationUrl,
            expiresAt
        });

    } catch (error) {
        console.error('[SHORT-LINKS] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
