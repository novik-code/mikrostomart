import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { generateCareflowReport } from '@/lib/careflowPdf';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/admin/careflow/report/[id]
 * Generate (or re-generate) a CareFlow compliance PDF for a given enrollment.
 * Returns the PDF as a direct download.
 *
 * Query params:
 *   ?download=true  — force download headers
 *   ?regenerate=true — regenerate even if already exists
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const url = new URL(req.url);
        const regenerate = url.searchParams.get('regenerate') === 'true';

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch enrollment
        const { data: enrollment, error: eErr } = await supabase
            .from('care_enrollments')
            .select('*')
            .eq('id', id)
            .single();

        if (eErr || !enrollment) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
        }

        // If report already exists and not regenerating — redirect to existing URL
        if (enrollment.report_pdf_url && !regenerate) {
            return NextResponse.redirect(enrollment.report_pdf_url);
        }

        // Fetch tasks
        const { data: tasks } = await supabase
            .from('care_tasks')
            .select('*')
            .eq('enrollment_id', id)
            .order('sort_order', { ascending: true });

        // Fetch audit log
        const { data: auditLog } = await supabase
            .from('care_audit_log')
            .select('*')
            .eq('enrollment_id', id)
            .order('created_at', { ascending: true });

        // Generate PDF
        const pdfBytes = await generateCareflowReport({
            enrollment,
            tasks: tasks || [],
            auditLog: auditLog || [],
        });

        // Upload to Supabase Storage
        const fileName = `careflow-${id.slice(0, 8)}-${Date.now()}.pdf`;
        const filePath = `careflow-reports/${fileName}`;

        // Try upload (create bucket if needed)
        let uploadSuccess = false;
        const { error: uploadErr } = await supabase.storage
            .from('careflow-reports')
            .upload(filePath, pdfBytes, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadErr) {
            if (uploadErr.message?.includes('not found') || uploadErr.message?.includes('Bucket')) {
                await supabase.storage.createBucket('careflow-reports', {
                    public: false,
                    fileSizeLimit: 5 * 1024 * 1024,
                });
                const { error: retryErr } = await supabase.storage
                    .from('careflow-reports')
                    .upload(filePath, pdfBytes, {
                        contentType: 'application/pdf',
                        cacheControl: '3600',
                        upsert: false,
                    });
                if (!retryErr) uploadSuccess = true;
            }
        } else {
            uploadSuccess = true;
        }

        // Get signed URL
        let reportUrl = filePath;
        if (uploadSuccess) {
            const { data: signedUrl } = await supabase.storage
                .from('careflow-reports')
                .createSignedUrl(filePath, 365 * 24 * 60 * 60);
            reportUrl = signedUrl?.signedUrl || filePath;
        }

        // Update enrollment
        await supabase
            .from('care_enrollments')
            .update({
                report_pdf_url: reportUrl,
                report_generated_at: new Date().toISOString(),
            })
            .eq('id', id);

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: id,
            action: 'report_generated',
            actor: user.email || 'admin',
            details: {
                file_name: fileName,
                manual: true,
                regenerated: regenerate,
            },
        });

        // ── Auto-export to Prodentis ──
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
                        .eq('id', id);
                    await supabase.from('care_audit_log').insert({
                        enrollment_id: id,
                        action: 'exported_to_prodentis',
                        actor: user.email || 'admin',
                        details: { file_name: prodFileName, auto: true },
                    });
                    console.log(`[CareFlow Report] Auto-exported to Prodentis: ${prodFileName}`);
                } else {
                    console.error(`[CareFlow Report] Prodentis export failed: ${prodRes.status}`);
                }
            } catch (prodErr: any) {
                console.error('[CareFlow Report] Prodentis export error (non-blocking):', prodErr.message);
            }
        }

        // Return PDF directly
        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': pdfBytes.length.toString(),
            },
        });
    } catch (err: any) {
        console.error('[CareFlow Report] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
