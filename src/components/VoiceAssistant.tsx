'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Mic, MicOff, Settings, Link, Unlink, Volume2, VolumeX,
    CheckCircle, AlertCircle, ChevronDown, ChevronUp, X, Loader2,
    ListTodo, CalendarPlus, Bell, FileText, Search, CalendarDays
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface Message {
    role: 'user' | 'assistant';
    content: string;
    action?: {
        name: string;
        args: Record<string, any>;
        result: { success: boolean; message: string; data?: any };
    } | null;
    timestamp: Date;
}

interface VoiceAssistantProps {
    userId: string;
    userEmail: string;
}

// ─── Quick Action Chips ──────────────────────────────────────

const QUICK_ACTIONS = [
    { icon: ListTodo, label: 'Zadanie', prompt: 'Utwórz nowe zadanie' },
    { icon: CalendarPlus, label: 'Kalendarz', prompt: 'Dodaj wydarzenie do kalendarza' },
    { icon: Bell, label: 'Przypomnienie', prompt: 'Przypomnij mi' },
    { icon: FileText, label: 'Dokumentacja', prompt: 'Podyktuj dokumentację' },
    { icon: Search, label: 'Pacjent', prompt: 'Wyszukaj pacjenta' },
    { icon: CalendarDays, label: 'Grafik', prompt: 'Pokaż dzisiejszy grafik' },
];

// ─── Component ───────────────────────────────────────────────

