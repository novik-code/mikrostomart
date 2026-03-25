"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVisualEditor } from '@/context/VisualEditorContext';
import { createBrowserClient } from '@supabase/ssr';
import TemplateManager from './TemplateManager';
import './editor.css';

// ===================== TYPES =====================

interface ElementOverride {
    hidden?: boolean;
    bgColor?: string;
    textColor?: string;
    opacity?: string;
    fontSize?: string;
    fontWeight?: string;
    borderRadius?: string;
    transform?: string; // for drag-to-move: "translate(Xpx, Ypx)"
}

interface PageOverrides {
    elements: Record<string, ElementOverride>; // keyed by CSS selector path
    bodyBg?: string;
}

const EMPTY_OVERRIDES: PageOverrides = { elements: {} };

const COLOR_PRESETS = [
    '#08090a', '#121418', '#1a1a2e', '#0a0e1a', '#0a1208', '#1a0f0f',
    '#1e293b', '#1f2937', '#292524', '#27272a',
    '#dcb14a', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899',
    '#f59e0b', '#06b6d4', '#10b981', '#f43f5e', '#6366f1', '#e8998d',
    '#ffffff', '#f5f5f5', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280',
];

// ===================== SELECTOR PATH =====================

/** Build a unique CSS-like path for an element */
function getElementPath(el: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current !== document.body && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();
        // Prefer data-section
        const section = current.getAttribute('data-section');
        if (section) {
            selector = `[data-section="${section}"]`;
            parts.unshift(selector);
            break; // data-section is unique enough
        }
        // Use id if available
        if (current.id) {
            selector = `#${current.id}`;
            parts.unshift(selector);
            break;
        }
        // Use classes (first 2 meaningful ones)
        const classes = Array.from(current.classList)
            .filter(c => !c.startsWith('ve-') && c.length < 30)
            .slice(0, 2);
        if (classes.length > 0) {
            selector += '.' + classes.join('.');
        }
        // Add nth-child for disambiguation
        const parent = current.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(s => s.tagName === current!.tagName);
            if (siblings.length > 1) {
                const idx = siblings.indexOf(current) + 1;
                selector += `:nth-child(${idx})`;
            }
        }
        parts.unshift(selector);
        current = current.parentElement;
    }
    return parts.join(' > ');
}

/** Get readable label for breadcrumb */
function getElementLabel(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const section = el.getAttribute('data-section');
    if (section) return `section[${section}]`;
    if (el.id) return `#${el.id}`;
    const cls = Array.from(el.classList).filter(c => !c.startsWith('ve-')).slice(0, 2).join('.');
    const text = el.textContent?.trim().slice(0, 20);
    if (cls) return `${tag}.${cls}`;
    if (text) return `${tag} "${text}…"`;
    return tag;
}

// ===================== COMPONENT =====================

