// scripts/wojtek-seo-polish.mjs
//
// SEO polish dla Wojtek news article (2026-05-19):
// 1. Update content PL → markdown z ## h2 headers + [text](url) klikalne linki
//    (parser slug page rozszerzony w tym commit)
// 2. AI translate × 3 locale (PL → EN/DE/UA) przez GPT-4o-mini —
//    populuje title_en/de/ua, excerpt_en/de/ua, content_en/de/ua
// 3. Update tags TEXT[] (wymaga migracji 131 — graceful fallback gdy column nie istnieje)
//
// Uruchomienie: node scripts/wojtek-seo-polish.mjs
// Wymaga: OPENAI_API_KEY + Supabase service role w .env.local

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SLUG = "bracia-po-metamorfozie-historia-pana-wojtka";

// ─────────────────────────────────────────────────────────────────────
// PL CONTENT — markdown z ## h2 (główne sekcje) + [text](url) linki
// ─────────────────────────────────────────────────────────────────────

const PL_CONTENT = `"Skoro brata nie ugryzł — to mnie pewnie też nie." Tak żartem zaczynała się historia Pana Wojtka, który trafił do nas po metamorfozie swojego brata, Pana Piotra ([historia #2 z naszej galerii metamorfoz](/metamorfozy)).

Pan Piotr odzyskał uśmiech w 2024 roku. Trochę implantów, trochę porcelany, dużo cierpliwości — i nagle Święta Bożego Narodzenia przy stole z całą rodziną. Brat patrzył. Pytał. Słuchał. W końcu jednego dnia napisał do recepcji: "Brat mówił, że nie kłamiecie. Mogę przyjść?"

![Stan zębów Pana Wojtka przed rozpoczęciem leczenia w Mikrostomart Opole — wielokrotne braki zębowe wymagające kompleksowej rehabilitacji](/images/news/wojtek/before.webp)

Stan wyjściowy. Pan Wojtek powiedział na konsultacji: "Boję się, że jest za późno."

## Dwa lata. Sześć faz leczenia. Jeden uśmiech.

Plan leczenia obejmował praktycznie wszystko, co potrafimy:

* **Faza chirurgiczna** — ekstrakcje zębów nie do uratowania, oczyszczenie pola pod implanty.
* **Augmentacja kości** — odbudowa wyrostka zębodołowego pod implantację (bo "po prostu wstaw implant" to mit, gdy kości brakuje od lat).
* **Implantacja** — kilka implantów pod kontrolą cyfrowego planowania, prowadzonej szablonem chirurgicznym.
* **Leczenie zachowawcze** — wszystkie zęby, które dało się uratować, leczone [pod mikroskopem ZEISS](/oferta/leczenie-kanalowe), czyściutko, dokładnie.
* **Protetyka** — korony, mosty, finalna estetyka. Pełen [digital workflow protetyczny](/oferta/protetyka).
* **Higienizacja i utrzymanie** — bo z nowym uśmiechem przychodzi nowy nawyk.

Łącznie? **Dwa lata.** Czasem co tydzień, czasem trzymiesięczne przerwy na gojenie kości. Pan Wojtek wracał regularnie. Czasem narzekał. Czasem żartował. Zawsze przychodził.

![Uśmiech Pana Wojtka po zakończeniu kompleksowego leczenia w Mikrostomart Opole — efekt 2 lat pracy: implanty, protetyka, leczenie zachowawcze](/images/news/wojtek/after.webp)

Po 2 latach. Pierwsze słowa, gdy zobaczył efekt w lustrze: "O Boże. Brat miał rację."

## Trzy lekcje z tej historii

Po pierwsze — **nigdy nie jest za późno**. Pan Wojtek przyszedł do nas przekonany, że "się nie da". Dało się. Bo dziś dentystyka to nie ekstrakcja i sztuczna szczęka — to chirurgia, materiały kościozastępcze, [implantologia cyfrowa](/oferta/implantologia), mikroskop endodontyczny. Każdy z tych elementów osobno otwiera drzwi tam, gdzie 20 lat temu była ściana.

Po drugie — **warto zaufać zaufaniu bliskich**. Pan Wojtek nie czytał recenzji. Patrzył na brata przy obiedzie. To uczciwsze niż gwiazdki w Google.

Po trzecie — **czas jest po stronie pacjenta**. Dwa lata brzmi długo. Ale to są dwa lata w trakcie których człowiek normalnie żyje, pracuje, je, śmieje się. Tylko z każdym miesiącem trochę bardziej.

## Twoja historia może wyglądać tak samo

Jeśli Twoja historia z zębami zaczęła brzmieć jak "już chyba odpuszczę" — odezwij się. [Bezpłatna konsultacja](/rezerwacja) trwa 30 minut. Może wyjść z niej plan. A może po prostu informacja, że jeszcze nie jest tak źle.

Imiona w tej historii są zmienione. Pacjenci wyrazili pisemną zgodę na publikację zdjęć i historii.

**Zobacz inne metamorfozy:** [galeria 16 historii pacjentów →](/metamorfozy)`;

// Per-article SEO keywords (PL — base, tłumaczymy nazwy własne pozostawiamy)
const TAGS = [
    "metamorfoza uśmiechu",
    "implanty Opole",
    "augmentacja kości",
    "implantologia cyfrowa",
    "leczenie kanałowe mikroskop",
    "endodoncja mikroskopowa",
    "protetyka cyfrowa",
    "rekonstrukcja zgryzu",
    "mikrostomart",
    "Marcin Nowosielski",
    "stomatologia Opole",
    "metamorfoza dentystyczna",
    "kompleksowe leczenie stomatologiczne",
];

