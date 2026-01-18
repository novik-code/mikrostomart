
import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

// Global instance
let faceLandmarker: FaceLandmarker | null = null;

export async function initializeFaceDetector() {
    if (faceLandmarker) return faceLandmarker;

    console.log("Activating Vision...");
    try {
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
            numFaces: 1,
            minFaceDetectionConfidence: 0.5, // Start STRICT (Frontal)
            minFacePresenceConfidence: 0.5
        });
        console.log("FaceLandmarker Ready.");
    } catch (e) {
        console.error("FATAL: Vision Init Failed", e);
        throw e;
    }

    return faceLandmarker;
}

export interface SmileAlignment {
    x: number;      // Center X (0-100%)
    y: number;      // Center Y (0-100%)
    scale: number;  // Scale Factor
    rotation: number; // Degrees
    mouthPath?: { x: number; y: number; }[]; // Standardized Poly Point
    faceBox?: { x: number; y: number; width: number; height: number; };
}

export async function analysisFaceAlignment(image: HTMLImageElement): Promise<SmileAlignment | null> {
    console.log("Running analysis on image...", image.naturalWidth, image.naturalHeight);
    try {
        let detector = await initializeFaceDetector();
        if (!detector) return null;

        // --- STEP 1: STRICT PASS (Frontal/High Quality) ---
        detector.setOptions({ minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5 });
        let result = detector.detect(image);

        // --- STEP 2: FALLBACK (Angled/Low Quality) ---
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            console.warn("No face found in STRICT mode. Retrying with SENSITIVE mode (0.15)...");
            detector.setOptions({ minFaceDetectionConfidence: 0.15, minFacePresenceConfidence: 0.15 });
            result = detector.detect(image);
        }

        console.log("Final Detection Result:", result);

        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];

            // Key Landmarks for Mouth
            const leftCorner = landmarks[61];  // Left Mouth Corner
            const rightCorner = landmarks[291]; // Right Mouth Corner

            // CORRECTED "OUTER LIPS" LOOP (Masks entire mouth + lips)
            const explicitMouthHole = [
                // Upper Lip Outer
                61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                // Lower Lip Outer
                375, 321, 405, 314, 17, 84, 181, 91, 146, 61
            ];

            const mouthPath = explicitMouthHole.map(idx => ({
                x: landmarks[idx].x,
                y: landmarks[idx].y
            }));

            // Calc Params
            const dy = rightCorner.y - leftCorner.y;
            const dx = rightCorner.x - leftCorner.x;
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = angleRad * (180 / Math.PI);

            const centerX = (leftCorner.x + rightCorner.x) / 2;
            const centerY = (leftCorner.y + rightCorner.y) / 2;
            const distance = Math.hypot(dx, dy);
            const baseScale = distance * 2.2;

            // Face Box for Debug
            const xs = landmarks.map(l => l.x);
            const ys = landmarks.map(l => l.y);

            return {
                x: centerX * 100,
                y: centerY * 100,
                scale: baseScale,
                rotation: angleDeg,
                mouthPath: mouthPath,
                faceBox: {
                    x: Math.min(...xs),
                    y: Math.min(...ys),
                    width: Math.max(...xs) - Math.min(...xs),
                    height: Math.max(...ys) - Math.min(...ys)
                }
            };
        }

        return null;
    } catch (e) {
        console.error("Analysis Failed", e);
        return null;
    }
}
