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
    width?: string;
    height?: string;
    // Reorder: CSS order property (works with flex/grid parents)
    order?: number;
}

interface PageOverrides {
    elements: Record<string, ElementOverride>;
    bodyBg?: string;
    // Track which parent elements we've made flex for reordering
    flexParents?: string[];
}

const EMPTY_OVERRIDES: PageOverrides = { elements: {}, flexParents: [] };

const COLOR_PRESETS = [
    '#08090a', '#121418', '#1a1a2e', '#0a0e1a', '#0a1208', '#1a0f0f',
    '#1e293b', '#1f2937', '#292524', '#27272a',
    '#dcb14a', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899',
    '#f59e0b', '#06b6d4', '#10b981', '#f43f5e', '#6366f1', '#e8998d',
    '#ffffff', '#f5f5f5', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280',
];

// ===================== SELECTOR PATH =====================

function getElementPath(el: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current !== document.body && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();
        const section = current.getAttribute('data-section');
        if (section) {
            parts.unshift(`[data-section="${section}"]`);
            break;
        }
        if (current.id) {
            parts.unshift(`#${current.id}`);
            break;
        }
        const classes = Array.from(current.classList)
            .filter(c => !c.startsWith('ve-') && c.length < 30)
            .slice(0, 2);
        if (classes.length > 0) selector += '.' + classes.join('.');
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

    const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
    const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
    const [selectedPath, setSelectedPath] = useState<string>('');
    const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
    const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
    const [colorTarget, setColorTarget] = useState<'bg' | 'text' | null>(null);
    const [colorPos, setColorPos] = useState<{ x: number; y: number } | null>(null);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const [ctxEl, setCtxEl] = useState<HTMLElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const dropIndicatorRef = useRef<HTMLDivElement | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ---- Load ----
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
                    if (!val.flexParents) val.flexParents = [];
                    setOverrides(val);
                    setOriginal(val);
                    applyOverridesToDOM(val);
                }
            } catch (e) { console.error('[VE] load:', e); }
        })();
    }, [isEditorOpen]);

    useEffect(() => {
        if (isEditorOpen) {
            document.documentElement.setAttribute('data-ve-editing', '');
        } else {
            document.documentElement.removeAttribute('data-ve-editing');
            document.querySelectorAll('.ve-highlight,.ve-selected,.ve-hidden-element').forEach(e =>
                e.classList.remove('ve-highlight', 've-selected', 've-hidden-element'));
        }
        return () => { document.documentElement.removeAttribute('data-ve-editing'); };
    }, [isEditorOpen]);

    useEffect(() => { setHasChanges(JSON.stringify(overrides) !== JSON.stringify(original)); }, [overrides, original]);

    // ---- Apply overrides ----
    function applyOverridesToDOM(ov: PageOverrides) {
        if (ov.bodyBg) document.body.style.backgroundColor = ov.bodyBg;
        // Make flex parents
        for (const path of (ov.flexParents || [])) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (el) {
                    el.style.display = 'flex';
                    el.style.flexDirection = 'column';
                }
            } catch {}
        }
        for (const [path, s] of Object.entries(ov.elements || {})) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (!el) continue;
                if (s.hidden) el.classList.add('ve-hidden-element');
                else el.classList.remove('ve-hidden-element');
                if (s.bgColor) el.style.backgroundColor = s.bgColor;
                if (s.textColor) el.style.color = s.textColor;
                if (s.opacity) el.style.opacity = s.opacity;
                if (s.fontSize) el.style.fontSize = s.fontSize;
                if (s.fontWeight) el.style.fontWeight = s.fontWeight;
                if (s.borderRadius) el.style.borderRadius = s.borderRadius;
                if (s.width) el.style.width = s.width;
                if (s.height) el.style.height = s.height;
                if (s.order !== undefined) el.style.order = String(s.order);
            } catch {}
        }
    }

    useEffect(() => { if (isEditorOpen) applyOverridesToDOM(overrides); }, [overrides, isEditorOpen]);

    // ---- Helpers ----
    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }, []);

    function isEditorUI(el: HTMLElement): boolean {
        return !!(el.closest('.ve-toolbar') || el.closest('.ve-float-toolbar') ||
            el.closest('.ve-color-popover') || el.closest('.ve-context-menu') ||
            el.closest('.ve-toast') || el.closest('.ve-template-modal') ||
            el.closest('.ve-breadcrumb') || el.closest('.ve-drop-indicator') ||
            el.closest('.ve-resize-handle'));
    }

    function updateOverride(path: string, key: keyof ElementOverride, value: string | boolean | number | undefined) {
        setOverrides(prev => ({
            ...prev,
            elements: {
                ...prev.elements,
                [path]: { ...prev.elements[path], [key]: value },
            },
        }));
    }

    function positionToolbar(el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 360);
        const y = rect.top > 60 ? rect.top - 38 : rect.bottom + 6;
        setFloatPos({ x: Math.max(0, x), y: Math.max(48, y) });
    }

    // ---- Create drop indicator ----
    useEffect(() => {
        const div = document.createElement('div');
        div.className = 've-drop-indicator';
        div.style.cssText = 'position:absolute;left:0;right:0;height:3px;background:#6366f1;border-radius:2px;z-index:100010;pointer-events:none;display:none;box-shadow:0 0 8px rgba(99,102,241,0.5);';
        document.body.appendChild(div);
        dropIndicatorRef.current = div;
        return () => { div.remove(); };
    }, []);

    // ---- Hover/Click/ContextMenu ----
    useEffect(() => {
        if (!isEditorOpen) return;

        function onMouseOver(e: MouseEvent) {
            if (isDragging || isResizing) return;
            const t = e.target as HTMLElement;
            if (isEditorUI(t)) return;
            hoveredEl?.classList.remove('ve-highlight');
            if (t !== selectedEl) t.classList.add('ve-highlight');
            setHoveredEl(t);
        }

        function onMouseOut(e: MouseEvent) {
            (e.target as HTMLElement).classList.remove('ve-highlight');
        }

        function onClick(e: MouseEvent) {
            if (isDragging || isResizing) return;
            const t = e.target as HTMLElement;
            if (isEditorUI(t)) return;
            e.preventDefault();
            e.stopPropagation();
            selectedEl?.classList.remove('ve-selected');
            t.classList.remove('ve-highlight');
            t.classList.add('ve-selected');
            setSelectedEl(t);
            setSelectedPath(getElementPath(t));
            const bc: string[] = [];
            let cur: HTMLElement | null = t;
            while (cur && cur !== document.body) { bc.unshift(getElementLabel(cur)); cur = cur.parentElement; }
            setBreadcrumb(bc.slice(-5));
            positionToolbar(t);
            setColorTarget(null); setColorPos(null); setCtxMenu(null);
        }

        function onContextMenu(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (isEditorUI(t)) return;
            e.preventDefault();
            setCtxEl(t); setCtxMenu({ x: e.clientX, y: e.clientY });
        }

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                if (colorTarget) { setColorTarget(null); setColorPos(null); }
                else if (ctxMenu) { setCtxMenu(null); }
                else if (selectedEl) { selectedEl.classList.remove('ve-selected'); setSelectedEl(null); setFloatPos(null); }
                else { closeEditor(); }
            }
            if (e.key === 'Delete' && selectedEl && !isEditorUI(selectedEl)) {
                updateOverride(getElementPath(selectedEl), 'hidden', true);
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
    }, [isEditorOpen, hoveredEl, selectedEl, colorTarget, ctxMenu, closeEditor, isDragging, isResizing]);

    // ---- Reflow-based drag ----
    const startDrag = useCallback((dragEl: HTMLElement) => {
        if (!dragEl || !dragEl.parentElement) return;
        const parent = dragEl.parentElement;
        const parentPath = getElementPath(parent);

        // Ensure parent is flex (needed for CSS order to work)
        const computedDisplay = window.getComputedStyle(parent).display;
        if (!computedDisplay.includes('flex') && !computedDisplay.includes('grid')) {
            parent.style.display = 'flex';
            parent.style.flexDirection = 'column';
            setOverrides(prev => ({
                ...prev,
                flexParents: [...new Set([...(prev.flexParents || []), parentPath])],
            }));
        }

        const siblings = Array.from(parent.children).filter(
            c => c !== dragEl && !c.classList.contains('ve-drop-indicator') && !c.classList.contains('ve-float-toolbar')
        ) as HTMLElement[];

        setIsDragging(true);
        dragEl.classList.add('ve-dragging');
        const indicator = dropIndicatorRef.current;

        let insertBefore: HTMLElement | null = null;

        const onMouseMove = (e: MouseEvent) => {
            if (!indicator) return;
            const mouseY = e.clientY;
            let closestSibling: HTMLElement | null = null;
            let closestDist = Infinity;
            let above = true;

            for (const sib of siblings) {
                const rect = sib.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const dist = Math.abs(mouseY - midY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestSibling = sib;
                    above = mouseY < midY;
                }
            }

            if (closestSibling) {
                const rect = closestSibling.getBoundingClientRect();
                const parentRect = parent.getBoundingClientRect();
                indicator.style.display = 'block';
                indicator.style.left = `${parentRect.left}px`;
                indicator.style.width = `${parentRect.width}px`;
                if (above) {
                    indicator.style.top = `${rect.top + window.scrollY - 2}px`;
                    insertBefore = closestSibling;
                } else {
                    indicator.style.top = `${rect.bottom + window.scrollY - 1}px`;
                    insertBefore = closestSibling.nextElementSibling as HTMLElement | null;
                }
            }
        };

        const onMouseUp = () => {
            dragEl.classList.remove('ve-dragging');
            if (indicator) indicator.style.display = 'none';
            setIsDragging(false);

            // Perform DOM reorder via CSS order
            if (insertBefore !== null || siblings.length > 0) {
                // Assign order values to all children
                const allChildren = Array.from(parent.children).filter(
                    c => !c.classList.contains('ve-drop-indicator') && !c.classList.contains('ve-float-toolbar')
                ) as HTMLElement[];

                // Build new order based on current DOM positions
                const newOrder: HTMLElement[] = [];
                for (const child of allChildren) {
                    if (child === dragEl) continue;
                    if (insertBefore && child === insertBefore) {
                        newOrder.push(dragEl);
                    }
                    newOrder.push(child);
                }
                if (!insertBefore) {
                    newOrder.push(dragEl); // append at end
                }

                // Set CSS order
                newOrder.forEach((child, i) => {
                    (child as HTMLElement).style.order = String(i);
                    const path = getElementPath(child as HTMLElement);
                    setOverrides(prev => ({
                        ...prev,
                        elements: { ...prev.elements, [path]: { ...prev.elements[path], order: i } },
                    }));
                });

                showToast('📐 Element przesunięty');
                // Re-position toolbar
                positionToolbar(dragEl);
            }

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [showToast, overrides]);

    // ---- Resize ----
    const startResize = useCallback((el: HTMLElement, corner: string) => {
        const startRect = el.getBoundingClientRect();
        const startW = startRect.width;
        const startH = startRect.height;
        setIsResizing(true);

        const onMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - startRect.right;
            const dy = e.clientY - startRect.bottom;
            const newW = Math.max(40, startW + dx);
            const newH = Math.max(20, startH + dy);
            el.style.width = `${newW}px`;
            el.style.height = `${newH}px`;
        };

        const onMouseUp = () => {
            setIsResizing(false);
            const path = getElementPath(el);
            updateOverride(path, 'width', el.style.width);
            updateOverride(path, 'height', el.style.height);
            showToast('📏 Rozmiar zmieniony');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [showToast]);

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
                    el.style.width = '';
                    el.style.height = '';
                    el.style.order = '';
                }
            } catch {}
        }
        // Restore flex parents
        for (const path of (overrides.flexParents || [])) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (el) { el.style.display = ''; el.style.flexDirection = ''; }
            } catch {}
        }
        setOverrides(original);
        applyOverridesToDOM(original);
        showToast('↩️ Zmiany odrzucone');
    };

    if (!isEditorOpen) return null;

    const currentOv = selectedPath ? (overrides.elements[selectedPath] || {}) : {};
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
                    {/* HIDE/SHOW */}
                    <button
                        className={currentOv.hidden ? 've-active' : ''}
                        title={currentOv.hidden ? 'Pokaż' : 'Ukryj'}
                        onClick={(e) => {
                            e.stopPropagation();
                            const h = !currentOv.hidden;
                            updateOverride(selectedPath, 'hidden', h);
                            if (h) selectedEl.classList.add('ve-hidden-element');
                            else selectedEl.classList.remove('ve-hidden-element');
                        }}
                    >{currentOv.hidden ? '👁' : '✕'}</button>

                    <div className="ve-float-sep" />

                    {/* BG COLOR */}
                    <button className={colorTarget === 'bg' ? 've-active' : ''} title="Kolor tła"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setColorTarget(colorTarget === 'bg' ? null : 'bg');
                            setColorPos({ x: rect.left, y: rect.bottom + 6 });
                        }}>🎨</button>

                    {/* TEXT COLOR */}
                    <button className={colorTarget === 'text' ? 've-active' : ''} title="Kolor tekstu"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setColorTarget(colorTarget === 'text' ? null : 'text');
                            setColorPos({ x: rect.left, y: rect.bottom + 6 });
                        }}>🔤</button>

                    <div className="ve-float-sep" />

                    {/* DRAG TO REORDER — starts sibling reorder from this button */}
                    <button title="Przesuń (złap i przeciągnij)" style={{ cursor: 'grab' }}
                        onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            startDrag(selectedEl);
                        }}>↕️</button>

                    {/* RESIZE */}
                    <button title="Zmień rozmiar (złap i ciągnij)"
                        onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            startResize(selectedEl, 'se');
                        }}>↘️</button>

                    <div className="ve-float-sep" />

                    {/* FONT SIZE */}
                    <button title="Zmniejsz czcionkę"
                        onClick={(e) => {
                            e.stopPropagation();
                            const cur = parseFloat(window.getComputedStyle(selectedEl).fontSize);
                            const newSize = `${Math.max(8, cur - 2)}px`;
                            selectedEl.style.fontSize = newSize;
                            updateOverride(selectedPath, 'fontSize', newSize);
                        }}>A-</button>
                    <button title="Powiększ czcionkę"
                        onClick={(e) => {
                            e.stopPropagation();
                            const cur = parseFloat(window.getComputedStyle(selectedEl).fontSize);
                            const newSize = `${Math.min(120, cur + 2)}px`;
                            selectedEl.style.fontSize = newSize;
                            updateOverride(selectedPath, 'fontSize', newSize);
                        }}>A+</button>

                    <div className="ve-float-sep" />

                    {/* RESET */}
                    <button title="Resetuj element"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOverrides(prev => { const el = { ...prev.elements }; delete el[selectedPath]; return { ...prev, elements: el }; });
                            selectedEl.classList.remove('ve-hidden-element');
                            selectedEl.style.backgroundColor = '';
                            selectedEl.style.color = '';
                            selectedEl.style.width = '';
                            selectedEl.style.height = '';
                            selectedEl.style.fontSize = '';
                            selectedEl.style.order = '';
                            selectedEl.style.opacity = '';
                            selectedEl.style.borderRadius = '';
                            showToast('↩️ Reset');
                        }}>↩️</button>
                </div>
            )}

            {/* ---- Color Picker ---- */}
            {colorTarget && colorPos && selectedEl && (
                <div className="ve-color-popover" style={{ left: colorPos.x, top: colorPos.y }} onClick={e => e.stopPropagation()}>
                    <div className="ve-color-popover-label">{colorTarget === 'bg' ? 'Kolor tła' : 'Kolor tekstu'}</div>
                    <div className="ve-color-grid">
                        {COLOR_PRESETS.map(c => (
                            <button key={c}
                                className={`ve-color-swatch ${(colorTarget === 'bg' ? currentOv.bgColor : currentOv.textColor) === c ? 'active' : ''}`}
                                style={{ background: c, border: c === '#ffffff' ? '2px solid #999' : undefined }}
                                onClick={() => {
                                    const key = colorTarget === 'bg' ? 'bgColor' : 'textColor';
                                    updateOverride(selectedPath, key, c);
                                    if (colorTarget === 'bg') selectedEl.style.backgroundColor = c;
                                    else selectedEl.style.color = c;
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="color"
                            value={(colorTarget === 'bg' ? currentOv.bgColor : currentOv.textColor) || '#08090a'}
                            onChange={(e) => {
                                const key = colorTarget === 'bg' ? 'bgColor' : 'textColor';
                                updateOverride(selectedPath, key, e.target.value);
                                if (colorTarget === 'bg') selectedEl.style.backgroundColor = e.target.value;
                                else selectedEl.style.color = e.target.value;
                            }}
                            style={{ width: 30, height: 24, border: 'none', borderRadius: 3, cursor: 'pointer', padding: 0 }}
                        />
                        <button className="ve-toolbar-btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => {
                                const key = colorTarget === 'bg' ? 'bgColor' : 'textColor';
                                updateOverride(selectedPath, key, '');
                                if (colorTarget === 'bg') selectedEl.style.backgroundColor = '';
                                else selectedEl.style.color = '';
                                setColorTarget(null);
                            }}>↩️</button>
                    </div>
                </div>
            )}

            {/* ---- Context Menu ---- */}
            {ctxMenu && ctxEl && (
                <div className="ve-context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
                    <button className="ve-ctx-item" onClick={() => {
                        updateOverride(ctxPath, 'hidden', true);
                        ctxEl.classList.add('ve-hidden-element'); setCtxMenu(null);
                        showToast('🙈 Ukryty');
                    }}>✕ Ukryj element</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSelectedEl(ctxEl); setSelectedPath(ctxPath);
                        ctxEl.classList.add('ve-selected'); positionToolbar(ctxEl);
                        setColorTarget('bg'); setColorPos({ x: ctxMenu.x, y: ctxMenu.y + 30 });
                        setCtxMenu(null);
                    }}>🎨 Kolor tła</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSelectedEl(ctxEl); setSelectedPath(ctxPath);
                        ctxEl.classList.add('ve-selected'); positionToolbar(ctxEl);
                        setColorTarget('text'); setColorPos({ x: ctxMenu.x, y: ctxMenu.y + 30 });
                        setCtxMenu(null);
                    }}>🔤 Kolor tekstu</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        startDrag(ctxEl); setCtxMenu(null);
                    }}>↕️ Przesuń</button>
                    <button className="ve-ctx-item" onClick={() => {
                        startResize(ctxEl, 'se'); setCtxMenu(null);
                    }}>↘️ Zmień rozmiar</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        setOverrides(prev => { const el = { ...prev.elements }; delete el[ctxPath]; return { ...prev, elements: el }; });
                        ctxEl.classList.remove('ve-hidden-element');
                        ctxEl.style.backgroundColor = ''; ctxEl.style.color = '';
                        ctxEl.style.width = ''; ctxEl.style.height = ''; ctxEl.style.order = '';
                        setCtxMenu(null); showToast('↩️ Reset');
                    }}>↩️ Resetuj</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        if (confirm('Resetować WSZYSTKIE?')) { handleDiscard(); setCtxMenu(null); }
                    }}>🗑 Reset wszystkiego</button>
                </div>
            )}

            {/* ---- Breadcrumb ---- */}
            {selectedEl && (
                <div className="ve-breadcrumb">
                    {breadcrumb.map((bc, i) => (
                        <span key={i} className={i === breadcrumb.length - 1 ? 've-bc-active' : ''}>
                            {i > 0 && ' › '}{bc}
                        </span>
                    ))}
                </div>
            )}

            {toast && <div className="ve-toast">{toast}</div>}

            <TemplateManager
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onApplied={() => { setShowTemplates(false); showToast('✅ Załadowany'); window.location.reload(); }}
            />
        </>
    );
}
