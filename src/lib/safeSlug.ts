/**
 * Straznik slugow URL-safe dla tresci z bazy (baza wiedzy, aktualnosci).
 *
 * Kontekst (2026-08-20, audyt SEO 16.08 — "Internal Client Error 4xx"):
 * w tabeli `articles` istnieja wiersze ze slugami zawierajacymi polskie znaki
 * (`lęk`, `świeżości`, `błyszczacy`) oraz niemieckie (`natürliches`). Routing
 * Next.js zwraca dla nich 404, wiec kazdy link wygenerowany z takiego sluga
 * jest wewnetrznym 404.
 *
 * `sitemap.ts` bronil sie przed tym wlasnym filtrem juz od S10-4, ale
 * komponenty linkujace (RelatedArticles, ArticleCarousel) nie — i to one
 * produkowaly trzy 404 wykryte crawlerem.
 *
 * To jest lataniem objawu po stronie linkow. Zrodlem sa dane: slugi w bazie
 * nalezy przemianowac na ASCII albo te wiersze usunac wraz z 301.
 */
const URL_SAFE_SLUG = /^[a-z0-9-]+$/;

export function isUrlSafeSlug(slug: string | null | undefined): boolean {
    return typeof slug === 'string' && URL_SAFE_SLUG.test(slug);
}
