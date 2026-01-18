import PainMapContainer from "@/components/pain-map/PainMapContainer";

export const metadata = {
    title: 'Interaktywna Mapa Bólu Zębów | Mikrostomart',
    description: 'Sprawdź co oznacza Twój ból zęba. Skorzystaj z darmowego narzędzia diagnostycznego.',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 bg-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#dcb14a] opacity-[0.03] blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500 opacity-[0.03] blur-[120px] rounded-full" />
            </div>

            <div className="container relative z-10 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
                        <span className="text-[#dcb14a]">Mapa Bólu</span> - Co Ci dolega?
                    </h1>
                    <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] text-gray-500 mb-4">
                        v.2026.01.18-DEBUG-FIX
                    </div>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Odczuwasz dyskomfort? Skorzystaj z naszego inteligentnego asystenta, aby wstępnie zdiagnozować problem i otrzymać zalecenia, zanim dotrzesz do gabinetu.
                    </p>
                </div>

                <PainMapContainer />
            </div>
        </main>
    );
}
