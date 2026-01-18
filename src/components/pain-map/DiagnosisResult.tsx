"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ArrowRight, Loader2, Phone } from 'lucide-react';

type PainType = 'pulsating' | 'sweet' | 'temperature' | 'biting' | 'other';

interface DiagnosisResultProps {
    painType: PainType;
    zoneLabel: string;
}

const RESULTS: Record<PainType, { title: string; subtitle: string; advice: string[]; flags: string[] }> = {
    pulsating: {
        title: "Zapalenie Miazgi / Ropień",
        subtitle: "Ból pulsujący często wskazuje na zaawansowany stan zapalny.",
        advice: [
            "Unikaj ciepłych posiłków (nasilają ból).",
            "Stosuj chłodne okłady na policzek.",
            "Możesz przyjąć lek przeciwzapalny (np. Ibuprofen).",
            "Konieczna wizyta - problem nie zniknie sam."
        ],
        flags: ["Opuchlizna twarzy", "Gorączka", "Trudności z otwieraniem ust"]
    },
    sweet: {
        title: "Aktywna Próchnica",
        subtitle: "Reakcja na cukier sugeruje ubytek odsłaniający głębsze warstwy zęba.",
        advice: [
            "Ogranicz cukry i kwasy.",
            "Używaj nici dentystycznej w tym obszarze.",
            "Szczotkuj pastą z wysoką zawartością fluoru.",
            "Umów wypełnienie, zanim bakterie dotrą do nerwu."
        ],
        flags: ["Ból utrzymujący się długo po posiłku"]
    },
    temperature: {
        title: "Nadwrażliwość lub Głęboki Ubytek",
        subtitle: "Reakcja termiczna może oznaczać odsłonięte szyjki lub chorobę miazgi.",
        advice: [
            "Stosuj pastę typu 'Sensitive'.",
            "Unikaj skrajnych temperatur w diecie.",
            "Jeśli ból mija szybko (<10s) - to nadwrażliwość.",
            "Jeśli ból trwa długo - możliwe zapalenie miazgi."
        ],
        flags: ["Ból wybudzający w nocy", "Ból pulsujący po bodźcu"]
    },
    biting: {
        title: "Pęknięcie Zęba lub Uraz",
        subtitle: "Ból przy nagryzaniu często wiąże się z mechanicznym uszkodzeniem.",
        advice: [
            "Oszczędzaj tę stronę podczas jedzenia.",
            "Przejdź na miękką dietę (papki/zupy).",
            "Unikaj twardych ziaren i orzechów.",
            "Wymagana precyzyjna diagnostyka pod mikroskopem."
        ],
        flags: ["Ropień (krosta) na dziąśle", "Ruchomość zęba"]
    },
    other: {
        title: "Problem Dziąsłowy / Niespecyficzny",
        subtitle: "Może to być stan zapalny dziąsła, kieszonka lub utknięte jedzenie.",
        advice: [
            "Dokładnie (ale delikatnie) wynitkuj obszar.",
            "Płucz jamę ustną naparem z szałwii lub płynem z chlorheksydyną.",
            "Masuj dziąsło miękką szczoteczką.",
            "Skonsultuj się, jeśli objawy nie miną w 2 dni."
        ],
        flags: ["Silne, samoistne krwawienie", "Nieprzyjemny zapach"]
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

    return (
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">

            {/* LEFT: DIAGNOSIS CARD */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative"
            >
                {/* Gold Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#dcb14a] to-transparent" />

                <div className="p-8">
                    <div className="text-xs font-bold tracking-widest text-[#dcb14a] uppercase mb-2">
                        Analiza Wstępna: {zoneLabel}
                    </div>
                    <h2 className="text-3xl font-heading text-white mb-2">{data.title}</h2>
                    <p className="text-gray-400 italic mb-8 border-l-2 border-[#dcb14a]/30 pl-4">
                        "{data.subtitle}"
                    </p>

                    <div className="space-y-6">
                        <div>
                            <h4 className="flex items-center gap-2 text-white font-bold mb-4">
                                <CheckCircle2 size={18} className="text-green-500" />
                                Zalecenia Doraźne:
                            </h4>
                            <ul className="space-y-3">
                                {data.advice.map((item, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 mt-1.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {data.flags.length > 0 && (
                            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                <h4 className="flex items-center gap-2 text-red-400 font-bold mb-3 text-sm uppercase tracking-wide">
                                    <AlertTriangle size={16} />
                                    Czerwone Flagi (Alarmowe):
                                </h4>
                                <ul className="space-y-2">
                                    {data.flags.map((item, i) => (
                                        <li key={i} className="text-sm text-red-300/80 pl-6 relative">
                                            <span className="absolute left-0 top-0 text-red-500">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* RIGHT: ACTION / FORM */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col h-full"
            >
                {formStatus === 'success' ? (
                    <div className="flex-1 bg-gradient-to-br from-[#dcb14a]/20 to-black border border-[#dcb14a]/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-[#dcb14a] rounded-full flex items-center justify-center text-black mb-6 shadow-[0_0_30px_rgba(220,177,74,0.4)]">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-white mb-2">Dziękujemy!</h3>
                        <p className="text-gray-300 mb-8 max-w-sm">
                            Otrzymaliśmy Twoje zgłoszenie. Nasz opiekun pacjenta zapozna się z nim i oddzwoni z propozycją terminu.
                        </p>
                        <div className="bg-white/5 rounded-xl p-4 w-full">
                            <p className="text-xs text-[#dcb14a] uppercase tracking-wide mb-1">Infolinia Alarmowa</p>
                            <a href="tel:570270470" className="text-2xl font-bold text-white hover:text-[#dcb14a] transition-colors flex items-center justify-center gap-2">
                                <Phone size={20} /> 570 270 470
                            </a>
                        </div>
                        <a href="/" className="mt-8 text-sm text-gray-500 hover:text-white transition-colors">
                            Wróć do strony głównej
                        </a>
                    </div>
                ) : (
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col backdrop-blur-sm">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-2">Odbierz Plan Leczenia</h3>
                            <p className="text-sm text-gray-400">
                                Zostaw numer telefonu. Oddzwonimy, przeanalizujemy Twoje objawy i zaplanujemy wizytę u odpowiedniego specjalisty (Endodonta/Chirurg/Zachowawcza).
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 mt-auto">
                            <div className="space-y-2">
                                <label className="text-xs text-[#dcb14a] font-bold uppercase ml-1">Twój Numer Telefonu</label>
                                <input
                                    type="tel"
                                    placeholder="np. 500 123 456"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-[#dcb14a] focus:bg-black/80 outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 font-bold uppercase ml-1">Imię (Opcjonalnie)</label>
                                <input
                                    type="text"
                                    placeholder="Jak się do Ciebie zwracać?"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-[#dcb14a] focus:bg-black/80 outline-none transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={formStatus === 'submitting'}
                                className="w-full bg-[#dcb14a] hover:bg-[#c5a035] text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 mt-4"
                            >
                                {formStatus === 'submitting' ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" /> Wysyłanie...
                                    </>
                                ) : (
                                    <>
                                        Wyślij Zgłoszenie <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] text-center text-gray-600 mt-4 leading-normal">
                                Twoje dane są chronione. Formularz służy wyłącznie do kontaktu w sprawie leczenia. <br />
                                Administrator: Mikrostomart Opole.
                            </p>
                        </form>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
