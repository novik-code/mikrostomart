import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDoctorInfo } from '@/lib/doctorMapping';
import { verifyAdmin } from '@/lib/auth';
import { sendTranslatedPushToUser } from '@/lib/webpush';
import { sendSMS } from '@/lib/smsService';
import { sendBookingConfirmedEmail, sendBookingRejectedEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
const PRODENTIS_KEY = process.env.PRODENTIS_API_KEY || '';

/**
 * Try to schedule a booking in Prodentis
 * Returns { success, appointmentId?, error? }
 */
async function scheduleInProdentis(booking: any): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    // Need both doctor and patient Prodentis IDs
    const doctorProdentisId = booking.doctor_prodentis_id;
    const patientProdentisId = booking.prodentis_patient_id;

    if (!doctorProdentisId) {
        // Try to resolve from specialist_id
        const docInfo = getDoctorInfo(booking.specialist_id);
        if (!docInfo?.prodentisId) {
            return { success: false, error: 'MISSING_DOCTOR_ID' };
        }
        // Use resolved ID
        return scheduleWithIds(docInfo.prodentisId, patientProdentisId, booking);
    }

    if (!patientProdentisId) {
        return { success: false, error: 'MISSING_PATIENT_ID' };
    }

    return scheduleWithIds(doctorProdentisId, patientProdentisId, booking);
}

