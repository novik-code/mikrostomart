import PainMapInteractive from './PainMapInteractive';

export const metadata = {
    title: 'Mapa Bólu Zębów | Mikrostomart',
    description: 'Interaktywna mapa bólu zębów — wskaż ząb, który boli, a podpowiemy co może być przyczyną.',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen pt-24 pb-16 bg-black text-white flex flex-col items-center">
            <div className="container px-4 w-full flex flex-col items-center">

                <h1 className="text-3xl sm:text-4xl font-heading mb-2 text-[#dcb14a] text-center">
                    Mapa Bólu
                </h1>
                <p className="text-gray-400 mb-6 max-w-md text-center text-sm leading-relaxed">
                    Dotknij ząb lub obszar, który Cię boli — podpowiemy, co może być przyczyną
                    i kiedy warto umówić wizytę.
                </p>

                {/* Map Container */}
                <div className="w-full max-w-[550px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5">
                    <PainMapInteractive />
                </div>

                <p className="text-gray-600 text-xs mt-4 text-center max-w-sm">
                    Narzędzie ma charakter informacyjny i nie zastępuje wizyty u specjalisty.
                </p>
            </div>
        </main>
    );
}
