-- Migracja 203: ochrona kodu TOTP przed ponownym uzyciem (RFC 6238 par. 5.2)
-- ADDITIVE. Nie usuwa i nie zmienia zadnej istniejacej kolumny. Idempotentna.
--
-- PO CO: otplib chodzi z window=1, wiec przyjmuje ten sam szesciocyfrowy kod
-- przez trzy kroki (delta -1/0/+1), czyli do ~90 s. Serwer zapisywal dotad
-- wylacznie `last_used_at` — znacznik CZASU, ktory nie odroznia kodu od kodu.
-- Kto podejrzal jeden kod pracownika i zna jego haslo, mial okolo poltorej
-- minuty na zrobienie wlasnego POST /api/auth/2fa/challenge. Dlawik 10 prob
-- na kwadrans tego nie blokuje, bo to jest JEDNA udana proba.
--
-- Ta kolumna trzyma NUMER KROKU TOTP, floor(sekundy_epoch/30), ostatnio
-- PRZYJETEGO na TYM urzadzeniu. Kod z krokiem <= zapisanego jest odrzucany.
--
-- 🔴 PER URZADZENIE, NIE PER PRACOWNIK. Konto gabinet@mikrostomart.pl obsluguje
-- kilka osob, kazda z WLASNYM authenticatorem. Licznik trzymany na `employees`
-- odrzucalby kod drugiej recepcjonistki w tym samym oknie i zamknalby recepcji
-- panel. Zmierzone na produkcji 2026-09-07: 16 urzadzen na 13 pracownikow,
-- DWIE osoby maja po kilka urzadzen (jedna 2, jedna 3).
-- Obejscia przez drugie urzadzenie to NIE otwiera: kazde urzadzenie ma wlasny
-- sekret, wiec dany kod pasuje zawsze do tego samego wiersza.

ALTER TABLE employee_2fa_devices
    ADD COLUMN IF NOT EXISTS last_totp_step BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN employee_2fa_devices.last_totp_step IS
    'Numer kroku TOTP (floor(sekundy_epoch/30)) ostatnio PRZYJETEGO kodu na tym urzadzeniu. 0 = jeszcze zadnego. Kod z krokiem <= tej wartosci jest odrzucany (RFC 6238 5.2). Zapis MUSI byc atomowy: UPDATE ... WHERE last_totp_step < :step.';

-- ZADNEGO BACKFILLU i celowo. Istniejace wiersze dostaja 0 z DEFAULT, wiec
-- pierwszy kod po wgraniu przechodzi normalnie. Wpisanie tu biezacego kroku
-- odcieloby kazdemu pracownikowi kod, ktory ma w tej chwili na ekranie telefonu.
--
-- BIGINT, nie INTEGER: krok to dzis ~5,9e7, INTEGER by wystarczyl, ale BIGINT
-- nic nie kosztuje i zdejmuje pytanie o przepelnienie z listy rzeczy do myslenia.
-- NOT NULL, zeby w kodzie nie bylo galezi na NULL — galaz na NULL to miejsce,
-- w ktorym ochrona cicho przestaje dzialac.

-- COFNIECIE:
--   Krok 1 (wystarczajacy): cofnij KOD aplikacji. Kod sprzed naprawy tej kolumny
--          nie czyta ani nie zapisuje — zostawienie jej jest calkowicie bezpieczne
--          i to jest zalecana droga wyjscia.
--   Krok 2 (tylko jesli ktos chce czystego schematu, PO cofnieciu kodu):
--          ALTER TABLE employee_2fa_devices DROP COLUMN IF EXISTS last_totp_step;
--   🔴 NIGDY odwrotnie: DROP przy zywym nowym kodzie = blad 42703 na kazdej
--   weryfikacji drugiego skladnika, czyli zamkniety panel dla calego zespolu.
