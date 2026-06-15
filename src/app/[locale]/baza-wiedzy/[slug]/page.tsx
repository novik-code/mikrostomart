import { supabase } from '@/lib/supabaseClient';
import { brand, brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from '@/components/RevealOnScroll';
import ArticleByline from '@/components/ArticleByline';
// H3 BUG FIX (2026-05-10): server components NIE mogą używać Link z
// @/i18n/navigation. Manualny <a> z locale prefix.
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { breadcrumbHref, getOgLocale, localizedBreadcrumb } from '@/lib/seo';
import { preferWebp } from '@/lib/imageUrl';
import { routing } from '@/i18n/routing';
import RelatedArticles from '@/components/RelatedArticles';
import { KB_NOINDEX_GROUP_IDS } from '@/lib/kbNoindex';

// S5-4 (2026-05-15): if a slug doesn't exist in the requested locale but DOES
// exist in another locale (cross-locale URL — typical Google ghost from old
// hreflang/fallback config that returned 200 with PL content), redirect 301 to
// the canonical locale URL instead of returning 404. Speeds up Google
// deindexation of the historical wrong URLs (1354 in GSC as of 2026-05-15) and
// lets external backlinks land on the correct page. Returns null when the slug
// genuinely doesn't exist anywhere (true 404).
async function findSlugInAnyLocale(slug: string): Promise<string | null> {
    const { data } = await supabase
        .from('articles')
        .select('locale')
        .eq('slug', slug)
        .eq('status', 'published')
        .limit(1)
        .single();
    return data?.locale ?? null;
}

function localePathForArticle(locale: string, slug: string): string {
    return locale === 'pl'
        ? `/baza-wiedzy/${slug}`
        : `/${locale}/baza-wiedzy/${slug}`;
}

function schemaImageUrl(image: string | null | undefined): string {
    if (!image) return `${brand.appUrl}/opengraph-image.png`;
    const absolute = image.startsWith('http') ? image : `${brand.appUrl}${image}`;
    return preferWebp(absolute) || absolute;
}

export const dynamic = 'force-dynamic'; // Must be dynamic — depends on locale URL prefix

const HREFLANG_MAP: Record<string, string> = {
    pl: 'pl',
    en: 'en',
    de: 'de',
    ua: 'uk',
};

function articleUrl(locale: string, slug: string): string {
    return locale === 'pl'
        ? `${brand.appUrl}/baza-wiedzy/${slug}`
        : `${brand.appUrl}/${locale}/baza-wiedzy/${slug}`;
}

export async function generateStaticParams() {
    const { data: articles } = await supabase
        .from('articles')
        .select('slug')
        .eq('status', 'published');
    return (articles || []).map((article) => ({
        slug: article.slug,
    }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
    const { locale, slug } = await params;
    const t = await getTranslations('bazaWiedzy');

    let { data: article } = await supabase
        .from('articles')
        .select('title, excerpt, locale, group_id, image_url')
        .eq('slug', slug)
        .eq('locale', locale)
        .eq('status', 'published')
        .single();

    // Fallback: PL version with the same slug (legacy KB articles where the
    // PL slug serves all locales until translations are imported).
    if (!article) {
        const fallback = await supabase
            .from('articles')
            .select('title, excerpt, locale, group_id, image_url')
            .eq('slug', slug)
            .eq('locale', 'pl')
            .eq('status', 'published')
            .single();
        article = fallback.data;
    }

    if (!article) {
        // S5-4: cross-locale slug — page() will issue a 301 redirect.
        // Return minimal noindex metadata so the brief render before redirect
        // (rare race) doesn't index a 404 page.
        const foundLocale = await findSlugInAnyLocale(slug);
        if (foundLocale) {
            return { robots: { index: false, follow: true } };
        }
        return { title: t('notFound') };
    }

    // Build hreflang from group_id — each translation lives as a separate row.
    const languages: Record<string, string> = {};
    if (article.group_id) {
        const { data: groupRows } = await supabase
            .from('articles')
            .select('locale, slug')
            .eq('group_id', article.group_id)
            .eq('status', 'published');
        for (const row of (groupRows || []) as Array<{ locale: string; slug: string }>) {
            const hreflang = HREFLANG_MAP[row.locale] || row.locale;
            languages[hreflang] = articleUrl(row.locale, row.slug);
        }
        const plRow = (groupRows || []).find((r: any) => r.locale === 'pl');
        if (plRow?.slug) {
            languages['x-default'] = articleUrl('pl', plRow.slug);
        }
    }
    if (!languages['x-default']) {
        languages['x-default'] = articleUrl(locale, slug);
    }

    // 3B (2026-06-09): foreign-locale URL bez własnego tłumaczenia serwuje PL body
    // (fallback `.eq('locale','pl')`). Eliminujemy duplicate-content/language-mismatch:
    // noindex + canonical → PL oryginał. Prawdziwe tłumaczenia (article.locale === locale)
    // pozostają indexable + canonical self.
    const fellBackToPl = article.locale !== locale;
    const canonical = fellBackToPl
        ? `/baza-wiedzy/${slug}`
        : (locale === routing.defaultLocale ? `/baza-wiedzy/${slug}` : `/${locale}/baza-wiedzy/${slug}`);

    // KB cleanup (2026-06-15, GEO 5.3): Grupa C — cienkie clickbaity oznaczone
    // noindex (denylist po group_id w kbNoindex.ts → wszystkie locale). Zostają
    // dla userów, wypadają z indeksu. follow:true → link equity z in-body/related płynie.
    const isNoindexed = article.group_id ? KB_NOINDEX_GROUP_IDS.has(article.group_id) : false;

    return {
        title: { absolute: `${article.title} | ${t('metaSuffix', brandI18nParams())}` },
        description: article.excerpt,
        ...(fellBackToPl || isNoindexed ? { robots: { index: false, follow: true } } : {}),
        alternates: { canonical, languages },
        openGraph: {
            title: article.title,
            description: article.excerpt,
            type: 'article',
            url: articleUrl(locale, slug),
            locale: getOgLocale(locale),
            images: article.image_url ? [{ url: schemaImageUrl(article.image_url) }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.excerpt,
        },
    };
}

export default async function ArticlePage({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>;
}) {
    const { locale, slug } = await params;
    const t = await getTranslations('bazaWiedzy');

    // Try to find article in the current locale
    let { data: article } = await supabase
        .from('articles')
        .select('*, image:image_url, date:published_date')
        .eq('slug', slug)
        .eq('locale', locale)
        .eq('status', 'published')
        .single();

    // Fallback: try Polish version if not found in current locale (legacy
    // articles where the PL slug serves multiple locales until translations
    // land in the DB).
    if (!article) {
        const { data: fallback } = await supabase
            .from('articles')
            .select('*, image:image_url, date:published_date')
            .eq('slug', slug)
            .eq('locale', 'pl')
            .eq('status', 'published')
            .single();
        article = fallback;
    }

    if (!article) {
        // S5-4 (2026-05-15): cross-locale slug — slug exists in another locale
        // (Google's historical wrong URL from old hreflang/fallback config).
        // Redirect 301 to canonical locale URL instead of 404 — accelerates
        // GSC deindexation of ~1354 historical wrong URLs and gives external
        // backlinks a soft landing on the right page.
        const foundLocale = await findSlugInAnyLocale(slug);
        if (foundLocale && foundLocale !== locale) {
            permanentRedirect(localePathForArticle(foundLocale, slug));
        }
        notFound();
    }

    // Article JSON-LD — knowledge base posts use Article (educational content) rather
    // than NewsArticle. Helps Google distinguish evergreen articles from news.
    //
    // J-1 (2026-05-12): added articleSection + wordCount (+ keywords if tags present)
    // — schema completeness boost for educational/evergreen content classification.
    const SECTION_LABELS: Record<string, string> = {
        pl: 'Baza wiedzy',
        en: 'Knowledge Base',
        de: 'Wissensdatenbank',
        ua: 'База знань',
    };
    const wordCount = ((article.content || '') as string)
        .replace(/[#*`_\[\]()!\-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
    const tagsCsv = Array.isArray(article.tags) && article.tags.length > 0
        ? (article.tags as string[]).join(', ')
        : null;

    // Physician @id reference — konsoliduje autora/recenzenta z pełnym węzłem
    // Physician Marcina (personSchemas.ts: `${brand.appUrl}/#marcin-nowosielski`),
    // emitowanym na /zespol/marcin-nowosielski + homepage → Google Knowledge Graph.
    const physicianRef = {
        "@type": "Physician",
        "@id": `${brand.appUrl}/#marcin-nowosielski`,
        "name": "Marcin Nowosielski",
        "url": `${brand.appUrl}/zespol/marcin-nowosielski`,
    };

    // MedicalWebPage (zamiast Article) — treść medyczna z sygnałem recenzji lekarskiej
    // (reviewedBy + lastReviewed). Brak embedded Review/aggregateRating (self-serving, GSC).
    const articleSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "headline": article.title,
        "name": article.title,
        "description": article.excerpt,
        "image": schemaImageUrl(article.image),
        "datePublished": article.date,
        "dateModified": article.updated_at || article.date,
        "lastReviewed": article.updated_at || article.date,
        "author": physicianRef,
        "reviewedBy": physicianRef,
        "publisher": {
            "@type": "Organization",
            "name": brand.name,
            "url": brand.appUrl,
            "logo": {
                "@type": "ImageObject",
                "url": brand.schemaLogo,
            },
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": articleUrl(locale, slug),
        },
        "inLanguage": HREFLANG_MAP[locale] || locale,
        "articleSection": SECTION_LABELS[locale] || SECTION_LABELS.pl,
        ...(wordCount > 0 ? { wordCount } : {}),
        ...(tagsCsv ? { keywords: tagsCsv } : {}),
    };

    // Breadcrumb: Home > Knowledge Base > [article title]
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'baza-wiedzy', url: breadcrumbHref(locale, '/baza-wiedzy') },
        { name: article.title },
    ]);

    return (
        <main style={{ background: "var(--color-background)" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
            />
            <article className="container" style={{ padding: "8rem 2rem 4rem", maxWidth: "800px" }}>

                {/* Back Link — locale-aware via manual prefix (server component) */}
                <div style={{ marginBottom: "2rem" }}>
                    <a href={locale === 'pl' ? '/baza-wiedzy' : `/${locale}/baza-wiedzy`} style={{
                        color: "var(--color-text-muted)",
                        textDecoration: "none",
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        transition: "color 0.2s"
                    }}
                        className="hover:text-primary"
                    >
                        &larr; {t('backToList')}
                    </a>
                </div>

                <RevealOnScroll>
                    <header style={{ marginBottom: "3rem", textAlign: "center" }}>
                        <h1 style={{
                            fontSize: "clamp(2rem, 4vw, 3rem)",
                            lineHeight: "1.2",
                            marginBottom: "2rem"
                        }}>
                            {article.title}
                        </h1>
                        <ArticleByline
                            locale={locale}
                            datePublished={article.date}
                            dateModified={article.updated_at}
                        />
                        <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                            <Image
                                src={article.image}
                                alt={article.title}
                                fill
                                sizes="(max-width: 800px) 100vw, 800px"
                                style={{ objectFit: "cover" }}
                                priority
                            />
                            <div style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                background: "rgba(0,0,0,0.6)",
                                padding: "0.5rem 1rem",
                                borderTopRightRadius: "var(--radius-md)",
                                color: "var(--color-primary)",
                                fontWeight: 600,
                                backdropFilter: "blur(4px)"
                            }}>
                                {article.date}
                            </div>
                        </div>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up" priority>
                    <div className="article-content" style={{
                        color: "var(--color-text-muted)",
                        lineHeight: "1.8",
                        fontSize: "1.05rem"
                    }}>
                        {/* Improved manual markdown parser */}
                        {article.content.split('\n').map((line: string, index: number) => {
                            // Headers
                            if (line.startsWith('### ')) {
                                return <h3 key={index} style={{ color: "var(--color-text)", fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem" }}>{line.replace('### ', '')}</h3>;
                            }
                            if (line.startsWith('#### ')) {
                                return <h4 key={index} style={{ color: "var(--color-text)", fontSize: "1.25rem", marginTop: "1.5rem", marginBottom: "0.75rem" }}>{line.replace('#### ', '')}</h4>;
                            }

                            // Images: ![alt](src)
                            const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
                            if (imgMatch) {
                                return (
                                    <div key={index} style={{ margin: "2rem 0", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                                        <img
                                            src={imgMatch[2]}
                                            alt={imgMatch[1]}
                                            style={{ width: "100%", height: "auto", display: "block" }}
                                        />
                                    </div>
                                );
                            }

                            // Inline parser — supports **bold** + [text](url) (L-5 2026-05-22)
                            const INLINE_SPLIT_RE = /(\*\*.*?\*\*|\[[^\]]+\]\([^)]+\))/g;
                            const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;
                            const renderInline = (text: string, keyPrefix: string) =>
                                text.split(INLINE_SPLIT_RE).map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return (
                                            <strong key={`${keyPrefix}-${i}`} style={{ color: "var(--color-primary)" }}>
                                                {part.slice(2, -2)}
                                            </strong>
                                        );
                                    }
                                    const linkMatch = part.match(LINK_RE);
                                    if (linkMatch) {
                                        const [, label, href] = linkMatch;
                                        const isExternal = /^https?:\/\//.test(href);
                                        return (
                                            <a
                                                key={`${keyPrefix}-${i}`}
                                                href={href}
                                                style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                                                {...(isExternal ? { rel: "noopener noreferrer", target: "_blank" } : {})}
                                            >
                                                {label}
                                            </a>
                                        );
                                    }
                                    return part;
                                });

                            // List items
                            if (line.startsWith('* ')) {
                                const content = line.replace('* ', '');
                                return (
                                    <li key={index} style={{ marginLeft: "1.5rem", marginBottom: "0.5rem" }}>
                                        {renderInline(content, `li-${index}`)}
                                    </li>
                                );
                            }

                            // Empty lines
                            if (line.trim() === '') return <br key={index} />;

                            // Paragraphs with inline bold + link support
                            return (
                                <p key={index} style={{ marginBottom: "1rem" }}>
                                    {renderInline(line, `p-${index}`)}
                                </p>
                            );
                        })}
                    </div>
                </RevealOnScroll>

                <RelatedArticles
                    kind="kb"
                    locale={locale}
                    currentSlug={slug}
                    title={article.title}
                    tags={article.tags}
                />

            </article>
        </main>
    );
}
