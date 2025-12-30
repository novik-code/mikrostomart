# Notatki z Sesji Projektowej - 30.12.2025

Ten plik zawiera podsumowanie naszych rozmów i decyzji podjętych podczas dzisiejszej pracy nad stroną Mikrostomart.

## 📝 Kluczowe Decyzje i Ustalenia

### 1. Styl "Modern Luxury"
- **Decyzja**: Zmiana pierwotnie planowanego beżu na nasycone złoto.
- **Powód**: Beż był zbyt "kremowy", złoto (`#dcb14a`) lepiej pasuje do charakteru marki i logo.
- **Efekt**: Ciemne tło + Złote akcenty + Biała typografia.

### 2. Wideo w tle
- **Decyzja**: Wideo "Cinematic Dentistry" ma być widoczne na każdej podstronie, nie tylko na głównej.
- **Rozwiązanie**: Przeniesienie komponentu do `layout.tsx` i ustawienie go jako `fixed` (nieruchome tło).

### 3. YouTube - Zmiana podejścia
- **Początek**: Chciałeś, aby filmy zmieniały się losowo i miały strzałki.
- **Problem**: Brak łatwego dostępu do ID filmów.
- **Rozwiązanie**: Wdrożenie pełnego API YouTube.
- **Status**: Dostarczyłeś klucz API i ID kanału w trakcie rozmowy. System działa teraz w pełni automatycznie.

### 4. Mapa
- **Decyzja**: Zastąpienie placeholdera mapą Google.
- **Adres**: ul. Centralna 33a, Opole.

## 💾 Gdzie są zapisane dane z rozmowy?

- **Klucze API** (które podałeś w czacie): Zostały bezpiecznie zapisane w ukrytym pliku `.env.local` na Twoim dysku. Nie zginą.
- **Kod źródłowy**: Wszystkie zmiany są w folderze `src`.
- **Zadania**: Historia "co zrobiliśmy" jest w pliku `walkthrough.md`.

## ⏭️ Punkt powrotu (Co robić po powrocie?)

Gdy wrócisz do tematu, wystarczy że spojrzysz na plik **README.md**. Tam jest instrukcja "Wznawianie pracy".
Twoja dzisiejsza praca jest zabezpieczona.
