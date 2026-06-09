// Blok „Zobacz też" (SEO Faza 3A, 2026-06-09) — server-rendered powiązane artykuły
// (po wspólnych tagach, fallback: najnowsze tej samej kategorii) + 1 link do
// powiązanej usługi /oferta/* (link-equity treść → money page; domyka thin KB).
//
// SERVER COMPONENT (brak "use client") — <a href> z manualnym locale prefix,
// NIE next-intl Link (useLocale = client hook → SSR 500, lekcja H3 2026-05-10).
// Labels inline (jak ArticleByline) — świadomie BEZ round-tripu i18n pages.json.

import { supabase } from '@/lib/supabaseClient';
import { relatedServiceLink } from '@/lib/internalLinks';

type Kind = 'blog' | 'kb' | 'news';

const LABELS: Record<string, { heading: string; service: string }> = {
    pl: { heading: 'Zobacz też', service: 'Powiązana usługa' },
    en: { heading: 'See also', service: 'Related service' },
    de: { heading: 'Auch interessant', service: 'Passende Leistung' },
    ua: { heading: 'Дивіться також', service: "Пов'язана послуга" },
};

const KIND_BASE: Record<Kind, string> = {
    blog: '/nowosielski',
    kb: '/baza-wiedzy',
    news: '/aktualnosci',
};

interface RelatedItem {
    slug: string;
    title: string;
}

function localePath(locale: string, path: string): string {
    return locale === 'pl' ? path : `/${locale}${path}`;
}

/** Pobierz powiązane artykuły danego typu — najpierw po wspólnych tagach, potem dobierz najnowsze. */
async function fetchRelated(
    kind: Kind,
    locale: string,
    currentSlug: string,
    tags: string[] | null,
    limit = 3,
): Promise<RelatedItem[]> {
    const seen = new Set<string>([currentSlug]);
    const items: RelatedItem[] = [];

    const pushRows = (rows: any[] | null | undefined) => {
        for (const r of rows || []) {
            if (!r?.slug || seen.has(r.slug) || items.length >= limit) continue;
            const title = kind === 'news'
                ? (locale !== 'pl' && r[`title_${locale}`]) || r.title
                : r.title;
            if (!title) continue;
            seen.add(r.slug);
            items.push({ slug: r.slug, title });
        }
    };

    try {
        if (kind === 'news') {
            const sel = 'slug, title, title_en, title_de, title_ua, date, tags';
            if (tags && tags.length > 0) {
                let q = supabase.from('news').select(sel).overlaps('tags', tags)
                    .neq('slug', currentSlug).order('date', { ascending: false }).limit(limit + 4);
                if (locale !== 'pl') q = q.not(`title_${locale}`, 'is', null);
                pushRows((await q).data);
            }
            if (items.length < limit) {
                let q = supabase.from('news').select(sel)
                    .neq('slug', currentSlug).order('date', { ascending: false }).limit(limit + 6);
                if (locale !== 'pl') q = q.not(`title_${locale}`, 'is', null);
                pushRows((await q).data);
            }
        } else {
            const table = kind === 'blog' ? 'blog_posts' : 'articles';
            const dateCol = kind === 'blog' ? 'date' : 'published_date';
            // KB `articles` nie ma kolumny `tags` (tylko blog_posts/news mają, mig 131)
            // → dla KB pomijamy dopasowanie po tagach i dobieramy najnowsze.
            const hasTags = kind === 'blog';
            const sel = hasTags ? `slug, title, ${dateCol}, tags` : `slug, title, ${dateCol}`;
            const base = () => supabase.from(table).select(sel).eq('locale', locale).neq('slug', currentSlug);
            if (hasTags && tags && tags.length > 0) {
                pushRows((await base().overlaps('tags', tags).order(dateCol, { ascending: false, nullsFirst: false }).limit(limit + 4)).data);
            }
            if (items.length < limit) {
                pushRows((await base().order(dateCol, { ascending: false, nullsFirst: false }).limit(limit + 6)).data);
            }
        }
    } catch {
        // never break the page over a related-articles query
    }
    return items.slice(0, limit);
}

export default async function RelatedArticles({
    kind,
    locale,
    currentSlug,
    title,
    tags,
}: {
    kind: Kind;
    locale: string;
    currentSlug: string;
    title: string;
    tags?: string[] | null;
}) {
    const labels = LABELS[locale] || LABELS.pl;
    const related = await fetchRelated(kind, locale, currentSlug, tags ?? null);
    const service = relatedServiceLink(`${title} ${(tags || []).join(' ')}`, locale);

    if (related.length === 0 && !service) return null;

    const base = KIND_BASE[kind];

    return (
        <aside
            aria-label={labels.heading}
            style={{
                maxWidth: '800px',
                margin: '3rem auto 0',
                padding: '1.75rem 2rem',
                borderTop: '1px solid rgba(var(--color-primary-rgb), 0.25)',
            }}
        >
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
                {labels.heading}
            </h2>

            {related.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {related.map((item) => (
                        <li key={item.slug} style={{ display: 'flex', gap: '0.6rem' }}>
                            <span aria-hidden="true" style={{ color: 'var(--color-primary)' }}>›</span>
                            <a
                                href={localePath(locale, `${base}/${item.slug}`)}
                                style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}
                                className="hover:text-primary"
                            >
                                {item.title}
                            </a>
                        </li>
                    ))}
                </ul>
            )}

            {service && (
                <p style={{ marginTop: related.length > 0 ? '1.25rem' : 0, fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>
                    {labels.service}:{' '}
                    <a
                        href={service.href}
                        style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}
                    >
                        {service.label}
                    </a>
                </p>
            )}
        </aside>
    );
}
