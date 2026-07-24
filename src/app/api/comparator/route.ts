import { NextRequest, NextResponse } from 'next/server';

import type { Method, TableCell } from '@/app/[locale]/porownywarka/comparatorTypes';
import { getComparatorData, WEIGHTS } from '@/app/[locale]/porownywarka/getComparatorData';

/**
 * GET /api/comparator?locale=pl|en|de|ua (apka wysyła też 'uk' → alias 'ua')
 *
 * Read-only, publiczny katalog danych porównywarki metod leczenia dla APKI
 * (natywny ekran konsumuje dane; silnik scoringu jest sforkowany w apce).
 * Treść medyczna edytowalna po stronie weba BEZ resubmitu apki.
 *
 * Zasady kontraktu (analiza `bałagan/ANALIZA_POROWNYWARKA_MIGRACJA_2026-07-24.md`):
 * - Dane w 100% deklaratywne (zweryfikowany JSON round-trip) — serializujemy
 *   ComparatorDataSet MINUS 2 funkcje; template rekomendacji idzie jako string
 *   z placeholderami {priorityLabel}/{methodLabel}/{methodShort} + osobny
 *   badgeSuffix (podstawia apka). Brzmienia = reframe MDR (neutralne).
 * - PL-FALLBACK PER METODA: EN/DE/UA mają dziś 37/71 braków → 14 z 29
 *   komparatorów renderowało się pusto. Brakujący id serwujemy z PL, a po
 *   wgraniu tłumaczeń fallback wygasa naturalnie.
 * - INWARIANTY ZAWSZE Z PL (źródło prawdy): metrics/scale/recommendedSpecialist/
 *   icon/color — naprawia dryf liczb scaling/sealant/fluoride_varnish między
 *   locale (inne rankingi per język) i dryf specjalisty CTA.
 * - Iterujemy po kluczach PL → 18 „sierot" per locale (id spoza scenariuszy)
 *   nigdy nie wychodzi na świat.
 * - Kolizje id między tabelami (full_denture = comparator I metoda;
 *   veneer_brux = reguła I metoda) — kontrakt trzyma osobne mapy per tabela.
 * - `weights` w payloadzie (nie w apce) — wagi priorytetów edytowalne bez
 *   resubmitu; apka używa ich w sforkowanym silniku.
 */

export const maxDuration = 15;

type ApiLocale = 'pl' | 'en' | 'de' | 'ua';

function normalizeLocale(raw: string | null): ApiLocale {
    const l = (raw ?? 'pl').toLowerCase();
    if (l === 'uk' || l === 'ua') return 'ua';
    if (l === 'en' || l === 'de') return l;
    return 'pl';
}

// Teksty karty podsumowania — reframe MDR (spójne z web getRecommendationText_*).
// Template'y: apka podstawia placeholdery i dokleja badgeSuffix, gdy są badge'e.
const TEXTS: Record<ApiLocale, { recommendationTemplate: string; recommendationBadgeSuffix: string; comparisonNote: string }> = {
    pl: {
        recommendationTemplate:
            'W tym zestawieniu, przy priorytecie „**{priorityLabel}**", korzystnie wypada **{methodLabel}**: {methodShort}',
        recommendationBadgeSuffix: 'Zwróć uwagę na informacje poniżej.',
        comparisonNote: 'To porównanie informacyjne — o doborze metody decyduje badanie kliniczne.',
    },
    en: {
        recommendationTemplate:
            'In this comparison, with the "**{priorityLabel}**" priority, **{methodLabel}** comes out favourably: {methodShort}',
        recommendationBadgeSuffix: 'Please note the information below.',
        comparisonNote: 'This is an informational comparison — the choice of method is determined by a clinical examination.',
    },
    de: {
        recommendationTemplate:
            'In diesem Vergleich schneidet bei der Priorität „**{priorityLabel}**" **{methodLabel}** günstig ab: {methodShort}',
        recommendationBadgeSuffix: 'Beachten Sie die Hinweise unten.',
        comparisonNote: 'Dies ist ein informativer Vergleich — über die Wahl der Methode entscheidet die klinische Untersuchung.',
    },
    ua: {
        recommendationTemplate:
            'У цьому порівнянні, з пріоритетом «**{priorityLabel}**», вигідно виглядає **{methodLabel}**: {methodShort}',
        recommendationBadgeSuffix: 'Зверніть увагу на інформацію нижче.',
        comparisonNote: 'Це інформаційне порівняння — вибір методу визначає клінічне обстеження.',
    },
};

