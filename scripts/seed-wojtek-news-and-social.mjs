// scripts/seed-wojtek-news-and-social.mjs
//
// One-shot seed script — adds:
// 1. News article do `news` table — pełna historia Pana Wojtka + 3 zdjęcia embedded
// 2. Facebook draft do `social_posts` table — text + main.webp, status='draft'
// 3. Instagram draft do `social_posts` table — text + after.webp, status='draft'
//
// Marcin akceptuje treść 2026-05-19, content już zatwierdzony.
// Uruchomienie: node scripts/seed-wojtek-news-and-social.mjs
//
// Po uruchomieniu drafty social media będą widoczne w admin panel
// (`/admin/social-media`) — Marcin może je zaakceptować lub edytować przed publikacją.

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─────────────────────────────────────────────────────────────────────
// 1. NEWS ARTICLE — full HTML content z 3 zdjęciami embedded
// ─────────────────────────────────────────────────────────────────────

const NEWS_SLUG = "bracia-po-metamorfozie-historia-pana-wojtka";
const NEWS_DATE = "2026-05-19";
const NEWS_TITLE = "Bracia po metamorfozie — historia Pana Wojtka, który dał się przekonać";
const NEWS_EXCERPT =
    "Pan Piotr odzyskał uśmiech rok temu. Brat patrzył przy świątecznym obiedzie. Dwa lata później Pan Wojtek ma już własną metamorfozę — i własną historię.";
const NEWS_IMAGE = "/images/news/wojtek/main.webp";

const NEWS_CONTENT_HTML = `
<p><em>"Skoro brata nie ugryzł — to mnie pewnie też nie."</em> Tak żartem zaczynała się historia Pana Wojtka, który trafił do nas po metamorfozie swojego brata, Pana Piotra (<a href="/metamorfozy">historia #2 z naszej galerii metamorfoz</a>).</p>

<p>Pan Piotr odzyskał uśmiech w 2024 roku. Trochę implantów, trochę porcelany, dużo cierpliwości — i nagle Święta Bożego Narodzenia przy stole z całą rodziną. Brat patrzył. Pytał. Słuchał. W końcu jednego dnia napisał do recepcji: <em>"Brat mówił, że nie kłamiecie. Mogę przyjść?"</em></p>

<figure>
  <img src="/images/news/wojtek/before.webp" alt="Stan zębów Pana Wojtka przed rozpoczęciem leczenia w Mikrostomart Opole — wielokrotne braki zębowe wymagające kompleksowej rehabilitacji" loading="lazy" />
  <figcaption>Stan wyjściowy. Pan Wojtek powiedział na konsultacji: <em>"Boję się, że jest za późno."</em></figcaption>
</figure>

<h2>Dwa lata. Sześć faz leczenia. Jeden uśmiech.</h2>

<p>Plan leczenia obejmował praktycznie wszystko, co potrafimy:</p>

<ul>
  <li><strong>Faza chirurgiczna</strong> — ekstrakcje zębów nie do uratowania, oczyszczenie pola pod implanty.</li>
  <li><strong>Augmentacja kości</strong> — odbudowa wyrostka zębodołowego pod implantację (bo "po prostu wstaw implant" to mit, gdy kości brakuje od lat).</li>
  <li><strong>Implantacja</strong> — kilka implantów pod kontrolą cyfrowego planowania, prowadzonej szablonem chirurgicznym.</li>
  <li><strong>Leczenie zachowawcze</strong> — wszystkie zęby, które dało się uratować, leczone <a href="/oferta/leczenie-kanalowe">pod mikroskopem ZEISS</a>, czyściutko, dokładnie.</li>
  <li><strong>Protetyka</strong> — korony, mosty, finalna estetyka. Pełen <a href="/oferta/protetyka">digital workflow</a>.</li>
  <li><strong>Higienizacja i utrzymanie</strong> — bo z nowym uśmiechem przychodzi nowy nawyk.</li>
</ul>

<p>Łącznie? <strong>Dwa lata.</strong> Czasem co tydzień, czasem trzymiesięczne przerwy na gojenie kości. Pan Wojtek wracał regularnie. Czasem narzekał. Czasem żartował. Zawsze przychodził.</p>

<figure>
  <img src="/images/news/wojtek/after.webp" alt="Uśmiech Pana Wojtka po zakończeniu kompleksowego leczenia w Mikrostomart Opole — efekt 2 lat pracy: implanty, protetyka, leczenie zachowawcze" loading="lazy" />
  <figcaption>Po 2 latach. Pierwsze słowa, gdy zobaczył efekt w lustrze: <em>"O Boże. Brat miał rację."</em></figcaption>
</figure>

<h2>Co możemy z tej historii wyciągnąć?</h2>

<p>Po pierwsze — <strong>nigdy nie jest za późno</strong>. Pan Wojtek przyszedł do nas przekonany, że "się nie da". Dało się. Bo dziś dentystyka to nie ekstrakcja i sztuczna szczęka — to chirurgia, materiały kościozastępcze, implantologia cyfrowa, mikroskop endodontyczny. Każdy z tych elementów osobno otwiera drzwi tam, gdzie 20 lat temu była ściana.</p>

<p>Po drugie — <strong>warto zaufać zaufaniu bliskich</strong>. Pan Wojtek nie czytał recenzji. Patrzył na brata przy obiedzie. To uczciwsze niż gwiazdki w Google.</p>

<p>Po trzecie — <strong>czas jest po stronie pacjenta</strong>. Dwa lata brzmi długo. Ale to są dwa lata <em>w trakcie których człowiek normalnie żyje</em>, pracuje, je, śmieje się. Tylko z każdym miesiącem trochę bardziej.</p>

<p>Jeśli Twoja historia z zębami zaczęła brzmieć jak "już chyba odpuszczę" — odezwij się. <a href="/rezerwacja">Bezpłatna konsultacja</a> trwa 30 minut. Może wyjść z niej plan. A może po prostu informacja, że jeszcze nie jest tak źle.</p>

<p><em>Imiona w tej historii są zmienione. Pacjenci wyrazili pisemną zgodę na publikację zdjęć i historii.</em></p>

<p><strong>Zobacz inne metamorfozy:</strong> <a href="/metamorfozy">galeria 16 historii pacjentów →</a></p>
`.trim();

