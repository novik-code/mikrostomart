import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/short-links
 * 
 * Create a short link for appointment landing pages
 */
export async function POST(req: NextRequest) {
    try {
        const { destinationUrl, appointmentId, patientId, appointmentType, expiresInDays } = await req.json();

        if (!destinationUrl) {
            return NextResponse.json(
                { error: 'Missing destinationUrl' },
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

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mikrostomart.pl';
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
