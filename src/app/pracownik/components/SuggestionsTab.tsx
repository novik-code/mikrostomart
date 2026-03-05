'use client';

import { useState } from 'react';
import { RefreshCw, Lightbulb, ThumbsUp, MessageSquare, Send } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface SuggestionsTabProps {
    suggestions: any[];
    setSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
    sugLoading: boolean;
    isMobile: boolean;
    currentUserEmail: string | null;
    currentUserId: string;
    staffList: { id: string; name: string; email?: string }[];
}

// ─── Constants ────────────────────────────────────────────────
const categoryLabels: Record<string, { label: string; color: string; icon: string }> = {
    'funkcja': { label: 'Nowa funkcja', color: '#a78bfa', icon: '✨' },
    'poprawka': { label: 'Poprawka', color: '#f59e0b', icon: '🔧' },
    'pomysł': { label: 'Pomysł', color: '#38bdf8', icon: '💡' },
    'inny': { label: 'Inny', color: '#94a3b8', icon: '📝' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
    'nowa': { label: 'Nowa', color: '#94a3b8' },
    'w_dyskusji': { label: 'W dyskusji', color: '#f59e0b' },
    'zaplanowana': { label: 'Zaplanowana', color: '#38bdf8' },
    'wdrożona': { label: 'Wdrożona', color: '#4ade80' },
    'odrzucona': { label: 'Odrzucona', color: '#ef4444' },
};

// ─── Component ────────────────────────────────────────────────
export default function SuggestionsTab({
    suggestions,
    setSuggestions,
    sugLoading,
    isMobile,
    currentUserEmail,
    currentUserId,
    staffList,
}: SuggestionsTabProps) {
    // Local state for form, comments, etc.
    const [sugForm, setSugForm] = useState({ content: '', category: 'funkcja' });
    const [sugSubmitting, setSugSubmitting] = useState(false);
    const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
    const [sugComments, setSugComments] = useState<Record<string, any[]>>({});
    const [sugCommentText, setSugCommentText] = useState('');

    // ─── Handlers ─────────────────────────────────────────────
    const handleSubmitSuggestion = async () => {
        if (!sugForm.content.trim()) return;
        setSugSubmitting(true);
        try {
            const authorName = staffList.find(s => s.id === currentUserId)?.name || currentUserEmail || '';
            const res = await fetch('/api/employee/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author_email: currentUserEmail,
                    author_name: authorName,
                    content: sugForm.content,
                    category: sugForm.category,
                }),
            });
            if (res.ok) {
                const newSug = await res.json();
                setSuggestions(prev => [{ ...newSug, feature_suggestion_comments: [{ count: 0 }] }, ...prev]);
                setSugForm({ content: '', category: 'funkcja' });
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Błąd: ${err.error || res.status}`);
            }
        } catch (e: any) { alert(`Błąd sieci: ${e.message}`); }
        finally { setSugSubmitting(false); }
    };

    const handleUpvote = async (id: string) => {
        const res = await fetch('/api/employee/suggestions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'upvote', email: currentUserEmail }),
        });
        if (res.ok) {
            const { upvotes } = await res.json();
            setSuggestions(prev => prev.map(s => s.id === id ? { ...s, upvotes } : s));
        }
    };

    const loadComments = async (id: string) => {
        if (expandedSuggestion === id) { setExpandedSuggestion(null); return; }
        setExpandedSuggestion(id);
        setSugCommentText('');
        if (!sugComments[id]) {
            const res = await fetch(`/api/employee/suggestions/${id}/comments`);
            if (res.ok) {
                const data = await res.json();
                setSugComments(prev => ({ ...prev, [id]: data }));
            }
        }
    };

    const submitComment = async (sugId: string) => {
        if (!sugCommentText.trim()) return;
        const authorName = staffList.find(s => s.id === currentUserId)?.name || currentUserEmail || '';
        const res = await fetch(`/api/employee/suggestions/${sugId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author_email: currentUserEmail,
                author_name: authorName,
                content: sugCommentText,
            }),
        });
        if (res.ok) {
            const newComment = await res.json();
            setSugComments(prev => ({ ...prev, [sugId]: [...(prev[sugId] || []), newComment] }));
            setSugCommentText('');
            setSuggestions(prev => prev.map(s => s.id === sugId ? {
                ...s,
                feature_suggestion_comments: [{ count: (s.feature_suggestion_comments?.[0]?.count || 0) + 1 }]
            } : s));
        }
    };

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '0.75rem' : '1.5rem', paddingBottom: isMobile ? '5rem' : '1.5rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lightbulb size={22} style={{ color: '#f59e0b' }} /> Sugestie funkcji
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>
                    Podziel się pomysłem na nową funkcję lub poprawki w aplikacji
                </p>
            </div>

            {/* New suggestion form */}
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.25rem',
            }}>
                <textarea
                    value={sugForm.content}
                    onChange={e => setSugForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Opisz swoją sugestję lub pomysł..."
                    style={{
                        width: '100%',
                        minHeight: 80,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        padding: '0.65rem 0.75rem',
                        color: '#e2e8f0',
                        fontSize: '0.85rem',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={sugForm.category}
                        onChange={e => setSugForm(f => ({ ...f, category: e.target.value }))}
                        style={{
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '0.4rem',
                            padding: '0.35rem 0.5rem',
                            color: '#e2e8f0',
                            fontSize: '0.78rem',
                        }}
                    >
                        <option value="funkcja">✨ Nowa funkcja</option>
                        <option value="poprawka">🔧 Poprawka</option>
                        <option value="pomysł">💡 Pomysł</option>
                        <option value="inny">📝 Inny</option>
                    </select>
                    <button
                        onClick={handleSubmitSuggestion}
                        disabled={sugSubmitting || !sugForm.content.trim()}
                        style={{
                            marginLeft: 'auto',
                            background: sugForm.content.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1.2rem',
                            color: sugForm.content.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: sugForm.content.trim() ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            opacity: sugSubmitting ? 0.6 : 1,
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                        }}
                    >
                        <Send size={14} /> {sugSubmitting ? 'Wysyłam...' : 'Wyślij'}
                    </button>
                </div>
            </div>

            {/* List */}
            {sugLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.3)' }}>
                    <Lightbulb size={40} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                    <div>Brak sugestii. Bądź pierwszy!</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {suggestions.map(sug => {
                        const cat = categoryLabels[sug.category] || categoryLabels['inny'];
                        const st = statusLabels[sug.status] || statusLabels['nowa'];
                        const upvoteCount = sug.upvotes?.length || 0;
                        const hasUpvoted = sug.upvotes?.includes(currentUserEmail);
                        const commentCount = sug.feature_suggestion_comments?.[0]?.count || 0;
                        const isExpanded = expandedSuggestion === sug.id;

                        return (
                            <div key={sug.id} style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isExpanded ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: '0.75rem',
                                overflow: 'hidden',
                                transition: 'border-color 0.2s',
                            }}>
                                {/* Suggestion header */}
                                <div style={{ padding: '0.85rem 1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                                        {/* Upvote */}
                                        <button
                                            onClick={() => handleUpvote(sug.id)}
                                            style={{
                                                background: hasUpvoted ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                                                border: `1px solid ${hasUpvoted ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: '0.5rem',
                                                padding: '0.35rem 0.5rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.15rem',
                                                cursor: 'pointer',
                                                color: hasUpvoted ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                                minWidth: 38,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <ThumbsUp size={14} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{upvoteCount}</span>
                                        </button>
                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: `${cat.color}22`, color: cat.color, fontWeight: 600 }}>
                                                    {cat.icon} {cat.label}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: `${st.color}22`, color: st.color, fontWeight: 600 }}>
                                                    {st.label}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                                {sug.content}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                                                    {sug.author_name} • {new Date(sug.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                                </span>
                                                <button
                                                    onClick={() => loadComments(sug.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: isExpanded ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                                        fontSize: '0.72rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: 0,
                                                    }}
                                                >
                                                    <MessageSquare size={12} /> {commentCount} komentarz{commentCount === 1 ? '' : commentCount > 1 && commentCount < 5 ? 'e' : 'y'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments (expanded) */}
                                {isExpanded && (
                                    <div style={{
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(0,0,0,0.15)',
                                        padding: '0.75rem 1rem',
                                    }}>
                                        {(sugComments[sug.id] || []).length === 0 && (
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0.5rem 0' }}>
                                                Brak komentarzy
                                            </div>
                                        )}
                                        {(sugComments[sug.id] || []).map((c: any) => (
                                            <div key={c.id} style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.15rem' }}>
                                                    {c.author_name} • {new Date(c.created_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                                                    {c.content}
                                                </div>
                                            </div>
                                        ))}
                                        {/* Add comment */}
                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                            <input
                                                value={sugCommentText}
                                                onChange={e => setSugCommentText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && submitComment(sug.id)}
                                                placeholder="Dodaj komentarz..."
                                                style={{
                                                    flex: 1,
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '0.4rem',
                                                    padding: '0.4rem 0.6rem',
                                                    color: '#e2e8f0',
                                                    fontSize: '0.8rem',
                                                    outline: 'none',
                                                }}
                                            />
                                            <button
                                                onClick={() => submitComment(sug.id)}
                                                disabled={!sugCommentText.trim()}
                                                style={{
                                                    background: sugCommentText.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                                                    border: 'none',
                                                    borderRadius: '0.4rem',
                                                    padding: '0.4rem 0.6rem',
                                                    color: sugCommentText.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                                                    cursor: sugCommentText.trim() ? 'pointer' : 'default',
                                                }}
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
