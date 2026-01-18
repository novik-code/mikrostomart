
import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export async function initializeFaceDetector() {
    if (faceLandmarker) return faceLandmarker;

    console.log("Activating Vision...");
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        console.log("Vision Loaded. Loading Graph...");

        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: false,
            runningMode: "IMAGE",
            numFaces: 1,
            minFaceDetectionConfidence: 0.5, // Standard confidence to avoid false positives (nose as mouth)
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
        const detector = await initializeFaceDetector();
        if (!detector) return null;

        const result: FaceLandmarkerResult = detector.detect(image);
        console.log("Detection Result:", result);

        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];

            // Key Landmarks for Mouth
            const leftCorner = landmarks[61];  // Left Mouth Corner
            const rightCorner = landmarks[291]; // Right Mouth Corner
            // const upperLipTop = landmarks[0];   // Upper Lip Center (Top)
            // const lowerLipBottom = landmarks[17]; // Lower Lip Center (Bottom)

            // 4. Extract Lip Contour for Auto-Masking
            // Landmark indices for lips (outer & inner can be combined or just use inner for teeth)
            // We want to mask the TEETH, so we ideally want the "Inner Lips" contour.
            // Inner Lips Indices (approximate order for polygon):
            // 78, 191, 80, 81, 82, 13, 312, 311, 317, 14, 87, 178, 88, 95 (upper inner)
            // 78, 95, 88, 178, 87, 14, 317, 311, 312, 13, 82, 81, 80, 191 (lower inner - wait, these overlap)

            // Simpler approach: MediaPipe Face Mesh "Lips" connections.
            // Let's grab a refined set of points for the "Mouth Hole".
            // Connection order matters for drawing a polygon.

            // Upper Lip Inner Loop: 78, 191, 80, 81, 82, 13, 312, 311, 317, 14, 324, 318, 402, 317 (check ref)
            // Actually, let's just grab the points and let the UI sort/flatten them or use a known loop.
            // Reference: https://storage.googleapis.com/mediapipe-assets/documentation/media/face_landmarker_keypoints.png

            // Start Left Corner (78) -> Upper Inner Path -> Right Corner (308) -> Lower Inner Path -> Close at 78.
            const innerLipsIndices = [
                78, 191, 80, 81, 82, 13, 312, 311, 317, 14, 324, 318, 402, 308, // Upper Inner
                415, 310, 311, 312, 13, 82, 81, 80, 191, 78 // Lower Inner (reversed? No, this list is tricky)
            ];

            // Better Set for "Open Mouth" hole (Teeth Canvas):
            // We trace the INNER boundary of the lips.
            // Loop: 
            // 78 (Left Corner)
            // 191, 80, 81, 82, 13, 312, 311, 317, 14, 324, 318, 402, 308 (Right Corner)
            // 324, 318, 402, 308 (Right) -> Down to Lower Inner
            // 291 is usually corner? No 308/291.
            // Let's use a standard list for "Lips Inner".
            const lipsInnerUpper = [78, 191, 80, 81, 82, 13, 312, 311, 317, 14, 324, 318, 402, 308];
            const lipsInnerLower = [308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78]; // Check indices validity

            // Actually, simpler manual verified loop for Inner Mouth:
            // 78, 191, 80, 81, 82, 13, 312, 311, 317, 14, 324, 318, 402, 308, 
            // 324, 318, 402, 308 -> 415, 310, 311, 312, 13, 82, 81, 80, 191, 78 
            // Wait, repeat indices? 

            // Let's try this ordered loop for "Mouth Hole":
            // CORRECTED "OUTER LIPS" LOOP (Most Robust)
            // We mask the entire mouth area (including lips) for stability.

            // CORRECTED "OUTER LIPS" LOOP (Most Robust)
            // Instead of trying to find the inner hole (which fails if mouth is closed),
            // we mask the entire mouth area (including lips).
            // This allows the AI to reconstruct both teeth and lip shape/smile width.

            const explicitMouthHole = [
                // Upper Lip Outer (Left to Right)
                61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                // Lower Lip Outer (Right to Left)
                375, 321, 405, 314, 17, 84, 181, 91, 146, 61
            ];
            // Note: 78 and 308 are corners. 
            // 13 is Upper Lip Center (Inner). 
            // 14 is Lower Lip Center (Inner).

            const mouthPath = explicitMouthHole.map(idx => ({
                x: landmarks[idx].x,
                y: landmarks[idx].y
            }));

            // Calculate Base Scale & Rotation as before
            const dy = rightCorner.y - leftCorner.y;
            const dx = rightCorner.x - leftCorner.x;
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = angleRad * (180 / Math.PI);

            const centerX = (leftCorner.x + rightCorner.x) / 2;
            const centerY = (leftCorner.y + rightCorner.y) / 2;
            const distance = Math.hypot(dx, dy);
            const baseScale = distance * 2.2;

            // Calculate Face Bounding Box for Debug
            const xs = landmarks.map(l => l.x);
            const ys = landmarks.map(l => l.y);
            const box = {
                x: Math.min(...xs),
                y: Math.min(...ys),
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys)
            };

            return {
                x: centerX * 100,
                y: centerY * 100,
                scale: baseScale,
                rotation: angleDeg,
                mouthPath: mouthPath, // Array of {x, y} (0.0-1.0)
                faceBox: box // 0.0-1.0
            };
        }

        return null;
    } catch (e) {
        console.error("Analysis Failed", e);
        return null;
    }
}
