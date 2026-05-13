/**
 * HTML sanitization helpers (DOMPurify-backed).
 *
 * Used as defense-in-depth around any user-generated HTML that ends up in
 * `dangerouslySetInnerHTML`. Sanitize ON SAVE (admin endpoints) and again
 * ON RENDER (server components rendering DB content). Two layers — if one
 * misses or is bypassed, the other catches it.
 *
 * Two profiles:
 *   - sanitizeRichHtml(): blog posts, appointment instructions, news, page
 *     sections. Allows formatting, lists, headings, links, blockquotes.
 *   - sanitizeStrictHtml(): AI email drafts, short snippets. Inline-only.
 *
 * For JSON shapes (sections, page-overrides), walk the tree and sanitize
 * only the known HTML field names — leaves URLs, titles, identifiers alone.
 */

import DOMPurify from 'isomorphic-dompurify';

// When admin links to external sites with target="_blank", force rel="noopener noreferrer"
// to prevent reverse tab-nabbing. DOMPurify strips target by default; ADD_ATTR opts in.
DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

const RICH_CONFIG = {
    ALLOWED_TAGS: [
        'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'blockquote', 'code', 'pre',
        'span', 'div', 'hr', 'sub', 'sup',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'lang', 'dir'],
    // DOMPurify defaults already block javascript:/data:/vbscript: URI schemes.
    // Avoid ALLOWED_URI_REGEXP here — it also validates non-URI attribute values
    // like target="_blank", causing them to be stripped.
    FORBID_TAGS: [
        'script', 'iframe', 'style', 'link', 'meta', 'object', 'embed',
        'form', 'input', 'button', 'svg', 'math', 'base', 'applet',
        'frame', 'frameset',
    ],
    FORBID_ATTR: [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onmouseout', 'onkeydown', 'onkeyup',
        'onkeypress', 'onmousedown', 'onmouseup', 'onmousemove', 'oninput',
        'onpaste', 'oncopy', 'oncut', 'onreset', 'onselect', 'onabort',
        'onbeforeunload', 'onunload', 'onresize', 'onscroll',
        'style', 'srcdoc', 'formaction', 'xlink:href',
    ],
    ALLOW_DATA_ATTR: false,
};

const STRICT_CONFIG = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    FORBID_TAGS: ['script', 'iframe', 'style', 'p', 'div', 'span', 'svg', 'img'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'style', 'srcdoc'],
    ALLOW_DATA_ATTR: false,
};

export function sanitizeRichHtml(input: unknown): string {
    if (typeof input !== 'string' || !input) return '';
    return DOMPurify.sanitize(input, RICH_CONFIG) as unknown as string;
}

export function sanitizeStrictHtml(input: unknown): string {
    if (typeof input !== 'string' || !input) return '';
    return DOMPurify.sanitize(input, STRICT_CONFIG) as unknown as string;
}

const HTML_FIELD_NAMES = new Set([
    'content', 'html', 'body', 'description', 'text',
    'content_en', 'content_de', 'content_ua',
    'description_en', 'description_de', 'description_ua',
]);

/**
 * Walk a JSON-like value and sanitize string values whose KEY indicates HTML
 * content (see HTML_FIELD_NAMES). Other strings (URLs, titles, plain text)
 * are returned untouched so we don't HTML-entity-encode legitimate data.
 */
export function sanitizeJsonHtmlFields(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(sanitizeJsonHtmlFields);
    if (typeof value !== 'object') return value;

    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'string' && HTML_FIELD_NAMES.has(key.toLowerCase())) {
            result[key] = sanitizeRichHtml(v);
        } else if (v !== null && typeof v === 'object') {
            result[key] = sanitizeJsonHtmlFields(v);
        } else {
            result[key] = v;
        }
    }
    return result;
}
