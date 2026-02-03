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
        <div className="w-full bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-[#dcb14a]/20">
                <button
                    onClick={handlePrevWeek}
                    disabled={isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    className="p-2 sm:p-3 bg-[#dcb14a]/10 border border-[#dcb14a]/30 rounded-lg hover:bg-[#dcb14a]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft className="w-5 h-5 text-[#dcb14a]" />
                </button>

                <div className="text-center flex-1 mx-2 sm:mx-4">
                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1 sm:mb-2">
                        Wyświetlany Tydzień
                    </div>
                    <div className="text-sm sm:text-lg font-semibold text-white flex items-center justify-center gap-1 sm:gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#dcb14a] hidden sm:inline" />
                        <span className="whitespace-nowrap">
                            {format(currentWeekStart, 'd MMM', { locale: pl })} - {format(addDays(currentWeekStart, 4), 'd MMM', { locale: pl })}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleNextWeek}
                    className="p-2 sm:p-3 bg-[#dcb14a]/10 border border-[#dcb14a]/30 rounded-lg hover:bg-[#dcb14a]/20 transition-all"
                >
                    <ChevronRight className="w-5 h-5 text-[#dcb14a]" />
                </button>
            </div>

            {loading ? (
                <div className="py-12 sm:py-16 flex flex-col items-center justify-center gap-3 sm:gap-4">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#dcb14a] animate-spin" />
                    <p className="text-xs sm:text-sm text-gray-400">Ładowanie dostępnych terminów...</p>
                </div>
            ) : error ? (
                <div className="py-6 sm:py-8 px-4 text-center text-red-400 text-sm bg-red-500/10 rounded-lg border border-red-500/20">
                    {error}
                </div>
            ) : (
                <>
                    {/* Days Grid */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
                        {weekDays.map(day => {
                            const daySlots = slots.filter(s => isSameDay(parseISO(s.start), day));
                            const hasSlots = daySlots.length > 0;
                            const isSelected = selectedDateView && isSameDay(selectedDateView, day);

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={(e) => { e.preventDefault(); if (hasSlots) setSelectedDateView(day); }}
                                    disabled={!hasSlots}
                                    className={`
                                        flex flex-col items-center justify-center py-3 sm:py-4 md:py-5 px-1 sm:px-2 
                                        rounded-lg sm:rounded-xl border transition-all duration-300 relative
                                        ${isSelected
                                            ? 'bg-[#dcb14a] border-[#dcb14a] scale-105 shadow-lg shadow-[#dcb14a]/20'
                                            : hasSlots
                                                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#dcb14a]/50 hover:-translate-y-1'
                                                : 'bg-black/20 border-transparent opacity-40 cursor-not-allowed grayscale'
                                        }
                                    `}
                                >
                                    <div className={`text-[9px] sm:text-[10px] md:text-xs font-semibold uppercase tracking-wide mb-1 ${isSelected ? 'text-black' : 'text-gray-400'}`}>
                                        {format(day, 'EEE', { locale: pl })}
                                    </div>
                                    <div className={`text-xl sm:text-2xl md:text-3xl font-bold leading-none ${isSelected ? 'text-black' : 'text-white'}`}>
                                        {format(day, 'd')}
                                    </div>

                                    {hasSlots && !isSelected && (
                                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Day's Hours */}
                    {selectedDateView && (
                        <div className="bg-black/30 p-4 sm:p-5 md:p-6 rounded-xl border border-[#dcb14a]/20 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h4 className="text-xs sm:text-sm md:text-base text-gray-400 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-white/5 font-medium">
                                Dostępne godziny: <span className="text-[#dcb14a] font-semibold">
                                    {format(selectedDateView, 'EEEE, d MMMM', { locale: pl })}
                                </span>
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
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
                                                    py-3 sm:py-4 px-2 sm:px-3 rounded-lg border transition-all duration-200
                                                    flex items-center justify-center font-bold
                                                    ${isSelected
                                                        ? 'bg-white text-black border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                                                        : 'bg-[#dcb14a]/10 text-[#dcb14a] border-[#dcb14a]/30 hover:border-[#dcb14a] hover:bg-[#dcb14a]/20'}
                                                    text-base sm:text-lg
                                                `}
                                            >
                                                {timeLabel}
                                            </button>
                                        );
                                    })}
                                {slots.filter(s => isSameDay(parseISO(s.start), selectedDateView)).length === 0 && (
                                    <div className="col-span-full py-8 sm:py-12 text-center text-gray-400 italic text-sm sm:text-base">
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
