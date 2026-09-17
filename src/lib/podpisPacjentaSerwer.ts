/**
 * Serwerowa ocena podpisu pacjenta — czy obraz w ogóle NIESIE podpis.
 *
 * 🔴 PO CO. Sama kontrola formatu (`czyObrazPodpisuPng`) przepuszczała PUSTY obraz płótna.
 * Stara strona e-Karty (sprzed 17.09) zapisywała obraz przy każdym `touchend`/`mouseleave`,
 * także bez kreski — na produkcji 13 e-Kart ma taki pusty obraz. Strona zbuforowana na tablecie
 * albo link otwarty przed wdrożeniem (ważny do 72 h) wysłałby go dalej (wyłapane przeglądem 17.09).
 *
 * ⚪ To NIE jest ocena „za krótkiego" podpisu (decyzja właściciela: bez niej) — tylko rozpoznanie
 * braku: czy jakikolwiek piksel ma krycie.
 *
 * 🪤 FAIL-OPEN WYŁĄCZNIE NA AWARII NARZĘDZIA. Jeśli `sharp` nie da się załadować, e-Karta przechodzi
 * z głośnym logiem — awaria biblioteki nie może zamknąć rejestracji wszystkim pacjentom.
 * Zepsute bajty od klienta to co innego: to brak podpisu, 400, token nietknięty.
 */

import { detectImageMime } from '@/lib/imageMagicBytes';
import { czyObrazPodpisuPng } from '@/lib/podpisPacjenta';

type SharpFn = typeof import('sharp').default;
let sharpModul: SharpFn | null = null;

/** Płótno e-Karty to szerokość ekranu × dpr na 160 px × dpr — 16 Mpx to zapas z nawiązką. */
export const MAKS_PIKSELI_PODPISU = 4096 * 4096;

export type OcenaPodpisuSerwer = 'jest' | 'brak' | 'pusty' | 'nieocenione';

export async function ocenPodpisSerwerowo(wartosc: unknown): Promise<OcenaPodpisuSerwer> {
    if (!czyObrazPodpisuPng(wartosc)) return 'brak';
    const bajty = Buffer.from(wartosc.slice(wartosc.indexOf(',') + 1), 'base64');
    if (detectImageMime(bajty) !== 'image/png') return 'brak';

    let sharp: SharpFn;
    try {
        if (!sharpModul) sharpModul = (await import('sharp')).default;
        sharp = sharpModul;
    } catch (e) {
        console.error('[PodpisPacjenta] sharp niedostępny — podpis NIEOCENIONY, przepuszczam:', e);
        return 'nieocenione';
    }

    try {
        const { data, info } = await sharp(bajty, { limitInputPixels: MAKS_PIKSELI_PODPISU })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const kanaly = info.channels;
        for (let i = kanaly - 1; i < data.length; i += kanaly) {
            if (data[i] > 0) return 'jest';
        }
        return 'pusty';
    } catch {
        return 'brak';
    }
}
