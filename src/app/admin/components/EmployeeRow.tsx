"use client";

// EmployeeRow — rozwijany wiersz pojedynczego pracownika w admin panel
//
// 4 sekcje (toggleable tabs wewnątrz rozwiniętego wiersza):
//   • Info       — name, position, prodentis_id (read + edit name/position)
//   • Konto      — email, role (admin/employee), reset hasła, deaktywacja
//   • Booking    — show_in_booking toggle
//   • Push       — push_groups multi-chip
//
// Wszystkie edycje przez PATCH /api/admin/employees/[id] (updateEmployee).
// Auto-save chip toggles, ręczny save dla pól tekstowych (email/name).

import { useState } from 'react';
import { User, Briefcase, Mail, Shield, CalendarCheck, Bell, KeyRound, UserMinus, UserCheck, Save, X } from 'lucide-react';

type Role = 'admin' | 'employee';
type PushGroup = 'doctor' | 'hygienist' | 'reception' | 'assistant';

export interface EmployeeData {
    id: string;
    name: string;
    email: string | null;
    user_id: string | null;
    position: string | null;
    push_groups: string[];
    prodentis_id: string | null;
    is_active: boolean;
    show_in_booking: boolean;
    has_account: boolean;
    roles: string[];
}

interface Props {
    employee: EmployeeData;
    isExpanded: boolean;
    onToggle: () => void;
    onAfterChange: (msg?: string) => void;  // wywołane po udanej zmianie (refresh listy)
    onPasswordReset: (email: string) => void; // delegacja do parent (już istnieje w admin/page.tsx)
}

const POSITIONS = ['Lekarz', 'Higienistka', 'Asystentka', 'Recepcja', 'Pracownik pomocniczy'];

const PUSH_GROUP_LABELS: Record<PushGroup, string> = {
    doctor: '🦷 Lekarz',
    hygienist: '💉 Higienistka',
    reception: '📞 Recepcja',
    assistant: '🔧 Asysta',
};

type Section = 'info' | 'konto' | 'booking' | 'push';

