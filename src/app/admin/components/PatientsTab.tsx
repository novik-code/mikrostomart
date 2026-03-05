"use client";
import { useState } from "react";

export default function PatientsTab({ initialPatients }: { initialPatients: any[] }) {
    const [patients, setPatients] = useState<any[]>(initialPatients);

    const fetchPatients = async () => {
        try { const res = await fetch('/api/admin/patients'); if (res.ok) { const data = await res.json(); setPatients(data.patients || []); } } catch (err) { console.error('Failed to fetch patients:', err); }
    };

    const handleDeletePatient = async (id: string) => {
        if (confirm('Czy na pewno chcesz usunąć konto tego pacjenta?')) {
            try {
                const res = await fetch(`/api/admin/patients?id=${id}`, { method: 'DELETE' });
                if (res.ok) { alert('Konto pacjenta zostało usunięte.'); fetchPatients(); } else { const d = await res.json(); alert(d.error || 'Błąd usuwania'); }
            } catch (err) { alert('Błąd połączenia'); }
        }
    };

    const handleApprovePatient = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/patients/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: id }) });
            if (res.ok) { alert('Pacjent zatwierdzony!'); fetchPatients(); } else { const d = await res.json(); alert(d.error || 'Błąd zatwierdzania'); }
        } catch (err) { alert('Błąd połączenia'); }
    };

    const handleRejectPatient = async (id: string) => {
        if (!confirm('Czy na pewno chcesz odrzucić tego pacjenta? Jego konto zostanie dezaktywowane.')) return;
        try {
            const res = await fetch(`/api/admin/patients/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: id }) });
            if (res.ok) { alert('Pacjent odrzucony.'); fetchPatients(); } else { const d = await res.json(); alert(d.error || 'Błąd odrzucania'); }
        } catch (err) { alert('Błąd połączenia'); }
    };

const renderPatientsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2>Pacjenci Strefy Pacjenta</h2>
        {patients.length === 0 ? <p>Brak zarejestrowanych pacjentów.</p> : (
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Imię i Nazwisko</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Email</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Telefon</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Data rejestracji</th>
                            <th style={{ padding: "1rem", textAlign: "left" }}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.map((patient) => {
                            // Status badge helper
                            const getStatusBadge = (status: string | null) => {
                                let bgColor, textColor, label;
                                if (status === 'pending_admin_approval') {
                                    bgColor = 'rgba(220, 177, 74, 0.2)';
                                    textColor = '#dcb14a';
                                    label = '⏳ Oczekuje';
                                } else if (status === 'active') {
                                    bgColor = 'rgba(34, 197, 94, 0.2)';
                                    textColor = '#22c55e';
                                    label = '✓ Aktywny';
                                } else if (status === 'rejected') {
                                    bgColor = 'rgba(239, 68, 68, 0.2)';
                                    textColor = '#ef4444';
                                    label = '✗ Odrzucony';
                                } else if (status === 'pending_email_verification') {
                                    bgColor = 'rgba(156, 163, 175, 0.2)';
                                    textColor = '#9ca3af';
                                    label = '📧 Weryfikacja email';
                                } else {
                                    bgColor = 'rgba(156, 163, 175, 0.2)';
                                    textColor = '#9ca3af';
                                    label = 'Nieznany';
                                }
                                return (
                                    <span style={{
                                        background: bgColor,
                                        color: textColor,
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '99px',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        border: `1px solid ${textColor}40`
                                    }}>
                                        {label}
                                    </span>
                                );
                            };

                            return (
                                <tr key={patient.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                    <td style={{ padding: "1rem" }}>
                                        <strong>{patient.firstName} {patient.lastName}</strong>
                                    </td>
                                    <td style={{ padding: "1rem" }}>{patient.email}</td>
                                    <td style={{ padding: "1rem" }}>{patient.phone}</td>
                                    <td style={{ padding: "1rem" }}>{getStatusBadge(patient.accountStatus)}</td>
                                    <td style={{ padding: "1rem" }}>
                                        {new Date(patient.createdAt).toLocaleDateString('pl-PL')}
                                    </td>
                                    <td style={{ padding: "1rem", display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {patient.accountStatus === 'pending_admin_approval' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprovePatient(patient.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        fontWeight: "bold"
                                                    }}
                                                >
                                                    ✓ Zatwierdź
                                                </button>
                                                <button
                                                    onClick={() => handleRejectPatient(patient.id)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        fontWeight: "bold"
                                                    }}
                                                >
                                                    ✗ Odrzuć
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDeletePatient(patient.id)}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "var(--color-danger)",
                                                border: "none",
                                                borderRadius: "4px",
                                                color: "white",
                                                cursor: "pointer"
                                            }}
                                        >
                                            🗑️ Usuń
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);
    return renderPatientsTab();
}
