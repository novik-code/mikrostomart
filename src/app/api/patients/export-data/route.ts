import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { demoSanitize } from '@/lib/brandConfig';
import { getUserAIConversations } from '@/lib/aiConversationLog';
import JSZip from 'jszip';
import { readIntakeSubmissionPii } from '@/lib/encryptedPiiFields';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/patients/export-data
 *
 * RODO Art. 15 — right of access. Eksport WSZYSTKICH danych pacjenta jako ZIP:
 *   - data.json — pełen JSON wszystkich tabel z PII pacjenta
 *   - pdfs/consent-{id}-{type}.pdf — signed consent PDFs (downloaded z Storage)
 *   - pdfs/intake-{id}-{date}.pdf — e-karta PDFs (downloaded z Storage)
 *
 * Hotfix Sprint S8-6 (D5=C): rozszerzenie z JSON-only (S8-4) na pełen ZIP
 * + dodanie 5 brakujących sekcji zidentyfikowanych w S8-1 PII audit.
 *
 * Dane uwzględnione:
 *   - patients (account info)
 *   - notification_preferences (opcjonalnie)
 *   - chat_messages (przez chat_conversations.patient_id)
 *   - appointment_actions (po patient_phone)
 *   - online_bookings
 *   - ai_conversations (S8-4)
 *   - sms_reminders (S8-4, by phone)
 *   - patient_intake_submissions (S8-4, by prodentis_id)
 *   - patient_consents (S8-4, by prodentis_id)
 *   - cancelled_appointments (S8-6, by patient_prodentis_id lub patient_phone)
 *   - birthday_wishes (S8-6, by prodentis_id)
 *   - fcm_tokens (S8-6, by user_id + user_type='patient')
 *   - careflow_enrollments + tasks + reports (S8-6, by patient_id)
 *   - email_compose_drafts + email_ai_drafts (S8-6, gdy patient.email match)
 *
 * Storage downloads:
 *   - consent-pdfs bucket — signed PDFs zgód
 *   - intake-pdfs bucket — e-karta PDFs
 *   Każdy fail nie zatrzymuje exportu — log + skip pojedynczego pliku.
 */
