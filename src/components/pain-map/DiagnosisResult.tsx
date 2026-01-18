"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

type PainType = 'pulsating' | 'sweet' | 'temperature' | 'biting' | 'other';

interface DiagnosisResultProps {
    painType: PainType;
    zoneLabel: string;
}

const RESULTS: Record<PainType, { title: string; advice: string[]; flags: string[] }> = {
    pulsating: {
        title: "Podejrzenie: Zapalenie Miazgi lub Ropień",
        advice: [
            "Unikaj ciepłych posiłków i napojów (mogą nasilać ból).",
            "Możesz zastosować zimny okład na policzek.",
            "W razie silnego bólu, leki NLPZ (Ibuprofen) mogą pomóc doraźnie.",
            "Wymagana pilna wizyta u stomatologa."
        ],
        flags: ["Opuchlizna twarzy", "Gorączka", "Problemy z przełykaniem"]
    },
    sweet: {
        title: "Podejrzenie: Ubytek Próchnicowy",
        advice: [
            "Ogranicz spożywanie cukrów.",
            "Używaj nici dentystycznej, by usunąć resztki jedzenia.",
            "Szczotkuj zęby pastą z fluorem.",
            "Umów się na wizytę, by wypełnić ubytek zanim dotrze do nerwu."
        ],
        flags: ["Ból utrzymujący się długo po zjedzeniu słodkiego"]
    },
    temperature: {
        title: "Podejrzenie: Nadwrażliwość lub Głęboki Ubytek",
        advice: [
            "Stosuj pastę do zębów wrażliwych.",
            "Unikaj skrajnie zimnych i gorących potraw.",
            "Jeśli ból jest krótkotrwały, to może być nadwrażliwość.",
            "Jeśli ból 'pulsuje' po bodźcu - miazga może być uszkodzona."
        ],
        flags: ["Ból wybudzający w nocy", "Ból trwający minuty po bodźcu"]
    },
    biting: {
        title: "Podejrzenie: Pęknięcie Zęba lub Uraz",
        advice: [
            "Staraj się gryźć drugą stroną szczęki.",
            "Przejdź na miękką dietę.",
            "Unikaj twardych pokarmów (orzechy, landrynki).",
            "Wymagana diagnostyka RTG/CBCT."
        ],
        flags: ["Ropień na dziąśle", "Ruchomość zęba"]
    },
    other: {
        title: "Niespecyficzny Ból / Problem Dziąsłowy",
        advice: [
            "Delikatnie szczotkuj okolicę.",
            "Możesz płukać jamę ustną naparem z szałwii lub rumianku.",
            "Obserwuj czy nie pojawia się krwawienie.",
            "Skonsultuj się ze stomatologiem."
        ],
        flags: ["Silne krwawienie", "Nieprzyjemny zapach", "Rozchwianie zęba"]
    }
};

export default function DiagnosisResult({ painType, zoneLabel }: DiagnosisResultProps) {
    const data = RESULTS[painType];
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('submitting');
        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));
        setFormStatus('success');
    };

    if (formStatus === 'success') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8 bg-green-500/10 border border-green-500/30 rounded-2xl">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-white mb-2">Zgłoszenie wysłane!</h3>
                <p className="text-gray-300">Nasz koordynator oddzwoni do Ciebie najszybciej jak to możliwe z planem działania.</p>
                <div className="mt-6 p-4 bg-black/30 rounded-xl">
                    <p className="text-sm text-[#dcb14a]">Numer alarmowy (w godzinach pracy): <br /><span className="text-lg font-bold">570 270 470</span></p>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Result Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-sm text-[#dcb14a] uppercase tracking-wider mb-2 font-bold">{zoneLabel}</div>
                <h2 className="text-2xl font-bold text-white mb-6 font-heading">{data.title}</h2>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-gray-400 text-sm uppercase mb-3 font-bold">Zalecenia na dziś:</h4>
                        <ul className="space-y-2">
                            {data.advice.map((item, i) => (
                                <li key={i} className="flex gap-2 text-gray-200 text-sm">
                                    <span className="text-green-400">✓</span> {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {data.flags.length > 0 && (
                        <div>
                            <h4 className="text-red-400 text-sm uppercase mb-3 font-bold flex items-center gap-2">
                                ⚠️ Czerwone Flagi:
                            </h4>
                            <ul className="space-y-2">
                                {data.flags.map((item, i) => (
                                    <li key={i} className="flex gap-2 text-red-200 text-sm">
                                        <span>!</span> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* CTA Form */}
            <div className="bg-gradient-to-br from-[#dcb14a]/10 to-transparent border border-[#dcb14a]/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Odbierz darmowy plan leczenia</h3>
                <p className="text-center text-gray-400 text-sm mb-6">
                    Na podstawie Twoich odpowiedzi przygotowaliśmy wstępną ścieżkę. <br />
                    Zostaw numer - oddzwonimy i powiemy co robić.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
                    <input
                        type="text"
                        placeholder="Twój numer telefonu"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#dcb14a] outline-none transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="Imię (opcjonalnie)"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#dcb14a] outline-none transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={formStatus === 'submitting'}
                        className="w-full bg-[#dcb14a] hover:bg-[#c5a035] text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {formStatus === 'submitting' ? 'Wysyłanie...' : 'Wyślij Zgłoszenie'}
                    </button>
                    <p className="text-xs text-center text-gray-500">
                        Klikając wyślij akceptujesz politykę prywatności. Twoje dane są bezpieczne (RODO).
                    </p>
                </form>
            </div>
        </div>
    );
}
