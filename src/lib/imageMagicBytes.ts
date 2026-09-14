/**
 * Rozpoznanie typu obrazu po MAGIC BYTES — czysty moduł, zero zależności.
 *
 * Wydzielone z `lib/chatAttachments.ts` (2026-09-14), żeby trasa symulatora uśmiechu
 * mogła użyć TEGO SAMEGO detektora bez wciągania klienta Supabase do swojej lambdy.
 * `chatAttachments` re-eksportuje funkcję, więc dotychczasowe importy działają bez zmian.
 */

/**
 * Rozpoznanie typu po MAGIC BYTES, nie po deklarowanym MIME.
 * Kopia sprawdzonej implementacji z `api/contact/route.ts` — świadomie bez biblioteki
 * `file-type` (ESM-only, ryzyko `ERR_REQUIRE_ESM` w bundlu CJS Vercela).
 *
 * 🔑 Sniff idzie PRZED dekoderem, bo sharp dekoduje też SVG — plik `.svg` przepuszczony
 * do librsvg to zupełnie inna powierzchnia ataku niż dekoder JPEG.
 */
export function detectImageMime(bytes: Uint8Array): string | null {
    if (bytes.length < 12) return null;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) return 'image/png';
    // WebP: 'RIFF' .... 'WEBP'
    if (
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) return 'image/webp';
    return null;
}
