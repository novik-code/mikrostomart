"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Mic, MicOff, Send, Bot, ClipboardList, Calendar, Bell,
    FileText, Search, LayoutGrid, Settings, Wifi, WifiOff, Volume2,
    VolumeX, Loader2, CheckCircle2, XCircle, Sparkles
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface Message {
    role: "user" | "assistant";
    content: string;
    action?: {
        name: string;
        args: Record<string, any>;
        result: {
            success: boolean;
            action: string;
            message: string;
            data?: Record<string, any>;
        };
    } | null;
    timestamp: Date;
}

interface FeatureTile {
    id: string;
    icon: any;
    title: string;
    description: string;
    prompt: string;
    color: string;
}

interface VoiceAssistantProps {
    userId: string;
    userEmail: string;
}

// ─── Feature Tiles Config ────────────────────────────────────

const FEATURE_TILES: FeatureTile[] = [
    {
        id: "task",
        icon: ClipboardList,
        title: "Nowe Zadanie",
        description: "Stwórz zadanie w systemie gabinetowym",
        prompt: "Chcę stworzyć nowe zadanie.",
        color: "#38bdf8",
    },
    {
        id: "calendar",
        icon: Calendar,
        title: "Kalendarz Google",
        description: "Dodaj wydarzenie do kalendarza",
        prompt: "Chcę dodać wydarzenie do kalendarza Google.",
        color: "#a78bfa",
    },
    {
        id: "reminder",
        icon: Bell,
        title: "Przypomnienie",
        description: "Ustaw przypomnienie z powiadomieniem",
        prompt: "Chcę ustawić przypomnienie.",
        color: "#fbbf24",
    },
    {
        id: "documentation",
        icon: FileText,
        title: "Dokumentacja",
        description: "Podyktuj tekst — AI go przetworzy i wyśle mailem",
        prompt: "Chcę podyktować tekst do dokumentacji.",
        color: "#34d399",
    },
    {
        id: "patient",
        icon: Search,
        title: "Wyszukaj Pacjenta",
        description: "Sprawdź dane pacjenta w Prodentis",
        prompt: "Chcę wyszukać pacjenta.",
        color: "#f472b6",
    },
    {
        id: "schedule",
        icon: LayoutGrid,
        title: "Dzisiejszy Grafik",
        description: "Sprawdź wizyty na dziś",
        prompt: "Pokaż dzisiejszy grafik wizyt.",
        color: "#fb923c",
    },
];

// ─── Component ───────────────────────────────────────────────

