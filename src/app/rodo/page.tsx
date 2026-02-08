"use client";

import { Download } from "lucide-react";

export default function RodoPage() {
    return (
        <main className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-4xl mx-auto text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl md:text-4xl font-serif text-[#dcb14a]">
                    Klauzula Informacyjna (RODO)
                </h1>
                <a
                    href="/rodo.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#dcb14a] text-black px-6 py-3 rounded-full font-medium hover:bg-[#c59d3e] transition-colors"
                >
                    <Download size={20} />
                    Pobierz PDF
                </a>
            </div>

            <div className="prose prose-invert prose-gold max-w-none bg-[#1a1d21] p-8 rounded-2xl border border-white/10 text-gray-300 leading-relaxed">

                <h2 className="text-[#dcb14a] font-serif text-2xl mb-4 text-center">Klauzula informacyjna RODO</h2>

                <p className="mb-4">
                    Szanowna Pani / Szanowny Panie,
                </p>
                <p className="mb-4">
                    Poniżej znajdzie Pani / Pan podstawowe informacje odnośnie przetwarzania Pani / Pana danych osobowych podanych w związku z zawarciem i wykonaniem umowy o świadczenie usług stomatologicznych, wymagane przepisami Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WA (ogólne rozporządzenie o ochrony danych) (Dz. U. UE L. z 2016 r. Nr 119, str. 1), zwanego dalej RODO.
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">1. Administrator danych</h3>
                <p className="mb-4">
                    Administratorem Pani / Pana danych osobowych jest: <br />
                    <strong>ELMAR SPÓŁKA Z O.O.</strong>, ul. Centralna nr 33A, 45-940 Opole, NIP: 7543251709
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">2. Kontakt z Administratorem</h3>
                <p className="mb-2">Kontakt z Administratorem danych jest możliwy:</p>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                    <li>pod adresem e-mail: <a href="mailto:gabinet@mikrostomart.pl" className="text-[#dcb14a] hover:underline">gabinet@mikrostomart.pl</a>,</li>
                    <li>pod numerem telefonu: +48 570 270 470,</li>
                    <li>pisemnie na adres siedziby Administratora.</li>
                </ul>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">3. Cel i podstawa przetwarzania</h3>
                <p className="mb-4">
                    Dane podane przez Panią / Pana w związku z zawartą umową o świadczenie usług stomatologicznych będą przetwarzane w celu zawarcia i wykonania tej umowy (m. in. ustalenie stanu zdrowia jamy ustnej, diagnozowanie, planowanie leczenia, prowadzenie dokumentacji medycznej, realizację świadczeń stomatologicznych itd.) – podstawę prawną przetwarzania danych stanowi niezbędność przetwarzania danych do zawarcia i wykonania umowy, której jest Pani / Pan stroną (art. 6 ust. 1 lit. b RODO).
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">4. Inne cele przetwarzania</h3>
                <p className="mb-2">Ponadto Pani / Pana dane będą przetwarzane w celu realizacji przez Administratora obowiązków wynikających z:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                    <li>a) ochrony stanu zdrowia, świadczenia usług medycznych, zarządzania udzielaniem tych usług oraz leczenia – Ustawa z dnia 6 listopada 2008r. o prawach pacjenta i Rzeczniku Praw Pacjenta;</li>
                    <li>b) prowadzenia i przechowywania dokumentacji medycznej – Art. 9 ust. 2 lit. h RODO w zw. z art. 24 ust. 1 Ustawy o prawach pacjenta oraz Rozporządzenia MZ;</li>
                    <li>c) odbioru i archiwizacji Pani/Pana oświadczeń upoważniających inne osoby do dostępu do Pani/Pana dokumentacji medycznej oraz udzielania im informacji o stanie Pani/Pana zdrowia – Art. 6 ust. 1 lit. c RODO w zw. z art. 9 ust. 3 oraz art. 26 ust. 1 Ustawy o prawach pacjenta oraz § 8 ust. 1 Rozporządzenia MZ;</li>
                    <li>d) kontaktowania się z Panią/Panem pod podanym numerem telefonu czy adresem e-mail, aby np. potwierdzić rezerwację bądź odwołać termin konsultacji lekarskiej, przypomnieć o tej konsultacji – Art. 6 ust. 1 lit. b oraz f RODO, jako tzw. prawnie uzasadniony interes Administratora, jakim jest opieka okołoobsługowa nad pacjentem oraz sprawniejsze zarządzanie terminami;</li>
                    <li>e) realizacji obowiązków podatkowych – w tym wystawianie rachunków za wykonane przez Administratora usługi, co może się wiązać z koniecznością przetwarzania Pani/Pana danych osobowych – Art. 6 ust. 1 lit. c RODO w zw. z art. 74 ust. 2 ustawy z dnia 29 września 1994 r. o rachunkowości.</li>
                </ul>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">5. Dochodzenie roszczeń</h3>
                <p className="mb-4">
                    Ewentualnie Pani / Pana dane mogą być przetwarzane w celu dochodzenia roszczeń związanych z zawartą z Panią / Panem umową lub obrony przed takimi roszczeniami – wówczas podstawę prawną przetwarzania danych stanowi niezbędność przetwarzania do realizacji prawnie uzasadnionego interesu Administratora, którym jest możliwość dochodzenia roszczeń i obrony przed roszczeniami (art. 6 ust. 1 lit. f RODO).
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">6. Odbiorcy danych</h3>
                <p className="mb-4">
                    Pani / Pana dane mogą być przekazywane podmiotom przetwarzającym dane osobowe na zlecenie Administratora, na podstawie umowy zawartej z Administratorem i wyłącznie zgodnie z poleceniami Administratora (np. biuro rachunkowe, firma hostingowa, dostawca oprogramowania itd.). Dane mogą być także przekazywane do sądów, organów administracji publicznej, mediatorów oraz innych podmiotów publicznych i prywatnych – jeżeli będzie to niezbędne dla prawidłowej realizacji świadczeń przez Administratora na rzecz Pani / Pana.
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">7. Przekazywanie danych poza EOG</h3>
                <p className="mb-4">
                    Pana / Pani dane nie będą przekazywane do odbiorców znajdujących się poza Europejskim Obszarem Gospodarczym.
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">8. Prawa osoby, której dane dotyczą</h3>
                <p className="mb-2">Przysługuje Pani / Panu prawo:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                    <li>a. dostępu do swoich danych oraz prawo żądania ich sprostowania, usunięcia, ograniczenia przetwarzania.</li>
                    <li>b. W zakresie, w jakim podstawą przetwarzania Pana / Pani danych osobowych jest przesłanka prawnie uzasadnionego interesu Administratora, przysługuje Pani / Panu prawo do wniesienia sprzeciwu wobec przetwarzania Pani / Panu danych osobowych (w szczególności wobec przetwarzania na potrzeby marketingu bezpośredniego, w tym profilowania, w takim przypadku wniesiony sprzeciw jest dla Administratora wiążący).</li>
                    <li>c. W zakresie w jakim podstawą przetwarzania Pani / Pana danych osobowych jest zgoda, ma Pani / Pan prawo jej wycofania, przy czym wycofanie zgody nie ma wpływu na zgodność z prawem przetwarzania, którego dokonania na podstawie zgody przed jej wycofaniem.</li>
                    <li>d. W zakresie, w jakim Pani / Pana dane są przetwarzane w celu zawarcia i wykonania umowy lub przetwarzane na podstawie zgody – przysługuje Pani / Panu także prawo do przenoszenia danych osobowych, tj. do otrzymania od Administratora Pani / Panu danych osobowych w ustrukturyzowanym, powszechnie używanym formacie nadającym się do odczytu maszynowego, które następnie może Pani / Panu przesłać innemu Administratorowi danych.</li>
                    <li>e. Przysługuje Pani / Panu również prawo wniesienia skargi do organu nadzorczego zajmującego się ochroną danych osobowych (w Polsce: Prezes Urzędu Ochrony Danych Osobowych) jeżeli uzna Pani / Pan, że przetwarzanie odbywa się w sposób niezgodny z prawem. W celu skorzystania z powyższych uprawnień należy skontaktować się z Administratorem.</li>
                </ul>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">9. Zautomatyzowane podejmowanie decyzji</h3>
                <p className="mb-4">
                    W związku z przetwarzaniem Pani / Pana danych osobowych, decyzje dotyczące Pani / Pana nie będą podejmowane w sposób zautomatyzowany (bez udziału człowieka).
                </p>

                <h3 className="text-[#dcb14a] font-bold mt-6 mb-2">10. Dobrowolność podania danych</h3>
                <p className="mb-4">
                    Podanie danych osobowych w związku ze świadczeniem usług stomatologicznych jest dobrowolne, ale konieczne do zapewnienia prawidłowej opieki zdrowotnej przez Administratora.
                </p>

            </div>
        </main>
    );
}
