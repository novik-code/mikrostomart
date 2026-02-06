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
 * SMS Draft Generation Cron Job (Stage 1 of 2)
 * 
 * Runs daily at 7:00 AM UTC (8-9 AM Warsaw time)
 * 
 * Flow:
 * 1. Get all active patients
 * 2. For each patient: fetch next appointment from Prodentis API 3.2
 * 3. Filter: tomorrow + working hours + doctor in reminder list
 * 4. Generate personalized SMS based on appointment type
 * 5. Save as DRAFT in sms_reminders table (admin review before sending)
 * 
 * Stage 2: Admin reviews drafts in /admin panel OR auto-send at 10 AM
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
            .select('id, prodentis_id, phone, account_status')
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

                // 5f. Check if SMS draft already exists for this appointment (prevent duplicates)
                const { data: existingDraft, error: draftCheckError } = await supabase
                    .from('sms_reminders')
                    .select('id, status')
                    .eq('prodentis_id', appointment.id)
                    .eq('appointment_date', appointment.date)
                    .maybeSingle();

                if (draftCheckError && draftCheckError.code !== 'PGRST116') {
                    console.error(`   ❌ DB error (sms_reminders check):`, draftCheckError);
                    errors.push({
                        patient: patient.phone || patient.prodentis_id,
                        error: `Database error: ${draftCheckError.message}`
                    });
                    continue;
                }

                if (existingDraft) {
                    console.log(`   ℹ️  SMS draft already exists (status: ${existingDraft.status})`);
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
                    appointmentType: appointmentType
                });

                console.log(`   📝 Creating SMS draft: "${message.substring(0, 50)}..."`);

                // 7. Create SMS draft in sms_reminders table (Stage 1: Generate)
                const { data: draftData, error: draftError } = await supabase
                    .from('sms_reminders')
                    .insert({
                        patient_id: patient.id,
                        prodentis_id: patient.prodentis_id,
                        phone: patient.phone,
                        appointment_date: appointment.date,
                        appointment_end_date: appointment.endDate,
                        doctor_id: appointment.doctor.id,
                        doctor_name: doctorName,
                        appointment_type: appointmentType,
                        sms_message: message,
                        template_used: `${doctorName}_${appointmentType}`,
                        status: 'draft'
                    })
                    .select()
                    .single();

                if (draftError) {
                    // Handle duplicate (same appointment already has draft)
                    if (draftError.code === '23505') {
                        console.log(`   ℹ️  Draft already exists for this appointment`);
                        continue;
                    }

                    failedCount++;
                    console.error(`   ❌ Failed to create draft: ${draftError.message}`);
                    errors.push({
                        patient: patient.phone || patient.prodentis_id,
                        error: `Draft creation failed: ${draftError.message}`
                    });
                    continue;
                }

                sentCount++;
                console.log(`   ✅ Draft created successfully (ID: ${draftData.id})`);

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
        console.log(`\n📊 [SMS Draft Generation] Job completed in ${duration}s`);
        console.log(`   Processed: ${processedCount}`);
        console.log(`   Drafts Created: ${sentCount}`);
        console.log(`   Failed: ${failedCount}`);

        return NextResponse.json({
            success: true,
            processed: processedCount,
            drafts_created: sentCount,
            failed: failedCount,
            errors: errors,
            duration: `${duration}s`,
            message: `Generated ${sentCount} SMS drafts for tomorrow's appointments`
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
