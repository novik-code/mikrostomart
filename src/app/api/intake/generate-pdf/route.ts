import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
const PRODENTIS_API_KEY = process.env.PRODENTIS_API_KEY || '';

// ─── Helpers ─────────────────────────────────────────────

const yn = (v: any) => v ? 'TAK' : 'NIE';

interface Section {
    title?: string;
    items: { label: string; value: string; highlight?: boolean }[];
}

function buildSections(submission: any): Section[] {
    const sv = submission.medical_survey || {};
    const sections: Section[] = [];

    // Personal data
    sections.push({
        title: 'DANE OSOBOWE',
        items: [
            { label: 'Imię', value: submission.first_name || '' },
            { label: 'Nazwisko', value: submission.last_name || '' },
            { label: 'Drugie imię', value: submission.middle_name || '' },
            { label: 'Nazwisko rodowe', value: submission.maiden_name || '' },
            { label: 'PESEL', value: submission.pesel || '' },
            { label: 'Data urodzenia', value: submission.birth_date || '' },
            { label: 'Płeć', value: submission.gender === 'M' ? 'Mężczyzna' : submission.gender === 'F' ? 'Kobieta' : '' },
            { label: 'Ulica', value: submission.street || '' },
            { label: 'Kod pocztowy', value: submission.postal_code || '' },
            { label: 'Miasto', value: submission.city || '' },
            { label: 'Telefon', value: submission.phone || '' },
            { label: 'E-mail', value: submission.email || '' },
        ].filter(i => i.value),
    });

    // General health
    sections.push({
        title: 'STAN OGÓLNY',
        items: [
            { label: 'Czuje się zdrowy/a', value: yn(sv.feelsHealthy) },
            ...(sv.hospitalLast2Years ? [{ label: 'Szpital w ciągu 2 lat', value: `TAK — ${sv.hospitalReason || ''}`, highlight: true }] : []),
            ...(sv.currentlyTreated ? [{ label: 'Aktualnie leczy się', value: `TAK — ${sv.currentTreatment || ''}`, highlight: true }] : []),
            { label: 'Przyjmuje leki', value: sv.takesMedication ? `TAK — ${sv.medications || ''}` : 'NIE', highlight: sv.takesMedication },
            { label: 'Uczulenia', value: sv.hasAllergies ? `TAK — ${sv.allergies || ''}` : 'NIE', highlight: sv.hasAllergies },
        ],
    });

    // Tendencies
    sections.push({
        title: 'SKŁONNOŚCI',
        items: [
            { label: 'Skłonność do krwawień', value: yn(sv.bleedingTendency), highlight: sv.bleedingTendency },
            { label: 'Omdlenia/utrata przytomności', value: yn(sv.faintingEpisodes), highlight: sv.faintingEpisodes },
            { label: 'Rozrusznik serca', value: yn(sv.hasPacemaker), highlight: sv.hasPacemaker },
        ],
    });

    // Diseases
    const diseases: [string, boolean][] = [
        ['Choroby serca', sv.heartDiseases],
        ['Choroby układu krążenia', sv.circulatoryDiseases],
        ['Choroby naczyń', sv.vascularDiseases],
        ['Choroby płuc', sv.lungDiseases],
        ['Choroby ukł. pokarmowego', sv.digestiveDiseases],
        ['Choroby wątroby', sv.liverDiseases],
        ['Choroby ukł. moczowego', sv.urinaryDiseases],
        ['Zaburzenia przemiany materii', sv.metabolicDiseases],
        ['Choroby tarczycy', sv.thyroidDiseases],
        ['Choroby ukł. nerwowego', sv.neurologicalDiseases],
        ['Choroby ukł. kostno-stawowego', sv.musculoskeletalDiseases],
        ['Choroby krwi / krzepnięcia', sv.bloodDiseases],
        ['Choroby oczu (jaskra)', sv.eyeDiseases],
        ['Zmiany nastroju', sv.moodDisorders],
        ['Choroba reumatyczna', sv.rheumaticDisease],
        ['Osteoporoza', sv.osteoporosis],
    ];
    sections.push({
        title: 'CHOROBY',
        items: diseases.map(([label, val]) => ({ label, value: yn(val), highlight: !!val })),
    });

    // Infectious diseases
    if (sv.infectiousDisease) {
        sections.push({
            title: 'CHOROBY ZAKAŹNE',
            items: [
                { label: 'Żółtaczka zakaźna A', value: yn(sv.hepatitisA), highlight: sv.hepatitisA },
                { label: 'Żółtaczka zakaźna B', value: yn(sv.hepatitisB), highlight: sv.hepatitisB },
                { label: 'Żółtaczka zakaźna C', value: yn(sv.hepatitisC), highlight: sv.hepatitisC },
                { label: 'AIDS/HIV', value: yn(sv.aids), highlight: sv.aids },
                { label: 'Gruźlica', value: yn(sv.tuberculosis), highlight: sv.tuberculosis },
                { label: 'Choroby weneryczne', value: yn(sv.std), highlight: sv.std },
            ],
        });
    }

    // Other
    const otherItems = [];
    if (sv.otherDiseases) otherItems.push({ label: 'Inne dolegliwości', value: sv.otherDiseases });
    if (sv.lastBloodPressure) otherItems.push({ label: 'Ostatnie ciśnienie', value: sv.lastBloodPressure });
    if (otherItems.length) sections.push({ items: otherItems });

    // Medical history
    sections.push({
        title: 'HISTORIA MEDYCZNA',
        items: [
            { label: 'Operowany/a', value: sv.hadSurgery ? `TAK — ${sv.surgeryDetails || ''}` : 'NIE', highlight: sv.hadSurgery },
            { label: 'Tolerancja znieczulenia', value: yn(sv.toleratedAnesthesia) },
            ...(sv.hadBloodTransfusion ? [{ label: 'Przetaczanie krwi', value: `TAK — ${sv.transfusionDetails || ''}`, highlight: true }] : []),
        ],
    });

    // Substances
    sections.push({
        title: 'UŻYWKI',
        items: [
            { label: 'Tytoń', value: sv.smoker ? `TAK — ${sv.smokingDetails || ''}` : 'NIE', highlight: sv.smoker },
            { label: 'Alkohol', value: sv.drinksAlcohol || 'NIE' },
            { label: 'Środki uspokajające/nasenne', value: sv.takesSedatives ? `TAK — ${sv.sedativesDetails || ''}` : 'NIE', highlight: sv.takesSedatives },
        ],
    });

    // Women
    if (submission.gender === 'F') {
        sections.push({
            title: 'PYTANIA DLA KOBIET',
            items: [
                { label: 'Ciąża', value: sv.isPregnant ? `TAK — miesiąc: ${sv.pregnancyMonth || '?'}` : 'NIE', highlight: sv.isPregnant },
                ...(sv.lastPeriod ? [{ label: 'Ostatnia miesiączka', value: sv.lastPeriod }] : []),
                { label: 'Antykoncepcja doustna', value: yn(sv.usesContraceptives) },
            ],
        });
    }

    return sections;
}