export default function VoiceAssistant({ userId, userEmail }: VoiceAssistantProps) {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
    const [calendarAuthUrl, setCalendarAuthUrl] = useState<string | null>(null);
    const [interimTranscript, setInterimTranscript] = useState("");

    // Refs
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ─── Init ────────────────────────────────────────────────

    useEffect(() => {
        // Check speech recognition support
        const SpeechRecognitionAPI =
            typeof window !== "undefined"
                ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                : null;

        setSpeechSupported(!!SpeechRecognitionAPI);

        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.lang = "pl-PL";
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let interim = "";
                let finalTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interim += transcript;
                    }
                }

                setInterimTranscript(interim);

                if (finalTranscript) {
                    setInputText(prev => (prev ? prev + " " : "") + finalTranscript.trim());
                    setInterimTranscript("");
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                if (event.error !== "no-speech" && event.error !== "aborted") {
                    console.error("[Voice] Recognition error:", event.error);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        // Check calendar connection status
        checkCalendarStatus();

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { /* ignore */ }
            }
        };
    }, []);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ─── Calendar Status ─────────────────────────────────────

    const checkCalendarStatus = async () => {
        try {
            const res = await fetch("/api/employee/calendar/auth");
            if (res.ok) {
                const data = await res.json();
                setCalendarConnected(data.connected);
                setCalendarEmail(data.email || null);
                setCalendarAuthUrl(data.authUrl || null);
            }
        } catch { /* ignore */ }
    };

    // ─── Voice Controls ──────────────────────────────────────

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setInterimTranscript("");
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.error("[Voice] Start error:", err);
            }
        }
    }, [isListening]);

    const speakText = useCallback((text: string) => {
        if (!voiceEnabled || typeof window === "undefined") return;

        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(/[*#_`]/g, "")
            .replace(/\n+/g, ". ")
            .substring(0, 500);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "pl-PL";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a Polish voice
        const voices = window.speechSynthesis.getVoices();
        const polishVoice = voices.find(v => v.lang.startsWith("pl"));
        if (polishVoice) utterance.voice = polishVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled]);

    // ─── Send Message ────────────────────────────────────────

    const sendMessage = useCallback(async (text?: string) => {
        const messageText = (text || inputText).trim();
        if (!messageText || isProcessing) return;

        // Stop listening while processing
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        const userMessage: Message = {
            role: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText("");
        setInterimTranscript("");
        setIsProcessing(true);

        try {
            // Build conversation history for the API
            const history = [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content,
            }));

            const res = await fetch("/api/employee/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history }),
            });

            if (!res.ok) throw new Error("API error");

            const data = await res.json();

            const assistantMessage: Message = {
                role: "assistant",
                content: data.reply || "Przepraszam, nie udało mi się przetworzyć Twojej prośby.",
                action: data.action,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            speakText(data.reply || "");
        } catch (err) {
            console.error("[Assistant] Send error:", err);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: "Przepraszam, wystąpił błąd. Spróbuj ponownie.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsProcessing(false);
        }
    }, [inputText, isProcessing, isListening, messages, speakText]);

    const handleTileClick = (tile: FeatureTile) => {
        sendMessage(tile.prompt);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ─── Action Result Icon ──────────────────────────────────

    const getActionIcon = (actionName: string) => {
        switch (actionName) {
            case "createTask": return <ClipboardList size={16} />;
            case "addCalendarEvent": return <Calendar size={16} />;
            case "addReminder": return <Bell size={16} />;
            case "dictateDocumentation": return <FileText size={16} />;
            case "searchPatient": return <Search size={16} />;
            case "checkSchedule": return <LayoutGrid size={16} />;
            default: return <Bot size={16} />;
        }
    };

    // ─── Render ──────────────────────────────────────────────

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 180px)",
            padding: "1.5rem 2rem",
            gap: "1.5rem",
        }}>
            {/* ═══ Feature Tiles ═══ */}
            {messages.length === 0 && (
                <div style={{ flex: "0 0 auto" }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        marginBottom: "1.25rem",
                    }}>
                        <Sparkles size={24} style={{ color: "#dcb14a" }} />
                        <h2 style={{
                            margin: 0,
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "#f3f4f6",
                        }}>
                            Asystent AI — Co mogę dla Ciebie zrobić?
                        </h2>
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: "1rem",
                    }}>
                        {FEATURE_TILES.map(tile => {
                            const Icon = tile.icon;
                            return (
                                <button
                                    key={tile.id}
                                    onClick={() => handleTileClick(tile)}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.75rem",
                                        padding: "1.25rem",
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                                        e.currentTarget.style.borderColor = tile.color;
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = `0 8px 24px ${tile.color}20`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "10px",
                                        background: `${tile.color}15`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                        <Icon size={20} style={{ color: tile.color }} />
                                    </div>
                                    <div>
                                        <div style={{
                                            fontWeight: 600,
                                            fontSize: "0.95rem",
                                            color: "#f3f4f6",
                                            marginBottom: "4px",
                                        }}>
                                            {tile.title}
                                        </div>
                                        <div style={{
                                            fontSize: "0.8rem",
                                            color: "#9ca3af",
                                            lineHeight: 1.4,
                                        }}>
                                            {tile.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Settings toggle */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "1.25rem",
                        padding: "0.75rem 1rem",
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <Settings size={16} style={{ color: "#9ca3af" }} />
                            <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                                Google Calendar:&nbsp;
                                {calendarConnected ? (
                                    <span style={{ color: "#34d399" }}>
                                        <Wifi size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                                        {calendarEmail || "Połączono"}
                                    </span>
                                ) : (
                                    <span style={{ color: "#f87171" }}>
                                        <WifiOff size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                                        Niepołączono
                                    </span>
                                )}
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            {!calendarConnected && calendarAuthUrl && (
                                <a
                                    href={calendarAuthUrl}
                                    style={{
                                        padding: "0.4rem 0.8rem",
                                        background: "rgba(56, 189, 248, 0.15)",
                                        color: "#38bdf8",
                                        border: "1px solid rgba(56, 189, 248, 0.3)",
                                        borderRadius: "6px",
                                        fontSize: "0.8rem",
                                        textDecoration: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    Połącz
                                </a>
                            )}
                            {calendarConnected && (
                                <button
                                    onClick={async () => {
                                        await fetch("/api/employee/calendar/auth", { method: "DELETE" });
                                        setCalendarConnected(false);
                                        setCalendarEmail(null);
                                    }}
                                    style={{
                                        padding: "0.4rem 0.8rem",
                                        background: "rgba(248, 113, 113, 0.1)",
                                        color: "#f87171",
                                        border: "1px solid rgba(248, 113, 113, 0.2)",
                                        borderRadius: "6px",
                                        fontSize: "0.8rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    Rozłącz
                                </button>
                            )}
                            <button
                                onClick={() => setVoiceEnabled(v => !v)}
                                style={{
                                    padding: "0.4rem 0.6rem",
                                    background: "transparent",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    color: voiceEnabled ? "#34d399" : "#9ca3af",
                                }}
                                title={voiceEnabled ? "Wyłącz odpowiedzi głosowe" : "Włącz odpowiedzi głosowe"}
                            >
                                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Conversation Area ═══ */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                paddingRight: "0.5rem",
            }}>
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                            gap: "0.5rem",
                        }}
                    >
                        {msg.role === "assistant" && (
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: "8px",
                                background: "linear-gradient(135deg, #dcb14a 0%, #a68531 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: 2,
                            }}>
                                <Bot size={18} style={{ color: "#000" }} />
                            </div>
                        )}
                        <div style={{
                            maxWidth: "75%",
                            padding: "0.75rem 1rem",
                            borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                            background: msg.role === "user"
                                ? "rgba(56, 189, 248, 0.12)"
                                : "rgba(255,255,255,0.04)",
                            border: msg.role === "user"
                                ? "1px solid rgba(56, 189, 248, 0.2)"
                                : "1px solid rgba(255,255,255,0.06)",
                            color: "#f3f4f6",
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                        }}>
                            {msg.content}

                            {/* Action Result Card */}
                            {msg.action && msg.action.result && (
                                <div style={{
                                    marginTop: "0.75rem",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "8px",
                                    background: msg.action.result.success
                                        ? "rgba(52, 211, 153, 0.08)"
                                        : "rgba(248, 113, 113, 0.08)",
                                    border: `1px solid ${msg.action.result.success
                                        ? "rgba(52, 211, 153, 0.2)"
                                        : "rgba(248, 113, 113, 0.2)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    fontSize: "0.8rem",
                                }}>
                                    {msg.action.result.success
                                        ? <CheckCircle2 size={16} style={{ color: "#34d399", flexShrink: 0 }} />
                                        : <XCircle size={16} style={{ color: "#f87171", flexShrink: 0 }} />
                                    }
                                    <span style={{
                                        color: msg.action.result.success ? "#34d399" : "#f87171",
                                    }}>
                                        {getActionIcon(msg.action.name)}
                                    </span>
                                    <span style={{ color: "#d1d5db" }}>
                                        {msg.action.result.success ? "Wykonano" : "Błąd"}: {msg.action.name.replace(/([A-Z])/g, " $1").trim()}
                                    </span>
                                </div>
                            )}

                            <div style={{
                                fontSize: "0.7rem",
                                color: "#6b7280",
                                marginTop: "0.4rem",
                                textAlign: msg.role === "user" ? "right" : "left",
                            }}>
                                {msg.timestamp.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Processing indicator */}
                {isProcessing && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                    }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #dcb14a 0%, #a68531 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <Bot size={18} style={{ color: "#000" }} />
                        </div>
                        <div style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "12px 12px 12px 2px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: "#9ca3af",
                            fontSize: "0.85rem",
                        }}>
                            <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                            Przetwarzam...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ═══ Input Area ═══ */}
            <div style={{
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
            }}>
                {/* Microphone button */}
                {speechSupported && (
                    <button
                        onClick={toggleListening}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: "12px",
                            border: "none",
                            background: isListening
                                ? "rgba(239, 68, 68, 0.2)"
                                : "rgba(56, 189, 248, 0.1)",
                            color: isListening ? "#ef4444" : "#38bdf8",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.3s",
                            flexShrink: 0,
                            boxShadow: isListening ? "0 0 20px rgba(239, 68, 68, 0.3)" : "none",
                            animation: isListening ? "pulse 2s infinite" : "none",
                        }}
                        title={isListening ? "Zatrzymaj nagrywanie" : "Zacznij mówić"}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                )}

                {/* Text input */}
                <div style={{ flex: 1, position: "relative" }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isListening
                                ? (interimTranscript || "Słucham... mów teraz")
                                : "Napisz lub powiedz coś do asystenta..."
                        }
                        disabled={isProcessing}
                        style={{
                            width: "100%",
                            padding: "0.6rem 0.75rem",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#f3f4f6",
                            fontSize: "0.9rem",
                        }}
                    />
                    {isListening && interimTranscript && (
                        <div style={{
                            position: "absolute",
                            bottom: "100%",
                            left: 0,
                            right: 0,
                            padding: "0.4rem 0.75rem",
                            background: "rgba(0,0,0,0.8)",
                            borderRadius: "8px",
                            color: "#9ca3af",
                            fontSize: "0.8rem",
                            fontStyle: "italic",
                            marginBottom: "4px",
                        }}>
                            {interimTranscript}...
                        </div>
                    )}
                </div>

                {/* Send button */}
                <button
                    onClick={() => sendMessage()}
                    disabled={!inputText.trim() || isProcessing}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        border: "none",
                        background: inputText.trim() && !isProcessing
                            ? "linear-gradient(135deg, #dcb14a 0%, #a68531 100%)"
                            : "rgba(255,255,255,0.05)",
                        color: inputText.trim() && !isProcessing ? "#000" : "#6b7280",
                        cursor: inputText.trim() && !isProcessing ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        flexShrink: 0,
                    }}
                >
                    {isProcessing ? (
                        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                        <Send size={18} />
                    )}
                </button>
            </div>

            {/* Keyframe animation for pulse and spin */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.5); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
