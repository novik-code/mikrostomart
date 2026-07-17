"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Calendar, Camera, Check, Download, Flag, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { isDemoMode } from "@/lib/demoMode";
import { demoSanitize } from "@/lib/brandConfig";

/**
 * Shared smile-simulator flow (v2, synchronous /api/smile backend).
 * Rendered by both SimulatorModal (global overlay) and the /symulator page,
 * so the two entry points can never drift apart again.
 *
 * Flow: instruction → consent (first visit only) → capture (camera/upload)
 *       → style selection → synchronous generation → before/after result.
 */

const CONSENT_STORAGE_KEY = "smileSimulatorConsentV1";
const CONTACT_EMAIL = "gabinet@mikrostomart.pl";
const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;
const REQUEST_TIMEOUT_MS = 120_000;
const STATUS_ROTATION_MS = 6_000;

const VIDEO_CONSTRAINTS = {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
};

type SmileStyle = "natural" | "brighter" | "hollywood";
type FlowStep = "instruction" | "consent" | "capture" | "camera" | "style" | "generating" | "result";

const STYLE_OPTIONS: { id: SmileStyle; labelKey: string; descKey: string }[] = [
    { id: "natural", labelKey: "styleNatural", descKey: "styleNaturalDesc" },
    { id: "brighter", labelKey: "styleBrighter", descKey: "styleBrighterDesc" },
    { id: "hollywood", labelKey: "styleHollywood", descKey: "styleHollywoodDesc" },
];

const LOADING_STATUS_KEYS = ["loadingStatus1", "loadingStatus2", "loadingStatus3", "loadingStatus4"];

/** API reject reason → i18n key with a concrete, actionable hint. */
const REASON_TO_ERROR_KEY: Record<string, string> = {
    no_face: "errorNoFace",
    multiple_faces: "errorMultipleFaces",
    closed_mouth: "errorClosedMouth",
    blurry: "errorBlurry",
    bad_pose: "errorBadPose",
    mouth_too_small: "errorMouthTooSmall",
    bad_input: "errorBadInput",
    generation_failed: "errorGenerationFailed",
};

function readStoredConsent(): boolean {
    try {
        return window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
    } catch {
        return false;
    }
}

function storeConsent() {
    try {
        window.localStorage.setItem(
            CONSENT_STORAGE_KEY,
            JSON.stringify({ version: 1, acceptedAt: new Date().toISOString() })
        );
    } catch {
        // Private mode etc. — consent simply won't be remembered.
    }
}

/**
 * Normalize a captured/uploaded photo before upload: bake EXIF orientation,
 * downscale to ≤1280px and re-encode as JPEG (~0.85) to keep the payload small.
 */
async function normalizePhoto(rawSrc: string): Promise<string> {
    const draw = (source: CanvasImageSource, width: number, height: number): string => {
        let w = width;
        let h = height;
        if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
            const ratio = Math.min(MAX_IMAGE_DIMENSION / w, MAX_IMAGE_DIMENSION / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas_unavailable");
        ctx.drawImage(source, 0, 0, w, h);
        return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    };

    try {
        // createImageBitmap auto-applies EXIF orientation.
        const blob = await (await fetch(rawSrc)).blob();
        const bitmap = await createImageBitmap(blob);
        try {
            return draw(bitmap, bitmap.width, bitmap.height);
        } finally {
            bitmap.close();
        }
    } catch {
        // Fallback for browsers without createImageBitmap support.
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    resolve(draw(img, img.naturalWidth, img.naturalHeight));
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error("image_load_failed"));
            img.src = rawSrc;
        });
    }
}

// --- SHARED STYLES ---
const primaryButtonStyle: React.CSSProperties = {
    width: "100%", padding: "15px", borderRadius: "12px", border: "none",
    background: "var(--color-primary)", color: "#000", fontSize: "16px", fontWeight: "bold",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
    width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid #444",
    background: "transparent", color: "#fff", fontSize: "16px", fontWeight: "bold",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer",
};

