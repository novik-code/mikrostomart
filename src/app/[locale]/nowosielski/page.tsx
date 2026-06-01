import { getTranslations } from 'next-intl/server';
import { supabase } from '@/lib/supabaseClient';
import RevealOnScroll from '@/components/RevealOnScroll';
import NowosielskiCarousel, { BlogPost } from './NowosielskiCarousel';
import { itemListSchema } from '@/lib/seo';
import { brand } from '@/lib/brandConfig';

// Audyt SEO 2026-06 (P1): listing był "use client" + useEffect fetch → Googlebot
// widział pusty stan ładowania, zero linków do /nowosielski/[slug]. Teraz posty są
// fetchowane SERWEROWO i renderowane w initial HTML (linki crawlowalne). Karuzela
// (strzałki) żyje w NowosielskiCarousel.tsx jako client island. Blog mikrostomart.pl/
// nowosielski ZOSTAJE (nowosielski.pl to osobna domena) → artykuły mają być indeksowane.
export const revalidate = 600; // 10 min — blog zmienia się rzadko

const SUPPORTED_LOCALES = ['en', 'de', 'ua'] as const;
function isForeignLocale(locale: string): boolean {
    return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

async function fetchPosts(locale: string): Promise<BlogPost[]> {
    const cols = 'id, slug, title, excerpt, content, image, date';
    let { data } = await supabase
        .from('blog_posts')
        .select(cols)
        .eq('is_published', true)
        .eq('locale', locale)
        .order('date', { ascending: false });

    // Fallback do PL jeśli brak postów w foreign locale (spójne ze starym zachowaniem).
    if ((!data || data.length === 0) && isForeignLocale(locale)) {
        const fallback = await supabase
            .from('blog_posts')
            .select(cols)
            .eq('is_published', true)
            .eq('locale', 'pl')
            .order('date', { ascending: false });
        data = fallback.data;
    }

    return (data || []).filter((p: any) => p.slug) as BlogPost[];
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations('nowosielski');
    const posts = await fetchPosts(locale);

    // ItemList JSON-LD — pomaga Google zrozumieć strukturę listingu bloga (sitelinks).
    const itemList = itemListSchema(
        posts.map((p) => ({
            name: p.title || p.slug,
            url: locale === 'pl'
                ? `${brand.appUrl}/nowosielski/${p.slug}`
                : `${brand.appUrl}/${locale}/nowosielski/${p.slug}`,
        }))
    );

    return (
        <main style={{ background: "var(--color-background)", minHeight: '100vh' }}>
            {posts.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
                />
            )}
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <h1 style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        marginBottom: "3rem",
                        background: "linear-gradient(135deg, var(--color-text), #d4af37)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center"
                    }}>
                        {t('title')}
                    </h1>
                </RevealOnScroll>

                <NowosielskiCarousel posts={posts} locale={locale} />
            </div>
        </main>
    );
}
