# ⛔ TEN KATALOG JEST MARTWY — NIE URUCHAMIAĆ NICZEGO STĄD

Migracje tego projektu żyją w **`supabase_migrations/`** (katalog w korzeniu repo, bez ukośnika)
i wgrywa się je **ręcznie przez SQL Editor** w konsoli Supabase. Numeracja jest ciągła
(`191_`, `192_`, …), a każdy plik niesie własny protokół: warunki wstępne, stan przed, stan po
i weryfikację poza SQL-em.

Ten katalog (`supabase/migrations/`) to pozostałość po nieużywanym Supabase CLI — **nie ma tu
nawet `config.toml`**, więc `supabase db push` nie miałby czego zrobić. Pięć plików z lutego
i marca 2026 nigdy nie weszło tą drogą; odpowiadające im zmiany trafiły na produkcję inaczej.

## 🔴 Dlaczego to nie jest tylko bałagan

**Dwa pliki zawierają OTWARTE polityki RLS** — dostęp dla każdego zalogowanego konta Supabase:

| Plik | Co w nim jest |
|---|---|
| `20260214_employee_tasks.sql` | `CREATE POLICY … TO authenticated USING (true)` na `employee_tasks` |
| `20260330_create_clinic_settings.sql` | ten sam wzorzec |

Na produkcji **te polityki NIE OBOWIĄZUJĄ** — zmierzone 2026-08-12 sesją zwykłego pracownika
z kluczem publicznym: `employee_tasks` widziane jako **0 wierszy z 299**, `insert` → `42501`.
Właściwe polityki wgrała migracja 132.

Groźba jest inna: ktoś kiedyś otworzy ten katalog, uzna pliki za „brakujące migracje"
i je zastosuje. Wtedy każde konto z rejestracji Supabase czyta zadania z nazwiskami pacjentów.
Rejestracja jest dziś wyłączona (`disable_signup: true`), ale to druga linia obrony, nie pierwsza.

## Co robić

- **Nie stosować** niczego z tego katalogu.
- Nowa migracja → `supabase_migrations/<kolejny_numer>_<opis>.sql` + kopia
  w `~/Desktop/migracje_supabase/`.
- Każda polityka RLS ma mieć klauzulę **`TO service_role`** — patrz
  `reference_supabase_rls_service_role` w pamięci AI. Brak `TO` znaczy `roles = {public}`,
  czyli dostęp przez klucz publiczny.

Katalog zostaje (a nie jest kasowany) tylko dlatego, że pliki dokumentują pierwotny kształt
tabel z lutego i marca. Jeśli ta wartość kiedyś przestanie być potrzebna — skasować w całości.