const ghostButtonStyle: React.CSSProperties = {
    width: "100%", padding: "10px", borderRadius: "12px", border: "none",
    background: "transparent", color: "#666", fontSize: "12px", cursor: "pointer",
};

export default function SimulatorFlow({ showHeader = true }: { showHeader?: boolean }) {
    const t = useTranslations("simulatorModal");

    const [step, setStep] = useState<FlowStep>("instruction");
    const [error, setError] = useState<string | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [style, setStyle] = useState<SmileStyle>("natural");
    const [consentStored, setConsentStored] = useState(false);
    const [ageChecked, setAgeChecked] = useState(false);
    const [uploadChecked, setUploadChecked] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // --- CAMERA ---
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Release the camera and abort any in-flight generation on unmount
    // (the modal unmounts the flow when it closes).
    useEffect(() => {
        return () => {
            stopCamera();
            abortRef.current?.abort();
        };
    }, [stopCamera]);

    // Rotate loading status messages while the synchronous generation runs (~25s).
    useEffect(() => {
        if (step !== "generating") return;
        const id = setInterval(
            () => setStatusIndex((i) => (i + 1) % LOADING_STATUS_KEYS.length),
            STATUS_ROTATION_MS
        );
        return () => clearInterval(id);
    }, [step]);

    const startCamera = async () => {
        setError(null);
        setStep("camera");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: VIDEO_CONSTRAINTS,
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch {
            setError(t("cameraError"));
            setStep("capture");
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Mirror to match the on-screen preview.
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        stopCamera();
        handlePhotoSelected(dataUrl);
    };

    // --- UPLOAD ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (typeof ev.target?.result === "string") {
                handlePhotoSelected(ev.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePhotoSelected = async (rawSrc: string) => {
        setError(null);
        setIsPreparing(true);
        setStep("capture");
        try {
            const normalized = await normalizePhoto(rawSrc);
            setPhoto(normalized);
            setResultImage(null);
            setStep("style");
        } catch {
            setError(t("processingError"));
            setStep("capture");
        } finally {
            setIsPreparing(false);
        }
    };

    // --- CONSENT ---
    // localStorage is read in the event handler (not an effect) so the SSR
    // markup stays deterministic and hydration cannot mismatch.
    const handleInstructionContinue = () => {
        const stored = readStoredConsent();
        setConsentStored(stored);
        if (stored) {
            // Review mode: pre-check the boxes so the user only re-reads the text.
            setAgeChecked(true);
            setUploadChecked(true);
            setStep("capture");
        } else {
            setStep("consent");
        }
    };

    const acceptConsent = () => {
        storeConsent();
        setConsentStored(true);
        setStep("capture");
    };

    // --- GENERATION (synchronous API, no polling) ---
    const generate = async (chosenStyle: SmileStyle) => {
        if (!photo) return;
        setError(null);
        setStatusIndex(0);
        setStep("generating");

        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const photoBlob = await (await fetch(photo)).blob();
            const formData = new FormData();
            formData.append("photo", photoBlob, "photo.jpg");
            formData.append("style", chosenStyle);

            const res = await fetch("/api/smile", {
                method: "POST",
                body: formData,
                headers: { "X-Client": "web" },
                signal: controller.signal,
            });
            const data = await res.json().catch(() => null);

            if (res.ok && data?.ok && typeof data.image === "string") {
                setResultImage(data.image);
                setStep("result");
                return;
            }

            if (res.status === 429) {
                setError(t(data?.scope === "global" ? "errorRateLimitedGlobal" : "errorRateLimitedUser"));
                setStep("style");
                return;
            }

            const reasonKey = REASON_TO_ERROR_KEY[data?.reason as string] ?? "errorGenerationFailed";
            setError(t(reasonKey));
            // Photo-quality rejections (422/400) need a different photo; transient
            // generation failures keep the photo so the user can simply retry.
            setStep(res.status === 422 || res.status === 400 ? "capture" : "style");
        } catch {
            setError(t(controller.signal.aborted ? "errorTimeout" : "errorNetwork"));
            setStep("style");
        } finally {
            clearTimeout(timeoutId);
            if (abortRef.current === controller) abortRef.current = null;
        }
    };

    const downloadResult = () => {
        if (!resultImage) return;
        // The server already applies the watermark — a plain download is enough.
        const link = document.createElement("a");
        link.href = resultImage;
        link.download = `${isDemoMode ? "densflow" : "mikrostomart"}-smile-${Date.now()}.jpg`;
        link.click();
    };

    const restart = () => {
        setPhoto(null);
        setResultImage(null);
        setError(null);
        setStyle("natural");
        setStep("capture");
    };

    const reportMailto = `mailto:${demoSanitize(CONTACT_EMAIL)}?subject=${encodeURIComponent(t("reportResultSubject"))}`;

    // --- RENDER ---
    return (
        <div style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            color: "#fff", fontFamily: "sans-serif",
        }}>
            {showHeader && (
                <div style={{ padding: "20px", textAlign: "center", background: "#0f0f0f", flexShrink: 0 }}>
                    <h2 style={{ margin: 0, color: "var(--color-primary)" }}>{t("title")}</h2>
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px" }}>
                <div style={{
                    minHeight: "100%", maxWidth: "460px", margin: "0 auto",
                    display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px",
                }}>

                    {error && (
                        <div style={{
                            background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.5)",
                            color: "#ffaaaa", padding: "12px", borderRadius: "10px",
                            fontSize: "14px", textAlign: "center",
                        }}>
                            <AlertTriangle size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                            {error}
                        </div>
                    )}

                    {/* --- STEP: INSTRUCTION --- */}
                    {step === "instruction" && (
                        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
                            <div style={{ fontSize: "50px" }}>📸</div>
                            <h3 style={{ margin: 0, color: "var(--color-primary)" }}>{t("instructionTitle")}</h3>
                            <p style={{ margin: 0, lineHeight: "1.6", fontSize: "16px", color: "#ccc" }}>
                                {t("instructionSubtitle")}
                            </p>
                            <ul style={{
                                textAlign: "left", background: "rgba(255,255,255,0.05)",
                                padding: "20px 30px", borderRadius: "15px", lineHeight: "1.8", margin: 0,
                            }}>
                                <li dangerouslySetInnerHTML={{ __html: `⭐ ${t("instructionFront")}` }} />
                                <li dangerouslySetInnerHTML={{ __html: `👄 ${t("instructionMouth")}` }} />
                                <li dangerouslySetInnerHTML={{ __html: `☀️ ${t("instructionLight")}` }} />
                                <li>🚫 {t("instructionAvoid")}</li>
                            </ul>
                            <button
                                onClick={handleInstructionContinue}
                                style={{ ...primaryButtonStyle, width: "auto", padding: "15px 40px", borderRadius: "50px", marginTop: "10px" }}
                            >
                                {t("understood")}
                            </button>
                        </div>
                    )}

                    {/* --- STEP: CONSENT --- */}
                    {step === "consent" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div style={{ textAlign: "center" }}>
                                <ShieldCheck size={40} color="var(--color-primary)" style={{ margin: "0 auto 10px" }} />
                                <h3 style={{ margin: 0, color: "var(--color-primary)" }}>{t("consentTitle")}</h3>
                            </div>
                            <p style={{ margin: 0, fontSize: "14px", color: "#ccc", lineHeight: "1.6" }}>
                                {t("consentIntro")}
                            </p>

                            <label style={{
                                display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer",
                                background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "12px",
                            }}>
                                <input
                                    type="checkbox"
                                    checked={ageChecked}
                                    onChange={(e) => setAgeChecked(e.target.checked)}
                                    style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "var(--color-primary)", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "14px", lineHeight: "1.5" }}>{t("consentAge")}</span>
                            </label>

                            <label style={{
                                display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer",
                                background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "12px",
                            }}>
                                <input
                                    type="checkbox"
                                    checked={uploadChecked}
                                    onChange={(e) => setUploadChecked(e.target.checked)}
                                    style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "var(--color-primary)", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "13px", lineHeight: "1.5", color: "#ddd" }}>{t("consentUpload")}</span>
                            </label>

                            <button
                                onClick={acceptConsent}
                                disabled={!ageChecked || !uploadChecked}
                                style={{
                                    ...primaryButtonStyle,
                                    opacity: ageChecked && uploadChecked ? 1 : 0.4,
                                    cursor: ageChecked && uploadChecked ? "pointer" : "not-allowed",
                                }}
                            >
                                <Check size={18} /> {t("consentContinue")}
                            </button>

                            <Link
                                href="/polityka-prywatnosci"
                                style={{ textAlign: "center", fontSize: "12px", color: "#888", textDecoration: "underline" }}
                            >
                                {t("consentPrivacyLink")}
                            </Link>
                        </div>
                    )}

                    {/* --- STEP: CAPTURE (camera / upload choice) --- */}
                    {step === "capture" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
                            <div style={{
                                width: "100%", aspectRatio: "1/1", background: "#1a1a1a", borderRadius: "20px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                {isPreparing ? (
                                    <div style={{ textAlign: "center" }}>
                                        <div className="animate-spin" style={{
                                            margin: "0 auto 15px", width: "40px", height: "40px",
                                            border: "4px solid #333", borderTopColor: "var(--color-primary)", borderRadius: "50%",
                                        }} />
                                        <p style={{ color: "#ccc", margin: 0 }}>{t("optimizing")}</p>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: "80px" }}>✨</div>
                                )}
                            </div>

                            <button onClick={startCamera} disabled={isPreparing} style={{ ...primaryButtonStyle, background: "#fff", padding: "20px" }}>
                                <Camera /> {t("startCamera")}
                            </button>

                            <button onClick={() => fileInputRef.current?.click()} disabled={isPreparing} style={{ ...secondaryButtonStyle, padding: "20px" }}>
                                <Upload /> {t("uploadPhoto")}
                            </button>

                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

                            {consentStored && (
                                <p style={{ margin: 0, fontSize: "12px", color: "#777", textAlign: "center", lineHeight: "1.5" }}>
                                    <ShieldCheck size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "-2px" }} />
                                    {t("consentSummary")}{" "}
                                    <button
                                        onClick={() => setStep("consent")}
                                        style={{ background: "none", border: "none", color: "#999", textDecoration: "underline", cursor: "pointer", fontSize: "12px", padding: 0 }}
                                    >
                                        {t("consentReview")}
                                    </button>
                                </p>
                            )}
                        </div>
                    )}

                    {/* --- STEP: CAMERA --- */}
                    {step === "camera" && (
                        <div style={{
                            position: "relative", width: "100%", aspectRatio: "3/4",
                            borderRadius: "20px", overflow: "hidden", background: "#000",
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay playsInline muted
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                            />
                            <div style={{ position: "absolute", bottom: "20px", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                                <button
                                    onClick={capturePhoto}
                                    aria-label={t("startCamera")}
                                    style={{
                                        width: "80px", height: "80px", borderRadius: "50%",
                                        background: "#fff", border: "5px solid var(--color-primary)", cursor: "pointer",
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => { stopCamera(); setStep("capture"); }}
                                style={{
                                    position: "absolute", top: "12px", left: "12px",
                                    background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "20px",
                                    color: "#fff", padding: "8px 14px", fontSize: "13px", cursor: "pointer",
                                }}
                            >
                                {t("back")}
                            </button>
                        </div>
                    )}

                    {/* --- STEP: STYLE SELECTION --- */}
                    {step === "style" && photo && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <img
                                src={photo}
                                alt={t("title")}
                                style={{
                                    width: "100%", maxHeight: "220px", objectFit: "cover",
                                    borderRadius: "15px", border: "1px solid #333",
                                }}
                            />
                            <h3 style={{ margin: 0, color: "var(--color-primary)", textAlign: "center" }}>{t("styleTitle")}</h3>

                            <div role="radiogroup" aria-label={t("styleTitle")} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {STYLE_OPTIONS.map((opt) => {
                                    const selected = style === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() => setStyle(opt.id)}
                                            style={{
                                                textAlign: "left", padding: "14px", borderRadius: "12px", cursor: "pointer",
                                                background: selected ? "rgba(255,255,255,0.08)" : "transparent",
                                                border: selected ? "2px solid var(--color-primary)" : "1px solid #444",
                                                color: "#fff",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px" }}>
                                                {t(opt.labelKey)}
                                                {opt.id === "natural" && (
                                                    <span style={{
                                                        fontSize: "10px", fontWeight: "bold", color: "#000",
                                                        background: "var(--color-primary)", padding: "2px 8px", borderRadius: "10px",
                                                    }}>
                                                        {t("styleDefaultBadge")}
                                                    </span>
                                                )}
                                                {selected && <Check size={16} color="var(--color-primary)" style={{ marginLeft: "auto" }} />}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>{t(opt.descKey)}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            <button onClick={() => generate(style)} style={primaryButtonStyle}>
                                ✨ {t("generate")}
                            </button>
                            <button onClick={restart} style={{ ...secondaryButtonStyle, padding: "12px", fontSize: "14px" }}>
                                <RefreshCw size={16} /> {t("changePhoto")}
                            </button>
                        </div>
                    )}

                    {/* --- STEP: GENERATING --- */}
                    {step === "generating" && (
                        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
                            <div className="animate-spin" style={{
                                width: "50px", height: "50px",
                                border: "4px solid #333", borderTopColor: "var(--color-primary)", borderRadius: "50%",
                            }} />
                            <h3 style={{ margin: 0, color: "#fff" }}>{t(LOADING_STATUS_KEYS[statusIndex])}</h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>{t("loadingHint")}</p>
                        </div>
                    )}

                    {/* --- STEP: RESULT --- */}
                    {step === "result" && photo && resultImage && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <div style={{
                                width: "100%", aspectRatio: "3/4", position: "relative",
                                borderRadius: "15px", overflow: "hidden", border: "1px solid #333",
                            }}>
                                <BeforeAfterSlider beforeImage={photo} afterImage={resultImage} />
                            </div>

                            <p style={{
                                margin: 0, fontSize: "12px", lineHeight: "1.5", color: "#bbb",
                                background: "rgba(255,255,255,0.05)", border: "1px solid #333",
                                padding: "12px", borderRadius: "10px",
                            }}>
                                {t("resultDisclaimer")}
                            </p>

                            <div style={{ display: "flex", gap: "10px" }}>
                                <button onClick={() => setStep("style")} style={{ ...secondaryButtonStyle, fontSize: "14px" }}>
                                    <RefreshCw size={16} /> {t("tryAnotherStyle")}
                                </button>
                                <button onClick={downloadResult} style={{ ...primaryButtonStyle, fontSize: "14px" }}>
                                    <Download size={16} /> {t("download")}
                                </button>
                            </div>

                            <Link
                                href="/rezerwacja"
                                style={{ ...primaryButtonStyle, background: "#fff", textDecoration: "none", boxSizing: "border-box" }}
                            >
                                <Calendar size={18} /> {t("bookVisit")}
                            </Link>

                            <div style={{ display: "flex", justifyContent: "center", gap: "20px", alignItems: "center" }}>
                                <a href={reportMailto} style={{ fontSize: "12px", color: "#888", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <Flag size={12} /> {t("reportResult")}
                                </a>
                                <button onClick={restart} style={{ ...ghostButtonStyle, width: "auto", padding: "10px 0" }}>
                                    {t("backToStart")}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
