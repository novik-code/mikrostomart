"use client";

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Save,
    RotateCcw,
    Plus,
    GripVertical,
    Eye,
    EyeOff,
    Settings,
    X,
    Trash2,
    ExternalLink,
} from 'lucide-react';
import {
    PageSection,
    SectionType,
    SECTION_CATALOG,
    DEFAULT_SECTIONS,
    getSectionMeta,
} from '@/lib/sections';

// ===================== SORTABLE ITEM =====================

function SortableSectionItem({
    section,
    onToggleVisibility,
    onRemove,
    onOpenSettings,
}: {
    section: PageSection;
    onToggleVisibility: (id: string) => void;
    onRemove: (id: string) => void;
    onOpenSettings: (id: string) => void;
}) {
    const meta = getSectionMeta(section.type);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto' as any,
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: isDragging
                    ? 'rgba(var(--color-primary-rgb), 0.1)'
                    : section.visible
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.01)',
                border: isDragging
                    ? '1px solid rgba(var(--color-primary-rgb), 0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                cursor: 'default',
            }}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                style={{
                    cursor: 'grab',
                    color: 'rgba(255,255,255,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'color 0.15s',
                }}
                title="Przeciągnij aby zmienić kolejność"
            >
                <GripVertical size={20} />
            </div>

            {/* Icon + Name */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{meta?.icon || '📦'}</span>
                <div>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: section.visible ? 'white' : 'rgba(255,255,255,0.35)',
                        textDecoration: section.visible ? 'none' : 'line-through',
                    }}>
                        {meta?.label || section.type}
                    </div>
                    <div style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.3)',
                    }}>
                        {meta?.description || ''}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {/* Visibility Toggle */}
                <button
                    onClick={() => onToggleVisibility(section.id)}
                    title={section.visible ? 'Ukryj sekcję' : 'Pokaż sekcję'}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        background: section.visible
                            ? 'rgba(var(--color-primary-rgb), 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        border: section.visible
                            ? '1px solid rgba(var(--color-primary-rgb), 0.2)'
                            : '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: section.visible ? 'var(--color-primary)' : '#ef4444',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                {/* Settings */}
                <button
                    onClick={() => onOpenSettings(section.id)}
                    title="Ustawienia sekcji"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    <Settings size={16} />
                </button>

                {/* Remove (only for non-core sections) */}
                {!['hero', 'values', 'narrative', 'youtube', 'reviews'].includes(section.type) && (
                    <button
                        onClick={() => onRemove(section.id)}
                        title="Usuń sekcję"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px',
                            color: 'rgba(239, 68, 68, 0.6)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ===================== ADD SECTION PANEL =====================

function AddSectionPanel({
    currentSections,
    onAdd,
    onClose,
}: {
    currentSections: PageSection[];
    onAdd: (type: SectionType) => void;
    onClose: () => void;
}) {
    const available = SECTION_CATALOG.filter(meta => {
        if (meta.maxInstances === -1) return true;
        const count = currentSections.filter(s => s.type === meta.type).length;
        return count < meta.maxInstances;
    });

    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(var(--color-primary-rgb), 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginTop: '0.75rem',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
            }}>
                <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                }}>
                    ➕ Dodaj sekcję
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {available.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                    Wszystkie dostępne sekcje zostały już dodane.
                </p>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '0.6rem',
                }}>
                    {available.map(meta => (
                        <button
                            key={meta.type}
                            onClick={() => onAdd(meta.type)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                textAlign: 'center',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget).style.borderColor = 'rgba(var(--color-primary-rgb), 0.4)';
                                (e.currentTarget).style.background = 'rgba(var(--color-primary-rgb), 0.05)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.08)';
                                (e.currentTarget).style.background = 'rgba(255,255,255,0.03)';
                            }}
                        >
                            <span style={{ fontSize: '1.6rem' }}>{meta.icon}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{meta.label}</span>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                                {meta.description}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ===================== SECTION SETTINGS PANEL =====================

function SectionSettingsPanel({
    section,
    onUpdate,
    onClose,
}: {
    section: PageSection;
    onUpdate: (id: string, config: Record<string, any>) => void;
    onClose: () => void;
}) {
    const meta = getSectionMeta(section.type);
    const [localConfig, setLocalConfig] = useState(section.config);

    const updateField = (key: string, value: any) => {
        const updated = { ...localConfig, [key]: value };
        setLocalConfig(updated);
        onUpdate(section.id, updated);
    };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '0.75rem',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
            }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    ⚙️ Ustawienia: {meta?.label || section.type}
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {section.type === 'cta-banner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(['title', 'subtitle', 'buttonText', 'buttonLink'] as const).map(field => (
                        <div key={field}>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', display: 'block' }}>
                                {field === 'title' ? 'Tytuł' : field === 'subtitle' ? 'Podtytuł' : field === 'buttonText' ? 'Tekst przycisku' : 'Link przycisku'}
                            </label>
                            <input
                                type="text"
                                value={localConfig[field] || ''}
                                onChange={e => updateField(field, e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {section.type === 'text-block' && (
                <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', display: 'block' }}>
                        Treść (HTML)
                    </label>
                    <textarea
                        value={localConfig.content || ''}
                        onChange={e => updateField('content', e.target.value)}
                        rows={5}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            resize: 'vertical',
                        }}
                    />
                </div>
            )}

            {!['cta-banner', 'text-block'].includes(section.type) && (
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    Ta sekcja jest wbudowana i nie wymaga dodatkowej konfiguracji.
                    Jej treść pobierana jest automatycznie z bazy danych.
                </p>
            )}
        </div>
    );
}

