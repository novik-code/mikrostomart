import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, getSMSTemplate, formatSMSMessage } from '@/lib/smsService';

export const maxDuration = 60; // Vercel function timeout

// Prodentis API base URL
const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://192.168.1.5:3000';

// Doctor list for reminders (comma-separated env variable)
const REMINDER_DOCTORS = process.env.REMINDER_DOCTORS?.split(',').map(d => d.trim()) || [
    'Marcin Nowosielski',
    'Ilona Piechaczek',
    'Katarzyna Halupczok',
    'Małgorzata Maćków Huras',
    'Dominika Milicz'
];

/**
 * SMS Appointment Reminder Cron Job
 * 
 * Runs daily at 7:00 AM UTC (8-9 AM Warsaw time)
 * 
 * Flow:
 * 1. Get all active patients
 * 2. For each patient: fetch next appointment from Prodentis API 3.2
 * 3. Filter: tomorrow + working hours + doctor in reminder list
 * 4. Send personalized SMS based on appointment type
 * 5. Track send status in appointment_actions table
 */
export async function GET(req: Request) {
    console.log('🚀 [SMS Reminders] Starting cron job...');
    const startTime = Date.now();

    // 1. Authentication check
    const authHeader = req.headers.get('authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCronAuth && process.env.NODE_ENV === 'production') {
        console.error('❌ [SMS Reminders] Unauthorized access attempt');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Initialize Supabase
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let processedCount = 0;
    let sentCount = 0;
    let failedCount = 0;
    const errors: Array<{ patient: string; error: string }> = [];

    try {
        // 3. Get all active patients
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, prodentis_id, phone, first_name, account_status')
            .eq('account_status', 'active');

        if (patientsError) {
            throw new Error(`Failed to fetch patients: ${patientsError.message}`);
        }

        if (!patients || patients.length === 0) {
            console.log('ℹ️  [SMS Reminders] No active patients found');
            return NextResponse.json({
                success: true,
                processed: 0,
                sent: 0,
                failed: 0,
                message: 'No active patients'
            });
        }

        console.log(`📊 [SMS Reminders] Processing ${patients.length} active patients...`);

        // 4. Calculate tomorrow's date range
        const tomorrow = getTomorrowDateRange();
        console.log(`📅 [SMS Reminders] Checking for appointments on: ${tomorrow.start.toLocaleDateString('pl-PL')}`);

        // 5. Process each patient
        for (const patient of patients) {
            processedCount++;

            try {
                // 5a. Fetch next appointment from Prodentis API 3.2
                const apiUrl = `${PRODENTIS_API_URL}/api/patient/${patient.prodentis_id}/next-appointment`;
                console.log(`🔍 [Patient ${patient.prodentis_id}] Checking appointment...`);

                const apiResponse = await fetch(apiUrl);

                if (!apiResponse.ok) {
                    errors.push({
                        patient: patient.phone || patient.prodentis_id,
                        error: `Prodentis API error: ${apiResponse.status}`
                    });
                    continue;
                }

                const data = await apiResponse.json();

                // 5b. Check if patient has next appointment
                if (!data.hasNextAppointment) {
                    console.log(`   ⚠️  No upcoming appointment`);
                    continue;
                }

                const appointment = data.nextAppointment;
                const appointmentDate = new Date(appointment.date);

                // 5c. Filter: Is appointment tomorrow?
                if (appointmentDate < tomorrow.start || appointmentDate > tomorrow.end) {
                    console.log(`   ⚠️  Appointment not tomorrow (${appointmentDate.toLocaleDateString('pl-PL')})`);
                    continue;
                }

                // 5d. Filter: Is working hour? (API 3.2 feature)
                if (appointment.isWorkingHour !== true) {
                    console.log(`   ⚠️  Appointment outside working hours (grey field)`);
                    continue;
                }

                // 5e. Filter: Is doctor in reminder list?
                const doctorName = appointment.doctor.name.replace(/\s*\(I\)\s*/g, ' ').trim();
                if (!REMINDER_DOCTORS.includes(doctorName)) {
                    console.log(`   ⚠️  Doctor not in reminder list: ${doctorName}`);
                    continue;
                }

                // 5f. Check if SMS already sent for this appointment
                const { data: existingAction, error: actionError } = await supabase
                    .from('appointment_actions')
                    .select('id, reminder_sms_sent')
                    .eq('prodentis_id', patient.prodentis_id)
                    .eq('appointment_date', appointment.date)
                    .maybeSingle();

                if (actionError && actionError.code !== 'PGRST116') {
                    console.error(`   ❌ DB error:`, actionError);
                    errors.push({
                        patient: patient.phone || patient.prodentis_id,
                        error: `Database error: ${actionError.message}`
                    });
                    continue;
                }

                if (existingAction?.reminder_sms_sent) {
                    console.log(`   ℹ️  SMS already sent for this appointment`);
                    continue;
                }

                // 6. Generate personalized SMS message
                const appointmentTime = appointmentDate.toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Warsaw'
                });

                // API 3.2: appointmentType.name is GUARANTEED to have value (never null)
                const appointmentType = appointment.appointmentType.name;

                const template = getSMSTemplate(doctorName, appointmentType);
                const message = formatSMSMessage(template, {
                    time: appointmentTime,
                    doctor: doctorName,
                    patientName: patient.first_name || '',
                    appointmentType: appointmentType
                });

                console.log(`   📱 Sending SMS: "${message.substring(0, 50)}..."`);

                // 7. Send SMS
                const smsResult = await sendSMS({
                    to: patient.phone,
                    message: message
                });

                // 8. Update/create appointment_actions record
                const actionData = {
                    reminder_sms_sent: smsResult.success,
                    reminder_sms_sent_at: new Date().toISOString(),
                    reminder_sms_message_id: smsResult.messageId || null,
                    reminder_sms_error: smsResult.error || null
                };

                if (existingAction) {
                    // Update existing record
                    await supabase
                        .from('appointment_actions')
                        .update(actionData)
                        .eq('id', existingAction.id);
                } else {
                    // Create new record (shouldn't happen often - dashboard usually creates it)
                    await supabase.from('appointment_actions').insert({
                        patient_id: patient.id,
                        prodentis_id: patient.prodentis_id,
                        appointment_date: appointment.date,
                        appointment_end_date: appointment.endDate,
                        doctor_id: appointment.doctor.id,
                        doctor_name: doctorName,
                        ...actionData
                    });
                }

                if (smsResult.success) {
                    sentCount++;
                    console.log(`   ✅ SMS sent successfully (ID: ${smsResult.messageId})`);
                } else {
                    failedCount++;
                    console.error(`   ❌ SMS send failed: ${smsResult.error}`);
                    errors.push({
                        patient: patient.phone || patient.prodentis_id,
                        error: smsResult.error || 'Unknown error'
                    });
                }

            } catch (patientError) {
                failedCount++;
                const errorMsg = patientError instanceof Error ? patientError.message : 'Unknown error';
                console.error(`   ❌ Error processing patient:`, errorMsg);
                errors.push({
                    patient: patient.phone || patient.prodentis_id,
                    error: errorMsg
                });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n📊 [SMS Reminders] Job completed in ${duration}s`);
        console.log(`   Processed: ${processedCount}`);
        console.log(`   Sent: ${sentCount}`);
        console.log(`   Failed: ${failedCount}`);

        return NextResponse.json({
            success: true,
            processed: processedCount,
            sent: sentCount,
            failed: failedCount,
            errors: errors,
            duration: `${duration}s`
        });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [SMS Reminders] Fatal error:', errorMsg);

        return NextResponse.json({
            success: false,
            error: errorMsg,
            processed: processedCount,
            sent: sentCount,
            failed: failedCount
        }, { status: 500 });
    }
}

/**
 * Calculate tomorrow's date range (00:00:00 to 23:59:59)
 */
function getTomorrowDateRange() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
        start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0),
        end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59)
    };
}
