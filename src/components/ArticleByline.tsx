// Audyt SEO 2026-06 (E-E-A-T): widoczny byline autora/recenzenta + daty publikacji/
// aktualizacji z <time datetime>. Treść medyczna (YMYL) — Google ceni widocznego
// eksperta (Marcin: M.Sc. RWTH, LA&HA, Czelej) bardziej niż sam schema JSON-LD.
//
// SERVER COMPONENT (brak "use client") — używa <a href> z manualnym locale prefix,
// NIE next-intl Link (useLocale = client hook → SSR 500, lekcja feedback_h3_server_link_bug).

const LABELS: Record<string, { author: string; reviewed: string; published: string; updated: string }> = {
    pl: { author: 'Autor', reviewed: 'recenzja medyczna', published: 'Opublikowano', updated: 'Zaktualizowano' },
    en: { author: 'Author', reviewed: 'medically reviewed', published: 'Published', updated: 'Updated' },
    de: { author: 'Autor', reviewed: 'fachlich geprüft', published: 'Veröffentlicht', updated: 'Aktualisiert' },
    ua: { author: 'Автор', reviewed: 'медична рецензія', published: 'Опубліковано', updated: 'Оновлено' },
};

const INTL_LOCALE: Record<string, string> = {
    pl: 'pl-PL', en: 'en-GB', de: 'de-DE', ua: 'uk-UA',
};

function parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export default function ArticleByline({
    locale,
    datePublished,
    dateModified,
}: {
    locale: string;
    datePublished?: string | null;
    dateModified?: string | null;
}) {
    const labels = LABELS[locale] || LABELS.pl;
    const intl = INTL_LOCALE[locale] || 'pl-PL';
    const marcinHref = locale === 'pl' ? '/zespol/marcin-nowosielski' : `/${locale}/zespol/marcin-nowosielski`;

    const pub = parseDate(datePublished);
    const mod = parseDate(dateModified);
    // Pokaż "Zaktualizowano" tylko gdy dzień modyfikacji różni się od publikacji.
    const showUpdated = pub && mod && mod.toISOString().slice(0, 10) !== pub.toISOString().slice(0, 10);

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem 0.85rem',
            margin: '0 auto 1.75rem',
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
        }}>
            <span>
                {labels.author}:{' '}
                <a
                    href={marcinHref}
                    style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                    rel="author"
                >
                    Marcin Nowosielski, M.Sc. RWTH Aachen
                </a>
            </span>
            <span aria-hidden="true">·</span>
            <span title={labels.reviewed} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                🩺 {labels.reviewed}
            </span>
            {pub && (
                <>
                    <span aria-hidden="true">·</span>
                    <span>
                        {labels.published}{' '}
                        <time dateTime={pub.toISOString().slice(0, 10)}>
                            {pub.toLocaleDateString(intl)}
                        </time>
                    </span>
                </>
            )}
            {showUpdated && mod && (
                <>
                    <span aria-hidden="true">·</span>
                    <span>
                        {labels.updated}{' '}
                        <time dateTime={mod.toISOString().slice(0, 10)}>
                            {mod.toLocaleDateString(intl)}
                        </time>
                    </span>
                </>
            )}
        </div>
    );
}
