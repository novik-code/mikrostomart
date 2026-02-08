"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { TREATMENT_PATHS, type TreatmentPath, type Variant, type Stage } from "./treatmentData";
import RevealOnScroll from "@/components/RevealOnScroll";
import {
    Clock, CalendarDays, ArrowLeft, ArrowRight, Send, MapPin,
    Syringe, AlertCircle, ChevronRight, Timer, Info
} from "lucide-react";

/* ─── metadata (exported from layout or handled via generateMetadata) ──── */
// SEO metadata is set via export const metadata in a sibling layout or via head

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES (CSS-in-JS object for premium dark/gold aesthetic)
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {
    page: {
        minHeight: "100vh",
        background: "var(--color-background)",
        color: "var(--color-text)",
        fontFamily: "var(--font-sans)",
        paddingBottom: "var(--spacing-xl)",
    } as React.CSSProperties,

    hero: {
        textAlign: "center" as const,
        padding: "120px 20px 60px",
        position: "relative" as const,
        overflow: "hidden" as const,
    } as React.CSSProperties,

    heroGradient: {
        position: "absolute" as const,
        top: 0, left: 0, right: 0, bottom: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)",
        pointerEvents: "none" as const,
    } as React.CSSProperties,

    heroIcon: {
        fontSize: "3rem",
        marginBottom: "1rem",
        display: "block",
    } as React.CSSProperties,

    heroTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
        color: "var(--color-primary)",
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    heroSub: {
        fontSize: "1.05rem",
        color: "var(--color-text-muted)",
        maxWidth: "600px",
        margin: "0 auto 0.5rem",
        lineHeight: 1.6,
    } as React.CSSProperties,

    microCopy: {
        fontSize: "0.85rem",
        color: "rgba(255,255,255,0.4)",
        marginTop: "0.5rem",
    } as React.CSSProperties,

    container: {
        maxWidth: "900px",
        margin: "0 auto",
        padding: "0 20px",
    } as React.CSSProperties,

    tilesGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "1rem",
        marginTop: "2rem",
    } as React.CSSProperties,

    tile: (color: string, isHovered: boolean) => ({
        background: "var(--color-surface)",
        border: `1px solid ${isHovered ? color : "rgba(255,255,255,0.06)"}`,
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: isHovered ? "translateY(-4px)" : "none",
        boxShadow: isHovered ? `0 8px 30px ${color}22, 0 0 15px ${color}11` : "none",
        textAlign: "left" as const,
    }) as React.CSSProperties,

    tileIcon: {
        fontSize: "2rem",
        marginBottom: "0.75rem",
        display: "block",
    } as React.CSSProperties,

    tileTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.15rem",
        color: "#fff",
        marginBottom: "0.25rem",
    } as React.CSSProperties,

    tileSub: {
        fontSize: "0.85rem",
        color: "var(--color-text-muted)",
    } as React.CSSProperties,

    // Questions step
    questionCard: {
        background: "var(--color-surface)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-lg)",
        padding: "2.5rem 2rem",
        maxWidth: "600px",
        margin: "2rem auto",
        textAlign: "center" as const,
    } as React.CSSProperties,

    questionText: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.3rem",
        color: "#fff",
        marginBottom: "1.5rem",
        lineHeight: 1.4,
    } as React.CSSProperties,

    optionsGrid: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
    } as React.CSSProperties,

    optionBtn: (isActive: boolean) => ({
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.9rem 1.2rem",
        background: isActive ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? "var(--color-primary)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        color: isActive ? "var(--color-primary)" : "var(--color-text)",
        fontSize: "0.95rem",
        textAlign: "left" as const,
        width: "100%",
    }) as React.CSSProperties,

    progressDots: {
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        marginBottom: "1.5rem",
    } as React.CSSProperties,

    dot: (active: boolean, done: boolean) => ({
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: done ? "var(--color-primary)" : active ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.15)",
        transition: "all 0.3s ease",
    }) as React.CSSProperties,

    navRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "1.5rem",
        gap: "1rem",
    } as React.CSSProperties,

    backBtn: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0.6rem 1.2rem",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-muted)",
        cursor: "pointer",
        fontSize: "0.85rem",
        transition: "all 0.2s ease",
    } as React.CSSProperties,

    nextBtn: (enabled: boolean) => ({
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0.6rem 1.5rem",
        background: enabled ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
        border: "none",
        borderRadius: "var(--radius-md)",
        color: enabled ? "#000" : "rgba(255,255,255,0.3)",
        cursor: enabled ? "pointer" : "not-allowed",
        fontSize: "0.9rem",
        fontWeight: 600,
        transition: "all 0.2s ease",
    }) as React.CSSProperties,

    // Results
    summaryRow: {
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
        flexWrap: "wrap" as const,
        marginBottom: "2.5rem",
    } as React.CSSProperties,

    summaryPill: (color: string) => ({
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0.7rem 1.4rem",
        background: `${color}15`,
        border: `1px solid ${color}33`,
        borderRadius: "999px",
        color: color,
        fontSize: "1.05rem",
        fontWeight: 600,
    }) as React.CSSProperties,

    timelineContainer: {
        position: "relative" as const,
        paddingLeft: "40px",
    } as React.CSSProperties,

    timelineLine: {
        position: "absolute" as const,
        left: "15px",
        top: 0,
        bottom: 0,
        width: "2px",
        background: "linear-gradient(to bottom, var(--color-primary), rgba(212,175,55,0.1))",
    } as React.CSSProperties,

    stageCard: {
        position: "relative" as const,
        background: "var(--color-surface)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-md)",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        marginLeft: "10px",
    } as React.CSSProperties,

    stageDot: (color: string) => ({
        position: "absolute" as const,
        left: "-41px",
        top: "1.5rem",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: color,
        border: "2px solid var(--color-background)",
        boxShadow: `0 0 8px ${color}55`,
    }) as React.CSSProperties,

    stageNum: (color: string) => ({
        position: "absolute" as const,
        left: "-50px",
        top: "1.2rem",
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: `${color}22`,
        border: `2px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        color: color,
    }) as React.CSSProperties,

    stageName: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.1rem",
        color: "#fff",
        marginBottom: "0.4rem",
    } as React.CSSProperties,

    stageDesc: {
        fontSize: "0.88rem",
        color: "var(--color-text-muted)",
        lineHeight: 1.6,
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    stageMeta: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "0.75rem",
        fontSize: "0.8rem",
    } as React.CSSProperties,

    metaBadge: (bg: string, fg: string) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "999px",
        background: bg,
        color: fg,
        fontSize: "0.78rem",
        fontWeight: 500,
    }) as React.CSSProperties,

    stageGap: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0.3rem 0 0.3rem 10px",
        marginBottom: "0.5rem",
        fontSize: "0.82rem",
        color: "rgba(255,255,255,0.35)",
        borderLeft: "2px dashed rgba(212,175,55,0.2)",
        marginLeft: "0px",
    } as React.CSSProperties,

    factorsSection: {
        background: "var(--color-surface)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
        marginTop: "2rem",
    } as React.CSSProperties,

    factorTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.1rem",
        color: "var(--color-primary)",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    } as React.CSSProperties,

    factorItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "0.5rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        fontSize: "0.88rem",
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
    } as React.CSSProperties,

    ctaSection: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "1rem",
        marginTop: "2.5rem",
        padding: "2rem",
        background: "rgba(212,175,55,0.04)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(212,175,55,0.1)",
    } as React.CSSProperties,

    ctaPrimary: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "0.85rem 2rem",
        background: "var(--color-primary)",
        color: "#000",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontSize: "1rem",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s ease",
        textDecoration: "none",
    } as React.CSSProperties,

    ctaSecondary: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "0.7rem 1.5rem",
        background: "transparent",
        color: "var(--color-primary)",
        border: "1px solid var(--color-primary)",
        borderRadius: "var(--radius-md)",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
    } as React.CSSProperties,

    disclaimer: {
        fontSize: "0.8rem",
        color: "rgba(255,255,255,0.35)",
        textAlign: "center" as const,
        maxWidth: "500px",
        margin: "1.5rem auto 0",
        lineHeight: 1.5,
    } as React.CSSProperties,

    // Lead form
    leadForm: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
        width: "100%",
        maxWidth: "400px",
        margin: "0.5rem auto 0",
    } as React.CSSProperties,

    leadInput: {
        padding: "0.7rem 1rem",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "var(--radius-md)",
        color: "#fff",
        fontSize: "0.9rem",
        outline: "none",
    } as React.CSSProperties,

    leadSubmit: (enabled: boolean) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "0.7rem 1.5rem",
        background: enabled ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
        color: enabled ? "#000" : "rgba(255,255,255,0.3)",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: enabled ? "pointer" : "not-allowed",
    }) as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

type Step = "select" | "questions" | "results";

export default function KalkulatorLeczeniaPage() {
    // State
    const [step, setStep] = useState<Step>("select");
    const [selectedPath, setSelectedPath] = useState<TreatmentPath | null>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<Variant | null>(null);
    const [hoveredTile, setHoveredTile] = useState<string | null>(null);

    // Lead form state
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadName, setLeadName] = useState("");
    const [leadPhone, setLeadPhone] = useState("");
    const [leadSending, setLeadSending] = useState(false);
    const [leadSent, setLeadSent] = useState(false);

    // Handlers
    const selectPath = useCallback((path: TreatmentPath) => {
        setSelectedPath(path);
        setQuestionIndex(0);
        setAnswers({});
        setResult(null);
        setShowLeadForm(false);
        setLeadSent(false);
        setStep("questions");
    }, []);

    const answerQuestion = useCallback((questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }, []);

    const nextQuestion = useCallback(() => {
        if (!selectedPath) return;
        if (questionIndex < selectedPath.questions.length - 1) {
            setQuestionIndex(prev => prev + 1);
        } else {
            // All questions answered → compute result
            const variant = selectedPath.getVariant(answers);
            setResult(variant);
            setStep("results");
        }
    }, [selectedPath, questionIndex, answers]);

    const prevQuestion = useCallback(() => {
        if (questionIndex > 0) {
            setQuestionIndex(prev => prev - 1);
        } else {
            setStep("select");
            setSelectedPath(null);
        }
    }, [questionIndex]);

    const resetAll = useCallback(() => {
        setStep("select");
        setSelectedPath(null);
        setQuestionIndex(0);
        setAnswers({});
        setResult(null);
        setShowLeadForm(false);
        setLeadSent(false);
    }, []);

    const submitLead = useCallback(async () => {
        if (!leadName.trim() || !leadPhone.trim() || !selectedPath || !result) return;
        setLeadSending(true);
        try {
            await fetch("/api/treatment-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: leadName.trim(),
                    phone: leadPhone.trim(),
                    service: selectedPath.title,
                    variant: result.label,
                    visitsRange: `${result.visitsMin}–${result.visitsMax}`,
                    durationRange: result.durationLabel,
                    answers: Object.entries(answers).map(([k, v]) => {
                        const q = selectedPath.questions.find(q => q.id === k);
                        const opt = q?.options.find(o => o.value === v);
                        return `${q?.text || k}: ${opt?.label || v}`;
                    }),
                }),
            });
            setLeadSent(true);
        } catch {
            alert("Wystąpił błąd. Spróbuj ponownie lub zadzwoń: 77 454 14 14.");
        } finally {
            setLeadSending(false);
        }
    }, [leadName, leadPhone, selectedPath, result, answers]);

    const currentQuestion = selectedPath?.questions[questionIndex];
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

    return (
        <main style={S.page}>
            {/* ── HERO ── */}
            <section style={S.hero}>
                <div style={S.heroGradient} />
                <span style={S.heroIcon}>🧮</span>
                <h1 style={S.heroTitle}>Kalkulator czasu leczenia</h1>
                <p style={S.heroSub}>
                    Sprawdź orientacyjnie: ile wizyt i ile czasu zajmuje najczęściej dana ścieżka leczenia.
                </p>
                <p style={S.microCopy}>
                    Wybierz temat i odpowiedz na kilka pytań · zajmie Ci to ok. 20–40 sekund
                </p>
            </section>

            <div style={S.container}>

                {/* ═══════ STEP A: Service Selection ═══════ */}
                {step === "select" && (
                    <div>
                        <div style={S.tilesGrid}>
                            {TREATMENT_PATHS.map(path => (
                                <div
                                    key={path.id}
                                    style={S.tile(path.color, hoveredTile === path.id)}
                                    onMouseEnter={() => setHoveredTile(path.id)}
                                    onMouseLeave={() => setHoveredTile(null)}
                                    onClick={() => selectPath(path)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === "Enter" && selectPath(path)}
                                >
                                    <span style={S.tileIcon}>{path.icon}</span>
                                    <div style={S.tileTitle}>{path.title}</div>
                                    <div style={S.tileSub}>{path.subtitle}</div>
                                </div>
                            ))}

                            {/* "Nie wiem" tile → redirect to pain map */}
                            <Link
                                href="/mapa-bolu"
                                style={{
                                    ...S.tile("#64748b", hoveredTile === "unknown"),
                                    textDecoration: "none",
                                }}
                                onMouseEnter={() => setHoveredTile("unknown")}
                                onMouseLeave={() => setHoveredTile(null)}
                            >
                                <span style={S.tileIcon}>🤷</span>
                                <div style={S.tileTitle}>Nie wiem, czego potrzebuję</div>
                                <div style={S.tileSub}>Przejdź do interaktywnej Mapy Bólu</div>
                            </Link>
                        </div>

                        <p style={{ ...S.microCopy, textAlign: "center", marginTop: "2rem" }}>
                            To narzędzie ma charakter informacyjny i nie zastępuje badania lekarskiego.
                        </p>
                    </div>
                )}

                {/* ═══════ STEP B: Questions ═══════ */}
                {step === "questions" && selectedPath && currentQuestion && (
                    <div style={S.questionCard}>
                        {/* Progress dots */}
                        <div style={S.progressDots}>
                            {selectedPath.questions.map((q, i) => (
                                <div key={q.id} style={S.dot(i === questionIndex, i < questionIndex)} />
                            ))}
                        </div>

                        {/* Service badge */}
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            padding: "4px 12px", background: `${selectedPath.color}15`,
                            border: `1px solid ${selectedPath.color}33`, borderRadius: "999px",
                            fontSize: "0.78rem", color: selectedPath.color,
                            marginBottom: "1.5rem",
                        }}>
                            {selectedPath.icon} {selectedPath.title}
                        </div>

                        <h2 style={S.questionText}>{currentQuestion.text}</h2>

                        <div style={S.optionsGrid}>
                            {currentQuestion.options.map(opt => (
                                <button
                                    key={opt.value}
                                    style={S.optionBtn(currentAnswer === opt.value)}
                                    onClick={() => answerQuestion(currentQuestion.id, opt.value)}
                                >
                                    {opt.emoji && <span style={{ fontSize: "1.2rem" }}>{opt.emoji}</span>}
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div style={S.navRow}>
                            <button style={S.backBtn} onClick={prevQuestion}>
                                <ArrowLeft size={14} /> Wróć
                            </button>
                            <button
                                style={S.nextBtn(!!currentAnswer)}
                                onClick={nextQuestion}
                                disabled={!currentAnswer}
                            >
                                {questionIndex < selectedPath.questions.length - 1 ? "Dalej" : "Pokaż wynik"}
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        <p style={{ ...S.microCopy, marginTop: "1rem" }}>
                            Pytanie {questionIndex + 1} z {selectedPath.questions.length}
                        </p>
                    </div>
                )}

                {/* ═══════ STEP C: Results ═══════ */}
                {step === "results" && result && selectedPath && (
                    <div>
                        {/* Back button */}
                        <button style={{ ...S.backBtn, marginBottom: "1.5rem" }} onClick={resetAll}>
                            <ArrowLeft size={14} /> Nowy kalkulator
                        </button>

                        {/* Variant label */}
                        <div style={{
                            textAlign: "center", marginBottom: "2rem",
                        }}>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "6px 16px", background: `${selectedPath.color}15`,
                                border: `1px solid ${selectedPath.color}33`, borderRadius: "999px",
                                fontSize: "0.85rem", color: selectedPath.color, marginBottom: "0.75rem",
                            }}>
                                {selectedPath.icon} {result.label}
                            </div>
                            <h2 style={{
                                fontFamily: "var(--font-heading)",
                                fontSize: "1.6rem",
                                color: "#fff",
                                marginTop: "0.5rem",
                            }}>
                                Twoja orientacyjna ścieżka leczenia
                            </h2>
                        </div>

                        {/* Summary pills */}
                        <RevealOnScroll animation="fade-up">
                            <div style={S.summaryRow}>
                                <div style={S.summaryPill("var(--color-primary)")}>
                                    <CalendarDays size={20} />
                                    Wizyty: {result.visitsMin}–{result.visitsMax}
                                </div>
                                <div style={S.summaryPill("#38bdf8")}>
                                    <Clock size={20} />
                                    Czas: {result.durationLabel}
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Timeline */}
                        <RevealOnScroll animation="fade-up" delay={100}>
                            <h3 style={{
                                fontFamily: "var(--font-heading)",
                                fontSize: "1.2rem",
                                color: "var(--color-primary)",
                                marginBottom: "1.5rem",
                            }}>
                                Etapy leczenia
                            </h3>

                            <div style={S.timelineContainer}>
                                <div style={S.timelineLine} />

                                {result.stages.map((stage, i) => (
                                    <div key={i}>
                                        <div style={S.stageCard}>
                                            <div style={S.stageNum(selectedPath.color)}>
                                                {i + 1}
                                            </div>

                                            <div style={S.stageName}>{stage.name}</div>
                                            <div style={S.stageDesc}>{stage.description}</div>

                                            <div style={S.stageMeta}>
                                                <span style={S.metaBadge("rgba(56,189,248,0.1)", "#38bdf8")}>
                                                    <Timer size={12} /> {stage.durationMin}–{stage.durationMax} min
                                                </span>

                                                {stage.anesthesia && (
                                                    <span style={S.metaBadge("rgba(168,85,247,0.1)", "#a855f7")}>
                                                        <Syringe size={12} /> Znieczulenie
                                                    </span>
                                                )}

                                                {stage.discomfortAfter && (
                                                    <span style={S.metaBadge("rgba(251,191,36,0.1)", "#fbbf24")}>
                                                        <AlertCircle size={12} /> Możliwy dyskomfort
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Gap indicator between stages */}
                                        {stage.gapLabel && stage.gapLabel !== "gotowe ✓" && i < result.stages.length - 1 && (
                                            <div style={S.stageGap}>
                                                <ChevronRight size={12} />
                                                Przerwa: {stage.gapLabel}
                                            </div>
                                        )}

                                        {stage.gapLabel === "gotowe ✓" && (
                                            <div style={{
                                                ...S.stageGap,
                                                color: "var(--color-primary)",
                                                fontWeight: 600,
                                                borderLeftColor: "var(--color-primary)",
                                            }}>
                                                ✓ Koniec leczenia
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </RevealOnScroll>

                        {/* Extending factors */}
                        {result.extendingFactors.length > 0 && (
                            <RevealOnScroll animation="fade-up" delay={200}>
                                <div style={S.factorsSection}>
                                    <h3 style={S.factorTitle}>
                                        <Info size={18} /> Co może wydłużyć leczenie?
                                    </h3>
                                    {result.extendingFactors.map((factor, i) => (
                                        <div key={i} style={S.factorItem}>
                                            <Clock size={14} style={{ marginTop: "2px", flexShrink: 0, color: "var(--color-primary)" }} />
                                            {factor}
                                        </div>
                                    ))}
                                    <p style={{ ...S.microCopy, marginTop: "1rem", textAlign: "left" }}>
                                        To nie jest lista problemów — to transparentna informacja o tym, co wpływa na czas leczenia.
                                    </p>
                                </div>
                            </RevealOnScroll>
                        )}

                        {/* CTA Section */}
                        <RevealOnScroll animation="fade-up" delay={300}>
                            <div style={S.ctaSection}>
                                <p style={{
                                    fontSize: "0.92rem",
                                    color: "var(--color-text-muted)",
                                    textAlign: "center",
                                    marginBottom: "0.5rem",
                                }}>
                                    Potwierdzimy dokładny plan po badaniu i diagnostyce
                                </p>

                                <Link href={`/rezerwacja?specialist=${result.recommendedSpecialist}&reason=${encodeURIComponent(`Kalkulator: ${result.label}`)}`} style={S.ctaPrimary}>
                                    <CalendarDays size={18} /> Umów konsultację
                                </Link>

                                {!showLeadForm && !leadSent && (
                                    <button style={S.ctaSecondary} onClick={() => setShowLeadForm(true)}>
                                        <Send size={16} /> Wyślij wynik do recepcji
                                    </button>
                                )}

                                {showLeadForm && !leadSent && (
                                    <div style={S.leadForm}>
                                        <input
                                            type="text"
                                            placeholder="Imię i nazwisko"
                                            value={leadName}
                                            onChange={e => setLeadName(e.target.value)}
                                            style={S.leadInput}
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Numer telefonu"
                                            value={leadPhone}
                                            onChange={e => setLeadPhone(e.target.value)}
                                            style={S.leadInput}
                                        />
                                        <button
                                            style={S.leadSubmit(!!leadName.trim() && !!leadPhone.trim() && !leadSending)}
                                            onClick={submitLead}
                                            disabled={!leadName.trim() || !leadPhone.trim() || leadSending}
                                        >
                                            <Send size={14} />
                                            {leadSending ? "Wysyłanie..." : "Wyślij do recepcji"}
                                        </button>
                                        <p style={{ ...S.microCopy, textAlign: "center" }}>
                                            Oddzwonimy z proponowanym planem leczenia
                                        </p>
                                    </div>
                                )}

                                {leadSent && (
                                    <div style={{
                                        padding: "1rem",
                                        background: "rgba(16,185,129,0.1)",
                                        border: "1px solid rgba(16,185,129,0.3)",
                                        borderRadius: "var(--radius-md)",
                                        color: "#10b981",
                                        textAlign: "center",
                                        fontSize: "0.9rem",
                                    }}>
                                        ✅ Wysłano! Recepcja oddzwoni z planem leczenia.
                                    </div>
                                )}
                            </div>

                            <p style={S.disclaimer}>
                                ⚠️ Uwaga: To nie jest diagnoza ani wycena. Czas leczenia zależy od badania klinicznego,
                                diagnostyki obrazowej i indywidualnego procesu gojenia tkanek.
                            </p>
                        </RevealOnScroll>
                    </div>
                )}
            </div>
        </main>
    );
}
