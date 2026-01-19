import PainMapContainerV2 from "@/components/pain-map-v2/PainMapContainerV2";

export const metadata = {
    title: 'Interaktywna Mapa Bólu Zębów | Mikrostomart',
    description: 'Sprawdź co oznacza Twój ból zęba. Skorzystaj z darmowego narzędzia diagnostycznego.',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 bg-blue-900 relative overflow-hidden ring-4 ring-red-500">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#dcb14a] opacity-[0.03] blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500 opacity-[0.03] blur-[120px] rounded-full" />
            </div>

            <div className="container relative z-10 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
                        <span className="text-[#dcb14a]">Mapa Bólu</span> - Diagnostyka
                    </h1>
                    <div className="inline-block px-3 py-1 bg-[#dcb14a]/20 border border-[#dcb14a] rounded-full text-[10px] text-[#dcb14a] mb-4">
                        SYSTEM V2 (NOWY)
                    </div>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Wybierz obszar na mapie, aby rozpocząć diagnozę.
                    </p>
                </div>

                <PainMapContainerV2 />
            </div>
        </main>
    );
}
