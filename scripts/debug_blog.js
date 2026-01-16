const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpPost() {
    console.log("Fetching post...");
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No posts found.");
        return;
    }

    const post = data[0];
    console.log(`Dumping content for: ${post.slug}`);
    fs.writeFileSync('debug_post_content.html', post.content);
    console.log('Saved to debug_post_content.html');
}

dumpPost();
