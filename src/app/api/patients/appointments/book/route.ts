import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { getDoctorInfo } from '@/lib/doctorMapping';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/pushService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/patients/appointments/book
 * Patient zone booking — JWT authenticated, uses existing prodentis_id
 * Body: { specialist, specialistName, service, date, time, description? }
 */
export async function POST(req: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(req);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { specialist, specialistName, service, date, time, description } = body;

        if (!specialist || !date || !time) {
            return NextResponse.json({ error: 'specialist, date, time required' }, { status: 400 });
        }

        // ── Get patient data from Supabase (phone, email) ──
        const { data: patient, error: patientErr } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone, email')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientErr || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // ── Get patient name from Prodentis ──
        let patientFirstName = '';
        let patientLastName = '';
        try {
            const prodentisUrl = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
            const detailsRes = await fetch(`${prodentisUrl}/api/patient/${payload.prodentisId}/details`, {
                signal: AbortSignal.timeout(5000),
            });
            if (detailsRes.ok) {
                const details = await detailsRes.json();
                patientFirstName = details.firstName || '';
                patientLastName = details.lastName || '';
            }
        } catch (e) {
            console.error('[PatientBook] Failed to fetch patient details:', e);
        }

        const patientName = `${patientFirstName} ${patientLastName}`.trim() || patient.phone;
        const doctorInfo = getDoctorInfo(specialist);

        // ── Save to reservations table ──
        let reservationId: string | null = null;
        try {
            const { data: resData, error: resErr } = await supabase.from('reservations').insert({
                name: patientName,
                email: patient.email || '',
                phone: patient.phone,
                date,
                time,
                specialist: specialistName || specialist,
                service: service || specialistName || specialist,
                description: description || 'Rezerwacja ze Strefy Pacjenta',
                status: 'pending',
                created_at: new Date().toISOString(),
            }).select('id').single();

            if (!resErr && resData) {
                reservationId = resData.id;
            } else {
                console.error('[PatientBook] Reservation insert error:', resErr);
            }
        } catch (e) {
            console.error('[PatientBook] Reservation exception:', e);
        }

        // ── Save to online_bookings — with pre-matched prodentis_patient_id ──
        const { data: booking, error: bookingErr } = await supabase.from('online_bookings').insert({
            reservation_id: reservationId,
            patient_name: patientName,
            patient_phone: patient.phone,
            patient_email: patient.email || null,
            prodentis_patient_id: payload.prodentisId,
            is_new_patient: false,
            patient_match_method: 'patient_zone_auth',
            match_confidence: 100,
            match_candidates: null,
            specialist_id: specialist,
            specialist_name: specialistName || specialist,
            doctor_prodentis_id: doctorInfo?.prodentisId || null,
            appointment_date: date,
            appointment_time: time,
            service_type: service || null,
            description: description || null,
            schedule_status: 'pending',
        }).select('id').single();

        if (bookingErr) {
            console.error('[PatientBook] online_bookings insert error:', bookingErr);
            return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
        }

        // ── Notifications ──
        const [year, month, day] = date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
        const appointmentDate = `${dayName}, ${formattedDate} o godz. ${time}`;

        // Telegram
        const telegramMessage = `📅 <b>REZERWACJA ZE STREFY PACJENTA</b>\n\n` +
            `🩺 <b>Specjalista:</b> ${specialistName || specialist}\n` +
            `📆 <b>Data i godz.:</b> ${appointmentDate}\n` +
            `👤 <b>Pacjent:</b> ${patientName}\n` +
            `📞 <b>Telefon:</b> <a href="tel:${patient.phone}">${patient.phone}</a>\n` +
            `🆔 <b>Prodentis ID:</b> ${payload.prodentisId}\n` +
            (description ? `💬 <b>Opis:</b> ${description}\n` : '') +
            `\n✅ Pacjent jest zweryfikowany (Strefa Pacjenta)`;

        sendTelegramNotification(telegramMessage, 'default').catch(console.error);

        // Push notifications
        const pushParams = {
            name: patientName,
            specialist: specialistName || specialist,
            date: date || '',
            time: time || '',
        };
        broadcastPush('admin', 'new_reservation', pushParams, '/admin').catch(console.error);
        broadcastPush('employee', 'new_reservation', pushParams, '/pracownik').catch(console.error);

        console.log(`[PatientBook] Booking created: ${booking.id} for patient ${payload.prodentisId} (${patientName})`);

        return NextResponse.json({
            success: true,
            bookingId: booking.id,
        });

    } catch (err: any) {
        console.error('[PatientBook] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
