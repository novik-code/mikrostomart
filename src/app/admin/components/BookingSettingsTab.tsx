"use client";
import { useState, useEffect } from "react";

export default function BookingSettingsTab() {
    const [minDaysAhead, setMinDaysAhead] = useState(1);
    const [bookingSettingsSaving, setBookingSettingsSaving] = useState(false);
    const [bookingSettingsMsg, setBookingSettingsMsg] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/booking-settings')
            .then(r => r.json())
            .then(d => setMinDaysAhead(typeof d.min_days_ahead === 'number' ? d.min_days_ahead : 1))
            .catch(() => { });
    }, []);

    return (
        <div style={{ padding: '2rem', maxWidth: 540 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>📅 Ustawienia Rezerwacji Online</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Kontroluj, z jakim wyprzedzeniem pacjenci mogą umawiać wizyty przez formularz online (/rezerwacja).
            </p>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.95rem' }}>
                    Minimalny czas zapisu z wyprzedzeniem
                </label>
                <select
                    value={minDaysAhead}
                    onChange={e => setMinDaysAhead(Number(e.target.value))}
                    style={{
                        width: '100%', padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(var(--color-primary-rgb),0.3)', borderRadius: '0.5rem',
                        color: 'white', fontSize: '1rem', cursor: 'pointer', marginBottom: '0.5rem',
                    }}
                >
                    <option value={0}>Dziś (0 dni) — pokazuj terminy od dnia dzisiejszego</option>
                    <option value={1}>Jutro (1 dzień) — najszybciej od jutra ✅ zalecane</option>
                    <option value={2}>2 dni — najszybciej pojutrze</option>
                    <option value={3}>3 dni</option>
                    <option value={7}>Tydzień (7 dni)</option>
                    <option value={14}>2 tygodnie (14 dni)</option>
                </select>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Aktualnie: sloty wyświetlają się najwcześniej za <strong style={{ color: 'var(--color-primary)' }}>{minDaysAhead} {minDaysAhead === 1 ? 'dzień' : minDaysAhead < 5 ? 'dni' : 'dni'}</strong> od dziś.
                </p>
            </div>

            <button
                onClick={async () => {
                    setBookingSettingsSaving(true);
                    setBookingSettingsMsg(null);
                    try {
                        const res = await fetch('/api/admin/booking-settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ min_days_ahead: minDaysAhead }),
                        });
                        if (!res.ok) throw new Error('Błąd zapisu');
                        setBookingSettingsMsg('✅ Ustawienie zapisane pomyślnie.');
                    } catch {
                        setBookingSettingsMsg('❌ Błąd zapisu. Sprawdź połączenie.');
                    } finally {
                        setBookingSettingsSaving(false);
                        setTimeout(() => setBookingSettingsMsg(null), 4000);
                    }
                }}
                disabled={bookingSettingsSaving}
                style={{
                    padding: '0.8rem 2rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                    border: 'none', borderRadius: '0.5rem', color: 'black', fontWeight: 700,
                    fontSize: '0.95rem', cursor: bookingSettingsSaving ? 'not-allowed' : 'pointer',
                    opacity: bookingSettingsSaving ? 0.7 : 1,
                }}
            >
                {bookingSettingsSaving ? 'Zapisywanie...' : 'Zapisz ustawienie'}
            </button>

            {bookingSettingsMsg && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: bookingSettingsMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${bookingSettingsMsg.startsWith('✅') ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                    {bookingSettingsMsg}
                </div>
            )}

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(var(--color-primary-rgb),0.06)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--color-primary)' }}>ℹ️ Jak to działa?</strong><br />
                Formularz rezerwacji pobiera to ustawienie i ukrywa sloty, które przypadają wcześniej niż <em>dziś + N dni</em>.
                Zmiana obowiązuje natychmiast po zapisaniu — bez potrzeby przeładowania serwera.
            </div>
        </div>
    );
}