// ===================== MAIN COMPONENT =====================

export default function PageBuilderTab() {
    const [sections, setSections] = useState<PageSection[]>(DEFAULT_SECTIONS);
    const [originalSections, setOriginalSections] = useState<PageSection[]>(DEFAULT_SECTIONS);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Load current sections
    useEffect(() => {
        async function load() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const res = await fetch('/api/admin/sections', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
                        setSections(data.value);
                        setOriginalSections(data.value);
                    }
                }
            } catch (err) {
                console.error('Failed to load sections:', err);
            }
        }
        load();
    }, []);

    // Track changes
    useEffect(() => {
        setHasChanges(JSON.stringify(sections) !== JSON.stringify(originalSections));
    }, [sections, originalSections]);

    // Drag end handler
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSections(prev => {
                const oldIndex = prev.findIndex(s => s.id === active.id);
                const newIndex = prev.findIndex(s => s.id === over.id);
                const newArr = arrayMove(prev, oldIndex, newIndex);
                return newArr.map((s, i) => ({ ...s, order: i }));
            });
        }
    }, []);

    // Toggle visibility
    const toggleVisibility = useCallback((id: string) => {
        setSections(prev => prev.map(s =>
            s.id === id ? { ...s, visible: !s.visible } : s
        ));
    }, []);

    // Remove section
    const removeSection = useCallback((id: string) => {
        setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
        if (editingSectionId === id) setEditingSectionId(null);
    }, [editingSectionId]);

    // Add section
    const addSection = useCallback((type: SectionType) => {
        const meta = getSectionMeta(type);
        if (!meta) return;

        const existingOfType = sections.filter(s => s.type === type).length;
        const id = existingOfType > 0 ? `${type}-${existingOfType + 1}` : type;

        setSections(prev => [...prev, {
            id,
            type,
            visible: true,
            order: prev.length,
            config: { ...meta.defaultConfig },
        }]);
        setShowAddPanel(false);
    }, [sections]);

    // Update section config
    const updateConfig = useCallback((id: string, config: Record<string, any>) => {
        setSections(prev => prev.map(s =>
            s.id === id ? { ...s, config } : s
        ));
    }, []);

    // Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/sections', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sections),
            });

            if (!res.ok) throw new Error('Failed to save');

            setOriginalSections(sections);
            setHasChanges(false);
            setMessage({ text: '✅ Układ strony zapisany!', type: 'success' });
        } catch (err: any) {
            setMessage({ text: `❌ Błąd: ${err.message}`, type: 'error' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    // Reset
    const handleReset = async () => {
        if (!confirm('Czy na pewno chcesz przywrócić domyślny układ strony?')) return;
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/sections', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (!res.ok) throw new Error('Failed to reset');

            setSections(DEFAULT_SECTIONS);
            setOriginalSections(DEFAULT_SECTIONS);
            setHasChanges(false);
            setMessage({ text: '✅ Układ przywrócony!', type: 'success' });
        } catch (err: any) {
            setMessage({ text: `❌ Błąd: ${err.message}`, type: 'error' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    const visibleCount = sections.filter(s => s.visible).length;
    const hiddenCount = sections.filter(s => !s.visible).length;

    return (
        <div>
            {/* Message toast */}
            {message && (
                <div style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.75rem 1.25rem',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '8px',
                    color: 'white',
                    zIndex: 1000,
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)',
                }}>
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1.5rem',
                        background: hasChanges ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                        color: hasChanges ? '#000' : 'rgba(255,255,255,0.4)',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        cursor: hasChanges ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                    }}
                >
                    <Save size={16} />
                    {saving ? 'Zapisywanie...' : 'Zapisz układ'}
                </button>
                <button
                    onClick={handleReset}
                    disabled={saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1.25rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    <RotateCcw size={16} />
                    Domyślny
                </button>
                {hasChanges && (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>● Niezapisane zmiany</span>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.4)',
            }}>
                <span>📦 {sections.length} sekcji łącznie</span>
                <span>👁️ {visibleCount} widocznych</span>
                {hiddenCount > 0 && <span>🚫 {hiddenCount} ukrytych</span>}
            </div>

            {/* Instruction */}
            <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(var(--color-primary-rgb), 0.05)',
                border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.6,
            }}>
                <strong style={{ color: 'var(--color-primary)' }}>Jak to działa:</strong>{' '}
                Chwyć ☰ i przeciągnij sekcje aby zmienić ich kolejność. Kliknij 👁️ aby ukryć/pokazać sekcję.
                Kliknij ⚙️ aby otworzyć ustawienia. Użyj ➕ aby dodać nową sekcję.
            </div>

            {/* Sortable List */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sections.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {sections.map(section => (
                        <div key={section.id}>
                            <SortableSectionItem
                                section={section}
                                onToggleVisibility={toggleVisibility}
                                onRemove={removeSection}
                                onOpenSettings={(id) => setEditingSectionId(
                                    editingSectionId === id ? null : id
                                )}
                            />
                            {editingSectionId === section.id && (
                                <SectionSettingsPanel
                                    section={section}
                                    onUpdate={updateConfig}
                                    onClose={() => setEditingSectionId(null)}
                                />
                            )}
                        </div>
                    ))}
                </SortableContext>
            </DndContext>

            {/* Add Section Button / Panel */}
            {showAddPanel ? (
                <AddSectionPanel
                    currentSections={sections}
                    onAdd={addSection}
                    onClose={() => setShowAddPanel(false)}
                />
            ) : (
                <button
                    onClick={() => setShowAddPanel(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '1rem',
                        background: 'transparent',
                        border: '2px dashed rgba(var(--color-primary-rgb), 0.2)',
                        borderRadius: '10px',
                        color: 'rgba(var(--color-primary-rgb), 0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        marginTop: '0.5rem',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget).style.borderColor = 'rgba(var(--color-primary-rgb), 0.5)';
                        (e.currentTarget).style.background = 'rgba(var(--color-primary-rgb), 0.03)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget).style.borderColor = 'rgba(var(--color-primary-rgb), 0.2)';
                        (e.currentTarget).style.background = 'transparent';
                    }}
                >
                    <Plus size={20} /> Dodaj sekcję
                </button>
            )}
        </div>
    );
}