/**
 * Komórka tabeli: stringi z locale, `scale` ZAWSZE z PL.
 * 🔑 Gdy locale ma WŁASNY scale różny od PL, jego value/tooltip pisano pod
 * inną skalę (dryf treści, np. EN scaling „None" przy PL scale 4) — taka
 * para byłaby wewnętrznie sprzeczna na ekranie. Traktujemy komórkę jako
 * nieprzetłumaczoną i serwujemy całą z PL (tłumaczenia F1 to nadpiszą).
 */
function mergeCell(pl: TableCell, loc: TableCell | undefined): TableCell {
    const locUsable = loc !== undefined && (loc.scale === undefined || loc.scale === pl.scale);
    const src = locUsable ? loc : undefined;
    return {
        value: src?.value ?? pl.value,
        ...(pl.scale !== undefined ? { scale: pl.scale } : {}),
        ...((src?.tooltip ?? pl.tooltip) !== undefined ? { tooltip: src?.tooltip ?? pl.tooltip } : {}),
    };
}

/** Metoda: tłumaczone stringi z locale (gdy są), inwarianty zawsze z PL. */
function mergeMethod(pl: Method, loc: Method | undefined): Method {
    if (!loc) return pl; // PL-fallback per metoda (brak tłumaczenia)
    return {
        id: pl.id,
        label: loc.label,
        short: loc.short,
        icon: pl.icon,
        color: pl.color,
        metrics: pl.metrics,
        recommendedSpecialist: pl.recommendedSpecialist,
        table: {
            time: mergeCell(pl.table.time, loc.table.time),
            visits: mergeCell(pl.table.visits, loc.table.visits),
            durability: mergeCell(pl.table.durability, loc.table.durability),
            invasiveness: mergeCell(pl.table.invasiveness, loc.table.invasiveness),
            risk: mergeCell(pl.table.risk, loc.table.risk),
            hygiene: mergeCell(pl.table.hygiene, loc.table.hygiene),
            worksWhen: loc.table.worksWhen?.length ? loc.table.worksWhen : pl.table.worksWhen,
            notIdealWhen: loc.table.notIdealWhen?.length ? loc.table.notIdealWhen : pl.table.notIdealWhen,
            maintenance: mergeCell(pl.table.maintenance, loc.table.maintenance),
        },
    };
}

export function GET(req: NextRequest) {
    const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

    const pl = getComparatorData('pl');
    const loc = getComparatorData(locale);

    // Iteracja po PL = kanoniczny zestaw 71 id (sieroty locale odpadają same).
    const methods: Record<string, Method> = {};
    for (const [id, plMethod] of Object.entries(pl.methods)) {
        methods[id] = locale === 'pl' ? plMethod : mergeMethod(plMethod, loc.methods[id]);
    }

    return NextResponse.json(
        {
            version: 1,
            locale,
            categories: loc.categories,
            priorities: loc.priorities,
            weights: WEIGHTS,
            tableRowLabels: loc.tableRowLabels,
            comparators: loc.comparators,
            methods,
            gatingRules: loc.gatingRules,
            texts: TEXTS[locale],
        },
        {
            headers: {
                // CDN: godzina świeżości + doba stale-while-revalidate; treść
                // zmienia się tylko deployem, więc to i tak górna granica opóźnienia.
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        },
    );
}
