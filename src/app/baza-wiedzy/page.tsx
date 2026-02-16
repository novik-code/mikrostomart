
import { supabase } from '@/lib/supabaseClient';
import RevealOnScroll from '@/components/RevealOnScroll';
import ArticleCarousel from '@/components/ArticleCarousel';
import KnowledgeBaseHeader from './KnowledgeBaseHeader';

export const revalidate = 60; // Refresh data every minute

export default async function KnowledgeBasePage() {
    const { data: articles } = await supabase
        .from('articles')
        .select('id, slug, title, excerpt, date:published_date, image:image_url')
        .order('published_date', { ascending: false });

    return (
        <main style={{ background: "var(--color-background)" }}>
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <KnowledgeBaseHeader />
                </RevealOnScroll>

                <ArticleCarousel articles={articles || []} />
            </div>
        </main>
    );
}
