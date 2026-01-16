import { createClient } from "@supabase/supabase-js";
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import './../blog.v2.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600;

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

    // Function to strip legacy inline styles and classes to allow our CSS to take over
    const cleanHtml = (html: string) => {
        return html
            // Remove all style attributes (double and single quotes)
            .replace(/style="[^"]*"/gi, '')
            .replace(/style='[^']*'/gi, '')
            // Remove all class attributes (double and single quotes)
            .replace(/class="[^"]*"/gi, '')
            .replace(/class='[^']*'/gi, '')
            // Remove script tags
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            // Normalize headlines for our CSS
            .replace(/<h2/g, '<h2>')
            .replace(/<h3/g, '<h3>')
            // Remove empty divs
            .replace(/<div>\s*<\/div>/g, '');
    };

    const sanitizedContent = cleanHtml(post.content);

    return (
        <article className="min-h-screen bg-black text-white selection:bg-gold selection:text-black relative">
            {/* Version Marker v2 */}
            <div className="fixed top-0 left-0 w-4 h-4 bg-blue-600 z-[9999] border border-white" title="DEPLOYMENT V2 CHECK" />

            {/* Hero Section */}
            <div className="relative w-full h-[60vh] flex items-end">
                {post.image && (
                    <Image
                        src={post.image.startsWith('http') ? post.image : `${post.image}`}
                        alt={post.title}
                        fill
                        className="object-cover opacity-40 fixed inset-0 h-[60vh] z-0"
                        priority
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

                <div className="container mx-auto px-4 pb-20 relative z-20">
                    <Link href="/nowosielski" className="inline-flex items-center text-gold mb-8 hover:text-white transition-colors">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Powrót do bloga
                    </Link>
                    <div className="max-w-4xl">
                        <span className="text-gold font-bold tracking-widest uppercase text-sm mb-4 block">
                            {new Date(post.date).toLocaleDateString('pl-PL', { dateStyle: 'long' })}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            {post.title}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-12 relative z-20 bg-black">
                <div className="max-w-3xl mx-auto">
                    {/* ID used for high-specificity CSS targeting in blog.css */}
                    <div id="legacy-blog-content" className="prose prose-invert prose-lg md:prose-xl max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                    </div>

                    {/* Author Bio */}
                    <div className="mt-20 border-t border-gray-800 pt-12 flex items-start gap-6">
                        <div className="bg-gold rounded-full w-20 h-20 flex-shrink-0 flex items-center justify-center text-3xl font-bold text-black border-4 border-black shadow-[0_0_0_2px_rgba(212,175,55,1)]">
                            MN
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Dr Marcin Nowosielski</h3>
                            <p className="text-gray-400">
                                Lekarz dentysta, pasjonat stomatologii cyfrowej i endodoncji mikroskopowej.
                                Prywatnie "Dental MacGyver", fan ostrego brzmienia i jazdy off-road na desce.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
