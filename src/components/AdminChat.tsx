'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Conversation {
    id: string;
    patient_id: string;
    patient_name: string;
    status: string;
    last_message_at: string;
    unread_by_admin: boolean;
    lastMessage: string;
    lastMessageRole: string;
    lastMessageAt: string;
    unreadCount: number;
}

interface Message {
    id: string;
    conversation_id: string;
    sender_role: 'patient' | 'reception';
    sender_name: string;
    content: string;
    read: boolean;
    created_at: string;
}

// Admin panel labels — centralized for i18n. Admin panel is always PL.
const labels = {
    filterOpen: 'Aktywne',
    filterClosed: 'Zamknięte',
    loading: 'Ładowanie...',
    noConversations: 'Brak rozmów',
    selectConversation: 'Wybierz rozmowę z listy',
    chatWithPatient: 'Czat z pacjentem',
    closeConversation: 'Zamknij rozmowę',
    closeConfirm: 'Zamknąć tę rozmowę?',
    noMessages: 'Brak wiadomości',
    placeholder: 'Napisz odpowiedź...',
    send: '📤 Odpowiedz',
    sending: '⏳',
    now: 'teraz',
    minAgo: 'min temu',
    hAgo: 'h temu',
    dAgo: 'd temu',
    back: '← Wstecz',
};

