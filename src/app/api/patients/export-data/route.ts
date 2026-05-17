import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { demoSanitize } from '@/lib/brandConfig';
import { getUserAIConversations } from '@/lib/aiConversationLog';

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

        // S8-4: AI conversations (per policy §11)
        const aiConversations = await getUserAIConversations(payload.userId);

        // S8-4: SMS reminders sent to this patient (by phone match)
        let smsReminders: any[] = [];
        if (patient.phone) {
            const { data: sms } = await supabase
                .from('sms_reminders')
                .select('id, patient_name, doctor_name, appointment_date, appointment_time, appointment_type, sms_message, status, sent_at, created_at')
                .eq('patient_phone', patient.phone)
                .order('created_at', { ascending: false });
            smsReminders = sms || [];
        }

        // S8-4: Intake submissions (e-karta) — link by prodentis_id
        let intakeSubmissions: any[] = [];
        if (patient.prodentis_id) {
            const { data: intake } = await supabase
                .from('patient_intake_submissions')
                .select('id, first_name, last_name, pesel, birth_date, gender, street, postal_code, city, phone, email, marketing_consent, contact_consent, rodo_consent, medical_notes, submitted_at, pdf_url')
                .eq('prodentis_patient_id', patient.prodentis_id)
                .order('submitted_at', { ascending: false });
            intakeSubmissions = intake || [];
        }

        // S8-4: Patient consents — signed PDFs
        let patientConsents: any[] = [];
        if (patient.prodentis_id) {
            const { data: consents } = await supabase
                .from('patient_consents')
                .select('id, consent_type, consent_label, file_url, signed_at, prodentis_synced')
                .eq('prodentis_patient_id', patient.prodentis_id)
                .order('signed_at', { ascending: false });
            patientConsents = consents || [];
        }

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
            // S8-4 additions (RODO Art. 15 — right of access full export)
            aiConversations: aiConversations || [],
            smsReminders: smsReminders,
            intakeSubmissions: intakeSubmissions,
            patientConsents: patientConsents,
            _note: 'Pełna lista podpisanych PDF zgód jest dostępna w sekcji "Moje dokumenty" w Strefie Pacjenta. URL-e w polu patientConsents.file_url prowadzą do zaszyfrowanych pików w Supabase Storage (signed URLs ważne 1h od pobrania).',
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
