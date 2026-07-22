import { describe, it, expect } from 'vitest';
import { parseIsoDuration, SHORT_MAX_SECONDS } from '@/lib/youtubeCatalog';

describe('parseIsoDuration', () => {
    it('parses seconds-only Short durations', () => {
        expect(parseIsoDuration('PT13S')).toBe(13);
        expect(parseIsoDuration('PT54S')).toBe(54);
    });

    it('parses minutes + seconds', () => {
        expect(parseIsoDuration('PT1M5S')).toBe(65);
        expect(parseIsoDuration('PT10M')).toBe(600);
    });

    it('parses hours + minutes + seconds', () => {
        expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    });

    it('returns 0 for missing / malformed input', () => {
        expect(parseIsoDuration(null)).toBe(0);
        expect(parseIsoDuration(undefined)).toBe(0);
        expect(parseIsoDuration('')).toBe(0);
        expect(parseIsoDuration('garbage')).toBe(0);
        expect(parseIsoDuration('P1D')).toBe(0); // days not handled (channel has none)
    });

    it('classifies against the Short threshold consistently', () => {
        // Channel's real Shorts (13–54 s) fall under the threshold; a 65 s clip does not.
        expect(parseIsoDuration('PT54S') <= SHORT_MAX_SECONDS).toBe(true);
        expect(parseIsoDuration('PT1M5S') <= SHORT_MAX_SECONDS).toBe(false);
    });
});
