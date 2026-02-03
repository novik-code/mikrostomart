"use client";

import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, getMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Slot {
    doctor: string;
    doctorName: string;
    start: string;
    end: string;
}

interface AppointmentSchedulerProps {
    specialistId: string;
    specialistName: string;
    onSlotSelect: (slot: { date: string, time: string, doctor: string } | null) => void;
}

export default function AppointmentScheduler({ specialistId, specialistName, onSlotSelect }: AppointmentSchedulerProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(false);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlotStr, setSelectedSlotStr] = useState<string | null>(null);
    const [selectedDateView, setSelectedDateView] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const duration = specialistId === 'malgorzata' ? '60' : '30';

    const fetchSlotsForWeek = async () => {
        setLoading(true);
        setError(null);
        setSlots([]);

        const weekDates = [];
        for (let i = 0; i < 5; i++) {
            weekDates.push(addDays(currentWeekStart, i));
        }

        try {
            const promises = weekDates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return fetch(`/api/prodentis/slots?date=${dateStr}&duration=${duration}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Failed');
                        return res.json();
                    })
                    .then((data: Slot[]) => {
                        return data.filter(slot => {
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
                            const minutes = getMinutes(slotDate);
                            return minutes === 0 || minutes === 30;
                        });
                    })
                    .catch(() => []);
            });

            const results = await Promise.all(promises);
            const flatSlots = results.flat();
            setSlots(flatSlots);

            const firstDayWithSlots = weekDates.find(day =>
                flatSlots.some(s => isSameDay(parseISO(s.start), day))
            );

            setSelectedDateView(firstDayWithSlots || weekDates[0]);

        } catch (err) {
            setError("Nie udało się pobrać terminów. Spróbuj później lub zadzwoń.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlotsForWeek();
    }, [currentWeekStart, specialistId, duration]);

    const handlePrevWeek = () => {
        const now = new Date();
        const prev = addDays(currentWeekStart, -7);
        if (prev < startOfWeek(now, { weekStartsOn: 1 })) return;
        setCurrentWeekStart(prev);
    };

    const handleNextWeek = () => {
        setCurrentWeekStart(prev => addDays(prev, 7));
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
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(10px)",
            padding: "2rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
        }}>

            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "2rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid rgba(220, 177, 74, 0.2)"
            }}>
                <button
                    onClick={handlePrevWeek}
                    disabled={isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    style={{
                        padding: "0.75rem",
                        background: "rgba(220, 177, 74, 0.1)",
                        border: "1px solid rgba(220, 177, 74, 0.3)",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ? 0.3 : 1
                    }}
                >
                    <ChevronLeft style={{ width: "1.25rem", height: "1.25rem", color: "#dcb14a" }} />
                </button>

                <div style={{ textAlign: "center" }}>
                    <div style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "0.5rem"
                    }}>
                        Wyświetlany Tydzień
                    </div>
                    <div style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                    }}>
                        <Calendar style={{ width: "1rem", height: "1rem", color: "#dcb14a" }} />
                        {format(currentWeekStart, 'd MMMM', { locale: pl })} - {format(addDays(currentWeekStart, 4), 'd MMMM', { locale: pl })}
                    </div>
                </div>

                <button
                    onClick={handleNextWeek}
                    style={{
                        padding: "0.75rem",
                        background: "rgba(220, 177, 74, 0.1)",
                        border: "1px solid rgba(220, 177, 74, 0.3)",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    <ChevronRight style={{ width: "1.25rem", height: "1.25rem", color: "#dcb14a" }} />
                </button>
            </div>

            {loading ? (
                <div style={{
                    padding: "4rem 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem"
                }}>
                    <Loader2 style={{ width: "2rem", height: "2rem", color: "#dcb14a" }} className="animate-spin" />
                    <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Ładowanie dostępnych terminów...</p>
                </div>
            ) : error ? (
                <div style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#ef4444",
                    background: "rgba(239, 68, 68, 0.1)",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(239, 68, 68, 0.3)"
                }}>{error}</div>
            ) : (
                <>
                    {/* Days Grid */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: "1rem",
                        marginBottom: "2rem"
                    }}>
                        {weekDays.map(day => {
                            const daySlots = slots.filter(s => isSameDay(parseISO(s.start), day));
                            const hasSlots = daySlots.length > 0;
                            const isSelected = selectedDateView && isSameDay(selectedDateView, day);

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={(e) => { e.preventDefault(); if (hasSlots) setSelectedDateView(day); }}
                                    disabled={!hasSlots}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "1.5rem 1rem",
                                        borderRadius: "0.75rem",
                                        border: isSelected
                                            ? "2px solid #dcb14a"
                                            : hasSlots
                                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                                : "1px solid transparent",
                                        background: isSelected
                                            ? "#dcb14a"
                                            : hasSlots
                                                ? "rgba(255, 255, 255, 0.05)"
                                                : "rgba(0, 0, 0, 0.2)",
                                        cursor: hasSlots ? "pointer" : "not-allowed",
                                        opacity: hasSlots ? 1 : 0.4,
                                        transition: "all 0.3s",
                                        transform: isSelected ? "scale(1.05)" : "scale(1)"
                                    }}
                                >
                                    <div style={{
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        color: isSelected ? "black" : "#9ca3af",
                                        marginBottom: "0.5rem"
                                    }}>
                                        {format(day, 'EEE', { locale: pl })}
                                    </div>
                                    <div style={{
                                        fontSize: "1.875rem",
                                        fontWeight: "700",
                                        color: isSelected ? "black" : "white",
                                        lineHeight: "1"
                                    }}>
                                        {format(day, 'd')}
                                    </div>
                                    {hasSlots && !isSelected && (
                                        <div style={{
                                            width: "0.5rem",
                                            height: "0.5rem",
                                            borderRadius: "50%",
                                            background: "#10b981",
                                            marginTop: "0.5rem",
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
                            padding: "1.5rem",
                            borderRadius: "0.75rem",
                            border: "1px solid rgba(220, 177, 74, 0.2)"
                        }}>
                            <h4 style={{
                                fontSize: "1rem",
                                color: "#9ca3af",
                                marginBottom: "1.5rem",
                                paddingBottom: "1rem",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                                fontWeight: "500"
                            }}>
                                Dostępne godziny: <span style={{ color: "#dcb14a", fontWeight: "600" }}>
                                    {format(selectedDateView, 'EEEE, d MMMM', { locale: pl })}
                                </span>
                            </h4>

                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                                gap: "1rem"
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
                                                key={fullStr}
                                                onClick={(e) => { e.preventDefault(); handleSlotClick(slot); }}
                                                style={{
                                                    padding: "1rem",
                                                    borderRadius: "0.5rem",
                                                    border: isSelected
                                                        ? "2px solid white"
                                                        : "1px solid rgba(220, 177, 74, 0.3)",
                                                    background: isSelected
                                                        ? "white"
                                                        : "rgba(220, 177, 74, 0.1)",
                                                    color: isSelected ? "black" : "#dcb14a",
                                                    fontSize: "1.125rem",
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
                                        fontStyle: "italic"
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
