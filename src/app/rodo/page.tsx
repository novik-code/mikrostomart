"use client";

import { Download, Shield } from "lucide-react";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function RodoPage() {
    return (
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero Header */}
            <section style={{
                padding: "calc(var(--spacing-xl) + 2rem) 0 var(--spacing-lg)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Subtle gradient overlay */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center top, rgba(220,177,74,0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <RevealOnScroll>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "50%",
                                background: "rgba(220,177,74,0.1)", border: "1px solid rgba(220,177,74,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <Shield size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            Ochrona Danych Osobowych
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                            marginBottom: "1.5rem", lineHeight: 1.2
                        }}>
                            Klauzula Informacyjna RODO
                        </h1>
                        <a
                            href="/rodo.pdf" target="_blank" rel="noopener noreferrer"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                background: "var(--color-primary)", color: "#000",
                                padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)",
                                fontWeight: 600, fontSize: "0.9rem",
                                transition: "var(--transition-fast)", textDecoration: "none"
                            }}
                            className="btn-primary"
                        >
                            <Download size={18} />
                            Pobierz PDF
                        </a>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <RevealOnScroll animation="fade-up" delay={100}>
                    <div style={{
                        background: "var(--color-surface)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "var(--radius-lg)",
                        padding: "clamp(2rem, 4vw, 3rem)",
                        boxShadow: "0 4px 30px rgba(0,0,0,0.3)"
                    }}>
                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                            Szanowna Pani / Szanowny Panie,
                        </p>
                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "2.5rem" }}>
                            Poniżej znajdzie Pani / Pan podstawowe informacje odnośnie przetwarzania Pani / Pana danych osobowych podanych w związku z zawarciem i wykonaniem umowy o świadczenie usług stomatologicznych, wymagane przepisami Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WA (ogólne rozporządzenie o ochrony danych) (Dz. U. UE L. z 2016 r. Nr 119, str. 1), zwanego dalej RODO.
                        </p>

                        {/* Section template — all sections follow this pattern */}
                        <LegalSection number="1" title="Administrator danych">
                            <p>Administratorem Pani / Pana danych osobowych jest: <br />
                                <strong style={{ color: "var(--color-text-main)" }}>ELMAR SPÓŁKA Z O.O.</strong>, ul. Centralna nr 33A, 45-940 Opole, NIP: 7543251709</p>
                        </LegalSection>

                        <LegalSection number="2" title="Kontakt z Administratorem">
                            <p style={{ marginBottom: "0.75rem" }}>Kontakt z Administratorem danych jest możliwy:</p>
                            <ul>
                                <li>pod adresem e-mail: <a href="mailto:gabinet@mikrostomart.pl" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>gabinet@mikrostomart.pl</a>,</li>
                                <li>pod numerem telefonu: +48 570 270 470,</li>
                                <li>pisemnie na adres siedziby Administratora.</li>
                            </ul>
                        </LegalSection>

                        <LegalSection number="3" title="Cel i podstawa przetwarzania">
                            <p>Dane podane przez Panią / Pana w związku z zawartą umową o świadczenie usług stomatologicznych będą przetwarzane w celu zawarcia i wykonania tej umowy (m. in. ustalenie stanu zdrowia jamy ustnej, diagnozowanie, planowanie leczenia, prowadzenie dokumentacji medycznej, realizację świadczeń stomatologicznych itd.) – podstawę prawną przetwarzania danych stanowi niezbędność przetwarzania danych do zawarcia i wykonania umowy, której jest Pani / Pan stroną (art. 6 ust. 1 lit. b RODO).</p>
                        </LegalSection>

                        <LegalSection number="4" title="Inne cele przetwarzania">
                            <p style={{ marginBottom: "0.75rem" }}>Ponadto Pani / Pana dane będą przetwarzane w celu realizacji przez Administratora obowiązków wynikających z:</p>
                            <ul>
                                <li>a) ochrony stanu zdrowia, świadczenia usług medycznych, zarządzania udzielaniem tych usług oraz leczenia – Ustawa z dnia 6 listopada 2008r. o prawach pacjenta i Rzeczniku Praw Pacjenta;</li>
                                <li>b) prowadzenia i przechowywania dokumentacji medycznej – Art. 9 ust. 2 lit. h RODO w zw. z art. 24 ust. 1 Ustawy o prawach pacjenta oraz Rozporządzenia MZ;</li>
                                <li>c) odbioru i archiwizacji Pani/Pana oświadczeń upoważniających inne osoby do dostępu do Pani/Pana dokumentacji medycznej oraz udzielania im informacji o stanie Pani/Pana zdrowia – Art. 6 ust. 1 lit. c RODO w zw. z art. 9 ust. 3 oraz art. 26 ust. 1 Ustawy o prawach pacjenta oraz § 8 ust. 1 Rozporządzenia MZ;</li>
                                <li>d) kontaktowania się z Panią/Panem pod podanym numerem telefonu czy adresem e-mail, aby np. potwierdzić rezerwację bądź odwołać termin konsultacji lekarskiej, przypomnieć o tej konsultacji – Art. 6 ust. 1 lit. b oraz f RODO, jako tzw. prawnie uzasadniony interes Administratora, jakim jest opieka okołoobsługowa nad pacjentem oraz sprawniejsze zarządzanie terminami;</li>
                                <li>e) realizacji obowiązków podatkowych – w tym wystawianie rachunków za wykonane przez Administratora usługi, co może się wiązać z koniecznością przetwarzania Pani/Pana danych osobowych – Art. 6 ust. 1 lit. c RODO w zw. z art. 74 ust. 2 ustawy z dnia 29 września 1994 r. o rachunkowości.</li>
                            </ul>
                        </LegalSection>

                        <LegalSection number="5" title="Dochodzenie roszczeń">
                            <p>Ewentualnie Pani / Pana dane mogą być przetwarzane w celu dochodzenia roszczeń związanych z zawartą z Panią / Panem umową lub obrony przed takimi roszczeniami – wówczas podstawę prawną przetwarzania danych stanowi niezbędność przetwarzania do realizacji prawnie uzasadnionego interesu Administratora, którym jest możliwość dochodzenia roszczeń i obrony przed roszczeniami (art. 6 ust. 1 lit. f RODO).</p>
                        </LegalSection>

                        <LegalSection number="6" title="Odbiorcy danych">
                            <p>Pani / Pana dane mogą być przekazywane podmiotom przetwarzającym dane osobowe na zlecenie Administratora, na podstawie umowy zawartej z Administratorem i wyłącznie zgodnie z poleceniami Administratora (np. biuro rachunkowe, firma hostingowa, dostawca oprogramowania itd.). Dane mogą być także przekazywane do sądów, organów administracji publicznej, mediatorów oraz innych podmiotów publicznych i prywatnych – jeżeli będzie to niezbędne dla prawidłowej realizacji świadczeń przez Administratora na rzecz Pani / Pana.</p>
                        </LegalSection>

                        <LegalSection number="7" title="Przekazywanie danych poza EOG">
                            <p>Pana / Pani dane nie będą przekazywane do odbiorców znajdujących się poza Europejskim Obszarem Gospodarczym.</p>
                        </LegalSection>

                        <LegalSection number="8" title="Prawa osoby, której dane dotyczą">
                            <p style={{ marginBottom: "0.75rem" }}>Przysługuje Pani / Panu prawo:</p>
                            <ul>
                                <li>a. dostępu do swoich danych oraz prawo żądania ich sprostowania, usunięcia, ograniczenia przetwarzania.</li>
                                <li>b. W zakresie, w jakim podstawą przetwarzania Pana / Pani danych osobowych jest przesłanka prawnie uzasadnionego interesu Administratora, przysługuje Pani / Panu prawo do wniesienia sprzeciwu wobec przetwarzania Pani / Panu danych osobowych (w szczególności wobec przetwarzania na potrzeby marketingu bezpośredniego, w tym profilowania, w takim przypadku wniesiony sprzeciw jest dla Administratora wiążący).</li>
                                <li>c. W zakresie w jakim podstawą przetwarzania Pani / Pana danych osobowych jest zgoda, ma Pani / Pan prawo jej wycofania, przy czym wycofanie zgody nie ma wpływu na zgodność z prawem przetwarzania, którego dokonania na podstawie zgody przed jej wycofaniem.</li>
                                <li>d. W zakresie, w jakim Pani / Pana dane są przetwarzane w celu zawarcia i wykonania umowy lub przetwarzane na podstawie zgody – przysługuje Pani / Panu także prawo do przenoszenia danych osobowych, tj. do otrzymania od Administratora Pani / Panu danych osobowych w ustrukturyzowanym, powszechnie używanym formacie nadającym się do odczytu maszynowego, które następnie może Pani / Panu przesłać innemu Administratorowi danych.</li>
                                <li>e. Przysługuje Pani / Panu również prawo wniesienia skargi do organu nadzorczego zajmującego się ochroną danych osobowych (w Polsce: Prezes Urzędu Ochrony Danych Osobowych) jeżeli uzna Pani / Pan, że przetwarzanie odbywa się w sposób niezgodny z prawem. W celu skorzystania z powyższych uprawnień należy skontaktować się z Administratorem.</li>
                            </ul>
                        </LegalSection>

                        <LegalSection number="9" title="Zautomatyzowane podejmowanie decyzji">
                            <p>W związku z przetwarzaniem Pani / Pana danych osobowych, decyzje dotyczące Pani / Pana nie będą podejmowane w sposób zautomatyzowany (bez udziału człowieka).</p>
                        </LegalSection>

                        <LegalSection number="10" title="Dobrowolność podania danych" last>
                            <p>Podanie danych osobowych w związku ze świadczeniem usług stomatologicznych jest dobrowolne, ale konieczne do zapewnienia prawidłowej opieki zdrowotnej przez Administratora.</p>
                        </LegalSection>

                    </div>
                </RevealOnScroll>
            </section>
        </main>
    );
}

