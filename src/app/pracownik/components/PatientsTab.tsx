'use client';

import { useRef, useState } from 'react';
import { Search, User, ChevronRight } from 'lucide-react';
import type { ScheduleAppointment } from './ScheduleTypes';

// ─── Types ────────────────────────────────────────────────────
interface PatientsTabProps {
    openPatientHistory: (apt: ScheduleAppointment) => void;
}

// ─── Component ────────────────────────────────────────────────
export default function PatientsTab({ openPatientHistory }: PatientsTabProps) {
    const [tabSearchQuery, setTabSearchQuery] = useState('');
    const [tabSearchResults, setTabSearchResults] = useState<any[]>([]);
    const [tabSearchLoading, setTabSearchLoading] = useState(false);
    const tabSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    return (
        <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ color: '#e879f9', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={20} /> Wyszukaj pacjenta
            </h2>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    value={tabSearchQuery}
                    onChange={(e) => {
                        const q = e.target.value;
                        setTabSearchQuery(q);
                        if (tabSearchTimer.current) clearTimeout(tabSearchTimer.current);
                        if (q.trim().length < 2) { setTabSearchResults([]); return; }
                        tabSearchTimer.current = setTimeout(async () => {
                            setTabSearchLoading(true);
                            try {
                                const res = await fetch(`/api/employee/patient-search?q=${encodeURIComponent(q.trim())}&limit=20`);
                                if (res.ok) {
                                    const data = await res.json();
                                    setTabSearchResults(data.patients || []);
                                }
                            } catch (err) {
                                console.error('[PatientSearch]', err);
                            } finally {
                                setTabSearchLoading(false);
                            }
                        }, 300);
                    }}
                    placeholder="Wpisz imię i nazwisko pacjenta..."
                    style={{
                        width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(232,121,249,0.2)',
                        borderRadius: '0.75rem', color: '#fff', fontSize: '1rem', outline: 'none',
                        fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(232,121,249,0.5)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(232,121,249,0.2)'}
                />
                <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                {tabSearchLoading && (
                    <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(232,121,249,0.6)', fontSize: '0.8rem' }}>
                        ⏳
                    </div>
                )}
            </div>

            {tabSearchQuery.trim().length >= 2 && !tabSearchLoading && tabSearchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                    Nie znaleziono pacjentów dla &quot;{tabSearchQuery}&quot;
                </div>
            )}

            {tabSearchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tabSearchResults.map((p: any) => (
                        <button
                            key={p.id}
                            onClick={() => {
                                const fakeApt: ScheduleAppointment = {
                                    id: `search-${p.id}`,
                                    patientName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
                                    patientId: p.id,
                                    doctorName: '',
                                    doctorId: '',
                                    startTime: '',
                                    endTime: '',
                                    duration: 0,
                                    appointmentType: '',
                                    appointmentTypeId: '',
                                    isWorkingHour: false,
                                    patientPhone: p.phone || '',
                                    notes: null,
                                    badges: [],
                                };
                                openPatientHistory(fakeApt);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem',
                                color: '#fff', cursor: 'pointer', textAlign: 'left',
                                transition: 'all 0.15s', width: '100%',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,121,249,0.08)'; e.currentTarget.style.borderColor = 'rgba(232,121,249,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        >
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'rgba(232,121,249,0.15)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <User size={18} style={{ color: '#e879f9' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                    {p.firstName} {p.lastName}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {p.phone && <a href={`tel:${p.phone}`} onClick={e => e.stopPropagation()} style={{ color: '#38bdf8', textDecoration: 'none' }}>📞 {p.phone}</a>}
                                    {p.pesel && <span>ID: ...{p.pesel.slice(-4)}</span>}
                                </div>
                            </div>
                            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </button>
                    ))}
                </div>
            )}

            {tabSearchQuery.trim().length < 2 && tabSearchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'rgba(255,255,255,0.3)' }}>
                    <User size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.9rem' }}>Wpisz minimum 2 znaki aby wyszukać pacjenta</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.6 }}>
                        Wyniki pokażą imię, nazwisko i telefon z bazy Prodentis.
                        Kliknij pacjenta aby zobaczyć kartę z historią leczenia.
                    </p>
                </div>
            )}
        </div>
    );
}
