"use client";

import { useEffect, useState } from 'react';

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

                // Apply element-level overrides
                const elements = overrides.elements || {};
                for (const [selector, styles] of Object.entries(elements)) {
                    if (!styles || typeof styles !== 'object') continue;
                    try {
                        const el = document.querySelector(selector) as HTMLElement | null;
                        if (!el) continue;
                        const s = styles as Record<string, string | boolean>;
                        if (s.hidden) el.style.display = 'none';
                        if (s.bgColor && typeof s.bgColor === 'string') el.style.backgroundColor = s.bgColor;
                        if (s.textColor && typeof s.textColor === 'string') el.style.color = s.textColor;
                        if (s.opacity && typeof s.opacity === 'string') el.style.opacity = s.opacity;
                        if (s.fontSize && typeof s.fontSize === 'string') el.style.fontSize = s.fontSize;
                        if (s.fontWeight && typeof s.fontWeight === 'string') el.style.fontWeight = s.fontWeight;
                        if (s.borderRadius && typeof s.borderRadius === 'string') el.style.borderRadius = s.borderRadius;
                        if (s.transform && typeof s.transform === 'string') el.style.transform = s.transform;
                    } catch { /* invalid selector, skip */ }
                }
            } catch { /* network error, ignore — page works without overrides */ }
        })();
    }, []);

    return null;
}
