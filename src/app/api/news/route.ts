import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = 'nodejs';

// Supported locale suffixes for news content
const SUPPORTED_LOCALES = ['en', 'de', 'ua'] as const;
type LocaleSuffix = typeof SUPPORTED_LOCALES[number];

function isLocale(s: string): s is LocaleSuffix {
    return (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

// GET: Public list of news (with optional locale param for translated content)
export async function GET(req: NextRequest) {
    try {
        const locale = req.nextUrl.searchParams.get('locale') || 'pl';

        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        // Map locale-specific fields, falling back to Polish
        const articles = (data || []).map((article: any) => {
            if (locale !== 'pl' && isLocale(locale)) {
                return {
                    ...article,
                    title: article[`title_${locale}`] || article.title,
                    excerpt: article[`excerpt_${locale}`] || article.excerpt,
                    content: article[`content_${locale}`] || article.content,
                };
            }
            return article;
        });

        return NextResponse.json(articles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
