
import { supabase } from '@/lib/supabaseClient';
import RevealOnScroll from '@/components/RevealOnScroll';
import ArticleCarousel from '@/components/ArticleCarousel';
import KnowledgeBaseHeader from './KnowledgeBaseHeader';
import { getLocale } from 'next-intl/server';
import { itemListSchema } from '@/lib/seo';
import { brand } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic'; // Must be dynamic — depends on locale cookie

export default async function KnowledgeBasePage() {
    const locale = await getLocale();

    const { data: articles } = await supabase
        .from('articles')
        .select('id, slug, title, excerpt, date:published_date, image:image_url')
        .eq('locale', locale)
        .eq('status', 'published')
        .order('published_date', { ascending: false });

    // Fallback: if no articles for this locale, show Polish
    let displayArticles = articles;
    if (!displayArticles || displayArticles.length === 0) {
        const { data: fallback } = await supabase
            .from('articles')
            .select('id, slug, title, excerpt, date:published_date, image:image_url')
            .eq('locale', 'pl')
            .eq('status', 'published')
            .order('published_date', { ascending: false });
        displayArticles = fallback;
    }

    // ItemList JSON-LD dla collection page — pomaga Google zrozumieć strukturę
    // listingu bazy wiedzy (sitelinks w SERP). Locale-aware URL (PL bez prefiksu).
    const itemList = itemListSchema(
        (displayArticles || [])
            .filter((a) => a.slug)
            .map((a) => ({
                name: a.title || a.slug,
                url: locale === 'pl'
                    ? `${brand.appUrl}/baza-wiedzy/${a.slug}`
                    : `${brand.appUrl}/${locale}/baza-wiedzy/${a.slug}`,
            }))
    );

    return (
        <main style={{ background: "var(--color-background)" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
            />
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <KnowledgeBaseHeader />
                </RevealOnScroll>

                <ArticleCarousel articles={displayArticles || []} />
            </div>
        </main>
    );
}
