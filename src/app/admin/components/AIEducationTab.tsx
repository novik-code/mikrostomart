'use client';

/**
 * AIEducationTab — Admin panel tab for AI Knowledge Base management.
 *
 * Two main views:
 * 1. KB Viewer — Accordion of all KB sections with inline editing
 * 2. AI Trainer — Persistent chat for style learning and KB modifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────

interface KBSection {
    id: string;
    section: string;
    title: string;
    content: string;
    context_tags: string[];
    priority: number;
    is_active: boolean;
    updated_at: string;
    updated_by: string | null;
}

interface ProposedChange {
    section: string;
    section_title: string;
    change_type: 'append' | 'replace' | 'delete';
    old_content: string | null;
    new_content: string;
    description: string;
}

interface TrainerMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    message_type?: string;
    metadata?: {
        proposed_changes?: ProposedChange[];
        original_draft?: string;
        corrected_version?: string;
        follow_up_questions?: string[];
        [key: string]: any;
    };
    created_at?: string;
}

interface TrainerStats {
    total_messages: number;
    style_lessons: number;
    kb_changes_applied: number;
}

// ── Context tag labels ─────────────────────────────────────────────

const CONTEXT_LABELS: Record<string, string> = {
    '*': '🌐 Wszystkie',
    patient_chat: '🩺 Chat pacjenta',
    pricing: '💰 Cennik',
    email_draft: '📧 Email',
    social_post: '📱 Social Post',
    social_comment: '💬 Social Komentarz',
    voice_assistant: '🎙️ Asystent Głosowy',
    blog_generator: '📝 Blog',
    news_generator: '📰 Aktualności',
    video_metadata: '🎬 Wideo',
    review_generator: '⭐ Opinie',
    translator: '🌍 Tłumaczenia',
    task_parser: '📋 Zadania',
    content_moderator: '🛡️ Moderacja',
};

// ── Main Component ─────────────────────────────────────────────────

export default function AIEducationTab() {
    const [sections, setSections] = useState<KBSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'viewer' | 'trainer'>('viewer');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Trainer state
    const [trainerMessages, setTrainerMessages] = useState<TrainerMessage[]>([]);
    const [trainerStats, setTrainerStats] = useState<TrainerStats>({ total_messages: 0, style_lessons: 0, kb_changes_applied: 0 });
    const [trainerInput, setTrainerInput] = useState('');
    const [trainerLoading, setTrainerLoading] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<ProposedChange[]>([]);
    const [applyingChanges, setApplyingChanges] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Style compare mode
    const [styleMode, setStyleMode] = useState(false);
    const [styleDraft, setStyleDraft] = useState('');
    const [styleCorrected, setStyleCorrected] = useState('');
    const [styleNote, setStyleNote] = useState('');
    const [styleContext, setStyleContext] = useState<'email' | 'social_post' | 'social_comment' | 'chat'>('email');

    // ── Data Loading ───────────────────────────────────────────────

    const loadSections = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/ai-knowledge');
            if (!res.ok) throw new Error('Failed to load KB sections');
            const data = await res.json();
            setSections(data.sections || []);
        } catch (err) {
            console.error('Failed to load KB:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTrainerHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/ai-trainer');
            if (!res.ok) throw new Error('Failed to load trainer history');
            const data = await res.json();
            setTrainerMessages(data.messages || []);
            setTrainerStats(data.stats || { total_messages: 0, style_lessons: 0, kb_changes_applied: 0 });
            setHistoryLoaded(true);
        } catch (err) {
            console.error('Failed to load trainer history:', err);
            setHistoryLoaded(true);
        }
    }, []);

    useEffect(() => { loadSections(); }, [loadSections]);

    // Load trainer history when switching to trainer view
    useEffect(() => {
        if (activeView === 'trainer' && !historyLoaded) {
            loadTrainerHistory();
        }
    }, [activeView, historyLoaded, loadTrainerHistory]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (activeView === 'trainer') {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [trainerMessages, activeView]);

    // ── Section Editor ─────────────────────────────────────────────

    const startEdit = (section: KBSection) => {
        setEditingSection(section.section);
        setEditContent(section.content);
        setEditTitle(section.title);
        setExpandedSection(section.section);
    };

    const cancelEdit = () => {
        setEditingSection(null);
        setEditContent('');
        setEditTitle('');
    };

    const saveEdit = async () => {
        if (!editingSection) return;
        setSaving(true);
        setSaveMessage(null);
        try {
            const res = await fetch('/api/admin/ai-knowledge', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section: editingSection,
                    title: editTitle,
                    content: editContent,
                    change_reason: 'Manual edit in admin panel',
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            setSaveMessage({ type: 'success', text: 'Zapisano! Zmiany będą widoczne w ciągu 5 minut.' });
            cancelEdit();
            loadSections();
        } catch {
            setSaveMessage({ type: 'error', text: 'Błąd zapisu. Spróbuj ponownie.' });
        } finally {
            setSaving(false);
        }
    };

    // ── AI Trainer ─────────────────────────────────────────────────

    const sendTrainerMessage = async (overrideMessage?: string, overrideType?: string, overrideMetadata?: any) => {
        const msgText = overrideMessage || trainerInput;
        if (!msgText.trim() || trainerLoading) return;

        const userMsg: TrainerMessage = {
            role: 'user',
            content: msgText,
            message_type: overrideType || 'general',
            metadata: overrideMetadata,
            created_at: new Date().toISOString(),
        };
        setTrainerMessages(prev => [...prev, userMsg]);
        setTrainerInput('');
        setTrainerLoading(true);

        try {
            const res = await fetch('/api/admin/ai-trainer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msgText,
                    message_type: overrideType || 'general',
                    metadata: overrideMetadata,
                }),
            });

            if (!res.ok) throw new Error('Trainer request failed');
            const data = await res.json();

            const assistantMsg: TrainerMessage = {
                role: 'assistant',
                content: data.reply || 'Nie otrzymałem odpowiedzi.',
                message_type: data.is_style_lesson ? 'style_analysis' : data.requires_approval ? 'kb_proposal' : 'general',
                metadata: {
                    proposed_changes: data.proposed_changes,
                },
                created_at: new Date().toISOString(),
            };

            setTrainerMessages(prev => [...prev, assistantMsg]);
            setTrainerStats(prev => ({
                ...prev,
                total_messages: prev.total_messages + 2,
                style_lessons: prev.style_lessons + (data.is_style_lesson ? 1 : 0),
            }));

            if (data.proposed_changes?.length > 0) {
                setPendingChanges(data.proposed_changes);
            }
        } catch {
            setTrainerMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Błąd komunikacji z AI Trenerem. Spróbuj ponownie.',
                created_at: new Date().toISOString(),
            }]);
        } finally {
            setTrainerLoading(false);
        }
    };

    const sendStyleExample = () => {
        if (!styleDraft.trim() || !styleCorrected.trim()) return;

        const contextLabels: Record<string, string> = {
            email: 'emaila',
            social_post: 'posta na social media',
            social_comment: 'komentarza na social media',
            chat: 'wiadomości chatbota',
        };

        const formattedMessage = `📧 NAUKA STYLU Z ${contextLabels[styleContext]?.toUpperCase() || 'TREŚCI'}

❌ DRAFT AI (co napisał asystent):
---
${styleDraft.trim()}
---

✅ MOJA POPRAWKA (co faktycznie wysłałem):
---
${styleCorrected.trim()}
---
${styleNote.trim() ? `\n💡 KOMENTARZ: ${styleNote.trim()}` : ''}

Przeanalizuj różnice i wyciągnij reguły stylistyczne.`;

        sendStyleExample_internal(formattedMessage);
    };

    const sendStyleExample_internal = (msg: string) => {
        setStyleMode(false);
        setStyleDraft('');
        setStyleCorrected('');
        setStyleNote('');
        sendTrainerMessage(msg, 'style_example', {
            original_draft: styleDraft,
            corrected_version: styleCorrected,
            context: styleContext,
        });
    };

    const applyChanges = async () => {
        if (pendingChanges.length === 0) return;
        setApplyingChanges(true);

        try {
            const res = await fetch('/api/admin/ai-trainer', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'apply', changes: pendingChanges }),
            });
            if (!res.ok) throw new Error('Apply failed');

            const sectionNames = pendingChanges.map(c => c.section_title).join(', ');
            setTrainerMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ Zmiany zatwierdzone i zapisane! Dotyczyły sekcji: ${sectionNames}. AI będzie korzystać z zaktualizowanej wiedzy w ciągu 5 minut.`,
                message_type: 'kb_applied',
                created_at: new Date().toISOString(),
            }]);
            setPendingChanges([]);
            setTrainerStats(prev => ({ ...prev, kb_changes_applied: prev.kb_changes_applied + 1 }));
            loadSections();
        } catch {
            setTrainerMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Błąd podczas zapisywania zmian. Spróbuj ponownie.',
                created_at: new Date().toISOString(),
            }]);
        } finally {
            setApplyingChanges(false);
        }
    };

    const rejectChanges = async () => {
        try {
            await fetch('/api/admin/ai-trainer', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', changes: pendingChanges }),
            });
        } catch { /* silent */ }

        setPendingChanges([]);
        setTrainerMessages(prev => [...prev, {
            role: 'assistant',
            content: '🔄 Zmiany odrzucone. Powiedz mi co chcesz zmienić inaczej.',
            message_type: 'kb_rejected',
            created_at: new Date().toISOString(),
        }]);
    };

    // ── Message Type Icons ──────────────────────────────────────────

    const getMsgTypeIcon = (type?: string) => {
        switch (type) {
            case 'style_example': return '📧';
            case 'style_analysis': return '🎨';
            case 'kb_proposal': return '📝';
            case 'kb_applied': return '✅';
            case 'kb_rejected': return '🔄';
            default: return '';
        }
    };

    // ── Render ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>🧠</div>
                Ładowanie bazy wiedzy AI...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>🧠 AI Asystent — Edukacja</h2>
                    <p style={{ color: '#888', margin: '4px 0 0', fontSize: 14 }}>
                        Zarządzaj bazą wiedzy AI i ucz asystenta nowych rzeczy
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {trainerStats.style_lessons > 0 && (
                        <span style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe',
                        }}>
                            🎨 {trainerStats.style_lessons} lekcji stylu
                        </span>
                    )}
                    {trainerStats.kb_changes_applied > 0 && (
                        <span style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                        }}>
                            ✅ {trainerStats.kb_changes_applied} zmian KB
                        </span>
                    )}
                    <button
                        onClick={() => setActiveView('viewer')}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 14,
                            background: activeView === 'viewer' ? '#3b82f6' : '#f3f4f6',
                            color: activeView === 'viewer' ? 'white' : '#333',
                        }}
                    >
                        📋 Baza Wiedzy
                    </button>
                    <button
                        onClick={() => setActiveView('trainer')}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 14,
                            background: activeView === 'trainer' ? '#8b5cf6' : '#f3f4f6',
                            color: activeView === 'trainer' ? 'white' : '#333',
                        }}
                    >
                        🤖 AI Trener
                    </button>
                </div>
            </div>

            {/* Save message */}
            {saveMessage && (
                <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                    background: saveMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: saveMessage.type === 'success' ? '#166534' : '#991b1b',
                    fontSize: 14,
                }}>
                    {saveMessage.text}
                </div>
            )}

            {/* ── KB Viewer ──────────────────────────────────────── */}
            {activeView === 'viewer' && (
                <div>
                    {/* Stats */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12, marginBottom: 24,
                    }}>
                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#0369a1' }}>{sections.length}</div>
                            <div style={{ fontSize: 13, color: '#0369a1' }}>Sekcji wiedzy</div>
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>
                                {sections.filter(s => s.is_active).length}
                            </div>
                            <div style={{ fontSize: 13, color: '#15803d' }}>Aktywnych</div>
                        </div>
                        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#a16207' }}>
                                {Math.round(sections.reduce((sum, s) => sum + s.content.length, 0) / 1000)}K
                            </div>
                            <div style={{ fontSize: 13, color: '#a16207' }}>Znaków łącznie</div>
                        </div>
                    </div>

                    {/* Sections Accordion */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sections.map(section => (
                            <div key={section.id} style={{
                                border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: 'white',
                            }}>
                                {/* Header */}
                                <div
                                    onClick={() => setExpandedSection(expandedSection === section.section ? null : section.section)}
                                    style={{
                                        padding: '14px 20px', display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', cursor: 'pointer',
                                        background: expandedSection === section.section ? '#f9fafb' : 'white',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                        <span style={{ fontSize: 18 }}>
                                            {expandedSection === section.section ? '▼' : '▶'}
                                        </span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{section.title}</div>
                                            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                                                {section.section} · {section.content.length} znaków · prio: {section.priority}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {section.context_tags.slice(0, 4).map(tag => (
                                                <span key={tag} style={{
                                                    fontSize: 11, padding: '2px 8px', borderRadius: 12,
                                                    background: tag === '*' ? '#dbeafe' : '#f3e8ff',
                                                    color: tag === '*' ? '#1d4ed8' : '#7c3aed', whiteSpace: 'nowrap',
                                                }}>
                                                    {CONTEXT_LABELS[tag] || tag}
                                                </span>
                                            ))}
                                            {section.context_tags.length > 4 && (
                                                <span style={{ fontSize: 11, color: '#888' }}>
                                                    +{section.context_tags.length - 4}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                            background: section.is_active ? '#dcfce7' : '#fee2e2',
                                            color: section.is_active ? '#166534' : '#991b1b',
                                        }}>
                                            {section.is_active ? 'Aktywna' : 'Wyłączona'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content — expanded */}
                                {expandedSection === section.section && (
                                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                                        {editingSection === section.section ? (
                                            <div style={{ marginTop: 16 }}>
                                                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Tytuł:</label>
                                                <input
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                                                        borderRadius: 8, fontSize: 14, marginBottom: 12, marginTop: 4,
                                                    }}
                                                />
                                                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Treść (markdown):</label>
                                                <textarea
                                                    value={editContent}
                                                    onChange={e => setEditContent(e.target.value)}
                                                    rows={20}
                                                    style={{
                                                        width: '100%', padding: 12, border: '1px solid #d1d5db',
                                                        borderRadius: 8, fontSize: 13, fontFamily: 'monospace',
                                                        lineHeight: 1.6, resize: 'vertical', marginTop: 4,
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                                    <button onClick={saveEdit} disabled={saving} style={{
                                                        padding: '8px 20px', background: '#22c55e', color: 'white',
                                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                                        opacity: saving ? 0.6 : 1,
                                                    }}>
                                                        {saving ? '💾 Zapisuję...' : '💾 Zapisz'}
                                                    </button>
                                                    <button onClick={cancelEdit} style={{
                                                        padding: '8px 20px', background: '#f3f4f6', color: '#333',
                                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                                    }}>
                                                        Anuluj
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 16 }}>
                                                <pre style={{
                                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13,
                                                    lineHeight: 1.7, color: '#374151', background: '#f9fafb',
                                                    padding: 16, borderRadius: 8, maxHeight: 400, overflow: 'auto', margin: 0,
                                                }}>
                                                    {section.content || '(pusta sekcja)'}
                                                </pre>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12,
                                                }}>
                                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                                        Ostatnia edycja: {section.updated_at ? new Date(section.updated_at).toLocaleString('pl-PL') : '—'}
                                                        {section.updated_by && ` przez ${section.updated_by}`}
                                                    </div>
                                                    <button onClick={() => startEdit(section)} style={{
                                                        padding: '6px 16px', background: '#3b82f6', color: 'white',
                                                        border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                                    }}>
                                                        ✏️ Edytuj
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── AI Trainer ─────────────────────────────────────── */}
            {activeView === 'trainer' && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    height: 'calc(100vh - 300px)', minHeight: 500,
                    border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', background: 'white',
                }}>
                    {/* Chat header */}
                    <div style={{
                        padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
                        background: 'linear-gradient(to right, #f5f3ff, #ede9fe)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 24 }}>🤖</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>AI Trener</div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        Uczę się Twojego stylu pisania — pokaż mi przykłady i powiedz co zmienić
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {trainerStats.total_messages > 0 && (
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                        background: '#e0e7ff', color: '#3730a3',
                                    }}>
                                        💬 {trainerStats.total_messages} wiadomości
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat messages */}
                    <div ref={chatContainerRef} style={{
                        flex: 1, overflow: 'auto', padding: 20,
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        {!historyLoaded ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                                Ładowanie historii...
                            </div>
                        ) : trainerMessages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                                    Witaj w AI Trenerze
                                </div>
                                <div style={{ fontSize: 14, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                                    Uczę się Twojego stylu pisania. Pokaż mi przykłady maili, postów czy komentarzy — przeanalizuję różnice i zapamiętam Twoje preferencje.
                                </div>
                                <div style={{
                                    marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Zacznij od:</div>
                                    {[
                                        { icon: '📧', text: 'Pokaż mi przykład maila', action: () => { setStyleMode(true); setStyleContext('email'); } },
                                        { icon: '📱', text: 'Pokaż mi przykład posta', action: () => { setStyleMode(true); setStyleContext('social_post'); } },
                                        { icon: '💡', text: 'Zmień regułę zachowania AI', action: () => setTrainerInput('Chcę zmienić sposób w jaki AI...') },
                                    ].map((item, i) => (
                                        <button key={i} onClick={item.action} style={{
                                            padding: '10px 20px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                                            borderRadius: 20, fontSize: 14, color: '#374151', cursor: 'pointer',
                                            maxWidth: 400, textAlign: 'left', display: 'flex', gap: 8, alignItems: 'center',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}>
                                            <span>{item.icon}</span> {item.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            trainerMessages.map((msg, i) => (
                                <div key={msg.id || i} style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}>
                                    <div style={{
                                        maxWidth: '85%', padding: '12px 16px', borderRadius: 16,
                                        borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                        borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                                        background: msg.role === 'user'
                                            ? (msg.message_type === 'style_example' ? '#7c3aed' : '#3b82f6')
                                            : (msg.message_type === 'style_analysis' ? '#faf5ff' :
                                                msg.message_type === 'kb_applied' ? '#f0fdf4' :
                                                msg.message_type === 'kb_rejected' ? '#fef2f2' : '#f3f4f6'),
                                        color: msg.role === 'user' ? 'white' : '#1f2937',
                                        fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                        border: msg.role === 'assistant' && msg.message_type === 'style_analysis'
                                            ? '1px solid #e9d5ff' : 'none',
                                    }}>
                                        {msg.message_type && msg.message_type !== 'general' && (
                                            <div style={{
                                                fontSize: 11, fontWeight: 600, marginBottom: 6,
                                                color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : '#9ca3af',
                                            }}>
                                                {getMsgTypeIcon(msg.message_type)} {
                                                    msg.message_type === 'style_example' ? 'Przykład stylu' :
                                                    msg.message_type === 'style_analysis' ? 'Analiza stylu' :
                                                    msg.message_type === 'kb_proposal' ? 'Propozycja zmian' :
                                                    msg.message_type === 'kb_applied' ? 'Zmiany zastosowane' :
                                                    msg.message_type === 'kb_rejected' ? 'Zmiany odrzucone' : ''
                                                }
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}

                        {trainerLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '12px 16px', borderRadius: 16, background: '#f3f4f6',
                                    fontSize: 14, color: '#9ca3af',
                                }}>
                                    🤔 Analizuję...
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Pending changes approval bar */}
                    {pendingChanges.length > 0 && (
                        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', background: '#fefce8' }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                                📝 Proponowane zmiany ({pendingChanges.length}):
                            </div>
                            {pendingChanges.map((change, i) => (
                                <div key={i} style={{
                                    padding: 12, background: 'white', borderRadius: 8,
                                    border: '1px solid #fef08a', marginBottom: 8, fontSize: 13,
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {change.section_title} ({change.change_type})
                                    </div>
                                    <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{change.description}</div>
                                    <pre style={{
                                        whiteSpace: 'pre-wrap', fontSize: 12, background: '#f0fdf4',
                                        padding: 8, borderRadius: 4, maxHeight: 150, overflow: 'auto',
                                        margin: 0, borderLeft: '3px solid #22c55e',
                                    }}>
                                        {change.new_content.substring(0, 500)}{change.new_content.length > 500 ? '...' : ''}
                                    </pre>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button onClick={applyChanges} disabled={applyingChanges} style={{
                                    padding: '8px 20px', background: '#22c55e', color: 'white',
                                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                    opacity: applyingChanges ? 0.6 : 1,
                                }}>
                                    {applyingChanges ? '⏳ Zapisuję...' : '✅ Zatwierdź zmiany'}
                                </button>
                                <button onClick={rejectChanges} style={{
                                    padding: '8px 20px', background: '#ef4444', color: 'white',
                                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                }}>
                                    ❌ Odrzuć
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Style Compare Input */}
                    {styleMode && (
                        <div style={{
                            padding: 20, borderTop: '2px solid #a78bfa', background: '#faf5ff',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#5b21b6' }}>
                                    🎨 Nauka stylu — {
                                        styleContext === 'email' ? 'email' :
                                        styleContext === 'social_post' ? 'post social media' :
                                        styleContext === 'social_comment' ? 'komentarz social' : 'chatbot'
                                    }
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {(['email', 'social_post', 'social_comment', 'chat'] as const).map(ctx => (
                                        <button key={ctx} onClick={() => setStyleContext(ctx)} style={{
                                            padding: '4px 10px', borderRadius: 8, border: 'none', fontSize: 12,
                                            cursor: 'pointer', fontWeight: 600,
                                            background: styleContext === ctx ? '#7c3aed' : '#e5e7eb',
                                            color: styleContext === ctx ? 'white' : '#555',
                                        }}>
                                            {ctx === 'email' ? '📧' : ctx === 'social_post' ? '📱' : ctx === 'social_comment' ? '💬' : '🤖'}
                                        </button>
                                    ))}
                                    <button onClick={() => setStyleMode(false)} style={{
                                        padding: '4px 10px', borderRadius: 8, border: 'none', fontSize: 12,
                                        cursor: 'pointer', background: '#fee2e2', color: '#991b1b', marginLeft: 8,
                                    }}>
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: 4 }}>
                                        ❌ Draft AI (co napisał asystent):
                                    </label>
                                    <textarea
                                        value={styleDraft}
                                        onChange={e => setStyleDraft(e.target.value)}
                                        rows={6}
                                        placeholder="Wklej tu tekst wygenerowany przez AI..."
                                        style={{
                                            width: '100%', padding: 12, border: '1px solid #fca5a5', borderRadius: 8,
                                            fontSize: 13, lineHeight: 1.5, resize: 'vertical', background: '#fef2f2',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', display: 'block', marginBottom: 4 }}>
                                        ✅ Twoja poprawka (co wysłałeś):
                                    </label>
                                    <textarea
                                        value={styleCorrected}
                                        onChange={e => setStyleCorrected(e.target.value)}
                                        rows={6}
                                        placeholder="Wklej tu Twoją poprawioną wersję..."
                                        style={{
                                            width: '100%', padding: 12, border: '1px solid #86efac', borderRadius: 8,
                                            fontSize: 13, lineHeight: 1.5, resize: 'vertical', background: '#f0fdf4',
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                                        💡 Komentarz (opcjonalnie):
                                    </label>
                                    <input
                                        value={styleNote}
                                        onChange={e => setStyleNote(e.target.value)}
                                        placeholder='np. "Zawsze kończ Pozdrawiamy z małej litery"'
                                        style={{
                                            width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                                            borderRadius: 8, fontSize: 13,
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={sendStyleExample}
                                    disabled={!styleDraft.trim() || !styleCorrected.trim() || trainerLoading}
                                    style={{
                                        padding: '10px 24px', background: '#7c3aed', color: 'white',
                                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                        opacity: (!styleDraft.trim() || !styleCorrected.trim() || trainerLoading) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    🧠 Analizuj i ucz się
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input area */}
                    {!styleMode && (
                        <div style={{
                            padding: 16, borderTop: '1px solid #e5e7eb',
                            display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            {/* Quick action buttons */}
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[
                                    { icon: '📧', label: 'Z maila', ctx: 'email' as const },
                                    { icon: '📱', label: 'Z posta', ctx: 'social_post' as const },
                                    { icon: '💬', label: 'Z komentarza', ctx: 'social_comment' as const },
                                    { icon: '🤖', label: 'Z chatbota', ctx: 'chat' as const },
                                ].map(item => (
                                    <button key={item.ctx} onClick={() => { setStyleMode(true); setStyleContext(item.ctx); }} style={{
                                        padding: '4px 10px', borderRadius: 16, border: '1px solid #e5e7eb',
                                        fontSize: 11, cursor: 'pointer', background: '#f9fafb', color: '#555',
                                        fontWeight: 600, display: 'flex', gap: 4, alignItems: 'center',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f3e8ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                                        {item.icon} Naucz się {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Text input */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <textarea
                                    value={trainerInput}
                                    onChange={e => setTrainerInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendTrainerMessage();
                                        }
                                    }}
                                    placeholder="Powiedz mi czego mam się nauczyć lub co zmienić... (Shift+Enter = nowa linia)"
                                    disabled={trainerLoading}
                                    rows={2}
                                    style={{
                                        flex: 1, padding: '10px 16px', border: '1px solid #d1d5db',
                                        borderRadius: 12, fontSize: 14, outline: 'none', resize: 'none',
                                        lineHeight: 1.5, fontFamily: 'inherit',
                                    }}
                                />
                                <button
                                    onClick={() => sendTrainerMessage()}
                                    disabled={trainerLoading || !trainerInput.trim()}
                                    style={{
                                        padding: '10px 20px', background: '#8b5cf6', color: 'white',
                                        border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
                                        opacity: (trainerLoading || !trainerInput.trim()) ? 0.5 : 1,
                                        alignSelf: 'flex-end',
                                    }}
                                >
                                    Wyślij
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
