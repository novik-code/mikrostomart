
import { supabase } from '@/lib/supabaseClient';
import RevealOnScroll from '@/components/RevealOnScroll';
import ArticleCarousel from '@/components/ArticleCarousel';
import AskExpertButton from '@/components/AskExpertButton';

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
                    <h1 style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        marginBottom: "1rem",
                        background: "linear-gradient(135deg, var(--color-text), var(--color-primary))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center"
                    }}>
                        Baza Wiedzy
                    </h1>
                    <p style={{
                        textAlign: "center",
                        color: "var(--color-text-muted)",
                        maxWidth: "600px",
                        margin: "0 auto 2rem",
                        fontSize: "1.1rem"
                    }}>
                        Rzetelna wiedza stomatologiczna w pigułce. Przygotowana przez naszych ekspertów.
                        <br />
                        <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                            Nie znalazłeś odpowiedzi? Zadaj nam pytanie, a my napiszemy o tym artykuł!
                        </span>
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
                        <AskExpertButton />
                    </div>
                </RevealOnScroll>

                <ArticleCarousel articles={articles || []} />
            </div>
        </main>
    );
}
