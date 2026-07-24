import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { brand } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { sendTelegramNotification } from '@/lib/telegram';

/**
 * POST /api/smile/lead — lead z symulatora metamorfozy / wyceniarki (apka).
 *
 * Pacjent DOBROWOLNIE zostawia e-mail/telefon, żeby otrzymać wynik symulacji
 * i/lub orientacyjną wycenę (Apple 5.1.1(iv): to nigdy nie jest bramka —
 * pobranie wyniku w apce pozostaje darmowe i bez danych).
 *
 * Zasady (draft #5, `DRAFT_TEKSTY_PRAWNE_LEAD_WYCENA_2026-07-22.md`):
 * - DWIE rozdzielne zgody: (a) przesłanie wyniku/wyceny — WYMAGANA,
 *   (b) kontakt handlowy — opcjonalna. Wersja tekstu zgody → kolumna
 *   consent_text_version (dowód z art. 7 RODO).
 * - Zdjęcie NIE jest zapisywane PO STRONIE KLINIKI (żadna baza/Storage/logi);
 *   tranzytuje przez dostawcę e-maili transakcyjnych (Resend Inc., USA — SCC/
 *   DPA, wpis w polityce sec9) jako załącznik wysłanej wiadomości.
 * - Retencja 12 mies. — cron data-retention-cleanup (wpis smile_leads_old).
 * - ŚWIADOMIE bez odczytu JWT: zakres zapisu = dokładnie to, co pacjent widzi
 *   w formularzu (e-mail/telefon) — zero wiązania leada z ID kartoteki.
 *
 * Body (JSON):
 * { source: 'metamorfoza'|'wycena'|'duration'|'compare', locale?, name?, email?, phone?,
 *   consentResult: true, consentMarketing?: boolean,
 *   style?, summary?, estimateMin?, estimateMax?,
 *   image?: string  // data-URL JPEG (tylko metamorfoza; NIE zapisywane) }
 *
 * 200 { ok:true, emailSent } · 400 { error } · 429 { error:'rate_limited' }
 * 503 { error:'unavailable' } (baza niedostępna — lead NIE ginie po cichu).
 */

export const maxDuration = 30;

