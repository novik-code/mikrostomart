-- =============================================================================
-- 120: employee duplicate cleanup + employment_terms auto-create trigger
-- =============================================================================
-- Cel:
--   1. Usunąć osierocone duplikaty employees (utworzone przez auto-discovery
--      z /api/employee/schedule lub /api/admin/employees, później dezaktywowane
--      podczas scalania). Identyfikujemy je przez:
--         user_id IS NULL
--         + email LIKE 'prodentis-%@auto.mikrostomart.pl'
--         + is_active = false
--         + istnieje aktywny duplikat z tym samym prodentis_id
--   2. Trigger AFTER INSERT ON employees → auto-create domyślny employment_terms
--      (Lekarz = b2b, reszta = uop; 40h/tydz; 26 dni urlopu; 30 min buffer)
--   3. Backfill employment_terms dla aktywnych pracowników którzy ich nie mają
--      (analog seedu z migracji 115 ale dla osób dodanych po 8 maja)
--
-- WAŻNE: dezaktywowane konta CELOWO (np. Marcin (II), Ewelina Petyniak, Julka
-- Plewa, Kuba Podlowski — byli pracownicy) NIE zostaną usunięte, bo nie pasują
-- do warunków cleanup (mają inne emaile / user_id != NULL / nie mają aktywnego
-- duplikatu o tym samym prodentis_id).
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Cleanup orphaned auto-discovery duplicates
-- ─────────────────────────────────────────────────────────────────────────────
WITH orphans AS (
    SELECT e.id, e.name, e.prodentis_id
    FROM employees e
    WHERE e.user_id IS NULL
      AND e.email LIKE 'prodentis-%@auto.mikrostomart.pl'
      AND e.is_active = false
      AND e.prodentis_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM employees active
        WHERE active.prodentis_id = e.prodentis_id
          AND active.is_active = true
          AND active.id != e.id
      )
)
DELETE FROM employees e
USING orphans o
WHERE e.id = o.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger function: auto-create default employment_terms on new employees
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_default_employment_terms()
RETURNS TRIGGER AS $$
BEGIN
    -- Idempotent: skip jeśli pracownik ma już aktywny employment_terms
    IF EXISTS (
        SELECT 1 FROM employment_terms
        WHERE employee_id = NEW.id AND valid_to IS NULL
    ) THEN
        RETURN NEW;
    END IF;

    -- Skip dla nieaktywnych — nie ma sensu seedować dla wyłączonych
    IF NEW.is_active = false THEN
        RETURN NEW;
    END IF;

    INSERT INTO employment_terms (
        employee_id,
        contract_type,
        weekly_hours,
        daily_hours,
        vacation_days_per_year,
        cleanup_buffer_minutes,
        valid_from
    ) VALUES (
        NEW.id,
        CASE WHEN NEW.position = 'Lekarz' THEN 'b2b' ELSE 'uop' END,
        40,
        8,
        26,
        30,
        CURRENT_DATE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS employees_after_insert_create_terms ON employees;
CREATE TRIGGER employees_after_insert_create_terms
    AFTER INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION create_default_employment_terms();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill: employment_terms dla aktywnych pracowników bez aktywnych terms
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO employment_terms (
    employee_id,
    contract_type,
    weekly_hours,
    daily_hours,
    vacation_days_per_year,
    cleanup_buffer_minutes,
    valid_from
)
SELECT
    e.id,
    CASE WHEN e.position = 'Lekarz' THEN 'b2b' ELSE 'uop' END,
    40,
    8,
    26,
    30,
    CURRENT_DATE
FROM employees e
WHERE e.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM employment_terms et
    WHERE et.employee_id = e.id AND et.valid_to IS NULL
  );

COMMIT;
