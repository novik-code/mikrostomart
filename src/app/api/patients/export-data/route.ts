import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { demoSanitize } from '@/lib/brandConfig';
import { getUserAIConversations } from '@/lib/aiConversationLog';
import JSZip from 'jszip';
import { readIntakeSubmissionPii } from '@/lib/encryptedPiiFields';
import { loadAttachmentsByMessage } from '@/lib/chatAttachments';
import { PATIENT_DOC_BUCKET, readObjectBytes } from '@/lib/privateStorage';
import { skompletujDokumenty, type DokumentDoPaczki } from '@/lib/patientExportDocs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Dane pacjenta — nic nie może osiąść w cache CDN ani przeglądarki. */
const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/** Wartość wchodzi do filtra PostgREST `or=` — przecinek/nawias rozwaliłby zapytanie. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

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
 *   - care_enrollments + care_tasks (S8-6, by prodentis_id ORAZ patient_db_id)
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
            return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401, headers: NO_STORE });
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
            return NextResponse.json({ error: 'Nie znaleziono danych' }, { status: 404, headers: NO_STORE });
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
                const rows = messages || [];
                // Art. 15: eksport MUSI objąć także zdjęcia przysłane przez pacjenta.
                // Same bajty nie idą do paczki (to byłby plik na dziesiątki MB) — idą
                // metadane i identyfikator, po którym pacjent może plik pobrać z aplikacji.
                const attachments = await loadAttachmentsByMessage(
                    'chat_message_id',
                    rows.map((m: { id: string }) => m.id),
                );
                chatMessages = rows.map((m: { id: string }) => ({
                    ...m,
                    attachments: attachments.get(m.id) ?? [],
                }));
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
        let intakeSubmissions: Array<{ id: string; pdf_url?: string; pdf_path?: string; submitted_at?: string }> = [];
        if (patient.prodentis_id) {
            const { data: intake } = await supabase
                .from('patient_intake_submissions')
                .select('id, first_name, last_name, pesel, pesel_encrypted, birth_date, gender, street, postal_code, city, phone, email, marketing_consent, contact_consent, rodo_consent, medical_notes, medical_notes_encrypted, submitted_at, pdf_url, pdf_path')
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
        let patientConsents: Array<{ id: string; consent_type?: string; file_url?: string; file_path?: string; signed_at?: string }> = [];
        if (patient.prodentis_id) {
            const { data: consents } = await supabase
                .from('patient_consents')
                .select('id, consent_type, consent_label, file_url, file_path, signed_at, prodentis_synced')
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

        // ── 12. CareFlow enrollments + tasks (S8-6) ──
        // `care_enrollments.patient_id` to PRODENTIS ID (TEXT), a nie `patients.id` (UUID) —
        // filtr po samym UUID nigdy nie trafiał i sekcja opieki wychodziła ZAWSZE pusta.
        // Zapis bywa związany jednym albo drugim kluczem, więc pytamy o oba.
        let careflowEnrollments: unknown[] = [];
        let careflowTasks: unknown[] = [];
        try {
            const careFilters: string[] = [];
            if (patient.prodentis_id && SAFE_ID.test(patient.prodentis_id)) {
                careFilters.push(`patient_id.eq.${patient.prodentis_id}`);
            }
            if (SAFE_ID.test(String(patientId))) {
                careFilters.push(`patient_db_id.eq.${patientId}`);
            }

            if (careFilters.length > 0) {
                const { data: enrollments } = await supabase
                    .from('care_enrollments')
                    .select('id, template_id, template_name, doctor_name, appointment_id, appointment_date, status, prescription_code, custom_medications, custom_notes, report_pdf_url, report_generated_at, created_at, completed_at, cancelled_at')
                    .or(careFilters.join(','))
                    .order('appointment_date', { ascending: false });
                careflowEnrollments = enrollments || [];

                const enrollmentIds = (enrollments || []).map(e => e.id);
                if (enrollmentIds.length > 0) {
                    // Nazwa i dawka leku to dane pacjenta — bez nich eksport nie odpowiada
                    // na pytanie „co mi zlecono".
                    const { data: tasks } = await supabase
                        .from('care_tasks')
                        .select('id, enrollment_id, title, description, icon, scheduled_at, completed_at, skipped_at, medication_name, medication_dose, medication_description, push_sent_count, sms_sent, push_message')
                        .in('enrollment_id', enrollmentIds)
                        .order('scheduled_at', { ascending: true });
                    careflowTasks = tasks || [];
                }
            }
        } catch (err) {
            console.warn('[ExportData] care_* fetch failed (table may not exist):', err);
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

        /**
         * ── Dokumenty PDF do paczki ────────────────────────────────────────────
         *
         * 🔴 CO BYŁO ZEPSUTE. Obie pętle robiły `fetch(publicznyAdres)` bez żadnej
         * autoryzacji, a przy niepowodzeniu `console.warn` + `continue`. Po zamknięciu
         * bucketa KAŻDE pobranie zwróciłoby 400, pętla poszłaby dalej i pacjent
         * korzystający z art. 15 dostałby **ZIP ze statusem 200, bez ani jednego PDF-a
         * i bez żadnego sygnału** — ani dla niego, ani dla nas. Cichy brak w realizacji
         * prawa dostępu jest gorszy niż jawny błąd.
         *
         * Teraz: czytamy bajty ze Storage kluczem serwisowym (działa też po zamknięciu),
         * a brak dokumentu, którego wiersz się spodziewa, **PRZERYWA eksport**.
         *
         * 🔑 Dlaczego przerwanie, a nie pominięcie: paczka ma być KOMPLETNA albo żadna.
         * Pacjent nie ma jak zauważyć, że brakuje jednej zgody sprzed trzech lat.
         */
        // Lista budowana z OBU kategorii, kompletowanie w `lib/patientExportDocs.ts`
        // (moduł istnieje po to, żeby dało się to przetestować wykonaniem, a nie grepem).
        const doPaczki: DokumentDoPaczki[] = [
            ...patientConsents.map(c => {
                const dateStr = c.signed_at ? new Date(c.signed_at).toISOString().split('T')[0] : 'unknown';
                return {
                    opis: `zgoda ${c.consent_type || 'general'} (${c.id.slice(0, 8)})`,
                    path: c.file_path,
                    legacyUrl: c.file_url,
                    nazwaWPaczce: `consent-${c.consent_type || 'general'}-${dateStr}-${c.id.slice(0, 8)}.pdf`,
                };
            }),
            ...intakeSubmissions.map(i => {
                const dateStr = i.submitted_at ? new Date(i.submitted_at).toISOString().split('T')[0] : 'unknown';
                return {
                    opis: `e-Karta (${i.id.slice(0, 8)})`,
                    path: i.pdf_path,
                    legacyUrl: i.pdf_url,
                    nazwaWPaczce: `intake-ekarta-${dateStr}-${i.id.slice(0, 8)}.pdf`,
                };
            }),
        ];

        const { pliki, brakujace } = await skompletujDokumenty(doPaczki, {
            czytajZeStorage: (path) => readObjectBytes(PATIENT_DOC_BUCKET, path),
            pobierzStarymAdresem: async (url) => {
                // Okres przejściowy: wiersz sprzed backfillu, bucket jeszcze publiczny.
                try {
                    const r = await fetch(url);
                    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
                } catch { return null; }
            },
        });

        for (const f of pliki) zip.file(`pdfs/${f.nazwaWPaczce}`, f.bytes);
        const pdfsAdded = pliki.length;

        if (brakujace.length > 0) {
            // 503, nie 500: to stan przejściowy (plik zniknął / Storage nie odpowiada),
            // a pacjent ma spróbować ponownie, nie dostać uszkodzonej paczki.
            console.error('[ExportData] PRZERWANE — brak dokumentów:', brakujace.join('; '));
            return NextResponse.json(
                {
                    error: 'Nie udało się skompletować dokumentów. Eksport przerwany, żeby nie wydać niepełnej paczki. Spróbuj ponownie za chwilę albo napisz do rejestracji.',
                    brakujacych: brakujace.length,
                },
                { status: 503, headers: NO_STORE },
            );
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
                ...NO_STORE,
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(zipBlob.size),
            },
        });

    } catch (err) {
        console.error('[ExportData] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