export default function EmployeeRow({ employee, isExpanded, onToggle, onAfterChange, onPasswordReset }: Props) {
    const [section, setSection] = useState<Section>('info');
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Local edit buffers (Info section)
    const [editName, setEditName] = useState(employee.name);
    const [editPosition, setEditPosition] = useState(employee.position || '');
    const [editEmail, setEditEmail] = useState(employee.email || '');

    const isInactive = !employee.is_active;
    const isOrphan = employee.email?.includes('@auto.mikrostomart.pl') ?? false;

    async function patch(body: Record<string, unknown>, label: string): Promise<boolean> {
        setSaving(label);
        setError(null);
        try {
            const res = await fetch(`/api/admin/employees/${employee.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Błąd zapisu');
                setSaving(null);
                return false;
            }
            setSaving(null);
            onAfterChange(data.message);
            return true;
        } catch (e: any) {
            setError(e?.message || 'Błąd sieci');
            setSaving(null);
            return false;
        }
    }

    const saveInfo = () => {
        const changes: Record<string, unknown> = {};
        if (editName.trim() !== employee.name) changes.name = editName.trim();
        if ((editPosition || null) !== (employee.position || null)) changes.position = editPosition || null;
        if (Object.keys(changes).length === 0) return;
        patch(changes, 'info');
    };

    const saveEmail = () => {
        if (editEmail.trim().toLowerCase() === (employee.email || '').toLowerCase()) return;
        if (!editEmail.includes('@')) {
            setError('Wymagany poprawny email');
            return;
        }
        patch({ email: editEmail.trim().toLowerCase() }, 'email');
    };

    const toggleRole = (role: Role) => {
        const has = employee.roles.includes(role);
        const next = has ? employee.roles.filter(r => r !== role) : [...employee.roles, role];
        if (next.length === 0) {
            setError('Pracownik musi mieć minimum 1 rolę');
            return;
        }
        patch({ roles: next }, `role-${role}`);
    };

    const toggleActive = () => {
        if (employee.is_active && !confirm(`Dezaktywować pracownika "${employee.name}"? Zniknie z grafiku i bookingu.`)) return;
        patch({ isActive: !employee.is_active }, 'active');
    };

    const toggleBooking = () => {
        patch({ showInBooking: !employee.show_in_booking }, 'booking');
    };

    const togglePushGroup = (g: PushGroup) => {
        const has = employee.push_groups.includes(g);
        const next = has ? employee.push_groups.filter(x => x !== g) : [...employee.push_groups, g];
        patch({ pushGroups: next }, `push-${g}`);
    };

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '10px',
            border: `1px solid ${isExpanded ? 'var(--color-primary)' : 'var(--color-border)'}`,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
            opacity: isInactive ? 0.6 : 1,
        }}>
            {/* Header — always visible */}
            <div
                onClick={onToggle}
                style={{
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {employee.name}
                    </div>
                    {employee.position && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--color-text-muted)' }}>
                            {employee.position}
                        </span>
                    )}
                    {isInactive && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(239,68,68,0.15)', borderRadius: '4px', color: '#fca5a5' }}>
                            Nieaktywny
                        </span>
                    )}
                    {isOrphan && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'rgba(245,158,11,0.15)', borderRadius: '4px', color: '#fbbf24' }} title="Brak prawdziwego konta — tylko wpis z Prodentis">
                            Bez konta
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {employee.has_account && !isOrphan && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>✅ konto</span>
                    )}
                    {employee.show_in_booking && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }} title="Widoczny w bookingu">📅</span>
                    )}
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        {isExpanded ? '▾' : '▸'}
                    </span>
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div onClick={(e) => e.stopPropagation()} style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem' }}>
                    {/* Section tabs */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <SectionTab active={section === 'info'} onClick={() => setSection('info')} icon={<User size={13} />} label="Info" />
                        <SectionTab active={section === 'konto'} onClick={() => setSection('konto')} icon={<Shield size={13} />} label="Konto" />
                        <SectionTab active={section === 'booking'} onClick={() => setSection('booking')} icon={<CalendarCheck size={13} />} label="Booking" />
                        <SectionTab active={section === 'push'} onClick={() => setSection('push')} icon={<Bell size={13} />} label="Push" />
                    </div>

                    {section === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Field label="Imię i nazwisko" icon={<User size={13} />}>
                                <input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Stanowisko" icon={<Briefcase size={13} />}>
                                <select value={editPosition} onChange={e => setEditPosition(e.target.value)} style={inputStyle}>
                                    <option value="">— brak —</option>
                                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </Field>
                            {employee.prodentis_id && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    Prodentis ID: <code style={{ fontFamily: 'monospace' }}>{employee.prodentis_id}</code>
                                </div>
                            )}
                            <SaveButton onClick={saveInfo} loading={saving === 'info'} disabled={editName.trim() === employee.name && (editPosition || null) === (employee.position || null)} />
                        </div>
                    )}

                    {section === 'konto' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Field label="Email do logowania" icon={<Mail size={13} />}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        style={{ ...inputStyle, flex: 1 }}
                                        type="email"
                                    />
                                    <button
                                        onClick={saveEmail}
                                        disabled={saving === 'email' || editEmail.trim().toLowerCase() === (employee.email || '').toLowerCase()}
                                        style={{ ...secondaryButtonStyle, opacity: editEmail.trim().toLowerCase() === (employee.email || '').toLowerCase() ? 0.5 : 1 }}
                                    >
                                        <Save size={13} /> Zapisz
                                    </button>
                                </div>
                            </Field>

                            <Field label="Role" icon={<Shield size={13} />}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <ChipToggle active={employee.roles.includes('employee')} onClick={() => toggleRole('employee')} loading={saving === 'role-employee'} label="👤 Pracownik" />
                                    <ChipToggle active={employee.roles.includes('admin')} onClick={() => toggleRole('admin')} loading={saving === 'role-admin'} label="🛡️ Admin" />
                                </div>
                            </Field>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                                {employee.email && !isOrphan && (
                                    <button
                                        onClick={() => onPasswordReset(employee.email!)}
                                        style={secondaryButtonStyle}
                                    >
                                        <KeyRound size={13} /> Wyślij reset hasła
                                    </button>
                                )}
                                <button
                                    onClick={toggleActive}
                                    disabled={saving === 'active'}
                                    style={{
                                        ...secondaryButtonStyle,
                                        color: employee.is_active ? '#fca5a5' : '#86efac',
                                        borderColor: employee.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                                    }}
                                >
                                    {employee.is_active ? <UserMinus size={13} /> : <UserCheck size={13} />}
                                    {employee.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                                </button>
                            </div>
                        </div>
                    )}

                    {section === 'booking' && (
                        <div>
                            <label style={chipToggleLabelStyle}>
                                <input
                                    type="checkbox"
                                    checked={employee.show_in_booking}
                                    onChange={toggleBooking}
                                    disabled={saving === 'booking'}
                                    style={{ accentColor: 'var(--color-primary)' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Widoczny w bookingu online</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Pacjenci mogą wybrać tego specjalistę na /rezerwacja
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

                    {section === 'push' && (
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                                Grupy push-notifications:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {(Object.keys(PUSH_GROUP_LABELS) as PushGroup[]).map(g => (
                                    <ChipToggle
                                        key={g}
                                        active={employee.push_groups.includes(g)}
                                        onClick={() => togglePushGroup(g)}
                                        loading={saving === `push-${g}`}
                                        label={PUSH_GROUP_LABELS[g]}
                                    />
                                ))}
                            </div>
                            {!employee.user_id && (
                                <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                    💡 Push wymaga konta Supabase Auth.
                                </small>
                            )}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            color: '#fca5a5',
                            fontSize: '0.8rem',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.4rem 0.75rem',
                background: active ? 'rgba(220,177,74,0.15)' : 'transparent',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '6px',
                color: active ? 'var(--color-primary)' : 'var(--color-text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
            }}
        >
            {icon} {label}
        </button>
    );
}

function ChipToggle({ active, onClick, loading, label }: { active: boolean; onClick: () => void; loading: boolean; label: string }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            style={{
                padding: '0.4rem 0.75rem',
                background: active ? 'rgba(220,177,74,0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '20px',
                color: active ? 'var(--color-primary)' : 'var(--color-text-main)',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                opacity: loading ? 0.6 : 1,
            }}
        >
            {loading ? '⏳ ' : ''}{label}
        </button>
    );
}

function SaveButton({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                alignSelf: 'flex-start',
                opacity: disabled || loading ? 0.5 : 1,
            }}
        >
            <Save size={13} /> {loading ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
    );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                {icon} {label}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text-main)',
    fontSize: '0.875rem',
    outline: 'none',
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: '0.4rem 0.8rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
};

const chipToggleLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 0.875rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
};