export default function AdminChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newReply, setNewReply] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
    const [isMobile, setIsMobile] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Detect mobile viewport
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/chat/conversations?status=${statusFilter}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoadingConversations(false);
        }
    }, [statusFilter]);

    // Fetch messages for selected conversation
    const fetchMessages = useCallback(async (convId: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/admin/chat/messages?conversationId=${convId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        if (selectedConv) {
            fetchMessages(selectedConv);
        }
    }, [selectedConv, fetchMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Supabase Realtime — listen for new messages
    useEffect(() => {
        const channel = supabase.channel('admin-chat-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                },
                (payload) => {
                    const newMsg = payload.new as Message;

                    // If it's in the currently viewed conversation, add it
                    if (newMsg.conversation_id === selectedConv) {
                        setMessages((prev) => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    }

                    // Refresh conversation list to update previews and unread counts
                    fetchConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConv, supabase, fetchConversations]);

    // Send reply
    const handleSend = async () => {
        if (!newReply.trim() || !selectedConv || sending) return;

        setSending(true);
        const content = newReply.trim();
        setNewReply('');

        try {
            const res = await fetch('/api/admin/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: selectedConv, content }),
            });

            if (!res.ok) throw new Error('Failed to send');

            const data = await res.json();
            setMessages((prev) => {
                if (prev.some(m => m.id === data.message.id)) return prev;
                return [...prev, data.message];
            });

            // Refresh conversations to update last message preview
            fetchConversations();
        } catch (err) {
            console.error('Send error:', err);
            setNewReply(content);
        } finally {
            setSending(false);
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

        const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        if (msgDay.getTime() === today.getTime()) {
            return time;
        }

        return `${d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })} ${time}`;
    };

    const formatRelativeTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return labels.now;
        if (diffMin < 60) return `${diffMin} ${labels.minAgo}`;
        if (diffHrs < 24) return `${diffHrs}${labels.hAgo}`;
        return `${diffDays}${labels.dAgo}`;
    };

    // On mobile: show either the list or the thread, not both
    const showListOnMobile = isMobile && !selectedConv;
    const showThreadOnMobile = isMobile && !!selectedConv;

    return (
        <div style={{
            display: 'flex',
            gap: isMobile ? 0 : '1.5rem',
            height: 'calc(100vh - 200px)',
            minHeight: isMobile ? '400px' : '500px',
            flexDirection: isMobile ? 'column' : 'row',
        }}>
            {/* Left — Conversation List */}
            <div style={{
                width: isMobile ? '100%' : '320px',
                minWidth: isMobile ? undefined : '280px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-surface-hover)',
                display: showThreadOnMobile ? 'none' : 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flex: isMobile ? 1 : undefined,
            }}>
                {/* Filter Header */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--color-surface-hover)',
                    display: 'flex',
                    gap: '0.5rem',
                }}>
                    <button
                        onClick={() => setStatusFilter('open')}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            background: statusFilter === 'open' ? 'var(--color-primary)' : 'transparent',
                            color: statusFilter === 'open' ? '#000' : 'var(--color-text-muted)',
                            border: statusFilter === 'open' ? 'none' : '1px solid var(--color-surface-hover)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: statusFilter === 'open' ? 'bold' : 'normal',
                            fontSize: '0.85rem',
                        }}
                    >
                        {labels.filterOpen}
                    </button>
                    <button
                        onClick={() => setStatusFilter('closed')}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            background: statusFilter === 'closed' ? 'var(--color-primary)' : 'transparent',
                            color: statusFilter === 'closed' ? '#000' : 'var(--color-text-muted)',
                            border: statusFilter === 'closed' ? 'none' : '1px solid var(--color-surface-hover)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: statusFilter === 'closed' ? 'bold' : 'normal',
                            fontSize: '0.85rem',
                        }}
                    >
                        {labels.filterClosed}
                    </button>
                </div>

                {/* Conversation List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingConversations ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            {labels.loading}
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                            <p>{labels.noConversations}</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => {
                                    setSelectedConv(conv.id);
                                    // Mark as read in the list
                                    setConversations(prev =>
                                        prev.map(c => c.id === conv.id ? { ...c, unread_by_admin: false, unreadCount: 0 } : c)
                                    );
                                }}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1.25rem',
                                    background: selectedConv === conv.id
                                        ? 'rgba(var(--color-primary-rgb), 0.1)'
                                        : conv.unread_by_admin
                                            ? 'rgba(59, 130, 246, 0.05)'
                                            : 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid var(--color-surface-hover)',
                                    borderLeft: selectedConv === conv.id
                                        ? '3px solid var(--color-primary)'
                                        : '3px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.3rem',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{
                                        fontWeight: conv.unread_by_admin ? 'bold' : 'normal',
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                    }}>
                                        {conv.patient_name}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {conv.unreadCount > 0 && (
                                            <span style={{
                                                background: '#ef4444',
                                                color: '#fff',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                            }}>
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                        <span style={{
                                            color: 'var(--color-text-muted)',
                                            fontSize: '0.75rem',
                                        }}>
                                            {formatRelativeTime(conv.lastMessageAt)}
                                        </span>
                                    </div>
                                </div>
                                <p style={{
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.8rem',
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {conv.lastMessageRole === 'reception' ? '↩ ' : ''}
                                    {conv.lastMessage || '...'}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right — Message Thread */}
            <div style={{
                flex: 1,
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-surface-hover)',
                display: showListOnMobile ? 'none' : 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {!selectedConv ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: 'var(--color-text-muted)',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                        <p>{labels.selectConversation}</p>
                    </div>
                ) : (
                    <>
                        {/* Conversation Header */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--color-surface-hover)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {isMobile && (
                                    <button
                                        onClick={() => setSelectedConv(null)}
                                        style={{
                                            padding: '0.4rem 0.6rem',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--color-text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {labels.back}
                                    </button>
                                )}
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                }}>
                                    {conversations.find(c => c.id === selectedConv)?.patient_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h3 style={{ color: '#fff', fontSize: '1rem', margin: 0 }}>
                                        {conversations.find(c => c.id === selectedConv)?.patient_name || 'Pacjent'}
                                    </h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 0 }}>
                                        {labels.chatWithPatient}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!confirm(labels.closeConfirm)) return;
                                    // Close conversation via API
                                    try {
                                        await fetch(`/api/admin/chat/conversations`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ conversationId: selectedConv, status: 'closed' }),
                                        });
                                        setSelectedConv(null);
                                        fetchConversations();
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {labels.closeConversation}
                            </button>
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            {loadingMessages ? (
                                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                                    {labels.loading}
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                                    {labels.noMessages}
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.sender_role === 'reception' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <div style={{
                                            maxWidth: '70%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: msg.sender_role === 'reception'
                                                ? '1rem 1rem 0.25rem 1rem'
                                                : '1rem 1rem 1rem 0.25rem',
                                            background: msg.sender_role === 'reception'
                                                ? 'rgba(var(--color-primary-rgb), 0.15)'
                                                : 'rgba(255, 255, 255, 0.06)',
                                            border: msg.sender_role === 'reception'
                                                ? '1px solid rgba(var(--color-primary-rgb), 0.3)'
                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                        }}>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: msg.sender_role === 'reception' ? 'var(--color-primary)' : '#60a5fa',
                                                fontWeight: 'bold',
                                                marginBottom: '0.25rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}>
                                                {msg.sender_role === 'reception' ? `↩ ${msg.sender_name}` : `👤 ${msg.sender_name}`}
                                            </div>
                                            <p style={{
                                                color: '#fff',
                                                fontSize: '0.9rem',
                                                lineHeight: '1.5',
                                                margin: 0,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}>
                                                {msg.content}
                                            </p>
                                            <div style={{
                                                fontSize: '0.65rem',
                                                color: 'var(--color-text-muted)',
                                                marginTop: '0.4rem',
                                                textAlign: msg.sender_role === 'reception' ? 'right' : 'left',
                                            }}>
                                                {formatTime(msg.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--color-surface-hover)',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-end',
                        }}>
                            <textarea
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={labels.placeholder}
                                rows={1}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--color-surface-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '0.75rem 1rem',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    resize: 'none',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    minHeight: '40px',
                                    maxHeight: '100px',
                                }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newReply.trim() || sending}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: (!newReply.trim() || sending)
                                        ? 'rgba(var(--color-primary-rgb), 0.3)'
                                        : 'var(--color-primary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: (!newReply.trim() || sending) ? 'rgba(0,0,0,0.3)' : '#000',
                                    fontWeight: 'bold',
                                    cursor: (!newReply.trim() || sending) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {sending ? labels.sending : labels.send}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
