import { createClient } from '@supabase/supabase-js';
import { articles } from '../src/data/articles';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value.trim().replace(/"/g, '');
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value.trim().replace(/"/g, '');
        }
    });
}

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log(`Found ${articles.length} articles to migrate...`);

    for (const article of articles) {
        const { data, error } = await supabase
            .from('news')
            .upsert({
                id: article.id,
                title: article.title,
                slug: article.slug,
                excerpt: article.excerpt,
                content: article.content,
                date: article.date,
                image: article.image
            })
            .select();

        if (error) {
            console.error(`Error migrating ${article.title}:`, error.message);
        } else {
            console.log(`Migrated: ${article.title}`);
        }
    }

    console.log('Migration complete!');
}

migrate();
