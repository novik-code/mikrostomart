"use client";

import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, getMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';
import { brand } from '@/lib/brandConfig';
import { ocenTydzien, type WynikDnia } from '@/lib/slotsFetchOutcome';

interface Slot {
    doctor: string;
    doctorName: string;
    start: string;
    end: string;
}

interface AppointmentSchedulerProps {
    specialistId: string;
    specialistName: string;
    /**
     * Czas trwania wizyty u tego specjalisty, w minutach — z `/api/specialists`
     * (kolumna `booking_duration_minutes`). Steruje zapytaniem o wolne okna.
     */
    durationMin?: number;
    onSlotSelect: (slot: { date: string, time: string, doctor: string } | null) => void;
}

export default function AppointmentScheduler({ specialistId, specialistName, durationMin, onSlotSelect }: AppointmentSchedulerProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(false);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlotStr, setSelectedSlotStr] = useState<string | null>(null);
    const [selectedDateView, setSelectedDateView] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [minDaysAhead, setMinDaysAhead] = useState(1); // 1 = tomorrow by default

    // 🔴 FIX 2026-09-04: czas trwania bierzemy z danych zespołu, nie z porównania ze slugiem.
    // Poprzednia wersja brzmiała `specialistId === 'malgorzata' ? '60' : '30'`, a na /rezerwacja
    // `specialistId` to identyfikator Prodentisa (`0100000030`) — warunek NIGDY nie był prawdziwy.
    // Skutek: formularz pokazywał „Czas trwania: 60min", a pytał o okna 30-minutowe, więc
    // wizyty higienizacyjne trafiały w luki o połowę za krótkie. W Strefie Pacjenta, gdzie lista
    // była zaszyta ze slugami, ten sam kod działał — czyli ten sam pacjent widział inne terminy
    // zależnie od tego, czy jest zalogowany.
    const duration = String(durationMin ?? 30);

    // Fetch admin-controlled minimum-days-ahead setting
    useEffect(() => {
        fetch('/api/admin/booking-settings')
            .then(r => r.json())
            .then(d => setMinDaysAhead(typeof d.min_days_ahead === 'number' ? d.min_days_ahead : 1))
            .catch(() => setMinDaysAhead(1)); // safe default on any error
    }, []);

    const fetchSlotsForWeek = async () => {
        setLoading(true);
        setError(null);
        setSlots([]);

        const weekDates = [];
        for (let i = 0; i < 5; i++) {
            weekDates.push(addDays(currentWeekStart, i));
        }

        try {
            // 🔴 FIX 2026-09-03: każdy dzień zwraca WYNIK (udany/padnięty + status), a nie samo
            // `[]`. Wcześniej `.catch(() => [])` zamieniał 429, 502 i zerwaną sieć w pustą listę,
            // a `Promise.all` nad promisami łapiącymi własne wyjątki NIGDY nie odrzuca — więc
            // `catch` niżej był kodem martwym i pacjent na każdą awarię dostawał komunikat
            // „Brak wolnych terminów w wybranym dniu". Reguła rozstrzygająca: `lib/slotsFetchOutcome.ts`.
            const promises: Array<Promise<{ wynik: WynikDnia; sloty: Slot[] }>> = weekDates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return fetch(`/api/prodentis/slots?date=${dateStr}&duration=${duration}`)
                    .then(res => {
                        if (!res.ok) {
                            const e = new Error('Failed') as Error & { status?: number };
                            e.status = res.status;
                            throw e;
                        }
                        return res.json();
                    })
                    .then((data: Slot[]) => {
                        // Compute cutoff: midnight of (today + minDaysAhead)
                        const cutoff = new Date();
                        cutoff.setHours(0, 0, 0, 0);
                        cutoff.setDate(cutoff.getDate() + minDaysAhead);

                        const przefiltrowane = data.filter(slot => {
                            const apiName = slot.doctorName.toLowerCase();
                            const targetName = specialistName.toLowerCase().replace('lek. dent. ', '').replace('hig. stom. ', '');

                            let isDoctorMatch = false;
                            if (specialistId === 'marcin' && slot.doctor === '0100000001') isDoctorMatch = true;
                            else if (specialistId === 'ilona' && slot.doctor === '0100000024') isDoctorMatch = true;
                            else if (specialistId === 'katarzyna' && slot.doctor === '0100000031') isDoctorMatch = true;
                            else if (specialistId === 'malgorzata' && slot.doctor === '0100000030') isDoctorMatch = true;
                            else if (specialistId === 'dominika' && apiName.includes('dominika')) isDoctorMatch = true;
                            else {
                                const parts = targetName.split(' ');
                                isDoctorMatch = parts.every(part => apiName.includes(part));
                            }

                            if (!isDoctorMatch) return false;

                            const slotDate = parseISO(slot.start);

                            // Filter out slots before cutoff (past + today if minDaysAhead >= 1)
                            if (slotDate < cutoff) return false;

                            const minutes = getMinutes(slotDate);
                            return minutes === 0 || minutes === 30;
                        });
                        return { wynik: { ok: true, liczbaSlotow: przefiltrowane.length } as WynikDnia, sloty: przefiltrowane };
                    })
                    .catch((e: Error & { status?: number }) => ({
                        wynik: { ok: false, status: e?.status } as WynikDnia,
                        sloty: [] as Slot[],
                    }));
            });

            const results = await Promise.all(promises);
            const flatSlots = results.flatMap(r => r.sloty);
            setSlots(flatSlots);

            const stan = ocenTydzien(results.map(r => r.wynik), flatSlots.length);
            if (stan.rodzaj === 'blad') {
                setError(stan.powod === 'limit'
                    ? 'Za dużo zapytań w krótkim czasie. Odczekaj minutę i spróbuj ponownie — '
                      + `albo zadzwoń, umówimy termin od ręki: ${brand.phone1} / ${brand.phone2}.`
                    : 'Nie udało się pobrać terminów — to awaria po naszej stronie, nie brak wolnych '
                      + `miejsc. Spróbuj ponownie lub zadzwoń: ${brand.phone1} / ${brand.phone2}.`);
            }

            const firstDayWithSlots = weekDates.find(day =>
                flatSlots.some(s => isSameDay(parseISO(s.start), day))
            );

            setSelectedDateView(firstDayWithSlots || weekDates[0]);

        } catch (err) {
            // Zapasowa siatka bezpieczeństwa: tu trafi wyłącznie awaria POZA pobieraniem dni
            // (np. błąd `format`/`parseISO`). Sama ścieżka sieciowa jest rozstrzygana wyżej.
            setError(`Nie udało się pobrać terminów. Spróbuj później lub zadzwoń: ${brand.phone1} / ${brand.phone2}.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlotsForWeek();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWeekStart, specialistId, duration, minDaysAhead]);

    // 🔴 2026-09-03: te dwie funkcje siedzą wewnątrz <form> formularza rezerwacji, a żaden
    // przycisk w tym pliku nie miał `type`, więc domyślnie był `type="submit"`. Kafelki dni
    // i godzin ratował `e.preventDefault()` w onClick — strzałki tygodnia NIE. Efekt: pacjent
    // z wypełnionym formularzem i wybranym terminem, który klikał „obejrzę następny tydzień",
    // WYSYŁAŁ rezerwację. Naprawa jest podwójna (pas i szelki): `type="button"` na każdym
    // przycisku + `preventDefault` tutaj. Nie zdejmować ani jednego z tych zabezpieczeń.
    const handlePrevWeek = (e?: React.MouseEvent) => {
        e?.preventDefault();
        const now = new Date();
        const prev = addDays(currentWeekStart, -7);
        if (prev < startOfWeek(now, { weekStartsOn: 1 })) return;
        setCurrentWeekStart(prev);
    };

    const handleNextWeek = (e?: React.MouseEvent) => {
        e?.preventDefault();
        // Górna granica: dalej niż rok w przód PMS i tak odrzuci (DATE_OUT_OF_RANGE),
        // a każde kliknięcie kosztuje 5 z limitu 30 zapytań/min.
        setCurrentWeekStart(prev => {
            const next = addDays(prev, 7);
            const maxStart = addDays(new Date(), 358);
            return next > maxStart ? prev : next;
        });
    };

    const handleSlotClick = (slot: Slot) => {
        const timeStr = format(parseISO(slot.start), 'HH:mm');
        const dateStr = format(parseISO(slot.start), 'yyyy-MM-dd');
        const fullStr = `${dateStr} ${timeStr}`;

        if (selectedSlotStr === fullStr) {
            setSelectedSlotStr(null);
            onSlotSelect(null);
        } else {
            setSelectedSlotStr(fullStr);
            onSlotSelect({
                date: dateStr,
                time: timeStr,
                doctor: slot.doctorName
            });
        }
    };

    const weekDays = [];
    for (let i = 0; i < 5; i++) {
        weekDays.push(addDays(currentWeekStart, i));
    }

    return (
        <div style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(10px)",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
        }}>
            <style jsx>{`
                @media (min-width: 640px) {
                    .scheduler-container { padding: 2rem; }
                }
            `}</style>

            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
                paddingBottom: "1rem",
                borderBottom: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                gap: "0.5rem"
            }}>
                <button
                    type="button"
                    onClick={handlePrevWeek}
                    disabled={isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    style={{
                        padding: "0.625rem",
                        background: "rgba(var(--color-primary-rgb), 0.1)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.3)",
                        borderRadius: "0.5rem",
                        cursor: isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        opacity: isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ? 0.3 : 1,
                        flexShrink: 0
                    }}
                >
                    <ChevronLeft style={{ width: "1.25rem", height: "1.25rem", color: "var(--color-primary)" }} />
                </button>

                <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: "0.65rem",
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "0.25rem"
                    }}>
                        Wyświetlany Tydzień
                    </div>
                    <div style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap"
                    }}>
                        <Calendar style={{ width: "0.9rem", height: "0.9rem", color: "var(--color-primary)", flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                            {format(currentWeekStart, 'd MMM', { locale: pl })} - {format(addDays(currentWeekStart, 4), 'd MMM', { locale: pl })}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleNextWeek}
                    style={{
                        padding: "0.625rem",
                        background: "rgba(var(--color-primary-rgb), 0.1)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.3)",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flexShrink: 0
                    }}
                >
                    <ChevronRight style={{ width: "1.25rem", height: "1.25rem", color: "var(--color-primary)" }} />
                </button>
            </div>

            {loading ? (
                <div style={{
                    padding: "3rem 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem"
                }}>
                    <Loader2 style={{ width: "2rem", height: "2rem", color: "var(--color-primary)" }} className="animate-spin" />
                    <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Ładowanie dostępnych terminów...</p>
                </div>
            ) : error ? (
                <div style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#ef4444",
                    background: "rgba(239, 68, 68, 0.1)",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    fontSize: "0.875rem"
                }}>
                    <div>{error}</div>
                    {/* Ślepy zaułek jest gorszy niż awaria: pacjent musi mieć co kliknąć.
                        Ponowienie jest tanie — pobranie tygodnia to pięć zapytań GET. */}
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); fetchSlotsForWeek(); }}
                        style={{
                            marginTop: "0.75rem",
                            padding: "0.5rem 1.25rem",
                            borderRadius: "999px",
                            border: "1px solid #ef4444",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            ) : (
                <>
                    {/* Days Grid */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: "0.5rem",
                        marginBottom: "1.5rem"
                    }}>
                        {weekDays.map(day => {
                            const daySlots = slots.filter(s => isSameDay(parseISO(s.start), day));
                            const hasSlots = daySlots.length > 0;
                            const isSelected = selectedDateView && isSameDay(selectedDateView, day);

                            return (
                                <button
                                    type="button"
                                    key={day.toString()}
                                    onClick={(e) => { e.preventDefault(); if (hasSlots) setSelectedDateView(day); }}
                                    disabled={!hasSlots}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "0.75rem 0.25rem",
                                        borderRadius: "0.75rem",
                                        border: isSelected
                                            ? "2px solid var(--color-primary)"
                                            : hasSlots
                                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                                : "1px solid transparent",
                                        background: isSelected
                                            ? "var(--color-primary)"
                                            : hasSlots
                                                ? "rgba(255, 255, 255, 0.05)"
                                                : "rgba(0, 0, 0, 0.2)",
                                        cursor: hasSlots ? "pointer" : "not-allowed",
                                        opacity: hasSlots ? 1 : 0.4,
                                        transition: "all 0.3s",
                                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                                        position: "relative"
                                    }}
                                >
                                    <div style={{
                                        fontSize: "0.625rem",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        color: isSelected ? "black" : "#9ca3af",
                                        marginBottom: "0.25rem"
                                    }}>
                                        {format(day, 'EEE', { locale: pl })}
                                    </div>
                                    <div style={{
                                        fontSize: "1.5rem",
                                        fontWeight: "700",
                                        color: isSelected ? "black" : "white",
                                        lineHeight: "1"
                                    }}>
                                        {format(day, 'd')}
                                    </div>
                                    {hasSlots && !isSelected && (
                                        <div style={{
                                            position: "absolute",
                                            top: "0.375rem",
                                            right: "0.375rem",
                                            width: "0.375rem",
                                            height: "0.375rem",
                                            borderRadius: "50%",
                                            background: "#10b981",
                                            boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)"
                                        }}></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Day's Hours */}
                    {selectedDateView && (
                        <div style={{
                            background: "rgba(0, 0, 0, 0.3)",
                            padding: "1.25rem",
                            borderRadius: "0.75rem",
                            border: "1px solid rgba(var(--color-primary-rgb), 0.2)"
                        }}>
                            <h4 style={{
                                fontSize: "0.875rem",
                                color: "#9ca3af",
                                marginBottom: "1rem",
                                paddingBottom: "0.75rem",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                                fontWeight: "500"
                            }}>
                                Dostępne godziny: <span style={{ color: "var(--color-primary)", fontWeight: "600" }}>
                                    {format(selectedDateView, 'EEEE, d MMMM', { locale: pl })}
                                </span>
                            </h4>

                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                                gap: "0.75rem"
                            }}>
                                {slots
                                    .filter(s => isSameDay(parseISO(s.start), selectedDateView))
                                    .sort((a, b) => a.start.localeCompare(b.start))
                                    .map(slot => {
                                        const timeLabel = format(parseISO(slot.start), 'HH:mm');
                                        const fullStr = `${format(parseISO(slot.start), 'yyyy-MM-dd')} ${timeLabel}`;
                                        const isSelected = selectedSlotStr === fullStr;

                                        return (
                                            <button
                                                type="button"
                                                key={fullStr}
                                                onClick={(e) => { e.preventDefault(); handleSlotClick(slot); }}
                                                style={{
                                                    padding: "0.875rem",
                                                    borderRadius: "0.5rem",
                                                    border: isSelected
                                                        ? "2px solid white"
                                                        : "1px solid rgba(var(--color-primary-rgb), 0.3)",
                                                    background: isSelected
                                                        ? "white"
                                                        : "rgba(var(--color-primary-rgb), 0.1)",
                                                    color: isSelected ? "black" : "var(--color-primary)",
                                                    fontSize: "1rem",
                                                    fontWeight: "700",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s",
                                                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                                                    boxShadow: isSelected ? "0 0 20px rgba(255, 255, 255, 0.3)" : "none"
                                                }}
                                            >
                                                {timeLabel}
                                            </button>
                                        );
                                    })}
                                {slots.filter(s => isSameDay(parseISO(s.start), selectedDateView)).length === 0 && (
                                    <div style={{
                                        gridColumn: "1 / -1",
                                        padding: "2rem",
                                        textAlign: "center",
                                        color: "#9ca3af",
                                        fontStyle: "italic",
                                        fontSize: "0.875rem"
                                    }}>
                                        Brak wolnych terminów w wybranym dniu.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