// ─── PDF Builder ─────────────────────────────────────────

async function generateEKartaPdf(submission: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Load Inter font — fetch from public URL (works on Vercel serverless)
    let font;
    try {
        // Try filesystem first (local dev)
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Variable.ttf');
        let fontBytes: Buffer;
        try {
            fontBytes = fs.readFileSync(fontPath);
        } catch {
            // Fallback: fetch from own public URL (Vercel)
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : 'https://mikrostomart.pl';
            const res = await fetch(`${baseUrl}/fonts/Inter-Variable.ttf`);
            if (!res.ok) throw new Error('Font fetch failed');
            fontBytes = Buffer.from(await res.arrayBuffer());
        }
        // CRITICAL: subset: false — variable fonts break with pdf-lib subsetting
        font = await pdfDoc.embedFont(fontBytes, { subset: false });
    } catch (e) {
        console.error('[EKartaPDF] Font loading failed, using Helvetica:', e);
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    let boldFont;
    try {
        boldFont = font; // same Inter — we'll simulate bold with larger size
    } catch {
        boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 50;
    const LINE_H = 14;
    const FONT_SIZE = 9;
    const TITLE_SIZE = 11;
    const HEADER_SIZE = 14;
    const CONTENT_W = PAGE_W - 2 * MARGIN;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const addPage = () => {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
    };

    const ensureSpace = (needed: number) => {
        if (y - needed < MARGIN + 20) addPage();
    };

    const drawText = (text: string, x: number, yPos: number, size: number, color = rgb(0.1, 0.1, 0.1)) => {
        try {
            page.drawText(text, { x, y: yPos, size, font, color });
        } catch {
            // fallback — strip problematic chars
            const safe = text.replace(/[^\x20-\x7E]/g, '?');
            page.drawText(safe, { x, y: yPos, size, font, color });
        }
    };

    // ─── Header ───
    drawText('MIKROSTOMART', MARGIN, y, HEADER_SIZE, rgb(0.08, 0.44, 0.75));
    y -= 16;
    drawText('Informacja dotycząca stanu zdrowia pacjenta', MARGIN, y, 10, rgb(0.3, 0.3, 0.3));
    y -= 12;

    const date = submission.submitted_at
        ? new Date(submission.submitted_at).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('pl-PL');
    drawText(`Data wypełnienia: ${date}`, MARGIN, y, 8, rgb(0.4, 0.4, 0.4));
    y -= 20;

    // Separator
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.08, 0.44, 0.75) });
    y -= 16;

    // ─── Sections ───
    const sections = buildSections(submission);

    for (const section of sections) {
        if (section.title) {
            ensureSpace(LINE_H * 3);
            // Section title bar
            page.drawRectangle({
                x: MARGIN,
                y: y - 3,
                width: CONTENT_W,
                height: LINE_H + 4,
                color: rgb(0.92, 0.95, 0.98),
            });
            drawText(section.title, MARGIN + 6, y, TITLE_SIZE - 1, rgb(0.08, 0.44, 0.75));
            y -= LINE_H + 8;
        }

        for (const item of section.items) {
            ensureSpace(LINE_H + 4);

            // Highlight TAK items with subtle red background
            if (item.highlight) {
                page.drawRectangle({
                    x: MARGIN,
                    y: y - 3,
                    width: CONTENT_W,
                    height: LINE_H + 2,
                    color: rgb(1, 0.95, 0.95),
                });
            }

            // Label
            drawText(`${item.label}:`, MARGIN + 4, y, FONT_SIZE, rgb(0.25, 0.25, 0.25));

            // Value — truncate if too long
            const valueX = MARGIN + 220;
            const maxValueW = CONTENT_W - 224;
            let value = item.value;
            while (font.widthOfTextAtSize(value, FONT_SIZE) > maxValueW && value.length > 3) {
                value = value.slice(0, -4) + '...';
            }
            const valueColor = item.highlight ? rgb(0.8, 0.1, 0.1) : rgb(0.1, 0.1, 0.1);
            drawText(value, valueX, y, FONT_SIZE, valueColor);

            y -= LINE_H + 1;
        }

        y -= 6; // gap between sections
    }

    // ─── Consents text ───
    ensureSpace(LINE_H * 4);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 14;
    drawText('Oświadczam, że podane powyżej dane są zgodne z prawdą.', MARGIN, y, 8, rgb(0.3, 0.3, 0.3));
    y -= 12;
    drawText('Wszystkie zmiany w sytuacji zdrowotnej zobowiązuję się zgłosić w czasie najbliższej wizyty.', MARGIN, y, 8, rgb(0.3, 0.3, 0.3));
    y -= 12;
    if (submission.marketing_consent) {
        drawText('☑ Wyrażam zgodę na przesyłanie informacji marketingowych SMS/email.', MARGIN, y, 8, rgb(0.3, 0.3, 0.3));
        y -= 12;
    }
    y -= 8;

    // ─── Signature ───
    if (submission.signature_data) {
        ensureSpace(120);
        drawText('Podpis pacjenta:', MARGIN, y, 9, rgb(0.3, 0.3, 0.3));
        y -= 10;

        try {
            // signature_data is a data URL — extract base64
            const base64Match = submission.signature_data.match(/^data:image\/\w+;base64,(.+)$/);
            if (base64Match) {
                const sigBytes = Buffer.from(base64Match[1], 'base64');
                const sigImage = await pdfDoc.embedPng(sigBytes);
                const sigDims = sigImage.scale(0.4);
                const sigW = Math.min(sigDims.width, CONTENT_W);
                const sigH = Math.min(sigDims.height, 90);

                page.drawImage(sigImage, {
                    x: MARGIN,
                    y: y - sigH,
                    width: sigW,
                    height: sigH,
                });
                y -= sigH + 10;
            }
        } catch (e) {
            console.error('[EKartaPDF] Signature embed error:', e);
            drawText('[Podpis zapisany cyfrowo]', MARGIN, y - 10, 8, rgb(0.5, 0.5, 0.5));
            y -= 20;
        }
    }

    // ─── Footer ───
    ensureSpace(30);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 12;
    drawText(`Dokument wygenerowany elektronicznie • Mikrostomart • ${date}`, MARGIN, y, 7, rgb(0.6, 0.6, 0.6));

    return pdfDoc.save();
}

