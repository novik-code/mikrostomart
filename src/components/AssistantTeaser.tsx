"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, User, Bot, Loader2, Paperclip } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAssistant } from "@/context/AssistantContext";

interface Message {
    role: "user" | "assistant";
    content: string;
    image?: string; // Optional image data for display
}

const SUGGESTIONS = [
    "Jakie macie godziny otwarcia?",
    "Czy leczycie pod mikroskopem?",
    "Kto pracuje w klinice?",
    "Chcę umówić wizytę."
];

export default function AssistantTeaser() {
    const router = useRouter();
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
        // Show teaser after 5 seconds (delayed)
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll and handle commands
    useEffect(() => {
        if (isChatOpen) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }

        // Check last message for commands
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
            const navigateMatch = lastMsg.content.match(/\[NAVIGATE:(.*?)\]/);
            if (navigateMatch) {
                const url = navigateMatch[1];
                // Wait a moment for user to read then navigate
                setTimeout(() => {
                    router.push(url);
                    // Optional: Close chat on mobile?
                    // if (window.innerWidth < 768) closeChat(); 
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
            // Prepare messages for API
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
                content: m.content.replace(/\[NAVIGATE:.*?\]/g, "") // Clean history of commands
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
                if (isChatOpen) closeChat(); // Close chat on navigation
            } else {
                sendMessage(suggestion.label);
            }
        }
    };

    if (!isVisible && !isChatOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: isChatOpen ? '50%' : '130px',
                left: isChatOpen ? '50%' : '30px',
                transform: isChatOpen ? 'translate(-50%, -50%)' : 'none',
                bottom: 'auto',
                right: 'auto',
                zIndex: 99999,
                transition: 'all 0.5s ease',
                width: isChatOpen ? '90vw' : 'auto',
                maxWidth: isChatOpen ? '600px' : 'auto',
                height: isChatOpen ? '80vh' : 'auto',
                maxHeight: isChatOpen ? '700px' : 'auto',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundColor: isChatOpen ? 'rgba(18, 20, 24, 0.95)' : 'rgba(18, 20, 24, 0.7)', // More transparent when closed
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(220, 177, 74, 0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={() => !isChatOpen && setIsHovered(true)}
                onMouseLeave={() => !isChatOpen && setIsHovered(false)}
            >
                {/* === TEASER VIEW === */}
                {!isChatOpen && (
                    <div
                        onClick={openChat}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            padding: '24px 32px 24px 24px',
                            cursor: 'pointer',
                            minWidth: '340px',
                            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {/* Icon */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                border: '2px solid #dcb14a',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }}>
                                <Image src="/assistant-avatar.png" alt="AI" fill style={{ objectFit: 'cover', objectPosition: 'top' }} />
                            </div>
                            <div style={{
                                position: 'absolute', top: 0, right: 0, width: '14px', height: '14px',
                                backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid #121418'
                            }} />
                        </div>

                        {/* Text */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#ffffff', fontFamily: 'serif', fontSize: '20px', lineHeight: '1.2', marginBottom: '4px' }}>
                                Wirtualny Asystent
                            </span>
                            <span style={{ color: 'rgba(240, 201, 117, 0.9)', fontSize: '14px', fontWeight: 300 }}>
                                Służę pomocą 24/7.
                            </span>
                        </div>
                    </div>
                )}

                {/* === CHAT VIEW === */}
                {isChatOpen && (
                    <>
                        {/* Header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', gap: '15px'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                border: '1px solid #dcb14a',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Image src="/assistant-avatar.png" alt="AI" fill style={{ objectFit: 'cover', objectPosition: 'top' }} />
                            </div>
                            <div>
                                <h3 style={{ color: 'white', margin: 0, fontSize: '18px' }}>Wirtualny Asystent</h3>
                                <p style={{ color: '#9ca3af', margin: 0, fontSize: '12px' }}>Mikrostomart Opole</p>
                            </div>
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
                                        {/* Remove navigation tokens from display */}
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

                        {/* Input */}
                        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            {/* Suggestions */}
                            {messages.length < 3 && (
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '15px', paddingBottom: '5px' }}>
                                    {/* Quick Actions */}
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
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    marginBottom: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
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
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: '46px', height: '46px', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.1)',
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
                    </>
                )}

                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    style={{
                        position: 'absolute', top: '10px', right: '10px',
                        width: '30px', height: '30px', borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 10
                    }}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
