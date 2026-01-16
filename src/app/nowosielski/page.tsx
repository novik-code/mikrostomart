import { createClient } from "@supabase/supabase-js";
import Link from 'next/link';
import Image from 'next/image';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600; // Revalidate every hour

async function getPosts() {
    const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('date', { ascending: false });
    return data || [];
}

export default async function BlogIndex() {
    const posts = await getPosts();

    return (
        <div className="min-h-screen bg-black text-white selection:bg-gold selection:text-black">
            <div className="container mx-auto px-4 py-20">
                <header className="mb-16 text-center">
                    <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold to-yellow-200 mb-6 drop-shadow-lg font-serif">
                        Dental MacGyver
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto italic border-l-4 border-gold pl-6 py-2 bg-gray-900/50 rounded-r-lg">
                        "O zębach z przekąsem w Internetach"
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <Link
                            key={post.id}
                            href={`/nowosielski/${post.slug}`}
                            className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gold/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col"
                        >
                            <div className="relative h-64 w-full overflow-hidden">
                                {post.image ? (
                                    <Image
                                        src={post.image}
                                        alt={post.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                                        <span className="text-6xl opacity-20">🦷</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />

                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-gold text-xs font-bold tracking-widest uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                                        {new Date(post.date).toLocaleDateString('pl-PL')}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-gold transition-colors line-clamp-2">
                                    {post.title}
                                </h2>
                                <div
                                    className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1"
                                    dangerouslySetInnerHTML={{ __html: post.excerpt }}
                                />
                                <span className="inline-flex items-center text-gold font-medium text-sm group-hover:translate-x-2 transition-transform">
                                    Czytaj dalej <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
