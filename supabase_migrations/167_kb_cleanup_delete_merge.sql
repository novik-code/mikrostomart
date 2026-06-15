-- KB cleanup (2026-06-15, GEO audyt 5.3) — Grupa A (usuń) + Grupa B (scal duplikaty)
--
-- Decyzje Marcina (PLAN_GEO_KB_CLEANUP_2026-06-15.md):
--   Grupa A (19) — treść "domowe wybielanie / bez dentysty" (anty-gabinetowa,
--     GEO-szkodliwa: uczy "jak NIE iść do dentysty") → USUNĄĆ.
--   Grupa B (6 klastrów) — duplikaty → SCALIĆ: zostaje 1 best z klastra,
--     pozostałe (16 loserów) USUNĄĆ. Best zostaje w DB (indexable).
--
-- 301 redirecty (slug PL → usługa/hub lub winner klastra) są w next.config.ts.
-- Usuwamy po `group_id` → kasuje wszystkie locale (pl+en+de+ua) danego artykułu.
-- Idempotentne: ponowne uruchomienie usuwa 0 wierszy (grupy już nie istnieją).
--
-- NIE usuwamy obrazów public/kb-<slug>.* w tej migracji (osierocone PNG są
-- nieszkodliwe; opcjonalne czyszczenie po stronie repo).
--
-- ⚠️ Uruchomić na OBU Supabase (produkcja keucogopujdolzmfajjv + demo mhosfncgasjfruiohlfo).

