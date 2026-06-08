import { createClient } from "@supabase/supabase-js";
// H3 BUG FIX (2026-05-10): server components NIE mogą używać Link z
// @/i18n/navigation (wewnętrzne useLocale() rzuca "No intl context found" w SSR).
// Używamy <a href> z manualnym locale prefix.
import Image from 'next/image';
import { notFound } from 'next/navigation';
import RevealOnScroll from '@/components/RevealOnScroll';
import ArticleByline from '@/components/ArticleByline';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { breadcrumbHref, getOgLocale, localizedBreadcrumb } from '@/lib/seo';
import { preferWebp } from '@/lib/imageUrl';
import { routing } from '@/i18n/routing';
import { sanitizeRichHtml } from '@/lib/sanitize';

function schemaImageUrl(image: string | null | undefined): string {
    if (!image) return `${brand.appUrl}/opengraph-image.png`;
    const absolute = image.startsWith('http') ? image : `${brand.appUrl}${image}`;
    return preferWebp(absolute) || absolute;
}

// We import the CSS to handle legacy content inside the clean container
import './../blog.v2.css';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
}

// FORCE DYNAMIC RENDERING — depends on locale URL prefix
export const dynamic = 'force-dynamic';

const LOCALE_DATE_MAP: Record<string, string> = {
    pl: 'pl-PL',
    en: 'en-GB',
    de: 'de-DE',
    ua: 'uk-UA',
};

const HREFLANG_MAP: Record<string, string> = {
    pl: 'pl',
    en: 'en',
    de: 'de',
    ua: 'uk',
};

function postUrl(locale: string, slug: string): string {
    return locale === 'pl'
        ? `${brand.appUrl}/nowosielski/${slug}`
        : `${brand.appUrl}/${locale}/nowosielski/${slug}`;
}

