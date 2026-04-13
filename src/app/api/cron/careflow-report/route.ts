import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCareflowReport } from '@/lib/careflowPdf';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const maxDuration = 60;

/**
 * CareFlow Report Generation Cron
 * Runs daily at 2:00 AM — generates PDF compliance reports
 * for all completed enrollments that don't have a report yet.
 *
 * Flow:
 * 1. Find completed enrollments where report_pdf_url IS NULL
 * 2. For each: fetch tasks + audit log
 * 3. Generate PDF via careflowPdf.ts
 * 4. Upload to Supabase Storage (careflow-reports bucket)
 * 5. Update enrollment with report_pdf_url + report_generated_at
 * 6. Log to care_audit_log
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' });
    }

    console.log('📄 [CareFlow Report] Starting cron...');

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let generated = 0;
    let errors = 0;

    try {
        // 1. Find completed enrollments without a report
        const { data: enrollments, error: eErr } = await supabase
            .from('care_enrollments')
            .select('*')
            .eq('status', 'completed')
            .is('report_pdf_url', null)
            .order('completed_at', { ascending: true })
            .limit(10); // Process max 10 per run to stay within time limits

        if (eErr) throw new Error(eErr.message);

        if (!enrollments || enrollments.length === 0) {
            console.log('📄 [CareFlow Report] No completed enrollments without reports.');
            return NextResponse.json({ success: true, generated: 0 });
        }

        console.log(`📄 [CareFlow Report] Found ${enrollments.length} enrollments to report.`);

        for (const enrollment of enrollments) {
            try {
                // 2. Fetch tasks
                const { data: tasks } = await supabase
                    .from('care_tasks')
                    .select('*')
                    .eq('enrollment_id', enrollment.id)
                    .order('sort_order', { ascending: true });

                // 3. Fetch audit log
                const { data: auditLog } = await supabase
                    .from('care_audit_log')
                    .select('*')
                    .eq('enrollment_id', enrollment.id)
                    .order('created_at', { ascending: true });

                // 4. Generate PDF
                const pdfBytes = await generateCareflowReport({
                    enrollment,
                    tasks: tasks || [],
                    auditLog: auditLog || [],
                });

                // 5. Upload to Supabase Storage
                const fileName = `careflow-${enrollment.id.slice(0, 8)}-${Date.now()}.pdf`;
                const filePath = `careflow-reports/${fileName}`;

                const { error: uploadErr } = await supabase.storage
                    .from('careflow-reports')
                    .upload(filePath, pdfBytes, {
                        contentType: 'application/pdf',
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadErr) {
                    // If bucket doesn't exist yet, try to create it
                    if (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket')) {
                        console.log('📄 [CareFlow Report] Creating storage bucket...');
                        await supabase.storage.createBucket('careflow-reports', {
                            public: false,
                            fileSizeLimit: 5 * 1024 * 1024, // 5MB
                        });
                        // Retry upload
                        const { error: retryErr } = await supabase.storage
                            .from('careflow-reports')
                            .upload(filePath, pdfBytes, {
                                contentType: 'application/pdf',
                                cacheControl: '3600',
                                upsert: false,
                            });
                        if (retryErr) throw retryErr;
                    } else {
                        throw uploadErr;
                    }
                }

                // 6. Get signed URL (valid for 1 year)
                const { data: signedUrl } = await supabase.storage
                    .from('careflow-reports')
                    .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year

                const reportUrl = signedUrl?.signedUrl || filePath;

                // 7. Update enrollment
                await supabase
                    .from('care_enrollments')
                    .update({
                        report_pdf_url: reportUrl,
                        report_generated_at: new Date().toISOString(),
                    })
                    .eq('id', enrollment.id);

                // 8. Audit log
                await supabase.from('care_audit_log').insert({
                    enrollment_id: enrollment.id,
                    action: 'report_generated',
                    actor: 'careflow-report-cron',
                    details: {
                        file_name: fileName,
                        file_path: filePath,
                        tasks_count: tasks?.length || 0,
                        compliance: tasks && tasks.length > 0
                            ? Math.round((tasks.filter((t: any) => t.completed_at).length / tasks.length) * 100)
                            : 0,
                    },
                });

                generated++;
                console.log(`   ✅ Report generated for ${enrollment.patient_name} (${fileName})`);

                // Auto-export to Prodentis
                const prodentisKey = process.env.PRODENTIS_API_KEY || '';
                if (prodentisKey && enrollment.patient_id) {
                    try {
                        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
                        const dateStr = new Date(enrollment.appointment_date).toISOString().slice(0, 10);
                        const safeName = (enrollment.patient_name || 'pacjent').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
                        const prodFileName = `CareFlow_raport_${safeName}_${dateStr}.pdf`;

                        const prodRes = await prodentisFetch(`/api/patients/${enrollment.patient_id}/documents`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': prodentisKey },
                            body: JSON.stringify({
                                fileBase64: pdfBase64,
                                fileName: prodFileName,
                                description: `Raport opieki peri-operacyjnej (CareFlow) — ${enrollment.template_name || ''} — ${dateStr}`,
                            }),
                            signal: AbortSignal.timeout(15000),
                        });

                        if (prodRes.ok) {
                            await supabase.from('care_enrollments')
                                .update({ report_exported_to_prodentis: true })
                                .eq('id', enrollment.id);
                            await supabase.from('care_audit_log').insert({
                                enrollment_id: enrollment.id,
                                action: 'exported_to_prodentis',
                                actor: 'careflow-report-cron',
                                details: { file_name: prodFileName, auto: true },
                            });
                            console.log(`   📤 Auto-exported to Prodentis: ${prodFileName}`);
                        } else {
                            console.error(`   ⚠️ Prodentis export failed: ${prodRes.status}`);
                        }
                    } catch (prodErr: any) {
                        console.error(`   ⚠️ Prodentis export error (non-blocking): ${prodErr.message}`);
                    }
                }
            } catch (err: any) {
                console.error(`   ❌ Report failed for ${enrollment.patient_name}:`, err.message);
                errors++;
            }
        }

        console.log(`📄 [CareFlow Report] Done: ${generated} generated, ${errors} errors`);
        return NextResponse.json({ success: true, generated, errors });
    } catch (err: any) {
        console.error('📄 [CareFlow Report] Fatal error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