DELETE FROM articles
WHERE group_id = ANY (ARRAY[
    -- ── Grupa A (19) — usuń ──
    'ae5be4b9-31a8-4158-952b-30af60c3c8f4', -- snieznobialy-usmiech-domowe-sposoby-...-bez-dentysty
    '21e996e6-1983-4f2e-9b68-2a6c02e31cd2', -- zeby-w-30-dni-plan-na-zdrowy-usmiech-bez-dentysty
    '60833fdc-31ce-42c1-b60a-1053a806e8db', -- zeby-w-roli-glownej-...-bez-wizyty-u-stomatologa
    '4b82a689-846f-4b98-8c30-6bbc79dec3e7', -- zapomnij-o-borowaniu-...-remineralizacja-zebow
    'd1ad0887-3945-4091-b260-6d6b87b36de1', -- usmiech-pelen-blasku-naturalne-...-wybielanie-w-domowym-zaciszu
    '3441c872-c7ef-46a7-b801-20583a1f8a88', -- usmiech-pelen-blasku-sekrety-naturalnego-wybielania-w-kuchni
    '6a0facb5-2a79-4feb-8159-99f6f3e70231', -- usmiech-pelen-blasku-naturalne-sposoby-na-rozjasnienie-zebow
    '1ea89cc5-2ab0-47b5-9edf-dd2e9ae7e16c', -- usmiech-pelen-blasku-10-domowych-sposobow-...-lsniace-zeby
    '3b1a62c6-4ff4-472a-a5aa-d634934e3d5d', -- usmiech-pelen-blasku-sekrety-domowej-pielegnacji-zebow
    '2aae8f16-ea25-4192-a290-5eab208641e1', -- 5-sposobow-na-naturalne-rozjasnianie-zebow-w-domowym-zaciszu
    '0382cff7-534b-482e-84f7-fb16b82d55d4', -- zeby-jak-diamenty-sekrety-domowego-wybielania
    '21b48361-cbe8-467a-ae1c-7920669dbfca', -- usmiech-bez-tajemnic-domowe-metody-wybielanie-zebow
    '4d894724-44b9-4b7f-87c9-1b32de186d86', -- magia-usmiechu-sekrety-naturalnych-sposobow-na-bielsze-zeby
    'b318966c-fc6d-43e0-b991-cddd74ab46f9', -- usmiechnij-sie-szeroko-7-tajemnic-domowych-...-biale-zeby
    'c47cc4e6-235a-4831-b0e4-c3d79e0b2ee2', -- usmiech-w-rytmie-natury-naturalne-remedia-na-zeby
    '6ae4c600-518a-40df-a40e-2122633a7c60', -- usmiech-przez-lata-sekrety-domowej-pielegnacji-zebow
    'cbd7c66c-6cce-4f10-91e9-463b87aa9593', -- zdrowy-usmiech-lzejszy-portfel-domowe-sposoby-...-prochnicy
    '6a0d3bf2-48f8-4d5b-8859-adb84a1dba50', -- sekrety-zdrowego-usmiechu-naturalne-metody-wzmocnienie-zebow-dziasel
    'a42a85b8-348f-4ca8-b11c-f3e246949b53', -- usmiech-bez-bolu-domowe-sposoby-na-nadwrazliwosc-zebow

    -- ── Grupa B losery (16) — scal (winner klastra ZOSTAJE) ──
    -- klaster "nawyki niszczące zęby" (winner: 10-niespodziewanych-nawykow-ktore-niszcza-zeby — ZOSTAJE)
    '1dfbc885-f193-4458-9028-1bf8ac2d5d53', -- 10-zaskakujacych-nawykow-jedzeniowych-niszczacych-zeby
    '05da56f3-5d38-4305-b241-08464167cec6', -- 10-zaskakujacych-nawykow-ktore-niszcza-twoje-zeby
    '1d40ed02-841a-4d5b-a822-0dae27b06e7d', -- 5-zaskakujacych-nawykow-...-a-teraz-moga-je-uratowac
    'c9293cc4-d619-4172-a0ed-9e1f5afccd55', -- 7-zaskakujacych-nawykow-ktore-moga-szkodzic-twoim-zebom
    '04c1f250-67ab-4573-a349-149bd61507ff', -- 7-zaskakujacych-nawykow-ktore-niszcza-twoj-usmiech
    '698288f5-f316-412c-bc9b-58e0cd7a03a4', -- 7-zaskakujacych-nawykow-ktore-niszczy-twoje-zeby-kazdego-dnia
    -- klaster "uśmiech przez sen" (winner: usmiech-przez-sen-jak-nocna-rutyna-... — ZOSTAJE)
    '3e00474b-3df2-42d6-ae29-50159bd3b1d7', -- usmiech-przez-sen-jak-nocne-nawyki-wplywaja-...
    '61d42777-110a-4ef9-b79d-386e483cf7b4', -- usmiech-przez-sen-jak-nocne-nawykowe-zachowania-...
    'be753e66-a263-4e4b-a537-e9aafc445bc8', -- usmiech-przez-sen-jak-nocne-rutyny-moga-poprawic-...
    -- klaster "magia uśmiechu" (winner: magia-...-regularne-wizyty-u-dentysty — ZOSTAJE, pro-wizyta)
    'be7a7dd4-68ee-4054-995b-2095b0848506', -- magia-usmiechu-10-codziennych-nawykow-ktore-odmlodza-twoje-zeby
    'f8ad4972-dbee-4508-bed2-29dc33559f05', -- magia-usmiechu-jak-twoje-zeby-moga-wplynac-na-pierwsze-wrazenie-...
    -- klaster "produkty z kuchni" (winner: 5-zaskakujacych-produktow-z-kuchni-zdrowie-zebow — ZOSTAJE)
    'b61a0d6e-0fe3-481d-973d-0c55e4fa8715', -- 5-niezwyklych-znajdzki-z-kuchni-...
    '7c64cfb2-fcf1-4712-a3c4-96223f2e9903', -- zdrowe-zeby-zdrowsze-zycie-5-niezwyklych-produktow-w-kuchni
    -- klaster "ślina" (winner: sekretne-zycie-sliny-... — ZOSTAJE)
    'ec895b83-d6b3-4758-94af-9e6c4c119aa7', -- zaskakujace-fakty-o-twojej-slinie-...
    -- klaster "pasta/etykiety" (winner: sekrety-pasty-do-zebow-jak-wybrac-produkt-idealny-... — ZOSTAJE)
    '2f1b709f-b971-4056-bc2f-7e4b575ea66b', -- sekrety-zdrowego-usmiechu-etykiety-pasta-do-zebow
    'a86bb226-5c92-4089-a1ce-57991496820b'  -- sekrety-bialego-usmiechu-nawyki-zmieniajace-zeby
]::uuid[]);

-- Weryfikacja (powinno zwrócić 0 po wykonaniu):
-- SELECT count(*) FROM articles WHERE group_id = ANY (ARRAY[ ...te 35 wyżej... ]::uuid[]);
