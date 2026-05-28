-- Faza M Wave 3 fix (2026-05-28): napraw broken cross-link w migracji 149
--
-- Audit cross-linków Wave 1+2 wykrył że artykuł 149 (Endodoncja PILLAR)
-- linkuje do nieistniejącego slug `/baza-wiedzy/laserowa-resekcja-mikrochirurgia-endodontyczna`.
-- Faktyczny artykuł mikrochirurgii (migracja 152) ma slug
-- `mikrochirurgia-endodontyczna-laserowa-case-study-zab-22`.
--
-- Precyzyjny string REPLACE (nie całe body replace) — bezpieczny, idempotent
-- (re-run nie zmienia nic jeśli stary slug już zastąpiony).

UPDATE articles
SET content = REPLACE(
    content,
    '/baza-wiedzy/laserowa-resekcja-mikrochirurgia-endodontyczna',
    '/baza-wiedzy/mikrochirurgia-endodontyczna-laserowa-case-study-zab-22'
)
WHERE slug = 'endodoncja-mikroskopowa-laserowo-wspomagana-opole'
  AND locale = 'pl'
  AND content LIKE '%/baza-wiedzy/laserowa-resekcja-mikrochirurgia-endodontyczna%';
