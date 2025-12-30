# Mikrostomart - Aplikacja WWW

To jest repozytorium kodu źródłowego dla nowoczesnej strony internetowej gabinetu stomatologicznego **Mikrostomart**. Aplikacja jest zbudowana w technologii **Next.js** (React) i posiada cechy PWA (działa jak aplikacja mobilna).

## 🚀 Jak uruchomić projekt?

1.  Otwórz terminal w tym folderze.
2.  Zainstaluj zależności (jeśli jeszcze tego nie zrobiłeś):
    ```bash
    npm install
    ```
3.  Uruchom serwer deweloperski:
    ```bash
    npm run dev
    ```
4.  Otwórz przeglądarkę pod adresem: [http://localhost:3000](http://localhost:3000)

## 📂 Gdzie szukać kluczowych rzeczy?

Oto mapa najważniejszych plików w projekcie:

| Co chcesz zmienić? | Gdzie to jest? | Opis |
|Data | Ścieżka pliku | Szczegóły |
|--- | --- | --- |
| **Kolory i Czcionki** | `src/app/globals.css` | Tutaj zmienisz złoty kolor (`--color-primary`) czy tło. |
| **Strona Główna** | `src/app/page.tsx` | Teksty, sekcje "Precyzja/Estetyka" i układ strony głównej. |
| **Sekcja YouTube** | `src/components/YouTubeFeed.tsx` | Konfiguracja slidera wideo. |
| **Klucze API** | `.env.local` | Tu wpisujesz klucz YouTube i ID kanału (plik ukryty/systemowy). |
| **Dane Kontaktowe** | `src/app/kontakt/page.tsx` | Adres, telefon, mapa Google. |
| **Cennik / Oferta** | `src/app/oferta/page.tsx` | Lista zabiegów i ceny. |
| **Sklep** | `src/app/sklep/page.tsx` | Lista produktów. |

## 🔑 Integracja z YouTube

Aplikacja automatycznie pobiera filmy z Twojego kanału.
Konfiguracja znajduje się w pliku `.env.local`. Jeśli filmy przestaną się pobierać, sprawdź czy klucz API jest ważny.

## ✅ Status Prac (30.12.2025)

- [x] **Design Modern Luxury**: Ciemny motyw, złote akcenty, animacje wejścia.
- [x] **Wideo w tle**: Kinowe intro działające na wszystkich podstronach.
- [x] **YouTube API**: Automatyczne pobieranie najnowszych filmów.
- [x] **Mapa Google**: Zintegrowana mapa na stronie kontaktu.
- [x] **Sklep i Koszyk**: Działający frontend zakupowy.

## 🔜 Co zostało do zrobienia (Następne kroki)?

1.  **Zdjęcia**: Podmienić tymczasowe prostokąty (placeholdery) na prawdziwe zdjęcia gabinetu i zespołu.
2.  **Backend Formularzy**: Podpiąć wysyłanie e-maili z formularza kontaktowego i rezerwacji.
3.  **Realne Płatności**: Jeśli sklep ma zarabiać, trzeba podpiąć bramkę (np. Stripe/Przelewy24).

---
*Dokumentacja wygenerowana przez Antigravity (Google DeepMind).*
