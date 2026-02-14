-- ============================================
-- Krok 2: Aktualizacja imion i nazwisk pracowników
-- ============================================
-- Uruchom w Supabase SQL Editor PO migracji 017_employees.sql
-- 
-- Zamień '<<< WPISZ IMIĘ >>>' na prawdziwe imię i nazwisko każdego pracownika.
-- Jeśli nie chcesz aktualizować danego wiersza, zakomentuj go (--).

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'dr.nowosielski@gmail.com';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'gabinet@mikrostomart.pl';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'litewka.justyna@gmail.com';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'marcin@nowosielski.pl';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'aleksandra.modelska.kepa@gmail.com';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'gosiaaem@gmail.com';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'walecko.dominika@gmail.com';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'ilonafoltys@gmail.com';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'kadamowicz11@wp.pl';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'julcia-plewa@o2.pl';

UPDATE employees SET name = '<<< WPISZ IMIĘ >>>', updated_at = NOW()
WHERE email = 'zalitewka@gmail.com';

-- ============================================
-- Weryfikacja
-- ============================================
SELECT email, name, user_id, is_active FROM employees ORDER BY name;