export default function VisualEditorOverlay() {
    const { isEditorOpen, closeEditor } = useVisualEditor();
    const [overrides, setOverrides] = useState<PageOverrides>(EMPTY_OVERRIDES);
    const [original, setOriginal] = useState<PageOverrides>(EMPTY_OVERRIDES);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // Selection state
    const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
    const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
    const [selectedPath, setSelectedPath] = useState<string>('');
    const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
    const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);

    // Color picker
    const [colorTarget, setColorTarget] = useState<'bg' | 'text' | null>(null);
    const [colorPos, setColorPos] = useState<{ x: number; y: number } | null>(null);

    // Context menu
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const [ctxEl, setCtxEl] = useState<HTMLElement | null>(null);

    // Drag
    const dragRef = useRef<{ startX: number; startY: number; origTransform: string } | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ---- Load overrides ----
    useEffect(() => {
        if (!isEditorOpen) return;
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const res = await fetch('/api/admin/page-overrides', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const d = await res.json();
                    const val = d?.value && typeof d.value === 'object' ? d.value : EMPTY_OVERRIDES;
                    if (!val.elements) val.elements = {};
                    setOverrides(val);
                    setOriginal(val);
                    applyOverridesToDOM(val);
                }
            } catch (e) { console.error('[VE] load:', e); }
        })();
    }, [isEditorOpen]);

    // ---- Toggle editing attribute on <html> ----
    useEffect(() => {
        if (isEditorOpen) {
            document.documentElement.setAttribute('data-ve-editing', '');
        } else {
            document.documentElement.removeAttribute('data-ve-editing');
            // Clean up highlights
            document.querySelectorAll('.ve-highlight,.ve-selected,.ve-hidden-element').forEach(e => {
                e.classList.remove('ve-highlight', 've-selected', 've-hidden-element');
            });
        }
        return () => { document.documentElement.removeAttribute('data-ve-editing'); };
    }, [isEditorOpen]);

    // ---- Track changes ----
    useEffect(() => {
        setHasChanges(JSON.stringify(overrides) !== JSON.stringify(original));
    }, [overrides, original]);

    // ---- Apply overrides to DOM ----
    function applyOverridesToDOM(ov: PageOverrides) {
        if (ov.bodyBg) document.body.style.backgroundColor = ov.bodyBg;
        for (const [path, styles] of Object.entries(ov.elements || {})) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (!el) continue;
                if (styles.hidden) el.classList.add('ve-hidden-element');
                else el.classList.remove('ve-hidden-element');
                if (styles.bgColor) el.style.backgroundColor = styles.bgColor;
                if (styles.textColor) el.style.color = styles.textColor;
                if (styles.opacity) el.style.opacity = styles.opacity;
                if (styles.fontSize) el.style.fontSize = styles.fontSize;
                if (styles.fontWeight) el.style.fontWeight = styles.fontWeight;
                if (styles.borderRadius) el.style.borderRadius = styles.borderRadius;
                if (styles.transform) el.style.transform = styles.transform;
            } catch { /* invalid selector, skip */ }
        }
    }

    // Re-apply when overrides change
    useEffect(() => {
        if (isEditorOpen) applyOverridesToDOM(overrides);
    }, [overrides, isEditorOpen]);

    // ---- Helpers ----
    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }, []);

    function isEditorUI(el: HTMLElement): boolean {
        return !!(el.closest('.ve-toolbar') || el.closest('.ve-float-toolbar') || el.closest('.ve-color-popover') || el.closest('.ve-context-menu') || el.closest('.ve-toast') || el.closest('.ve-template-modal') || el.closest('.ve-breadcrumb') || el.closest('[class*="AdminFloatingBar"]'));
    }

    function updateElementOverride(path: string, key: keyof ElementOverride, value: string | boolean) {
        setOverrides(prev => ({
            ...prev,
            elements: {
                ...prev.elements,
                [path]: {
                    ...prev.elements[path],
                    [key]: value || undefined,
                },
            },
        }));
    }

    function positionFloatToolbar(el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 300);
        const y = rect.top > 60 ? rect.top - 36 : rect.bottom + 6;
        setFloatPos({ x: Math.max(0, x), y: Math.max(48, y) });
    }

    // ---- Hover/Click handlers (delegated) ----
    useEffect(() => {
        if (!isEditorOpen) return;

        function onMouseOver(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (isEditorUI(t)) return;
            if (t === hoveredEl) return;
            hoveredEl?.classList.remove('ve-highlight');
            if (t !== selectedEl) {
                t.classList.add('ve-highlight');
            }
            setHoveredEl(t);
        }

        function onMouseOut(e: MouseEvent) {
            const t = e.target as HTMLElement;
            t.classList.remove('ve-highlight');
        }

        function onClick(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (isEditorUI(t)) return;
            e.preventDefault();
            e.stopPropagation();

            // Deselect previous
            selectedEl?.classList.remove('ve-selected');

            // Select new
            t.classList.remove('ve-highlight');
            t.classList.add('ve-selected');
            setSelectedEl(t);
            const path = getElementPath(t);
            setSelectedPath(path);

            // Build breadcrumb
            const bc: string[] = [];
            let cur: HTMLElement | null = t;
            while (cur && cur !== document.body) {
                bc.unshift(getElementLabel(cur));
                cur = cur.parentElement;
            }
            setBreadcrumb(bc.slice(-5));

            // Position floating toolbar
            positionFloatToolbar(t);
            setColorTarget(null);
            setColorPos(null);
            setCtxMenu(null);
        }

        function onContextMenu(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (isEditorUI(t)) return;
            e.preventDefault();
            setCtxEl(t);
            setCtxMenu({ x: e.clientX, y: e.clientY });
        }

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                if (colorTarget) { setColorTarget(null); setColorPos(null); }
                else if (ctxMenu) { setCtxMenu(null); }
                else if (selectedEl) { selectedEl.classList.remove('ve-selected'); setSelectedEl(null); setFloatPos(null); }
                else { closeEditor(); }
            }
            if (e.key === 'Delete' && selectedEl && !isEditorUI(selectedEl)) {
                const path = getElementPath(selectedEl);
                updateElementOverride(path, 'hidden', true);
                selectedEl.classList.add('ve-hidden-element');
                showToast('🙈 Element ukryty');
            }
        }

        document.addEventListener('mouseover', onMouseOver, true);
        document.addEventListener('mouseout', onMouseOut, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('contextmenu', onContextMenu, true);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mouseover', onMouseOver, true);
            document.removeEventListener('mouseout', onMouseOut, true);
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('contextmenu', onContextMenu, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isEditorOpen, hoveredEl, selectedEl, colorTarget, ctxMenu, closeEditor]);

    // ---- Save ----
    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            const res = await fetch('/api/admin/page-overrides', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(overrides),
            });
            if (!res.ok) throw new Error('Save failed');
            setOriginal(overrides);
            setHasChanges(false);
            showToast('✅ Zapisano!');
        } catch (err: any) { showToast('❌ ' + err.message); }
        setSaving(false);
    };

    // ---- Discard ----
    const handleDiscard = () => {
        // Remove all applied styles and re-apply originals
        for (const path of Object.keys(overrides.elements)) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (el) {
                    el.classList.remove('ve-hidden-element');
                    el.style.backgroundColor = '';
                    el.style.color = '';
                    el.style.opacity = '';
                    el.style.fontSize = '';
                    el.style.fontWeight = '';
                    el.style.borderRadius = '';
                    el.style.transform = '';
                }
            } catch {}
        }
        setOverrides(original);
        applyOverridesToDOM(original);
        showToast('↩️ Zmiany odrzucone');
    };

    // ---- Drag to move ----
    const startDrag = () => {
        if (!selectedEl) return;
        const path = selectedPath;
        const existing = overrides.elements[path]?.transform || '';

        const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) {
                dragRef.current = { startX: e.clientX, startY: e.clientY, origTransform: existing };
                selectedEl.classList.add('ve-dragging');
            }
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            // Parse existing translate if any
            const match = dragRef.current.origTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
            const origDx = match ? parseFloat(match[1]) : 0;
            const origDy = match ? parseFloat(match[2]) : 0;
            selectedEl.style.transform = `translate(${origDx + dx}px, ${origDy + dy}px)`;
        };

        const onMouseUp = () => {
            selectedEl.classList.remove('ve-dragging');
            if (dragRef.current) {
                updateElementOverride(path, 'transform', selectedEl.style.transform);
                showToast('📐 Element przesunięty');
            }
            dragRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (!isEditorOpen) return null;

    const currentOverride = selectedPath ? (overrides.elements[selectedPath] || {}) : {};
    const ctxPath = ctxEl ? getElementPath(ctxEl) : '';

    return (
        <>
            {/* ---- Top Toolbar ---- */}
            <div className="ve-toolbar">
                <div className="ve-toolbar-group">
                    <span className="ve-toolbar-title">✏️ Edytor</span>
                    {hasChanges && <div className="ve-unsaved-dot" />}
                    {hasChanges && <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Niezapisane</span>}
                </div>
                <div className="ve-toolbar-group">
                    <button className="ve-toolbar-btn" onClick={handleDiscard} disabled={!hasChanges}>↩️ Odrzuć</button>
                    <button className="ve-toolbar-btn ve-success" onClick={handleSave} disabled={saving || !hasChanges}>
                        {saving ? '⏳...' : '💾 Zapisz'}
                    </button>
                    <div className="ve-toolbar-sep" />
                    <button className="ve-toolbar-btn ve-primary" onClick={() => setShowTemplates(true)}>📁 Szablony</button>
                    <div className="ve-toolbar-sep" />
                    <button className="ve-toolbar-btn ve-danger" onClick={closeEditor}>✕</button>
                </div>
            </div>

            {/* ---- Floating Element Toolbar ---- */}
            {selectedEl && floatPos && (
                <div className="ve-float-toolbar" style={{ left: floatPos.x, top: floatPos.y }}>
                    <button
                        className={currentOverride.hidden ? 've-active' : ''}
                        title={currentOverride.hidden ? 'Pokaż element' : 'Ukryj element'}
                        onClick={(e) => {
                            e.stopPropagation();
                            const newHidden = !currentOverride.hidden;
                            updateElementOverride(selectedPath, 'hidden', newHidden);
                            if (newHidden) selectedEl.classList.add('ve-hidden-element');
                            else selectedEl.classList.remove('ve-hidden-element');
                        }}
                    >
                        {currentOverride.hidden ? '👁' : '✕'}
                    </button>
                    <div className="ve-float-sep" />
                    <button
                        className={colorTarget === 'bg' ? 've-active' : ''}
                        title="Kolor tła"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setColorTarget(colorTarget === 'bg' ? null : 'bg');
                            setColorPos({ x: rect.left, y: rect.bottom + 6 });
                        }}
                    >
                        🎨
                    </button>
                    <button
                        className={colorTarget === 'text' ? 've-active' : ''}
                        title="Kolor tekstu"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setColorTarget(colorTarget === 'text' ? null : 'text');
                            setColorPos({ x: rect.left, y: rect.bottom + 6 });
                        }}
                    >
                        🔤
                    </button>
                    <div className="ve-float-sep" />
                    <button
                        title="Przesuń element (kliknij i przeciągnij)"
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startDrag(); }}
                    >
                        ↕️
                    </button>
                    <div className="ve-float-sep" />
                    <button
                        title="Resetuj zmiany tego elementu"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Remove override
                            setOverrides(prev => {
                                const newEl = { ...prev.elements };
                                delete newEl[selectedPath];
                                return { ...prev, elements: newEl };
                            });
                            // Clean styles
                            selectedEl.classList.remove('ve-hidden-element');
                            selectedEl.style.backgroundColor = '';
                            selectedEl.style.color = '';
                            selectedEl.style.transform = '';
                            selectedEl.style.opacity = '';
                            selectedEl.style.fontSize = '';
                            selectedEl.style.fontWeight = '';
                            selectedEl.style.borderRadius = '';
                            showToast('↩️ Element zresetowany');
                        }}
                    >
                        ↩️
                    </button>
                </div>
            )}

            {/* ---- Color Picker ---- */}
            {colorTarget && colorPos && selectedEl && (
                <div className="ve-color-popover" style={{ left: colorPos.x, top: colorPos.y }} onClick={e => e.stopPropagation()}>
                    <div className="ve-color-popover-label">{colorTarget === 'bg' ? 'Kolor tła' : 'Kolor tekstu'}</div>
                    <div className="ve-color-grid">
                        {COLOR_PRESETS.map(c => (
                            <button
                                key={c}
                                className={`ve-color-swatch ${
                                    (colorTarget === 'bg' ? currentOverride.bgColor : currentOverride.textColor) === c ? 'active' : ''
                                }`}
                                style={{ background: c, border: c === '#ffffff' ? '2px solid #999' : undefined }}
                                onClick={() => {
                                    const key = colorTarget === 'bg' ? 'bgColor' : 'textColor';
                                    updateElementOverride(selectedPath, key, c);
                                    if (colorTarget === 'bg') selectedEl.style.backgroundColor = c;
                                    else selectedEl.style.color = c;
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={(colorTarget === 'bg' ? currentOverride.bgColor : currentOverride.textColor) || '#08090a'}
                            onChange={(e) => {
                                const key = colorTarget === 'bg' ? 'bgColor' : 'textColor';
                                updateElementOverride(selectedPath, key, e.target.value);
                                if (colorTarget === 'bg') selectedEl.style.backgroundColor = e.target.value;
                                else selectedEl.style.color = e.target.value;
                            }}
                            style={{ width: 30, height: 24, border: 'none', borderRadius: 3, cursor: 'pointer', padding: 0 }}
                        />
                        <button
                            className="ve-toolbar-btn"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => {
                                const key = colorTarget === 'bg' ? 'bgColor' : 'textColor';
                                updateElementOverride(selectedPath, key, '');
                                if (colorTarget === 'bg') selectedEl.style.backgroundColor = '';
                                else selectedEl.style.color = '';
                                setColorTarget(null);
                            }}
                        >
                            ↩️
                        </button>
                    </div>
                </div>
            )}

            {/* ---- Context Menu ---- */}
            {ctxMenu && ctxEl && (
                <div className="ve-context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
                    <button className="ve-ctx-item" onClick={() => {
                        updateElementOverride(ctxPath, 'hidden', true);
                        ctxEl.classList.add('ve-hidden-element');
                        setCtxMenu(null);
                        showToast('🙈 Element ukryty');
                    }}>✕ Ukryj element</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSelectedEl(ctxEl);
                        setSelectedPath(ctxPath);
                        ctxEl.classList.add('ve-selected');
                        positionFloatToolbar(ctxEl);
                        setColorTarget('bg');
                        const rect = ctxEl.getBoundingClientRect();
                        setColorPos({ x: ctxMenu.x, y: ctxMenu.y + 30 });
                        setCtxMenu(null);
                    }}>🎨 Zmień kolor tła</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSelectedEl(ctxEl);
                        setSelectedPath(ctxPath);
                        ctxEl.classList.add('ve-selected');
                        positionFloatToolbar(ctxEl);
                        setColorTarget('text');
                        setColorPos({ x: ctxMenu.x, y: ctxMenu.y + 30 });
                        setCtxMenu(null);
                    }}>🔤 Zmień kolor tekstu</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        setOverrides(prev => {
                            const newEl = { ...prev.elements };
                            delete newEl[ctxPath];
                            return { ...prev, elements: newEl };
                        });
                        ctxEl.classList.remove('ve-hidden-element');
                        ctxEl.style.backgroundColor = '';
                        ctxEl.style.color = '';
                        ctxEl.style.transform = '';
                        setCtxMenu(null);
                        showToast('↩️ Reset elementu');
                    }}>↩️ Resetuj element</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        // Reset ALL overrides
                        if (confirm('Resetować WSZYSTKIE zmiany?')) {
                            handleDiscard();
                            setCtxMenu(null);
                        }
                    }}>🗑 Resetuj wszystko</button>
                </div>
            )}

            {/* ---- Breadcrumb bar ---- */}
            {selectedEl && (
                <div className="ve-breadcrumb">
                    {breadcrumb.map((bc, i) => (
                        <span key={i} className={i === breadcrumb.length - 1 ? 've-bc-active' : ''}>
                            {i > 0 && ' › '}
                            {bc}
                        </span>
                    ))}
                </div>
            )}

            {/* ---- Toast ---- */}
            {toast && <div className="ve-toast">{toast}</div>}

            {/* ---- Template Manager ---- */}
            <TemplateManager
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onApplied={() => {
                    setShowTemplates(false);
                    showToast('✅ Szablon załadowany');
                    window.location.reload();
                }}
            />
        </>
    );
}