export default function VoiceAssistant({ userId, userEmail }: VoiceAssistantProps) {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [statusText, setStatusText] = useState('Dotknij, aby mówić');
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Refs — these avoid stale closure issues
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finalTranscriptRef = useRef('');
    const messagesRef = useRef<Message[]>([]);        // ← mirror of messages state
    const isProcessingRef = useRef(false);             // ← mirror of isProcessing
    const voiceEnabledRef = useRef(true);              // ← mirror of voiceEnabled
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const sendingRef = useRef(false);                  // ← prevent double-send

    // Keep refs in sync with state
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
    useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

    // ─── Wake Lock (prevent screen auto-lock) ────────────────
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('[VoiceAssistant] Wake lock acquired');
            }
        } catch (err) {
            console.log('[VoiceAssistant] Wake lock failed:', err);
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        try {
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
                console.log('[VoiceAssistant] Wake lock released');
            }
        } catch { /* ignore */ }
    }, []);

    // Release wake lock on unmount
    useEffect(() => {
        return () => { releaseWakeLock(); };
    }, [releaseWakeLock]);

    // ─── Speech Synthesis ────────────────────────────────────
    const speakText = useCallback((text: string) => {
        if (!voiceEnabledRef.current || typeof window === 'undefined') return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pl-PL';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const plVoice = voices.find(v => v.lang.startsWith('pl'));
        if (plVoice) utterance.voice = plVoice;
        window.speechSynthesis.speak(utterance);
    }, []);

    // ─── Calendar Status ─────────────────────────────────────
    const checkCalendarStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/calendar/auth');
            if (res.ok) {
                const data = await res.json();
                setCalendarConnected(data.connected);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        checkCalendarStatus();
        if (typeof window !== 'undefined') {
            window.speechSynthesis.getVoices();
        }
    }, [checkCalendarStatus]);

    // ─── Send Message (uses refs to avoid stale closures) ────
    const doSendMessage = useCallback(async (messageText: string) => {
        if (!messageText || isProcessingRef.current || sendingRef.current) return;

        sendingRef.current = true;
        setInputText('');
        setIsProcessing(true);
        setStatusText('Myślę...');
        setInterimTranscript('');

        const userMessage: Message = {
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        // Use ref for current messages to avoid stale closure
        const currentMessages = [...messagesRef.current, userMessage];
        setMessages(currentMessages);

        try {
            const res = await fetch('/api/employee/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: currentMessages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!res.ok) throw new Error('API error');

            const data = await res.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.reply || 'Przepraszam, nie mogę teraz odpowiedzieć.',
                action: data.action,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            setStatusText('Dotknij, aby mówić');

            if (data.reply) speakText(data.reply);
        } catch {
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            setStatusText('Dotknij, aby mówić');
        } finally {
            setIsProcessing(false);
            sendingRef.current = false;
        }
    }, [speakText]);

    // Wrapper for text input / quick actions
    const sendMessage = useCallback(async (text?: string) => {
        const messageText = text || inputText.trim();
        if (messageText) doSendMessage(messageText);
    }, [inputText, doSendMessage]);

    // ─── Speech Recognition ──────────────────────────────────
    const startListening = useCallback(() => {
        if (isProcessingRef.current) return;
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatusText('Przeglądarka nie wspiera rozpoznawania mowy');
            return;
        }

        // Stop any existing recognition
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }

        // Request wake lock to prevent screen from turning off
        requestWakeLock();

        const recognition = new SpeechRecognition();
        recognition.lang = 'pl-PL';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;
        finalTranscriptRef.current = '';
        sendingRef.current = false;

        recognition.onstart = () => {
            setIsListening(true);
            setStatusText('Słucham...');
            setInterimTranscript('');
        };

        recognition.onresult = (event: any) => {
            let interim = '';
            let finalText = '';
            for (let i = 0; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }
            if (finalText) {
                finalTranscriptRef.current = finalText;
            }
            const displayText = (finalTranscriptRef.current + interim).trim();
            if (displayText) {
                setInterimTranscript(displayText);
            }

            // Reset silence timer — auto-send after 2.5s of silence
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                const fullText = finalTranscriptRef.current.trim();
                if (fullText && !sendingRef.current) {
                    sendingRef.current = true;
                    try { recognition.stop(); } catch { /* ignore */ }
                    setIsListening(false);
                    releaseWakeLock();
                    doSendMessage(fullText);
                }
            }, 2500);
        };

        recognition.onerror = (event: any) => {
            console.log('[VoiceAssistant] Recognition error:', event.error);
            // Don't reset on 'no-speech' — just keep listening
            if (event.error === 'no-speech') {
                return;
            }
            setIsListening(false);
            setStatusText('Dotknij, aby mówić');
            releaseWakeLock();
        };

        recognition.onend = () => {
            // DON'T clear silence timer here — let it fire if it's pending
            // Only update listening state if not already sending
            if (!sendingRef.current) {
                setIsListening(false);
                releaseWakeLock();
                // If there's accumulated text that wasn't sent, send it now
                const fullText = finalTranscriptRef.current.trim();
                if (fullText) {
                    doSendMessage(fullText);
                }
            }
        };

        recognition.start();
    }, [requestWakeLock, releaseWakeLock, doSendMessage]);

    const stopListening = useCallback(() => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }

        const fullText = finalTranscriptRef.current.trim();
        if (fullText && !sendingRef.current) {
            sendingRef.current = true;
            doSendMessage(fullText);
        }

        setIsListening(false);
        setInterimTranscript('');
        setStatusText('Dotknij, aby mówić');
        releaseWakeLock();
    }, [doSendMessage, releaseWakeLock]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // ─── Quick Action ────────────────────────────────────────
    const handleQuickAction = useCallback((prompt: string) => {
        setInputText(prompt);
        startListening();
    }, [startListening]);

    // Auto-scroll history
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get the latest assistant message for display
    const latestAssistant = messages.length > 0
        ? [...messages].reverse().find(m => m.role === 'assistant')
        : null;
    const latestUser = messages.length > 0
        ? [...messages].reverse().find(m => m.role === 'user')
        : null;

    // ─── Connect Google Calendar ─────────────────────────────
    const connectCalendar = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/calendar/auth');
            if (res.ok) {
                const data = await res.json();
                if (data.authUrl) {
                    window.location.href = data.authUrl;
                }
            }
        } catch { /* ignore */ }
    }, []);

    const disconnectCalendar = useCallback(async () => {
        await fetch('/api/employee/calendar/auth', { method: 'DELETE' });
        setCalendarConnected(false);
    }, []);

    // ─── Render ──────────────────────────────────────────────
    return (
        <div style={styles.container}>
            {/* Settings Toggle */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                style={styles.settingsBtn}
                title="Ustawienia"
            >
                <Settings size={18} />
            </button>

            {/* Settings Panel */}
            {showSettings && (
                <div style={styles.settingsPanel}>
                    <div style={styles.settingsRow}>
                        <span style={styles.settingsLabel}>Odpowiedzi głosowe</span>
                        <button
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            style={{
                                ...styles.toggleBtn,
                                background: voiceEnabled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                            }}
                        >
                            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                    </div>
                    <div style={styles.settingsRow}>
                        <span style={styles.settingsLabel}>
                            Google Calendar {calendarConnected ? '✅' : '❌'}
                        </span>
                        {calendarConnected ? (
                            <button onClick={disconnectCalendar} style={styles.disconnectBtn}>
                                <Unlink size={14} /> Rozłącz
                            </button>
                        ) : (
                            <button onClick={connectCalendar} style={styles.connectBtn}>
                                <Link size={14} /> Połącz
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ SIRI-STYLE MAIN AREA ═══ */}
            <div style={styles.mainArea}>
                {/* Latest response display */}
                {latestAssistant && !isListening && !isProcessing && (
                    <div style={styles.responseArea}>
                        {latestAssistant.action && (
                            <div style={{
                                ...styles.actionBadge,
                                background: latestAssistant.action.result.success
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                borderColor: latestAssistant.action.result.success
                                    ? 'rgba(34, 197, 94, 0.3)'
                                    : 'rgba(239, 68, 68, 0.3)',
                            }}>
                                {latestAssistant.action.result.success
                                    ? <CheckCircle size={14} style={{ color: '#22c55e' }} />
                                    : <AlertCircle size={14} style={{ color: '#ef4444' }} />
                                }
                                <span style={styles.actionBadgeText}>
                                    {latestAssistant.action.name === 'createTask' ? 'Zadanie utworzone' :
                                        latestAssistant.action.name === 'addCalendarEvent' ? 'Dodano do kalendarza' :
                                            latestAssistant.action.name === 'addReminder' ? 'Przypomnienie ustawione' :
                                                latestAssistant.action.name === 'dictateDocumentation' ? 'Dokumentacja wysłana' :
                                                    latestAssistant.action.name === 'searchPatient' ? 'Wyniki wyszukiwania' :
                                                        latestAssistant.action.name === 'checkSchedule' ? 'Grafik' :
                                                            latestAssistant.action.name}
                                </span>
                            </div>
                        )}
                        <p style={styles.responseText}>{latestAssistant.content}</p>
                        {latestUser && (
                            <p style={styles.userContext}>Ty: „{latestUser.content}"</p>
                        )}
                    </div>
                )}

                {/* Interim transcript while listening */}
                {isListening && interimTranscript && (
                    <div style={styles.transcriptArea}>
                        <p style={styles.transcriptText}>{interimTranscript}</p>
                    </div>
                )}

                {/* Processing state */}
                {isProcessing && (
                    <div style={styles.processingArea}>
                        <Loader2 size={24} style={{ color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
                        <p style={styles.processingText}>Przetwarzam...</p>
                        {latestUser && (
                            <p style={styles.processingUserText}>„{latestUser.content}"</p>
                        )}
                    </div>
                )}

                {/* ═══ THE ORB ═══ */}
                <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    style={{
                        ...styles.orb,
                        ...(isListening ? styles.orbListening : {}),
                        ...(isProcessing ? styles.orbProcessing : {}),
                    }}
                    aria-label={isListening ? 'Zatrzymaj nasłuchiwanie' : 'Rozpocznij nasłuchiwanie'}
                >
                    {/* Pulse rings */}
                    {isListening && (
                        <>
                            <span style={{ ...styles.pulseRing, animationDelay: '0s' }} />
                            <span style={{ ...styles.pulseRing, animationDelay: '0.5s' }} />
                            <span style={{ ...styles.pulseRing, animationDelay: '1s' }} />
                        </>
                    )}
                    <span style={styles.orbInner}>
                        {isListening
                            ? <MicOff size={32} style={{ color: '#fff' }} />
                            : isProcessing
                                ? <Loader2 size={32} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                                : <Mic size={32} style={{ color: '#fff' }} />
                        }
                    </span>
                </button>

                {/* Status text below orb */}
                <p style={styles.statusText}>
                    {isListening && !interimTranscript ? 'Słucham... mów teraz' : statusText}
                </p>
            </div>

            {/* ═══ QUICK ACTION CHIPS ═══ */}
            <div style={styles.chipsContainer}>
                {QUICK_ACTIONS.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.prompt)}
                        style={styles.chip}
                        disabled={isProcessing || isListening}
                    >
                        <action.icon size={14} />
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══ TEXT INPUT (compact) ═══ */}
            <div style={styles.inputRow}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Lub wpisz polecenie..."
                    style={styles.textInput}
                    disabled={isProcessing || isListening}
                />
                {inputText.trim() && (
                    <button onClick={() => sendMessage()} style={styles.sendBtn} disabled={isProcessing}>
                        →
                    </button>
                )}
            </div>

            {/* ═══ HISTORY TOGGLE ═══ */}
            {messages.length > 0 && (
                <div style={styles.historySection}>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        style={styles.historyToggle}
                    >
                        {showHistory ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span>Historia ({messages.length})</span>
                    </button>

                    {showHistory && (
                        <div style={styles.historyList}>
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    style={{
                                        ...styles.historyItem,
                                        ...(msg.role === 'user' ? styles.historyUser : styles.historyAssistant),
                                    }}
                                >
                                    <span style={styles.historyRole}>
                                        {msg.role === 'user' ? '🗣️' : '🤖'}
                                    </span>
                                    <span style={styles.historyContent}>
                                        {msg.content?.substring(0, 120)}{(msg.content?.length || 0) > 120 ? '...' : ''}
                                    </span>
                                    {msg.action?.result && (
                                        <span style={{
                                            ...styles.historyActionDot,
                                            background: msg.action.result.success ? '#22c55e' : '#ef4444',
                                        }} />
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            )}

            {/* ═══ CSS ANIMATIONS ═══ */}
            <style jsx global>{`
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes orb-glow {
                    0%, 100% { box-shadow: 0 0 30px rgba(56,189,248,0.3), 0 0 60px rgba(56,189,248,0.1); }
                    50% { box-shadow: 0 0 50px rgba(56,189,248,0.5), 0 0 100px rgba(56,189,248,0.2); }
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `}</style>
        </div>
    );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '70vh',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        padding: '16px 20px 24px',
        position: 'relative',
    },

    // Settings
    settingsBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '6px 8px',
        color: '#9ca3af',
        cursor: 'pointer',
        zIndex: 10,
    },
    settingsPanel: {
        position: 'absolute',
        top: 44,
        right: 12,
        background: 'rgba(30,30,36,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 20,
        minWidth: 220,
    },
    settingsRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    settingsLabel: {
        fontSize: 13,
        color: '#d1d5db',
    },
    toggleBtn: {
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        padding: '4px 8px',
        color: '#d1d5db',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    connectBtn: {
        background: 'rgba(56,189,248,0.15)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: 6,
        padding: '4px 10px',
        color: '#38bdf8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
    },
    disconnectBtn: {
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 6,
        padding: '4px 10px',
        color: '#ef4444',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
    },

    // Main area — centered vertically
    mainArea: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
        maxWidth: 480,
        gap: 16,
        padding: '20px 0',
    },

    // Response display
    responseArea: {
        textAlign: 'center',
        maxWidth: 400,
        animation: 'breathe 3s ease-in-out infinite',
    },
    responseText: {
        fontSize: 16,
        color: '#e5e7eb',
        lineHeight: '1.6',
        margin: 0,
        whiteSpace: 'pre-wrap',
    },
    userContext: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
        fontStyle: 'italic',
    },
    actionBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 20,
        border: '1px solid',
        marginBottom: 10,
        fontSize: 12,
    },
    actionBadgeText: {
        color: '#d1d5db',
        fontWeight: 500,
    },

    // Transcript
    transcriptArea: {
        textAlign: 'center',
        maxWidth: 400,
    },
    transcriptText: {
        fontSize: 18,
        color: '#38bdf8',
        fontWeight: 500,
        margin: 0,
        minHeight: 28,
    },

    // Processing
    processingArea: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
    },
    processingText: {
        fontSize: 14,
        color: '#6b7280',
        margin: 0,
    },
    processingUserText: {
        fontSize: 13,
        color: '#4b5563',
        margin: 0,
        fontStyle: 'italic',
        maxWidth: 300,
        textAlign: 'center',
    },

    // The Orb
    orb: {
        position: 'relative',
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 50%, #164e63 100%)',
        border: '2px solid rgba(56,189,248,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 30px rgba(56,189,248,0.2), 0 4px 20px rgba(0,0,0,0.4)',
        flexShrink: 0,
    },
    orbListening: {
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
        borderColor: 'rgba(239,68,68,0.5)',
        boxShadow: '0 0 40px rgba(239,68,68,0.3), 0 4px 20px rgba(0,0,0,0.4)',
        animation: 'orb-glow 2s ease-in-out infinite',
    },
    orbProcessing: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    orbInner: {
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Pulse rings
    pulseRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        border: '2px solid rgba(239,68,68,0.4)',
        animation: 'pulse-ring 1.5s ease-out infinite',
        top: 0,
        left: 0,
    },

    // Status
    statusText: {
        fontSize: 13,
        color: '#6b7280',
        margin: 0,
        textAlign: 'center',
    },

    // Quick Action Chips
    chipsContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        maxWidth: 420,
        marginTop: 4,
    },
    chip: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 14px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#9ca3af',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },

    // Text input
    inputRow: {
        display: 'flex',
        gap: 8,
        width: '100%',
        maxWidth: 420,
        marginTop: 12,
    },
    textInput: {
        flex: 1,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '8px 16px',
        color: '#e5e7eb',
        fontSize: 13,
        outline: 'none',
    },
    sendBtn: {
        background: 'rgba(56,189,248,0.15)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: '50%',
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#38bdf8',
        cursor: 'pointer',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // History
    historySection: {
        width: '100%',
        maxWidth: 420,
        marginTop: 16,
    },
    historyToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        color: '#6b7280',
        fontSize: 12,
        cursor: 'pointer',
        padding: '4px 0',
        width: '100%',
        justifyContent: 'center',
    },
    historyList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        maxHeight: 200,
        overflowY: 'auto',
        marginTop: 8,
        padding: '0 4px',
    },
    historyItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: '1.4',
    },
    historyUser: {
        background: 'rgba(255,255,255,0.03)',
    },
    historyAssistant: {
        background: 'rgba(56,189,248,0.04)',
    },
    historyRole: {
        flexShrink: 0,
        fontSize: 12,
    },
    historyContent: {
        color: '#9ca3af',
        flex: 1,
    },
    historyActionDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        flexShrink: 0,
        marginTop: 4,
    },
};
