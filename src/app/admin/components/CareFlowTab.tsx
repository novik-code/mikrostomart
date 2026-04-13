'use client';

import { useState, useEffect, useCallback } from 'react';

interface Template {
    id: string;
    name: string;
    description: string;
    procedure_types: string[];
    default_medications: any[];
    push_settings: any;
    is_active: boolean;
    step_count: number;
    created_at: string;
    steps?: Step[];
    active_enrollments?: number;
}

interface Step {
    id?: string;
    sort_order: number;
    title: string;
    description: string;
    icon: string;
    offset_hours: number;
    smart_snap: boolean;
    push_message: string;
    reminder_interval_minutes: number;
    reminder_max_count: number;
    requires_confirmation: boolean;
    medication_index: number | null;
    visible_hours_before: number | null;
}

interface Enrollment {
    id: string;
    patient_name: string;
    patient_id: string;
    patient_phone: string | null;
    template_name: string;
    appointment_date: string;
    doctor_name: string;
    status: string;
    enrolled_by: string;
    enrolled_at: string;
    access_token: string;
    prescription_code: string | null;
    report_pdf_url: string | null;
    report_generated_at: string | null;
    report_exported_to_prodentis: boolean;
    stats: { total: number; completed: number; pending: number; progress: number };
}

interface StatsData {
    overview: {
        total: number;
        active: number;
        completed: number;
        cancelled: number;
        completionRate: number;
        avgCompletionHours: number;
        avgCompliance: number;
        avgResponseMinutes: number;
        smsFallbackRate: number;
        exportedToProdentis: number;
        totalTasks: number;
        smsSentTasks: number;
    };
    byTemplate: { name: string; count: number; completed: number; cancelled: number; completionRate: number }[];
    byDoctor: { name: string; count: number; completed: number; avgCompliance: number }[];
    monthlyTimeline: { month: string; count: number }[];
}

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '1.5rem',
    marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.3)',
    color: 'white',
    fontSize: '0.9rem',
    outline: 'none',
};

const btnPrimary: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
};

const btnSecondary: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
};

const btnDanger: React.CSSProperties = {
    ...btnSecondary,
    borderColor: '#ef4444',
    color: '#ef4444',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.3rem',
    marginTop: '0.8rem',
};

