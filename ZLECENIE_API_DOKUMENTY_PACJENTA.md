# Zlecenie: Rozbudowa Prodentis API — Upload dokumentów pacjenta

## Kontekst
Wdrożyliśmy system podpisywania zgód przez pacjentów na tablecie. Pacjent podpisuje PDF palcem, podpisany plik jest zapisywany na naszym serwerze (Supabase Storage).

Potrzebujemy nowego endpointu w API Prodentis Connector, który pozwoli na **automatyczne importowanie podpisanych PDF-ów do kartoteki pacjenta w Prodentis**.

---

## Wymagany endpoint

### `POST /api/patients/:prodentisId/documents`

**Nagłówki:** `X-API-Key` (wymagany), `Content-Type: application/json`

**Body:**
```json
{
    "fileBase64": "JVBERi0xLjQgMSAwIG...",
    "fileName": "Zgoda_higienizacja_Jan_Kowalski_2026-02-27.pdf",
    "category": "consent",
    "description": "Zgoda na higienizację — Jan Kowalski — 2026-02-27"
}
```

**Odpowiedź:**
```json
{
    "success": true,
    "documentId": "0000000123"
}
```

---

## Co trzeba zbadać w bazie Prodentis (Firebird)

1. **Gdzie Prodentis przechowuje dokumenty pacjenta?**
   - Prawdopodobnie tabela `PATIENT_DOCUMENTS` lub `ATTACHMENTS`
   - Mogą być jako BLOB lub ścieżki do plików na dysku

2. **Jakie pola są wymagane?** ID pacjenta, nazwa pliku, kategoria, data, treść (BLOB/ścieżka)

3. **Gdzie w Prodentis desktop widać dokumenty?** Kartoteka pacjenta → zakładka z plikami/dokumentami

---

## Kontekst techniczny

Serwer: `http://localhost:3000` (usługa Windows `prodentisconnector.exe`)
Plik: `C:\Users\Administrator\.gemini\antigravity\playground\frozen-voyager\connector\server.js`
Baza: Firebird (`node-firebird`)

---

## Opcjonalny dodatkowy endpoint

### `GET /api/patients/:prodentisId/documents`
Lista dokumentów pacjenta (nazwy, daty, kategorie) — do wyświetlenia w panelu.

## Priorytet
Średni — system działa bez tego (pliki na naszym serwerze). Import do Prodentis = wygoda.
