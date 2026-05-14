import { getTranslations } from 'next-intl/server';
import { supabase } from '@/lib/supabaseClient';
import RevealOnScroll from '@/components/RevealOnScroll';
import NewsCarousel, { NewsArticle } from './NewsCarousel';

// S5-2 (2026-05-15): server component listing.
// Previously this was "use client" + useEffect fetch → curl /aktualnosci returned
// no <article> markup, Googlebot saw a blank page. Now news rows are fetched on
// the server and rendered in initial HTML. The carousel UI (scroll arrows) lives
// in NewsCarousel.tsx as a client island. Foreign locales only show articles with
// a translation (consistent with [slug] page returning 404 for missing translations).

export const revalidate = 600; // 10 min — news listing changes a few times a day at most

const SUPPORTED_LOCALES = ['en', 'de', 'ua'] as const;
type LocaleSuffix = typeof SUPPORTED_LOCALES[number];
function isLocaleSuffix(s: string): s is LocaleSuffix {
    return (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

async function fetchArticles(locale: string): Promise<NewsArticle[]> {
    const { data } = await supabase
        .from('news')
        .select('id, slug, date, title, excerpt, image, title_en, title_de, title_ua, excerpt_en, excerpt_de, excerpt_ua')
        .order('date', { ascending: false });

    if (!data) return [];

    const isForeign = locale !== 'pl' && isLocaleSuffix(locale);
    return data
        .filter((row: any) => {
            if (!row.slug) return false;
            // Skip articles without a translation in the requested foreign locale.
            if (isForeign && !row[`title_${locale}`]) return false;
            return true;
        })
        .map((row: any) => ({
            id: row.id ?? row.slug,
            slug: row.slug,
            title: isForeign ? row[`title_${locale}`] : row.title,
            excerpt: isForeign ? (row[`excerpt_${locale}`] || row.excerpt) : row.excerpt,
            image: row.image,
            date: row.date,
        }));
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations('aktualnosci');
    const articles = await fetchArticles(locale);

    return (
        <main style={{ background: "var(--color-background)" }}>
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <h1 style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        marginBottom: "3rem",
                        background: "linear-gradient(135deg, var(--color-text), var(--color-primary))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center",
                    }}>
                        {t('title')}
                    </h1>
                </RevealOnScroll>

                <NewsCarousel locale={locale} articles={articles} />
            </div>
        </main>
    );
}
