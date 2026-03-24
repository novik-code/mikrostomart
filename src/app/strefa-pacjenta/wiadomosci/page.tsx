'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useTranslations, useLocale } from 'next-intl';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import { usePatientAuth } from '@/hooks/usePatientAuth';

interface Message {
    id: string;
    conversation_id: string;
    sender_role: 'patient' | 'reception';
    sender_name: string;
    content: string;
    read: boolean;
    created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function PatientChat() {
    const { patient, isLoading: isAuthLoading, getAuthToken } = usePatientAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const t = useTranslations('chat');
    const locale = useLocale();

    const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '';
    const patientId = patient?.supabaseId || patient?.id || '';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = useCallback(async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch('/api/patients/chat', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to load');

            const data = await res.json();
            setMessages(data.messages || []);
            setConversationId(data.conversationId);
        } catch (err) {
            console.error('Chat load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    useEffect(() => {
        if (isAuthLoading) return;
        loadMessages();
    }, [isAuthLoading, loadMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Supabase Realtime subscription
    useEffect(() => {
        if (!conversationId) return;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const channel = supabase.channel(`chat-patient-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;

        const token = getAuthToken();
        if (!token) return;

        setIsSending(true);
        const messageContent = newMessage.trim();
        setNewMessage('');

        try {
            const res = await fetch('/api/patients/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: messageContent }),
            });

            if (!res.ok) throw new Error('Failed to send');

            const data = await res.json();

            // If this was the first message, we now have a conversationId
            if (!conversationId && data.message?.conversation_id) {
                setConversationId(data.message.conversation_id);
            }

            // Add message locally (realtime will also add it, dedup handles it)
            setMessages((prev) => {
                if (prev.some(m => m.id === data.message.id)) return prev;
                return [...prev, data.message];
            });
        } catch (err) {
            console.error('Send error:', err);
            setNewMessage(messageContent); // Restore message on error
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        const time = d.toLocaleTimeString(locale === 'ua' ? 'uk-UA' : locale === 'pl' ? 'pl-PL' : locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' });

        if (msgDay.getTime() === today.getTime()) {
            return time;
        }

        return `${d.toLocaleDateString(locale === 'ua' ? 'uk-UA' : locale === 'pl' ? 'pl-PL' : locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit' })} ${time}`;
    };

    if (isAuthLoading || isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.9rem',
            }}>
                {t('loading')}
            </div>
        );
    }

    const suggestions = [
        t('suggestion1'),
        t('suggestion2'),
        t('suggestion3'),
        t('suggestion4'),
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - 200px)',
        }}>
            {/* Push Notification Prompt */}
            {patientId && (
                <PushNotificationPrompt
                    userType="patient"
                    userId={patientId}
                    locale={locale}
                />
            )}

            {/* Chat Area */}
            <div style={{
                flex: 1,
                maxWidth: '800px',
                width: '100%',
                margin: '0 auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
            }}>
                {/* Chat Header */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem 1rem 0 0',
                    padding: '1.25rem 1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                        }}>
                            🏥
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>
                                {t('receptionTitle')}
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', margin: 0 }}>
                                {t('workingHours')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderTop: 'none',
                    borderBottom: 'none',
                    padding: '1.5rem',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 400px)',
                    minHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}>
                    {messages.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                                {t('writeToUs')}
                            </p>
                            <p style={{ fontSize: '0.85rem' }}>
                                {t('emptyHint')}
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.sender_role === 'patient' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div style={{
                                    maxWidth: '75%',
                                    padding: '0.875rem 1.25rem',
                                    borderRadius: msg.sender_role === 'patient'
                                        ? '1rem 1rem 0.25rem 1rem'
                                        : '1rem 1rem 1rem 0.25rem',
                                    background: msg.sender_role === 'patient'
                                        ? 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.25), rgba(var(--color-primary-rgb), 0.15))'
                                        : 'rgba(255, 255, 255, 0.08)',
                                    border: msg.sender_role === 'patient'
                                        ? '1px solid rgba(var(--color-primary-rgb), 0.3)'
                                        : '1px solid rgba(255, 255, 255, 0.12)',
                                }}>
                                    {msg.sender_role === 'reception' && (
                                        <div style={{
                                            fontSize: '0.7rem',
                                            color: '#60a5fa',
                                            fontWeight: 'bold',
                                            marginBottom: '0.25rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {t('reception')}
                                        </div>
                                    )}
                                    <p style={{
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5',
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}>
                                        {msg.content}
                                    </p>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: 'rgba(255, 255, 255, 0.35)',
                                        marginTop: '0.5rem',
                                        textAlign: msg.sender_role === 'patient' ? 'right' : 'left',
                                    }}>
                                        {formatTime(msg.created_at)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0 0 1rem 1rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-end',
                }}>
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={t('placeholder')}
                        rows={1}
                        style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '0.75rem',
                            padding: '0.875rem 1rem',
                            color: '#fff',
                            fontSize: '0.95rem',
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            minHeight: '44px',
                            maxHeight: '120px',
                        }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending}
                        style={{
                            padding: '0.875rem 1.5rem',
                            background: (!newMessage.trim() || isSending)
                                ? 'rgba(var(--color-primary-rgb), 0.3)'
                                : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                            border: 'none',
                            borderRadius: '0.75rem',
                            color: (!newMessage.trim() || isSending) ? 'rgba(0,0,0,0.3)' : '#000',
                            fontWeight: 'bold',
                            cursor: (!newMessage.trim() || isSending) ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {isSending ? t('sending') : t('send')}
                    </button>
                </div>

                {/* Quick suggestions */}
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        justifyContent: 'center',
                    }}>
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => setNewMessage(suggestion)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '99px',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.15)';
                                    e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.3)';
                                    e.currentTarget.style.color = 'var(--color-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                                }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
