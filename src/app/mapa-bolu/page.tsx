import PainMapInteractive from './PainMapInteractive';

export const metadata = {
    title: 'Mapa Bólu Zębów | Mikrostomart',
    description: 'Interaktywna mapa bólu zębów — wskaż ząb, który boli, a podpowiemy co może być przyczyną.',
};

export default function PainMapPage() {
    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center">
            {/* Full-bleed map with no padding — immersive experience */}
            <PainMapInteractive />
        </main>
    );
}
