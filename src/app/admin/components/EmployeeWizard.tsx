"use client";

// EmployeeWizard — modal stepper „Dodaj pracownika"
//
// 5 kroków:
//   1. Ścieżka       — z Prodentis (wybierz operatora) lub Ręcznie
//   2. Dane          — name, email, position, prodentisId
//   3. Role          — admin / employee (patient niedostępny z wizarda)
//   4. Booking       — show_in_booking (z default na podstawie position)
//   5. Push + Submit — push_groups + przegląd + button
//
// Backend: POST /api/admin/employees (createOrUpdateEmployee)
// Bezpiecznie radzi sobie z duplikatami emaila (auto-link do istniejącego user_id).

import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, User, Mail, Briefcase, Shield, CalendarCheck, Bell, ArrowRight } from 'lucide-react';

type Source = 'prodentis' | 'manual';
type Role = 'admin' | 'employee';
type PushGroup = 'doctor' | 'hygienist' | 'reception' | 'assistant';

interface ProdentisCandidate {
    id: string;             // employees.id (już istnieje w DB jako auto-created)
    name: string;
    prodentis_id: string;
    email: string | null;   // zwykle placeholder 'prodentis-<id>@auto.mikrostomart.pl'
    position: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    /** Pracownicy z Prodentis bez prawdziwego konta (placeholder email) — dla kroku 1 */
    prodentisCandidates: ProdentisCandidate[];
}

const POSITIONS = ['Lekarz', 'Higienistka', 'Asystentka', 'Recepcja', 'Pracownik pomocniczy'];

const PUSH_GROUP_LABELS: Record<PushGroup, string> = {
    doctor: '🦷 Lekarz',
    hygienist: '💉 Higienistka',
    reception: '📞 Recepcja',
    assistant: '🔧 Asysta',
};

const POSITION_TO_PUSH: Record<string, PushGroup | null> = {
    Lekarz: 'doctor',
    Higienistka: 'hygienist',
    Recepcja: 'reception',
    Asystentka: 'assistant',
};

