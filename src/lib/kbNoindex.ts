// KB cleanup (GEO audyt 5.3, 2026-06-15): denylist artykułów Bazy Wiedzy
// oznaczonych jako noindex (Grupa C — cienkie clickbaity, nie szkodliwe).
//
// Klucz = `group_id` (NIE slug) — dzięki temu jeden wpis noindexuje WSZYSTKIE
// locale danego artykułu (pl + en + de + ua mają wspólny group_id), bez
// enumerowania przetłumaczonych slugów.
//
// Mechanika (decyzja Marcina: noindex code-side, odwracalne, bez migracji DB):
//   - `baza-wiedzy/[slug]/generateMetadata` → robots: { index:false, follow:true }
//     gdy article.group_id ∈ tego zbioru.
//   - `sitemap.ts` → wyklucza te group_id (żeby noindexowane nie wisiały w sitemap —
//     lekcja S10-4: "Submitted URL marked noindex").
//
// Artykuły zostają widoczne dla userów (treść się renderuje), wypadają tylko z
// indeksu Google. Najlepsze tematy z tej listy → kandydaci do przepisania na
// Klasę A w osobnej fali treści. Usunięcie group_id stąd = ponowne włączenie indeksu.
export const KB_NOINDEX_GROUP_IDS: ReadonlySet<string> = new Set<string>([
    // — fakty/ciekawostki clickbait —
    'ec66eab1-e8ea-4229-82af-a9ef8745352a', // 10-niezwyklych-faktow-o-twoich-zebach
    '125ea38b-2181-4f6f-a5cc-73cc1e8a3d5d', // co-twoje-zeby-mowia-o-twoim-zdrowiu-7-zaskakujacych-faktow
    'fd7c8846-767a-488d-9be7-981855b6a19d', // o-czym-milcza-nasze-zeby-5-zaskakujacych-faktow
    'a5cc28e0-5042-4a9b-a86a-08cae6a82b33', // osiem-najbardziej-zaskakujacych-rzeczy-zdrowie-jamy-ustnej
    '11c625ac-4499-48a1-ad48-366ec85ba10b', // zeby-bez-tajemnic-jak-odczytywac-sygnaly-ktore-wysyla-twoj-usmiech
    // — "gwiazdy / Hollywood / odmłodzenie" —
    'c8549320-2f04-42a5-b869-ca06a3005130', // 7-sekretow-usmiechu-gwiazd-jak-dbac-o-zeby-aby-wygladaly-jak-milion-dolarow
    'ce7cd778-5e0f-48a2-85db-689bf692422b', // usmiech-gwiazd-sekrety-zdrowych-zebow-prosto-z-hollywood
    '8aae521e-9000-4cde-8983-04bf54802be4', // zatrzymaj-czas-higiena-jamy-ustnej-opoznia-starzenie-zebow
    '64a6b920-56f1-4a8a-8c3e-4fdbee3c8e06', // jak-twoj-usmiech-moze-cie-odmlodzic-sekrety-stomatologicznej-odmiany
    '93aeebd0-ce10-4347-9577-2bb31dd8d994', // jak-twoj-usmiech-wplywa-na-zdrowie-psychiczne (dodany 2026-06-15)
    // — "X błędów / mitów / pokarmów / sposobów" —
    'bbf6f2cf-bfc0-4731-8767-27256861b88f', // 10-mitow-o-higienie-jamy-ustnej-ktore-moga-ci-zaszkodzic
    'e48e1c41-1799-4562-a58a-b8a284795c73', // 7-niespodziewanych-pokarmow-ktore-moga-zniszczyc-twoj-usmiech
    '6e588c94-008f-4d6a-a892-aee282abf09d', // 7-niewidocznych-bledow-w-higienie-jamy-ustnej
    '86037a2b-44b2-4eb1-97f3-4537ac72dd6e', // 7-zaskakujacych-sposobow-styl-zycia-zdrowie-zebow
    'b5ff59b7-06ad-4c59-8808-e8ef0fc95218', // usmiech-przelomowy-jak-uniknac-najczestszych-bledow-podczas-mycia-zebow
    '3a754a73-f686-4fd4-9cd2-2ff90f224797', // zdrowy-usmiech-w-5-minut-dziennie-niezwykle-triki-dla-zapracowanych
    '418e7f18-762d-4504-a628-07a743ab6d88', // usmiechnij-sie-zdrowiem-5-tajemnic-stomatologicznych
    '3276cbe4-fb1e-4b60-8518-e2775c6ec125', // zeby-w-roli-glownej-jak-zmiana-nawykow-zywieniowych-moze-odmienic-twoj-usmiech
    '4f18d4ae-ee3d-4c43-a949-fd23c47f03e0', // sekrety-zdrowych-dziasel-jak-uchronic-usmiech-przed-paradontoza (kandydat do rewrite pod periodontologię)
    // — podgrupa "dieta a zęby" (klaster cienki, scal/przepisz później) —
    '9ea77c44-9dbb-4ed2-883c-cb9044764a32', // sekret-zdrowego-usmiechu-jak-dieta-wplywa-na-twoje-zeby
    '228b67dd-426b-42d5-b16c-d4936735893f', // usmiech-bez-tajemnic-jak-dzieki-diecie-wspierac-zdrowie-zebow-i-dziasel
    'f8033e3b-999c-4e78-ac4a-00d6b3777c70', // usmiech-bez-tajemnic-jak-dbac-o-zeby-w-roznych-dekadach-zycia
    '2bb18b29-2f1b-4c87-bffc-1b7697b376b5', // usmiech-bez-tajemnic-najczestsze-bledy-w-higienie-jamy-ustnej
    'bc40712a-3862-4614-97f7-cafd8a9ece93', // sekrety-smaku-zdrowie-jamy-ustnej-zmysly-smaku-i-wechu
]);
