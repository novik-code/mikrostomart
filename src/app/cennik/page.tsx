"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import styles from "./cennik.module.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const QUICK_QUESTIONS = [
    "Ile kosztuje plomba?",
    "Cennik implantów",
    "Ile za higienizację?",
    "Wyrwanie zęba — cena",
    "Licówki porcelanowe",
    "Leczenie kanałowe pod mikroskopem",
];

const CATEGORIES = [
    { label: "🦷 Chirurgia", query: "Podaj cennik chirurgii i implantologii" },
    { label: "👑 Protetyka", query: "Podaj cennik protetyki i estetyki" },
    { label: "🧹 Higienizacja", query: "Ile kosztuje higienizacja?" },
    { label: "👶 Dzieci", query: "Cennik stomatologii dziecięcej" },
    { label: "✨ Ortodoncja", query: "Ile kosztuje ortodoncja nakładkowa?" },
];

export default function CennikPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Cześć! 👋 Jestem inteligentnym asystentem cennikowym Mikrostomart.\n\nZapytaj mnie o cenę dowolnego zabiegu — np. \"Ile kosztuje implant + korona?\" — a podam Ci orientacyjną wycenę.\n\nMożesz też wpisać pytanie lub podyktować je głosowo 🎤",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, [messages, isLoading]);

    // === SPEECH-TO-TEXT ===
    const startListening = useCallback(() => {
        const SpeechRecognitionAPI =
            typeof window !== "undefined"
                ? (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
                (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
                : null;

        if (!SpeechRecognitionAPI) {
            alert("Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj Chrome lub Edge.");
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = "pl-PL";
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setInput(transcript);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    // === TEXT-TO-SPEECH ===
    const speak = (text: string, msgIndex: number) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        // If already speaking this message, stop it
        if (isSpeaking && speakingMsgIdx === msgIndex) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setSpeakingMsgIdx(null);
            return;
        }

        // Cancel any currently speaking
        window.speechSynthesis.cancel();

        // Clean text from markdown/emojis for natural reading
        const cleanText = text
            .replace(/[*_~`#]/g, "")
            .replace(/\[.*?\]/g, "")
            .replace(/💰|🦷|👋|🎤|📞|📅|✅|❗|⚠️|😊|👑|🧹|👶|✨/g, "")
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "pl-PL";
        utterance.rate = 0.95;
        utterance.pitch = 1;

        // Try to find a Polish voice
        const voices = window.speechSynthesis.getVoices();
        const polishVoice = voices.find((v) => v.lang.startsWith("pl"));
        if (polishVoice) {
            utterance.voice = polishVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setSpeakingMsgIdx(msgIndex);
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setSpeakingMsgIdx(null);
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            setSpeakingMsgIdx(null);
        };

        window.speechSynthesis.speak(utterance);
    };

    // Load voices (needed for some browsers)
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.getVoices(); // trigger voice loading
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    // === SEND MESSAGE ===
    const sendMessage = async (text?: string) => {
        const contentToSend = text || input;
        if (!contentToSend.trim()) return;

        const userMessage: Message = { role: "user", content: contentToSend };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Focus back on input
        setTimeout(() => inputRef.current?.focus(), 50);

        try {
            const historyForApi = messages
                .slice(-8)
                .map((m) => ({ role: m.role, content: m.content }));

            const response = await fetch("/api/cennik-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...historyForApi, { role: "user", content: contentToSend }],
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "Przepraszam, wystąpił błąd techniczny. Spróbuj ponownie lub zadzwoń: 570-270-470." },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Błąd połączenia. Sprawdź internet lub zadzwoń: 570-270-470." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <main className={styles.cennikPage}>
            <div className="container">
                {/* Hero */}
                <div className={styles.hero}>
                    <h1 className={styles.heroTitle}>
                        Cennik <span className={styles.heroAccent}>Inteligentny</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Zapytaj o cenę zabiegu — nasz asystent AI poda Ci orientacyjną wycenę i policzy łączny koszt.
                    </p>
                </div>

                {/* Category Pills */}
                <div className={styles.categoriesRow}>
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={i}
                            className={styles.categoryPill}
                            onClick={() => sendMessage(cat.query)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Chat Container */}
                <div className={styles.chatContainer}>
                    {/* Header */}
                    <div className={styles.chatHeader}>
                        <span className={styles.chatHeaderIcon}>💰</span>
                        <div>
                            <h2 className={styles.chatHeaderTitle}>Asystent Cennikowy</h2>
                            <p className={styles.chatHeaderSubtitle}>Mikrostomart · Orientacyjne ceny</p>
                        </div>
                        <div className={styles.onlineBadge} />
                    </div>

                    {/* Messages */}
                    <div className={styles.messagesArea}>
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`${styles.messageRow} ${msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant
                                    }`}
                            >
                                {msg.role === "assistant" && (
                                    <span className={styles.avatarIcon}>🦷</span>
                                )}
                                <div>
                                    <div
                                        className={`${styles.messageBubble} ${msg.role === "user"
                                                ? styles.messageBubbleUser
                                                : styles.messageBubbleAssistant
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                    {/* TTS Button for assistant messages */}
                                    {msg.role === "assistant" && index > 0 && (
                                        <button
                                            className={`${styles.ttsButton} ${isSpeaking && speakingMsgIdx === index
                                                    ? styles.ttsButtonActive
                                                    : ""
                                                }`}
                                            onClick={() => speak(msg.content, index)}
                                            title={
                                                isSpeaking && speakingMsgIdx === index
                                                    ? "Zatrzymaj odczytywanie"
                                                    : "Odczytaj na głos"
                                            }
                                        >
                                            {isSpeaking && speakingMsgIdx === index ? (
                                                <>
                                                    <VolumeX size={12} /> Stop
                                                </>
                                            ) : (
                                                <>
                                                    <Volume2 size={12} /> Odczytaj
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <span className={styles.avatarIcon}>👤</span>
                                )}
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isLoading && (
                            <div className={styles.typingIndicator}>
                                <span className={styles.avatarIcon}>🦷</span>
                                <div className={styles.typingDots}>
                                    <div className={styles.typingDot} />
                                    <div className={styles.typingDot} />
                                    <div className={styles.typingDot} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions (show only at start) */}
                    {messages.length < 3 && (
                        <div className={styles.suggestionsRow}>
                            {QUICK_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    className={styles.suggestionChip}
                                    onClick={() => sendMessage(q)}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className={styles.inputArea}>
                        <button
                            className={`${styles.iconButton} ${styles.micButton} ${isListening ? styles.micButtonActive : ""
                                }`}
                            onClick={toggleListening}
                            title={isListening ? "Zatrzymaj nagrywanie" : "Dyktuj pytanie"}
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <input
                            ref={inputRef}
                            className={styles.textInput}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isListening ? "Słucham... mów teraz" : "Zapytaj o cenę zabiegu..."}
                        />
                        <button
                            className={`${styles.iconButton} ${styles.sendButton}`}
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className={styles.disclaimer}>
                    <p className={styles.disclaimerText}>
                        ⚠️ Podane ceny są orientacyjne. Ostateczny koszt ustala lekarz po konsultacji. Aby umówić wizytę zadzwoń: 570-270-470
                    </p>
                </div>
            </div>
        </main>
    );
}
