import { createClient } from "@supabase/supabase-js";
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import RevealOnScroll from '@/components/RevealOnScroll';

// We import the CSS to handle legacy content inside the clean container
import './../blog.v2.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// FORCE DYNAMIC RENDERING - DISABLE CACHE
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getPost(slug: string) {
    const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
    return data;
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        notFound();
    }

    // Reuse the cleaning logic, but now it sits inside a constrained layout
    const cleanHtml = (html: string) => {
        let cleaned = html
            .replace(/style="[^"]*"/gi, '')
            .replace(/style='[^']*'/gi, '')
            .replace(/class="[^"]*"/gi, '')
            .replace(/class='[^']*'/gi, '')
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<h2/g, '<h2>')
            .replace(/<h3/g, '<h3>')
            .replace(/<div>\s*<\/div>/g, '');

        // Aggressive Entity Decoding (Including potential double encoding)
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

        for (const [entity, replacement] of Object.entries(entities)) {
            // Replace all occurrences
            cleaned = cleaned.split(entity).join(replacement);
        }

        return cleaned;
    };

    const sanitizedContent = cleanHtml(post.content);

    // Standard "News" Layout Structure
    return (
        <main style={{ background: "var(--color-background)", minHeight: '100vh', color: "var(--color-text)" }}>

            <article className="container" style={{ padding: "8rem 2rem 4rem", maxWidth: "800px", margin: "0 auto" }}>

                {/* Back Link */}
                <div style={{ marginBottom: "2rem" }}>
                    <Link href="/nowosielski" style={{
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
                        &larr; Powrót do bloga
                    </Link>
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

                        <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: '2rem' }}>
                            {post.image && (
                                <Image
                                    src={post.image.startsWith('http') ? post.image : `${post.image}`}
                                    alt={post.title}
                                    fill
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
                                {new Date(post.date).toLocaleDateString('pl-PL')}
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
