"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { brandI18nParams } from '@/lib/brandConfig';
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./cennik.module.css";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function CennikPage() {
    const t = useTranslations('cennik');

    const QUICK_QUESTIONS = [
        t('quickQ1'), t('quickQ2'), t('quickQ3'),
        t('quickQ4'), t('quickQ5'), t('quickQ6'),
    ];

    const CATEGORIES = [
        { label: t('cat1'), query: t('cat1q') },
        { label: t('cat2'), query: t('cat2q') },
        { label: t('cat3'), query: t('cat3q') },
        { label: t('cat4'), query: t('cat4q') },
        { label: t('cat5'), query: t('cat5q') },
    ];

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: t('welcomeMessage', brandI18nParams()),
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
            alert(t('speechNotSupported'));
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
    }, [t]);

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

        if (isSpeaking && speakingMsgIdx === msgIndex) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setSpeakingMsgIdx(null);
            return;
        }

        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(/[*_~`#]/g, "")
            .replace(/\[.*?\]/g, "")
            .replace(/💰|🦷|👋|🎤|📞|📅|✅|❗|⚠️|😊|👑|🧹|👶|✨/g, "")
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "pl-PL";
        utterance.rate = 0.95;
        utterance.pitch = 1;

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

    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.getVoices();
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
                    { role: "assistant", content: t('errorTechnical') },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: t('errorConnection') },
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
                        {t('heroTitle')} <span className={styles.heroAccent}>{t('heroAccent')}</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        {t('heroSubtitle')}
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
                            <h2 className={styles.chatHeaderTitle}>{t('chatTitle')}</h2>
                            <p className={styles.chatHeaderSubtitle}>{t('chatSubtitle', brandI18nParams())}</p>
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
                                                    ? t('stopSpeech')
                                                    : t('readAloud')
                                            }
                                        >
                                            {isSpeaking && speakingMsgIdx === index ? (
                                                <>
                                                    <VolumeX size={12} /> {t('stopLabel')}
                                                </>
                                            ) : (
                                                <>
                                                    <Volume2 size={12} /> {t('readLabel')}
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
                            title={isListening ? t('stopRecording') : t('dictateQuestion')}
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <input
                            ref={inputRef}
                            className={styles.textInput}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isListening ? t('placeholderListening') : t('placeholderDefault')}
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
                        {t('disclaimer')}
                    </p>
                </div>
            </div>
        </main>
    );
}
