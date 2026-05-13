import { describe, it, expect } from 'vitest';
import { sanitizeRichHtml, sanitizeStrictHtml, sanitizeJsonHtmlFields } from '../sanitize';

describe('sanitizeRichHtml — strips XSS payloads', () => {
    it('strips <script> tags entirely', () => {
        const out = sanitizeRichHtml('<p>hello</p><script>alert(1)</script>');
        expect(out).not.toContain('<script');
        expect(out).not.toContain('alert');
        expect(out).toContain('<p>hello</p>');
    });

    it('strips inline event handlers (onerror)', () => {
        const out = sanitizeRichHtml('<img src=x onerror="alert(1)">');
        expect(out.toLowerCase()).not.toContain('onerror');
        expect(out).not.toContain('alert');
    });

    it('strips onload on SVG (SVG itself forbidden)', () => {
        const out = sanitizeRichHtml('<svg onload="alert(1)"></svg>');
        expect(out.toLowerCase()).not.toContain('<svg');
        expect(out.toLowerCase()).not.toContain('onload');
    });

    it('strips javascript: URL on links', () => {
        const out = sanitizeRichHtml('<a href="javascript:alert(1)">click</a>');
        expect(out.toLowerCase()).not.toContain('javascript:');
    });

    it('strips data: URL with HTML payload', () => {
        const out = sanitizeRichHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>');
        expect(out).not.toContain('<script');
        expect(out.toLowerCase()).not.toContain('alert');
    });

    it('strips <iframe>', () => {
        const out = sanitizeRichHtml('<iframe src="https://evil.com"></iframe>');
        expect(out.toLowerCase()).not.toContain('<iframe');
    });

    it('strips <style> tag', () => {
        const out = sanitizeRichHtml('<style>body{display:none}</style><p>hi</p>');
        expect(out.toLowerCase()).not.toContain('<style');
        expect(out).toContain('<p>hi</p>');
    });

    it('strips style attribute', () => {
        const out = sanitizeRichHtml('<p style="color:red">hi</p>');
        expect(out.toLowerCase()).not.toContain('style=');
        expect(out).toContain('<p>hi</p>');
    });

    it('strips event handler on allowed tag', () => {
        const out = sanitizeRichHtml('<p onmouseover="alert(1)">text</p>');
        expect(out.toLowerCase()).not.toContain('onmouseover');
        expect(out).toContain('<p>');
        expect(out).toContain('text');
    });

    it('strips polyglot <svg><script>', () => {
        const out = sanitizeRichHtml('<svg><script>alert(1)</script></svg>');
        expect(out).not.toContain('<script');
        expect(out.toLowerCase()).not.toContain('<svg');
    });

    it('strips <object> and <embed>', () => {
        const out = sanitizeRichHtml('<object data="x"></object><embed src="x">');
        expect(out.toLowerCase()).not.toContain('<object');
        expect(out.toLowerCase()).not.toContain('<embed');
    });

    it('strips <form> and <input>', () => {
        const out = sanitizeRichHtml('<form action="/login"><input name="pw"></form>');
        expect(out.toLowerCase()).not.toContain('<form');
        expect(out.toLowerCase()).not.toContain('<input');
    });

    it('strips <meta http-equiv refresh>', () => {
        const out = sanitizeRichHtml('<meta http-equiv="refresh" content="0;url=https://evil.com">');
        expect(out.toLowerCase()).not.toContain('<meta');
    });

    it('strips data attributes', () => {
        const out = sanitizeRichHtml('<p data-foo="bar">hi</p>');
        expect(out).not.toContain('data-foo');
    });

    it('strips srcdoc attribute', () => {
        const out = sanitizeRichHtml('<iframe srcdoc="<script>alert(1)</script>"></iframe>');
        expect(out.toLowerCase()).not.toContain('srcdoc');
        expect(out).not.toContain('<script');
    });
});

