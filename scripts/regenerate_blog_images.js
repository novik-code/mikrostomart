const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// Setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error("Missing credentials (SUPABASE_URL, SUPABASE_KEY, or OPENAI_API_KEY).");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// Ensure directory exists
const targetDir = path.join(process.cwd(), 'public/images/blog');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

async function generateImageForPost(post) {
    console.log(`Generating image for: "${post.title}" (${post.slug})`);

    try {
        const prompt = `A professional, photorealistic, luxury dental clinic header image representing the topic: "${post.title}". The style should be modern, elegant, with gold and black accents if possible, cinematic lighting, 8k resolution. No text on image.`;

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        });

        const b64 = response.data[0].b64_json;
        if (!b64) throw new Error("No b64_json received");

        // Save to file
        const filename = `${post.slug}.png`;
        const filepath = path.join(targetDir, filename);
        const buffer = Buffer.from(b64, 'base64');
        fs.writeFileSync(filepath, buffer);
        console.log(`Saved to ${filepath}`);

        // Update Supabase
        const publicUrl = `/images/blog/${filename}`;
        const { error } = await supabase
            .from('blog_posts')
            .update({ image: publicUrl })
            .eq('id', post.id);

        if (error) {
            console.error(`Error updating Supabase for ${post.id}:`, error.message);
        } else {
            console.log(`Updated database record for ${post.slug}`);
        }

    } catch (error) {
        console.error(`Failed to generate image for ${post.slug}:`, error.message);
    }
}

async function run() {
    console.log("Fetching blog posts...");
    const { data: posts, error } = await supabase.from('blog_posts').select('*');

    if (error) {
        console.error("Error fetching posts:", error);
        return;
    }

    console.log(`Found ${posts.length} posts.`);

    for (const post of posts) {
        // Option: Check if image exists or looks broken (e.g. legacy http link)
        // For now, we regenerate ALL as requested by user ("moze wygerneruj nowe")
        await generateImageForPost(post);
    }
    console.log("Done!");
}

run();
