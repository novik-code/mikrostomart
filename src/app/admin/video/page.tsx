"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────
interface VideoQueueItem {
    id: string;
    raw_video_url: string;
    processed_video_url: string | null;
    status: string;
    title: string | null;
    descriptions: Record<string, string> | null;
    hashtags: string[] | null;
    transcript: string | null;
    ai_analysis: any;
    error_message: string | null;
    raw_duration_seconds: number | null;
    raw_video_size: number | null;
    created_at: string;
    published_at: string | null;
}

// ── Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    uploaded:     { label: "Przesłano",      emoji: "📤", color: "#6b7280" },
    transcribing: { label: "Transkrypcja",   emoji: "🎤", color: "#8b5cf6" },
    analyzing:    { label: "Analiza AI",     emoji: "🧠", color: "#3b82f6" },
    generating:   { label: "Generowanie",    emoji: "✍️", color: "#06b6d4" },
    rendering:    { label: "Obróbka wideo",  emoji: "🎬", color: "#f59e0b" },
    ready:        { label: "Gotowe",         emoji: "✅", color: "#10b981" },
    publishing:   { label: "Publikowanie",   emoji: "📤", color: "#6366f1" },
    done:         { label: "Opublikowano",   emoji: "🎉", color: "#22c55e" },
    failed:       { label: "Błąd",           emoji: "❌", color: "#ef4444" },
};

