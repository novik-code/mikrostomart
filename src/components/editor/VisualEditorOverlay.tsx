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
    order?: number;
}

interface PageOverrides {
    elements: Record<string, ElementOverride>;
    bodyBg?: string;
    flexParents?: string[];
    heroVideoId?: string;
    heroVideoOpacity?: number;
}

const EMPTY: PageOverrides = { elements: {}, flexParents: [] };

const COLORS = [
    '#08090a', '#121418', '#1a1a2e', '#0a0e1a', '#0a1208', '#1a0f0f',
    '#1e293b', '#1f2937', '#292524', '#27272a',
    '#dcb14a', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899',
    '#f59e0b', '#06b6d4', '#10b981', '#f43f5e', '#6366f1', '#e8998d',
    '#ffffff', '#f5f5f5', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280',
];

// ===================== PATH UTILS =====================

function getPath(el: HTMLElement): string {
    const parts: string[] = [];
    let cur: HTMLElement | null = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
        let sel = cur.tagName.toLowerCase();
        const sec = cur.getAttribute('data-section');
        if (sec) { parts.unshift(`[data-section="${sec}"]`); break; }
        if (cur.id) { parts.unshift(`#${cur.id}`); break; }
        const cls = Array.from(cur.classList).filter(c => !c.startsWith('ve-') && c.length < 30).slice(0, 2);
        if (cls.length) sel += '.' + cls.join('.');
        const p = cur.parentElement;
        if (p) {
            const sibs = Array.from(p.children).filter(s => s.tagName === cur!.tagName);
            if (sibs.length > 1) sel += `:nth-child(${sibs.indexOf(cur) + 1})`;
        }
        parts.unshift(sel);
        cur = cur.parentElement;
    }
    return parts.join(' > ');
}

function getLabel(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const sec = el.getAttribute('data-section');
    if (sec) return `[${sec}]`;
    if (el.id) return `#${el.id}`;
    const cls = Array.from(el.classList).filter(c => !c.startsWith('ve-')).slice(0, 2).join('.');
    const txt = el.textContent?.trim().slice(0, 18);
    if (cls) return `${tag}.${cls}`;
    if (txt) return `${tag} "${txt}…"`;
    return tag;
}

function isUI(el: HTMLElement): boolean {
    return !!(el.closest('.ve-toolbar') || el.closest('.ve-float-toolbar') ||
        el.closest('.ve-color-popover') || el.closest('.ve-context-menu') ||
        el.closest('.ve-toast') || el.closest('.ve-template-modal') ||
        el.closest('.ve-breadcrumb') || el.closest('.ve-drop-indicator') ||
        el.closest('.ve-resize-handle') || el.closest('.ve-video-popup'));
}

// ===================== COMPONENT =====================

