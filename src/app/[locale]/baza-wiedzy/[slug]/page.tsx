import { supabase } from '@/lib/supabaseClient';
import { brand, brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from '@/components/RevealOnScroll';
// H3 BUG FIX (2026-05-10): server components NIE mogą używać Link z
// @/i18n/navigation. Manualny <a> z locale prefix.
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { breadcrumbHref, localizedBreadcrumb } from '@/lib/seo';
import { routing } from '@/i18n/routing';

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
    const { data: articles } = await supabase.from('articles').select('slug');
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
        .select('title, excerpt, locale, group_id')
        .eq('slug', slug)
        .eq('locale', locale)
        .single();

    // Fallback: PL version with the same slug
    if (!article) {
        const fallback = await supabase
            .from('articles')
            .select('title, excerpt, locale, group_id')
            .eq('slug', slug)
            .eq('locale', 'pl')
            .single();
        article = fallback.data;
    }

    if (!article) return { title: t('notFound') };

    // Build hreflang from group_id — each translation lives as a separate row.
    const languages: Record<string, string> = {};
    if (article.group_id) {
        const { data: groupRows } = await supabase
            .from('articles')
            .select('locale, slug')
            .eq('group_id', article.group_id);
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

    const canonical = locale === routing.defaultLocale
        ? `/baza-wiedzy/${slug}`
        : `/${locale}/baza-wiedzy/${slug}`;

    return {
        title: { absolute: `${article.title} | ${t('metaSuffix', brandI18nParams())}` },
        description: article.excerpt,
        alternates: { canonical, languages },
        openGraph: {
            title: article.title,
            description: article.excerpt,
            type: 'article',
            url: articleUrl(locale, slug),
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
        .single();

    // Fallback: try Polish version if not found in current locale
    if (!article) {
        const { data: fallback } = await supabase
            .from('articles')
            .select('*, image:image_url, date:published_date')
            .eq('slug', slug)
            .eq('locale', 'pl')
            .single();
        article = fallback;
    }

    if (!article) {
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

    const articleSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.excerpt,
        "image": article.image
            ? (article.image.startsWith('http') ? article.image : `${brand.appUrl}${article.image}`)
            : `${brand.appUrl}/opengraph-image.png`,
        "datePublished": article.date,
        "dateModified": article.updated_at || article.date,
        "author": {
            "@type": "Person",
            "name": "Marcin Nowosielski",
            "url": `${brand.appUrl}/o-nas`,
        },
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

                <RevealOnScroll animation="fade-up">
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

                            // List items
                            if (line.startsWith('* ')) {
                                const content = line.replace('* ', '');
                                const parts = content.split(/(\*\*.*?\*\*)/g);
                                return (
                                    <li key={index} style={{ marginLeft: "1.5rem", marginBottom: "0.5rem" }}>
                                        {parts.map((part: string, i: number) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return <strong key={i} style={{ color: "var(--color-primary)" }}>{part.slice(2, -2)}</strong>;
                                            }
                                            return part;
                                        })}
                                    </li>
                                );
                            }

                            // Empty lines
                            if (line.trim() === '') return <br key={index} />;

                            // Paragraphs with inline bold support
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                                <p key={index} style={{ marginBottom: "1rem" }}>
                                    {parts.map((part: string, i: number) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                            return <strong key={i} style={{ color: "var(--color-primary)" }}>{part.slice(2, -2)}</strong>;
                                        }
                                        return part;
                                    })}
                                </p>
                            );
                        })}
                    </div>
                </RevealOnScroll>

            </article>
        </main>
    );
}
