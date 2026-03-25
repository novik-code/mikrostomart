"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVisualEditor } from '@/context/VisualEditorContext';
import { createBrowserClient } from '@supabase/ssr';
import { DEFAULT_SECTIONS, SECTION_CATALOG, type PageSection } from '@/lib/sections';
import TemplateManager from './TemplateManager';
import './editor.css';

interface PageOverrides {
    sectionOrder: string[];
    hiddenSections: string[];
    sectionColors: Record<string, { bg?: string; text?: string }>;
    customLogo?: string;
    backgroundColor?: string;
}

const DEFAULT_OVERRIDES: PageOverrides = {
    sectionOrder: [],
    hiddenSections: [],
    sectionColors: {},
};

const COLOR_PRESETS = [
    '#08090a', '#121418', '#1a1a2e', '#0a0e1a', '#0a1208', '#1a0f0f',
    '#1e293b', '#1f2937', '#292524', '#27272a',
    '#dcb14a', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899',
    '#f59e0b', '#06b6d4', '#10b981', '#f43f5e', '#6366f1', '#e8998d',
    '#ffffff', '#f5f5f5', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280',
];

export default function VisualEditorOverlay() {
    const { isEditorOpen, closeEditor } = useVisualEditor();
    const [sections, setSections] = useState<PageSection[]>([]);
    const [overrides, setOverrides] = useState<PageOverrides>(DEFAULT_OVERRIDES);
    const [originalOverrides, setOriginalOverrides] = useState<PageOverrides>(DEFAULT_OVERRIDES);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sectionId?: string } | null>(null);
    const [colorPicker, setColorPicker] = useState<{ sectionId: string; type: 'bg' | 'text'; x: number; y: number } | null>(null);
    const [dragItem, setDragItem] = useState<number | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Load sections + overrides
    useEffect(() => {
        if (!isEditorOpen) return;
        async function load() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const headers = { Authorization: `Bearer ${session.access_token}` };

                // Load sections
                const secRes = await fetch('/api/admin/sections', { headers });
                if (secRes.ok) {
                    const secData = await secRes.json();
                    const secs = secData?.value?.length > 0 ? secData.value : DEFAULT_SECTIONS;
                    setSections(secs);
                }

                // Load overrides
                const ovRes = await fetch('/api/admin/page-overrides', { headers });
                if (ovRes.ok) {
                    const ovData = await ovRes.json();
                    if (ovData?.value && Object.keys(ovData.value).length > 0) {
                        setOverrides(ovData.value);
                        setOriginalOverrides(ovData.value);
                    }
                }
            } catch (e) {
                console.error('[VisualEditor] Load error:', e);
            }
        }
        load();
    }, [isEditorOpen]);

    // Apply editor mode to DOM
    useEffect(() => {
        if (isEditorOpen) {
            document.documentElement.setAttribute('data-ve-editing', 'true');
        } else {
            document.documentElement.removeAttribute('data-ve-editing');
        }
        return () => document.documentElement.removeAttribute('data-ve-editing');
    }, [isEditorOpen]);

    // Apply overrides live to DOM
    useEffect(() => {
        if (!isEditorOpen) return;

        // Apply section visibility
        document.querySelectorAll('[data-section]').forEach(el => {
            const sectionId = el.getAttribute('data-section') || '';
            if (overrides.hiddenSections.includes(sectionId)) {
                el.classList.add('ve-hidden');
            } else {
                el.classList.remove('ve-hidden');
            }

            // Apply section colors
            const colors = overrides.sectionColors[sectionId];
            if (colors?.bg) (el as HTMLElement).style.backgroundColor = colors.bg;
            if (colors?.text) (el as HTMLElement).style.color = colors.text;
        });

        // Apply section order
        if (overrides.sectionOrder.length > 0) {
            document.querySelectorAll('[data-section]').forEach(el => {
                const sectionId = el.getAttribute('data-section') || '';
                const idx = overrides.sectionOrder.indexOf(sectionId);
                if (idx >= 0) {
                    (el as HTMLElement).style.order = String(idx);
                }
            });
        }

        // Apply background
        if (overrides.backgroundColor) {
            document.body.style.backgroundColor = overrides.backgroundColor;
        }
    }, [overrides, isEditorOpen]);

    // Track changes
    useEffect(() => {
        setHasChanges(JSON.stringify(overrides) !== JSON.stringify(originalOverrides));
    }, [overrides, originalOverrides]);

    // Close context menu on click
    useEffect(() => {
        const handler = () => { setContextMenu(null); setColorPicker(null); };
        if (isEditorOpen) document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [isEditorOpen]);

    // Keyboard shortcut: Escape closes editor
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isEditorOpen) {
                if (colorPicker) setColorPicker(null);
                else if (contextMenu) setContextMenu(null);
                else closeEditor();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isEditorOpen, colorPicker, contextMenu, closeEditor]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }, []);

    // Toggle section visibility
    const toggleSectionVisibility = useCallback((sectionId: string) => {
        setOverrides(prev => {
            const hidden = prev.hiddenSections.includes(sectionId)
                ? prev.hiddenSections.filter(s => s !== sectionId)
                : [...prev.hiddenSections, sectionId];
            return { ...prev, hiddenSections: hidden };
        });
    }, []);

    // Change section color
    const setSectionColor = useCallback((sectionId: string, type: 'bg' | 'text', color: string) => {
        setOverrides(prev => ({
            ...prev,
            sectionColors: {
                ...prev.sectionColors,
                [sectionId]: {
                    ...prev.sectionColors[sectionId],
                    [type]: color,
                },
            },
        }));
    }, []);

    // Drag handlers for reorder
    const handleDragStart = useCallback((idx: number) => setDragItem(idx), []);
    const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragItem === null || dragItem === idx) return;
        const newSections = [...sections];
        const [moved] = newSections.splice(dragItem, 1);
        newSections.splice(idx, 0, moved);
        setSections(newSections);
        setDragItem(idx);
        setOverrides(prev => ({
            ...prev,
            sectionOrder: newSections.map(s => s.id),
        }));
    }, [dragItem, sections]);

    // Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            const headers = {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            };

            // Save overrides
            const res = await fetch('/api/admin/page-overrides', {
                method: 'PUT',
                headers,
                body: JSON.stringify(overrides),
            });
            if (!res.ok) throw new Error('Failed to save overrides');

            // Save section order/visibility
            const updatedSections = sections.map(s => ({
                ...s,
                visible: !overrides.hiddenSections.includes(s.id),
            }));
            const secRes = await fetch('/api/admin/sections', {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatedSections),
            });
            if (!secRes.ok) throw new Error('Failed to save sections');

            setOriginalOverrides(overrides);
            setHasChanges(false);
            showToast('✅ Zmiany zapisane!');
        } catch (err: any) {
            showToast(`❌ Błąd: ${err.message}`);
        }
        setSaving(false);
    };

    // Discard
    const handleDiscard = () => {
        setOverrides(originalOverrides);
        showToast('↩️ Zmiany odrzucone');
    };

    // Add section from catalog
    const addSection = (sectionType: string) => {
        const meta = SECTION_CATALOG.find(s => s.type === sectionType);
        if (!meta) return;
        const newId = `${sectionType}-${Date.now()}`;
        const newSection: PageSection = {
            id: newId,
            type: meta.type,
            visible: true,
            order: sections.length,
            config: { ...meta.defaultConfig },
        };
        setSections(prev => [...prev, newSection]);
        setOverrides(prev => ({
            ...prev,
            sectionOrder: [...(prev.sectionOrder.length > 0 ? prev.sectionOrder : sections.map(s => s.id)), newId],
        }));
        showToast(`➕ Dodano: ${meta.label}`);
        setContextMenu(null);
    };

    // Right-click handler
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const sectionEl = (e.target as HTMLElement).closest('[data-section]');
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            sectionId: sectionEl?.getAttribute('data-section') || undefined,
        });
    }, []);

    if (!isEditorOpen) return null;

    const activeSections = sections.filter(s => !overrides.hiddenSections.includes(s.id));
    const hiddenSections = sections.filter(s => overrides.hiddenSections.includes(s.id));
    const availableToAdd = SECTION_CATALOG.filter(cat =>
        !sections.some(s => s.type === cat.type) || cat.maxInstances > 1 || cat.maxInstances === -1
    );

    return (
        <>
            {/* Top Toolbar */}
            <div className="ve-toolbar">
                <div className="ve-toolbar-group">
                    <span className="ve-toolbar-title">✏️ Edytor wizualny</span>
                    <div className="ve-toolbar-divider" />
                    {hasChanges && <div className="ve-unsaved-dot" />}
                    {hasChanges && (
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Niezapisane</span>
                    )}
                </div>
                <div className="ve-toolbar-group">
                    <button className="ve-toolbar-btn" onClick={handleDiscard} disabled={!hasChanges}>
                        ↩️ Odrzuć
                    </button>
                    <button className="ve-toolbar-btn ve-success" onClick={handleSave} disabled={saving || !hasChanges}>
                        {saving ? '⏳ Zapisuję...' : '💾 Zapisz'}
                    </button>
                    <button className="ve-toolbar-btn ve-primary" onClick={() => setShowTemplates(true)}>
                        📁 Szablony
                    </button>
                    <div className="ve-toolbar-divider" />
                    <button className="ve-toolbar-btn ve-danger" onClick={closeEditor}>
                        ✕ Zamknij
                    </button>
                </div>
            </div>

            {/* Left Sidebar — Section List */}
            <div className="ve-sidebar" onContextMenu={handleContextMenu}>
                <div className="ve-sidebar-title">Sekcje strony</div>

                {/* Active sections */}
                {sections.filter(s => !overrides.hiddenSections.includes(s.id)).map((section, idx) => {
                    const meta = SECTION_CATALOG.find(c => c.type === section.type);
                    return (
                        <div
                            key={section.id}
                            className={`ve-section-item ${dragItem === idx ? 've-dragging' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={() => setDragItem(null)}
                            onClick={() => {
                                const el = document.querySelector(`[data-section="${section.id}"]`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        >
                            <span className="ve-drag-handle">⠿</span>
                            <span className="ve-section-label">
                                {meta?.icon} {meta?.label || section.type}
                            </span>
                            <button
                                className="ve-visibility-btn"
                                title="Ukryj sekcję"
                                onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(section.id); }}
                            >
                                👁
                            </button>
                            <button
                                className="ve-visibility-btn"
                                title="Zmień tło"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                    setColorPicker({ sectionId: section.id, type: 'bg', x: rect.right + 8, y: rect.top });
                                }}
                            >
                                🎨
                            </button>
                        </div>
                    );
                })}

                {/* Hidden sections */}
                {hiddenSections.length > 0 && (
                    <>
                        <div className="ve-sidebar-title" style={{ marginTop: '1rem' }}>Ukryte</div>
                        {hiddenSections.map(section => {
                            const meta = SECTION_CATALOG.find(c => c.type === section.type);
                            return (
                                <div key={section.id} className="ve-section-item" style={{ opacity: 0.5 }}>
                                    <span className="ve-section-label ve-hidden-label">
                                        {meta?.icon} {meta?.label || section.type}
                                    </span>
                                    <button
                                        className="ve-visibility-btn"
                                        title="Pokaż sekcję"
                                        onClick={() => toggleSectionVisibility(section.id)}
                                    >
                                        👁‍🗨
                                    </button>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Add section */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                    <div className="ve-sidebar-title">Dodaj sekcję</div>
                    {availableToAdd.map(cat => (
                        <button
                            key={cat.type}
                            className="ve-section-item"
                            style={{ cursor: 'pointer', border: '1px dashed rgba(99,102,241,0.3)' }}
                            onClick={() => addSection(cat.type)}
                        >
                            <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                            <span className="ve-section-label" style={{ color: '#a5b4fc' }}>
                                {cat.label}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>+</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Color Picker Popover */}
            {colorPicker && (
                <div
                    className="ve-color-picker"
                    style={{ left: colorPicker.x, top: colorPicker.y }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="ve-color-picker-label">
                        {colorPicker.type === 'bg' ? 'Kolor tła' : 'Kolor tekstu'}
                    </div>
                    <div className="ve-color-presets">
                        {COLOR_PRESETS.map(color => (
                            <button
                                key={color}
                                className={`ve-color-preset ${overrides.sectionColors[colorPicker.sectionId]?.[colorPicker.type] === color ? 've-active' : ''}`}
                                style={{ background: color, border: color === '#ffffff' ? '2px solid #ccc' : undefined }}
                                onClick={() => {
                                    setSectionColor(colorPicker.sectionId, colorPicker.type, color);
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={overrides.sectionColors[colorPicker.sectionId]?.[colorPicker.type] || '#08090a'}
                            onChange={(e) => setSectionColor(colorPicker.sectionId, colorPicker.type, e.target.value)}
                            style={{ width: '36px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <input
                            type="text"
                            placeholder="#hex"
                            value={overrides.sectionColors[colorPicker.sectionId]?.[colorPicker.type] || ''}
                            onChange={(e) => setSectionColor(colorPicker.sectionId, colorPicker.type, e.target.value)}
                            style={{
                                flex: 1,
                                padding: '0.3rem 0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                            }}
                        />
                        <button
                            className="ve-toolbar-btn"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                                setSectionColor(colorPicker.sectionId, colorPicker.type, '');
                                setColorPicker(null);
                            }}
                        >
                            ↩️ Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="ve-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    {contextMenu.sectionId && (
                        <>
                            <button className="ve-context-menu-item" onClick={() => {
                                toggleSectionVisibility(contextMenu.sectionId!);
                                setContextMenu(null);
                            }}>
                                {overrides.hiddenSections.includes(contextMenu.sectionId)
                                    ? '👁 Pokaż sekcję' : '✕ Ukryj sekcję'}
                            </button>
                            <button className="ve-context-menu-item" onClick={() => {
                                setColorPicker({ sectionId: contextMenu.sectionId!, type: 'bg', x: contextMenu.x, y: contextMenu.y + 40 });
                                setContextMenu(null);
                            }}>
                                🎨 Zmień kolor tła
                            </button>
                            <button className="ve-context-menu-item" onClick={() => {
                                setColorPicker({ sectionId: contextMenu.sectionId!, type: 'text', x: contextMenu.x, y: contextMenu.y + 40 });
                                setContextMenu(null);
                            }}>
                                🔤 Zmień kolor tekstu
                            </button>
                            <div className="ve-context-menu-divider" />
                        </>
                    )}
                    <button className="ve-context-menu-item" onClick={() => {
                        setOverrides(prev => ({ ...prev, backgroundColor: '' }));
                        setContextMenu(null);
                    }}>
                        🖼️ Resetuj tło strony
                    </button>
                </div>
            )}

            {/* Toast */}
            {toast && <div className="ve-toast">{toast}</div>}

            {/* Template Manager Modal */}
            <TemplateManager
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onApplied={() => {
                    setShowTemplates(false);
                    showToast('✅ Szablon załadowany — odśwież stronę');
                    // Reload overrides
                    window.location.reload();
                }}
            />
        </>
    );
}
