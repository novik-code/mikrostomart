"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
    CATEGORIES, COMPARATORS, PRIORITIES, METHODS, TABLE_ROW_LABELS,
    rankMethods, getRecommendationText,
    type Comparator, type ScoredMethod, type TableCell,
} from "./comparatorData";
import RevealOnScroll from "@/components/RevealOnScroll";
import {
    ArrowLeft, ArrowRight, Send, CalendarDays, ExternalLink,
    ChevronRight, Award, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {
    page: {
        minHeight: "100vh",
        background: "var(--color-background)",
        color: "var(--color-text)",
        paddingBottom: "4rem",
    } as React.CSSProperties,

    hero: {
        position: "relative" as const,
        textAlign: "center" as const,
        padding: "7rem 1.5rem 3rem",
        overflow: "hidden",
    } as React.CSSProperties,

    heroGradient: {
        position: "absolute" as const,
        inset: 0,
        background: "radial-gradient(ellipse at center top, rgba(168,85,247,0.08) 0%, transparent 60%)",
        pointerEvents: "none" as const,
    } as React.CSSProperties,

    heroIcon: {
        fontSize: "3rem",
        display: "block",
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    heroTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
        color: "#fff",
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    heroSub: {
        fontSize: "1rem",
        color: "var(--color-text-muted)",
        maxWidth: "520px",
        margin: "0 auto",
        lineHeight: 1.6,
    } as React.CSSProperties,

    microCopy: {
        fontSize: "0.78rem",
        color: "rgba(255,255,255,0.35)",
        lineHeight: 1.5,
    } as React.CSSProperties,

    container: {
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "0 20px",
    } as React.CSSProperties,

    // Tiles
    tilesGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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

    // Priority tiles
    priorityGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "0.75rem",
        marginTop: "2rem",
    } as React.CSSProperties,

    priorityTile: (color: string, isActive: boolean) => ({
        background: isActive ? `${color}15` : "var(--color-surface)",
        border: `1px solid ${isActive ? color : "rgba(255,255,255,0.06)"}`,
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.2rem",
        cursor: "pointer",
        transition: "all 0.25s ease",
        textAlign: "center" as const,
        transform: isActive ? "translateY(-2px)" : "none",
    }) as React.CSSProperties,

    // Questions
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

    optionBtn: (isActive: boolean) => ({
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.9rem 1.2rem",
        background: isActive ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? "#a855f7" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        color: isActive ? "#a855f7" : "var(--color-text)",
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
        background: done ? "#a855f7" : active ? "rgba(168,85,247,0.6)" : "rgba(255,255,255,0.15)",
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
        background: enabled ? "#a855f7" : "rgba(255,255,255,0.05)",
        border: "none",
        borderRadius: "var(--radius-md)",
        color: enabled ? "#fff" : "rgba(255,255,255,0.3)",
        cursor: enabled ? "pointer" : "not-allowed",
        fontSize: "0.9rem",
        fontWeight: 600,
        transition: "all 0.2s ease",
    }) as React.CSSProperties,

    // Results
    recommendationCard: {
        background: "rgba(168,85,247,0.06)",
        border: "1px solid rgba(168,85,247,0.2)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem 2rem",
        marginBottom: "2rem",
    } as React.CSSProperties,

    recTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.15rem",
        color: "#a855f7",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    recText: {
        fontSize: "0.95rem",
        color: "var(--color-text-muted)",
        lineHeight: 1.7,
    } as React.CSSProperties,

    // Table
    tableWrap: {
        overflowX: "auto" as const,
        marginTop: "1.5rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(255,255,255,0.06)",
    } as React.CSSProperties,

    table: {
        width: "100%",
        borderCollapse: "collapse" as const,
        fontSize: "0.88rem",
    } as React.CSSProperties,

    th: (color: string) => ({
        padding: "1rem 0.75rem",
        background: `${color}10`,
        borderBottom: `2px solid ${color}33`,
        fontFamily: "var(--font-heading)",
        color: color,
        fontSize: "0.95rem",
        textAlign: "center" as const,
        minWidth: "160px",
    }) as React.CSSProperties,

    thLabel: {
        padding: "0.75rem",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        textAlign: "left" as const,
        color: "var(--color-text-muted)",
        fontSize: "0.82rem",
        fontWeight: 600,
        minWidth: "130px",
        position: "relative" as const,
    } as React.CSSProperties,

    td: {
        padding: "0.75rem",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center" as const,
        verticalAlign: "top" as const,
        color: "var(--color-text)",
        lineHeight: 1.5,
    } as React.CSSProperties,

    // Scale bar
    scaleBar: {
        display: "flex",
        justifyContent: "center",
        gap: "3px",
        marginTop: "4px",
    } as React.CSSProperties,

    scaleSegment: (filled: boolean) => ({
        width: "14px",
        height: "6px",
        borderRadius: "3px",
        background: filled ? "#a855f7" : "rgba(255,255,255,0.1)",
        transition: "all 0.3s ease",
    }) as React.CSSProperties,

    // Cards (mobile)
    methodCard: (color: string) => ({
        background: "var(--color-surface)",
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-md)",
        padding: "1.25rem 1.5rem",
        marginBottom: "1rem",
    }) as React.CSSProperties,

    cardHeader: {
        fontFamily: "var(--font-heading)",
        fontSize: "1.1rem",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    cardRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "0.4rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        fontSize: "0.85rem",
    } as React.CSSProperties,

    // Badge
    badge: {
        display: "inline-flex",
        alignItems: "flex-start",
        gap: "6px",
        padding: "6px 10px",
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: "var(--radius-md)",
        color: "#f59e0b",
        fontSize: "0.8rem",
        lineHeight: 1.4,
        marginBottom: "0.4rem",
    } as React.CSSProperties,

    // Bullet sections
    bulletSection: {
        marginTop: "2rem",
        background: "var(--color-surface)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
    } as React.CSSProperties,

    bulletTitle: {
        fontFamily: "var(--font-heading)",
        fontSize: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "0.75rem",
    } as React.CSSProperties,

    bulletItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "0.35rem 0",
        fontSize: "0.85rem",
        color: "var(--color-text-muted)",
        lineHeight: 1.5,
    } as React.CSSProperties,

    // CTA
    ctaSection: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "1rem",
        marginTop: "2.5rem",
        padding: "2rem",
        background: "rgba(168,85,247,0.04)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(168,85,247,0.1)",
    } as React.CSSProperties,

    ctaPrimary: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "0.85rem 2rem",
        background: "#a855f7",
        color: "#fff",
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
        color: "#a855f7",
        border: "1px solid #a855f7",
        borderRadius: "var(--radius-md)",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        textDecoration: "none",
    } as React.CSSProperties,

    ctaTertiary: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "0.6rem 1.2rem",
        background: "transparent",
        color: "var(--color-text-muted)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "var(--radius-md)",
        fontSize: "0.85rem",
        cursor: "pointer",
        transition: "all 0.2s ease",
        textDecoration: "none",
    } as React.CSSProperties,

    disclaimer: {
        fontSize: "0.8rem",
        color: "rgba(255,255,255,0.35)",
        textAlign: "center" as const,
        maxWidth: "550px",
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
        background: enabled ? "#a855f7" : "rgba(255,255,255,0.05)",
        color: enabled ? "#fff" : "rgba(255,255,255,0.3)",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: enabled ? "pointer" : "not-allowed",
    }) as React.CSSProperties,

    // Rank badge
    rankBadge: (rank: number) => ({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: rank === 1 ? "rgba(212,175,55,0.2)" : rank === 2 ? "rgba(192,192,192,0.15)" : "rgba(205,127,50,0.12)",
        color: rank === 1 ? "#d4af37" : rank === 2 ? "#c0c0c0" : "#cd7f32",
        fontSize: "0.7rem",
        fontWeight: 700,
        flexShrink: 0,
    }) as React.CSSProperties,

    // Tooltip
    tooltipIcon: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.4)",
        fontSize: "0.65rem",
        fontWeight: 700,
        cursor: "help",
        marginLeft: "4px",
        flexShrink: 0,
    } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function ScaleBar({ value }: { value: number }) {
    return (
        <div style={S.scaleBar}>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={S.scaleSegment(i <= value)} />
            ))}
        </div>
    );
}

