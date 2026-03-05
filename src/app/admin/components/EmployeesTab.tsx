"use client";
import { useState, useEffect } from "react";
import { inputStyle } from "./adminStyles";

export default function EmployeesTab() {
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [registeredEmployees, setRegisteredEmployees] = useState<any[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [prodentisAvailable, setProdentisAvailable] = useState(true);
    const [employeeEmails, setEmployeeEmails] = useState<Record<string, string>>({});
    const [addingEmployee, setAddingEmployee] = useState<string | null>(null);
    const [newManualName, setNewManualName] = useState('');
    const [newManualEmail, setNewManualEmail] = useState('');
    const [addingManual, setAddingManual] = useState(false);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

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


    // Employee Functions
    const fetchEmployees = async () => {
        setEmployeesLoading(true);
        try {
            const res = await fetch('/api/admin/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployeesList(data.staff || []);
                setRegisteredEmployees(data.registeredEmployees || []);
                setProdentisAvailable(data.prodentisAvailable ?? false);
            } else {
                console.error('Failed to fetch employees');
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setEmployeesLoading(false);
        }
    };

    const addEmployee = async (staffId: string, staffName: string) => {
        const email = employeeEmails[staffId]?.trim();
        if (!email) {
            alert('Podaj adres email pracownika');
            return;
        }
        if (!email.includes('@')) {
            alert('Podaj poprawny adres email');
            return;
        }
        setAddingEmployee(staffId);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientEmail: email,
                    roles: ['employee'],
                    sendPasswordReset: true,
                    employeeName: staffName,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`\u2705 ${data.message}`);
                setEmployeeEmails(prev => ({ ...prev, [staffId]: '' }));
                fetchEmployees();
            } else {
                alert(`\u274c B\u0142\u0105d: ${data.error}`);
            }
        } catch (err) {
            console.error('Add employee error:', err);
            alert('B\u0142\u0105d po\u0142\u0105czenia z serwerem');
        } finally {
            setAddingEmployee(null);
        }
    };

    const addManualEmployee = async () => {
        const name = newManualName.trim();
        const email = newManualEmail.trim();
        if (!name) { alert('Podaj imi\u0119 i nazwisko'); return; }
        if (!email || !email.includes('@')) { alert('Podaj poprawny adres email'); return; }
        if (!confirm(`Utworzy\u0107 konto pracownika?\n\n${name}\n${email}`)) return;
        setAddingManual(true);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientEmail: email,
                    roles: ['employee'],
                    sendPasswordReset: true,
                    employeeName: name,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`\u2705 ${data.message}`);
                setNewManualName('');
                setNewManualEmail('');
                fetchEmployees();
            } else {
                alert(`\u274c B\u0142\u0105d: ${data.error}`);
            }
        } catch {
            alert('B\u0142\u0105d po\u0142\u0105czenia');
        } finally {
            setAddingManual(false);
        }
    };

    const removeEmployee = async (userId: string, email: string) => {
        if (!confirm(`Usun\u0105\u0107 rol\u0119 pracownika dla ${email}?`)) return;
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: 'employee' }),
            });
            if (res.ok) {
                alert('\u2705 Rola usuni\u0119ta');
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`\u274c ${data.error}`);
            }
        } catch {
            alert('B\u0142\u0105d po\u0142\u0105czenia');
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const renderEmployeesTab = () => {
        if (employeesLoading && employeesList.length === 0) {
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Ładowanie danych z Prodentis...</div>;
        }

        return (
            <div>
                {/* Prodentis connection status */}
                {!prodentisAvailable && (
                    <div style={{
                        padding: '0.75rem 1rem', marginBottom: '1.5rem',
                        background: '#eab30815', border: '1px solid #eab30840',
                        borderRadius: '8px', fontSize: '0.85rem', color: '#eab308'
                    }}>
                        ⚠️ Brak połączenia z Prodentis — lista pracowników może być niepełna. Możesz dodać pracownika ręcznie poniżej.
                    </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                            Pracownicy z Prodentis ({employeesList.length})
                        </h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Kliknij na osobę, aby rozwinąć i dodać konto
                        </p>
                    </div>
                    <button onClick={fetchEmployees} style={{
                        padding: '0.4rem 1rem', background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '0.85rem'
                    }}>Odśwież</button>
                </div>

                {employeesList.length === 0 && !employeesLoading ? (
                    <div style={{
                        textAlign: 'center', padding: '2rem',
                        background: 'var(--color-surface)', borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}>
                        Brak danych z Prodentis. Spróbuj odświeżyć lub dodaj pracownika ręcznie.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {employeesList.map((staff: any) => {
                            const isExpanded = expandedStaffId === staff.id;
                            return (
                                <div key={staff.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '10px',
                                    border: `1px solid ${isExpanded ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                }}>
                                    {/* Collapsed header — always visible, clickable */}
                                    <div
                                        onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                                        style={{
                                            padding: '0.85rem 1.25rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{
                                                fontSize: '0.9rem',
                                                transition: 'transform 0.2s',
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                display: 'inline-block',
                                            }}>▶</span>
                                            <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                                                {staff.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            padding: '0.15rem 0.6rem',
                                            borderRadius: '10px',
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            background: staff.hasAccount ? '#22c55e22' : '#ffffff10',
                                            color: staff.hasAccount ? '#22c55e' : 'var(--color-text-muted)',
                                        }}>
                                            {staff.hasAccount ? '✅ Ma konto' : '—'}
                                        </span>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                padding: '0 1.25rem 1rem 2.5rem',
                                                borderTop: '1px solid var(--color-border)',
                                                paddingTop: '0.75rem',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                                Prodentis ID: {staff.id}
                                            </div>

                                            {staff.hasAccount ? (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                                                        📧 {staff.accountEmail}
                                                    </div>
                                                    {staff.grantedAt && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                                            Dodano: {new Date(staff.grantedAt).toLocaleDateString('pl-PL')}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                        <button
                                                            onClick={() => sendResetPassword(staff.accountEmail)}
                                                            style={{
                                                                padding: '0.35rem 0.8rem',
                                                                background: 'transparent',
                                                                color: 'var(--color-text-muted)',
                                                                border: '1px solid var(--color-border)',
                                                                borderRadius: '5px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                            }}
                                                        >
                                                            🔑 Reset hasła
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                        Podaj adres email, aby utworzyć konto pracownika. Pracownik otrzyma email z linkiem do ustawienia hasła.
                                                    </p>
                                                    <div style={{
                                                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                    }}>
                                                        <input
                                                            type="email"
                                                            placeholder="Adres email pracownika..."
                                                            value={employeeEmails[staff.id] || ''}
                                                            onChange={(e) => setEmployeeEmails(prev => ({ ...prev, [staff.id]: e.target.value }))}
                                                            style={{
                                                                flex: 1, minWidth: '200px',
                                                                padding: '0.5rem 0.75rem',
                                                                borderRadius: '6px',
                                                                border: '2px solid var(--color-border)',
                                                                background: 'var(--color-background)',
                                                                color: 'var(--color-text-main)',
                                                                fontSize: '0.9rem',
                                                                fontFamily: 'inherit',
                                                            }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') addEmployee(staff.id, staff.name); }}
                                                        />
                                                        <button
                                                            onClick={() => addEmployee(staff.id, staff.name)}
                                                            disabled={addingEmployee === staff.id || !employeeEmails[staff.id]?.trim()}
                                                            style={{
                                                                padding: '0.5rem 1.25rem',
                                                                background: (!employeeEmails[staff.id]?.trim() || addingEmployee === staff.id) ? '#444' : 'var(--color-primary)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                color: '#000',
                                                                fontWeight: 'bold',
                                                                cursor: (!employeeEmails[staff.id]?.trim() || addingEmployee === staff.id) ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.85rem',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {addingEmployee === staff.id ? '⏳ Tworzę...' : '➕ Dodaj konto'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Registered employees not in Prodentis */}
                {registeredEmployees.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                            Pozostałe konta pracownicze ({registeredEmployees.length})
                        </h3>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Konta z rolą pracownika, które nie są powiązane z operatorem Prodentis
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {registeredEmployees.map((emp: any) => (
                                <div key={emp.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '10px',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    flexWrap: 'wrap',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
                                            {emp.name}
                                        </div>
                                        {emp.name !== emp.accountEmail && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                                                📧 {emp.accountEmail}
                                            </div>
                                        )}
                                        {emp.grantedAt && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                Dodano: {new Date(emp.grantedAt).toLocaleDateString('pl-PL')}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeEmployee(emp.userId, emp.accountEmail)}
                                        style={{
                                            padding: '0.3rem 0.7rem',
                                            background: 'transparent',
                                            color: 'var(--color-error, #ef4444)',
                                            border: '1px solid var(--color-error, #ef4444)',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        ✖ Usuń rolę
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual add (for staff not in Prodentis) */}
                <div style={{
                    marginTop: '2rem',
                    background: 'var(--color-surface)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    border: '1px dashed var(--color-border)',
                }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                        ➕ Dodaj ręcznie (np. recepcja, asystentka)
                    </h3>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Dla pracowników, którzy nie występują jako operatorzy w Prodentis
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                Imię i nazwisko
                            </label>
                            <input
                                type="text"
                                placeholder="np. Anna Kowalska"
                                value={newManualName}
                                onChange={(e) => setNewManualName(e.target.value)}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '2px solid var(--color-border)',
                                    background: 'var(--color-background)',
                                    color: 'var(--color-text-main)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                Adres email
                            </label>
                            <input
                                type="email"
                                placeholder="pracownik@email.pl"
                                value={newManualEmail}
                                onChange={(e) => setNewManualEmail(e.target.value)}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '2px solid var(--color-border)',
                                    background: 'var(--color-background)',
                                    color: 'var(--color-text-main)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') addManualEmployee(); }}
                            />
                        </div>
                        <button
                            onClick={addManualEmployee}
                            disabled={addingManual || !newManualName.trim() || !newManualEmail.trim()}
                            style={{
                                padding: '0.5rem 1.25rem',
                                background: (addingManual || !newManualName.trim() || !newManualEmail.trim()) ? '#444' : 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#000',
                                fontWeight: 'bold',
                                cursor: (addingManual || !newManualName.trim() || !newManualEmail.trim()) ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {addingManual ? '⏳...' : '➕ Dodaj'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    return renderEmployeesTab();
}
