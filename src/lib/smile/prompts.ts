/**
 * Prompt definitions for the smile simulator v2 (POST /api/smile).
 *
 * The NATURAL primary prompt was validated in R&D against `google/nano-banana-2`
 * and must stay byte-identical — prompts.test.ts guards the exact string.
 * BRIGHTER and HOLLYWOOD are controlled variants built from the same blocks.
 *
 * KONTEXT_PROMPTS are shorter, instruction-style prompts for the fallback model
 * (`black-forest-labs/flux-kontext-pro`), which receives only a mouth-region crop
 * (full-frame editing with Kontext drifts facial identity — validated in R&D).
 */

export type SmileStyle = 'natural' | 'brighter' | 'hollywood';

export const SMILE_STYLES: readonly SmileStyle[] = ['natural', 'brighter', 'hollywood'];

// --- Shared blocks for the primary model (google/nano-banana-2) ---

const EDIT_INTRO = 'Edit this photo: improve ONLY the teeth.';

// Validated in R&D round 3 (missing-incisors selfie): makes gap restoration
// deterministic on partial edentulism without hurting complete-smile cases.
const RESTORE_BLOCK =
    'If any teeth are missing or broken, realistically restore them — the result must show a COMPLETE set of natural upper teeth with no gaps, matched in shade and shape to the remaining teeth.';

const SHADE_NATURAL =
    'Make the teeth well-aligned, healthy and clean with a natural bright shade like VITA B1 (natural white, NOT bleached or paper-white).';

const SHADE_BRIGHTER =
    'Make the teeth well-aligned, healthy and clean, one to two shades brighter than natural (like after professional whitening), still realistic enamel, never chalky paper-white.';

const SHADE_HOLLYWOOD =
    'Make the teeth a bright white, perfectly aligned Hollywood smile.';

const REALISM_BLOCK =
    'Keep natural realism: a subtle cervical-to-incisal gradient (very slightly warmer near the gum line, brighter toward the edges), slight incisal translucency at the biting edges, small natural variation between neighboring teeth, visible incisal embrasures between front teeth.';

const PROPORTIONS_BLOCK =
    "Respect this person's natural tooth proportions and smile: the upper incisal edges should follow the curve of the lower lip, keep the natural dark space at the corners of the smile (buccal corridor), do not add or widen teeth toward the mouth corners.";

const DO_NOT_CHANGE_BLOCK =
    'Do NOT change anything else in the photo: exact same face, identity, skin, lip shape, gums and gum line, facial hair, hair, eyes, expression, head pose, clothing, background, framing, lighting and white balance.';

const LIGHTING_BLOCK =
    "The teeth must match the photo's original lighting and look like real enamel with subtle texture, not porcelain veneers. Photorealistic.";

const LIGHTING_BLOCK_HOLLYWOOD =
    "The teeth must match the photo's original lighting and look like a real, photorealistic dental result in this exact scene. Photorealistic.";

/**
 * Primary prompts (full-frame instruction editing, google/nano-banana-2).
 */
export const SMILE_PROMPTS: Record<SmileStyle, string> = {
    natural: [EDIT_INTRO, RESTORE_BLOCK, SHADE_NATURAL, REALISM_BLOCK, PROPORTIONS_BLOCK, DO_NOT_CHANGE_BLOCK, LIGHTING_BLOCK].join(' '),
    brighter: [EDIT_INTRO, RESTORE_BLOCK, SHADE_BRIGHTER, REALISM_BLOCK, PROPORTIONS_BLOCK, DO_NOT_CHANGE_BLOCK, LIGHTING_BLOCK].join(' '),
    hollywood: [EDIT_INTRO, RESTORE_BLOCK, SHADE_HOLLYWOOD, DO_NOT_CHANGE_BLOCK, LIGHTING_BLOCK_HOLLYWOOD].join(' '),
};

/**
 * Fallback prompts for flux-kontext-pro — the model sees only a close-up crop
 * of the mouth region, so the prompt is shorter and crop-oriented.
 */
const KONTEXT_SUFFIX =
    'Do not change the lips, skin, facial hair, gums, lighting, framing or anything else. Photorealistic.';

export const KONTEXT_PROMPTS: Record<SmileStyle, string> = {
    natural: `Improve only the teeth in this close-up photo: make them well-aligned, healthy and clean with a natural bright shade like VITA B1 (natural white, NOT bleached or paper-white), with subtle enamel texture and slight incisal translucency. ${KONTEXT_SUFFIX}`,
    brighter: `Improve only the teeth in this close-up photo: make them well-aligned, healthy and clean, one to two shades brighter than natural (like after professional whitening), still realistic enamel, never chalky paper-white. ${KONTEXT_SUFFIX}`,
    hollywood: `Improve only the teeth in this close-up photo: make them a bright white, perfectly aligned Hollywood smile. ${KONTEXT_SUFFIX}`,
};
