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
    template_name: string;
    appointment_date: string;
    doctor_name: string;
    status: string;
    enrolled_by: string;
    enrolled_at: string;
    access_token: string;
    prescription_code: string | null;
    stats: { total: number; completed: number; pending: number; progress: number };
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
    const [subTab, setSubTab] = useState<'templates' | 'enrollments'>('templates');

    return (
        <div>
            {/* Sub-navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                    { id: 'templates' as const, label: '📋 Szablony', icon: '📋' },
                    { id: 'enrollments' as const, label: '📊 Aktywne procesy', icon: '📊' },
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

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                                <button
                                    style={{ ...btnSecondary, fontSize: '0.75rem' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${siteUrl}/opieka/${e.access_token}`);
                                        alert('Link skopiowany!');
                                    }}
                                >
                                    🔗 Kopiuj link
                                </button>
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
