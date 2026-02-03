"use client";

import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, getMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Slot {
    doctor: string;
    doctorName: string;
    start: string; // ISO
    end: string;   // ISO
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
    const [selectedDateView, setSelectedDateView] = useState<Date | null>(null); // Which day is "expanded"
    const [error, setError] = useState<string | null>(null);

    const duration = specialistId === 'malgorzata' ? '60' : '30';

    const fetchSlotsForWeek = async () => {
        setLoading(true);
        setError(null);
        setSlots([]);

        const weekDates = [];
        for (let i = 0; i < 5; i++) { // Mon-Fri
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
                        // Filter logic
                        return data.filter(slot => {
                            // 1. Specialist Filter
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

                            // 2. TIME FILTER: Enforce :00 or :30 only
                            // The user specifically requested to block 13:15 etc.
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

            // Auto-select first day with slots if none selected
            const firstDayWithSlots = weekDates.find(day =>
                flatSlots.some(s => isSameDay(parseISO(s.start), day))
            );

            // Always set view to Monday if no slots, or the day with slots
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
        // Allow looking back? Maybe restrict to current week.
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
        <div className="w-full bg-black/20 rounded-xl border border-white/10 p-4">

            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={handlePrevWeek}
                    disabled={isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    className="p-2 hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-[#dcb14a]" />
                </button>

                <div className="text-center">
                    <span className="text-xs text-gray-400 block uppercase tracking-widest mb-1">Wyświetlany Tydzień</span>
                    <span className="text-white font-bold text-lg">
                        {format(currentWeekStart, 'd MMMM', { locale: pl })} - {format(addDays(currentWeekStart, 4), 'd MMMM', { locale: pl })}
                    </span>
                </div>

                <button
                    onClick={handleNextWeek}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-[#dcb14a]" />
                </button>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center">
                    <Loader2 className="w-8 h-8 text-[#dcb14a] animate-spin" />
                </div>
            ) : error ? (
                <div className="py-8 text-center text-red-400 text-sm">{error}</div>
            ) : (
                <>
                    {/* DAYS OF WEEK TABLE */}
                    <div className="grid grid-cols-5 gap-2 mb-6">
                        {weekDays.map(day => {
                            const daySlots = slots.filter(s => isSameDay(parseISO(s.start), day));
                            const hasSlots = daySlots.length > 0;
                            const isSelected = selectedDateView && isSameDay(selectedDateView, day);

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={(e) => { e.preventDefault(); setSelectedDateView(day); }}
                                    className={`
                                        flex flex-col items-center justify-center py-3 rounded-lg border transition-all
                                        ${isSelected
                                            ? 'bg-[#dcb14a] border-[#dcb14a] text-black shadow-lg scale-105'
                                            : hasSlots
                                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-[#dcb14a]/50'
                                                : 'bg-white/5 border-transparent text-gray-600 cursor-not-allowed opacity-50'
                                        }
                                    `}
                                    disabled={!hasSlots}
                                >
                                    <span className="text-[10px] uppercase font-bold tracking-wider mb-1">
                                        {format(day, 'EEE', { locale: pl })}
                                    </span>
                                    <span className="text-xl font-bold leading-none">
                                        {format(day, 'd')}
                                    </span>
                                    {hasSlots && (
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* HOURS GRID for Selected Date */}
                    {selectedDateView && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <h4 className="text-sm text-gray-400 mb-3 border-b border-white/10 pb-2">
                                Dostępne godziny: <span className="text-[#dcb14a]">{format(selectedDateView, 'EEEE, d MMMM', { locale: pl })}</span>
                            </h4>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                                                className={`
                                                    py-2 px-3 rounded text-sm font-bold transition-all border
                                                    ${isSelected
                                                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                                        : 'bg-transparent text-[#dcb14a] border-[#dcb14a]/30 hover:border-[#dcb14a] hover:bg-[#dcb14a]/10'}
                                                `}
                                            >
                                                {timeLabel}
                                            </button>
                                        );
                                    })}
                                {slots.filter(s => isSameDay(parseISO(s.start), selectedDateView)).length === 0 && (
                                    <div className="col-span-full text-center py-4 text-gray-500 text-sm italic">
                                        Brak wolnych terminów w wybranym dniu.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="mt-6 text-[10px] text-gray-500 text-center border-t border-white/5 pt-2">
                Terminy są pobierane w czasie rzeczywistym z systemu Prodentis.
            </div>
        </div>
    );
}