// ─────────────────────────────────────────────────────────────────────
// 2. FACEBOOK POST — text + main.webp + hashtags
// ─────────────────────────────────────────────────────────────────────

const FB_TEXT = `Skoro brata nie ugryzł, to mnie pewnie też nie 😄

Tak zaczął rozmowę z naszą recepcją Pan Wojtek — brat Pana Piotra, którego metamorfozę pokazaliśmy rok temu.

Patrzył na Piotra przy świątecznym stole. Słuchał. Zadawał pytania. W końcu odważył się umówić.

Dwa lata później — chirurgia, augmentacja kości, implanty, mikroskopowa endodoncja, protetyka — Pan Wojtek ma własny uśmiech. I własną historię.

To jest ten moment, kiedy "u nas w rodzinie zęby są słabe" przestaje być wyrokiem 💪

📖 Cała historia + zdjęcia przed/po: link w komentarzu`;

const FB_HASHTAGS = [
    "metamorfoza",
    "stomatologiaopole",
    "mikrostomart",
    "implanty",
    "endodoncja",
    "estetykauśmiechu",
    "Opole",
    "stomatolog",
    "stomatologiaMikroskopowa",
    "zahnarztOpole",
];

const FB_IMAGE_URL = "https://www.mikrostomart.pl/images/news/wojtek/main.webp";

// ─────────────────────────────────────────────────────────────────────
// 3. INSTAGRAM POST — text + after.webp + more hashtags (max 30)
// ─────────────────────────────────────────────────────────────────────

const IG_TEXT = `Brat przyprowadził brata. Dwa lata. Jeden uśmiech. ✨

Pan Piotr — metamorfoza #2 (rok 2024).
Pan Wojtek — metamorfoza #16 (dziś).

Czasem najlepsza reklama to obiad z rodziną 🍽️

Plan leczenia: chirurgia 🔬 → augmentacja kości 🦴 → implanty ⚙️ → mikroskopowa endodoncja 🔍 → protetyka 👑

Pełna historia → link w bio`;

const IG_HASHTAGS = [
    "metamorfoza",
    "implanty",
    "stomatologiaopole",
    "mikrostomart",
    "endodoncjamikroskopowa",
    "digitalimplantology",
    "smilemakeover",
    "dentysta",
    "opole",
    "zahnarzt",
    "dentaltransformation",
    "beforeandafter",
    "zahnimplantate",
    "zahnarztPolen",
    "stomatologOpole",
];

