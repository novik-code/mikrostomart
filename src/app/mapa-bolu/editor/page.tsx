"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Zone definitions (current coordinates) ───
interface Zone {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const INITIAL_ZONES: Zone[] = [
    // Upper Q1
    { id: "18", label: "18", x: 10, y: 37, w: 5, h: 5 },
    { id: "17", label: "17", x: 12, y: 29, w: 7, h: 7 },
    { id: "16", label: "16", x: 17, y: 22, w: 7, h: 7 },
    { id: "15", label: "15", x: 22, y: 17, w: 6, h: 6 },
    { id: "14", label: "14", x: 27, y: 14, w: 5, h: 6 },
    { id: "13", label: "13", x: 31, y: 11, w: 5, h: 7 },
    { id: "12", label: "12", x: 36, y: 9, w: 4, h: 7 },
    { id: "11", label: "11", x: 41, y: 8, w: 7, h: 8 },
    // Upper Q2
    { id: "21", label: "21", x: 52, y: 8, w: 7, h: 8 },
    { id: "22", label: "22", x: 60, y: 9, w: 4, h: 7 },
    { id: "23", label: "23", x: 64, y: 11, w: 5, h: 7 },
    { id: "24", label: "24", x: 68, y: 14, w: 5, h: 6 },
    { id: "25", label: "25", x: 72, y: 17, w: 6, h: 6 },
    { id: "26", label: "26", x: 76, y: 22, w: 7, h: 7 },
    { id: "27", label: "27", x: 81, y: 29, w: 7, h: 7 },
    { id: "28", label: "28", x: 85, y: 37, w: 5, h: 5 },
    // Lower Q4
    { id: "48", label: "48", x: 10, y: 56, w: 5, h: 5 },
    { id: "47", label: "47", x: 12, y: 61, w: 7, h: 7 },
    { id: "46", label: "46", x: 17, y: 67, w: 7, h: 7 },
    { id: "45", label: "45", x: 22, y: 73, w: 6, h: 6 },
    { id: "44", label: "44", x: 27, y: 77, w: 5, h: 6 },
    { id: "43", label: "43", x: 31, y: 80, w: 5, h: 6 },
    { id: "42", label: "42", x: 36, y: 82, w: 4, h: 7 },
    { id: "41", label: "41", x: 41, y: 83, w: 7, h: 7 },
    // Lower Q3
    { id: "31", label: "31", x: 52, y: 83, w: 7, h: 7 },
    { id: "32", label: "32", x: 60, y: 82, w: 4, h: 7 },
    { id: "33", label: "33", x: 64, y: 80, w: 5, h: 6 },
    { id: "34", label: "34", x: 68, y: 77, w: 5, h: 6 },
    { id: "35", label: "35", x: 72, y: 73, w: 6, h: 6 },
    { id: "36", label: "36", x: 76, y: 67, w: 7, h: 7 },
    { id: "37", label: "37", x: 81, y: 61, w: 7, h: 7 },
    { id: "38", label: "38", x: 85, y: 56, w: 5, h: 5 },
    // Soft tissues
    { id: "tongue", label: "Język", x: 33, y: 56, w: 34, h: 18 },
    { id: "palate", label: "Podnieb.", x: 33, y: 28, w: 34, h: 12 },
    { id: "throat", label: "Gardło", x: 40, y: 42, w: 20, h: 12 },
];

type DragMode = 'move' | 'resize-br' | null;

export default function ZoneEditorPage() {
    const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragMode, setDragMode] = useState<DragMode>(null);
    const [dragStart, setDragStart] = useState<{ mx: number; my: number; zx: number; zy: number; zw: number; zh: number } | null>(null);
    const [showLabels, setShowLabels] = useState(true);
    const [showSoftTissues, setShowSoftTissues] = useState(true);
    const [exported, setExported] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Convert pixel coords to viewBox %
    const pixelToPercent = useCallback((px: number, py: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: ((px - rect.left) / rect.width) * 100,
            y: ((py - rect.top) / rect.height) * 100,
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent, zoneId: string, mode: DragMode) => {
        e.preventDefault();
        e.stopPropagation();
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return;

        setSelectedId(zoneId);
        setDragMode(mode);
        const pos = pixelToPercent(e.clientX, e.clientY);
        setDragStart({ mx: pos.x, my: pos.y, zx: zone.x, zy: zone.y, zw: zone.w, zh: zone.h });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [zones, pixelToPercent]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragMode || !dragStart || !selectedId) return;
        e.preventDefault();

        const pos = pixelToPercent(e.clientX, e.clientY);
        const dx = pos.x - dragStart.mx;
        const dy = pos.y - dragStart.my;

        setZones(prev => prev.map(z => {
            if (z.id !== selectedId) return z;
            if (dragMode === 'move') {
                return { ...z, x: Math.round((dragStart.zx + dx) * 10) / 10, y: Math.round((dragStart.zy + dy) * 10) / 10 };
            } else if (dragMode === 'resize-br') {
                const newW = Math.max(2, Math.round((dragStart.zw + dx) * 10) / 10);
                const newH = Math.max(2, Math.round((dragStart.zh + dy) * 10) / 10);
                return { ...z, w: newW, h: newH };
            }
            return z;
        }));
    }, [dragMode, dragStart, selectedId, pixelToPercent]);

    const handlePointerUp = useCallback(() => {
        setDragMode(null);
        setDragStart(null);
    }, []);

    const exportCoordinates = useCallback(() => {
        const toothZones = zones.filter(z => !['tongue', 'palate', 'throat'].includes(z.id));
        const softZones = zones.filter(z => ['tongue', 'palate', 'throat'].includes(z.id));

        const upperQ1 = toothZones.filter(z => parseInt(z.id) >= 11 && parseInt(z.id) <= 18).sort((a, b) => parseInt(a.id) - parseInt(b.id)).reverse();
        const upperQ2 = toothZones.filter(z => parseInt(z.id) >= 21 && parseInt(z.id) <= 28).sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const lowerQ4 = toothZones.filter(z => parseInt(z.id) >= 41 && parseInt(z.id) <= 48).sort((a, b) => parseInt(a.id) - parseInt(b.id)).reverse();
        const lowerQ3 = toothZones.filter(z => parseInt(z.id) >= 31 && parseInt(z.id) <= 38).sort((a, b) => parseInt(a.id) - parseInt(b.id));

        const fmt = (z: Zone) => `    { id: "${z.id}", shape: "rect", x: ${z.x}, y: ${z.y}, w: ${z.w}, h: ${z.h} },`;

        let code = '// ═══ UPPER TEETH ═══\n';
        code += '// Q1 — Upper Right (screen LEFT)\n';
        upperQ1.forEach(z => code += fmt(z) + '\n');
        code += '// Q2 — Upper Left (screen RIGHT)\n';
        upperQ2.forEach(z => code += fmt(z) + '\n');
        code += '\n// ═══ LOWER TEETH ═══\n';
        code += '// Q4 — Lower Right (screen LEFT)\n';
        lowerQ4.forEach(z => code += fmt(z) + '\n');
        code += '// Q3 — Lower Left (screen RIGHT)\n';
        lowerQ3.forEach(z => code += fmt(z) + '\n');
        code += '\n// ═══ SOFT TISSUES ═══\n';
        softZones.forEach(z => code += fmt(z) + '\n');

        setExported(code);

        // Also copy to clipboard
        navigator.clipboard.writeText(code).catch(() => { });
    }, [zones]);

    const resetZones = useCallback(() => {
        setZones(INITIAL_ZONES);
        setExported('');
    }, []);

    // Keyboard: nudge selected zone with arrows
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!selectedId) return;
            const delta = e.shiftKey ? 0.5 : 1;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowLeft') dx = -delta;
            if (e.key === 'ArrowRight') dx = delta;
            if (e.key === 'ArrowUp') dy = -delta;
            if (e.key === 'ArrowDown') dy = delta;
            if (dx || dy) {
                e.preventDefault();
                setZones(prev => prev.map(z =>
                    z.id === selectedId ? { ...z, x: Math.round((z.x + dx) * 10) / 10, y: Math.round((z.y + dy) * 10) / 10 } : z
                ));
            }
            // Delete key to hide zone
            if (e.key === 'Escape') setSelectedId(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedId]);

    const selectedZone = zones.find(z => z.id === selectedId);

    const visibleZones = showSoftTissues ? zones : zones.filter(z => !['tongue', 'palate', 'throat'].includes(z.id));

    return (
        <div style={{ background: '#111', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
            {/* Toolbar */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: '#1a1a1a', borderBottom: '1px solid #333',
                padding: '8px 16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'
            }}>
                <span style={{ fontWeight: 'bold', color: '#dcb14a' }}>🦷 Zone Editor</span>

                <button onClick={() => setShowLabels(l => !l)}
                    style={{ padding: '4px 10px', background: showLabels ? '#dcb14a' : '#333', color: showLabels ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {showLabels ? '🏷 Labels ON' : '🏷 Labels OFF'}
                </button>

                <button onClick={() => setShowSoftTissues(s => !s)}
                    style={{ padding: '4px 10px', background: showSoftTissues ? '#dcb14a' : '#333', color: showSoftTissues ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    {showSoftTissues ? '👅 Soft ON' : '👅 Soft OFF'}
                </button>

                <button onClick={exportCoordinates}
                    style={{ padding: '4px 14px', background: '#2d8c2d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    📋 Export / Kopiuj
                </button>

                <button onClick={resetZones}
                    style={{ padding: '4px 10px', background: '#8c2d2d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    ↺ Reset
                </button>

                {selectedZone && (
                    <span style={{ marginLeft: '16px', color: '#dcb14a', fontSize: '13px' }}>
                        Wybrany: <strong>{selectedZone.id}</strong> — x:{selectedZone.x} y:{selectedZone.y} w:{selectedZone.w} h:{selectedZone.h}
                        <span style={{ color: '#888', marginLeft: '8px' }}>Strzałki = przesuń, Shift+strzałki = ±0.5</span>
                    </span>
                )}
            </div>

            {/* Map Container */}
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '8px' }}>
                <div
                    ref={containerRef}
                    style={{ position: 'relative', width: '100%', touchAction: 'none' }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {/* Background image */}
                    <img
                        src="/dental-map-premium.jpg"
                        alt="Dental Map"
                        style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                        draggable={false}
                    />

                    {/* SVG Overlay */}
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    >
                        {visibleZones.map(zone => {
                            const isSoft = ['tongue', 'palate', 'throat'].includes(zone.id);
                            const isSelected = selectedId === zone.id;
                            const fill = isSelected ? 'rgba(220, 177, 74, 0.3)' : (isSoft ? 'rgba(100, 180, 255, 0.1)' : 'rgba(220, 177, 74, 0.12)');
                            const stroke = isSelected ? '#fff' : (isSoft ? 'rgba(100, 180, 255, 0.5)' : 'rgba(220, 177, 74, 0.5)');

                            return (
                                <g key={zone.id}>
                                    {/* Zone rectangle — drag to move */}
                                    <rect
                                        x={zone.x}
                                        y={zone.y}
                                        width={zone.w}
                                        height={zone.h}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={isSelected ? 0.6 : 0.3}
                                        rx={0.5}
                                        style={{ cursor: 'grab' }}
                                        onPointerDown={(e) => handlePointerDown(e, zone.id, 'move')}
                                    />
                                    {/* Resize handle (bottom-right corner) */}
                                    <rect
                                        x={zone.x + zone.w - 1.5}
                                        y={zone.y + zone.h - 1.5}
                                        width={1.5}
                                        height={1.5}
                                        fill={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                                        style={{ cursor: 'nwse-resize' }}
                                        onPointerDown={(e) => handlePointerDown(e, zone.id, 'resize-br')}
                                    />
                                    {/* Label */}
                                    {showLabels && (
                                        <text
                                            x={zone.x + zone.w / 2}
                                            y={zone.y + zone.h / 2 + 0.8}
                                            textAnchor="middle"
                                            fontSize={isSoft ? 2.5 : Math.min(zone.w, zone.h) * 0.5}
                                            fill={isSelected ? '#fff' : '#dcb14a'}
                                            fontWeight="bold"
                                            pointerEvents="none"
                                            style={{ userSelect: 'none' }}
                                        >
                                            {zone.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Export output */}
            {exported && (
                <div style={{ maxWidth: '800px', margin: '16px auto', padding: '0 8px' }}>
                    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
                        <div style={{ marginBottom: '8px', color: '#dcb14a', fontWeight: 'bold' }}>
                            📋 Skopiowane do schowka! Wyślij te koordynaty:
                        </div>
                        <pre style={{ whiteSpace: 'pre-wrap', color: '#aaa', lineHeight: 1.5, margin: 0, fontFamily: 'monospace', fontSize: '11px' }}>
                            {exported}
                        </pre>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div style={{ maxWidth: '800px', margin: '16px auto', padding: '0 8px 32px' }}>
                <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#888' }}>
                    <strong style={{ color: '#dcb14a' }}>Instrukcja:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: 1.8 }}>
                        <li>🖱 <strong>Przeciągnij</strong> prostokąt aby go przenieść na właściwy ząb</li>
                        <li>↔ <strong>Mały kwadrat (prawy dół)</strong> — zmień rozmiar strefy</li>
                        <li>⌨ <strong>Strzałki</strong> — precyzyjne przesuwanie wybranej strefy (Shift = ±0.5)</li>
                        <li>👅 Przycisk <strong>Soft ON/OFF</strong> — pokaż/ukryj strefy tkanek miękkich</li>
                        <li>📋 Kliknij <strong>Export / Kopiuj</strong> i wyślij mi koordynaty</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
