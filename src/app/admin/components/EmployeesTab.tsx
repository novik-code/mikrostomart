"use client";
import { useState, useEffect } from "react";

export default function EmployeesTab() {
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [prodentisAvailable, setProdentisAvailable] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [employeeEmails, setEmployeeEmails] = useState<Record<string, string>>({});
    const [addingEmployee, setAddingEmployee] = useState<string | null>(null);
    const [newManualName, setNewManualName] = useState('');
    const [newManualEmail, setNewManualEmail] = useState('');
    const [addingManual, setAddingManual] = useState(false);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');

    const sendResetPassword = async (email: string) => {
        if (!confirm(`Wysłać email z resetem hasła do ${email}?`)) return;
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

    const fetchEmployees = async () => {
        setEmployeesLoading(true);
        try {
            const res = await fetch('/api/admin/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployeesList(data.employees || []);
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

    const addEmployee = async (empId: string, empName: string) => {
        const email = employeeEmails[empId]?.trim();
        if (!email) { alert('Podaj adres email pracownika'); return; }
        if (!email.includes('@')) { alert('Podaj poprawny adres email'); return; }
        setAddingEmployee(empId);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientEmail: email, roles: ['employee'], sendPasswordReset: true, employeeName: empName }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                setEmployeeEmails(prev => ({ ...prev, [empId]: '' }));
                fetchEmployees();
            } else {
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch (err) {
            console.error('Add employee error:', err);
            alert('Błąd połączenia z serwerem');
        } finally {
            setAddingEmployee(null);
        }
    };

    const addManualEmployee = async () => {
        const name = newManualName.trim();
        const email = newManualEmail.trim();
        if (!name) { alert('Podaj imię i nazwisko'); return; }
        if (!email || !email.includes('@')) { alert('Podaj poprawny adres email'); return; }
        if (!confirm(`Utworzyć konto pracownika?\n\n${name}\n${email}`)) return;
        setAddingManual(true);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientEmail: email, roles: ['employee'], sendPasswordReset: true, employeeName: name }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                setNewManualName('');
                setNewManualEmail('');
                fetchEmployees();
            } else {
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        } finally {
            setAddingManual(false);
        }
    };

    const deactivateEmployee = async (empId: string, name: string) => {
        if (!confirm(`Dezaktywować pracownika „${name}"?\n\nPracownik zniknie z:\n• Listy pracowników\n• Przypisywania do zadań\n• Powiadomień push\n\nDane w Prodentis NIE zostaną zmienione.`)) return;
        try {
            const res = await fetch('/api/admin/employees/deactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId }),
            });
            if (res.ok) {
                alert('✅ Pracownik dezaktywowany');
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`❌ ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    const reactivateEmployee = async (empId: string, name: string) => {
        if (!confirm(`Reaktywować pracownika „${name}"?`)) return;
        try {
            const res = await fetch('/api/admin/employees/deactivate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId }),
            });
            if (res.ok) {
                alert('✅ Pracownik reaktywowany');
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`❌ ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    const startEditEmployee = (emp: any) => {
        setEditingEmployeeId(emp.id);
        setEditName(emp.name || '');
        setEditEmail(emp.email || '');
    };

    const saveEditEmployee = async (empId: string) => {
        try {
            const res = await fetch('/api/admin/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId, name: editName.trim(), email: editEmail.trim() }),
            });
            if (res.ok) {
                alert('✅ Zapisano');
                setEditingEmployeeId(null);
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`❌ ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    if (employeesLoading && employeesList.length === 0) {
        return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Ładowanie pracowników...</div>;
    }

    const activeEmployees = employeesList.filter((e: any) => e.is_active);
    const inactiveEmployees = employeesList.filter((e: any) => !e.is_active);
    const displayList = showInactive ? employeesList : activeEmployees;

    return (
        <div>
            {/* Prodentis connection status */}
            {!prodentisAvailable && (
                <div style={{
                    padding: '0.75rem 1rem', marginBottom: '1.5rem',
                    background: '#eab30815', border: '1px solid #eab30840',
                    borderRadius: '8px', fontSize: '0.85rem', color: '#eab308'
                }}>
                    ⚠️ Brak połączenia z Prodentis — nowi operatorzy nie zostaną automatycznie wykryci.
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                        Pracownicy ({activeEmployees.length})
                        {inactiveEmployees.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                                + {inactiveEmployees.length} nieaktywnych
                            </span>
                        )}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Jedna lista — operatorzy Prodentis i dodani ręcznie
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={() => setShowInactive(!showInactive)} style={{
                        padding: '0.4rem 0.8rem', background: showInactive ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: showInactive ? '#ef4444' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem',
                    }}>
                        {showInactive ? '👁 Ukryj nieaktywnych' : `👁 Nieaktywni (${inactiveEmployees.length})`}
                    </button>
                    <button onClick={fetchEmployees} style={{
                        padding: '0.4rem 1rem', background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '0.85rem'
                    }}>Odśwież</button>
                </div>
            </div>

            {/* Employee List */}
            {displayList.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '2rem',
                    background: 'var(--color-surface)', borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                }}>
                    Brak pracowników. Dodaj ręcznie poniżej lub poczekaj na synchronizację z Prodentis.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {displayList.map((emp: any) => {
                        const isExpanded = expandedStaffId === emp.id;
                        const isInactive = !emp.is_active;
                        return (
                            <div key={emp.id} style={{
                                background: 'var(--color-surface)',
                                borderRadius: '10px',
                                border: `1px solid ${isExpanded ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                overflow: 'hidden',
                                transition: 'border-color 0.2s',
                                opacity: isInactive ? 0.5 : 1,
                            }}>
                                {/* Header row */}
                                <div
                                    onClick={() => setExpandedStaffId(isExpanded ? null : emp.id)}
                                    style={{
                                        padding: '0.85rem 1.25rem', display: 'flex',
                                        justifyContent: 'space-between', alignItems: 'center',
                                        cursor: 'pointer', userSelect: 'none', transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{
                                            fontSize: '0.9rem', transition: 'transform 0.2s',
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block',
                                        }}>▶</span>
                                        <span style={{ fontWeight: '600', fontSize: '0.95rem', color: isInactive ? 'var(--color-text-muted)' : 'var(--color-text-main)' }}>
                                            {emp.name}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {emp.prodentis_id && (
                                            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600', background: '#3b82f622', color: '#60a5fa' }}>Prodentis</span>
                                        )}
                                        {emp.has_account && (
                                            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600', background: '#22c55e22', color: '#22c55e' }}>Konto</span>
                                        )}
                                        {isInactive && (
                                            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600', background: '#ef444422', color: '#ef4444' }}>Nieaktywny</span>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div onClick={(e) => e.stopPropagation()} style={{
                                        padding: '0 1.25rem 1rem 2.5rem',
                                        borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem',
                                    }}>
                                        {editingEmployeeId === emp.id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>Imię i nazwisko</label>
                                                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                                                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '2px solid var(--color-primary)', background: 'var(--color-background)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: '180px' }}>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>Email</label>
                                                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email"
                                                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '2px solid var(--color-primary)', background: 'var(--color-background)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button onClick={() => saveEditEmployee(emp.id)} style={{ padding: '0.3rem 0.8rem', background: 'var(--color-primary)', border: 'none', borderRadius: '5px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>💾 Zapisz</button>
                                                    <button onClick={() => setEditingEmployeeId(null)} style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '5px', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Anuluj</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', alignItems: 'center' }}>
                                                {emp.email && <span>📧 {emp.email}</span>}
                                                {emp.prodentis_id && <span>🔗 Prodentis ID: {emp.prodentis_id}</span>}
                                                {emp.position && <span>👤 {emp.position}</span>}
                                                <button onClick={() => startEditEmployee(emp)} style={{ padding: '0.15rem 0.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}>✏️ Edytuj</button>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {emp.has_account && emp.email && (
                                                <button onClick={() => sendResetPassword(emp.email)} style={{
                                                    padding: '0.35rem 0.8rem', background: 'transparent',
                                                    color: 'var(--color-text-muted)', border: '1px solid var(--color-border)',
                                                    borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem',
                                                }}>🔑 Reset hasła</button>
                                            )}
                                            {!emp.has_account && (
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                                                    <input
                                                        type="email" placeholder="Adres email pracownika..."
                                                        value={employeeEmails[emp.id] || ''}
                                                        onChange={(e) => setEmployeeEmails(prev => ({ ...prev, [emp.id]: e.target.value }))}
                                                        style={{
                                                            flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem',
                                                            borderRadius: '6px', border: '2px solid var(--color-border)',
                                                            background: 'var(--color-background)', color: 'var(--color-text-main)',
                                                            fontSize: '0.9rem', fontFamily: 'inherit',
                                                        }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') addEmployee(emp.id, emp.name); }}
                                                    />
                                                    <button
                                                        onClick={() => addEmployee(emp.id, emp.name)}
                                                        disabled={addingEmployee === emp.id || !employeeEmails[emp.id]?.trim()}
                                                        style={{
                                                            padding: '0.5rem 1.25rem',
                                                            background: (!employeeEmails[emp.id]?.trim() || addingEmployee === emp.id) ? '#444' : 'var(--color-primary)',
                                                            border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold',
                                                            cursor: (!employeeEmails[emp.id]?.trim() || addingEmployee === emp.id) ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.85rem', whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {addingEmployee === emp.id ? '⏳ Tworzę...' : '➕ Dodaj konto'}
                                                    </button>
                                                </div>
                                            )}
                                            {emp.is_active ? (
                                                <button onClick={() => deactivateEmployee(emp.id, emp.name)} style={{
                                                    padding: '0.3rem 0.7rem', background: 'transparent',
                                                    color: 'var(--color-error, #ef4444)', border: '1px solid var(--color-error, #ef4444)',
                                                    borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem',
                                                }}>✖ Dezaktywuj</button>
                                            ) : (
                                                <button onClick={() => reactivateEmployee(emp.id, emp.name)} style={{
                                                    padding: '0.3rem 0.7rem', background: 'transparent',
                                                    color: '#22c55e', border: '1px solid #22c55e',
                                                    borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem',
                                                }}>✔ Reaktywuj</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Manual add */}
            <div style={{
                marginTop: '2rem', background: 'var(--color-surface)',
                borderRadius: '12px', padding: '1.25rem', border: '1px dashed var(--color-border)',
            }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                    ➕ Dodaj ręcznie
                </h3>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Dla pracowników spoza Prodentis (np. administracja, marketing)
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Imię i nazwisko
                        </label>
                        <input type="text" placeholder="np. Anna Kowalska" value={newManualName}
                            onChange={(e) => setNewManualName(e.target.value)}
                            style={{
                                width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.75rem',
                                borderRadius: '6px', border: '2px solid var(--color-border)',
                                background: 'var(--color-background)', color: 'var(--color-text-main)',
                                fontSize: '0.9rem', fontFamily: 'inherit',
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Adres email
                        </label>
                        <input type="email" placeholder="pracownik@email.pl" value={newManualEmail}
                            onChange={(e) => setNewManualEmail(e.target.value)}
                            style={{
                                width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.75rem',
                                borderRadius: '6px', border: '2px solid var(--color-border)',
                                background: 'var(--color-background)', color: 'var(--color-text-main)',
                                fontSize: '0.9rem', fontFamily: 'inherit',
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
                            border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold',
                            cursor: (addingManual || !newManualName.trim() || !newManualEmail.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', whiteSpace: 'nowrap',
                        }}
                    >
                        {addingManual ? '⏳...' : '➕ Dodaj'}
                    </button>
                </div>
            </div>
        </div>
    );
}