const IG_IMAGE_URL = "https://www.mikrostomart.pl/images/news/wojtek/after.webp";

// Platform IDs from social_platforms table (first FB + first IG)
const FB_PLATFORM_ID = "6d393827-dc3a-4a99-9b7a-c2db6f730aa1";
const IG_PLATFORM_ID = "d4c3bb3b-ad29-44cc-b6f6-522bccf2315f";

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🚀 Seeding Wojtek metamorfoza content...\n");

    // ── 1. News article ───────────────────────────────────────────────
    console.log("📰 Inserting news article...");
    const newsId = `news-wojtek-${Date.now()}`;
    const { data: news, error: newsErr } = await supabase
        .from("news")
        .insert({
            id: newsId,
            title: NEWS_TITLE,
            slug: NEWS_SLUG,
            excerpt: NEWS_EXCERPT,
            content: NEWS_CONTENT_HTML,
            date: NEWS_DATE,
            image: NEWS_IMAGE,
        })
        .select()
        .single();

    if (newsErr) {
        console.error("❌ News insert failed:", newsErr);
        process.exit(1);
    }
    console.log(`   ✅ news.id = ${news.id}, slug = ${news.slug}`);
    console.log(`   📍 https://www.mikrostomart.pl/aktualnosci/${news.slug}`);

    // ── 2. Facebook draft ─────────────────────────────────────────────
    console.log("\n📘 Inserting Facebook draft...");
    const { data: fb, error: fbErr } = await supabase
        .from("social_posts")
        .insert({
            status: "draft",
            platform_ids: [FB_PLATFORM_ID],
            content_type: "post",
            text_content: FB_TEXT,
            hashtags: FB_HASHTAGS,
            image_url: FB_IMAGE_URL,
            ai_model: "manual-seed-2026-05-19",
            ai_prompt_used: "Manual content by Marcin (fikcyjna historia Pana Wojtka — brat Pana Piotra, 2 lata leczenia kompleksowego)",
            admin_notes: `Wojtek news: /aktualnosci/${NEWS_SLUG}. Image: pup.jpg (close-up smile macro). Marcin verbal OK 2026-05-19.`,
        })
        .select()
        .single();

    if (fbErr) {
        console.error("❌ FB draft insert failed:", fbErr);
        process.exit(1);
    }
    console.log(`   ✅ FB social_posts.id = ${fb.id}`);

    // ── 3. Instagram draft ────────────────────────────────────────────
    console.log("\n📸 Inserting Instagram draft...");
    const { data: ig, error: igErr } = await supabase
        .from("social_posts")
        .insert({
            status: "draft",
            platform_ids: [IG_PLATFORM_ID],
            content_type: "post",
            text_content: IG_TEXT,
            hashtags: IG_HASHTAGS,
            image_url: IG_IMAGE_URL,
            ai_model: "manual-seed-2026-05-19",
            ai_prompt_used: "Manual content by Marcin (fikcyjna historia Pana Wojtka, IG version)",
            admin_notes: `Wojtek news: /aktualnosci/${NEWS_SLUG}. Image: pup2.jpg (after, hero shot). Marcin wanted both pup1+pup2 — dodaj before.webp jako carousel slide 2 w admin UI jeśli IG carousel support. Marcin verbal OK 2026-05-19.`,
        })
        .select()
        .single();

    if (igErr) {
        console.error("❌ IG draft insert failed:", igErr);
        process.exit(1);
    }
    console.log(`   ✅ IG social_posts.id = ${ig.id}`);

    console.log("\n📊 Summary:");
    console.table([
        { type: "news", id: news.id, url: `/aktualnosci/${news.slug}` },
        { type: "FB draft", id: fb.id, url: "/admin → Social Media → Drafts" },
        { type: "IG draft", id: ig.id, url: "/admin → Social Media → Drafts" },
    ]);

    console.log("\n✨ Done. Marcin actions:");
    console.log("   1. News już opublikowany (visible przy następnym Vercel deploy + cache invalidation)");
    console.log("   2. FB + IG drafts czekają w /admin → Social Media (status='draft')");
    console.log("   3. Aby opublikować social: zatwierdź draft w admin UI (status → 'approved') i kliknij Publish");
    console.log("\n⚠️ WAŻNE: Vercel deploy musi przejść PRZED publikacją social — zdjęcia muszą być dostępne publicznie pod URL");
}

main().catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
});
