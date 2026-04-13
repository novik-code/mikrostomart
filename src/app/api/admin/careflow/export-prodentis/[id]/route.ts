import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/admin/careflow/export-prodentis/[id]
 * Manually export CareFlow compliance PDF to patient's Prodentis documents.
 *
 * 1. Fetch enrollment (must have report_pdf_url)
 * 2. Download PDF from Supabase Storage
 * 3. POST base64-encoded PDF to Prodentis /api/patients/{id}/documents
 * 4. Mark enrollment as exported
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch enrollment
        const { data: enrollment, error: eErr } = await supabase
            .from('care_enrollments')
            .select('id, patient_id, patient_name, report_pdf_url, report_exported_to_prodentis, template_name, appointment_date')
            .eq('id', id)
            .single();

        if (eErr || !enrollment) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
        }

        if (!enrollment.report_pdf_url) {
            return NextResponse.json({ error: 'No PDF report generated yet. Generate the report first.' }, { status: 400 });
        }

        if (!enrollment.patient_id) {
            return NextResponse.json({ error: 'No Prodentis patient ID linked to this enrollment.' }, { status: 400 });
        }

        const prodentisKey = process.env.PRODENTIS_API_KEY || '';
        if (!prodentisKey) {
            return NextResponse.json({ error: 'PRODENTIS_API_KEY not configured' }, { status: 500 });
        }

        // 2. Download PDF from Supabase Storage
        // The report_pdf_url is a signed URL — fetch the actual PDF bytes
        let pdfBytes: Buffer;
        try {
            const pdfRes = await fetch(enrollment.report_pdf_url, {
                signal: AbortSignal.timeout(15000),
            });
            if (!pdfRes.ok) throw new Error(`PDF download failed: ${pdfRes.status}`);
            const arrayBuffer = await pdfRes.arrayBuffer();
            pdfBytes = Buffer.from(arrayBuffer);
        } catch (dlErr: any) {
            console.error('[CareFlow Export] PDF download error:', dlErr.message);
            return NextResponse.json({ error: `Failed to download PDF: ${dlErr.message}` }, { status: 500 });
        }

        // 3. POST to Prodentis /api/patients/{id}/documents
        const pdfBase64 = pdfBytes.toString('base64');
        const dateStr = new Date(enrollment.appointment_date).toISOString().slice(0, 10);
        const safeName = enrollment.patient_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '');
        const fileName = `CareFlow_raport_${safeName}_${dateStr}.pdf`;

        try {
            const prodRes = await prodentisFetch(`/api/patients/${enrollment.patient_id}/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': prodentisKey,
                },
                body: JSON.stringify({
                    fileBase64: pdfBase64,
                    fileName,
                    description: `Raport opieki peri-operacyjnej (CareFlow) — ${enrollment.template_name} — ${dateStr}`,
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (!prodRes.ok) {
                const errBody = await prodRes.text().catch(() => '');
                throw new Error(`Prodentis API ${prodRes.status}: ${errBody}`);
            }

            console.log(`[CareFlow Export] PDF exported to Prodentis for ${enrollment.patient_name} (patient ${enrollment.patient_id})`);
        } catch (prodErr: any) {
            console.error('[CareFlow Export] Prodentis upload error:', prodErr.message);
            return NextResponse.json({ error: `Prodentis export failed: ${prodErr.message}` }, { status: 502 });
        }

        // 4. Mark as exported
        await supabase
            .from('care_enrollments')
            .update({ report_exported_to_prodentis: true })
            .eq('id', id);

        // 5. Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: id,
            action: 'exported_to_prodentis',
            actor: user.email || 'admin',
            details: {
                file_name: fileName,
                patient_id: enrollment.patient_id,
                manual: true,
            },
        });

        return NextResponse.json({
            success: true,
            fileName,
            message: `PDF exported to Prodentis for ${enrollment.patient_name}`,
        });
    } catch (err: any) {
        console.error('[CareFlow Export] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
