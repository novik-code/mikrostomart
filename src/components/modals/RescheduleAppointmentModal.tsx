"use client";

import { useState, useEffect } from 'react';
import { podsumujDzienOperatorow } from '@/lib/statusOperatora';
import { brand } from '@/lib/brandConfig';

/**
 * Jak daleko w przyszłość sięga TO okno. Jedno źródło dla pola daty i dla komunikatu
 * o najbliższym wolnym terminie — rozjazd między nimi rodzi obietnicę bez pokrycia.
 */
const HORYZONT_DNI = 60;

interface RescheduleAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string, newDate?: string, newStartTime?: string) => Promise<any>;
    appointmentDate: string;
    appointmentTime: string;
    authToken: string;
}

interface FreeSlot {
    startTime: string;
    endTime: string;
}

export default function RescheduleAppointmentModal({
    isOpen,
    onClose,
    onConfirm,
    appointmentDate,
    appointmentTime,
    authToken
}: RescheduleAppointmentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
    /**
     * `minBookableDate` z koperty `meta=1` (PMS v11.11): pierwszy dzień, na który gabinet
     * w ogóle przyjmuje rezerwacje online. Dziś to „jutro", ale to DECYZJA GABINETU,
     * nie stała — może się zmienić bez naszego wdrożenia. Zaszyte „jutro" w polu daty
     * rozjechałoby się z nią po cichu.
     */
    const [najwczesniejszy, setNajwczesniejszy] = useState<string | null>(null);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [newDateFormatted, setNewDateFormatted] = useState('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedDate('');
            setSelectedTime('');
            setFreeSlots([]);
            setReason('');
            setError(null);
            setSuccess(false);
            setNewDateFormatted('');
        }
    }, [isOpen]);

    // Fetch free slots when date changes
    useEffect(() => {
        if (!selectedDate || !isOpen) return;

        const fetchSlots = async () => {
            setSlotsLoading(true);
            setSelectedTime('');
            setError(null);
            try {
                // 🔑 3e: `meta=1` dokłada statusy operatorów, żeby pusty dzień przestał znaczyć
                // „nie ma terminów" także wtedy, gdy wszyscy mają komplet albo gabinet nie pracuje.
                const res = await fetch(`/api/prodentis/slots?date=${selectedDate}&duration=30&meta=1`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Prodentis returns Slot[] with { start: ISO, end: ISO, doctor, doctorName }
                    const rawSlots: Array<{ start: string; end: string; doctor: string; doctorName: string }> = Array.isArray(data) ? data : (data.slots || []);
                    // Convert to simple startTime/endTime format, dedup by time
                    const seen = new Set<string>();
                    const parsed: FreeSlot[] = [];
                    for (const s of rawSlots) {
                        const st = new Date(s.start);
                        const et = new Date(s.end);
                        const startTime = `${st.getHours().toString().padStart(2, '0')}:${st.getMinutes().toString().padStart(2, '0')}`;
                        const endTime = `${et.getHours().toString().padStart(2, '0')}:${et.getMinutes().toString().padStart(2, '0')}`;
                        if (!seen.has(startTime)) {
                            seen.add(startTime);
                            parsed.push({ startTime, endTime });
                        }
                    }
                    parsed.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    setFreeSlots(parsed);
                    if (parsed.length === 0) {
                        // 🔴 3e: dotąd stał tu jeden napis na wszystkie przypadki. Teraz mówimy,
                        // czy specjaliści mają komplet, czy gabinet nie pracuje — a przy `unknown`
                        // NIE twierdzimy, że terminów nie ma.
                        // 🪤 GRANICA MUSI TU BYĆ. Bez niej `podsumujDzienOperatorow` pokazywał
                        // datę spoza zasięgu TEGO okna (pole daty ma `max` = dziś+60), a przy
                        // okazji GASIŁ numer telefonu — bo uznawał, że dał pacjentowi wyjście.
                        // Efekt: „najbliższy wolny termin: <data>", której nie da się wybrać,
                        // i żadnej drogi dalej. Ślepy zaułek zamiast pomocy.
                        // Zaciskamy do TWARDSZEJ z dwóch granic: naszego okna i okna PMS.
                        const horyzont = new Date();
                        horyzont.setDate(horyzont.getDate() + HORYZONT_DNI);
                        const naszaGranica = horyzont.toISOString().split('T')[0];
                        const oknoPms = Array.isArray(data) ? undefined : data?.window?.maxDate;
                        const najw = Array.isArray(data) ? undefined : data?.minBookableDate;
                        if (typeof najw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(najw)) setNajwczesniejszy(najw);
                        const granica = oknoPms && oknoPms < naszaGranica ? oknoPms : naszaGranica;

                        const k = podsumujDzienOperatorow(
                            Array.isArray(data) ? [] : (data.doctors || []),
                            granica,
                        );
                        setError(k
                            ? k.tresc + (k.skokDo ? ` Najbliższy wolny termin: ${k.skokDo}.` : '')
                                      + (k.telefon ? ` Telefon: ${brand.phone1} / ${brand.phone2}.` : '')
                            : 'Brak wolnych terminów w wybranym dniu. Spróbuj inny dzień.');
                    }
                } else {
                    setError('Nie udało się pobrać wolnych terminów');
                }
            } catch (e) {
                setError('Błąd połączenia. Spróbuj ponownie.');
            } finally {
                setSlotsLoading(false);
            }
        };

        fetchSlots();
    }, [selectedDate, isOpen, authToken]);

    if (!isOpen) return null;

    // Min date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const jutro = tomorrow.toISOString().split('T')[0];
    // 🔑 Granicę tylko ZACISKAMY. Brak pola (starsza wersja API, rollback) albo wartość
    // luźniejsza od naszej = zostaje dokładnie dzisiejsze zachowanie. Ten sam wzorzec
    // fail-open, co przy `window.maxDate`.
    const minDate = najwczesniejszy && najwczesniejszy > jutro ? najwczesniejszy : jutro;

    // Max date = 60 days from now
    const maxDateObj = new Date();
    maxDateObj.setDate(maxDateObj.getDate() + HORYZONT_DNI);
    const maxDate = maxDateObj.toISOString().split('T')[0];

    const handleConfirm = async () => {
        if (!selectedDate || !selectedTime) {
            setError('Wybierz datę i godzinę nowego terminu');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await onConfirm(reason || undefined, selectedDate, selectedTime);
            const dateObj = new Date(`${selectedDate}T${selectedTime}:00`);
            setNewDateFormatted(dateObj.toLocaleDateString('pl-PL', {
                weekday: 'long', day: 'numeric', month: 'long'
            }) + ` o ${selectedTime}`);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setReason('');
                setSelectedDate('');
                setSelectedTime('');
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił błąd');
            setIsLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1a1a1a', border: '1px solid #333',
                    borderRadius: '12px', maxWidth: '500px', width: '100%',
                    padding: '2rem', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    maxHeight: '90vh', overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {success ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                        <h3 style={{ color: '#4caf50', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                            Wizyta przełożona!
                        </h3>
                        <p style={{ color: '#aaa', marginBottom: '0.5rem' }}>
                            Nowy termin: {newDateFormatted}
                        </p>
                        <p style={{ color: '#777', fontSize: '0.85rem' }}>
                            Potwierdzenie SMS zostało wysłane
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📅</div>
                            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                                Przełóż wizytę
                            </h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                Obecny termin: {appointmentDate} o {appointmentTime}
                            </p>
                        </div>

                        {/* Date Picker */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                Wybierz nową datę
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={minDate}
                                max={maxDate}
                                disabled={isLoading}
                                style={{
                                    width: '100%', padding: '0.75rem',
                                    background: '#0a0a0a', border: '1px solid #333',
                                    borderRadius: '8px', color: '#fff',
                                    fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
                                    colorScheme: 'dark',
                                }}
                            />
                        </div>

                        {/* Time Slots */}
                        {selectedDate && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    Wybierz godzinę {slotsLoading && '⏳'}
                                </label>
                                {slotsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: '#777' }}>
                                        Ładowanie dostępnych terminów...
                                    </div>
                                ) : freeSlots.length > 0 ? (
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '0.5rem', maxHeight: '200px', overflowY: 'auto',
                                        padding: '0.25rem'
                                    }}>
                                        {freeSlots.map((slot) => {
                                            const isSelected = selectedTime === slot.startTime;
                                            return (
                                                <button
                                                    key={slot.startTime}
                                                    onClick={() => setSelectedTime(slot.startTime)}
                                                    disabled={isLoading}
                                                    style={{
                                                        padding: '0.6rem 0.25rem',
                                                        background: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid #333',
                                                        borderRadius: '6px',
                                                        color: isSelected ? '#000' : '#fff',
                                                        fontSize: '0.85rem', fontWeight: isSelected ? '700' : '400',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.15)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                    }}
                                                >
                                                    {slot.startTime}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Reason */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                Powód przełożenia (opcjonalnie)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="np. Konflikt w kalendarzu..."
                                disabled={isLoading}
                                style={{
                                    width: '100%', minHeight: '60px', padding: '0.75rem',
                                    background: '#0a0a0a', border: '1px solid #333',
                                    borderRadius: '8px', color: '#fff', fontSize: '0.9rem',
                                    fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#333'}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: '#3a1e1e', border: '1px solid #5a2e2e',
                                borderRadius: '8px', padding: '0.75rem',
                                marginBottom: '1.25rem', fontSize: '0.85rem', color: '#f44336'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                style={{
                                    flex: 1, padding: '0.875rem',
                                    background: 'transparent', border: '1px solid #333',
                                    borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    opacity: isLoading ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#2a2a2a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading || !selectedDate || !selectedTime}
                                style={{
                                    flex: 1, padding: '0.875rem',
                                    background: (isLoading || !selectedDate || !selectedTime) ? '#555' : 'var(--color-primary)',
                                    border: 'none', borderRadius: '8px',
                                    color: (isLoading || !selectedDate || !selectedTime) ? '#999' : '#000',
                                    fontSize: '1rem', fontWeight: '600',
                                    cursor: (isLoading || !selectedDate || !selectedTime) ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading && selectedDate && selectedTime) e.currentTarget.style.background = '#c9a13d';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading && selectedDate && selectedTime) e.currentTarget.style.background = 'var(--color-primary)';
                                }}
                            >
                                {isLoading ? 'Przenoszę...' : 'Przełóż wizytę'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
