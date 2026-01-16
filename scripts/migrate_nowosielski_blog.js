const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const RSS_URL = 'https://nowosielski.pl/feed/';

async function fetchRSS() {
    return new Promise((resolve, reject) => {
        const options = {
            rejectUnauthorized: false, // Bypass SSL error
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
        };

        https.get(RSS_URL, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', (err) => reject(err));
        }).on('error', (err) => reject(err));
    });
}

function parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];

        const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/s.exec(itemContent) || /<title>(.*?)<\/title>/s.exec(itemContent);
        const linkMatch = /<link>(.*?)<\/link>/s.exec(itemContent);
        const dateMatch = /<pubDate>(.*?)<\/pubDate>/s.exec(itemContent);
        const contentMatch = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/s.exec(itemContent);
        const descriptionMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/s.exec(itemContent);

        if (titleMatch && linkMatch) {
            const title = titleMatch[1];
            const link = linkMatch[1];
            const date = dateMatch ? new Date(dateMatch[1]) : new Date();
            // Prefer full content, fallback to description
            let content = contentMatch ? contentMatch[1] : (descriptionMatch ? descriptionMatch[1] : '');

            // Extract first image from content as featured image if possible
            const imgMatch = /<img[^>]+src="([^">]+)"/.exec(content);
            const image = imgMatch ? imgMatch[1] : null;

            // Generate slug from link (last part of url)
            // e.g., https://nowosielski.pl/tytul-artykulu/ -> tytul-artykulu
            let slug = link.replace(/\/$/, '').split('/').pop();
            if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            items.push({
                title,
                slug,
                date,
                content,
                image, // Can be null
                excerpt: descriptionMatch ? descriptionMatch[1].replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '',
                created_at: date.toISOString(),
                is_published: true
            });
        }
    }
    return items;
}

async function migrate() {
    console.log('Fetching RSS feed...');
    try {
        const xml = await fetchRSS();
        console.log(`Fetched ${xml.length} bytes of data.`);

        const posts = parseRSS(xml);
        console.log(`Found ${posts.length} posts to migrate.`);

        for (const post of posts) {
            console.log(`Processing: ${post.title}`);

            // Check if exists
            const { data: existing } = await supabase
                .from('blog_posts')
                .select('id')
                .eq('slug', post.slug)
                .single();

            if (existing) {
                console.log(`  - Already exists, skipping.`);
            } else {
                const { error } = await supabase.from('blog_posts').insert(post);
                if (error) {
                    console.error(`  - Error inserting: ${error.message}`);
                } else {
                    console.log(`  - Inserted successfully.`);
                }
            }
        }
        console.log('Migration completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