// ─── Export for use by intake/submit ─────────────────────
export { generateEKartaPdf };

// ─── API Route ───────────────────────────────────────────

/**
 * POST /api/intake/generate-pdf
 * Body: { submissionId } or { prodentisPatientId }
 * Generates PDF, uploads to Supabase + Prodentis, returns URL
 */
export async function POST(req: NextRequest) {
    try {
        const { submissionId, prodentisPatientId } = await req.json();

        // Find submission
        let submission: any;
        if (submissionId) {
            const { data, error } = await supabase
                .from('patient_intake_submissions')
                .select('*')
                .eq('id', submissionId)
                .single();
            if (error || !data) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
            submission = data;
        } else if (prodentisPatientId) {
            // Find via token
            const { data: tokens } = await supabase
                .from('patient_intake_tokens')
                .select('id')
                .eq('prodentis_patient_id', prodentisPatientId);

            if (!tokens?.length) return NextResponse.json({ error: 'No intake found' }, { status: 404 });
            const tokenIds = tokens.map((t: any) => t.id);

            const { data: submissions } = await supabase
                .from('patient_intake_submissions')
                .select('*')
                .in('token_id', tokenIds)
                .order('submitted_at', { ascending: false })
                .limit(1);

            if (!submissions?.length) return NextResponse.json({ error: 'No submission found' }, { status: 404 });
            submission = submissions[0];
        } else {
            return NextResponse.json({ error: 'submissionId or prodentisPatientId required' }, { status: 400 });
        }

        // Generate PDF
        const pdfBytes = await generateEKartaPdf(submission);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        // Build filename
        const firstName = submission.first_name || 'Pacjent';
        const lastName = submission.last_name || '';
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `ekarta_${firstName}_${lastName}_${dateStr}.pdf`.replace(/\s+/g, '_');

        // Resolve prodentis patient ID
        const patientProdentisId = submission.prodentis_patient_id || prodentisPatientId;
        const storagePath = `${patientProdentisId || 'unknown'}/${fileName}`;

        // Upload to Supabase Storage (bucket: consents — reuse same bucket)
        const { error: uploadErr } = await supabase.storage
            .from('consents')
            .upload(storagePath, Buffer.from(pdfBytes), {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadErr) {
            console.error('[EKartaPDF] Upload error:', uploadErr);
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        const { data: urlData } = supabase.storage
            .from('consents')
            .getPublicUrl(storagePath);

        const pdfUrl = urlData?.publicUrl || storagePath;

        // Upload to Prodentis
        let prodentisSynced = false;
        if (patientProdentisId && PRODENTIS_API_KEY) {
            try {
                const prodentisRes = await fetch(
                    `${PRODENTIS_API}/api/patients/${patientProdentisId}/documents`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': PRODENTIS_API_KEY,
                        },
                        body: JSON.stringify({
                            fileBase64: pdfBase64,
                            fileName: fileName,
                            description: `E-Karta pacjenta — ${firstName} ${lastName} — ${dateStr}`,
                        }),
                    }
                );
                if (prodentisRes.ok) {
                    prodentisSynced = true;
                    console.log(`[EKartaPDF] Uploaded to Prodentis for patient ${patientProdentisId}`);
                } else {
                    console.error('[EKartaPDF] Prodentis upload failed:', await prodentisRes.text());
                }
            } catch (e) {
                console.error('[EKartaPDF] Prodentis upload error:', e);
            }
        }

        // Update submission with PDF URL
        await supabase
            .from('patient_intake_submissions')
            .update({ pdf_url: pdfUrl })
            .eq('id', submission.id);

        return NextResponse.json({
            success: true,
            pdfUrl,
            prodentisSynced,
            fileName,
        });
    } catch (err: any) {
        console.error('[EKartaPDF] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