function CellContent({ cell }: { cell: TableCell }) {
    return (
        <div>
            <span>{cell.value}</span>
            {cell.scale !== undefined && <ScaleBar value={cell.scale} />}
        </div>
    );
}

function renderBold(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} style={{ color: "#fff" }}>{part}</strong> : part
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

type Step = "category" | "scenario" | "priority" | "questions" | "results";

export default function PorownywarkaPage() {
    const [step, setStep] = useState<Step>("category");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [comparator, setComparator] = useState<Comparator | null>(null);
    const [priority, setPriority] = useState<string>("");
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [hoveredTile, setHoveredTile] = useState<string | null>(null);

    // Lead form
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadName, setLeadName] = useState("");
    const [leadPhone, setLeadPhone] = useState("");
    const [leadSending, setLeadSending] = useState(false);
    const [leadSent, setLeadSent] = useState(false);

    // ── Ranking (memoised) ──
    const ranking = useMemo(() => {
        if (!comparator || !priority) return [];
        return rankMethods(comparator.id, priority, answers);
    }, [comparator, priority, answers]);

    const topMethod = ranking[0] ? METHODS[ranking[0].methodId] : null;

    // ── Use window width to decide table vs cards ──
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 700);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // ── Handlers ──
    const selectCategory = useCallback((catId: string) => {
        setSelectedCategory(catId);
        setComparator(null);
        setPriority("");
        setQuestionIndex(0);
        setAnswers({});
        setShowLeadForm(false);
        setLeadSent(false);
        setStep("scenario");
    }, []);

    const selectComparator = useCallback((c: Comparator) => {
        setComparator(c);
        setPriority("");
        setQuestionIndex(0);
        setAnswers({});
        setShowLeadForm(false);
        setLeadSent(false);
        setStep("priority");
    }, []);

    const selectPriority = useCallback((p: string) => {
        setPriority(p);
        setStep("questions");
        setQuestionIndex(0);
    }, []);

    const answerQuestion = useCallback((qId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
    }, []);

    const nextQuestion = useCallback(() => {
        if (!comparator) return;
        if (questionIndex < comparator.questions.length - 1) {
            setQuestionIndex(prev => prev + 1);
        } else {
            setStep("results");
        }
    }, [comparator, questionIndex]);

    const prevQuestion = useCallback(() => {
        if (questionIndex > 0) {
            setQuestionIndex(prev => prev - 1);
        } else {
            setStep("priority");
        }
    }, [questionIndex]);

    const resetAll = useCallback(() => {
        setStep("category");
        setSelectedCategory(null);
        setComparator(null);
        setPriority("");
        setQuestionIndex(0);
        setAnswers({});
        setShowLeadForm(false);
        setLeadSent(false);
    }, []);

    const filteredComparators = useMemo(() => {
        if (!selectedCategory) return COMPARATORS;
        return COMPARATORS.filter(c => c.categoryId === selectedCategory);
    }, [selectedCategory]);

    const currentCat = CATEGORIES.find(c => c.id === selectedCategory);

    const submitLead = useCallback(async () => {
        if (!leadName.trim() || !leadPhone.trim() || !comparator) return;
        setLeadSending(true);
        try {
            await fetch("/api/treatment-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "comparator_lead",
                    name: leadName.trim(),
                    phone: leadPhone.trim(),
                    service: `Porównywarka: ${comparator.title}`,
                    variant: `Priorytet: ${PRIORITIES.find(p => p.id === priority)?.label || priority}`,
                    visitsRange: "",
                    durationRange: "",
                    answers: Object.entries(answers).map(([k, v]) => {
                        const q = comparator.questions.find(q => q.id === k);
                        const opt = q?.options.find(o => o.value === v);
                        return `${q?.label || k}: ${opt?.label || v}`;
                    }),
                    ranking: ranking.slice(0, 3).map(r => ({
                        method: METHODS[r.methodId]?.label,
                        score: r.score,
                        badges: r.badges,
                    })),
                }),
            });
            setLeadSent(true);
        } catch {
            alert("Wystąpił błąd. Spróbuj ponownie lub zadzwoń: 77 454 14 14.");
        } finally {
            setLeadSending(false);
        }
    }, [leadName, leadPhone, comparator, priority, answers, ranking]);

    const currentQuestion = comparator?.questions[questionIndex];
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

    return (
        <main style={S.page}>
            {/* ── HERO ── */}
            <section style={S.hero}>
                <div style={S.heroGradient} />
                <span style={S.heroIcon}>⚖️</span>
                <h1 style={S.heroTitle}>Porównywarka rozwiązań</h1>
                <p style={S.heroSub}>
                    Poznaj różnice między metodami leczenia. Bez cen — tylko fakty, trade-offy i rekomendacja dopasowana do Twojego priorytetu.
                </p>
            </section>

            <div style={S.container}>

                {/* ═══ STEP 0: Category ═══ */}
                {step === "category" && (
                    <div>
                        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "#fff", textAlign: "center" }}>
                            Wybierz kategorię
                        </h2>
                        <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                            Jaki temat Cię interesuje?
                        </p>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                            gap: "1rem",
                            marginTop: "2rem",
                        }}>
                            {CATEGORIES.map(cat => (
                                <div
                                    key={cat.id}
                                    style={S.tile(cat.color, hoveredTile === cat.id)}
                                    onMouseEnter={() => setHoveredTile(cat.id)}
                                    onMouseLeave={() => setHoveredTile(null)}
                                    onClick={() => selectCategory(cat.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === "Enter" && selectCategory(cat.id)}
                                >
                                    <span style={{ fontSize: "2.2rem", display: "block", marginBottom: "0.5rem" }}>{cat.icon}</span>
                                    <div style={S.tileTitle}>{cat.title}</div>
                                    <div style={S.tileSub}>{cat.subtitle}</div>
                                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: "0.5rem" }}>
                                        {COMPARATORS.filter(c => c.categoryId === cat.id).length} porównań
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{ ...S.microCopy, textAlign: "center", marginTop: "2rem" }}>
                            To narzędzie ma charakter informacyjny i nie zastępuje badania lekarskiego.
                        </p>
                    </div>
                )}

                {/* ═══ STEP 1: Scenario ═══ */}
                {step === "scenario" && (
                    <div>
                        <button style={{ ...S.backBtn, marginBottom: "1rem" }} onClick={() => setStep("category")}>
                            <ArrowLeft size={14} /> Zmień kategorię
                        </button>
                        {currentCat && (
                            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                                <div style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    padding: "6px 14px", background: `${currentCat.color}15`,
                                    border: `1px solid ${currentCat.color}33`, borderRadius: "999px",
                                    fontSize: "0.82rem", color: currentCat.color,
                                }}>
                                    {currentCat.icon} {currentCat.title}
                                </div>
                            </div>
                        )}
                        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "#fff", textAlign: "center" }}>
                            Co chcesz porównać?
                        </h2>
                        <div style={S.tilesGrid}>
                            {filteredComparators.map(c => (
                                <div
                                    key={c.id}
                                    style={S.tile(c.color, hoveredTile === c.id)}
                                    onMouseEnter={() => setHoveredTile(c.id)}
                                    onMouseLeave={() => setHoveredTile(null)}
                                    onClick={() => selectComparator(c)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === "Enter" && selectComparator(c)}
                                >
                                    <span style={S.tileIcon}>{c.icon}</span>
                                    <div style={S.tileTitle}>{c.title}</div>
                                    <div style={S.tileSub}>{c.subtitle}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ STEP 2: Priority ═══ */}
                {step === "priority" && comparator && (
                    <div>
                        <button style={{ ...S.backBtn, marginBottom: "1rem" }} onClick={() => setStep("scenario")}>
                            <ArrowLeft size={14} /> Zmień scenariusz
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "6px 14px", background: `${comparator.color}15`,
                                border: `1px solid ${comparator.color}33`, borderRadius: "999px",
                                fontSize: "0.82rem", color: comparator.color, marginBottom: "1rem",
                            }}>
                                {comparator.icon} {comparator.title}
                            </div>
                            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "#fff" }}>
                                Co jest dla Ciebie najważniejsze?
                            </h2>
                        </div>

                        <div style={S.priorityGrid}>
                            {PRIORITIES.map(p => (
                                <div
                                    key={p.id}
                                    style={S.priorityTile(p.color, priority === p.id)}
                                    onClick={() => selectPriority(p.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => e.key === "Enter" && selectPriority(p.id)}
                                >
                                    <span style={{ fontSize: "1.5rem", display: "block", marginBottom: "0.5rem" }}>{p.emoji}</span>
                                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", color: "#fff", marginBottom: "0.2rem" }}>
                                        {p.label}
                                    </div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{p.sublabel}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ STEP 3: Questions ═══ */}
                {step === "questions" && comparator && currentQuestion && (
                    <div style={S.questionCard}>
                        <div style={S.progressDots}>
                            {comparator.questions.map((q, i) => (
                                <div key={q.id} style={S.dot(i === questionIndex, i < questionIndex)} />
                            ))}
                        </div>

                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            padding: "4px 12px", background: `${comparator.color}15`,
                            border: `1px solid ${comparator.color}33`, borderRadius: "999px",
                            fontSize: "0.78rem", color: comparator.color, marginBottom: "1.5rem",
                        }}>
                            {comparator.icon} {comparator.title}
                        </div>

                        <h2 style={S.questionText}>{currentQuestion.label}</h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
                                {questionIndex < comparator.questions.length - 1 ? "Dalej" : "Pokaż porównanie"}
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        <p style={{ ...S.microCopy, marginTop: "1rem" }}>
                            Pytanie {questionIndex + 1} z {comparator.questions.length}
                        </p>
                    </div>
                )}

                {/* ═══ STEP 4: Results ═══ */}
                {step === "results" && comparator && ranking.length > 0 && (
                    <div>
                        <button style={{ ...S.backBtn, marginBottom: "1.5rem" }} onClick={resetAll}>
                            <ArrowLeft size={14} /> Nowe porównanie
                        </button>

                        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "6px 14px", background: `${comparator.color}15`,
                                border: `1px solid ${comparator.color}33`, borderRadius: "999px",
                                fontSize: "0.82rem", color: comparator.color, marginBottom: "0.75rem",
                            }}>
                                {comparator.icon} {comparator.title} · {PRIORITIES.find(p => p.id === priority)?.label}
                            </div>
                            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", color: "#fff" }}>
                                Najlepsze dopasowanie do Twojego priorytetu
                            </h2>
                        </div>

                        {/* Recommendation */}
                        <RevealOnScroll animation="fade-up">
                            <div style={S.recommendationCard}>
                                <h3 style={S.recTitle}>
                                    <Award size={20} /> Rekomendacja
                                </h3>
                                <p style={S.recText}>
                                    {ranking[0] && renderBold(getRecommendationText(priority, ranking[0]))}
                                </p>
                                {ranking[0]?.badges.length > 0 && (
                                    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                        {ranking[0].badges.map((b, i) => (
                                            <div key={i} style={S.badge}>
                                                <AlertTriangle size={14} style={{ marginTop: "1px", flexShrink: 0 }} /> {b}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </RevealOnScroll>

                        {/* Comparison Table (desktop) / Cards (mobile) */}
                        <RevealOnScroll animation="fade-up" delay={100}>
                            {!isMobile ? (
                                /* ── Desktop Table ── */
                                <div style={S.tableWrap}>
                                    <table style={S.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...S.thLabel, background: "rgba(255,255,255,0.02)", borderBottom: "2px solid rgba(255,255,255,0.08)" }}></th>
                                                {ranking.map((r, rank) => {
                                                    const m = METHODS[r.methodId];
                                                    return (
                                                        <th key={r.methodId} style={S.th(m.color)}>
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                                                <span style={S.rankBadge(rank + 1)}>{rank + 1}</span>
                                                                <span>{m.icon}</span>
                                                                <span>{m.label}</span>
                                                            </div>
                                                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 400, marginTop: "4px" }}>
                                                                {m.short}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TABLE_ROW_LABELS.map(row => (
                                                <tr key={row.key}>
                                                    <td style={S.thLabel}>
                                                        {row.label}
                                                        <span
                                                            style={S.tooltipIcon}
                                                            title={row.tooltip}
                                                            aria-label={row.tooltip}
                                                        >?</span>
                                                    </td>
                                                    {ranking.map(r => {
                                                        const m = METHODS[r.methodId];
                                                        const cell = (m.table as unknown as Record<string, TableCell>)[row.key];
                                                        return (
                                                            <td key={r.methodId} style={S.td} title={cell.tooltip}>
                                                                <CellContent cell={cell} />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                /* ── Mobile Cards ── */
                                <div>
                                    {ranking.map((r, rank) => {
                                        const m = METHODS[r.methodId];
                                        return (
                                            <div key={r.methodId} style={S.methodCard(m.color)}>
                                                <div style={S.cardHeader}>
                                                    <span style={S.rankBadge(rank + 1)}>{rank + 1}</span>
                                                    <span>{m.icon}</span>
                                                    <span>{m.label}</span>
                                                </div>
                                                <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                                                    {m.short}
                                                </div>
                                                {TABLE_ROW_LABELS.map(row => {
                                                    const cell = (m.table as unknown as Record<string, TableCell>)[row.key];
                                                    return (
                                                        <div key={row.key} style={S.cardRow}>
                                                            <span style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
                                                            <span style={{ textAlign: "right" }}>
                                                                {cell.value}
                                                                {cell.scale !== undefined && <ScaleBar value={cell.scale} />}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {r.badges.length > 0 && (
                                                    <div style={{ marginTop: "0.75rem" }}>
                                                        {r.badges.map((b, i) => (
                                                            <div key={i} style={S.badge}>
                                                                <AlertTriangle size={12} style={{ marginTop: "1px", flexShrink: 0 }} /> {b}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </RevealOnScroll>

                        {/* Gating badges for non-top */}
                        {ranking.slice(1).some(r => r.badges.length > 0) && (
                            <RevealOnScroll animation="fade-up" delay={200}>
                                <div style={{ marginTop: "1rem" }}>
                                    {ranking.slice(1).map(r => {
                                        if (r.badges.length === 0) return null;
                                        const m = METHODS[r.methodId];
                                        return (
                                            <div key={r.methodId} style={{ marginBottom: "0.5rem" }}>
                                                <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
                                                    {m.icon} {m.label}:
                                                </div>
                                                {r.badges.map((b, i) => (
                                                    <div key={i} style={S.badge}>
                                                        <AlertTriangle size={12} style={{ marginTop: "1px", flexShrink: 0 }} /> {b}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </RevealOnScroll>
                        )}

                        {/* Works when / Not ideal when */}
                        <RevealOnScroll animation="fade-up" delay={200}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginTop: "2rem" }}>
                                {ranking.slice(0, 3).map(r => {
                                    const m = METHODS[r.methodId];
                                    return (
                                        <div key={r.methodId} style={S.bulletSection}>
                                            <h4 style={{ ...S.bulletTitle, color: m.color }}>
                                                {m.icon} {m.label}
                                            </h4>

                                            <div style={{ marginBottom: "0.75rem" }}>
                                                <div style={{ ...S.bulletTitle, fontSize: "0.85rem", color: "#10b981" }}>
                                                    <CheckCircle size={14} /> Kiedy się sprawdza
                                                </div>
                                                {m.table.worksWhen.map((item, i) => (
                                                    <div key={i} style={S.bulletItem}>
                                                        <ChevronRight size={12} style={{ marginTop: "3px", flexShrink: 0, color: "#10b981" }} />
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>

                                            <div>
                                                <div style={{ ...S.bulletTitle, fontSize: "0.85rem", color: "#f59e0b" }}>
                                                    <XCircle size={14} /> Kiedy nie jest idealne
                                                </div>
                                                {m.table.notIdealWhen.map((item, i) => (
                                                    <div key={i} style={S.bulletItem}>
                                                        <ChevronRight size={12} style={{ marginTop: "3px", flexShrink: 0, color: "#f59e0b" }} />
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </RevealOnScroll>

                        {/* CTA Section */}
                        <RevealOnScroll animation="fade-up" delay={300}>
                            <div style={S.ctaSection}>
                                <p style={{ fontSize: "0.92rem", color: "var(--color-text-muted)", textAlign: "center", marginBottom: "0.5rem" }}>
                                    Ostateczna kwalifikacja wymaga badania klinicznego i diagnostyki
                                </p>

                                {topMethod && (
                                    <Link
                                        href={`/rezerwacja?specialist=${topMethod.recommendedSpecialist}&reason=${encodeURIComponent(`Porównywarka: ${topMethod.label} (${PRIORITIES.find(p => p.id === priority)?.label})`)}`}
                                        style={S.ctaPrimary}
                                    >
                                        <CalendarDays size={18} /> Konsultacja kwalifikacyjna
                                    </Link>
                                )}

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

                                <Link href="/kalkulator-leczenia" style={S.ctaTertiary}>
                                    <ExternalLink size={14} /> Zobacz etapy i czas leczenia
                                </Link>
                            </div>

                            <p style={S.disclaimer}>
                                ⚠️ To nie jest diagnoza. Porównanie opiera się na typowych scenariuszach klinicznych. Ostateczna kwalifikacja wymaga badania lekarskiego, diagnostyki obrazowej i analizy indywidualnych warunków.
                            </p>
                        </RevealOnScroll>
                    </div>
                )}
            </div>
        </main>
    );
}