export default function EmployeeWizard({ isOpen, onClose, onSuccess, prodentisCandidates }: Props) {
    const [step, setStep] = useState(1);
    const [source, setSource] = useState<Source>('manual');
    const [selectedProdentisId, setSelectedProdentisId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [position, setPosition] = useState<string>('');
    const [prodentisId, setProdentisId] = useState<string | null>(null);

    const [roles, setRoles] = useState<Role[]>(['employee']);
    const [showInBooking, setShowInBooking] = useState(false);
    const [showInBookingTouched, setShowInBookingTouched] = useState(false);

    const [pushGroups, setPushGroups] = useState<PushGroup[]>([]);
    const [pushGroupsTouched, setPushGroupsTouched] = useState(false);

    const [sendPasswordReset, setSendPasswordReset] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSource('manual');
            setSelectedProdentisId(null);
            setName('');
            setEmail('');
            setPosition('');
            setProdentisId(null);
            setRoles(['employee']);
            setShowInBooking(false);
            setShowInBookingTouched(false);
            setPushGroups([]);
            setPushGroupsTouched(false);
            setSendPasswordReset(true);
            setSubmitting(false);
            setError(null);
        }
    }, [isOpen]);

    // Position-driven defaults (jeśli admin nie zmienił ręcznie)
    useEffect(() => {
        if (!showInBookingTouched) {
            setShowInBooking(position === 'Lekarz' || position === 'Higienistka');
        }
        if (!pushGroupsTouched) {
            const auto = POSITION_TO_PUSH[position];
            setPushGroups(auto ? [auto] : []);
        }
    }, [position, showInBookingTouched, pushGroupsTouched]);

    // Po wyborze kandydata Prodentis — pre-fill imię + prodentisId
    const handleProdentisSelect = (cand: ProdentisCandidate) => {
        setSelectedProdentisId(cand.id);
        setName(cand.name);
        setProdentisId(cand.prodentis_id);
        // Wyczyść email tylko jeśli placeholder
        if (cand.email && cand.email.includes('@auto.mikrostomart.pl')) {
            setEmail('');
        } else if (cand.email) {
            setEmail(cand.email);
        }
        if (cand.position) setPosition(cand.position);
    };

    const canProceedStep1 = source === 'manual' || (source === 'prodentis' && !!selectedProdentisId);
    const canProceedStep2 = name.trim().length >= 2 && email.includes('@') && email.length >= 5;
    const canProceedStep3 = roles.length > 0;
    const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source,
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    prodentisId: source === 'prodentis' ? prodentisId : undefined,
                    position: position || null,
                    roles,
                    showInBooking,
                    pushGroups,
                    sendPasswordReset,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Nieznany błąd');
                setSubmitting(false);
                return;
            }
            onSuccess(data.message || 'Pracownik dodany');
            onClose();
        } catch (e: any) {
            setError(e?.message || 'Błąd sieci');
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const STEPS = [
        { num: 1, label: 'Ścieżka', icon: ArrowRight },
        { num: 2, label: 'Dane', icon: User },
        { num: 3, label: 'Role', icon: Shield },
        { num: 4, label: 'Booking', icon: CalendarCheck },
        { num: 5, label: 'Push', icon: Bell },
    ];

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                            Dodaj pracownika
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Krok {step} z {STEPS.length}: {STEPS[step - 1].label}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                        }}
                        aria-label="Zamknij"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = step === s.num;
                        const isDone = step > s.num;
                        return (
                            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isActive ? 'var(--color-primary)' : isDone ? 'rgba(220,177,74,0.2)' : 'rgba(255,255,255,0.05)',
                                        color: isActive ? '#000' : isDone ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {isDone ? <Check size={14} /> : <Icon size={14} />}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div style={{ width: '20px', height: '1px', background: isDone ? 'var(--color-primary)' : 'var(--color-border)' }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step content */}
                <div style={{ minHeight: '280px' }}>
                    {step === 1 && (
                        <Step1Source
                            source={source}
                            setSource={(s) => { setSource(s); if (s === 'manual') setSelectedProdentisId(null); }}
                            candidates={prodentisCandidates}
                            selectedId={selectedProdentisId}
                            onSelect={handleProdentisSelect}
                        />
                    )}
                    {step === 2 && (
                        <Step2Data
                            name={name}
                            setName={setName}
                            email={email}
                            setEmail={setEmail}
                            position={position}
                            setPosition={setPosition}
                            sourceLocked={source === 'prodentis'}
                        />
                    )}
                    {step === 3 && (
                        <Step3Roles roles={roles} setRoles={setRoles} />
                    )}
                    {step === 4 && (
                        <Step4Booking
                            showInBooking={showInBooking}
                            setShowInBooking={(v) => { setShowInBooking(v); setShowInBookingTouched(true); }}
                            position={position}
                        />
                    )}
                    {step === 5 && (
                        <Step5Push
                            pushGroups={pushGroups}
                            setPushGroups={(g) => { setPushGroups(g); setPushGroupsTouched(true); }}
                            sendPasswordReset={sendPasswordReset}
                            setSendPasswordReset={setSendPasswordReset}
                            summary={{
                                source,
                                name: name.trim(),
                                email: email.trim().toLowerCase(),
                                position,
                                roles,
                                showInBooking,
                                pushGroups,
                            }}
                        />
                    )}
                </div>

                {error && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        color: '#fca5a5',
                        fontSize: '0.85rem',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Footer nav */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '0.75rem' }}>
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1 || submitting}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            color: step === 1 ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                            cursor: step === 1 ? 'not-allowed' : 'pointer',
                            opacity: step === 1 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem',
                        }}
                    >
                        <ChevronLeft size={16} /> Wstecz
                    </button>

                    {step < STEPS.length ? (
                        <button
                            onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
                            disabled={
                                (step === 1 && !canProceedStep1) ||
                                (step === 2 && !canProceedStep2) ||
                                (step === 3 && !canProceedStep3)
                            }
                            style={{
                                padding: '0.625rem 1.25rem',
                                background: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                opacity: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) || (step === 3 && !canProceedStep3) ? 0.5 : 1,
                            }}
                        >
                            Dalej <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || submitting}
                            style={{
                                padding: '0.625rem 1.5rem',
                                background: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                cursor: submitting ? 'wait' : 'pointer',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                opacity: !canSubmit || submitting ? 0.5 : 1,
                            }}
                        >
                            {submitting ? '⏳ Tworzenie…' : <>✓ Utwórz pracownika</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── STEPS ─────────────────────────────────────────────────────────────────────

function Step1Source({ source, setSource, candidates, selectedId, onSelect }: {
    source: Source;
    setSource: (s: Source) => void;
    candidates: ProdentisCandidate[];
    selectedId: string | null;
    onSelect: (c: ProdentisCandidate) => void;
}) {
    return (
        <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Skąd dodajesz pracownika?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <SourceCard
                    active={source === 'manual'}
                    onClick={() => setSource('manual')}
                    title="✍️ Ręcznie"
                    desc="Wpisz dane od zera (np. recepcja, asystentka)"
                />
                <SourceCard
                    active={source === 'prodentis'}
                    onClick={() => setSource('prodentis')}
                    title="🔗 Z Prodentis"
                    desc={`Wybierz z listy (${candidates.length} bez konta)`}
                    disabled={candidates.length === 0}
                />
            </div>

            {source === 'prodentis' && (
                <div>
                    {candidates.length === 0 ? (
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            Brak operatorów Prodentis bez konta. Wszyscy są już dodani lub Prodentis nie odpowiada.
                        </div>
                    ) : (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {candidates.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => onSelect(c)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '0.625rem 0.875rem',
                                        background: selectedId === c.id ? 'rgba(220,177,74,0.15)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${selectedId === c.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: '6px',
                                        color: 'var(--color-text-main)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>{c.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                        {c.prodentis_id?.slice(0, 8)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SourceCard({ active, onClick, title, desc, disabled }: { active: boolean; onClick: () => void; title: string; desc: string; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                textAlign: 'left',
                padding: '1rem',
                background: active ? 'rgba(220,177,74,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.95rem' }}>{title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{desc}</div>
        </button>
    );
}

function Step2Data({ name, setName, email, setEmail, position, setPosition, sourceLocked }: {
    name: string; setName: (v: string) => void;
    email: string; setEmail: (v: string) => void;
    position: string; setPosition: (v: string) => void;
    sourceLocked: boolean;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <Field label="Imię i nazwisko" icon={<User size={14} />}>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jan Kowalski"
                    style={inputStyle}
                    disabled={sourceLocked}
                />
                {sourceLocked && (
                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        Wartość pobrana z Prodentis — edytuj w razie potrzeby po utworzeniu.
                    </small>
                )}
            </Field>
            <Field label="Email do logowania" icon={<Mail size={14} />}>
                <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jan@example.com"
                    type="email"
                    style={inputStyle}
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                    Tutaj wyśle się link do ustawienia hasła.
                </small>
            </Field>
            <Field label="Stanowisko (opcjonalne)" icon={<Briefcase size={14} />}>
                <select value={position} onChange={e => setPosition(e.target.value)} style={inputStyle}>
                    <option value="">— Wybierz —</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                    Wpływa na automatyczne ustawienia w kolejnych krokach.
                </small>
            </Field>
        </div>
    );
}

function Step3Roles({ roles, setRoles }: { roles: Role[]; setRoles: (r: Role[]) => void }) {
    const toggle = (r: Role) => {
        if (roles.includes(r)) {
            if (roles.length === 1) return; // min 1 rola
            setRoles(roles.filter(x => x !== r));
        } else {
            setRoles([...roles, r]);
        }
    };
    return (
        <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Jakie role ma mieć w aplikacji?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <RoleOption
                    active={roles.includes('employee')}
                    onToggle={() => toggle('employee')}
                    title="👤 Pracownik"
                    desc="Dostęp do strefy pracownika /pracownik (grafik, zadania, czat)"
                />
                <RoleOption
                    active={roles.includes('admin')}
                    onToggle={() => toggle('admin')}
                    title="🛡️ Admin"
                    desc="Pełen dostęp do panelu admina, zarządzanie pacjentami, integracjami"
                />
            </div>
            <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                Minimum 1 rola. Najczęściej: tylko „Pracownik" lub „Pracownik + Admin" dla kierowników.
            </small>
        </div>
    );
}

function RoleOption({ active, onToggle, title, desc }: { active: boolean; onToggle: () => void; title: string; desc: string }) {
    return (
        <button
            onClick={onToggle}
            style={{
                textAlign: 'left',
                padding: '0.875rem 1rem',
                background: active ? 'rgba(220,177,74,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
            }}
        >
            <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: active ? 'var(--color-primary)' : 'transparent',
                border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
            }}>
                {active && <Check size={12} />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{desc}</div>
            </div>
        </button>
    );
}

function Step4Booking({ showInBooking, setShowInBooking, position }: {
    showInBooking: boolean; setShowInBooking: (v: boolean) => void; position: string;
}) {
    return (
        <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Czy ten pracownik ma być dostępny w formularzu rezerwacji online?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <RoleOption
                    active={showInBooking}
                    onToggle={() => setShowInBooking(!showInBooking)}
                    title="📅 Pokaż w bookingu"
                    desc="Pacjenci będą mogli wybrać tego specjalistę na /rezerwacja"
                />
            </div>
            {(position === 'Lekarz' || position === 'Higienistka') && (
                <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                    💡 Dla stanowiska <strong>{position}</strong> domyślnie zaznaczone — możesz cofnąć.
                </small>
            )}
            {position && position !== 'Lekarz' && position !== 'Higienistka' && (
                <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                    💡 Dla stanowiska <strong>{position}</strong> domyślnie wyłączone (booking online jest dla Lekarzy/Higienistek).
                </small>
            )}
        </div>
    );
}

function Step5Push({ pushGroups, setPushGroups, sendPasswordReset, setSendPasswordReset, summary }: {
    pushGroups: PushGroup[]; setPushGroups: (g: PushGroup[]) => void;
    sendPasswordReset: boolean; setSendPasswordReset: (v: boolean) => void;
    summary: { source: Source; name: string; email: string; position: string; roles: Role[]; showInBooking: boolean; pushGroups: PushGroup[] };
}) {
    const toggle = (g: PushGroup) => {
        if (pushGroups.includes(g)) {
            setPushGroups(pushGroups.filter(x => x !== g));
        } else {
            setPushGroups([...pushGroups, g]);
        }
    };
    return (
        <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Do jakich grup push-notifications należy?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {(Object.keys(PUSH_GROUP_LABELS) as PushGroup[]).map(g => {
                    const active = pushGroups.includes(g);
                    return (
                        <button
                            key={g}
                            onClick={() => toggle(g)}
                            style={{
                                padding: '0.5rem 0.875rem',
                                background: active ? 'rgba(220,177,74,0.2)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                borderRadius: '20px',
                                color: active ? 'var(--color-primary)' : 'var(--color-text-main)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: active ? 600 : 400,
                            }}
                        >
                            {PUSH_GROUP_LABELS[g]}
                        </button>
                    );
                })}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-main)', cursor: 'pointer', marginBottom: '1.25rem' }}>
                <input
                    type="checkbox"
                    checked={sendPasswordReset}
                    onChange={e => setSendPasswordReset(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)' }}
                />
                Wyślij email z linkiem do ustawienia hasła
            </label>

            {/* Review summary */}
            <div style={{
                padding: '0.875rem 1rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Podsumowanie
                </div>
                <SummaryRow label="Imię" value={summary.name || '—'} />
                <SummaryRow label="Email" value={summary.email || '—'} />
                <SummaryRow label="Stanowisko" value={summary.position || '—'} />
                <SummaryRow label="Role" value={summary.roles.join(', ')} />
                <SummaryRow label="Booking" value={summary.showInBooking ? 'Tak' : 'Nie'} />
                <SummaryRow label="Push" value={summary.pushGroups.length > 0 ? summary.pushGroups.join(', ') : '—'} />
            </div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            <span style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>{value}</span>
        </div>
    );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                {icon} {label}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text-main)',
    fontSize: '0.9rem',
    outline: 'none',
};
