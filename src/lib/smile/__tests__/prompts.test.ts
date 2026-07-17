/**
 * Guards the R&D-validated prompts for the smile simulator v2.
 * The NATURAL primary prompt must stay byte-identical to the validated string.
 */

import { describe, it, expect } from 'vitest';
import { KONTEXT_PROMPTS, SMILE_PROMPTS, SMILE_STYLES } from '@/lib/smile/prompts';

// Exact string validated in R&D against google/nano-banana-2 — do not reflow.
const VALIDATED_NATURAL_PROMPT =
    "Edit this photo: improve ONLY the teeth. If any teeth are missing or broken, realistically restore them — the result must show a COMPLETE set of natural upper teeth with no gaps, matched in shade and shape to the remaining teeth. Make the teeth well-aligned, healthy and clean with a natural bright shade like VITA B1 (natural white, NOT bleached or paper-white). Keep natural realism: a subtle cervical-to-incisal gradient (very slightly warmer near the gum line, brighter toward the edges), slight incisal translucency at the biting edges, small natural variation between neighboring teeth, visible incisal embrasures between front teeth. Respect this person's natural tooth proportions and smile: the upper incisal edges should follow the curve of the lower lip, keep the natural dark space at the corners of the smile (buccal corridor), do not add or widen teeth toward the mouth corners. Do NOT change anything else in the photo: exact same face, identity, skin, lip shape, gums and gum line, facial hair, hair, eyes, expression, head pose, clothing, background, framing, lighting and white balance. The teeth must match the photo's original lighting and look like real enamel with subtle texture, not porcelain veneers. Photorealistic.";

describe('smile prompts', () => {
    it('keeps the validated NATURAL primary prompt byte-identical', () => {
        expect(SMILE_PROMPTS.natural).toBe(VALIDATED_NATURAL_PROMPT);
    });

    it('BRIGHTER is the whitening variant, never chalky white', () => {
        expect(SMILE_PROMPTS.brighter).toContain('one to two shades brighter than natural');
        expect(SMILE_PROMPTS.brighter).toContain('professional whitening');
        expect(SMILE_PROMPTS.brighter).toContain('never chalky paper-white');
        expect(SMILE_PROMPTS.brighter).not.toContain('VITA B1');
    });

    it('HOLLYWOOD keeps the do-not-change guard and photorealism', () => {
        expect(SMILE_PROMPTS.hollywood).toContain('Hollywood smile');
        expect(SMILE_PROMPTS.hollywood).toContain('Do NOT change anything else in the photo');
        expect(SMILE_PROMPTS.hollywood).toContain("match the photo's original lighting");
        expect(SMILE_PROMPTS.hollywood).toContain('Photorealistic.');
    });

    it('every style has a primary and a shorter kontext (crop) prompt', () => {
        for (const style of SMILE_STYLES) {
            expect(SMILE_PROMPTS[style]).toBeTruthy();
            expect(KONTEXT_PROMPTS[style]).toBeTruthy();
            expect(KONTEXT_PROMPTS[style].length).toBeLessThan(SMILE_PROMPTS[style].length);
            expect(KONTEXT_PROMPTS[style]).toContain('close-up');
        }
    });
});
