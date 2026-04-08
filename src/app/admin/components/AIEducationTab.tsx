'use client';

/**
 * AIEducationTab — Admin panel tab for AI Knowledge Base management.
 *
 * Three sections:
 * 1. KB Viewer — Accordion of all KB sections with markdown preview
 * 2. KB Editor — Inline editing of section content
 * 3. AI Trainer — Chat interface for NL-based KB modifications
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
    role: 'user' | 'assistant';
    content: string;
    proposed_changes?: ProposedChange[];
    requires_approval?: boolean;
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
    const [trainerInput, setTrainerInput] = useState('');
    const [trainerLoading, setTrainerLoading] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<ProposedChange[]>([]);
    const [applyingChanges, setApplyingChanges] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => { loadSections(); }, [loadSections]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [trainerMessages]);

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
        } catch (err) {
            setSaveMessage({ type: 'error', text: 'Błąd zapisu. Spróbuj ponownie.' });
        } finally {
            setSaving(false);
        }
    };

    // ── AI Trainer ─────────────────────────────────────────────────

    const sendTrainerMessage = async () => {
        if (!trainerInput.trim() || trainerLoading) return;
        const userMsg: TrainerMessage = { role: 'user', content: trainerInput };
        setTrainerMessages(prev => [...prev, userMsg]);
        setTrainerInput('');
        setTrainerLoading(true);

        try {
            const res = await fetch('/api/admin/ai-trainer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    conversation: trainerMessages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!res.ok) throw new Error('Trainer request failed');
            const data = await res.json();

            const assistantMsg: TrainerMessage = {
                role: 'assistant',
                content: data.reply || 'Nie otrzymałem odpowiedzi.',
                proposed_changes: data.proposed_changes,
                requires_approval: data.requires_approval,
            };

            setTrainerMessages(prev => [...prev, assistantMsg]);

            if (data.proposed_changes?.length > 0) {
                setPendingChanges(data.proposed_changes);
            }
        } catch (err) {
            setTrainerMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Błąd komunikacji z AI Trenerem. Spróbuj ponownie.',
            }]);
        } finally {
            setTrainerLoading(false);
        }
    };

    const applyChanges = async () => {
        if (pendingChanges.length === 0) return;
        setApplyingChanges(true);

        try {
            for (const change of pendingChanges) {
                const res = await fetch('/api/admin/ai-knowledge', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        section: change.section,
                        content: change.new_content,
                        change_reason: `AI Trainer: ${change.description}`,
                    }),
                });
                if (!res.ok) throw new Error(`Failed to apply change to ${change.section}`);
            }

            setTrainerMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ Zmiany zatwierdzone i zapisane! Dotyczyły sekcji: ${pendingChanges.map(c => c.section_title).join(', ')}. AI będzie korzystać z zaktualizowanej wiedzy w ciągu 5 minut.`,
            }]);
            setPendingChanges([]);
            loadSections();
        } catch (err) {
            setTrainerMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Błąd podczas zapisywania zmian. Spróbuj ponownie.',
            }]);
        } finally {
            setApplyingChanges(false);
        }
    };

    const rejectChanges = () => {
        setPendingChanges([]);
        setTrainerMessages(prev => [...prev, {
            role: 'assistant',
            content: '🔄 Zmiany odrzucone. Powiedz mi, co chcesz zmienić inaczej.',
        }]);
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
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => setActiveView('viewer')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
                            background: activeView === 'viewer' ? '#3b82f6' : '#f3f4f6',
                            color: activeView === 'viewer' ? 'white' : '#333',
                        }}
                    >
                        📋 Baza Wiedzy
                    </button>
                    <button
                        onClick={() => setActiveView('trainer')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
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
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
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
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                        marginBottom: 24,
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
                            <div
                                key={section.id}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    background: 'white',
                                }}
                            >
                                {/* Header — always visible */}
                                <div
                                    onClick={() => setExpandedSection(expandedSection === section.section ? null : section.section)}
                                    style={{
                                        padding: '14px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
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
                                        {/* Context tags */}
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {section.context_tags.slice(0, 4).map(tag => (
                                                <span
                                                    key={tag}
                                                    style={{
                                                        fontSize: 11,
                                                        padding: '2px 8px',
                                                        borderRadius: 12,
                                                        background: tag === '*' ? '#dbeafe' : '#f3e8ff',
                                                        color: tag === '*' ? '#1d4ed8' : '#7c3aed',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {CONTEXT_LABELS[tag] || tag}
                                                </span>
                                            ))}
                                            {section.context_tags.length > 4 && (
                                                <span style={{ fontSize: 11, color: '#888' }}>
                                                    +{section.context_tags.length - 4}
                                                </span>
                                            )}
                                        </div>
                                        {/* Status */}
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                            fontSize: 11,
                                            fontWeight: 600,
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
                                            /* Edit mode */
                                            <div style={{ marginTop: 16 }}>
                                                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Tytuł:</label>
                                                <input
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: 8,
                                                        fontSize: 14,
                                                        marginBottom: 12,
                                                        marginTop: 4,
                                                    }}
                                                />
                                                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Treść (markdown):</label>
                                                <textarea
                                                    value={editContent}
                                                    onChange={e => setEditContent(e.target.value)}
                                                    rows={20}
                                                    style={{
                                                        width: '100%',
                                                        padding: 12,
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: 8,
                                                        fontSize: 13,
                                                        fontFamily: 'monospace',
                                                        lineHeight: 1.6,
                                                        resize: 'vertical',
                                                        marginTop: 4,
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={saving}
                                                        style={{
                                                            padding: '8px 20px',
                                                            background: '#22c55e',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 8,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            opacity: saving ? 0.6 : 1,
                                                        }}
                                                    >
                                                        {saving ? '💾 Zapisuję...' : '💾 Zapisz'}
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        style={{
                                                            padding: '8px 20px',
                                                            background: '#f3f4f6',
                                                            color: '#333',
                                                            border: 'none',
                                                            borderRadius: 8,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Anuluj
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View mode */
                                            <div style={{ marginTop: 16 }}>
                                                <pre style={{
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    fontSize: 13,
                                                    lineHeight: 1.7,
                                                    color: '#374151',
                                                    background: '#f9fafb',
                                                    padding: 16,
                                                    borderRadius: 8,
                                                    maxHeight: 400,
                                                    overflow: 'auto',
                                                    margin: 0,
                                                }}>
                                                    {section.content || '(pusta sekcja)'}
                                                </pre>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginTop: 12,
                                                }}>
                                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                                        Ostatnia edycja: {section.updated_at ? new Date(section.updated_at).toLocaleString('pl-PL') : '—'}
                                                        {section.updated_by && ` przez ${section.updated_by}`}
                                                    </div>
                                                    <button
                                                        onClick={() => startEdit(section)}
                                                        style={{
                                                            padding: '6px 16px',
                                                            background: '#3b82f6',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 8,
                                                            fontWeight: 600,
                                                            fontSize: 13,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
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
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 300px)',
                    minHeight: 500,
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: 'white',
                }}>
                    {/* Chat header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        background: 'linear-gradient(to right, #f5f3ff, #ede9fe)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 24 }}>🤖</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>AI Trener</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    Powiedz mi jak chcesz zmienić zachowanie AI — sam zmodyfikuję bazę wiedzy
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat messages */}
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                    }}>
                        {trainerMessages.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                padding: 40,
                                color: '#9ca3af',
                            }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                                    Witaj w AI Trenerze
                                </div>
                                <div style={{ fontSize: 14, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                                    Opisz mi w naturalnym języku jak chcesz zmienić zachowanie AI asystenta.
                                    Ja zaproponuję konkretne zmiany w bazie wiedzy do Twojej akceptacji.
                                </div>
                                <div style={{
                                    marginTop: 24,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    alignItems: 'center',
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Przykłady:</div>
                                    {[
                                        'Naucz AI żeby nie zachęcał do wizyt w każdym komentarzu na socjalach',
                                        'Zmień cenę leczenia kanałowego na 1200 zł za pierwszy kanał',
                                        'Dodaj informację o nowym lekarzu: dr Anna Kowalska, ortodoncja',
                                    ].map((example, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setTrainerInput(example); }}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#f3f4f6',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: 20,
                                                fontSize: 13,
                                                color: '#374151',
                                                cursor: 'pointer',
                                                maxWidth: 500,
                                                textAlign: 'left',
                                            }}
                                        >
                                            &ldquo;{example}&rdquo;
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {trainerMessages.map((msg, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '12px 16px',
                                    borderRadius: 16,
                                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                                    background: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                                    color: msg.role === 'user' ? 'white' : '#1f2937',
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {trainerLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: 16,
                                    background: '#f3f4f6',
                                    fontSize: 14,
                                    color: '#9ca3af',
                                }}>
                                    🤔 Analizuję...
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Pending changes approval bar */}
                    {pendingChanges.length > 0 && (
                        <div style={{
                            padding: 16,
                            borderTop: '1px solid #e5e7eb',
                            background: '#fefce8',
                        }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                                📝 Proponowane zmiany ({pendingChanges.length}):
                            </div>
                            {pendingChanges.map((change, i) => (
                                <div key={i} style={{
                                    padding: 12,
                                    background: 'white',
                                    borderRadius: 8,
                                    border: '1px solid #fef08a',
                                    marginBottom: 8,
                                    fontSize: 13,
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {change.section_title} ({change.change_type})
                                    </div>
                                    <pre style={{
                                        whiteSpace: 'pre-wrap',
                                        fontSize: 12,
                                        background: '#f0fdf4',
                                        padding: 8,
                                        borderRadius: 4,
                                        maxHeight: 150,
                                        overflow: 'auto',
                                        margin: 0,
                                        borderLeft: '3px solid #22c55e',
                                    }}>
                                        {change.new_content.substring(0, 500)}{change.new_content.length > 500 ? '...' : ''}
                                    </pre>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                    onClick={applyChanges}
                                    disabled={applyingChanges}
                                    style={{
                                        padding: '8px 20px',
                                        background: '#22c55e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        opacity: applyingChanges ? 0.6 : 1,
                                    }}
                                >
                                    {applyingChanges ? '⏳ Zapisuję...' : '✅ Zatwierdź zmiany'}
                                </button>
                                <button
                                    onClick={rejectChanges}
                                    style={{
                                        padding: '8px 20px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ❌ Odrzuć
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div style={{
                        padding: 16,
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        gap: 8,
                    }}>
                        <input
                            value={trainerInput}
                            onChange={e => setTrainerInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTrainerMessage(); } }}
                            placeholder="Opisz co chcesz zmienić w zachowaniu AI..."
                            disabled={trainerLoading}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                border: '1px solid #d1d5db',
                                borderRadius: 24,
                                fontSize: 14,
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={sendTrainerMessage}
                            disabled={trainerLoading || !trainerInput.trim()}
                            style={{
                                padding: '10px 20px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 24,
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity: (trainerLoading || !trainerInput.trim()) ? 0.5 : 1,
                            }}
                        >
                            Wyślij
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