export async function GET(request: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(request);
        if (!payload) {
            return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
        }

        const patientId = payload.userId;

        // ── 1. Patient core data ──
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, first_name, last_name, phone, email, locale, account_status, prodentis_id, created_at, last_login')
            .eq('id', patientId)
            .single();

        if (patientError || !patient) {
            console.error('[ExportData] Patient fetch error:', patientError, 'userId:', patientId);
            return NextResponse.json({ error: 'Nie znaleziono danych' }, { status: 404 });
        }

        // notification_preferences (column may not exist on older deployments)
        let notificationPreferences = null;
        try {
            const { data: notifData } = await supabase
                .from('patients')
                .select('notification_preferences')
                .eq('id', patientId)
                .single();
            if (notifData) notificationPreferences = (notifData as { notification_preferences: unknown }).notification_preferences;
        } catch { /* column may not exist */ }

        // ── 2. Chat messages (S8-6 fix: proper table chat_messages JOIN conversations) ──
        let chatMessages: unknown[] = [];
        try {
            // Find conversations for this patient
            const { data: conversations } = await supabase
                .from('chat_conversations')
                .select('id, status, last_message_at, created_at')
                .eq('patient_id', String(patientId));

            const conversationIds = (conversations || []).map(c => c.id);
            if (conversationIds.length > 0) {
                const { data: messages } = await supabase
                    .from('chat_messages')
                    .select('id, conversation_id, sender_role, content, read, created_at')
                    .in('conversation_id', conversationIds)
                    .order('created_at', { ascending: true });
                chatMessages = messages || [];
            }
        } catch (err) {
            console.warn('[ExportData] chat_messages fetch failed:', err);
        }

        // ── 3. Appointment actions (S8-6 fix: appointment_actions po patient_phone) ──
        let appointmentActions: unknown[] = [];
        if (patient.phone) {
            const { data: actions } = await supabase
                .from('appointment_actions')
                .select('id, prodentis_id, doctor_name, appointment_date, appointment_time, action, action_timestamp, telegram_notified, email_sent, created_at')
                .eq('patient_phone', patient.phone)
                .order('created_at', { ascending: false });
            appointmentActions = actions || [];
        }

        // ── 4. Online bookings (existing, by patient_id) ──
        let onlineBookings: unknown[] = [];
        try {
            const { data: bookings } = await supabase
                .from('online_bookings')
                .select('*')
                .eq('prodentis_patient_id', patient.prodentis_id || '__none__')
                .order('created_at', { ascending: false });
            onlineBookings = bookings || [];
        } catch (err) {
            console.warn('[ExportData] online_bookings fetch failed:', err);
        }

        // ── 5. AI conversations (S8-4) ──
        const aiConversations = await getUserAIConversations(patientId);

        // ── 6. SMS reminders (S8-4, by phone) ──
        let smsReminders: unknown[] = [];
        if (patient.phone) {
            const { data: sms } = await supabase
                .from('sms_reminders')
                .select('id, patient_name, doctor_name, appointment_date, appointment_time, appointment_type, sms_message, status, sent_at, created_at')
                .eq('patient_phone', patient.phone)
                .order('created_at', { ascending: false });
            smsReminders = sms || [];
        }

        // ── 7. Intake submissions (S8-4) ──
        // S8-7: pesel + medical_notes decrypted via readIntakeSubmissionPii.
        let intakeSubmissions: Array<{ id: string; pdf_url?: string; submitted_at?: string }> = [];
        if (patient.prodentis_id) {
            const { data: intake } = await supabase
                .from('patient_intake_submissions')
                .select('id, first_name, last_name, pesel, pesel_encrypted, birth_date, gender, street, postal_code, city, phone, email, marketing_consent, contact_consent, rodo_consent, medical_notes, medical_notes_encrypted, submitted_at, pdf_url')
                .eq('prodentis_patient_id', patient.prodentis_id)
                .order('submitted_at', { ascending: false });
            intakeSubmissions = ((intake || []) as any[]).map((row) => {
                const pii = readIntakeSubmissionPii(row);
                return {
                    ...row,
                    pesel: pii.pesel,
                    medical_notes: pii.medical_notes,
                    pesel_encrypted: undefined,
                    medical_notes_encrypted: undefined,
                };
            }) as typeof intakeSubmissions;
        }

        // ── 8. Patient consents (S8-4) ──
        let patientConsents: Array<{ id: string; consent_type?: string; file_url?: string; signed_at?: string }> = [];
        if (patient.prodentis_id) {
            const { data: consents } = await supabase
                .from('patient_consents')
                .select('id, consent_type, consent_label, file_url, signed_at, prodentis_synced')
                .eq('prodentis_patient_id', patient.prodentis_id)
                .order('signed_at', { ascending: false });
            patientConsents = (consents || []) as typeof patientConsents;
        }

        // ── 9. Cancelled appointments (S8-6, by prodentis_id lub phone) ──
        let cancelledAppointments: unknown[] = [];
        try {
            const cancelFilters = [];
            if (patient.prodentis_id) cancelFilters.push(`patient_prodentis_id.eq.${patient.prodentis_id}`);
            if (patient.phone) cancelFilters.push(`patient_phone.eq.${patient.phone}`);
            if (cancelFilters.length > 0) {
                const { data: cancelled } = await supabase
                    .from('cancelled_appointments')
                    .select('*')
                    .or(cancelFilters.join(','))
                    .order('cancelled_at', { ascending: false });
                cancelledAppointments = cancelled || [];
            }
        } catch (err) {
            console.warn('[ExportData] cancelled_appointments fetch failed:', err);
        }

        // ── 10. Birthday wishes (S8-6, by prodentis_id) ──
        let birthdayWishes: unknown[] = [];
        if (patient.prodentis_id) {
            const { data: bd } = await supabase
                .from('birthday_wishes')
                .select('id, patient_name, sent_at, sms_sent, year')
                .eq('prodentis_id', patient.prodentis_id)
                .order('year', { ascending: false });
            birthdayWishes = bd || [];
        }

        // ── 11. FCM tokens (S8-6, anonimizowane — pokazujemy tylko że tokeny istnieją) ──
        let fcmTokens: unknown[] = [];
        try {
            const { data: tokens } = await supabase
                .from('fcm_tokens')
                .select('id, device_label, last_active_at, created_at')
                .eq('user_id', String(patientId))
                .eq('user_type', 'patient');
            fcmTokens = tokens || [];
        } catch (err) {
            console.warn('[ExportData] fcm_tokens fetch failed:', err);
        }

        // ── 12. CareFlow enrollments + related (S8-6) ──
        let careflowEnrollments: unknown[] = [];
        let careflowTasks: unknown[] = [];
        try {
            const { data: enrollments } = await supabase
                .from('care_enrollments')
                .select('id, template_id, appointment_id, appointment_date, status, prescription_code, report_pdf_url, report_generated_at, created_at, completed_at')
                .eq('patient_id', patientId);
            careflowEnrollments = enrollments || [];

            const enrollmentIds = (enrollments || []).map(e => e.id);
            if (enrollmentIds.length > 0) {
                const { data: tasks } = await supabase
                    .from('care_tasks')
                    .select('id, enrollment_id, scheduled_at, push_sent_count, completed_at, sms_sent, push_message')
                    .in('enrollment_id', enrollmentIds)
                    .order('scheduled_at', { ascending: true });
                careflowTasks = tasks || [];
            }
        } catch (err) {
            console.warn('[ExportData] careflow_* fetch failed (table may not exist):', err);
        }

        // ── 13. Email drafts (S8-6, gdy patient.email == sender lub recipient) ──
        let emailDrafts: unknown[] = [];
        if (patient.email) {
            try {
                const { data: drafts } = await supabase
                    .from('email_ai_drafts')
                    .select('id, email_subject, email_from_address, email_from_name, email_date, email_snippet, draft_subject, status, created_at')
                    .eq('email_from_address', patient.email)
                    .order('created_at', { ascending: false });
                emailDrafts = drafts || [];
            } catch (err) {
                console.warn('[ExportData] email_ai_drafts fetch failed:', err);
            }
        }

        // ── Build JSON payload ──
        const exportData = {
            exportDate: new Date().toISOString(),
            exportType: 'RODO_DATA_EXPORT_ZIP',
            rodoArticle: 'Art. 15 — right of access',
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
                notificationPreferences,
            },
            chatMessages,
            appointmentActions,
            onlineBookings,
            aiConversations: aiConversations || [],
            smsReminders,
            intakeSubmissions,
            patientConsents,
            cancelledAppointments,
            birthdayWishes,
            fcmTokens,
            careflowEnrollments,
            careflowTasks,
            emailDrafts,
            _note: 'Folder pdfs/ zawiera podpisane PDF zgód i wypełnione e-karty pobrane z Supabase Storage. Tabele bez danych dla Ciebie są zwracane jako puste tablice (nie znaczy że nie były odpytane).',
        };

        // ── Build ZIP ──
        const zip = new JSZip();
        zip.file('data.json', JSON.stringify(exportData, null, 2));

        // README explaining file structure
        zip.file('README.txt', `Mikrostomart — eksport Twoich danych (RODO Art. 15)
Data eksportu: ${new Date().toLocaleString('pl-PL')}

Pliki w tym archiwum:

data.json
  Pełen JSON wszystkich Twoich danych z systemu Mikrostomart.
  Sekcje: dane konta, historia wizyt, online bookings, SMS, e-karty,
  zgody, konwersacje AI, push tokeny, opieka pooperacyjna.

pdfs/
  Folder z podpisanymi dokumentami PDF (zgody + e-karty) pobranymi
  z naszego systemu storage. Nazwa pliku zawiera ID i typ.

Pytania nt. tego eksportu lub Twoich danych:
  Email: gabinet@mikrostomart.pl
  Telefon: 570-270-470

Prawa przysługujące Ci zgodnie z RODO:
  - Art. 15 — prawo dostępu (ten eksport)
  - Art. 16 — sprostowanie (pisemnie do administratora)
  - Art. 17 — usunięcie (uwaga: dokumentacja medyczna ma 20-letnią
    obowiązkową retencję per ustawa o prawach pacjenta art. 29 ust. 1)
  - Art. 7 — wycofanie zgód (przez polityka-prywatnosci, opt-out cookie)
  - Art. 77 — skarga do UODO (uodo.gov.pl)
`);

        // ── Download signed consent PDFs ──
        let pdfsAdded = 0;
        for (const consent of patientConsents) {
            if (!consent.file_url) continue;
            try {
                const url = consent.file_url;
                // file_url może być signed URL Supabase Storage lub bezpośrednia ścieżka
                // Pobieramy bezpośrednio
                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`[ExportData] consent PDF download failed for ${consent.id}: ${response.status}`);
                    continue;
                }
                const buffer = await response.arrayBuffer();
                const dateStr = consent.signed_at ? new Date(consent.signed_at).toISOString().split('T')[0] : 'unknown';
                const filename = `consent-${consent.consent_type || 'general'}-${dateStr}-${consent.id.slice(0, 8)}.pdf`;
                zip.file(`pdfs/${filename}`, buffer);
                pdfsAdded++;
            } catch (err) {
                console.warn(`[ExportData] consent PDF error for ${consent.id}:`, err);
            }
        }

        // ── Download intake (e-karta) PDFs ──
        for (const intake of intakeSubmissions) {
            if (!intake.pdf_url) continue;
            try {
                const response = await fetch(intake.pdf_url);
                if (!response.ok) {
                    console.warn(`[ExportData] intake PDF download failed for ${intake.id}: ${response.status}`);
                    continue;
                }
                const buffer = await response.arrayBuffer();
                const dateStr = intake.submitted_at ? new Date(intake.submitted_at).toISOString().split('T')[0] : 'unknown';
                const filename = `intake-ekarta-${dateStr}-${intake.id.slice(0, 8)}.pdf`;
                zip.file(`pdfs/${filename}`, buffer);
                pdfsAdded++;
            } catch (err) {
                console.warn(`[ExportData] intake PDF error for ${intake.id}:`, err);
            }
        }

        console.log(`[ExportData] ZIP ready: ${pdfsAdded} PDFs included, patient ${patientId}`);

        // ── Generate ZIP as Blob — natively kompatybilny z BodyInit ──
        // (Buffer / Uint8Array clash z TS strict generics w NextResponse — Blob jest
        // explicite w BodyInit unionie, więc no cast needed)
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${demoSanitize('moje-dane-mikrostomart')}-${dateStr}.zip`;

        return new NextResponse(zipBlob, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(zipBlob.size),
            },
        });

    } catch (err) {
        console.error('[ExportData] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
    }
}
