
import { supabase } from '@/lib/supabaseClient';
import RevealOnScroll from '@/components/RevealOnScroll';
import ArticleCarousel from '@/components/ArticleCarousel';
import KnowledgeBaseHeader from './KnowledgeBaseHeader';
import { getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic'; // Must be dynamic — depends on locale cookie

export default async function KnowledgeBasePage() {
    const locale = await getLocale();

    const { data: articles } = await supabase
        .from('articles')
        .select('id, slug, title, excerpt, date:published_date, image:image_url')
        .eq('locale', locale)
        .order('published_date', { ascending: false });

    // Fallback: if no articles for this locale, show Polish
    let displayArticles = articles;
    if (!displayArticles || displayArticles.length === 0) {
        const { data: fallback } = await supabase
            .from('articles')
            .select('id, slug, title, excerpt, date:published_date, image:image_url')
            .eq('locale', 'pl')
            .order('published_date', { ascending: false });
        displayArticles = fallback;
    }

    return (
        <main style={{ background: "var(--color-background)" }}>
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <KnowledgeBaseHeader />
                </RevealOnScroll>

                <ArticleCarousel articles={displayArticles || []} />
            </div>
        </main>
    );
}