export default function VideoPage() {
    const [videos, setVideos] = useState<VideoQueueItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoQueueItem | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Load videos ─────────────────────────────────────────────────
    const loadVideos = useCallback(async () => {
        try {
            const res = await fetch("/api/social/video-upload?limit=30");
            const data = await res.json();
            if (data.videos) setVideos(data.videos);
        } catch (err) {
            console.error("Error loading videos:", err);
        }
    }, []);

    useEffect(() => {
        loadVideos();
        // Auto-refresh every 15 seconds to track processing
        const interval = setInterval(loadVideos, 15000);
        return () => clearInterval(interval);
    }, [loadVideos]);

    // ── File selection ──────────────────────────────────────────────
    const handleFileSelect = (file: File) => {
        // iOS sometimes doesn't set MIME type correctly
        const isVideo = file.type.startsWith("video/") || 
            /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(file.name);
        if (!isVideo) {
            alert("Wybierz plik wideo (MP4, MOV, WebM)");
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            alert("Plik za duży. Maksymalnie 500MB.");
            return;
        }
        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    // ── Upload (get signed URL from server → upload directly → register queue) ──
    const handleUpload = async () => {
        if (!previewFile) return;
        setUploading(true);
        setUploadProgress(0);

        try {
            const ext = previewFile.name.split(".").pop() || "mp4";

            // Step 1: Get a signed upload URL from our server (uses service role key)
            setUploadProgress(2);
            const signRes = await fetch("/api/social/video-upload", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ext, contentType: previewFile.type || "video/mp4" }),
            });
            const signData = await signRes.json();
            if (!signRes.ok) throw new Error(signData.error || "Failed to get upload URL");

            const { uploadUrl, publicUrl, token } = signData;

            // Step 2: Upload directly to Supabase Storage with real progress
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", uploadUrl);
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                xhr.setRequestHeader("Content-Type", previewFile!.type || "video/mp4");

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round(5 + (e.loaded / e.total) * 85);
                        setUploadProgress(pct);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        let errorMsg = `Upload error: ${xhr.status}`;
                        try { errorMsg += ` — ${JSON.parse(xhr.responseText)?.message || xhr.statusText}`; } catch {}
                        reject(new Error(errorMsg));
                    }
                };

                xhr.onerror = () => reject(new Error("Błąd sieci podczas uploadu"));
                xhr.send(previewFile);
            });

            setUploadProgress(92);

            // Step 3: Register queue entry via lightweight API call
            const res = await fetch("/api/social/video-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoUrl: publicUrl,
                    fileSize: previewFile.size,
                    fileName: previewFile.name,
                }),
            });

            setUploadProgress(100);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Queue registration failed");
            }

            // Success
            setPreviewFile(null);
            setPreviewUrl(null);
            await loadVideos();

            setTimeout(() => {
                setUploadProgress(0);
                setUploading(false);
            }, 1000);

        } catch (err: any) {
            alert(`Błąd uploadu: ${err.message}`);
            setUploading(false);
            setUploadProgress(0);
        }
    };

    // ── Cancel preview ──────────────────────────────────────────────
    const cancelPreview = () => {
        setPreviewFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    // ── Drag & Drop ─────────────────────────────────────────────────
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // ── Retry failed video ──────────────────────────────────────────
    const handleRetry = async (id: string) => {
        try {
            await fetch("/api/social/video-upload", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "uploaded" }),
            });
            await loadVideos();
        } catch (err) {
            console.error("Retry error:", err);
        }
    };

    // ── Delete video ────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm("Usunąć to wideo?")) return;
        try {
            await fetch(`/api/social/video-upload?id=${id}`, { method: "DELETE" });
            await loadVideos();
            if (selectedVideo?.id === id) setSelectedVideo(null);
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────
    const formatSize = (bytes: number | null) => {
        if (!bytes) return "?";
        if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "?";
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleString("pl-PL", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        });
    };

    const isProcessing = (status: string) =>
        ["uploaded", "transcribing", "analyzing", "generating", "rendering", "publishing"].includes(status);

    // ── Render ──────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
            color: "white",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            {/* Header */}
            <div style={{
                padding: "20px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(20px)",
                position: "sticky",
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto" }}>
                    <h1 style={{
                        fontSize: 22,
                        fontWeight: 800,
                        margin: 0,
                        background: "linear-gradient(90deg, #FFD700, #FFA500)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}>
                        🎬 Video Shorts
                    </h1>
                    <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
                        Upload → AI obrabia → auto-publish
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>

                {/* Upload Area */}
                {!previewUrl ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `3px dashed ${dragActive ? "#FFD700" : "rgba(255,255,255,0.15)"}`,
                            borderRadius: 20,
                            padding: "48px 24px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.3s",
                            background: dragActive ? "rgba(255,215,0,0.05)" : "rgba(255,255,255,0.02)",
                            marginBottom: 24,
                        }}
                    >
                        <div style={{ fontSize: 56, marginBottom: 12 }}>📹</div>
                        <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>
                            Dodaj wideo
                        </p>
                        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                            Kliknij lub upuść plik • MP4, MOV • max 500MB
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                            }}
                        />
                    </div>
                ) : (
                    /* Preview & Upload */
                    <div style={{
                        borderRadius: 20,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        marginBottom: 24,
                    }}>
                        <video
                            src={previewUrl}
                            controls
                            playsInline
                            style={{
                                width: "100%",
                                maxHeight: 400,
                                objectFit: "contain",
                                background: "#000",
                            }}
                        />
                        <div style={{ padding: 16 }}>
                            <p style={{ fontSize: 14, color: "#ccc", margin: "0 0 8px" }}>
                                {previewFile?.name} • {formatSize(previewFile?.size || 0)}
                            </p>

                            {uploading && (
                                <div style={{
                                    height: 6,
                                    background: "rgba(255,255,255,0.1)",
                                    borderRadius: 3,
                                    overflow: "hidden",
                                    marginBottom: 12,
                                }}>
                                    <div style={{
                                        height: "100%",
                                        width: `${uploadProgress}%`,
                                        background: "linear-gradient(90deg, #FFD700, #FFA500)",
                                        borderRadius: 3,
                                        transition: "width 0.3s",
                                    }} />
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    style={{
                                        flex: 1,
                                        padding: "14px 20px",
                                        background: uploading
                                            ? "rgba(255,215,0,0.3)"
                                            : "linear-gradient(135deg, #FFD700, #FFA500)",
                                        color: "#000",
                                        border: "none",
                                        borderRadius: 12,
                                        fontSize: 16,
                                        fontWeight: 800,
                                        cursor: uploading ? "wait" : "pointer",
                                    }}
                                >
                                    {uploading ? `Przesyłanie ${uploadProgress}%...` : "🚀 Przetwórz i opublikuj"}
                                </button>
                                {!uploading && (
                                    <button
                                        onClick={cancelPreview}
                                        style={{
                                            padding: "14px 16px",
                                            background: "rgba(255,255,255,0.08)",
                                            color: "#ccc",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: 12,
                                            fontSize: 14,
                                            cursor: "pointer",
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Video List */}
                <div>
                    <h2 style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#aaa",
                        margin: "0 0 12px",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                    }}>
                        Twoje wideo ({videos.length})
                    </h2>

                    {videos.length === 0 && (
                        <p style={{ textAlign: "center", color: "#555", padding: 40, fontSize: 14 }}>
                            Brak wideo. Dodaj pierwsze! ☝️
                        </p>
                    )}

                    {videos.map((video) => {
                        const statusConfig = STATUS_CONFIG[video.status] || STATUS_CONFIG.uploaded;
                        const processing = isProcessing(video.status);

                        return (
                            <div
                                key={video.id}
                                onClick={() => setSelectedVideo(selectedVideo?.id === video.id ? null : video)}
                                style={{
                                    padding: "14px 16px",
                                    marginBottom: 8,
                                    borderRadius: 14,
                                    background: selectedVideo?.id === video.id
                                        ? "rgba(255,215,0,0.05)"
                                        : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${selectedVideo?.id === video.id
                                        ? "rgba(255,215,0,0.2)"
                                        : "rgba(255,255,255,0.06)"}`,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    {/* Status badge */}
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: `${statusConfig.color}22`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 22,
                                        flexShrink: 0,
                                    }}>
                                        {processing ? (
                                            <span style={{ animation: "spin 1.5s linear infinite" }}>
                                                {statusConfig.emoji}
                                            </span>
                                        ) : statusConfig.emoji}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            margin: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            color: video.title ? "#fff" : "#888",
                                        }}>
                                            {video.title || `Wideo ${formatTime(video.created_at)}`}
                                        </p>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginTop: 3,
                                        }}>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: statusConfig.color,
                                                textTransform: "uppercase",
                                            }}>
                                                {statusConfig.label}
                                            </span>
                                            <span style={{ fontSize: 11, color: "#555" }}>•</span>
                                            <span style={{ fontSize: 11, color: "#666" }}>
                                                {formatSize(video.raw_video_size)}
                                            </span>
                                            {video.raw_duration_seconds && (
                                                <>
                                                    <span style={{ fontSize: 11, color: "#555" }}>•</span>
                                                    <span style={{ fontSize: 11, color: "#666" }}>
                                                        {formatDuration(video.raw_duration_seconds)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Retry (failed only) + Delete */}
                                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                        {video.status === "failed" && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRetry(video.id); }}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "#f59e0b",
                                                    fontSize: 18,
                                                    cursor: "pointer",
                                                    padding: 4,
                                                }}
                                                title="Ponów"
                                            >
                                                🔄
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#555",
                                                fontSize: 18,
                                                cursor: "pointer",
                                                padding: 4,
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {selectedVideo?.id === video.id && (
                                    <div style={{
                                        marginTop: 14,
                                        paddingTop: 14,
                                        borderTop: "1px solid rgba(255,255,255,0.06)",
                                    }}>
                                        {video.error_message && (
                                            <div style={{
                                                padding: "10px 12px",
                                                background: "rgba(239,68,68,0.1)",
                                                border: "1px solid rgba(239,68,68,0.2)",
                                                borderRadius: 8,
                                                fontSize: 12,
                                                color: "#f87171",
                                                marginBottom: 10,
                                            }}>
                                                ❌ {video.error_message}
                                            </div>
                                        )}

                                        {video.title && (
                                            <div style={{ marginBottom: 10 }}>
                                                <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>TYTUŁ</label>
                                                <p style={{ fontSize: 14, margin: "2px 0 0", color: "#FFD700" }}>
                                                    {video.title}
                                                </p>
                                            </div>
                                        )}

                                        {video.hashtags && video.hashtags.length > 0 && (
                                            <div style={{ marginBottom: 10 }}>
                                                <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>HASHTAGI</label>
                                                <p style={{ fontSize: 12, margin: "2px 0 0", color: "#6366f1" }}>
                                                    {video.hashtags.map(h => `#${h}`).join(" ")}
                                                </p>
                                            </div>
                                        )}

                                        {video.transcript && (
                                            <div style={{ marginBottom: 10 }}>
                                                <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>TRANSKRYPCJA</label>
                                                <p style={{
                                                    fontSize: 12,
                                                    margin: "4px 0 0",
                                                    color: "#aaa",
                                                    lineHeight: 1.5,
                                                    maxHeight: 100,
                                                    overflow: "auto",
                                                }}>
                                                    {video.transcript}
                                                </p>
                                            </div>
                                        )}

                                        {video.processed_video_url && (
                                            <div style={{ marginBottom: 10 }}>
                                                <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>PRZETWORZONE WIDEO</label>
                                                <video
                                                    src={video.processed_video_url}
                                                    controls
                                                    playsInline
                                                    style={{
                                                        width: "100%",
                                                        maxHeight: 300,
                                                        borderRadius: 8,
                                                        marginTop: 4,
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {video.published_at && (
                                            <p style={{ fontSize: 11, color: "#22c55e", margin: "4px 0 0" }}>
                                                Opublikowano: {formatTime(video.published_at)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Spinner animation */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
