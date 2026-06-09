import { describe, it, expect } from 'vitest';
import { linkifyHtml, relatedServiceLink } from '../internalLinks';

describe('linkifyHtml', () => {
    it('links the first occurrence of a service keyword', () => {
        const out = linkifyHtml('<p>Stosujemy nowoczesne implanty zębów na najwyższym poziomie.</p>', 'pl');
        expect(out).toContain('href="/oferta/implantologia"');
        expect(out).toContain('data-autolink="1"');
        expect(out).toContain('>implanty zębów</a>'); // zachowuje oryginalny tekst dopasowania
    });

    it('preserves the original cased/inflected match text', () => {
        const out = linkifyHtml('<p>Wykonujemy licówki porcelanowe.</p>', 'pl');
        expect(out).toContain('>licówki porcelanowe</a>');
        expect(out).toContain('href="/oferta/stomatologia-estetyczna"');
    });

    it('links each topic at most once (no spam)', () => {
        const html = '<p>Implantologia to nasza specjalność. Implantologia daje stałe zęby. Implantologia.</p>';
        const out = linkifyHtml(html, 'pl');
        expect((out.match(/href="\/oferta\/implantologia"/g) || []).length).toBe(1);
    });

    it('prefers the geo landing in pl when a geo phrase is present', () => {
        const out = linkifyHtml('<p>Robimy implanty Opole od 2016 roku.</p>', 'pl');
        expect(out).toContain('href="/implanty-opole"');
        expect(out).not.toContain('href="/oferta/implantologia"');
    });

    it('never links geo landings outside pl (foreign = noindex)', () => {
        const out = linkifyHtml('<p>We offer dental implants in Opole.</p>', 'en');
        expect(out).toContain('href="/en/oferta/implantologia"');
        expect(out).not.toContain('implanty-opole');
        expect(out).not.toContain('/en/implanty-opole');
    });

    it('does not link inside an existing anchor', () => {
        const html = '<p>Zobacz <a href="/x">nasze implanty zębów tutaj</a> dzisiaj.</p>';
        const out = linkifyHtml(html, 'pl');
        // fraza obecna w mapie, ale wewnątrz istniejącego <a> → bez zagnieżdżonego autolinku
        expect(out).not.toContain('data-autolink');
        expect(out).toContain('<a href="/x">nasze implanty zębów tutaj</a>');
    });

    it('does not link inside headings', () => {
        const out = linkifyHtml('<h2>Implantologia w Opolu</h2><p>tekst bez fraz usług.</p>', 'pl');
        expect(out).not.toContain('data-autolink');
        expect(out).toContain('<h2>Implantologia w Opolu</h2>');
    });

    it('respects word boundaries (no mid-word match)', () => {
        // "protetyka" nie powinno matchować wewnątrz "protetyczny" gdy dodamy lookahead litery
        const out = linkifyHtml('<p>To rozwiązanie protetyczne jest trwałe.</p>', 'pl');
        // "protetyka" nie matchuje "protetyczne"; brak innej frazy → brak linku
        expect(out).not.toContain('data-autolink');
    });

    it('caps the total number of injected links', () => {
        const html = '<p>implantologia, ortodoncja, protetyka, periodontologia, '
            + 'leczenie kanałowe, licówki, laser Fotona, metamorfoza, chirurgia stomatologiczna.</p>';
        const out = linkifyHtml(html, 'pl', 3);
        expect((out.match(/data-autolink="1"/g) || []).length).toBe(3);
    });

    it('returns input unchanged when there are no keywords', () => {
        const html = '<p>Zapraszamy serdecznie do naszego gabinetu.</p>';
        expect(linkifyHtml(html, 'pl')).toBe(html);
    });

    it('handles empty / self-closing / image tokens safely', () => {
        const html = '<p>Tekst</p><br/><img src="/a.jpg" alt="implanty zębów"/><p>koniec</p>';
        const out = linkifyHtml(html, 'pl');
        // alt nie jest węzłem tekstowym (jest w atrybucie tagu) → nie linkujemy
        expect(out).toContain('alt="implanty zębów"');
        expect(out).not.toContain('data-autolink');
        expect(out).toContain('<br/>');
    });
});

describe('relatedServiceLink', () => {
    it('returns the matching service for a pl topic', () => {
        const r = relatedServiceLink('Wszystko o leczeniu kanałowym', 'pl');
        expect(r).toEqual({ href: '/oferta/leczenie-kanalowe', label: 'Leczenie kanałowe' });
    });

    it('localizes the href for non-pl locales and never returns geo', () => {
        const r = relatedServiceLink('All about dental implants', 'en');
        expect(r).toEqual({ href: '/en/oferta/implantologia', label: 'Dental implants' });
    });

    it('returns null when nothing matches', () => {
        expect(relatedServiceLink('Godziny otwarcia i dojazd', 'pl')).toBeNull();
    });
});
