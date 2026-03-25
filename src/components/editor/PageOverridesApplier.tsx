"use client";

import { useEffect } from 'react';

/**
 * PageOverridesApplier — loads saved page overrides from the public API
 * and applies them to the DOM on every page load. This makes editor
 * changes visible to ALL visitors, not just in editor mode.
 * 
 * Renders nothing — pure side effect.
 */
export default function PageOverridesApplier() {
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/page-overrides', { cache: 'no-store' });
                if (!res.ok) return;
                const overrides = await res.json();
                if (!overrides || typeof overrides !== 'object') return;

                // Apply body background
                if (overrides.bodyBg) {
                    document.body.style.backgroundColor = overrides.bodyBg;
                }

                // Make flex parents (for CSS order to work)
                for (const path of (overrides.flexParents || [])) {
                    try {
                        const el = document.querySelector(path) as HTMLElement | null;
                        if (el) {
                            el.style.display = 'flex';
                            el.style.flexDirection = 'column';
                        }
                    } catch {}
                }

                // Apply element-level overrides
                const elements = overrides.elements || {};
                for (const [selector, styles] of Object.entries(elements)) {
                    if (!styles || typeof styles !== 'object') continue;
                    try {
                        const el = document.querySelector(selector) as HTMLElement | null;
                        if (!el) continue;
                        const s = styles as Record<string, any>;
                        if (s.hidden) el.style.display = 'none';
                        if (s.bgColor && typeof s.bgColor === 'string') el.style.backgroundColor = s.bgColor;
                        if (s.textColor && typeof s.textColor === 'string') el.style.color = s.textColor;
                        if (s.opacity && typeof s.opacity === 'string') el.style.opacity = s.opacity;
                        if (s.fontSize && typeof s.fontSize === 'string') el.style.fontSize = s.fontSize;
                        if (s.fontWeight && typeof s.fontWeight === 'string') el.style.fontWeight = s.fontWeight;
                        if (s.borderRadius && typeof s.borderRadius === 'string') el.style.borderRadius = s.borderRadius;
                        if (s.width && typeof s.width === 'string') el.style.width = s.width;
                        if (s.height && typeof s.height === 'string') el.style.height = s.height;
                        if (s.order !== undefined) el.style.order = String(s.order);
                    } catch { /* invalid selector, skip */ }
                }
            } catch { /* network error, ignore */ }
        })();
    }, []);

    return null;
}
