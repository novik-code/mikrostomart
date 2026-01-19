import Image from 'next/image';

export const metadata = {
    title: 'Mapa Bólu Zębów | Mikrostomart',
    description: 'Narzędzie diagnostyczne - wersja testowa',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 bg-black text-white">
            <div className="container px-4 text-center">
                <h1 className="text-4xl font-heading mb-4 text-[#dcb14a]">Mapa Bólu (BETA)</h1>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                    To jest strona testowa, aby zweryfikować poprawne wyświetlanie.
                </p>

                <div className="relative w-full max-w-[500px] mx-auto aspect-square border border-white/20 rounded-xl overflow-hidden bg-white/5">
                    <Image
                        src="/intraoral_anatomy_natural.png"
                        alt="Test Image"
                        fill
                        className="object-contain p-4"
                    />
                </div>

                <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500 rounded-lg inline-block">
                    <p className="text-blue-300 font-mono text-sm">Deployment Check: v3.0.0-INIT</p>
                </div>
            </div>
        </main>
    );
}
