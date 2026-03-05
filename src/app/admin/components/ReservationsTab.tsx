"use client";
import { useState } from "react";

export default function ReservationsTab({ initialReservations }: { initialReservations: any[] }) {
    const [reservations, setReservations] = useState<any[]>(initialReservations);

    const fetchReservations = async () => {
        try { const res = await fetch("/api/admin/reservations"); if (res.ok) setReservations(await res.json()); } catch (err) { console.error(err); }
    };

    const handleDeleteReservation = async (id: string) => {
        if (!confirm("Czy na pewno usunąć rezerwację?")) return;
        await fetch(`/api/admin/reservations?id=${id}`, { method: "DELETE" });
        fetchReservations();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Umówione Wizyty</h2>
            {reservations.length === 0 ? <p>Brak rezerwacji.</p> : (
                <div style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--color-surface-hover)", textAlign: "left" }}>
                                <th style={{ padding: "1rem" }}>Data/Godzina</th>
                                <th style={{ padding: "1rem" }}>Pacjent</th>
                                <th style={{ padding: "1rem" }}>Zgłoszenie</th>
                                <th style={{ padding: "1rem" }}>Kontakt</th>
                                <th style={{ padding: "1rem" }}>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.map((res: any) => (
                                <tr key={res.id} style={{ borderBottom: "1px solid var(--color-surface-hover)" }}>
                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                        <div>{res.date}</div>
                                        <div style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{res.time}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{new Date(res.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                        <b>{res.name}</b>
                                        <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                            {res.service}<br />
                                            ({res.specialist})
                                        </div>
                                    </td>
                                    <td style={{ padding: "1rem", verticalAlign: 'top', maxWidth: '300px' }}>
                                        {res.description && (
                                            <div style={{ fontStyle: "italic", marginBottom: "0.5rem" }}>
                                                &quot;{res.description}&quot;
                                            </div>
                                        )}
                                        {res.has_attachment && (
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                                background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa",
                                                padding: "0.2rem 0.6rem", borderRadius: "99px", fontSize: "0.8rem",
                                                border: "1px solid rgba(59, 130, 246, 0.3)"
                                            }}>
                                                📎 Zdjęcie (w emailu)
                                            </span>
                                        )}
                                        {!res.description && !res.has_attachment && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>- brak opisu -</span>}
                                    </td>
                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                        <div>{res.phone}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{res.email}</div>
                                    </td>
                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                        <button
                                            onClick={() => handleDeleteReservation(res.id)}
                                            style={{ background: "var(--color-error)", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
                                        >
                                            Usuń
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