export default function VisualEditorOverlay() {
    const { isEditorOpen, closeEditor } = useVisualEditor();
    const [ov, setOv] = useState<PageOverrides>(EMPTY);
    const [orig, setOrig] = useState<PageOverrides>(EMPTY);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [showTpl, setShowTpl] = useState(false);

    // Selection
    const [hov, setHov] = useState<HTMLElement | null>(null);
    const [sel, setSel] = useState<HTMLElement | null>(null);
    const [selPath, setSelPath] = useState('');
    const [bc, setBc] = useState<string[]>([]);
    const [fPos, setFPos] = useState<{ x: number; y: number } | null>(null);
    const [colorTgt, setColorTgt] = useState<'bg' | 'text' | null>(null);
    const [colorPos, setColorPos] = useState<{ x: number; y: number } | null>(null);
    const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
    const [ctxEl, setCtxEl] = useState<HTMLElement | null>(null);

    // MODES — activated by clicking a toolbar button, then interacting with element
    const [moveMode, setMoveMode] = useState(false);
    const [resizeMode, setResizeMode] = useState(false);
    const [hoverFrozen, setHoverFrozen] = useState(false);
    const [videoPopup, setVideoPopup] = useState(false);
    const [videoId, setVideoId] = useState('');
    const [videoOpacity, setVideoOpacity] = useState(0.3);
    const [isDragging, setIsDragging] = useState(false);

    const dropRef = useRef<HTMLDivElement | null>(null);
    const resizeRef = useRef<{ w: number; h: number; x: number; y: number } | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ---- Show toast ----
    const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); }, []);

    // ---- Update override ----
    function upd(path: string, key: keyof ElementOverride, val: string | boolean | number | undefined) {
        setOv(p => ({ ...p, elements: { ...p.elements, [path]: { ...p.elements[path], [key]: val } } }));
    }

    function posToolbar(el: HTMLElement) {
        const r = el.getBoundingClientRect();
        setFPos({ x: Math.max(0, Math.min(r.left, innerWidth - 400)), y: Math.max(48, r.top > 60 ? r.top - 38 : r.bottom + 6) });
    }

    // ---- Load ----
    useEffect(() => {
        if (!isEditorOpen) return;
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const res = await fetch('/api/admin/page-overrides', { headers: { Authorization: `Bearer ${session.access_token}` } });
                if (res.ok) {
                    const d = await res.json();
                    const v = d?.value && typeof d.value === 'object' ? d.value : EMPTY;
                    if (!v.elements) v.elements = {};
                    if (!v.flexParents) v.flexParents = [];
                    setOv(v);
                    setOrig(v);
                    applyDOM(v);
                    if (v.heroVideoId) setVideoId(v.heroVideoId);
                    if (v.heroVideoOpacity !== undefined) setVideoOpacity(v.heroVideoOpacity);
                }
            } catch (e) { console.error('[VE]', e); }
        })();
    }, [isEditorOpen]);

    // ---- Toggle editing attr ----
    useEffect(() => {
        if (isEditorOpen) document.documentElement.setAttribute('data-ve-editing', '');
        else {
            document.documentElement.removeAttribute('data-ve-editing');
            document.querySelectorAll('.ve-highlight,.ve-selected,.ve-hidden-element,.ve-resize-active').forEach(e =>
                e.classList.remove('ve-highlight', 've-selected', 've-hidden-element', 've-resize-active'));
        }
        return () => { document.documentElement.removeAttribute('data-ve-editing'); };
    }, [isEditorOpen]);

    useEffect(() => { setDirty(JSON.stringify(ov) !== JSON.stringify(orig)); }, [ov, orig]);

    // ---- Apply DOM ----
    function applyDOM(o: PageOverrides) {
        if (o.bodyBg) document.body.style.backgroundColor = o.bodyBg;
        for (const path of (o.flexParents || [])) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; }
            } catch {}
        }
        for (const [path, s] of Object.entries(o.elements || {})) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (!el) continue;
                if (s.hidden) el.classList.add('ve-hidden-element'); else el.classList.remove('ve-hidden-element');
                if (s.bgColor) el.style.backgroundColor = s.bgColor;
                if (s.textColor) el.style.color = s.textColor;
                if (s.opacity) el.style.opacity = s.opacity;
                if (s.fontSize) el.style.fontSize = s.fontSize;
                if (s.width) el.style.width = s.width;
                if (s.height) el.style.height = s.height;
                if (s.order !== undefined) el.style.order = String(s.order);
            } catch {}
        }
    }

    useEffect(() => { if (isEditorOpen) applyDOM(ov); }, [ov, isEditorOpen]);

    // ---- Freeze hover: force all hidden elements visible ----
    useEffect(() => {
        if (!isEditorOpen) return;
        if (hoverFrozen) {
            // Add a style tag that forces all elements visible
            const style = document.createElement('style');
            style.id = 've-freeze-hover';
            style.textContent = `
                [data-ve-editing] * { 
                    visibility: visible !important; 
                    opacity: 1 !important; 
                    pointer-events: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                }
                [data-ve-editing] .ve-hidden-element { 
                    opacity: 0.15 !important; 
                }
            `;
            document.head.appendChild(style);
            flash('📌 Hover zamrożony — rozwijane menu widoczne');
        } else {
            document.getElementById('ve-freeze-hover')?.remove();
        }
        return () => { document.getElementById('ve-freeze-hover')?.remove(); };
    }, [hoverFrozen, isEditorOpen]);

    // ---- Drop indicator ----
    useEffect(() => {
        const d = document.createElement('div');
        d.className = 've-drop-indicator';
        d.style.cssText = 'position:absolute;left:0;right:0;height:3px;background:#6366f1;border-radius:2px;z-index:100010;pointer-events:none;display:none;box-shadow:0 0 8px rgba(99,102,241,0.5);';
        document.body.appendChild(d);
        dropRef.current = d;
        return () => { d.remove(); };
    }, []);

    // ---- Hover / Click / Context ----
    useEffect(() => {
        if (!isEditorOpen) return;

        function onOver(e: MouseEvent) {
            if (isDragging) return;
            const t = e.target as HTMLElement;
            if (isUI(t)) return;
            hov?.classList.remove('ve-highlight');
            if (t !== sel) t.classList.add('ve-highlight');
            setHov(t);
        }
        function onOut(e: MouseEvent) { (e.target as HTMLElement).classList.remove('ve-highlight'); }

        function onClick(e: MouseEvent) {
            if (isDragging) return;
            const t = e.target as HTMLElement;
            if (isUI(t)) return;
            e.preventDefault(); e.stopPropagation();

            // If in MOVE MODE and clicking the selected element → start drag
            if (moveMode && sel && (t === sel || sel.contains(t))) {
                doReflowDrag(sel);
                return;
            }

            // If in RESIZE MODE and clicking the selected element → start resize
            if (resizeMode && sel && (t === sel || sel.contains(t))) {
                doResize(sel, e);
                return;
            }

            // Normal select
            sel?.classList.remove('ve-selected');
            t.classList.remove('ve-highlight');
            t.classList.add('ve-selected');
            setSel(t);
            setSelPath(getPath(t));
            const b: string[] = [];
            let c: HTMLElement | null = t;
            while (c && c !== document.body) { b.unshift(getLabel(c)); c = c.parentElement; }
            setBc(b.slice(-5));
            posToolbar(t);
            setColorTgt(null); setColorPos(null); setCtx(null);
            setMoveMode(false); setResizeMode(false);
        }

        function onCtx(e: MouseEvent) {
            const t = e.target as HTMLElement;
            if (isUI(t)) return;
            e.preventDefault();
            setCtxEl(t); setCtx({ x: e.clientX, y: e.clientY });
        }

        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                if (moveMode) { setMoveMode(false); flash('Tryb przesuwania wyłączony'); return; }
                if (resizeMode) { setResizeMode(false); flash('Tryb rozmiaru wyłączony'); return; }
                if (videoPopup) { setVideoPopup(false); return; }
                if (colorTgt) { setColorTgt(null); setColorPos(null); return; }
                if (ctx) { setCtx(null); return; }
                if (sel) { sel.classList.remove('ve-selected'); setSel(null); setFPos(null); return; }
                closeEditor();
            }
            if (e.key === 'Delete' && sel && !isUI(sel)) {
                upd(getPath(sel), 'hidden', true);
                sel.classList.add('ve-hidden-element');
                flash('🙈 Ukryty');
            }
        }

        document.addEventListener('mouseover', onOver, true);
        document.addEventListener('mouseout', onOut, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('contextmenu', onCtx, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mouseover', onOver, true);
            document.removeEventListener('mouseout', onOut, true);
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('contextmenu', onCtx, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [isEditorOpen, hov, sel, moveMode, resizeMode, colorTgt, ctx, closeEditor, isDragging, videoPopup]);

    // ---- Reflow drag ----
    function doReflowDrag(dragEl: HTMLElement) {
        const parent = dragEl.parentElement;
        if (!parent) return;
        const parentPath = getPath(parent);

        // Ensure parent is flex
        const disp = getComputedStyle(parent).display;
        if (!disp.includes('flex') && !disp.includes('grid')) {
            parent.style.display = 'flex';
            parent.style.flexDirection = 'column';
            setOv(p => ({ ...p, flexParents: [...new Set([...(p.flexParents || []), parentPath])] }));
        }

        const siblings = Array.from(parent.children).filter(
            c => c !== dragEl && !c.classList.contains('ve-drop-indicator')
        ) as HTMLElement[];

        setIsDragging(true);
        dragEl.classList.add('ve-dragging');
        const ind = dropRef.current;
        let insertRef: HTMLElement | null = null;

        const onMove = (e: MouseEvent) => {
            if (!ind) return;
            const my = e.clientY;
            let closest: HTMLElement | null = null, dist = Infinity, above = true;
            for (const s of siblings) {
                const r = s.getBoundingClientRect();
                const mid = r.top + r.height / 2;
                const d = Math.abs(my - mid);
                if (d < dist) { dist = d; closest = s; above = my < mid; }
            }
            if (closest) {
                const r = closest.getBoundingClientRect();
                const pr = parent.getBoundingClientRect();
                ind.style.display = 'block';
                ind.style.left = `${pr.left}px`;
                ind.style.width = `${pr.width}px`;
                ind.style.top = above ? `${r.top + scrollY - 2}px` : `${r.bottom + scrollY - 1}px`;
                insertRef = above ? closest : closest.nextElementSibling as HTMLElement | null;
            }
        };

        const onUp = () => {
            dragEl.classList.remove('ve-dragging');
            if (ind) ind.style.display = 'none';
            setIsDragging(false);
            setMoveMode(false);

            // Reorder via CSS order
            const all = Array.from(parent.children).filter(
                c => !c.classList.contains('ve-drop-indicator')
            ) as HTMLElement[];
            const ordered: HTMLElement[] = [];
            for (const ch of all) {
                if (ch === dragEl) continue;
                if (insertRef && ch === insertRef) ordered.push(dragEl);
                ordered.push(ch);
            }
            if (!insertRef) ordered.push(dragEl);
            ordered.forEach((ch, i) => {
                (ch as HTMLElement).style.order = String(i);
                const p = getPath(ch as HTMLElement);
                setOv(prev => ({ ...prev, elements: { ...prev.elements, [p]: { ...prev.elements[p], order: i } } }));
            });
            flash('📐 Przesunięto');
            posToolbar(dragEl);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // ---- Resize ----
    function doResize(el: HTMLElement, startEvent: MouseEvent) {
        const startR = el.getBoundingClientRect();
        resizeRef.current = { w: startR.width, h: startR.height, x: startEvent.clientX, y: startEvent.clientY };
        el.classList.add('ve-resize-active');

        const onMove = (e: MouseEvent) => {
            if (!resizeRef.current) return;
            const dx = e.clientX - resizeRef.current.x;
            const dy = e.clientY - resizeRef.current.y;
            el.style.width = `${Math.max(30, resizeRef.current.w + dx)}px`;
            el.style.height = `${Math.max(15, resizeRef.current.h + dy)}px`;
        };

        const onUp = () => {
            el.classList.remove('ve-resize-active');
            resizeRef.current = null;
            setResizeMode(false);
            const path = getPath(el);
            upd(path, 'width', el.style.width);
            upd(path, 'height', el.style.height);
            flash('📏 Rozmiar zmieniony');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // ---- Save ----
    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Brak sesji');
            // Save overrides
            let res = await fetch('/api/admin/page-overrides', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(ov),
            });
            if (!res.ok) throw new Error('Zapis nie powiódł się');

            // Save video to theme
            if (videoId || videoOpacity !== 0.3) {
                res = await fetch('/api/admin/theme', {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hero: { backgroundVideoId: videoId, backgroundVideoOpacity: videoOpacity } }),
                });
            }

            setOrig(ov);
            setDirty(false);
            flash('✅ Zapisano!');
        } catch (err: any) { flash('❌ ' + err.message); }
        setSaving(false);
    };

    // ---- Discard ----
    const handleDiscard = () => {
        for (const path of Object.keys(ov.elements)) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (el) {
                    el.classList.remove('ve-hidden-element');
                    ['backgroundColor', 'color', 'opacity', 'fontSize', 'fontWeight', 'borderRadius', 'width', 'height', 'order'].forEach(
                        p => (el.style as any)[p] = ''
                    );
                }
            } catch {}
        }
        for (const path of (ov.flexParents || [])) {
            try {
                const el = document.querySelector(path) as HTMLElement | null;
                if (el) { el.style.display = ''; el.style.flexDirection = ''; }
            } catch {}
        }
        setOv(orig); applyDOM(orig); flash('↩️ Odrzucone');
    };

    if (!isEditorOpen) return null;

    const curOv = selPath ? (ov.elements[selPath] || {}) : {};
    const ctxP = ctxEl ? getPath(ctxEl) : '';

    return (
        <>
            {/* ---- TOP TOOLBAR ---- */}
            <div className="ve-toolbar">
                <div className="ve-toolbar-group">
                    <span className="ve-toolbar-title">✏️ Edytor</span>
                    {dirty && <div className="ve-unsaved-dot" />}
                    {dirty && <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>●</span>}
                    <div className="ve-toolbar-sep" />
                    {moveMode && <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600 }}>↕️ TRYB PRZESUWANIA — kliknij element</span>}
                    {resizeMode && <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600 }}>↘️ TRYB ROZMIARU — kliknij i ciągnij element</span>}
                </div>
                <div className="ve-toolbar-group">
                    <button className={`ve-toolbar-btn ${hoverFrozen ? 've-active-btn' : ''}`}
                        onClick={() => setHoverFrozen(!hoverFrozen)}
                        title="Zamroź hover — pokaż rozwijane menu">
                        📌 {hoverFrozen ? 'Odmroź' : 'Zamroź hover'}
                    </button>
                    <div className="ve-toolbar-sep" />
                    <button className="ve-toolbar-btn" onClick={handleDiscard} disabled={!dirty}>↩️</button>
                    <button className="ve-toolbar-btn ve-success" onClick={handleSave} disabled={saving || !dirty}>
                        {saving ? '⏳' : '💾'}
                    </button>
                    <div className="ve-toolbar-sep" />
                    <button className="ve-toolbar-btn ve-primary" onClick={() => setShowTpl(true)}>📁</button>
                    <button className="ve-toolbar-btn" onClick={() => setVideoPopup(true)}>🎬</button>
                    <div className="ve-toolbar-sep" />
                    <button className="ve-toolbar-btn ve-danger" onClick={closeEditor}>✕</button>
                </div>
            </div>

            {/* ---- FLOATING ELEMENT TOOLBAR ---- */}
            {sel && fPos && (
                <div className="ve-float-toolbar" style={{ left: fPos.x, top: fPos.y }}>
                    {/* HIDE */}
                    <button className={curOv.hidden ? 've-active' : ''} title={curOv.hidden ? 'Pokaż' : 'Ukryj'}
                        onClick={e => { e.stopPropagation(); const h = !curOv.hidden; upd(selPath, 'hidden', h); if (h) sel.classList.add('ve-hidden-element'); else sel.classList.remove('ve-hidden-element'); }}>
                        {curOv.hidden ? '👁' : '✕'}
                    </button>
                    <div className="ve-float-sep" />
                    {/* COLORS */}
                    <button className={colorTgt === 'bg' ? 've-active' : ''} title="Kolor tła"
                        onClick={e => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setColorTgt(colorTgt === 'bg' ? null : 'bg'); setColorPos({ x: r.left, y: r.bottom + 6 }); }}>🎨</button>
                    <button className={colorTgt === 'text' ? 've-active' : ''} title="Kolor tekstu"
                        onClick={e => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setColorTgt(colorTgt === 'text' ? null : 'text'); setColorPos({ x: r.left, y: r.bottom + 6 }); }}>🔤</button>
                    <div className="ve-float-sep" />
                    {/* MOVE MODE */}
                    <button className={moveMode ? 've-active' : ''} title="Przesuń: kliknij, potem złap element"
                        onClick={e => { e.stopPropagation(); setMoveMode(!moveMode); setResizeMode(false); flash(moveMode ? 'Tryb wyłączony' : '↕️ Kliknij element aby go przesunąć'); }}>↕️</button>
                    {/* RESIZE MODE */}
                    <button className={resizeMode ? 've-active' : ''} title="Rozmiar: kliknij, potem ciągnij element"
                        onClick={e => { e.stopPropagation(); setResizeMode(!resizeMode); setMoveMode(false); flash(resizeMode ? 'Tryb wyłączony' : '↘️ Kliknij i ciągnij element'); }}>↘️</button>
                    <div className="ve-float-sep" />
                    {/* FONT SIZE */}
                    <button title="Mniejsza czcionka" onClick={e => { e.stopPropagation(); const s = Math.max(8, parseFloat(getComputedStyle(sel).fontSize) - 2); sel.style.fontSize = s + 'px'; upd(selPath, 'fontSize', s + 'px'); }}>A-</button>
                    <button title="Większa czcionka" onClick={e => { e.stopPropagation(); const s = Math.min(120, parseFloat(getComputedStyle(sel).fontSize) + 2); sel.style.fontSize = s + 'px'; upd(selPath, 'fontSize', s + 'px'); }}>A+</button>
                    <div className="ve-float-sep" />
                    {/* RESET */}
                    <button title="Reset elementu" onClick={e => { e.stopPropagation();
                        setOv(p => { const el = { ...p.elements }; delete el[selPath]; return { ...p, elements: el }; });
                        sel.classList.remove('ve-hidden-element');
                        ['backgroundColor', 'color', 'width', 'height', 'fontSize', 'order', 'opacity', 'borderRadius'].forEach(p => (sel.style as any)[p] = '');
                        flash('↩️ Reset');
                    }}>↩️</button>
                </div>
            )}

            {/* ---- COLOR PICKER ---- */}
            {colorTgt && colorPos && sel && (
                <div className="ve-color-popover" style={{ left: colorPos.x, top: colorPos.y }} onClick={e => e.stopPropagation()}>
                    <div className="ve-color-popover-label">{colorTgt === 'bg' ? 'Kolor tła' : 'Kolor tekstu'}</div>
                    <div className="ve-color-grid">
                        {COLORS.map(c => (
                            <button key={c}
                                className={`ve-color-swatch ${(colorTgt === 'bg' ? curOv.bgColor : curOv.textColor) === c ? 'active' : ''}`}
                                style={{ background: c, border: c === '#ffffff' ? '2px solid #999' : undefined }}
                                onClick={() => {
                                    const k = colorTgt === 'bg' ? 'bgColor' : 'textColor';
                                    upd(selPath, k, c);
                                    if (colorTgt === 'bg') sel.style.backgroundColor = c; else sel.style.color = c;
                                }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="color" value={(colorTgt === 'bg' ? curOv.bgColor : curOv.textColor) || '#08090a'}
                            onChange={e => { const k = colorTgt === 'bg' ? 'bgColor' : 'textColor'; upd(selPath, k, e.target.value); if (colorTgt === 'bg') sel.style.backgroundColor = e.target.value; else sel.style.color = e.target.value; }}
                            style={{ width: 30, height: 24, border: 'none', borderRadius: 3, cursor: 'pointer', padding: 0 }} />
                        <button className="ve-toolbar-btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => { const k = colorTgt === 'bg' ? 'bgColor' : 'textColor'; upd(selPath, k, ''); if (colorTgt === 'bg') sel.style.backgroundColor = ''; else sel.style.color = ''; setColorTgt(null); }}>↩️</button>
                    </div>
                </div>
            )}

            {/* ---- VIDEO POPUP ---- */}
            {videoPopup && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100015, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setVideoPopup(false)}>
                    <div className="ve-video-popup" onClick={e => e.stopPropagation()} style={{
                        background: 'rgba(10,12,16,0.98)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, padding: '1.25rem', width: '90%', maxWidth: 420,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', fontFamily: '-apple-system, sans-serif',
                    }}>
                        <h3 style={{ color: '#a5b4fc', fontSize: '0.95rem', margin: '0 0 1rem', fontWeight: 700 }}>🎬 Film tła (Hero)</h3>
                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 4 }}>YouTube Video ID</label>
                        <input type="text" value={videoId} onChange={e => { setVideoId(e.target.value); setOv(p => ({ ...p, heroVideoId: e.target.value })); }}
                            placeholder="np. vGAu6rdJ8WQ" style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'white', fontSize: '0.85rem', marginBottom: '0.75rem', fontFamily: 'monospace' }} />
                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 4 }}>Przeźroczystość: {Math.round(videoOpacity * 100)}%</label>
                        <input type="range" min="0" max="1" step="0.05" value={videoOpacity}
                            onChange={e => { const v = parseFloat(e.target.value); setVideoOpacity(v); setOv(p => ({ ...p, heroVideoOpacity: v })); }}
                            style={{ width: '100%', marginBottom: '1rem' }} />
                        {videoId && (
                            <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="preview"
                                    style={{ width: '100%', display: 'block', opacity: videoOpacity }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="ve-toolbar-btn ve-success" style={{ flex: 1 }}
                                onClick={() => { setVideoPopup(false); flash('🎬 Film zaktualizowany — zapisz aby utrwalić'); }}>✅ OK</button>
                            <button className="ve-toolbar-btn" onClick={() => setVideoPopup(false)}>Anuluj</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- CONTEXT MENU ---- */}
            {ctx && ctxEl && (
                <div className="ve-context-menu" style={{ left: ctx.x, top: ctx.y }} onClick={e => e.stopPropagation()}>
                    <button className="ve-ctx-item" onClick={() => { upd(ctxP, 'hidden', true); ctxEl.classList.add('ve-hidden-element'); setCtx(null); flash('🙈 Ukryty'); }}>✕ Ukryj</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSel(ctxEl); setSelPath(ctxP); ctxEl.classList.add('ve-selected'); posToolbar(ctxEl);
                        setColorTgt('bg'); setColorPos({ x: ctx.x, y: ctx.y + 30 }); setCtx(null);
                    }}>🎨 Kolor tła</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSel(ctxEl); setSelPath(ctxP); ctxEl.classList.add('ve-selected'); posToolbar(ctxEl);
                        setColorTgt('text'); setColorPos({ x: ctx.x, y: ctx.y + 30 }); setCtx(null);
                    }}>🔤 Kolor tekstu</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        setSel(ctxEl); setSelPath(ctxP); ctxEl.classList.add('ve-selected'); posToolbar(ctxEl);
                        setMoveMode(true); setCtx(null); flash('↕️ Kliknij element aby przesunąć');
                    }}>↕️ Przesuń</button>
                    <button className="ve-ctx-item" onClick={() => {
                        setSel(ctxEl); setSelPath(ctxP); ctxEl.classList.add('ve-selected'); posToolbar(ctxEl);
                        setResizeMode(true); setCtx(null); flash('↘️ Kliknij i ciągnij');
                    }}>↘️ Rozmiar</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => {
                        setOv(p => { const el = { ...p.elements }; delete el[ctxP]; return { ...p, elements: el }; });
                        ctxEl.classList.remove('ve-hidden-element');
                        ['backgroundColor', 'color', 'width', 'height', 'order'].forEach(p => (ctxEl.style as any)[p] = '');
                        setCtx(null); flash('↩️ Reset');
                    }}>↩️ Reset</button>
                    <div className="ve-ctx-divider" />
                    <button className="ve-ctx-item" onClick={() => { if (confirm('Resetować WSZYSTKIE?')) { handleDiscard(); setCtx(null); } }}>🗑 Reset all</button>
                </div>
            )}

            {/* ---- BREADCRUMB ---- */}
            {sel && <div className="ve-breadcrumb">{bc.map((b, i) => <span key={i} className={i === bc.length - 1 ? 've-bc-active' : ''}>{i > 0 && ' › '}{b}</span>)}</div>}

            {toast && <div className="ve-toast">{toast}</div>}

            <TemplateManager isOpen={showTpl} onClose={() => setShowTpl(false)}
                onApplied={() => { setShowTpl(false); flash('✅ Załadowany'); window.location.reload(); }} />
        </>
    );
}
