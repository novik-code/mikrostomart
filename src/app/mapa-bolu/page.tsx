import Image from 'next/image';
import PainMapInteractive from './PainMapInteractive';

export const metadata = {
    title: 'Mapa Bólu Zębów | Mikrostomart',
    description: 'Narzędzie diagnostyczne - wersja testowa',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 bg-black text-white flex flex-col items-center">
            <div className="container px-4 w-full flex flex-col items-center">

                <h1 className="text-4xl font-heading mb-4 text-[#dcb14a] text-center">Mapa Bólu (BETA)</h1>
                <p className="text-gray-400 mb-8 max-w-2xl text-center">
                    Wersja responsywna. Obraz dostosowuje się do szerokości ekranu, zachowując proporcje.
                </p>

                {/* 
                   ROBUST CONTAINER:
                   1. Max-width prevents it from being too huge on desktop.
                   2. w-full makes it responsive on mobile.
                   3. NO fixed height. Height is determined by the image itself.
                */}
                <div className="w-full max-w-[800px] border border-white/20 rounded-xl overflow-hidden bg-white/5 shadow-2xl relative grid grid-cols-1 grid-rows-1">

                    {/* INTERACTIVE MAP COMPONENT (Handles its own background now) */}
                    <div className="w-full relative aspect-square md:aspect-[4/3] max-h-[70vh]">
                        <PainMapInteractive />
                    </div>

                </div>

                <div className="mt-8 text-center">
                    <p className="text-[#dcb14a] font-heading text-lg">
                        Wybierz obszar, który Cię boli
                    </p>
                </div>
            </div>
        </main>
    );
}
