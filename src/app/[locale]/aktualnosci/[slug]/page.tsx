
import RevealOnScroll from '@/components/RevealOnScroll';
import Link from 'next/link';
import Image from 'next/image';
import { permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { getTranslations } from 'next-intl/server';
import { brand } from '@/lib/brandConfig';
import { breadcrumbHref, getOgLocale, localizedBreadcrumb } from '@/lib/seo';
import { preferWebp } from '@/lib/imageUrl';
import { routing } from '@/i18n/routing';

// S5-2 (2026-05-15): if a foreign locale lacks a translation for this article,
// return 404 instead of silently serving the PL fallback content. Foreign-locale
// URLs without their own translation pollute Google with duplicate-content
// signals (same Polish text under /en/aktualnosci/<slug>, /de/..., /ua/...) and
// confuse hreflang.
//
// S5-4 (2026-05-15): upgraded from 404 → 301 redirect to PL. News slugs are
// shared across locales (one row in `news` table, translations in {field}_{locale}
// columns) — so the canonical version is always PL. Sending the user/Googlebot
// to PL is more useful than 404, and Google deindexes the foreign URL faster
// when it sees a permanent redirect.
function hasTranslation(article: any, locale: string): boolean {
    if (locale === 'pl') return true;
    return Boolean(article[`title_${locale}`]);
}

function schemaImageUrl(image: string | null | undefined): string {
    if (!image) return `${brand.appUrl}/opengraph-image.png`;
    const absolute = image.startsWith('http') ? image : `${brand.appUrl}${image}`;
    return preferWebp(absolute) || absolute;
}

const HREFLANG_MAP: Record<string, string> = {
    pl: 'pl',
    en: 'en',
    de: 'de',
    ua: 'uk',
};

function articleUrl(locale: string, slug: string): string {
    return locale === 'pl'
        ? `${brand.appUrl}/aktualnosci/${slug}`
        : `${brand.appUrl}/${locale}/aktualnosci/${slug}`;
}

// Supported locale suffixes
const LOCALE_SUFFIXES = ['en', 'de', 'ua'] as const;
type LocaleSuffix = typeof LOCALE_SUFFIXES[number];

function isLocaleSuffix(s: string): s is LocaleSuffix {
    return (LOCALE_SUFFIXES as readonly string[]).includes(s);
}

function localizeArticle(article: any, locale: string) {
    if (locale !== 'pl' && isLocaleSuffix(locale)) {
        return {
            ...article,
            title: article[`title_${locale}`] || article.title,
            excerpt: article[`excerpt_${locale}`] || article.excerpt,
            content: article[`content_${locale}`] || article.content,
        };
    }
    return article;
}

async function getArticle(slug: string) {
    const { data: article } = await supabase
        .from('news')
        .select('*')
        .eq('slug', slug)
        .single();
    return article;
}

// Allow dynamic paths
export const dynamicParams = true;
// Revalidate co 60s — admin update treści przez UI lub script seedingu (2026-05-19)
// odświeży się bez konieczności full rebuild. Listing /aktualnosci ma revalidate=600
// (S5-2), tutaj krótszy bo content edits zdarzają się częściej niż listing changes.
export const revalidate = 60;

// Generate static params only for (locale, slug) pairs where a translation exists.
// PL is always present; EN/DE/UA only when the corresponding title_{locale} is set.
// S5-2 (2026-05-15): previously emitted full Cartesian product, which prerendered
// foreign URLs with PL fallback content (duplicate-content SEO penalty).
export async function generateStaticParams() {
    const { data: articles } = await supabase
        .from('news')
        .select('slug, title_en, title_de, title_ua');
    if (!articles) return [];
    const params: Array<{ locale: string; slug: string }> = [];
    for (const article of articles) {
        if (!article.slug) continue;
        params.push({ locale: 'pl', slug: article.slug });
        if (article.title_en) params.push({ locale: 'en', slug: article.slug });
        if (article.title_de) params.push({ locale: 'de', slug: article.slug });
        if (article.title_ua) params.push({ locale: 'ua', slug: article.slug });
    }
    return params;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const article = await getArticle(slug);
    const t = await getTranslations('aktualnosci');
    if (!article) return { title: t('articleNotFound') };
    if (!hasTranslation(article, locale)) {
        // S5-4: page() will permanentRedirect to PL — keep metadata noindex
        // for the brief render window before redirect kicks in.
        return { robots: { index: false, follow: true } };
    }
    const localized = localizeArticle(article, locale);

    // News articles share the same slug across locales (translations live in {field}_{locale} columns).
    // Build hreflang only for locales that have a translation present.
    const languages: Record<string, string> = {
        pl: articleUrl('pl', slug),
        'x-default': articleUrl('pl', slug),
    };
    if (article.title_en) languages.en = articleUrl('en', slug);
    if (article.title_de) languages.de = articleUrl('de', slug);
    if (article.title_ua) languages.uk = articleUrl('ua', slug);

    const canonical = locale === routing.defaultLocale
        ? `/aktualnosci/${slug}`
        : `/${locale}/aktualnosci/${slug}`;

    // Per-article keywords z DB `news.tags` (mig 131). Brak tags → undefined,
    // wtedy meta name="keywords" dziedziczy z layout `/aktualnosci/layout.tsx`
    // (generic "aktualności dentysta opole, mikrostomart blog..."). Per-article
    // tags pozwalają targetować long-tail SEO (np. "metamorfoza implant
    // augmentacja endodoncja mikroskop ZEISS").
    const perArticleKeywords = Array.isArray(localized.tags) && localized.tags.length > 0
        ? (localized.tags as string[])
        : undefined;

    return {
        title: { absolute: `${localized.title} | ${brand.name}` },
        description: localized.excerpt,
        ...(perArticleKeywords ? { keywords: perArticleKeywords } : {}),
        alternates: { canonical, languages },
        openGraph: {
            title: localized.title,
            description: localized.excerpt,
            type: 'article',
            url: articleUrl(locale, slug),
            locale: getOgLocale(locale),
            images: localized.image
                ? [{ url: schemaImageUrl(localized.image) }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: localized.title,
            description: localized.excerpt,
        },
    };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    const article = await getArticle(slug);
    const t = await getTranslations('aktualnosci');

    if (!article) {
        // Slug not in `news` table — likely an old Joomla URL that 198-error'd in GSC.
        // Redirect to listing instead of 404. Catches all 198 dead URLs from GSC export
        // 2026-05-09 (replacing the next.config.ts regex catchall that mistakenly caught
        // new articles with numeric-ID slugs like 319-wybielanie-na-jednej-wizycie).
        const localePrefix = locale === 'pl' ? '' : `/${locale}`;
        // permanentRedirect = HTTP 308 (better for SEO than 307 from regular redirect)
        permanentRedirect(`${localePrefix}/aktualnosci`);
    }

    // S5-4 (2026-05-15): foreign locale without translation → 301 redirect to
    // PL canonical (was 404 from S5-2). News slug is shared across locales, so
    // PL always exists for any valid slug. Sending Google a 301 deindexes the
    // wrong URL faster than 404 + lands external backlinks on the PL article.
    if (!hasTranslation(article, locale)) {
        permanentRedirect(`/aktualnosci/${slug}`);
    }

    // Use locale from URL params (more reliable than getLocale() which depends on
    // next-intl middleware having populated the request context).
    const localizedArticle = localizeArticle(article, locale);

    // NewsArticle JSON-LD schema for rich snippets in Google News + general search.
    // dateModified prefers updated_at if available — falls back to date so Google
    // sees a freshness signal whenever Supabase tracks it.
    //
    // J-1 (2026-05-12): added articleSection + wordCount (+ keywords if tags present)
    // for schema completeness. Google uses these to classify content type and
    // surface "News" rich snippets / topic clusters.
    const SECTION_LABELS: Record<string, string> = {
        pl: 'Aktualności',
        en: 'News',
        de: 'Aktuelles',
        ua: 'Новини',
    };
    const wordCount = ((localizedArticle.content || '') as string)
        .replace(/[#*`_\[\]()!\-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
    const tagsCsv = Array.isArray(localizedArticle.tags) && localizedArticle.tags.length > 0
        ? (localizedArticle.tags as string[]).join(', ')
        : null;

    // Audyt SEO 2026-06: autor jako Physician @id (konsoliduje z węzłem Marcina z
    // personSchemas.ts) zamiast inline Person → /o-nas. Naprawia reciprocal link
    // (Knowledge Graph) + stale URL (dedykowana strona to /zespol/marcin-nowosielski).
    const physicianRef = {
        "@type": "Physician",
        "@id": `${brand.appUrl}/#marcin-nowosielski`,
        "name": "Marcin Nowosielski",
        "url": `${brand.appUrl}/zespol/marcin-nowosielski`,
    };

    const articleSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": localizedArticle.title,
        "description": localizedArticle.excerpt,
        "image": schemaImageUrl(localizedArticle.image),
        "datePublished": localizedArticle.date,
        "dateModified": localizedArticle.updated_at || localizedArticle.date,
        "author": physicianRef,
        "publisher": {
            "@type": "Organization",
            "name": brand.name,
            "url": brand.appUrl,
            "logo": {
                "@type": "ImageObject",
                "url": brand.schemaImage,
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

    // Breadcrumb for SERP trail: Home > News > [article title]
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'aktualnosci', url: breadcrumbHref(locale, '/aktualnosci') },
        { name: localizedArticle.title }, // current page
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

                {/* Back Link — styled as a button + locale-aware href */}
                <div style={{ marginBottom: "2rem" }}>
                    <Link href={`${locale === 'pl' ? '' : `/${locale}`}/aktualnosci`} style={{
                        color: "var(--color-primary)",
                        textDecoration: "none",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 1.2rem",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.4)",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(var(--color-primary-rgb), 0.05)",
                        transition: "all 0.2s ease",
                    }}
                        className="news-back-btn"
                    >
                        {t('backToNews')}
                    </Link>
                    <style>{`
                        .news-back-btn:hover {
                            background: var(--color-primary) !important;
                            color: var(--color-background) !important;
                            border-color: var(--color-primary) !important;
                            transform: translateX(-2px);
                        }
                    `}</style>
                </div>

                <RevealOnScroll>
                    <header style={{ marginBottom: "3rem", textAlign: "center" }}>
                        <h1 style={{
                            fontSize: "clamp(2rem, 4vw, 3rem)",
                            lineHeight: "1.2",
                            marginBottom: "2rem"
                        }}>
                            {localizedArticle.title}
                        </h1>
                        <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                            <Image
                                src={localizedArticle.image || '/images/placeholder.jpg'}
                                alt={localizedArticle.title}
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
                                {localizedArticle.date}
                            </div>
                        </div>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up">
                    <div className="article-content" style={{
                        color: "var(--color-text-muted)",
                        lineHeight: "1.8",
                        fontSize: "1.05rem"
                    }}>
                        {/* Manual markdown parser — supports ##/### headers, * list,
                            **bold**, [text](href) links, ![alt](src) images.
                            Linki: internal (zaczynają od /) → next/link Link z manual
                            locale prefix (slug page = server component, next-intl Link
                            z useLocale hook = SSR crash per H3 lesson learned 2026-05-10).
                            External (http) → <a> z target=_blank rel=noopener. */}
                        {(localizedArticle.content || '').split('\n').map((line: string, index: number) => {
                            // Headers (## h2 dla głównych sekcji, ### h3 sub, #### h4 sub-sub)
                            if (line.startsWith('## ') && !line.startsWith('### ')) {
                                return <h2 key={index} style={{ color: "var(--color-text)", fontSize: "1.75rem", marginTop: "2.5rem", marginBottom: "1.25rem", lineHeight: 1.3 }}>{line.replace('## ', '')}</h2>;
                            }
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

                            // Inline parser — splits on **bold** OR [text](href) OR plain text
                            const parseInline = (text: string, keyBase: string): React.ReactNode[] => {
                                const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
                                return text.split(pattern).filter(Boolean).map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={`${keyBase}-${i}`} style={{ color: "var(--color-primary)" }}>{part.slice(2, -2)}</strong>;
                                    }
                                    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                                    if (linkMatch) {
                                        const [, linkText, linkHref] = linkMatch;
                                        const isExternal = linkHref.startsWith('http');
                                        if (isExternal) {
                                            return <a key={`${keyBase}-${i}`} href={linkHref} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>{linkText}</a>;
                                        }
                                        // Internal — manual locale prefix (server component, no next-intl Link)
                                        const prefixedHref = (locale === 'pl' || linkHref.startsWith(`/${locale}/`)) ? linkHref : `/${locale}${linkHref}`;
                                        return <Link key={`${keyBase}-${i}`} href={prefixedHref} style={{ color: "var(--color-primary)", textDecoration: "underline" }}>{linkText}</Link>;
                                    }
                                    return part;
                                });
                            };

                            // List items
                            if (line.startsWith('* ')) {
                                const content = line.replace('* ', '');
                                return (
                                    <li key={index} style={{ marginLeft: "1.5rem", marginBottom: "0.5rem" }}>
                                        {parseInline(content, `li-${index}`)}
                                    </li>
                                );
                            }

                            // Empty lines
                            if (line.trim() === '') return <br key={index} />;

                            // Paragraphs with inline bold + link support
                            return (
                                <p key={index} style={{ marginBottom: "1rem" }}>
                                    {parseInline(line, `p-${index}`)}
                                </p>
                            );
                        })}
                    </div>
                </RevealOnScroll>

            </article>
        </main>
    );
}

