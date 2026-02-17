
import RevealOnScroll from '@/components/RevealOnScroll';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { getTranslations } from 'next-intl/server';

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

// Optional: if you want to generate some static paths at build time
export async function generateStaticParams() {
    const { data: articles } = await supabase.from('news').select('slug');
    return articles?.map(({ slug }) => ({ slug })) || [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticle(slug);
    const t = await getTranslations('aktualnosci');
    if (!article) return { title: t('articleNotFound') };
    return {
        title: `${article.title} | Mikrostomart`,
        description: article.excerpt,
    };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticle(slug);
    const t = await getTranslations('aktualnosci');

    if (!article) {
        notFound();
    }

    // Get locale from the translations context — we read it indirectly
    // Since this is a server component, we get locale from next-intl
    const { locale } = await import('next-intl/server').then(m => m.getLocale()).then(locale => ({ locale }));
    const localizedArticle = localizeArticle(article, locale);

    return (
        <main style={{ background: "var(--color-background)" }}>
            <article className="container" style={{ padding: "8rem 2rem 4rem", maxWidth: "800px" }}>

                {/* Back Link */}
                <div style={{ marginBottom: "2rem" }}>
                    <Link href="/aktualnosci" style={{
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
                        {t('backToNews')}
                    </Link>
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
                        {/* Improved manual markdown parser */}
                        {(localizedArticle.content || '').split('\n').map((line: string, index: number) => {
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
                                        {parts.map((part, i) => {
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
                                    {parts.map((part, i) => {
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