export default function CareFlowTab() {
    const [subTab, setSubTab] = useState<'templates' | 'enrollments' | 'stats'>('templates');

    return (
        <div>
            {/* Sub-navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[
                    { id: 'templates' as const, label: '📋 Szablony' },
                    { id: 'enrollments' as const, label: '📊 Aktywne procesy' },
                    { id: 'stats' as const, label: '📈 Statystyki' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        style={{
                            ...btnSecondary,
                            background: subTab === tab.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                            borderColor: subTab === tab.id ? '#6366f1' : 'rgba(255,255,255,0.15)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'templates' && <TemplatesSubTab />}
            {subTab === 'enrollments' && <EnrollmentsSubTab />}
            {subTab === 'stats' && <StatsSubTab />}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATES SUB-TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TemplatesSubTab() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Template | null>(null);
    const [creating, setCreating] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/careflow/templates');
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleDelete = async (id: string) => {
        if (!confirm('Usunąć szablon?')) return;
        await fetch(`/api/admin/careflow/templates/${id}`, { method: 'DELETE' });
        fetchTemplates();
    };

    const handleEdit = async (id: string) => {
        const res = await fetch(`/api/admin/careflow/templates/${id}`);
        const data = await res.json();
        setEditing(data.template);
    };

    if (editing || creating) {
        return (
            <TemplateEditor
                template={editing || undefined}
                onSave={() => { setEditing(null); setCreating(false); fetchTemplates(); }}
                onCancel={() => { setEditing(null); setCreating(false); }}
            />
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    Szablony protokołów opieki peri-operacyjnej. Każdy szablon definiuje kroki, leki i harmonogram powiadomień.
                </p>
                <button style={btnPrimary} onClick={() => setCreating(true)}>+ Nowy Szablon</button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>Ładowanie...</div>
            ) : templates.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Brak szablonów. Kliknij "+ Nowy Szablon" aby utworzyć pierwszy.</p>
                </div>
            ) : (
                templates.map(t => (
                    <div key={t.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
                                    🏥 {t.name}
                                    {!t.is_active && <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: '0.5rem' }}>NIEAKTYWNY</span>}
                                </h3>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.3rem' }}>{t.description}</p>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                    <span>📋 {t.step_count} kroków</span>
                                    <span>💊 {t.default_medications?.length || 0} leków</span>
                                    {t.procedure_types?.length > 0 && <span>🏷️ {t.procedure_types.join(', ')}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button style={btnSecondary} onClick={() => handleEdit(t.id)}>✏️ Edytuj</button>
                                <button style={btnDanger} onClick={() => handleDelete(t.id)}>🗑️</button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE EDITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TemplateEditor({ template, onSave, onCancel }: { template?: Template; onSave: () => void; onCancel: () => void }) {
    const isEdit = !!template;
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [procedureTypes, setProcedureTypes] = useState(template?.procedure_types?.join(', ') || '');
    const [isActive, setIsActive] = useState(template?.is_active ?? true);
    const [medications, setMedications] = useState<any[]>(template?.default_medications || []);
    const [steps, setSteps] = useState<Step[]>(template?.steps || []);
    const [pushSettings, setPushSettings] = useState(template?.push_settings || {
        reminder_interval_minutes: 30,
        reminder_max_count: 6,
        quiet_hours_start: 22,
        quiet_hours_end: 7,
    });

    // Add new medication
    const addMedication = () => {
        setMedications([...medications, { name: '', dose: '', description: '', frequency: '' }]);
    };

    // Update medication
    const updateMed = (i: number, field: string, val: string) => {
        const newMeds = [...medications];
        newMeds[i] = { ...newMeds[i], [field]: val };
        setMedications(newMeds);
    };

    // Remove medication
    const removeMed = (i: number) => {
        setMedications(medications.filter((_, idx) => idx !== i));
    };

    // Add new step
    const addStep = () => {
        const lastOffset = steps.length > 0 ? steps[steps.length - 1].offset_hours : -24;
        setSteps([...steps, {
            sort_order: steps.length + 1,
            title: '',
            description: '',
            icon: '💊',
            offset_hours: lastOffset + 8,
            smart_snap: true,
            push_message: '',
            reminder_interval_minutes: pushSettings.reminder_interval_minutes || 30,
            reminder_max_count: pushSettings.reminder_max_count || 6,
            requires_confirmation: true,
            medication_index: null,
            visible_hours_before: null,
        }]);
    };

    // Update step
    const updateStep = (i: number, field: string, val: any) => {
        const newSteps = [...steps];
        newSteps[i] = { ...newSteps[i], [field]: val };
        setSteps(newSteps);
    };

    // Remove step
    const removeStep = (i: number) => {
        setSteps(steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, sort_order: idx + 1 })));
    };

    // Move step
    const moveStep = (i: number, dir: -1 | 1) => {
        if (i + dir < 0 || i + dir >= steps.length) return;
        const newSteps = [...steps];
        [newSteps[i], newSteps[i + dir]] = [newSteps[i + dir], newSteps[i]];
        setSteps(newSteps.map((s, idx) => ({ ...s, sort_order: idx + 1 })));
    };

    const handleSave = async () => {
        if (!name) { alert('Nazwa szablonu jest wymagana'); return; }
        if (steps.length === 0) { alert('Dodaj przynajmniej jeden krok'); return; }

        setSaving(true);
        try {
            const payload = {
                name,
                description,
                procedure_types: procedureTypes.split(',').map(s => s.trim()).filter(Boolean),
                default_medications: medications,
                push_settings: pushSettings,
                is_active: isActive,
                steps,
            };

            const url = isEdit ? `/api/admin/careflow/templates/${template!.id}` : '/api/admin/careflow/templates';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            onSave();
        } catch (err: any) {
            alert('Błąd: ' + err.message);
        }
        setSaving(false);
    };

    // Format offset for display
    const formatOffset = (h: number) => {
        if (h === 0) return '⏰ Godzina zabiegu';
        const abs = Math.abs(h);
        const days = Math.floor(abs / 24);
        const hours = abs % 24;
        const prefix = h < 0 ? 'Przed' : 'Po';
        let label = '';
        if (days > 0) label += `${days}d `;
        if (hours > 0) label += `${hours}h`;
        return `${h < 0 ? '⬅️' : '➡️'} ${prefix}: ${label.trim()}`;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'white' }}>{isEdit ? '✏️ Edycja szablonu' : '🆕 Nowy szablon'}</h3>
                <button style={btnSecondary} onClick={onCancel}>← Powrót do listy</button>
            </div>

            {/* Basic info */}
            <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.8rem', color: 'white', fontSize: '0.95rem' }}>📝 Informacje podstawowe</h4>
                <label style={labelStyle}>Nazwa szablonu *</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="np. Zabieg chirurgiczny" />
                <label style={labelStyle}>Opis</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Opis protokołu..." />
                <label style={labelStyle}>Typy zabiegów (oddzielone przecinkami, do auto-kwalifikacji)</label>
                <input style={inputStyle} value={procedureTypes} onChange={e => setProcedureTypes(e.target.value)} placeholder="Chirurgia, Implantologia" />
                <label style={{ ...labelStyle, marginTop: '1rem' }}>
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ marginRight: '0.5rem' }} />
                    Szablon aktywny
                </label>
            </div>

            {/* Push settings */}
            <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.8rem', color: 'white', fontSize: '0.95rem' }}>🔔 Ustawienia powiadomień push</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Interwał ponawiania (min)</label>
                        <input type="number" style={inputStyle} value={pushSettings.reminder_interval_minutes} onChange={e => setPushSettings({ ...pushSettings, reminder_interval_minutes: +e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Max powtórzeń</label>
                        <input type="number" style={inputStyle} value={pushSettings.reminder_max_count} onChange={e => setPushSettings({ ...pushSettings, reminder_max_count: +e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Cisza nocna od (godzina)</label>
                        <input type="number" style={inputStyle} value={pushSettings.quiet_hours_start} onChange={e => setPushSettings({ ...pushSettings, quiet_hours_start: +e.target.value })} min={0} max={23} />
                    </div>
                    <div>
                        <label style={labelStyle}>Cisza nocna do (godzina)</label>
                        <input type="number" style={inputStyle} value={pushSettings.quiet_hours_end} onChange={e => setPushSettings({ ...pushSettings, quiet_hours_end: +e.target.value })} min={0} max={23} />
                    </div>
                </div>
            </div>

            {/* Medications */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem' }}>💊 Leki domyślne</h4>
                    <button style={btnSecondary} onClick={addMedication}>+ Dodaj lek</button>
                </div>
                {medications.map((med, i) => (
                    <div key={i} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Lek #{i}</span>
                            <button style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => removeMed(i)}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.3rem' }}>
                            <input style={inputStyle} value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="Nazwa leku" />
                            <input style={inputStyle} value={med.dose} onChange={e => updateMed(i, 'dose', e.target.value)} placeholder="Dawka" />
                        </div>
                        <input style={{ ...inputStyle, marginTop: '0.3rem' }} value={med.description} onChange={e => updateMed(i, 'description', e.target.value)} placeholder="Opis/instrukcje" />
                        <input style={{ ...inputStyle, marginTop: '0.3rem' }} value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} placeholder="Częstotliwość" />
                    </div>
                ))}
            </div>

            {/* Steps */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem' }}>📋 Kroki protokołu ({steps.length})</h4>
                    <button style={btnSecondary} onClick={addStep}>+ Dodaj krok</button>
                </div>
                {steps.map((step, i) => (
                    <div key={i} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '0.8rem', borderLeft: `3px solid ${step.offset_hours < 0 ? '#f59e0b' : step.offset_hours === 0 ? '#ef4444' : '#10b981'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: step.offset_hours < 0 ? '#f59e0b' : step.offset_hours === 0 ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                                {formatOffset(step.offset_hours)} — Krok #{step.sort_order}
                            </span>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button style={{ ...btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => moveStep(i, -1)}>↑</button>
                                <button style={{ ...btnSecondary, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => moveStep(i, 1)}>↓</button>
                                <button style={{ ...btnDanger, padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => removeStep(i)}>✕</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '0.5rem' }}>
                            <input style={{ ...inputStyle, textAlign: 'center' }} value={step.icon} onChange={e => updateStep(i, 'icon', e.target.value)} title="Emoji ikona" />
                            <input style={inputStyle} value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} placeholder="Tytuł kroku *" />
                        </div>
                        <textarea style={{ ...inputStyle, minHeight: '40px', marginTop: '0.3rem', resize: 'vertical' }} value={step.description} onChange={e => updateStep(i, 'description', e.target.value)} placeholder="Opis / instrukcje dla pacjenta" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.3rem' }}>
                            <div>
                                <label style={{ ...labelStyle, marginTop: '0.2rem' }}>Offset (godziny)</label>
                                <input type="number" step="0.5" style={inputStyle} value={step.offset_hours} onChange={e => updateStep(i, 'offset_hours', +e.target.value)} />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, marginTop: '0.2rem' }}>Interwał push (min)</label>
                                <input type="number" style={inputStyle} value={step.reminder_interval_minutes} onChange={e => updateStep(i, 'reminder_interval_minutes', +e.target.value)} />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, marginTop: '0.2rem' }}>Max push</label>
                                <input type="number" style={inputStyle} value={step.reminder_max_count} onChange={e => updateStep(i, 'reminder_max_count', +e.target.value)} />
                            </div>
                        </div>
                        <input style={{ ...inputStyle, marginTop: '0.3rem' }} value={step.push_message} onChange={e => updateStep(i, 'push_message', e.target.value)} placeholder="Treść push notification" />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            <label style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={step.smart_snap} onChange={e => updateStep(i, 'smart_snap', e.target.checked)} style={{ marginRight: '0.3rem' }} />
                                Smart snap (7-22)
                            </label>
                            <label style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={step.requires_confirmation} onChange={e => updateStep(i, 'requires_confirmation', e.target.checked)} style={{ marginRight: '0.3rem' }} />
                                Wymaga potwierdzenia
                            </label>
                            <select
                                value={step.medication_index ?? ''}
                                onChange={e => updateStep(i, 'medication_index', e.target.value === '' ? null : +e.target.value)}
                                style={{ ...inputStyle, width: 'auto', fontSize: '0.8rem' }}
                            >
                                <option value="">Brak leku</option>
                                {medications.map((m, mi) => (
                                    <option key={mi} value={mi}>💊 {m.name || `Lek #${mi}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            {/* Timeline preview */}
            {steps.length > 0 && (
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 0.8rem', color: 'white', fontSize: '0.95rem' }}>👁️ Podgląd Timeline</h4>
                    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                        {/* Vertical line */}
                        <div style={{ position: 'absolute', left: '0.7rem', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.1)' }} />
                        {steps.sort((a, b) => a.offset_hours - b.offset_hours).map((step, i) => {
                            const isPre = step.offset_hours < 0;
                            const isNow = step.offset_hours === 0;
                            return (
                                <div key={i} style={{ position: 'relative', paddingBottom: '1.2rem' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '-1.55rem',
                                        top: '0.2rem',
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: isNow ? '#ef4444' : isPre ? '#f59e0b' : '#10b981',
                                    }} />
                                    <div style={{ fontSize: '0.75rem', color: isNow ? '#ef4444' : isPre ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                                        {formatOffset(step.offset_hours)}
                                    </div>
                                    <div style={{ color: 'white', fontSize: '0.85rem' }}>
                                        {step.icon} {step.title}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Save/Cancel */}
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button style={btnSecondary} onClick={onCancel}>Anuluj</button>
                <button style={btnPrimary} onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisuję...' : isEdit ? '💾 Zapisz zmiany' : '💾 Utwórz szablon'}
                </button>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENROLLMENTS SUB-TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EnrollmentsSubTab() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [generatingReport, setGeneratingReport] = useState<string | null>(null);
    const [exportingProdentis, setExportingProdentis] = useState<string | null>(null);
    const [sendingSms, setSendingSms] = useState<string | null>(null);

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/employee/careflow/enrollments?status=${filter}`);
            const data = await res.json();
            setEnrollments(data.enrollments || []);
        } catch { }
        setLoading(false);
    }, [filter]);

    useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

    const handleCancel = async (id: string) => {
        if (!confirm('Anulować CareFlow tego pacjenta?')) return;
        await fetch(`/api/employee/careflow/enrollments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' }),
        });
        fetchEnrollments();
    };

    const handleExportProdentis = async (id: string) => {
        setExportingProdentis(id);
        try {
            const res = await fetch(`/api/admin/careflow/export-prodentis/${id}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                fetchEnrollments();
            } else {
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch { alert('❌ Błąd eksportu'); }
        setExportingProdentis(null);
    };

    const handleSendSms = async (id: string) => {
        setSendingSms(id);
        try {
            const res = await fetch(`/api/admin/careflow/send-sms/${id}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(data.smsSent > 0
                    ? `✅ ${data.message} (${data.smsSent}/${data.totalPending})`
                    : `⚠️ ${data.message}`);
                fetchEnrollments();
            } else {
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch { alert('❌ Błąd wysyłki SMS'); }
        setSendingSms(null);
    };

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {['active', 'completed', 'cancelled', 'all'].map(f => (
                    <button key={f} style={{ ...btnSecondary, background: filter === f ? 'rgba(99,102,241,0.2)' : undefined, borderColor: filter === f ? '#6366f1' : undefined }} onClick={() => setFilter(f)}>
                        {f === 'active' ? '🟢 Aktywne' : f === 'completed' ? '✅ Zakończone' : f === 'cancelled' ? '❌ Anulowane' : '📊 Wszystkie'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>Ładowanie...</div>
            ) : enrollments.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Brak procesów CareFlow.</p>
                </div>
            ) : (
                enrollments.map(e => (
                    <div key={e.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>
                                    👤 {e.patient_name}
                                    <span style={{
                                        fontSize: '0.7rem',
                                        marginLeft: '0.5rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '6px',
                                        background: e.status === 'active' ? 'rgba(16,185,129,0.2)' : e.status === 'completed' ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)',
                                        color: e.status === 'active' ? '#10b981' : e.status === 'completed' ? '#6366f1' : '#ef4444',
                                    }}>
                                        {e.status === 'active' ? '🟢 Aktywny' : e.status === 'completed' ? '✅ Zakończony' : '❌ Anulowany'}
                                    </span>
                                    {e.report_exported_to_prodentis && (
                                        <span style={{
                                            fontSize: '0.65rem', marginLeft: '0.4rem', padding: '0.1rem 0.4rem',
                                            borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981',
                                        }}>
                                            ✅ W Prodentis
                                        </span>
                                    )}
                                </h4>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                                    🏥 {e.template_name} • 📅 {new Date(e.appointment_date).toLocaleString('pl-PL')}
                                    {e.doctor_name && ` • 👨‍⚕️ ${e.doctor_name}`}
                                </p>

                                {/* Progress bar */}
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                        <span>Postęp: {e.stats.completed}/{e.stats.total}</span>
                                        <span>{e.stats.progress}%</span>
                                    </div>
                                    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', marginTop: '0.2rem' }}>
                                        <div style={{
                                            height: '100%',
                                            borderRadius: '3px',
                                            width: `${e.stats.progress}%`,
                                            background: e.stats.progress === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                            transition: 'width 0.3s',
                                        }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                                    <span>Zakwalifikował: {e.enrolled_by}</span>
                                    {e.prescription_code && <span>📋 Recepta: {e.prescription_code}</span>}
                                    {e.patient_phone && <span>📱 {e.patient_phone}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end', minWidth: '140px' }}>
                                <button
                                    style={{ ...btnSecondary, fontSize: '0.75rem' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${siteUrl}/opieka/${e.access_token}`);
                                        alert('Link skopiowany!');
                                    }}
                                >
                                    🔗 Kopiuj link
                                </button>

                                {/* Manual SMS trigger — only for active enrollments with phone */}
                                {e.status === 'active' && e.patient_phone && (
                                    <button
                                        style={{ ...btnSecondary, fontSize: '0.75rem', background: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b', color: '#fbbf24' }}
                                        disabled={sendingSms === e.id}
                                        onClick={() => handleSendSms(e.id)}
                                    >
                                        {sendingSms === e.id ? '⏳ Wysyłam...' : '📱 Wyślij SMS'}
                                    </button>
                                )}

                                {/* PDF report actions */}
                                {(e.status === 'completed' || e.status === 'cancelled') && (
                                    e.report_pdf_url ? (
                                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <a
                                                href={e.report_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ ...btnSecondary, fontSize: '0.75rem', textDecoration: 'none', display: 'inline-block', background: 'rgba(16,185,129,0.15)', borderColor: '#10b981', color: '#10b981' }}
                                            >
                                                📄 Pobierz PDF
                                            </a>
                                            <button
                                                style={{ ...btnSecondary, fontSize: '0.7rem', padding: '0.3rem 0.5rem' }}
                                                disabled={generatingReport === e.id}
                                                onClick={async () => {
                                                    setGeneratingReport(e.id);
                                                    try {
                                                        const res = await fetch(`/api/admin/careflow/report/${e.id}?regenerate=true`);
                                                        if (res.ok) {
                                                            const blob = await res.blob();
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url; a.download = `careflow-${e.patient_name.replace(/\s+/g, '-')}.pdf`;
                                                            a.click(); URL.revokeObjectURL(url);
                                                            fetchEnrollments();
                                                        } else {
                                                            alert('Błąd generowania raportu');
                                                        }
                                                    } catch { alert('Błąd'); }
                                                    setGeneratingReport(null);
                                                }}
                                            >
                                                🔄
                                            </button>
                                            {/* Export to Prodentis */}
                                            {!e.report_exported_to_prodentis && (
                                                <button
                                                    style={{ ...btnSecondary, fontSize: '0.7rem', padding: '0.3rem 0.6rem', background: 'rgba(99,102,241,0.15)', borderColor: '#6366f1', color: '#a5b4fc' }}
                                                    disabled={exportingProdentis === e.id}
                                                    onClick={() => handleExportProdentis(e.id)}
                                                >
                                                    {exportingProdentis === e.id ? '⏳' : '📤 Prodentis'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            style={{ ...btnSecondary, fontSize: '0.75rem', background: 'rgba(99,102,241,0.15)', borderColor: '#6366f1', color: '#a5b4fc' }}
                                            disabled={generatingReport === e.id}
                                            onClick={async () => {
                                                setGeneratingReport(e.id);
                                                try {
                                                    const res = await fetch(`/api/admin/careflow/report/${e.id}`);
                                                    if (res.ok) {
                                                        const blob = await res.blob();
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url; a.download = `careflow-${e.patient_name.replace(/\s+/g, '-')}.pdf`;
                                                        a.click(); URL.revokeObjectURL(url);
                                                        fetchEnrollments();
                                                    } else {
                                                        alert('Błąd generowania raportu');
                                                    }
                                                } catch { alert('Błąd'); }
                                                setGeneratingReport(null);
                                            }}
                                        >
                                            {generatingReport === e.id ? '⏳ Generuję...' : '📄 Generuj PDF'}
                                        </button>
                                    )
                                )}
                                {e.status === 'active' && (
                                    <button style={{ ...btnDanger, fontSize: '0.75rem' }} onClick={() => handleCancel(e.id)}>Anuluj</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATS SUB-TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StatsSubTab() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/careflow/stats');
                const data = await res.json();
                if (res.ok) setStats(data);
            } catch { }
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>Ładowanie statystyk...</div>;
    }

    if (!stats) {
        return <div style={cardStyle}><p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Błąd ładowania statystyk.</p></div>;
    }

    const o = stats.overview;

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const formatHours = (hours: number): string => {
        if (hours < 24) return `${hours}h`;
        const d = Math.floor(hours / 24);
        const h = hours % 24;
        return h > 0 ? `${d}d ${h}h` : `${d}d`;
    };

    return (
        <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <KPICard label="Wszystkie procesy" value={o.total} icon="📊" color="#6366f1" />
                <KPICard label="Aktywne" value={o.active} icon="🟢" color="#10b981" />
                <KPICard label="Zakończone" value={o.completed} icon="✅" color="#22c55e" />
                <KPICard label="Anulowane" value={o.cancelled} icon="❌" color="#ef4444" />
                <KPICard label="Completion rate" value={`${o.completionRate}%`} icon="🎯" color={o.completionRate >= 80 ? '#10b981' : o.completionRate >= 50 ? '#f59e0b' : '#ef4444'} />
                <KPICard label="Śr. zgodność zadań" value={`${o.avgCompliance}%`} icon="📋" color={o.avgCompliance >= 80 ? '#10b981' : o.avgCompliance >= 50 ? '#f59e0b' : '#ef4444'} />
                <KPICard label="Śr. czas odpowiedzi" value={formatTime(o.avgResponseMinutes)} icon="⏱️" color="#8b5cf6" />
                <KPICard label="Śr. czas ukończenia" value={formatHours(o.avgCompletionHours)} icon="🕐" color="#a78bfa" />
                <KPICard label="SMS fallback" value={`${o.smsFallbackRate}%`} icon="📱" color="#f59e0b" />
                <KPICard label="W Prodentis" value={o.exportedToProdentis} icon="📤" color="#06b6d4" />
            </div>

            {/* Template breakdown */}
            {stats.byTemplate.length > 0 && (
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 1rem', color: 'white', fontSize: '0.95rem' }}>📋 Według szablonu</h4>
                    {stats.byTemplate.map(t => {
                        const maxCount = Math.max(...stats.byTemplate.map(x => x.count), 1);
                        return (
                            <div key={t.name} style={{ marginBottom: '0.8rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                    <span style={{ color: 'white' }}>{t.name}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                                        {t.count} procesów • {t.completionRate}% ukończonych
                                    </span>
                                </div>
                                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        borderRadius: '4px',
                                        width: `${(t.count / maxCount) * 100}%`,
                                        background: `linear-gradient(90deg, #6366f1, ${t.completionRate >= 80 ? '#10b981' : t.completionRate >= 50 ? '#f59e0b' : '#ef4444'})`,
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Doctor breakdown */}
            {stats.byDoctor.length > 0 && (
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 1rem', color: 'white', fontSize: '0.95rem' }}>👨‍⚕️ Według lekarza</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Lekarz</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Procesy</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Zakończone</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Śr. zgodność</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.byDoctor.map(d => (
                                    <tr key={d.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.5rem', color: 'white' }}>{d.name}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{d.count}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center', color: '#10b981' }}>{d.completed}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.15rem 0.5rem', borderRadius: '6px',
                                                background: d.avgCompliance >= 80 ? 'rgba(16,185,129,0.2)' : d.avgCompliance >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                                                color: d.avgCompliance >= 80 ? '#10b981' : d.avgCompliance >= 50 ? '#f59e0b' : '#ef4444',
                                                fontSize: '0.8rem',
                                            }}>
                                                {d.avgCompliance}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Monthly timeline */}
            {stats.monthlyTimeline.length > 0 && (
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 1rem', color: 'white', fontSize: '0.95rem' }}>📈 Trend miesięczny (ostatnie 6 mies.)</h4>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px' }}>
                        {stats.monthlyTimeline.map(m => {
                            const maxVal = Math.max(...stats.monthlyTimeline.map(x => x.count), 1);
                            const height = m.count > 0 ? Math.max(8, (m.count / maxVal) * 100) : 4;
                            const monthLabel = m.month.slice(5); // "04" from "2026-04"
                            return (
                                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{m.count}</span>
                                    <div style={{
                                        width: '100%',
                                        height: `${height}px`,
                                        borderRadius: '4px 4px 0 0',
                                        background: m.count > 0 ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                                        transition: 'height 0.5s ease',
                                    }} />
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{monthLabel}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SMS breakdown */}
            <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: '0.95rem' }}>📱 SMS Fallback</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                borderRadius: '6px',
                                width: `${o.smsFallbackRate}%`,
                                background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {o.smsSentTasks}/{o.totalTasks} zadań z SMS
                    </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.4rem' }}>
                    {o.smsFallbackRate === 0 ? 'Wszystkie powiadomienia dostarczono przez push.' :
                     o.smsFallbackRate < 20 ? 'Niska potrzeba SMS fallback — push działa dobrze.' :
                     'Znaczna część zadań wymaga SMS fallback — rozważ zachęcenie pacjentów do instalacji PWA.'}
                </p>
            </div>
        </div>
    );
}

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '14px',
            border: `1px solid ${color}22`,
            padding: '1rem 1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color, letterSpacing: '-0.02em' }}>
                {value}
            </span>
        </div>
    );
}