// ─────────────────────────────────────────────────────────────────────
// AI TRANSLATE — GPT-4o-mini
// ─────────────────────────────────────────────────────────────────────

const TITLE_PL = "Bracia po metamorfozie — historia Pana Wojtka, który dał się przekonać";
const EXCERPT_PL = "Pan Piotr odzyskał uśmiech rok temu. Brat patrzył przy świątecznym obiedzie. Dwa lata później Pan Wojtek ma już własną metamorfozę — i własną historię.";

const LOCALES = [
    { code: "en", language: "English (US)", notes: "Localize 'Pan Wojtek/Piotr' to 'Mr. Wojtek/Piotr'. Keep brand names: Mikrostomart, ZEISS, Fotona. Convert internal links /metamorfozy stays /metamorfozy (will be handled by routing). Markdown structure preserved exactly: ##, *, **, [text](url), ![alt](src)." },
    { code: "de", language: "German", notes: "Localize names: 'Herr Wojtek/Piotr'. Keep brand names. Use 'Du'/casual where natural. Markdown preserved exactly." },
    { code: "ua", language: "Ukrainian (Cyrillic)", notes: "Localize names: 'пан Войтек/Пьотр'. Keep brand names in Latin script. Markdown preserved." },
];

async function translateOne(locale, lang, notes) {
    console.log(`\n🌍 [${locale}] Translating to ${lang} via GPT-4o-mini...`);

    const prompt = `You are translating a Polish dental clinic news article into ${lang} for SEO purposes. ${notes}

TRANSLATE EACH OF THE 3 FIELDS BELOW. Return ONLY a valid JSON object with keys: title, excerpt, content. No markdown code fence, no explanation. The content MUST preserve the exact markdown structure: ## headings, * list items, **bold**, [text](href) links with href unchanged, ![alt](src) images with src unchanged but alt text translated. Quotes inside text use straight " characters.

---PL_TITLE---
${TITLE_PL}

---PL_EXCERPT---
${EXCERPT_PL}

---PL_CONTENT---
${PL_CONTENT}`;

    const start = Date.now();
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a professional medical translator with deep dental terminology knowledge. Output valid JSON only." },
            { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const elapsed = Math.round((Date.now() - start) / 1000);
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);

    console.log(`   ✅ ${locale} translated (${elapsed}s, content ${parsed.content?.length} chars)`);
    return parsed;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🚀 SEO polish dla Wojtek article\n");

    // ── 1. Translate × 3 locales ─────────────────────────────────────
    const translations = {};
    for (const { code, language, notes } of LOCALES) {
        translations[code] = await translateOne(code, language, notes);
    }

    // ── 2. Build update payload ──────────────────────────────────────
    const updatePayload = {
        content: PL_CONTENT,
        title_en: translations.en.title,
        excerpt_en: translations.en.excerpt,
        content_en: translations.en.content,
        title_de: translations.de.title,
        excerpt_de: translations.de.excerpt,
        content_de: translations.de.content,
        title_ua: translations.ua.title,
        excerpt_ua: translations.ua.excerpt,
        content_ua: translations.ua.content,
    };

    // ── 3. Try to add tags (requires migration 131) ──────────────────
    console.log("\n🏷️  Trying to set tags (requires migration 131 wgranej)...");
    const tagsTry = await supabase
        .from("news")
        .update({ tags: TAGS })
        .eq("slug", SLUG);

    if (tagsTry.error) {
        if (tagsTry.error.code === "42703") {
            console.log("   ⚠️ tags column nie istnieje. Wgraj migrację 131 i ponownie uruchom script (lub manualnie UPDATE news SET tags = '...' WHERE slug = '...').");
        } else {
            console.error("   ❌ tags update error:", tagsTry.error);
        }
    } else {
        console.log(`   ✅ ${TAGS.length} tags ustawione`);
    }

    // ── 4. Update content + translations ─────────────────────────────
    console.log("\n💾 Updating news row (content PL + 3 translations)...");
    const { data, error } = await supabase
        .from("news")
        .update(updatePayload)
        .eq("slug", SLUG)
        .select()
        .single();

    if (error) {
        console.error("❌ Update failed:", error);
        process.exit(1);
    }

    console.log("   ✅ Updated:");
    console.log(`      content PL: ${data.content.length} chars (markdown z h2 + [text](url) links)`);
    console.log(`      title_en: "${data.title_en}"`);
    console.log(`      title_de: "${data.title_de}"`);
    console.log(`      title_ua: "${data.title_ua}"`);
    console.log(`      content_en: ${data.content_en?.length} chars`);
    console.log(`      content_de: ${data.content_de?.length} chars`);
    console.log(`      content_ua: ${data.content_ua?.length} chars`);
    if (data.tags) console.log(`      tags: ${data.tags.length} items`);

    console.log("\n✨ Done. Verify:");
    console.log("   PL: https://www.mikrostomart.pl/aktualnosci/" + SLUG);
    console.log("   EN: https://www.mikrostomart.pl/en/aktualnosci/" + SLUG);
    console.log("   DE: https://www.mikrostomart.pl/de/aktualnosci/" + SLUG);
    console.log("   UA: https://www.mikrostomart.pl/ua/aktualnosci/" + SLUG);
}

main().catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
});
