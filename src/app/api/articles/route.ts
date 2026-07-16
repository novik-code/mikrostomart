import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPPORTED = new Set(['pl', 'en', 'de', 'ua']);
const LIST_COLS = 'slug, title, excerpt, image_url, published_date';
const DETAIL_COLS = 'slug, title, excerpt, content, image_url, published_date, locale';

/**
 * GET /api/articles — publiczne, read-only API bazy wiedzy dla aplikacji mobilnej.
 * (Web renderuje /baza-wiedzy SSR-em przez supabaseClient; apka nie ma anon key,
 * więc dostaje ten sam publikowany content przez API. Additive — web nietknięty.)
 *
 *   ?locale=pl            → lista opublikowanych artykułów (fallback PL, jak strona)
 *   ?slug=x&locale=pl     → detal z treścią (markdown); fallback: slug w innym locale
 *
 * Zwraca wyłącznie status=published — te same dane, które są publicznie na stronie.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const localeParam = (searchParams.get('locale') || 'pl').toLowerCase();
    const locale = SUPPORTED.has(localeParam) ? localeParam : 'pl';
    const slug = searchParams.get('slug');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
        if (slug) {
            // Detal: preferuj żądany locale, fallback na jakikolwiek published z tym slugiem
            let { data: article } = await supabase
                .from('articles')
                .select(DETAIL_COLS)
                .eq('slug', slug)
                .eq('locale', locale)
                .eq('status', 'published')
                .limit(1)
                .maybeSingle();

            if (!article) {
                const { data: fallback } = await supabase
                    .from('articles')
                    .select(DETAIL_COLS)
                    .eq('slug', slug)
                    .eq('status', 'published')
                    .limit(1)
                    .maybeSingle();
                article = fallback;
            }

            if (!article) {
                return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
            }
            return NextResponse.json(
                { success: true, article },
                { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
            );
        }

        // Lista: locale → fallback PL (identycznie jak /baza-wiedzy)
        let { data: articles } = await supabase
            .from('articles')
            .select(LIST_COLS)
            .eq('locale', locale)
            .eq('status', 'published')
            .order('published_date', { ascending: false });

        if (!articles || articles.length === 0) {
            const { data: fallback } = await supabase
                .from('articles')
                .select(LIST_COLS)
                .eq('locale', 'pl')
                .eq('status', 'published')
                .order('published_date', { ascending: false });
            articles = fallback;
        }

        return NextResponse.json(
            { success: true, articles: articles ?? [] },
            { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' } },
        );
    } catch (error) {
        console.error('[Articles API] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
