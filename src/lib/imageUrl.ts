/**
 * Image URL helpers — surface optimized formats to schema.org/OpenGraph
 * consumers (Googlebot, social scrapers) without touching the DB.
 *
 * Why: `articles.image_url` / `news.image` / `blog_posts.image` store .png
 * paths. next/image transparently serves WebP to browsers in <Image>, but
 * raw URLs embedded in JSON-LD `image` fields and `<meta property="og:image">`
 * bypass that pipeline — crawlers fetch the literal path and pay full PNG
 * weight (~900 KB for KB images).
 *
 * `optimize-kb-images.mjs` writes .webp / .avif siblings beside every
 * /public/kb-*.png. This helper rewrites `.png → .webp` for those known KB
 * paths. .png stays in DB so external links / non-WebP scrapers keep working.
 *
 * Conservative: only rewrites paths that match the known `/kb-…` prefix
 * (where we control both source and converted output). Unknown paths pass
 * through untouched — safer than blanket `.png → .webp` rewrite which would
 * 404 for any PNG without a generated sibling.
 */

const WEBP_AVAILABLE_PREFIXES = ['/kb-'];

/**
 * Returns `url` with `.png` swapped for `.webp` if the path matches a prefix
 * for which we know the optimizer has emitted a WebP sibling.
 *
 * Handles absolute URLs (`https://www.mikrostomart.pl/kb-foo.png`),
 * absolute paths (`/kb-foo.png`), and uppercase extensions (`.PNG`).
 *
 * Returns input unchanged for unknown prefixes, non-PNG inputs, or empty
 * values.
 */
export function preferWebp(url: string | null | undefined): string | undefined {
    if (!url) return url ?? undefined;
    if (!/\.png$/i.test(url)) return url;

    // Pull out path portion (works for both absolute URLs and bare paths).
    let pathname = url;
    try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            pathname = new URL(url).pathname;
        }
    } catch {
        // Malformed URL — leave as-is.
        return url;
    }

    const eligible = WEBP_AVAILABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (!eligible) return url;

    return url.replace(/\.png$/i, '.webp');
}
