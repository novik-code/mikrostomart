"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Template {
    id: string;
    name: string;
    description: string;
    created_at: string;
    created_by: string;
}

interface TemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onApplied: () => void;
}

export default function TemplateManager({ isOpen, onClose, onApplied }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [applying, setApplying] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const getHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        return {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        };
    };

    // Load templates
    const loadTemplates = async () => {
        setLoading(true);
        try {
            const headers = await getHeaders();
            const res = await fetch('/api/admin/templates', { headers });
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (e) {
            console.error('[TemplateManager] Load error:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) loadTemplates();
    }, [isOpen]);

    // Save current layout as template
    const handleSave = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const headers = await getHeaders();
            const res = await fetch('/api/admin/templates', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: newName, description: newDesc }),
            });
            if (!res.ok) throw new Error('Failed to save');
            setMessage({ text: '✅ Szablon zapisany!', type: 'success' });
            setNewName('');
            setNewDesc('');
            setShowCreate(false);
            loadTemplates();
        } catch (err: any) {
            setMessage({ text: `❌ ${err.message}`, type: 'error' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    // Apply template
    const handleApply = async (templateId: string) => {
        if (!confirm('Załadować ten szablon? Obecny układ zostanie nadpisany.')) return;
        setApplying(templateId);
        try {
            const headers = await getHeaders();
            const res = await fetch(`/api/admin/templates/${templateId}/apply`, {
                method: 'POST',
                headers,
            });
            if (!res.ok) throw new Error('Failed to apply');
            setMessage({ text: '✅ Szablon załadowany! Odśwież stronę.', type: 'success' });
            onApplied();
        } catch (err: any) {
            setMessage({ text: `❌ ${err.message}`, type: 'error' });
        }
        setApplying(null);
        setTimeout(() => setMessage(null), 3000);
    };

    // Delete template
    const handleDelete = async (templateId: string) => {
        if (!confirm('Na pewno usunąć ten szablon?')) return;
        try {
            const headers = await getHeaders();
            const res = await fetch(`/api/admin/templates?id=${templateId}`, {
                method: 'DELETE',
                headers,
            });
            if (!res.ok) throw new Error('Failed to delete');
            setMessage({ text: '✅ Szablon usunięty', type: 'success' });
            loadTemplates();
        } catch (err: any) {
            setMessage({ text: `❌ ${err.message}`, type: 'error' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 10005,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'rgba(15, 17, 21, 0.98)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc', margin: 0 }}>
                        📁 Szablony układu
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#e5e7eb',
                            padding: '0.3rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        ✕ Zamknij
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div style={{
                        padding: '0.5rem 0.75rem',
                        background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        borderRadius: '8px',
                        color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Save current layout */}
                <div style={{
                    padding: '0.75rem',
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px dashed rgba(99,102,241,0.3)',
                    borderRadius: '10px',
                    marginBottom: '1.25rem',
                }}>
                    {!showCreate ? (
                        <button
                            onClick={() => setShowCreate(true)}
                            style={{
                                width: '100%',
                                padding: '0.6rem',
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: '8px',
                                color: '#a5b4fc',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                            }}
                        >
                            💾 Zapisz obecny układ jako szablon
                        </button>
                    ) : (
                        <div>
                            <input
                                type="text"
                                placeholder="Nazwa szablonu (np. Na Święta 2026)"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem',
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Opis (opcjonalnie)"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem',
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !newName.trim()}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        background: 'rgba(16,185,129,0.15)',
                                        border: '1px solid rgba(16,185,129,0.3)',
                                        borderRadius: '6px',
                                        color: '#6ee7b7',
                                        fontWeight: 600,
                                        cursor: newName.trim() ? 'pointer' : 'not-allowed',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {saving ? '⏳ Zapisuję...' : '✅ Zapisz'}
                                </button>
                                <button
                                    onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        color: '#e5e7eb',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    Anuluj
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Template list */}
                <div className="ve-sidebar-title">Zapisane szablony</div>

                {loading ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                        ⏳ Ładowanie...
                    </p>
                ) : templates.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                        Brak zapisanych szablonów. Użyj przycisku powyżej, aby zapisać obecny układ.
                    </p>
                ) : (
                    templates.map(tpl => (
                        <div
                            key={tpl.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '10px',
                                marginBottom: '0.5rem',
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: '#e5e7eb', fontSize: '0.9rem' }}>
                                    {tpl.name}
                                </div>
                                {tpl.description && (
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        {tpl.description}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                                    {new Date(tpl.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {tpl.created_by && ` • ${tpl.created_by}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                <button
                                    onClick={() => handleApply(tpl.id)}
                                    disabled={applying === tpl.id}
                                    style={{
                                        padding: '0.35rem 0.65rem',
                                        background: 'rgba(99,102,241,0.15)',
                                        border: '1px solid rgba(99,102,241,0.3)',
                                        borderRadius: '6px',
                                        color: '#a5b4fc',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    {applying === tpl.id ? '⏳' : '📥 Załaduj'}
                                </button>
                                <button
                                    onClick={() => handleDelete(tpl.id)}
                                    style={{
                                        padding: '0.35rem 0.5rem',
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: '6px',
                                        color: '#fca5a5',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
