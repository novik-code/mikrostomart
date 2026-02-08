import PainMapInteractive from './PainMapInteractive';

export const metadata = {
    title: 'Mapa Bólu Zębów | Mikrostomart',
    description: 'Interaktywna mapa bólu zębów — wskaż ząb, który boli, a podpowiemy co może być przyczyną.',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen pt-24 pb-20 bg-black text-white flex flex-col items-center">
            <div className="container px-4 w-full flex flex-col items-center">

                <h1 className="text-4xl font-heading mb-2 text-[#dcb14a] text-center">Mapa Bólu</h1>
                <p className="text-gray-400 mb-6 max-w-md text-center text-sm">
                    Dotknij ząb lub obszar, który Cię boli — podpowiemy, co może być przyczyną.
                </p>

                {/* Map Container */}
                <div className="w-full max-w-[600px] rounded-2xl overflow-hidden bg-[#080808] shadow-2xl shadow-[#dcb14a]/5 border border-white/5 relative">
                    <div className="w-full relative aspect-[3/4]">
                        <PainMapInteractive />
                    </div>
                </div>

            </div>
        </main>
    );
}
