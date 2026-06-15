-- 166_seed_kb_topics.sql
-- Seed kolejki tematów dla silnika treści Klasy A (GEO 2026-06-15).
-- Cron `daily-article` bierze temat z article_ideas (status='pending') i generuje DRAFT.
-- Tematy strategiczne: artykuły decyzyjne „X czy Y" + wsparcie money pages + local + DACH.
-- (sekcja 7 audytu GEO + nasze usługi). Idempotentne: nie duplikuje istniejących pytań.
--
-- 🚨 WGRAĆ NA OBU Supabase (po migracji 165). Jeśli `article_ideas` ma inne wymagane
--    kolumny niż question/status — dostosuj listę kolumn.

INSERT INTO article_ideas (question, status)
SELECT q, 'pending'
FROM (VALUES
    ('Implant czy most — co wybrać i kiedy? Różnice, trwałość i koszt całkowity'),
    ('Korona cyrkonowa czy E.max — którą koronę wybrać i do czego'),
    ('Licówki czy korony — różnice, trwałość i kiedy które'),
    ('Licówki porcelanowe czy kompozytowe — porównanie, trwałość, koszt'),
    ('Ile realnie wytrzymują licówki i od czego to zależy'),
    ('Czy warto robić licówki — wady, ryzyka i alternatywy'),
    ('Leczenie kanałowe czy ekstrakcja i implant — co się bardziej opłaca'),
    ('Czy leczenie kanałowe pod mikroskopem boli — czego się spodziewać'),
    ('Ponowne leczenie kanałowe (Re-Endo) — kiedy ma sens i jaka skuteczność'),
    ('All-on-4 czy tradycyjne pojedyncze implanty — dla kogo i dlaczego'),
    ('Jak wybrać dobrego implantologa lub endodontę — na co zwrócić uwagę'),
    ('Leczenie zębów w Polsce dla pacjenta z Niemiec — przebieg, refundacja, dokumenty'),
    ('Co wpływa na koszt implantu zęba — pełne rozbicie kosztów'),
    ('Bruksizm (zgrzytanie zębami) — jak chronić zęby i uzupełnienia protetyczne'),
    ('Periimplantitis — jak rozpoznać i leczyć stan zapalny wokół implantu')
) AS t(q)
WHERE NOT EXISTS (
    SELECT 1 FROM article_ideas ai WHERE ai.question = t.q
);