async function scheduleWithIds(doctorId: string, patientId: string, booking: any) {
    if (!patientId) {
        return { success: false, error: 'MISSING_PATIENT_ID' };
    }

    try {
        const res = await fetch(`${PRODENTIS_API}/api/schedule/appointment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': PRODENTIS_KEY,
            },
            body: JSON.stringify({
                doctorId,
                patientId,
                date: booking.appointment_date,
                startTime: booking.appointment_time?.slice(0, 5) || booking.appointment_time,
                duration: booking.duration || 30,
                description: booking.description ? `Rezerwacja online — ${booking.description}` : 'Rezerwacja online',
                source: 'online_booking',
                labels: ['ONLINE'],
            }),
            signal: AbortSignal.timeout(15000),
        });

        const data = await res.json();

        if (res.status === 201) {
            return { success: true, appointmentId: data.appointmentId };
        }
        if (res.status === 409) {
            return { success: false, error: `SLOT_TAKEN: ${data.message}` };
        }
        if (res.status === 404) {
            return { success: false, error: `NOT_FOUND: ${data.message}` };
        }
        return { success: false, error: `API_ERROR_${res.status}: ${data.message || JSON.stringify(data)}` };
    } catch (err: any) {
        return { success: false, error: `NETWORK_ERROR: ${err.message}` };
    }
}

/**
 * GET /api/admin/online-bookings?status=pending
 * Fetch online bookings with optional status filter
 */
export async function GET(request: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = supabase
            .from('online_bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('schedule_status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[OnlineBookings GET] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ bookings: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT /api/admin/online-bookings
 * Update booking status: approve (+ auto-schedule), reject, or mark as scheduled
 * Body: { id, action: 'approve' | 'reject' | 'schedule' | 'fail', approvedBy? }
 */
export async function PUT(request: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, action, approvedBy } = body;

        if (!id || !action) {
            return NextResponse.json({ error: 'id and action required' }, { status: 400 });
        }

        const now = new Date().toISOString();
        let updateData: Record<string, any> = { updated_at: now };
        let scheduleResult: { success: boolean; appointmentId?: string; error?: string } | null = null;

        switch (action) {
            case 'approve': {
                updateData.approved_by = approvedBy || 'admin';
                updateData.approved_at = now;

                // Auto-schedule in Prodentis (API 6.0 — patientId bug fixed)
                const { data: bookingForApprove } = await supabase
                    .from('online_bookings')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (bookingForApprove && PRODENTIS_KEY) {
                    scheduleResult = await scheduleInProdentis(bookingForApprove);

                    if (scheduleResult.success) {
                        updateData.schedule_status = 'scheduled';
                        updateData.prodentis_appointment_id = scheduleResult.appointmentId;
                        updateData.schedule_error = null;
                        console.log(`[OnlineBookings] Scheduled in Prodentis: ${scheduleResult.appointmentId}`);
                    } else {
                        updateData.schedule_status = 'approved';
                        updateData.schedule_error = scheduleResult.error;
                        console.warn(`[OnlineBookings] Approved but schedule failed: ${scheduleResult.error}`);
                    }
                } else {
                    updateData.schedule_status = 'approved';
                    if (!PRODENTIS_KEY) updateData.schedule_error = 'MISSING_API_KEY';
                }
                break;
            }
            case 'schedule': {
                // Manual retry of scheduling in Prodentis
                const { data: bookingForSchedule } = await supabase
                    .from('online_bookings')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (bookingForSchedule && PRODENTIS_KEY) {
                    scheduleResult = await scheduleInProdentis(bookingForSchedule);

                    if (scheduleResult.success) {
                        updateData.schedule_status = 'scheduled';
                        updateData.prodentis_appointment_id = scheduleResult.appointmentId;
                        updateData.schedule_error = null;
                        console.log(`[OnlineBookings] Scheduled in Prodentis: ${scheduleResult.appointmentId}`);
                    } else {
                        updateData.schedule_error = scheduleResult.error;
                        console.warn(`[OnlineBookings] Schedule retry failed: ${scheduleResult.error}`);
                    }
                } else {
                    updateData.schedule_error = PRODENTIS_KEY ? 'BOOKING_NOT_FOUND' : 'MISSING_API_KEY';
                }
                break;
            }
            case 'reject':
                updateData.schedule_status = 'rejected';
                updateData.approved_by = approvedBy || 'admin';
                updateData.approved_at = now;
                break;
            case 'fail':
                updateData.schedule_status = 'failed';
                updateData.schedule_error = body.error || 'Unknown error';
                break;
            case 'pick_patient': {
                // Admin picks the correct patient from candidates
                const { patientId: pickedPatientId, patientName } = body;
                if (!pickedPatientId) {
                    return NextResponse.json({ error: 'patientId required' }, { status: 400 });
                }
                updateData.prodentis_patient_id = pickedPatientId;
                updateData.patient_match_method = 'admin_verified';
                updateData.is_new_patient = false;
                console.log(`[OnlineBookings] Admin picked patient: ${patientName || pickedPatientId}`);
                break;
            }
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('online_bookings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[OnlineBookings PUT] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // ── Notify patient on approve/reject (fire-and-forget) ──
        if (data && (action === 'approve' || action === 'reject')) {
            notifyPatientAboutBooking(data, action).catch(err =>
                console.error('[OnlineBookings] Patient notification error:', err)
            );
        }

        return NextResponse.json({ booking: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/online-bookings?id=UUID
 * Delete a booking record
 */
export async function DELETE(request: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('online_bookings')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[OnlineBookings DELETE] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════
// Notify patient about booking status change (push + SMS)
// ═══════════════════════════════════════════════════════════

async function notifyPatientAboutBooking(booking: any, action: 'approve' | 'reject') {
    const prodentisId = booking.prodentis_patient_id;
    const phone = booking.patient_phone;
    const patientName = booking.patient_name || '';
    const specialist = booking.specialist_name || '';
    const date = booking.appointment_date || '';
    const time = (booking.appointment_time || '').slice(0, 5); // "14:30:00" → "14:30"

    // Format date nicely for SMS
    let formattedDate = date;
    try {
        const [y, m, d] = date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'long' });
        formattedDate = `${dayName}, ${dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}`;
    } catch { /* use raw date */ }

    // ── Push notification (if patient has Supabase account) ──
    if (prodentisId) {
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', prodentisId)
            .single();

        if (patient?.id) {
            const notifType = action === 'approve' ? 'booking_confirmed' : 'booking_rejected';
            const pushParams = { specialist, date: formattedDate, time };
            const pushUrl = '/strefa-pacjenta/dashboard';

            sendTranslatedPushToUser(patient.id, 'patient', notifType, pushParams, pushUrl).then(result => {
                console.log(`[OnlineBookings] Push ${notifType} to patient ${patient.id}: sent=${result.sent}`);
            }).catch(err => {
                console.error(`[OnlineBookings] Push failed for patient ${patient.id}:`, err);
            });
        }
    }

    // ── SMS notification ──
    if (phone) {
        let smsMessage: string;

        if (action === 'approve') {
            smsMessage = `Szanowny Pacjencie, Twoja wizyta u ${specialist} (${formattedDate} o godz. ${time}) została POTWIERDZONA. Do zobaczenia! Mikrostomart`;
        } else {
            smsMessage = `Szanowny Pacjencie, niestety nie mogliśmy potwierdzić Twojej rezerwacji na ${formattedDate}. Prosimy o kontakt w celu ustalenia nowego terminu. Mikrostomart`;
        }

        sendSMS({ to: phone, message: smsMessage }).then(result => {
            console.log(`[OnlineBookings] SMS ${action} to ${phone}: success=${result.success}`);
        }).catch(err => {
            console.error(`[OnlineBookings] SMS failed for ${phone}:`, err);
        });
    }

    // ── Email notification ──
    const email = booking.patient_email;
    if (email) {
        if (action === 'approve') {
            sendBookingConfirmedEmail(email, patientName, specialist, formattedDate, time).then(result => {
                console.log(`[OnlineBookings] Email confirmed to ${email}: success=${result.success}`);
            }).catch(err => {
                console.error(`[OnlineBookings] Email failed for ${email}:`, err);
            });
        } else {
            sendBookingRejectedEmail(email, patientName, formattedDate).then(result => {
                console.log(`[OnlineBookings] Email rejected to ${email}: success=${result.success}`);
            }).catch(err => {
                console.error(`[OnlineBookings] Email failed for ${email}:`, err);
            });
        }
    }
}
