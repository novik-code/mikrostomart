
import RevealOnScroll from "@/components/RevealOnScroll";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Implanty Opole - implanty zębów Opole, implanty cennik Opole",
    description: "Profesjonalne zabiegi implantacji w Opolu. Precyzja, cyfrowe planowanie i bezbolesne leczenie w Mikrostomart. Sprawdź cennik i umów się na wizytę.",
};

export default function ImplantologiaPage() {
    return (
        <main className="section container">
            <RevealOnScroll>
                {/* Header Section */}
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--color-primary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        Stomatologia Cyfrowa
                    </p>
                    <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", marginBottom: "1rem" }}>Implanty Opole</h1>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-muted)", fontWeight: 400 }}>Implanty zębów Opole</h2>
                </div>

                {/* Introduction */}
                <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "4rem", lineHeight: "1.8" }}>
                    <p className="mb-4">
                        Zabiegi implantacji w Mikrostomart wykonywane są <strong>ZAWSZE Z ZASTOSOWANIEM PLANOWANIA CYFROWEGO</strong>, na podstawie którego do każdego zabiegu tworzony jest szablon implantologiczny. Dzięki temu zabieg jest szybki, bezpieczny, a pozycja implantu taka, jak została zaplanowana w wizualizacji.
                    </p>
                    <p className="mb-4">
                        Ręcznie nie da się osiągnąć takiej precyzji leczenia. Oferujemy minimalnie inwazyjny zabieg wprowadzenia implantów zębowych na podstawie indywidualnego szablonu zaprojektowanego przy użyciu badania tomograficznego.
                    </p>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", marginTop: "2rem", border: "1px solid var(--color-primary)" }}>
                        <p style={{ fontWeight: "bold", color: "var(--color-primary)", marginBottom: "1rem" }}>Przydatne materiały (Facebook):</p>
                        <ul style={{ listStyle: "none", padding: 0, gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                            <li><a href="https://www.facebook.com/284295261917113/posts/1133975220282442/?d=n" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Implanty w Mikrostomart - przykładowy zabieg</a></li>
                            <li><a href="https://www.facebook.com/284295261917113/posts/1131697387176892/?d=n" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Implantacja kilku wszczepów</a></li>
                            <li><a href="https://www.facebook.com/284295261917113/posts/1000856353594330/?d=n" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Implant w 15 minut - wideo</a></li>
                        </ul>
                    </div>
                </div>

                {/* Benefits Section */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem", color: "var(--color-text-main)" }}>Kiedy zdecydować się na implant?</h2>
                    <p className="mb-4">Braki zębowe to poważny problem. W Mikrostomart w Opolu korzystamy z najnowszych możliwości medycyny:</p>

                    <h3 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "var(--color-primary)" }}>Zalety implantacji szablonowej:</h3>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", listStyleType: "disc" }}>
                        <li className="mb-2">Znamy dokładne położenie implantu zanim przystąpimy do zabiegu (minimalne ryzyko komplikacji).</li>
                        <li className="mb-2">Położenie implantu jest determinowane przyszłą koroną (estetyka i funkcja).</li>
                        <li className="mb-2">Skrócony czas zabiegu i mniejsza inwazyjność (często bez szwów).</li>
                        <li className="mb-2">Szybsze gojenie (ok. 2 dni wstępnego gojenia).</li>
                        <li className="mb-2">Możliwość AnyTimeLoading (obciążenie koroną w dowolnym czasie).</li>
                        <li className="mb-2">Przewidywalne koszty i efekty.</li>
                    </ul>
                </div>

                {/* Pricing */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Implanty zębów - cennik Opole</h2>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>(podane ceny są orientacyjne)</p>
                        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>Wszczepienie implantu</span>
                                <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>3500 zł</span>
                            </li>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>Korona na implancie</span>
                                <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>3500 zł</span>
                            </li>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>Materiał kościozastępczy</span>
                                <span>500 - 5500 zł</span>
                            </li>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>Podniesienie dna zatoki (Sinus Lift)</span>
                                <span>1500 - 5000 zł</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Technical Details */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>Budowa implantu zęba</h2>
                    <p style={{ lineHeight: "1.8" }}>
                        Nowoczesny implant składa się z <strong>wszczepu</strong> (tytanowa śruba w kości), <strong>łącznika</strong> oraz <strong>korony</strong> (część widoczna).
                        Każdy element dobierany jest indywidualnie, aby zapewnić trwałość i idealną estetykę nieodróżnialną od naturalnych zębów.
                    </p>
                </div>

                {/* FAQ */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Najczęstsze pytania (FAQ)</h2>

                    <div className="space-y-6">
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>Czy zabieg jest bezpieczny?</h3>
                            <p>Tak, poprzedzamy go szczegółowym wywiadem i badaniami tomograficznymi.</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>Czy zabieg jest bolesny?</h3>
                            <p>Nie, wykonywany jest w skutecznym znieczuleniu miejscowym. Dyskomfort po zabiegu jest porównywalny do usunięcia zęba.</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>Na jak długo starczają implanty?</h3>
                            <p>Prawidłowo wykonane implanty przy dobrej higienie mogą służyć do końca życia.</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>Przeciwwskazania</h3>
                            <p>Nieustabilizowana cukrzyca, ciąża, ciężkie choroby ogólnoustrojowe, wiek poniżej 16 lat.</p>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <a href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>Umów konsultację: 570 270 470</a>
                </div>

            </RevealOnScroll>
        </main>
    );
}
