-- Ujednolicenie określenia głównego specjalisty w treści DB (articles + news) — 2026-06-15
--
-- Cel (decyzja Marcina): wszędzie ujednolicić formy "Marcin / dr Marcin / Dr. Marcin
-- Nowosielski / DDS / Zahnarzt / д-р" na zlokalizowany tytuł zawodowy:
--   PL: lek. dent. Marcin Nowosielski M.Sc.   (genitive: lek. dent. Marcina Nowosielskiego M.Sc.)
--   EN: Dentist Marcin Nowosielski M.Sc.       (possessive: Marcin Nowosielski M.Sc.'s)
--   DE: Zahnarzt Marcin Nowosielski M.Sc.
--   UA: лікар-стоматолог Марцін Новосельський M.Sc.  (genitive: лікаря-стоматолога Марціна Новосельського M.Sc.)
-- "Dr"/"д-р" jest też BŁĘDEM merytorycznym (lek. dent. z M.Sc., nie doktorat).
--
-- Mechanika: replace() zagnieżdżone, NAJBARDZIEJ SPECYFICZNE (possessive/DDS) NAJGŁĘBIEJ
-- (stosowane pierwsze) → brak podwójnego "M.Sc." i brak częściowych dopasowań.
-- Artykuły: per locale (osobne wiersze). News: per kolumna locale (content/content_en/de/ua).
-- Idempotentne: ponowny run nie znajdzie już form błędnych (no-op).
-- Pliki kodu + i18n (messages/*) zmienione osobno w repo (commit). News DE "Zahnarzt Marcin
-- Nowosielski M.Sc." jest już kanoniczne — nietknięte.
--
-- ⚠️ Uruchomić na OBU Supabase (produkcja + demo).

-- ───────── ARTICLES: EN ─────────
UPDATE articles SET
  title = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(title,
    'Marcin Nowosielski DDS, M.Sc.','Dentist Marcin Nowosielski M.Sc.'),
    'Marcin Nowosielski DDS','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Nowosielski','Marcin Nowosielski M.Sc.'),
    'Dr. Nowosielski','Marcin Nowosielski M.Sc.'),
  excerpt = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(excerpt,
    'Marcin Nowosielski DDS, M.Sc.','Dentist Marcin Nowosielski M.Sc.'),
    'Marcin Nowosielski DDS','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Nowosielski','Marcin Nowosielski M.Sc.'),
    'Dr. Nowosielski','Marcin Nowosielski M.Sc.'),
  content = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(content,
    'Marcin Nowosielski DDS, M.Sc.','Dentist Marcin Nowosielski M.Sc.'),
    'Marcin Nowosielski DDS','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Nowosielski','Marcin Nowosielski M.Sc.'),
    'Dr. Nowosielski','Marcin Nowosielski M.Sc.')
WHERE locale = 'en' AND (content LIKE '%Nowosielski%' OR excerpt LIKE '%Nowosielski%' OR title LIKE '%Nowosielski%');

-- ───────── ARTICLES: DE ─────────
UPDATE articles SET
  title = replace(replace(replace(replace(replace(replace(replace(replace(replace(title,
    'Marcin Nowosielski, Zahnarzt','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Marcin Nowosielski','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr. Nowosielski','Marcin Nowosielski M.Sc.'),
    'Dr Nowosielski','Marcin Nowosielski M.Sc.'),
  excerpt = replace(replace(replace(replace(replace(replace(replace(replace(replace(excerpt,
    'Marcin Nowosielski, Zahnarzt','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Marcin Nowosielski','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr. Nowosielski','Marcin Nowosielski M.Sc.'),
    'Dr Nowosielski','Marcin Nowosielski M.Sc.'),
  content = replace(replace(replace(replace(replace(replace(replace(replace(replace(content,
    'Marcin Nowosielski, Zahnarzt','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Marcin Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr Nowosielski''s','Marcin Nowosielski M.Sc.''s'),
    'Dr. Marcin Nowosielski','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski','Zahnarzt Marcin Nowosielski M.Sc.'),
    'Dr. Nowosielski','Marcin Nowosielski M.Sc.'),
    'Dr Nowosielski','Marcin Nowosielski M.Sc.')
WHERE locale = 'de' AND (content LIKE '%Nowosielski%' OR excerpt LIKE '%Nowosielski%' OR title LIKE '%Nowosielski%');

-- ───────── ARTICLES: PL ─────────
UPDATE articles SET
  title = replace(replace(replace(replace(replace(replace(replace(title,
    'dr. Marcinem','lek. dent. Marcinem Nowosielskim M.Sc.'),
    'Dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Nowosielskiego','lek. dent. Marcina Nowosielskiego M.Sc.'),
    'dr. Nowosielskiego','lek. dent. Marcina Nowosielskiego M.Sc.'),
  excerpt = replace(replace(replace(replace(replace(replace(replace(excerpt,
    'dr. Marcinem','lek. dent. Marcinem Nowosielskim M.Sc.'),
    'Dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Nowosielskiego','lek. dent. Marcina Nowosielskiego M.Sc.'),
    'dr. Nowosielskiego','lek. dent. Marcina Nowosielskiego M.Sc.'),
  content = replace(replace(replace(replace(replace(replace(replace(content,
    'dr. Marcinem','lek. dent. Marcinem Nowosielskim M.Sc.'),
    'Dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Nowosielskiego','lek. dent. Marcina Nowosielskiego M.Sc.'),
    'dr. Nowosielskiego','lek. dent. Marcina Nowosielskiego M.Sc.')
WHERE locale = 'pl' AND (content LIKE '%Nowosielski%' OR content LIKE '%Marcinem%' OR excerpt LIKE '%Nowosielski%' OR title LIKE '%Nowosielski%');

-- ───────── ARTICLES: UA (cyrylica) ─────────
UPDATE articles SET
  title = replace(replace(replace(replace(replace(replace(replace(title,
    'Др. Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Доктор Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'доктор Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-ра Новосельського','лікаря-стоматолога Марціна Новосельського M.Sc.'),
    'д-ра Новосельського','лікаря-стоматолога Марціна Новосельського M.Sc.'),
  excerpt = replace(replace(replace(replace(replace(replace(replace(excerpt,
    'Др. Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Доктор Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'доктор Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-ра Новосельського','лікаря-стоматолога Марціна Новосельського M.Sc.'),
    'д-ра Новосельського','лікаря-стоматолога Марціна Новосельського M.Sc.'),
  content = replace(replace(replace(replace(replace(replace(replace(content,
    'Др. Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Доктор Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'доктор Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-ра Новосельського','лікаря-стоматолога Марціна Новосельського M.Sc.'),
    'д-ра Новосельського','лікаря-стоматолога Марціна Новосельського M.Sc.')
WHERE locale = 'ua' AND (content LIKE '%Новосельськ%' OR excerpt LIKE '%Новосельськ%' OR title LIKE '%Новосельськ%');

-- ───────── NEWS: kolumny per-locale ─────────
-- EN (content_en / title_en / excerpt_en)
UPDATE news SET
  content_en = replace(replace(replace(replace(content_en,
    'Marcin Nowosielski DDS, M.Sc.','Dentist Marcin Nowosielski M.Sc.'),
    'Marcin Nowosielski DDS','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
  excerpt_en = replace(replace(replace(replace(COALESCE(excerpt_en,''),
    'Marcin Nowosielski DDS, M.Sc.','Dentist Marcin Nowosielski M.Sc.'),
    'Marcin Nowosielski DDS','Dentist Marcin Nowosielski M.Sc.'),
    'Dr Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','Dentist Marcin Nowosielski M.Sc.')
WHERE content_en LIKE '%Marcin Nowosielski DDS%' OR content_en LIKE '%Dr%Marcin Nowosielski%' OR excerpt_en LIKE '%Marcin Nowosielski DDS%';

-- PL (content / title / excerpt)
UPDATE news SET
  content = replace(replace(replace(replace(content,
    'Dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr. Marcinem','lek. dent. Marcinem Nowosielskim M.Sc.'),
  excerpt = replace(replace(replace(COALESCE(excerpt,''),
    'Dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'Dr. Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.'),
    'dr Marcin Nowosielski','lek. dent. Marcin Nowosielski M.Sc.')
WHERE content LIKE '%Dr Marcin Nowosielski%' OR content LIKE '%dr Marcin Nowosielski%' OR content LIKE '%dr. Marcinem%';

-- UA (content_ua) — gdyby news miały cyrylicę д-р
UPDATE news SET
  content_ua = replace(replace(replace(content_ua,
    'Др. Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'Д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.'),
    'д-р Марцін Новосельський','лікар-стоматолог Марцін Новосельський M.Sc.')
WHERE content_ua LIKE '%-р Марцін Новосельський%' OR content_ua LIKE '%Др. Марцін%';

-- DE news już używa "Zahnarzt Marcin Nowosielski M.Sc." (kanoniczne) — bez zmian.
