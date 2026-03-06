'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Send, Inbox, Star, Trash2, Search, RefreshCw, ChevronLeft, Paperclip, X, ArrowLeft, Reply, Forward, FileText } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface EmailListItem {
    uid: number;
    subject: string;
    from: { name: string; address: string };
    to: { name: string; address: string }[];
    date: string;
    snippet: string;
    isRead: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
    size: number;
}

interface EmailFull {
    uid: number;
    messageId: string;
    subject: string;
    from: { name: string; address: string };
    to: { name: string; address: string }[];
    cc: { name: string; address: string }[];
    date: string;
    html: string;
    text: string;
    isRead: boolean;
    isStarred: boolean;
    inReplyTo: string;
    references: string[];
    attachments: { filename: string; contentType: string; size: number; partId: string; contentId?: string }[];
}

interface FolderInfo {
    path: string;
    name: string;
    totalMessages: number;
    unseenMessages: number;
    specialUse?: string;
}

// ─── Constants ───────────────────────────────────────────────

const FOLDER_ICONS: Record<string, any> = {
    INBOX: <Inbox size={16} />,
    Sent: <Send size={16} />,
    Trash: <Trash2 size={16} />,
    Drafts: <FileText size={16} />,
};

const FOLDER_LABELS: Record<string, string> = {
    INBOX: 'Odebrane',
    Sent: 'Wysłane',
    'INBOX.Sent': 'Wysłane',
    Trash: 'Kosz',
    'INBOX.Trash': 'Kosz',
    Drafts: 'Szkice',
    'INBOX.Drafts': 'Szkice',
};

function getFolderIcon(path: string) {
    if (path.includes('Sent')) return <Send size={16} />;
    if (path.includes('Trash') || path.includes('Deleted')) return <Trash2 size={16} />;
    if (path.includes('Draft')) return <FileText size={16} />;
    if (path === 'INBOX') return <Inbox size={16} />;
    return <Mail size={16} />;
}

function getFolderLabel(path: string, name: string) {
    return FOLDER_LABELS[path] || name;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    }
    if (hours < 48) return 'wczoraj';
    if (hours < 168) {
        const days = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
        return days[date.getDay()];
    }
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function senderDisplay(from: { name: string; address: string }): string {
    return from.name || from.address.split('@')[0] || from.address;
}

// Sanitize HTML — remove scripts, on* attributes
function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

// ─── Component ───────────────────────────────────────────────