describe('sanitizeRichHtml — preserves legitimate content', () => {
    it('preserves headings, lists, links, formatting', () => {
        const input = `
            <h2>Title</h2>
            <p>Para with <strong>bold</strong> and <em>italic</em>.</p>
            <ul><li>Item 1</li><li>Item 2</li></ul>
            <a href="https://example.com" title="ex">Link</a>
            <blockquote>quote</blockquote>
            <code>code</code>
        `;
        const out = sanitizeRichHtml(input);
        expect(out).toContain('<h2>Title</h2>');
        expect(out).toContain('<strong>bold</strong>');
        expect(out).toContain('<em>italic</em>');
        expect(out).toContain('<li>Item 1</li>');
        expect(out).toContain('href="https://example.com"');
        expect(out).toContain('<blockquote>');
        expect(out).toContain('<code>');
    });

    it('preserves mailto: and tel: links', () => {
        const out = sanitizeRichHtml('<a href="mailto:a@b.com">e</a><a href="tel:+48570270470">t</a>');
        expect(out).toContain('mailto:a@b.com');
        expect(out).toContain('tel:+48570270470');
    });

    it('preserves relative URLs and fragments', () => {
        const out = sanitizeRichHtml('<a href="/o-nas">o</a><a href="#section">s</a>');
        expect(out).toContain('href="/o-nas"');
        expect(out).toContain('href="#section"');
    });

    it('preserves target=_blank and forces rel=noopener noreferrer', () => {
        const out = sanitizeRichHtml('<a href="https://x.com" target="_blank">x</a>');
        expect(out).toContain('target="_blank"');
        // Transformer hardens external links — even if admin didn't set rel, we force it
        expect(out).toMatch(/rel="noopener noreferrer"/);
    });

    it('returns empty string for empty/null/non-string input', () => {
        expect(sanitizeRichHtml('')).toBe('');
        expect(sanitizeRichHtml(null)).toBe('');
        expect(sanitizeRichHtml(undefined)).toBe('');
        expect(sanitizeRichHtml(123)).toBe('');
        expect(sanitizeRichHtml({})).toBe('');
    });

    it('returns plain text unchanged (no HTML)', () => {
        expect(sanitizeRichHtml('plain text 123')).toBe('plain text 123');
    });
});

describe('sanitizeStrictHtml — inline-only', () => {
    it('strips block tags', () => {
        const out = sanitizeStrictHtml('<p>p</p><div>d</div><h1>h</h1>');
        expect(out.toLowerCase()).not.toContain('<p>');
        expect(out.toLowerCase()).not.toContain('<div');
        expect(out.toLowerCase()).not.toContain('<h1');
    });

    it('preserves inline formatting and links', () => {
        const out = sanitizeStrictHtml('<b>b</b> <i>i</i> <strong>s</strong> <a href="https://x.com">x</a><br />');
        expect(out).toContain('<b>');
        expect(out).toContain('<i>');
        expect(out).toContain('<strong>');
        expect(out).toContain('href="https://x.com"');
    });

    it('strips script and event handlers', () => {
        const out = sanitizeStrictHtml('<script>alert(1)</script><b onclick="alert(2)">x</b>');
        expect(out).not.toContain('<script');
        expect(out.toLowerCase()).not.toContain('onclick');
    });
});

describe('sanitizeJsonHtmlFields — walks JSON', () => {
    it('sanitizes only known HTML field names', () => {
        const input = {
            id: '<script>1</script>',
            title: 'plain title',
            content: '<p>safe</p><script>bad</script>',
            description: '<b>desc</b><iframe></iframe>',
            url: 'https://x.com?a=1&b=2',
        };
        const out = sanitizeJsonHtmlFields(input) as any;
        expect(out.id).toBe('<script>1</script>'); // not a known HTML field
        expect(out.title).toBe('plain title');
        expect(out.url).toBe('https://x.com?a=1&b=2'); // URL not entity-encoded
        expect(out.content).toContain('<p>safe</p>');
        expect(out.content).not.toContain('<script');
        expect(out.description).toContain('<b>desc</b>');
        expect(out.description).not.toContain('<iframe');
    });

    it('walks nested arrays and objects', () => {
        const input = {
            sections: [
                { type: 'textBlock', config: { content: '<p>ok</p><script>bad</script>' } },
                { type: 'hero', title: 'Hi' },
            ],
        };
        const out = sanitizeJsonHtmlFields(input) as any;
        expect(out.sections[0].config.content).toContain('<p>ok</p>');
        expect(out.sections[0].config.content).not.toContain('<script');
        expect(out.sections[1].title).toBe('Hi');
    });

    it('sanitizes i18n content fields (content_en/de/ua)', () => {
        const input = {
            content_en: '<p>en</p><script>x</script>',
            content_de: '<p>de</p>',
            content_ua: '<p>ua</p>',
        };
        const out = sanitizeJsonHtmlFields(input) as any;
        expect(out.content_en).toContain('<p>en</p>');
        expect(out.content_en).not.toContain('<script');
    });

    it('passes through null/undefined/primitives', () => {
        expect(sanitizeJsonHtmlFields(null)).toBe(null);
        expect(sanitizeJsonHtmlFields(undefined)).toBe(undefined);
        expect(sanitizeJsonHtmlFields(42)).toBe(42);
        expect(sanitizeJsonHtmlFields(true)).toBe(true);
    });
});
