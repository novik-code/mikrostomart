
import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export async function initializeFaceDetector() {
    if (faceLandmarker) return faceLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "IMAGE",
        numFaces: 1
    });

    return faceLandmarker;
}

export interface SmileAlignment {
    x: number;      // Center X (0-100%)
    y: number;      // Center Y (0-100%)
    scale: number;  // Scale Factor
    rotation: number; // Degrees
}

export async function analysisFaceAlignment(image: HTMLImageElement): Promise<SmileAlignment | null> {
    const detector = await initializeFaceDetector();
    if (!detector) return null;

    const result: FaceLandmarkerResult = detector.detect(image);

    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

        // Key Landmarks for Mouth
        const leftCorner = landmarks[61];  // Left Mouth Corner
        const rightCorner = landmarks[291]; // Right Mouth Corner
        // const upperLipTop = landmarks[0];   // Upper Lip Center (Top)
        // const lowerLipBottom = landmarks[17]; // Lower Lip Center (Bottom)

        // 1. Calculate Rotation (Angle between corners)
        // Note: Y increases downwards in Canvas/Screen coords.
        const dy = rightCorner.y - leftCorner.y;
        const dx = rightCorner.x - leftCorner.x;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);

        // 2. Calculate Center (Midpoint of corners)
        // Average the X and Y
        const centerX = (leftCorner.x + rightCorner.x) / 2;
        const centerY = (leftCorner.y + rightCorner.y) / 2;

        // 3. Calculate Scale (Width of mouth relative to image width)
        // Distance between corners
        const distance = Math.hypot(dx, dy);
        // We need to map "Mouth Width" to "Template Width".
        // The template is ~1024px. The canvas is 1024px.
        // If mouth covers 50% of image, scale should be ~0.5?
        // Actually, the dental template is a full arch.
        // A typical mouth width (corner to corner) is smaller than the full dental arch width (incisors+molars).
        // Heuristic: Dental Arch Width ≈ 1.8 * Mouth Width (visible smile).
        // Let's start with a multiplier.
        const baseScale = distance * 2.2;

        return {
            x: centerX * 100, // Convert to %
            y: centerY * 100, // Convert to %
            scale: baseScale,
            rotation: angleDeg
        };
    }

    return null;
}