/* Reusable section component for consistent styling */
function LegalSection({ number, title, children, last }: { number: string; title: string; children: React.ReactNode; last?: boolean }) {
    return (
        <div style={{ marginBottom: last ? 0 : "2rem", paddingBottom: last ? 0 : "2rem", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
            <h3 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.1rem",
                color: "var(--color-primary)",
                marginBottom: "0.75rem",
                display: "flex", alignItems: "center", gap: "0.75rem"
            }}>
                <span style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "rgba(220,177,74,0.1)", border: "1px solid rgba(220,177,74,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontFamily: "var(--font-sans)", fontWeight: 700,
                    flexShrink: 0
                }}>{number}</span>
                {title}
            </h3>
            <div style={{
                color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.92rem",
                paddingLeft: "calc(28px + 0.75rem)"
            }}>
                {/* Style nested lists and paragraphs */}
                <style>{`
                    .legal-content ul { list-style: none; padding: 0; margin: 0; }
                    .legal-content li {
                        padding: 0.35rem 0 0.35rem 1.25rem;
                        position: relative;
                    }
                    .legal-content li::before {
                        content: '';
                        position: absolute; left: 0; top: 0.85rem;
                        width: 4px; height: 4px; border-radius: 50%;
                        background: var(--color-primary); opacity: 0.5;
                    }
                    .legal-content p { margin-bottom: 0; }
                `}</style>
                <div className="legal-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