export default function EmailTab() {
    // State
    const [emails, setEmails] = useState<EmailListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFolder, setCurrentFolder] = useState('INBOX');
    const [folders, setFolders] = useState<FolderInfo[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Selected email
    const [selectedEmail, setSelectedEmail] = useState<EmailFull | null>(null);
    const [emailLoading, setEmailLoading] = useState(false);

    // Compose
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeCc, setComposeCc] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeInReplyTo, setComposeInReplyTo] = useState('');
    const [composeReferences, setComposeReferences] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success?: boolean; error?: string } | null>(null);

    // Unread count
    const [unreadCount, setUnreadCount] = useState(0);

    // Mobile
    const [showSidebar, setShowSidebar] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    // Refresh interval
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Detect mobile
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobileView(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // ─── Fetch emails ────────────────────────────────────────

    const fetchEmails = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                action: 'list',
                folder: currentFolder,
                page: String(page),
                pageSize: '30',
            });
            if (searchQuery) params.set('search', searchQuery);

            const res = await fetch(`/api/employee/email?${params}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setEmails(data.emails || []);
            setTotal(data.total || 0);
        } catch (err: any) {
            setError(err.message || 'Błąd połączenia');
        } finally {
            setLoading(false);
        }
    }, [currentFolder, page, searchQuery]);

    // ─── Fetch folders ───────────────────────────────────────

    const fetchFolders = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email?action=folders');
            if (!res.ok) return;
            const data = await res.json();
            setFolders(data.folders || []);
        } catch {
            // Ignore folder fetch errors
        }
    }, []);

    // ─── Fetch unread count ──────────────────────────────────

    const fetchUnread = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email?action=unread');
            if (!res.ok) return;
            const data = await res.json();
            setUnreadCount(data.count || 0);
        } catch {
            // Ignore
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    useEffect(() => {
        fetchFolders();
        fetchUnread();
    }, []);

    // Auto-refresh every 60s
    useEffect(() => {
        refreshIntervalRef.current = setInterval(() => {
            fetchEmails(true);
            fetchUnread();
        }, 60000);
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [fetchEmails, fetchUnread]);

    // ─── Open email ──────────────────────────────────────────

    const openEmail = async (uid: number) => {
        setEmailLoading(true);
        setSelectedEmail(null);
        try {
            const res = await fetch(`/api/employee/email?action=read&uid=${uid}&folder=${currentFolder}`);
            if (!res.ok) throw new Error('Nie udało się otworzyć wiadomości');
            const data = await res.json();
            setSelectedEmail(data);

            // Mark as read in the list
            setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isRead: true } : e));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEmailLoading(false);
        }
    };

    // ─── Toggle star ─────────────────────────────────────────

    const toggleStar = async (uid: number, currentStarred: boolean) => {
        const action = currentStarred ? 'unstar' : 'star';
        setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isStarred: !currentStarred } : e));
        try {
            await fetch('/api/employee/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action, folder: currentFolder }),
            });
        } catch {
            // Revert
            setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isStarred: currentStarred } : e));
        }
    };

    // ─── Toggle read/unread ──────────────────────────────────

    const toggleRead = async (uid: number, currentRead: boolean) => {
        const action = currentRead ? 'unread' : 'read';
        setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isRead: !currentRead } : e));
        try {
            await fetch('/api/employee/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action, folder: currentFolder }),
            });
        } catch {
            setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isRead: currentRead } : e));
        }
    };

    // ─── Move to trash ───────────────────────────────────────

    const trashEmail = async (uid: number) => {
        setEmails(prev => prev.filter(e => e.uid !== uid));
        if (selectedEmail?.uid === uid) setSelectedEmail(null);
        try {
            await fetch('/api/employee/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action: 'trash', folder: currentFolder }),
            });
        } catch {
            fetchEmails();
        }
    };

    // ─── Send email ──────────────────────────────────────────

    const handleSend = async () => {
        if (!composeTo || !composeSubject) return;
        setSending(true);
        setSendResult(null);
        try {
            const res = await fetch('/api/employee/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: composeTo,
                    cc: composeCc || undefined,
                    subject: composeSubject,
                    html: composeBody.replace(/\n/g, '<br>'),
                    inReplyTo: composeInReplyTo || undefined,
                    references: composeReferences.length ? composeReferences : undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSendResult({ success: true });
                setTimeout(() => {
                    setShowCompose(false);
                    resetCompose();
                }, 1500);
            } else {
                setSendResult({ error: data.error || 'Błąd wysyłania' });
            }
        } catch (err: any) {
            setSendResult({ error: err.message || 'Błąd połączenia' });
        } finally {
            setSending(false);
        }
    };

    const resetCompose = () => {
        setComposeTo('');
        setComposeCc('');
        setComposeSubject('');
        setComposeBody('');
        setComposeInReplyTo('');
        setComposeReferences([]);
        setSendResult(null);
    };

    // ─── Reply ───────────────────────────────────────────────

    const startReply = (email: EmailFull) => {
        setComposeTo(email.from.address);
        setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
        setComposeInReplyTo(email.messageId);
        setComposeReferences([...email.references, email.messageId].filter(Boolean));
        setComposeBody(`\n\n--- Oryginalna wiadomość ---\nOd: ${email.from.name || email.from.address}\nData: ${formatFullDate(email.date)}\n\n${email.text}`);
        setShowCompose(true);
    };

    const startForward = (email: EmailFull) => {
        setComposeTo('');
        setComposeSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
        setComposeBody(`\n\n--- Przekazana wiadomość ---\nOd: ${email.from.name || email.from.address} <${email.from.address}>\nData: ${formatFullDate(email.date)}\nTemat: ${email.subject}\n\n${email.text}`);
        setShowCompose(true);
    };

    // ─── Search ──────────────────────────────────────────────

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(1);
    };

    // ─── Folder change ───────────────────────────────────────

    const changeFolder = (path: string) => {
        setCurrentFolder(path);
        setPage(1);
        setSearchQuery('');
        setSearchInput('');
        setSelectedEmail(null);
        setShowSidebar(false);
    };

    // ─── Download attachment ─────────────────────────────────

    const downloadAttachment = async (uid: number, index: number, filename: string) => {
        try {
            const res = await fetch(`/api/employee/email?action=attachment&uid=${uid}&index=${index}&folder=${currentFolder}`);
            if (!res.ok) throw new Error('Błąd pobierania');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Nie udało się pobrać załącznika');
        }
    };

    // ─── Key: filter relevant folders ────────────────────────

    const relevantFolders = folders.filter(f => {
        const p = f.path.toLowerCase();
        return p === 'inbox' || p.includes('sent') || p.includes('trash') || p.includes('draft') || p.includes('deleted');
    });
    // Ensure at least INBOX
    if (relevantFolders.length === 0) {
        relevantFolders.push({ path: 'INBOX', name: 'INBOX', totalMessages: 0, unseenMessages: unreadCount });
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div style={{
            display: 'flex',
            height: 'calc(100vh - 120px)',
            overflow: 'hidden',
            position: 'relative',
        }}>
            {/* ─── SIDEBAR ─────────────────────────────────────── */}
            <div style={{
                width: isMobileView ? '100%' : 220,
                minWidth: isMobileView ? '100%' : 220,
                background: 'rgba(0,0,0,0.2)',
                borderRight: isMobileView ? 'none' : '1px solid rgba(255,255,255,0.06)',
                display: isMobileView ? (showSidebar ? 'flex' : 'none') : 'flex',
                flexDirection: 'column',
                padding: '1rem 0.75rem',
                gap: '0.25rem',
                position: isMobileView ? 'absolute' : 'relative',
                inset: isMobileView ? 0 : undefined,
                zIndex: isMobileView ? 100 : 1,
            }}>
                {/* Compose button */}
                <button
                    onClick={() => { setShowCompose(true); resetCompose(); setShowSidebar(false); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1rem',
                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                        border: 'none',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: '0.75rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 16px rgba(56,189,248,0.3)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(56,189,248,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(56,189,248,0.3)'; }}
                >
                    <Send size={16} />
                    Nowa wiadomość
                </button>

                {/* Folder list */}
                {relevantFolders.map(f => {
                    const isActive = currentFolder === f.path;
                    return (
                        <button
                            key={f.path}
                            onClick={() => changeFolder(f.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: isActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: isActive ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.82rem',
                                fontWeight: isActive ? 600 : 400,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                        >
                            {getFolderIcon(f.path)}
                            <span style={{ flex: 1 }}>{getFolderLabel(f.path, f.name)}</span>
                            {f.unseenMessages > 0 && (
                                <span style={{
                                    background: '#38bdf8',
                                    color: '#0a0a0a',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    minWidth: 18,
                                    textAlign: 'center',
                                }}>{f.unseenMessages}</span>
                            )}
                        </button>
                    );
                })}

                {isMobileView && (
                    <button
                        onClick={() => setShowSidebar(false)}
                        style={{
                            marginTop: 'auto',
                            padding: '0.6rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                        }}
                    >✕ Zamknij</button>
                )}
            </div>

            {/* ─── MAIN CONTENT ────────────────────────────────── */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Toolbar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.1)',
                    flexWrap: 'wrap',
                }}>
                    {isMobileView && (
                        <button
                            onClick={() => selectedEmail ? setSelectedEmail(null) : setShowSidebar(true)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.5rem',
                                color: 'rgba(255,255,255,0.7)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {selectedEmail ? <ArrowLeft size={16} /> : <Mail size={16} />}
                        </button>
                    )}

                    {/* Search */}
                    <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '0.35rem', minWidth: 150 }}>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '0 0.6rem',
                        }}>
                            <Search size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Szukaj wiadomości..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    padding: '0.4rem 0.5rem',
                                    fontSize: '0.82rem',
                                }}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem' }}
                                ><X size={14} /></button>
                            )}
                        </div>
                    </form>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchEmails()}
                        disabled={loading}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.4rem',
                            padding: '0.35rem 0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        title="Odśwież"
                    >
                        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>

                    {/* Folder name */}
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                        {getFolderLabel(currentFolder, currentFolder)} ({total})
                    </span>
                </div>

                {/* Content: Email List OR Email Reader */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {/* ─── EMAIL READER ──────────────────────────── */}
                    {selectedEmail ? (
                        <div style={{ padding: isMobileView ? '0.75rem' : '1.5rem', maxWidth: 900 }}>
                            {/* Back button (desktop) */}
                            {!isMobileView && (
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        background: 'none',
                                        border: 'none',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        marginBottom: '1rem',
                                        padding: 0,
                                    }}
                                >
                                    <ArrowLeft size={16} /> Powrót do listy
                                </button>
                            )}

                            {/* Subject */}
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                color: '#fff',
                                margin: '0 0 0.75rem',
                                lineHeight: 1.3,
                            }}>
                                {selectedEmail.subject}
                            </h2>

                            {/* Sender info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                {/* Avatar */}
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    flexShrink: 0,
                                }}>
                                    {(selectedEmail.from.name || selectedEmail.from.address)[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                                        {selectedEmail.from.name || selectedEmail.from.address}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                                        &lt;{selectedEmail.from.address}&gt;
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                                        Do: {selectedEmail.to.map(t => t.address).join(', ')}
                                        {selectedEmail.cc.length > 0 && ` | CC: ${selectedEmail.cc.map(c => c.address).join(', ')}`}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                                    {formatFullDate(selectedEmail.date)}
                                </div>
                            </div>

                            {/* Attachments */}
                            {selectedEmail.attachments.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                }}>
                                    {selectedEmail.attachments.map((att, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => downloadAttachment(selectedEmail.uid, idx, att.filename)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.4rem 0.7rem',
                                                background: 'rgba(56,189,248,0.08)',
                                                border: '1px solid rgba(56,189,248,0.2)',
                                                borderRadius: '0.4rem',
                                                color: '#38bdf8',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.08)'; }}
                                        >
                                            <Paperclip size={13} />
                                            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {att.filename}
                                            </span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                                ({formatSize(att.size)})
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Email body */}
                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '0.5rem',
                                    padding: '1.25rem',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.65,
                                    color: 'rgba(255,255,255,0.85)',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word',
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: selectedEmail.html
                                        ? sanitizeHtml(selectedEmail.html)
                                        : selectedEmail.text.replace(/\n/g, '<br>'),
                                }}
                            />

                            {/* Action buttons */}
                            <div style={{
                                display: 'flex',
                                gap: '0.6rem',
                                marginTop: '1rem',
                                flexWrap: 'wrap',
                            }}>
                                <button
                                    onClick={() => startReply(selectedEmail)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(56,189,248,0.1)',
                                        border: '1px solid rgba(56,189,248,0.25)',
                                        borderRadius: '0.5rem',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: 500,
                                    }}
                                >
                                    <Reply size={14} /> Odpowiedz
                                </button>
                                <button
                                    onClick={() => startForward(selectedEmail)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    <Forward size={14} /> Prześlij dalej
                                </button>
                                <button
                                    onClick={() => trashEmail(selectedEmail.uid)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: '0.5rem',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    <Trash2 size={14} /> Usuń
                                </button>
                            </div>
                        </div>
                    ) : emailLoading ? (
                        /* Loading email */
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#38bdf8' }} />
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem' }}>Ładowanie wiadomości...</p>
                        </div>
                    ) : error ? (
                        /* Error */
                        <div style={{
                            padding: '3rem',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                            <p style={{ color: '#ef4444', fontSize: '0.88rem', fontWeight: 600 }}>Błąd</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>
                            <button
                                onClick={() => { setError(null); fetchEmails(); }}
                                style={{
                                    padding: '0.5rem 1.2rem',
                                    background: 'rgba(56,189,248,0.1)',
                                    border: '1px solid rgba(56,189,248,0.25)',
                                    borderRadius: '0.5rem',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                }}
                            >Spróbuj ponownie</button>
                        </div>
                    ) : loading ? (
                        /* Loading list */
                        <div style={{ padding: '2rem 1rem' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '0.25rem',
                                    borderRadius: '0.5rem',
                                }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ height: 14, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
                                        <div style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : emails.length === 0 ? (
                        /* Empty */
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.4 }}>📭</div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                                {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak wiadomości w tym folderze'}
                            </p>
                        </div>
                    ) : (
                        /* ─── EMAIL LIST ──────────────────────────── */
                        <>
                            {emails.map(email => (
                                <div
                                    key={email.uid}
                                    onClick={() => openEmail(email.uid)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        padding: '0.65rem 1rem',
                                        cursor: 'pointer',
                                        background: email.isRead ? 'transparent' : 'rgba(56,189,248,0.03)',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = email.isRead ? 'transparent' : 'rgba(56,189,248,0.03)'}
                                >
                                    {/* Unread dot */}
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: email.isRead ? 'transparent' : '#38bdf8',
                                        flexShrink: 0,
                                    }} />

                                    {/* Star */}
                                    <button
                                        onClick={e => { e.stopPropagation(); toggleStar(email.uid, email.isStarred); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.15rem',
                                            color: email.isStarred ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                                            fontSize: '1rem',
                                            flexShrink: 0,
                                            transition: 'color 0.15s',
                                        }}
                                    >
                                        <Star size={15} fill={email.isStarred ? '#f59e0b' : 'none'} />
                                    </button>

                                    {/* Avatar */}
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: email.isRead
                                            ? 'rgba(255,255,255,0.08)'
                                            : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#fff',
                                        flexShrink: 0,
                                    }}>
                                        {senderDisplay(email.from)[0]?.toUpperCase() || '?'}
                                    </div>

                                    {/* Sender + Subject */}
                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <div style={{
                                            fontSize: '0.82rem',
                                            fontWeight: email.isRead ? 400 : 600,
                                            color: email.isRead ? 'rgba(255,255,255,0.6)' : '#fff',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {senderDisplay(email.from)}
                                        </div>
                                        <div style={{
                                            fontSize: '0.78rem',
                                            color: email.isRead ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {email.subject}
                                        </div>
                                    </div>

                                    {/* Attachment icon */}
                                    {email.hasAttachments && (
                                        <Paperclip size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                                    )}

                                    {/* Date */}
                                    <span style={{
                                        fontSize: '0.72rem',
                                        color: email.isRead ? 'rgba(255,255,255,0.3)' : '#38bdf8',
                                        fontWeight: email.isRead ? 400 : 600,
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}>
                                        {formatDate(email.date)}
                                    </span>

                                    {/* Trash button */}
                                    <button
                                        onClick={e => { e.stopPropagation(); trashEmail(email.uid); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.2rem',
                                            color: 'rgba(255,255,255,0.15)',
                                            flexShrink: 0,
                                            transition: 'color 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}
                                        title="Usuń"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {/* Pagination */}
                            {total > emails.length && (
                                <div style={{ padding: '1rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        style={{
                                            padding: '0.5rem 1.5rem',
                                            background: 'rgba(56,189,248,0.1)',
                                            border: '1px solid rgba(56,189,248,0.2)',
                                            borderRadius: '0.5rem',
                                            color: '#38bdf8',
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                        }}
                                    >
                                        Załaduj więcej ({total - page * 30 > 0 ? `pozostało ${total - page * 30}` : ''})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ─── COMPOSE MODAL ────────────────────────────────── */}
            {showCompose && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#38bdf8' }}>
                                {composeInReplyTo ? '↩️ Odpowiedz' : '✉️ Nowa wiadomość'}
                            </h3>
                            <button
                                onClick={() => { setShowCompose(false); resetCompose(); }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '0.4rem',
                                    width: 28,
                                    height: 28,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                }}
                            >✕</button>
                        </div>

                        {/* Form */}
                        <div style={{ padding: '1rem 1.25rem', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', width: 40, flexShrink: 0 }}>Do:</label>
                                <input
                                    value={composeTo}
                                    onChange={e => setComposeTo(e.target.value)}
                                    placeholder="adres@email.com"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.4rem',
                                        padding: '0.45rem 0.7rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', width: 40, flexShrink: 0 }}>CC:</label>
                                <input
                                    value={composeCc}
                                    onChange={e => setComposeCc(e.target.value)}
                                    placeholder="opcjonalnie"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.4rem',
                                        padding: '0.45rem 0.7rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', width: 40, flexShrink: 0 }}>Temat:</label>
                                <input
                                    value={composeSubject}
                                    onChange={e => setComposeSubject(e.target.value)}
                                    placeholder="Temat wiadomości"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.4rem',
                                        padding: '0.45rem 0.7rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <textarea
                                value={composeBody}
                                onChange={e => setComposeBody(e.target.value)}
                                placeholder="Treść wiadomości..."
                                rows={12}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    flex: 1,
                                    minHeight: 150,
                                    lineHeight: 1.6,
                                }}
                            />

                            {/* Send result */}
                            {sendResult && (
                                <div style={{
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.4rem',
                                    fontSize: '0.82rem',
                                    background: sendResult.success ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: sendResult.success ? '#4ade80' : '#ef4444',
                                    border: `1px solid ${sendResult.success ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                }}>
                                    {sendResult.success ? '✅ Wiadomość wysłana!' : `❌ ${sendResult.error}`}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '0.75rem 1.25rem',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.5rem',
                        }}>
                            <button
                                onClick={() => { setShowCompose(false); resetCompose(); }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '0.5rem',
                                    color: 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                }}
                            >Anuluj</button>
                            <button
                                onClick={handleSend}
                                disabled={sending || !composeTo || !composeSubject}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 1.25rem',
                                    background: (sending || !composeTo || !composeSubject)
                                        ? 'rgba(56,189,248,0.2)'
                                        : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    cursor: (sending || !composeTo || !composeSubject) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                }}
                            >
                                {sending ? (
                                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <Send size={14} />
                                )}
                                {sending ? 'Wysyłanie...' : 'Wyślij'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pulse animation */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