/** Fallback, gdy apka nie przyśle własnej wersji tekstu zgody (art. 7 RODO). */
const CONSENT_TEXT_VERSION = 'smilelead-v1-2026-07';
const CONSENT_VERSION_RE = /^[a-z0-9.-]{1,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{5,19}$/;
/** ~3 MB obrazu po base64 (JPEG wyniku ma ~0,3–0,8 MB) */
const MAX_IMAGE_CHARS = 4_500_000;

/** Telegram idzie z parse_mode HTML — surowy user-input z `<` ubija CAŁĄ wiadomość. */
const tgEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type LeadSource = 'metamorfoza' | 'wycena' | 'duration' | 'compare';

type LeadBody = {
    source?: string;
    locale?: string;
    name?: string;
    email?: string;
    phone?: string;
    consentResult?: boolean;
    consentMarketing?: boolean;
    /** wersja tekstu zgody WIDZIANEGO przez usera (app OTA może zmienić copy) */
    consentTextVersion?: string;
    style?: string;
    summary?: string;
    estimateMin?: number;
    estimateMax?: number;
    image?: string;
};

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

/** apka wysyła ISO 'uk'; web używa 'ua' */
function normalizeLocale(raw: string | undefined): 'pl' | 'en' | 'de' | 'ua' {
    const l = (raw ?? 'pl').toLowerCase();
    if (l === 'uk' || l === 'ua') return 'ua';
    if (l === 'en' || l === 'de') return l;
    return 'pl';
}

/** proste sprzątanie stringów wejściowych */
function clean(v: unknown, max: number): string | null {
    if (typeof v !== 'string') return null;
    const s = v.trim().replace(/\s+/g, ' ');
    if (!s) return null;
    return s.slice(0, max);
}

// — treści maila per locale (celowo krótkie; szczegóły prawne są w polityce) —
const MAIL = {
    pl: {
        subjectResult: 'Twoja symulacja uśmiechu — Mikrostomart',
        subjectEstimate: 'Twoja orientacyjna wycena — Mikrostomart',
        hello: 'Dzień dobry',
        resultIntro: 'W załączniku przesyłamy wynik Twojej symulacji uśmiechu z aplikacji Mikrostomart.',
        estimateIntro: 'Poniżej orientacyjna wycena skonfigurowana przez Ciebie w aplikacji Mikrostomart:',
        subjectDuration: 'Twoje orientacyjne podsumowanie leczenia — Mikrostomart',
        durationIntro: 'Poniżej orientacyjne podsumowanie leczenia (liczba wizyt i czas), które przygotowałeś/aś w aplikacji Mikrostomart:',
        subjectCompare: 'Twoje porównanie metod leczenia — Mikrostomart',
        compareIntro: 'Poniżej podsumowanie porównania metod leczenia, które przygotowałeś/aś w aplikacji Mikrostomart:',
        estimateRange: 'Orientacyjny przedział',
        notAnOffer:
            'Wycena ma charakter wyłącznie poglądowy i orientacyjny. Nie stanowi oferty w rozumieniu art. 66 § 1 Kodeksu cywilnego — wiążąca wycena jest możliwa po badaniu klinicznym. Symulacja i wycena nie stanowią porady medycznej, diagnozy ani planu leczenia.',
        notAnOfferSummary:
            'Podsumowanie ma charakter wyłącznie informacyjny i orientacyjny. Nie stanowi porady medycznej, diagnozy ani planu leczenia, ani oferty w rozumieniu art. 66 § 1 Kodeksu cywilnego — o doborze metody i planie leczenia decyduje badanie kliniczne.',
        cta: 'Aby umówić konsultację, odpowiedz na tego maila lub zadzwoń:',
        withdraw:
            'Dane podane w formularzu przetwarzamy na podstawie Twojej zgody (możesz ją wycofać w każdej chwili, pisząc na',
        withdrawEnd: '). Szczegóły: polityka prywatności na',
    },
    en: {
        subjectResult: 'Your smile simulation — Mikrostomart',
        subjectEstimate: 'Your indicative estimate — Mikrostomart',
        hello: 'Hello',
        resultIntro: 'Attached is the result of your smile simulation from the Mikrostomart app.',
        estimateIntro: 'Below is the indicative estimate you configured in the Mikrostomart app:',
        subjectDuration: 'Your indicative treatment summary — Mikrostomart',
        durationIntro: 'Below is the indicative treatment summary (number of visits and duration) you prepared in the Mikrostomart app:',
        subjectCompare: 'Your treatment method comparison — Mikrostomart',
        compareIntro: 'Below is the summary of the treatment method comparison you prepared in the Mikrostomart app:',
        estimateRange: 'Indicative range',
        notAnOffer:
            'The estimate is indicative only. It does not constitute an offer within the meaning of art. 66 § 1 of the Polish Civil Code — a binding quote is possible after a clinical examination. The simulation and estimate are not medical advice, a diagnosis or a treatment plan.',
        notAnOfferSummary:
            'The summary is informational and indicative only. It does not constitute medical advice, a diagnosis or a treatment plan, nor an offer within the meaning of art. 66 § 1 of the Polish Civil Code — the choice of method and the treatment plan are determined by a clinical examination.',
        cta: 'To book a consultation, reply to this e-mail or call:',
        withdraw:
            'We process the data from this form based on your consent (you can withdraw it at any time by writing to',
        withdrawEnd: '). Details: privacy policy at',
    },
    de: {
        subjectResult: 'Ihre Lächeln-Simulation — Mikrostomart',
        subjectEstimate: 'Ihre unverbindliche Kostenschätzung — Mikrostomart',
        hello: 'Guten Tag',
        resultIntro: 'Im Anhang finden Sie das Ergebnis Ihrer Lächeln-Simulation aus der Mikrostomart-App.',
        estimateIntro: 'Unten die unverbindliche Kostenschätzung, die Sie in der Mikrostomart-App konfiguriert haben:',
        subjectDuration: 'Ihre unverbindliche Behandlungsübersicht — Mikrostomart',
        durationIntro: 'Unten die unverbindliche Behandlungsübersicht (Anzahl der Besuche und Dauer), die Sie in der Mikrostomart-App erstellt haben:',
        subjectCompare: 'Ihr Behandlungsmethoden-Vergleich — Mikrostomart',
        compareIntro: 'Unten die Zusammenfassung des Behandlungsmethoden-Vergleichs, den Sie in der Mikrostomart-App erstellt haben:',
        estimateRange: 'Unverbindliche Spanne',
        notAnOffer:
            'Die Schätzung ist unverbindlich und dient nur der Orientierung. Sie stellt kein Angebot im Sinne von Art. 66 § 1 des polnischen Zivilgesetzbuchs dar — ein verbindlicher Kostenplan ist nach einer klinischen Untersuchung möglich. Simulation und Schätzung sind keine medizinische Beratung, Diagnose oder Behandlungsplan.',
        notAnOfferSummary:
            'Die Zusammenfassung dient nur der Information und Orientierung. Sie stellt weder eine medizinische Beratung, Diagnose oder einen Behandlungsplan noch ein Angebot im Sinne von Art. 66 § 1 des polnischen Zivilgesetzbuchs dar — über die Wahl der Methode und den Behandlungsplan entscheidet die klinische Untersuchung.',
        cta: 'Für eine Beratung antworten Sie auf diese E-Mail oder rufen Sie an:',
        withdraw:
            'Die Formulardaten verarbeiten wir auf Grundlage Ihrer Einwilligung (Widerruf jederzeit möglich per E-Mail an',
        withdrawEnd: '). Details: Datenschutzerklärung auf',
    },
    ua: {
        subjectResult: 'Ваша симуляція усмішки — Mikrostomart',
        subjectEstimate: 'Ваш орієнтовний розрахунок — Mikrostomart',
        hello: 'Доброго дня',
        resultIntro: 'У вкладенні — результат вашої симуляції усмішки з застосунку Mikrostomart.',
        estimateIntro: 'Нижче — орієнтовний розрахунок, який ви налаштували в застосунку Mikrostomart:',
        subjectDuration: 'Ваш орієнтовний підсумок лікування — Mikrostomart',
        durationIntro: 'Нижче — орієнтовний підсумок лікування (кількість візитів і час), який ви підготували в застосунку Mikrostomart:',
        subjectCompare: 'Ваше порівняння методів лікування — Mikrostomart',
        compareIntro: 'Нижче — підсумок порівняння методів лікування, який ви підготували в застосунку Mikrostomart:',
        estimateRange: 'Орієнтовний діапазон',
        notAnOffer:
            'Розрахунок має виключно орієнтовний характер. Він не є офертою в розумінні ст. 66 § 1 Цивільного кодексу Польщі — остаточний розрахунок можливий після клінічного обстеження. Симуляція та розрахунок не є медичною порадою, діагнозом чи планом лікування.',
        notAnOfferSummary:
            'Підсумок має виключно інформаційний та орієнтовний характер. Він не є медичною порадою, діагнозом чи планом лікування, ані офертою в розумінні ст. 66 § 1 Цивільного кодексу Польщі — вибір методу та план лікування визначає клінічне обстеження.',
        cta: 'Щоб записатися на консультацію, дайте відповідь на цей лист або зателефонуйте:',
        withdraw:
            'Дані з форми обробляємо на підставі вашої згоди (її можна відкликати в будь-який момент, написавши на',
        withdrawEnd: '). Деталі: політика конфіденційності на',
    },
} as const;

function buildEmailHtml(
    loc: keyof typeof MAIL,
    source: LeadSource,
    name: string | null,
    summary: string | null,
    estimateMin: number | null,
    estimateMax: number | null,
): string {
    const m = MAIL[loc];
    const fmt = (n: number) => n.toLocaleString('pl-PL');
    const range =
        estimateMin != null && estimateMax != null
            ? `<p style="font-size:20px;margin:16px 0"><strong>${m.estimateRange}: ${fmt(estimateMin)}–${fmt(estimateMax)} zł</strong></p>`
            : '';
    const summaryHtml = summary
        ? `<p style="color:#444;line-height:1.5">${summary.replace(/</g, '&lt;')}</p>`
        : '';
    const intro =
        source === 'metamorfoza'
            ? m.resultIntro
            : source === 'duration'
                ? m.durationIntro
                : source === 'compare'
                    ? m.compareIntro
                    : m.estimateIntro;
    return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222">
  <h2 style="color:#b8862f">Mikrostomart</h2>
  <p>${m.hello}${name ? ` ${name.replace(/</g, '&lt;')}` : ''},</p>
  <p>${intro}</p>
  ${summaryHtml}
  ${range}
  <p style="font-size:12px;color:#666;line-height:1.5;border-left:3px solid #dcb14a;padding-left:10px">${source === 'duration' || source === 'compare' ? m.notAnOfferSummary : m.notAnOffer}</p>
  <p>${m.cta} <a href="tel:+48${brand.phone1.replace(/\D/g, '')}">${brand.phone1}</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
  <p style="font-size:11px;color:#888;line-height:1.5">
    ${m.withdraw} <a href="mailto:${brand.email}">${brand.email}</a>${m.withdrawEnd}
    <a href="https://www.mikrostomart.pl${loc === 'pl' ? '' : `/${loc}`}/polityka-prywatnosci">mikrostomart.pl</a>.
  </p>
</div>`;
}

export async function POST(req: NextRequest) {
    // — flood + dzienny limit per IP. failClosed: chroniony zasób to brandowany
    // e-mail wychodzący — awaria bazy nie może otwierać baru (wzorzec /api/smile) —
    const ip = getClientIP(req);
    const flood = await checkRateLimit(`smilelead:m:${ip}`, 5, 60_000, { failClosed: true });
    if (!flood.allowed) {
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    const daily = await checkRateLimit(`smilelead:d:${ip}`, 10, 24 * 60 * 60_000, { failClosed: true });
    if (!daily.allowed) {
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    let body: LeadBody;
    try {
        body = (await req.json()) as LeadBody;
    } catch {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const source =
        body.source === 'metamorfoza' ||
        body.source === 'wycena' ||
        body.source === 'duration' ||
        body.source === 'compare'
            ? body.source
            : null;
    if (!source) return NextResponse.json({ error: 'invalid_source' }, { status: 400 });

    // zgoda (a) — przesłanie wyniku/wyceny — jest podstawą przetwarzania: bez niej 400
    if (body.consentResult !== true) {
        return NextResponse.json({ error: 'consent_required' }, { status: 400 });
    }

    const email = clean(body.email, 160);
    const phone = clean(body.phone, 20);
    if (!email && !phone) return NextResponse.json({ error: 'contact_required' }, { status: 400 });
    if (email && !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (phone && !PHONE_RE.test(phone)) {
        return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    }

    // — anty-mail-bombing: limit per ODBIORCA (10/dzień/IP skaluje się z liczbą
    // IP; klucz per e-mail nie) —
    if (email) {
        const perRecipient = await checkRateLimit(
            `smilelead:e:${email.toLowerCase()}`,
            3,
            24 * 60 * 60_000,
            { failClosed: true },
        );
        if (!perRecipient.allowed) {
            return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
        }
    }

    const name = clean(body.name, 120);
    const summary = clean(body.summary, 1500);
    const style = ['natural', 'brighter', 'hollywood'].includes(body.style ?? '') ? (body.style as string) : null;
    const estimateMin =
        typeof body.estimateMin === 'number' && Number.isFinite(body.estimateMin)
            ? Math.max(0, Math.min(1_000_000, Math.round(body.estimateMin)))
            : null;
    const estimateMax =
        typeof body.estimateMax === 'number' && Number.isFinite(body.estimateMax)
            ? Math.max(0, Math.min(1_000_000, Math.round(body.estimateMax)))
            : null;
    const loc = normalizeLocale(body.locale);

    // obraz: TYLKO do załącznika — nigdy do bazy/Storage po stronie kliniki.
    // Twarda walidacja JPEG (magic bytes FF D8 FF) — endpoint jest publiczny,
    // nie podpisujemy nazwą kliniki dowolnych bajtów jako "metamorfoza.jpg".
    let imageBuffer: Buffer | null = null;
    if (source === 'metamorfoza' && typeof body.image === 'string' && body.image.length > 0) {
        if (body.image.length > MAX_IMAGE_CHARS) {
            return NextResponse.json({ error: 'image_too_large' }, { status: 400 });
        }
        const b64 = body.image.includes(',')
            ? body.image.slice(body.image.indexOf(',') + 1)
            : body.image;
        // Buffer.from(base64) nie rzuca — śmieci dekodują się po cichu
        const buf = Buffer.from(b64, 'base64');
        const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        if (!isJpeg) {
            return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
        }
        imageBuffer = buf;
    }

    const consentVersion =
        typeof body.consentTextVersion === 'string' && CONSENT_VERSION_RE.test(body.consentTextVersion)
            ? body.consentTextVersion
            : CONSENT_TEXT_VERSION;

    const db = getSupabase();
    if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

    const { data: inserted, error: insertError } = await db
        .from('smile_leads')
        .insert({
            source,
            channel: 'app',
            locale: loc,
            // ŚWIADOMIE null: zgoda obejmuje e-mail/telefon — nie wiążemy leada
            // z ID kartoteki pacjenta (kolumna zostaje pod przyszły kanał web)
            prodentis_id: null,
            name,
            email,
            phone,
            consent_result: true,
            consent_marketing: body.consentMarketing === true,
            consent_text_version: consentVersion,
            style,
            estimate_summary: summary,
            estimate_min: estimateMin,
            estimate_max: estimateMax,
        })
        .select('id')
        .single();

    if (insertError || !inserted) {
        console.error('[SmileLead] insert failed:', insertError?.message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }

    // — mail z wynikiem/wyceną (tylko gdy podano e-mail) —
    let emailSent = false;
    if (email) {
        const m = MAIL[loc];
        const result = await sendEmail({
            to: email,
            subject:
                source === 'metamorfoza'
                    ? m.subjectResult
                    : source === 'duration'
                        ? m.subjectDuration
                        : source === 'compare'
                            ? m.subjectCompare
                            : m.subjectEstimate,
            html: buildEmailHtml(loc, source, name, summary, estimateMin, estimateMax),
            replyTo: brand.email,
            ...(imageBuffer
                ? { attachments: [{ filename: 'metamorfoza-mikrostomart.jpg', content: imageBuffer }] }
                : {}),
        });
        emailSent = result.success;
        if (emailSent) {
            await db.from('smile_leads').update({ email_sent: true }).eq('id', inserted.id);
        } else {
            console.error('[SmileLead] email failed:', result.error);
        }
    }

    // — powiadomienie gabinetu. AWAIT (konwencja repo): fire-and-forget na
    // serverless bywa ucinany po odpowiedzi, a to jedyny realtime-sygnał leada.
    // User-input eskejpowany (parse_mode HTML). Zawartość zgodna z polityką
    // sec9 (dane kontaktowe z formularza; ZERO ID kartoteki/dok. medycznej).
    const tgLines = [
        `🧲 Nowy lead z aplikacji (${source === 'metamorfoza' ? 'symulator' : source === 'duration' ? 'kalkulator czasu' : source === 'compare' ? 'porównywarka' : 'wyceniarka'})`,
        name ? `👤 ${tgEsc(name)}` : null,
        email
            ? `✉️ ${tgEsc(email)}${emailSent ? ' (wynik wysłany)' : ' — ❌ mail NIE wysłany, wyślij ręcznie'}`
            : null,
        phone ? `📞 ${tgEsc(phone)}` : null,
        estimateMin != null && estimateMax != null
            ? `💰 ${estimateMin.toLocaleString('pl-PL')}–${estimateMax.toLocaleString('pl-PL')} zł`
            : null,
        summary ? `📋 ${tgEsc(summary.slice(0, 300))}` : null,
        body.consentMarketing === true
            ? '✅ zgoda na kontakt handlowy'
            : '⛔️ BEZ zgody na kontakt handlowy (tylko wysyłka wyniku)',
    ].filter(Boolean);
    await sendTelegramNotification(tgLines.join('\n'), 'messages');

    return NextResponse.json({ ok: true, emailSent });
}
