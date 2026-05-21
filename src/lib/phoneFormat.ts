/**
 * Phone format helpers — L-3 (2026-05-21 NIGHT+1).
 *
 * Single source of truth dla wszystkich konwersji phone string → E.164 (`+48...`).
 * Eliminuje 5 wykrytych bugów + 7 inline `.replace()` duplikacji.
 *
 * Brand config `brand.phone1` używa display format `570-270-470` (z myślnikami)
 * — ten format zostaje dla visible UI (Footer, Kontakt). Helpery wyjmują E.164
 * dla schema.org `telephone` field, `tel:` links, i `<meta>` tags.
 *
 * Audit pre-L-3 wykrył:
 * - 22+ inline `.replace(/-/g, '')` rozproszone w src/
 * - 2 błędne pattern `.replace(/\s/g, '')` (nie ściąga myślników!) w mapa-bolu + MobileBottomBar
 * - 3 hardcoded `+48570270470` w privacy-policy ×2 + wizyta (single-source-of-truth złamany)
 * - 1 missing `+48` prefix w strefa-pacjenta/dashboard (`tel:570270470` — mobile dial z zagranicy fail)
 */

/**
 * Strips all non-digit chars from phone string.
 * `'570-270-470'` → `'570270470'`
 * `'+48 570 270 470'` → `'48570270470'`
 * `'+48-570-270-470'` → `'48570270470'`
 */
function stripFormatting(phone: string): string {
    return (phone || '').replace(/\D/g, '');
}

/**
 * Format phone for E.164 international standard (`+48570270470`).
 * Auto-prepends Poland country code `48` if missing.
 * Used in: schema.org `telephone`, `tel:` links, `<meta name="phone">`.
 *
 * @param phone - Phone string in any format (`570-270-470`, `570 270 470`, `+48570270470`)
 * @returns E.164 formatted phone: `+48570270470`
 */
export function formatPhoneForSchema(phone: string): string {
    const digits = stripFormatting(phone);
    if (!digits) return '';
    // Auto-add Poland country code if missing (9 digits = local mobile/landline)
    const withCountry = digits.length === 9 ? `48${digits}` : digits;
    return `+${withCountry}`;
}

/**
 * Format phone for `tel:` link href. Same as schema format (`+48570270470`).
 * Alias for semantic clarity at call sites.
 */
export function formatPhoneForTel(phone: string): string {
    return formatPhoneForSchema(phone);
}

/**
 * Format phone for visible display. Currently passes through brand format
 * (myślniki: `570-270-470`). Helper exists for future flexibility — jeśli
 * w przyszłości chcemy zmienić wszędzie na spacje `570 270 470`, jedyna zmiana
 * tutaj propaguje na całą aplikację.
 */
export function formatPhoneDisplay(phone: string): string {
    return phone || '';
}
