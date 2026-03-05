"use client";
import { useState, useEffect } from "react";
import { inputStyle } from "./adminStyles";

export default function RolesTab() {
    const [rolesUsers, setRolesUsers] = useState<any[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [rolesError, setRolesError] = useState<string | null>(null);
    const [promotingEmail, setPromotingEmail] = useState<string | null>(null);
    const [patientCandidates, setPatientCandidates] = useState<any[]>([]);
    const [pushEmpGroups, setPushEmpGroups] = useState<Record<string, string[]>>({});

    // Roles Functions
    const fetchRoles = async () => {
        setRolesLoading(true);
        setRolesError(null);
        try {
            const res = await fetch('/api/admin/roles');
            if (res.ok) {
                const data = await res.json();
                setRolesUsers(data.users || []);
                setPatientCandidates(data.patientCandidates || []);
                // Pre-populate Podgrupa dropdowns from returned employee positions
                const posMap: Record<string, string[]> = {};
                for (const u of (data.users || [])) {
                    if (u.employeePosition?.push_groups?.length > 0) {
                        posMap[u.user_id] = u.employeePosition.push_groups;
                    } else if (u.employeePosition?.employee_group) {
                        // legacy fallback
                        posMap[u.user_id] = [u.employeePosition.employee_group];
                    }
                }
                setPushEmpGroups(posMap);
            } else {
                const errData = await res.json();
                setRolesError(errData.error || 'Blad pobierania danych');
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
            setRolesError('Blad polaczenia z serwerem');
        } finally {
            setRolesLoading(false);
        }
    };

    const toggleRole = async (userId: string, email: string, role: string, hasRole: boolean) => {
        try {
            if (hasRole) {
                // Revoke
                const res = await fetch('/api/admin/roles', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, role }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.error || 'Blad usuwania roli');
                    return;
                }
            } else {
                // Grant
                const res = await fetch('/api/admin/roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, email, role }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.error || 'Blad nadawania roli');
                    return;
                }
            }
            fetchRoles();
        } catch (err) {
            console.error('Failed to toggle role:', err);
            alert('Blad polaczenia z serwerem');
        }
    };

    const promotePatient = async (email: string, rolesToGrant: string[]) => {
        if (!confirm(`Czy na pewno chcesz awansować ${email} i nadać role: ${rolesToGrant.join(', ')}?\n\nZostanie utworzone konto Supabase Auth z linkiem do ustawienia hasła.`)) {
            return;
        }
        setPromotingEmail(email);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientEmail: email,
                    roles: rolesToGrant,
                    sendPasswordReset: true,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                fetchRoles();
            } else {
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch (err) {
            console.error('Promote error:', err);
            alert('Błąd połączenia z serwerem');
        } finally {
            setPromotingEmail(null);
        }
    };

    const dismissPatient = async (patientId: string, email: string) => {
        if (!confirm(`Ukryć ${email} z listy awansowania?`)) return;
        try {
            const res = await fetch('/api/admin/roles/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId }),
            });
            if (res.ok) {
                setPatientCandidates(prev => prev.filter(p => p.id !== patientId));
            } else {
                alert('Błąd ukrywania pacjenta');
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    const sendResetPassword = async (email: string) => {
        if (!confirm(`Wyślij email z resetem hasła do ${email}?`)) return;
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientEmail: email, roles: [], sendPasswordReset: true }),
            });
            if (res.ok) {
                alert('✅ Email z linkiem do ustawienia hasła został wysłany!');
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };
    const deleteUser = async (userId: string, email: string) => {
        if (!confirm(`⚠️ UWAGA: Czy na pewno chcesz TRWALE usunąć konto ${email}?\n\nTej operacji nie można cofnąć!`)) return;
        try {
            const res = await fetch('/api/admin/roles/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                alert('✅ Konto zostało usunięte');
                fetchRoles();
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    useEffect(() => { fetchRoles(); }, []);

    const renderRolesTab = () => {
        if (rolesLoading && rolesUsers.length === 0) {
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Ladowanie...</div>;
        }
        if (rolesError) {
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-error)' }}>{rolesError}</div>;
        }
        if (rolesUsers.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--color-text-muted)' }}>Brak uzytkownikow</p>
                    <button onClick={fetchRoles} style={{
                        marginTop: '1rem', padding: '0.5rem 1.5rem',
                        background: 'var(--color-primary)', color: '#000',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                    }}>Zaladuj uprawnienia</button>
                </div>
            );
        }

        const roleDefs = [
            { key: 'admin', label: 'Admin', emoji: '🟢', color: '#22c55e' },
            { key: 'employee', label: 'Pracownik', emoji: '🔵', color: '#3b82f6' },
            { key: 'patient', label: 'Pacjent', emoji: '🟡', color: '#eab308' },
        ];

        return (
            <div>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        {rolesUsers.length} uzytkownikow w systemie
                    </p>
                    <button onClick={fetchRoles} style={{
                        padding: '0.4rem 1rem', background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '0.85rem'
                    }}>Odswiez</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {rolesUsers.map((user: any) => (
                        <div key={user.user_id} style={{
                            background: 'var(--color-surface)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                        {user.email}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                                        ID: {user.user_id.slice(0, 8)}...
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {user.roles.map((r: string) => {
                                        const rd = roleDefs.find(d => d.key === r);
                                        return rd ? (
                                            <span key={r} style={{
                                                background: rd.color + '22', color: rd.color,
                                                padding: '0.2rem 0.6rem', borderRadius: '12px',
                                                fontSize: '0.7rem', fontWeight: '600'
                                            }}>{rd.emoji} {rd.label}</span>
                                        ) : null;
                                    })}
                                </div>
                                {/* Podgrupa push — multi-chip selector in Roles tab */}
                                {user.roles.includes('employee') && (() => {
                                    const EMP_OPTS = [
                                        { key: 'doctor', label: '🦷 Lekarz' },
                                        { key: 'hygienist', label: '💉 Higienistka' },
                                        { key: 'reception', label: '📞 Recepcja' },
                                        { key: 'assistant', label: '🔧 Asysta' },
                                    ];
                                    const currentGroups = pushEmpGroups[user.user_id] || [];
                                    return (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Grupy push:</span>
                                            {EMP_OPTS.map(opt => {
                                                const active = currentGroups.includes(opt.key);
                                                return (
                                                    <button key={opt.key}
                                                        onClick={() => {
                                                            const next = active
                                                                ? currentGroups.filter(g => g !== opt.key)
                                                                : [...currentGroups, opt.key];
                                                            setPushEmpGroups(prev => ({ ...prev, [user.user_id]: next }));
                                                            // auto-save immediately
                                                            fetch('/api/admin/employees/position', {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ userId: user.user_id, groups: next }),
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '0.18rem 0.5rem', borderRadius: '2rem', fontSize: '0.7rem', cursor: 'pointer',
                                                            border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                            background: active ? 'rgba(250,189,0,0.12)' : 'transparent',
                                                            color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                            fontWeight: active ? 'bold' : 'normal', transition: 'all 0.1s',
                                                        }}>{opt.label}</button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {roleDefs.map(rd => {
                                    const has = user.roles.includes(rd.key);
                                    return (
                                        <button
                                            key={rd.key}
                                            onClick={() => toggleRole(user.user_id, user.email, rd.key, has)}
                                            style={{
                                                padding: '0.4rem 0.9rem',
                                                background: has ? rd.color : 'transparent',
                                                color: has ? '#fff' : 'var(--color-text-muted)',
                                                border: `1px solid ${has ? rd.color : 'var(--color-border)'}`,
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: has ? 'bold' : 'normal',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {has ? `${rd.emoji} ${rd.label} ✓` : `+ ${rd.label}`}
                                        </button>
                                    );
                                })}
                            </div>

                            {user.roleDetails && user.roleDetails.length > 0 && (
                                <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    {user.roleDetails.map((rd: any, i: number) => (
                                        <span key={i} style={{ marginRight: '1rem' }}>
                                            {rd.role}: nadane przez {rd.granted_by || 'system'} ({new Date(rd.granted_at).toLocaleDateString('pl-PL')})
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => sendResetPassword(user.email)}
                                    style={{
                                        padding: '0.3rem 0.7rem',
                                        background: 'transparent',
                                        color: 'var(--color-text-muted)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    🔑 Reset hasła
                                </button>
                                {user.roles.length === 0 && (
                                    <button
                                        onClick={() => deleteUser(user.user_id, user.email)}
                                        style={{
                                            padding: '0.3rem 0.7rem',
                                            background: 'transparent',
                                            color: 'var(--color-error, #ef4444)',
                                            border: '1px solid var(--color-error, #ef4444)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        🗑️ Usuń konto
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Patient Candidates for Promotion */}
                {patientCandidates.length > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        borderTop: '2px solid var(--color-primary)',
                        paddingTop: '1.5rem',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <span style={{ fontSize: '1.3rem' }}>🔔</span>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Pacjenci do awansowania</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Pacjenci zarejestrowani w Strefie Pacjenta, którzy nie mają jeszcze konta admin/pracownik
                                </p>
                            </div>
                            <span style={{
                                background: 'var(--color-primary)',
                                color: '#000',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                marginLeft: 'auto',
                            }}>{patientCandidates.length}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {patientCandidates.map((patient: any) => (
                                <div key={patient.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    border: '1px solid rgba(220, 177, 74, 0.3)',
                                    borderLeft: '4px solid var(--color-primary)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                                {patient.email}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <span>📞 {patient.phone || 'brak'}</span>
                                                <span>📅 {new Date(patient.createdAt).toLocaleDateString('pl-PL')}</span>
                                                <span style={{
                                                    color: patient.accountStatus === 'approved' ? '#22c55e' :
                                                        patient.accountStatus === 'pending' ? '#eab308' : '#ef4444',
                                                }}>● {patient.accountStatus || 'nieznany'}</span>
                                                {patient.emailVerified && <span style={{ color: '#22c55e' }}>✓ email zweryfikowany</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => promotePatient(patient.email, ['employee'])}
                                                disabled={promotingEmail === patient.email}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#3b82f6',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: promotingEmail === patient.email ? 'wait' : 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    opacity: promotingEmail === patient.email ? 0.5 : 1,
                                                }}
                                            >
                                                {promotingEmail === patient.email ? '⏳...' : '🔵 Pracownik'}
                                            </button>
                                            <button
                                                onClick={() => promotePatient(patient.email, ['admin'])}
                                                disabled={promotingEmail === patient.email}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#22c55e',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: promotingEmail === patient.email ? 'wait' : 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    opacity: promotingEmail === patient.email ? 0.5 : 1,
                                                }}
                                            >
                                                {promotingEmail === patient.email ? '⏳...' : '🟢 Admin'}
                                            </button>
                                            <button
                                                onClick={() => promotePatient(patient.email, ['employee', 'admin'])}
                                                disabled={promotingEmail === patient.email}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: promotingEmail === patient.email ? 'wait' : 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    opacity: promotingEmail === patient.email ? 0.5 : 1,
                                                }}
                                            >
                                                {promotingEmail === patient.email ? '⏳...' : '🔵🟢 Oba'}
                                            </button>
                                            <button
                                                onClick={() => dismissPatient(patient.id, patient.email)}
                                                title="Ukryj z listy"
                                                style={{
                                                    padding: '0.5rem 0.7rem',
                                                    background: 'transparent',
                                                    color: 'var(--color-text-muted)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    lineHeight: 1,
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        );
    };
    return renderRolesTab();
}
