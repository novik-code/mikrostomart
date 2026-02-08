"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, User, Loader2, Paperclip, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAssistant } from "@/context/AssistantContext";

// Pages where the teaser should be hidden (interactive tools)
const HIDDEN_PATHS = ["/mapa-bolu", "/symulator", "/cennik"];

interface Message {
    role: "user" | "assistant";
    content: string;
    image?: string;
}

const SUGGESTIONS = [
    "Jakie macie godziny otwarcia?",
    "Czy leczycie pod mikroskopem?",
    "Kto pracuje w klinice?",
    "Chcę umówić wizytę."
];

export default function AssistantTeaser() {
    const router = useRouter();
    const pathname = usePathname();
    const { isChatOpen, openChat, closeChat } = useAssistant();
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Dzień dobry! Jestem wirtualnym asystentem kliniki Mikrostomart. W czym mogę Ci pomóc?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isChatOpen) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }

        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
            const navigateMatch = lastMsg.content.match(/\[NAVIGATE:(.*?)\]/);
            if (navigateMatch) {
                const url = navigateMatch[1];
                setTimeout(() => {
                    router.push(url);
                }, 1500);
            }
        }
    }, [isChatOpen, messages, selectedImage, router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const sendMessage = async (text?: string) => {
        const contentToSend = text || input;
        if (!contentToSend.trim() && !selectedImage) return;

        const userMessage: Message = {
            role: "user",
            content: contentToSend,
            image: selectedImage || undefined
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setSelectedImage(null);
        setIsLoading(true);

        try {
            const apiMessage = {
                role: "user",
                content: userMessage.image
                    ? [
                        { type: "text", text: userMessage.content || "Przesyłam zdjęcie." },
                        { type: "image_url", image_url: { url: userMessage.image } }
                    ]
                    : userMessage.content
            };

            const historyForApi = messages.map(m => ({
                role: m.role,
                content: m.content.replace(/\[NAVIGATE:.*?\]/g, "")
            }));

            const apiMessages = [...historyForApi, apiMessage].slice(-10);

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages }),
            });
            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Przepraszam, błąd techniczny." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Błąd połączenia." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isChatOpen) {
            closeChat();
        } else {
            setIsVisible(false);
        }
    };

    const handleSuggestionClick = (suggestion: string | { label: string, action: string }) => {
        if (typeof suggestion === 'string') {
            sendMessage(suggestion);
        } else {
            if (suggestion.action === '/rezerwacja' || suggestion.action === '/cennik') {
                router.push(suggestion.action);
                if (isChatOpen) closeChat();
            } else {
                sendMessage(suggestion.label);
            }
        }
    };

    // Hide on interactive tool pages
    if (HIDDEN_PATHS.some(p => pathname?.startsWith(p))) return null;
    if (!isVisible && !isChatOpen) return null;

    return (
        <>
            {/* === SUBTLE FLOATING ICON (when chat is closed) === */}
            {!isChatOpen && (
                <button
                    onClick={openChat}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    aria-label="Otwórz asystenta AI"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '24px',
                        zIndex: 99999,
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        border: '2px solid rgba(220, 177, 74, 0.6)',
                        background: 'rgba(18, 20, 24, 0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isHovered
                            ? '0 0 20px rgba(220, 177, 74, 0.4), 0 8px 32px rgba(0,0,0,0.5)'
                            : '0 4px 16px rgba(0,0,0,0.4)',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: 'assistantPulse 3s ease-in-out infinite',
                    }}
                >
                    <MessageCircle
                        size={22}
                        color="#dcb14a"
                        style={{
                            transition: 'transform 0.3s ease',
                            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                        }}
                    />

                    {/* Tooltip on hover */}
                    {isHovered && (
                        <span style={{
                            position: 'absolute',
                            bottom: '60px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(18, 20, 24, 0.95)',
                            color: '#f0c975',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(220, 177, 74, 0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            pointerEvents: 'none',
                        }}>
                            Asystent AI 💬
                        </span>
                    )}

                    {/* Dismiss button (small X) */}
                    <button
                        onClick={handleDismiss}
                        style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '10px',
                            lineHeight: 1,
                            padding: 0,
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                        }}
                    >
                        ×
                    </button>
                </button>
            )}

            {/* === CHAT MODAL (when chat is open) === */}
            {isChatOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={closeChat}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 99998,
                        }}
                    />

                    {/* Chat Panel */}
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 99999,
                            width: '90vw',
                            maxWidth: '600px',
                            height: '80vh',
                            maxHeight: '700px',
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(18, 20, 24, 0.97)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(220, 177, 74, 0.3)',
                                borderRadius: '16px',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    border: '1px solid #dcb14a',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    flexShrink: 0,
                                }}>
                                    <Image src="/assistant-avatar.png" alt="AI" fill style={{ objectFit: 'cover', objectPosition: 'top' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ color: 'white', margin: 0, fontSize: '16px' }}>Wirtualny Asystent</h3>
                                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '11px' }}>Mikrostomart Opole</p>
                                </div>
                                <button
                                    onClick={closeChat}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {messages.map((msg, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        alignItems: 'flex-start', gap: '10px'
                                    }}>
                                        {msg.role === 'assistant' && (
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                overflow: 'hidden', position: 'relative', flexShrink: 0,
                                                border: '1px solid #dcb14a'
                                            }}>
                                                <Image src="/assistant-avatar.png" alt="AI" fill style={{ objectFit: 'cover' }} />
                                            </div>
                                        )}
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            backgroundColor: msg.role === 'user' ? '#dcb14a' : 'rgba(255,255,255,0.05)',
                                            color: msg.role === 'user' ? '#000' : '#e5e7eb',
                                            maxWidth: '80%',
                                            fontSize: '14px',
                                            lineHeight: '1.5'
                                        }}>
                                            {msg.image && (
                                                <img
                                                    src={msg.image}
                                                    alt="Uploaded"
                                                    style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                                                />
                                            )}
                                            {msg.content.replace(/\[NAVIGATE:.*?\]/g, '')}
                                        </div>
                                        {msg.role === 'user' && <User size={24} color="#9ca3af" />}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            overflow: 'hidden', position: 'relative', flexShrink: 0,
                                            border: '1px solid #dcb14a'
                                        }}>
                                            <Image src="/assistant-avatar.png" alt="AI" fill style={{ objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                            <Loader2 size={16} className="animate-spin" color="white" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                {/* Suggestions */}
                                {messages.length < 3 && (
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
                                        <button
                                            onClick={() => handleSuggestionClick({ label: "📅 Umów wizytę", action: "/rezerwacja" })}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px', border: '1px solid #dcb14a',
                                                background: '#dcb14a', color: 'black', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold'
                                            }}
                                        >
                                            📅 Umów wizytę
                                        </button>
                                        <button
                                            onClick={() => handleSuggestionClick({ label: "💰 Cennik", action: "/cennik" })}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
                                                background: 'transparent', color: '#d1d5db', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}
                                        >
                                            💰 Cennik
                                        </button>
                                        {SUGGESTIONS.map((s, i) => (
                                            <button key={i} onClick={() => handleSuggestionClick(s)} style={{
                                                padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)',
                                                background: 'transparent', color: '#d1d5db', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
                                            }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Image Preview */}
                                {selectedImage && (
                                    <div style={{
                                        padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px',
                                        marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={selectedImage} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                                            <span style={{ fontSize: '12px', color: '#d1d5db' }}>Zdjęcie dodane</span>
                                        </div>
                                        <button onClick={() => setSelectedImage(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '46px', height: '46px', borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            color: '#d1d5db'
                                        }}
                                    >
                                        <Paperclip size={20} />
                                    </button>
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                                        placeholder="Wpisz wiadomość..."
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={() => sendMessage(input)}
                                        disabled={isLoading || !input.trim()}
                                        style={{
                                            width: '46px', height: '46px', borderRadius: '8px', background: '#dcb14a',
                                            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            opacity: (isLoading || !input.trim()) ? 0.5 : 1
                                        }}
                                    >
                                        <Send size={20} color="black" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Pulse keyframes (injected once) */}
            <style jsx global>{`
                @keyframes assistantPulse {
                    0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 0 rgba(220, 177, 74, 0); }
                    50% { box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 6px rgba(220, 177, 74, 0.15); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