async function getPost(slug: string, locale: string) {
    // Try locale-specific slug first
    const supabase = getSupabase();
    let { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('locale', locale)
        .single();

    // Fallback: try PL locale for this slug
    if (!data) {
        const fallback = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('locale', 'pl')
            .single();
        data = fallback.data;
    }

    return data;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
    const { locale, slug } = await params;
    const post = await getPost(slug, locale);
    if (!post) {
        return { title: `${brand.name}` };
    }

    // Build hreflang from group_id (each translation is a separate row linked by group_id)
    const supabase = getSupabase();
    const { data: groupPosts } = post.group_id
        ? await supabase
            .from('blog_posts')
            .select('locale, slug')
            .eq('group_id', post.group_id)
        : { data: [post] };

    const languages: Record<string, string> = {};
    for (const gp of (groupPosts || []) as Array<{ locale: string; slug: string }>) {
        const hreflang = HREFLANG_MAP[gp.locale] || gp.locale;
        languages[hreflang] = postUrl(gp.locale, gp.slug);
    }
    // x-default → PL row if exists
    const plRow = (groupPosts || []).find((gp: any) => gp.locale === 'pl');
    if (plRow?.slug) {
        languages['x-default'] = postUrl('pl', plRow.slug);
    } else {
        languages['x-default'] = postUrl(locale, slug);
    }

    const canonical = locale === routing.defaultLocale
        ? `/nowosielski/${slug}`
        : `/${locale}/nowosielski/${slug}`;

    const description = post.excerpt || post.title;
    return {
        title: { absolute: `${post.title} | ${brand.name}` },
        description,
        alternates: { canonical, languages },
        openGraph: {
            title: post.title,
            description,
            type: 'article',
            url: postUrl(locale, slug),
            locale: getOgLocale(locale),
            images: post.image
                ? [{ url: schemaImageUrl(post.image) }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description,
        },
    };
}

export default async function BlogPost({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>;
}) {
    const { locale, slug } = await params;
    const t = await getTranslations('nowosielski');
    const post = await getPost(slug, locale);

    if (!post) {
        notFound();
    }

    const dateLocale = LOCALE_DATE_MAP[locale] || 'pl-PL';

    // Sanitize with sanitize-html (defense layer 2), then decode legacy WP entities
    // (style/class stripping is no longer needed — sanitize-html drops both).
    const decodeWpEntities = (html: string) => {
        const entities: { [key: string]: string } = {
            '&#8211;': '–', '&amp;#8211;': '–',
            '&#8212;': '—', '&amp;#8212;': '—',
            '&#8216;': '‘', '&amp;#8216;': '‘',
            '&#8217;': '’', '&amp;#8217;': '’',
            '&#8220;': '“', '&amp;#8220;': '“',
            '&#8221;': '”', '&amp;#8221;': '”',
            '&nbsp;': ' ', '&amp;nbsp;': ' ',
            '&#038;': '&', '&amp;#038;': '&',
            '&#38;': '&', '&amp;#38;': '&'
        };
        let out = html;
        for (const [entity, replacement] of Object.entries(entities)) {
            out = out.split(entity).join(replacement);
        }
        return out;
    };

    const sanitizedContent = decodeWpEntities(sanitizeRichHtml(post.content));

    // BlogPosting JSON-LD schema for rich snippets in Google search.
    // dateModified prefers updated_at if available — otherwise falls back to published date,
    // because dateModified === datePublished gives Google no freshness signal.
    //
    // J-1 (2026-05-12): added articleSection + wordCount (+ keywords if tags present).
    // BlogPosting content is HTML (legacy import), so word count strips tags first.
    const SECTION_LABELS: Record<string, string> = {
        pl: 'Blog Dr Nowosielski',
        en: "Dr Nowosielski's Blog",
        de: 'Dr Nowosielski Blog',
        ua: 'Блог д-ра Новосельського',
    };
    const wordCount = (post.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
    const tagsCsv = Array.isArray(post.tags) && post.tags.length > 0
        ? (post.tags as string[]).join(', ')
        : null;

    // Audyt SEO 2026-06: physicianRef reuse dla author + reviewedBy (E-E-A-T medical).
    const physicianRef = {
        "@type": "Physician",
        "@id": `${brand.appUrl}/#marcin-nowosielski`,
        "name": "Marcin Nowosielski",
        "url": `${brand.appUrl}/zespol/marcin-nowosielski`,
    };
    const datePublished = post.created_at || post.published_at || post.date;
    const dateModified = post.updated_at || post.created_at || post.published_at || post.date;

    const articleSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt || post.title,
        "image": schemaImageUrl(post.image),
        "datePublished": datePublished,
        "dateModified": dateModified,
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
            "@id": postUrl(locale, slug),
        },
        "inLanguage": locale === 'ua' ? 'uk' : locale,
        "articleSection": SECTION_LABELS[locale] || SECTION_LABELS.pl,
        ...(wordCount > 0 ? { wordCount } : {}),
        ...(tagsCsv ? { keywords: tagsCsv } : {}),
    };

    // Breadcrumb gives slug pages a SERP breadcrumb trail (Home > Blog > [post]).
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'nowosielski', url: breadcrumbHref(locale, '/nowosielski') },
        { name: post.title }, // current page — explicit name, no URL
    ]);

    // Standard "News" Layout Structure
    return (
        <main style={{ background: "var(--color-background)", minHeight: '100vh', color: "var(--color-text)" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
            />

            <article className="container" style={{ padding: "8rem 2rem 4rem", maxWidth: "800px", margin: "0 auto" }}>

                {/* Back Link — locale-aware via manual prefix (server component, no client Link) */}
                <div style={{ marginBottom: "2rem" }}>
                    <a href={locale === 'pl' ? '/nowosielski' : `/${locale}/nowosielski`} style={{
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
                        &larr; {t('backToBlog')}
                    </a>
                </div>

                <RevealOnScroll>
                    <header style={{ marginBottom: "3rem", textAlign: "center" }}>
                        <h1 style={{
                            fontSize: "clamp(2rem, 4vw, 3rem)",
                            lineHeight: "1.2",
                            marginBottom: "2rem",
                            color: "var(--color-text)"
                        }}>
                            {post.title}
                        </h1>

                        <ArticleByline
                            locale={locale}
                            datePublished={datePublished}
                            dateModified={dateModified}
                        />

                        <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: '2rem' }}>
                            {post.image && (
                                <Image
                                    src={post.image.startsWith('http') ? post.image : `${post.image}`}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 800px) 100vw, 800px"
                                    style={{ objectFit: "cover" }}
                                    priority
                                />
                            )}
                            <div style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                background: "rgba(0,0,0,0.6)",
                                padding: "0.5rem 1rem",
                                borderTopRightRadius: "var(--radius-md)",
                                color: "#d4af37",
                                fontWeight: 600,
                                backdropFilter: "blur(4px)"
                            }}>
                                {new Date(post.date).toLocaleDateString(dateLocale)}
                            </div>
                        </div>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up">
                    <div id="legacy-blog-content" className="article-content" style={{
                        color: "var(--color-text-muted)",
                        lineHeight: "1.8",
                        fontSize: "1.05rem"
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                    </div>
                </RevealOnScroll>

            </article>
        </main>
    );
}
