import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { demoSanitize } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/patients/export-data
 * RODO: Returns all patient data as a JSON download
 */
export async function GET(request: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
        }

        // Fetch patient data from Supabase
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, first_name, last_name, phone, email, locale, account_status, prodentis_id, created_at, last_login')
            .eq('id', payload.userId)
            .single();

        if (patientError || !patient) {
            console.error('[ExportData] Patient fetch error:', patientError, 'userId:', payload.userId);
            return NextResponse.json({ error: 'Nie znaleziono danych' }, { status: 404 });
        }

        // Try to fetch notification_preferences separately (column may not exist yet)
        let notificationPreferences = null;
        try {
            const { data: notifData } = await supabase
                .from('patients')
                .select('notification_preferences')
                .eq('id', payload.userId)
                .single();
            if (notifData) notificationPreferences = notifData.notification_preferences;
        } catch { /* column may not exist */ }

        // Fetch chat messages
        const { data: messages } = await supabase
            .from('patient_chat_messages')
            .select('id, content, sender, created_at')
            .eq('patient_id', payload.userId)
            .order('created_at', { ascending: true });

        // Fetch appointment actions
        const { data: appointments } = await supabase
            .from('patient_appointment_actions')
            .select('*')
            .eq('patient_id', payload.userId)
            .order('created_at', { ascending: false });

        // Fetch online bookings
        const { data: bookings } = await supabase
            .from('online_bookings')
            .select('*')
            .eq('patient_id', payload.userId)
            .order('created_at', { ascending: false });

        // Build export
        const exportData = {
            exportDate: new Date().toISOString(),
            exportType: 'RODO_DATA_EXPORT',
            patient: {
                id: patient.id,
                firstName: patient.first_name,
                lastName: patient.last_name,
                phone: patient.phone,
                email: patient.email,
                locale: patient.locale,
                accountStatus: patient.account_status,
                createdAt: patient.created_at,
                lastLogin: patient.last_login,
                notificationPreferences: notificationPreferences,
            },
            chatMessages: messages || [],
            appointments: appointments || [],
            onlineBookings: bookings || [],
        };

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${demoSanitize("moje-dane-mikrostomart")}-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (err) {
        console.error('[ExportData] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}
