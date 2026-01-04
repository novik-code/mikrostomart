"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Microscope, Scan, Wand2, Syringe, Sparkles, Smile, ShieldCheck, Gem } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface OfferItem {
    id: number;
    title: string;
    icon: React.ReactNode;
    shortDesc: string;
    fullDesc: string;
    link: string;
    image: string; // Background image
}

// Using abstract premium dental/medical backgrounds (generated assets)
const OFFERS: OfferItem[] = [
    {
        id: 1,
        title: "Endodoncja Mikroskopowa",
        icon: <Microscope size={60} className="text-[#dcb14a]" />,
        shortDesc: "Leczenie kanałowe z najwyższą precyzją. Ratujemy zęby, które inni spisali na straty.",
        fullDesc: "Leczenie kanałowe (endodontyczne) to często jedyny sposób na uratowanie zęba przed usunięciem. W Mikrostomart standardem jest wykonywanie wszystkich zabiegów endodontycznych przy użyciu mikroskopu zabiegowego, który zapewnia powiększenie nawet do 25x. Dzięki temu nasi specjaliści są w stanie odnaleźć wszystkie, nawet najcieńsze i dodatkowe kanały, które są niewidoczne gołym okiem. Zajmujemy się również trudnymi przypadkami, takimi jak powtórne leczenie kanałowe (re-endo), usuwanie złamanych narzędzi z kanałów czy zamykanie perforacji. Każdy zabieg odbywa się w koferdamie, co gwarantuje pełną sterylność i bezpieczeństwo. Endodoncja mikroskopowa to precyzja, która pozwala cieszyć się własnym zębem przez długie lata.",
        link: "/rezerwacja",
        image: "/images/offers/microscope.png"
    },
    {
        id: 2,
        title: "Implantologia",
        icon: <Scan size={60} className="text-[#dcb14a]" />,
        shortDesc: "Odbuduj swój uśmiech na stałe. Implanty to najdoskonalsza alternatywa dla naturalnych zębów.",
        fullDesc: "Implanty stomatologiczne to obecnie najbardziej fizjologiczna i trwała metoda uzupełniania braków zębowych. W naszej klinice stosujemy wyłącznie systemy implantologiczne renomowanych światowych marek, co gwarantuje bezpieczeństwo i długoletnią trwałość rozwiązań. Oferujemy implanty tytanowe oraz wysoce estetyczne implanty cyrkonowe. Każdy zabieg poprzedzony jest precyzyjną diagnostyką tomograficzną (CBCT) oraz planowaniem cyfrowym. Stosujemy zaawansowane techniki regeneracji kości oraz fibrynę bogatopłytkową (PRF), pozyskiwaną z krwi pacjenta, aby przyspieszyć proces gojenia. Od pojedynczych koron po pełne rekonstrukcje bezzębia – przywracamy nie tylko uśmiech, ale i pełną funkcjonalność zgryzu.",
        link: "/rezerwacja",
        image: "/images/offers/implant.png"
    },
    {
        id: 3,
        title: "Chirurgia Laserowa",
        icon: <Wand2 size={60} className="text-[#dcb14a]" />,
        shortDesc: "Nowoczesne zabiegi bez skalpela. Szybsze gojenie, mniejszy obrzęk i minimalny ból.",
        fullDesc: "Nowoczesna chirurgia stomatologiczna to nie tylko ekstrakcje, ale przede wszystkim zabiegi wspierające leczenie implantologiczne, protetyczne i ortodontyczne. Jako jedni z nielicznych w regionie wykorzystujemy zaawansowane lasery stomatologiczne Fotona Lightwalker. Pozwalają one na przeprowadzanie wielu procedur – takich jak podcinanie wędzidełek, czy plastyka dziąseł – w sposób niemal bezkrwawy i bezbolesny. Światło lasera działa biostymulująco, co znacząco przyspiesza gojenie i zmniejsza pooperacyjny obrzęk. Wykonujemy również atraumatyczne usuwanie ósemek oraz zabiegi sterowanej regeneracji kości, zawsze dbając o maksymalny komfort pacjenta.",
        link: "/rezerwacja",
        image: "/images/offers/laser.png"
    },
    {
        id: 4,
        title: "Stomatologia Estetyczna",
        icon: <Sparkles size={60} className="text-[#dcb14a]" />,
        shortDesc: "Twój wymarzony uśmiech na wyciągnięcie ręki. Licówki, bonding i cyfrowe projektowanie uśmiechu.",
        fullDesc: "Stomatologia estetyczna to sztuka łączenia wiedzy medycznej z poczuciem piękna. Oferujemy pełne spektrum zabiegów poprawiających wygląd uśmiechu, zaczynając od Cyfrowego Projektowania Uśmiechu (DSD), które pozwala zobaczyć efekt końcowy jeszcze przed rozpoczęciem leczenia. Wykonujemy ultracienkie licówki porcelanowe, które korygują kształt i kolor zębów, zachowując ich naturalną strukturę. Dla pacjentów oczekujących szybkich efektów proponujemy bonding – estetyczną odbudowę kompozytową w trakcie jednej wizyty. Dopełnieniem oferty jest skuteczne i bezpieczne wybielanie zębów metodą nakładkową lub gabinetową przy użyciu lasera, dające spektakularne rezultaty.",
        link: "/rezerwacja",
        image: "/images/offers/aesthetic.png"
    },
    {
        id: 5,
        title: "Protetyka Cyfrowa",
        icon: <Gem size={60} className="text-[#dcb14a]" />,
        shortDesc: "Korony i mosty bez nieprzyjemnych wycisków. Precyzja skanera wewnątrzustnego.",
        fullDesc: "Wkraczamy w nową erę protetyki, rezygnując z tradycyjnych, nieprzyjemnych mas wyciskowych na rzecz cyfrowego skanowania wewnątrzustnego. Skaner 3D pozwala na uzyskanie wirtualnego modelu uzębienia z mikronową precyzją w zaledwie kilka minut. Prace protetyczne, takie jak korony, mosty le licówki wykonane z tlenku cyrkonu lub ceramiki E.max, są projektowane komputerowo (CAD/CAM) i frezowane z idealną dokładnością. Dzięki temu nasze uzupełnienia są nie tylko niezwykle estetyczne i nieodróżnialne od naturalnych zębów, ale także perfekcyjnie szczelne i trwałe. Przywracamy prawidłową funkcję żucia i estetykę uśmiechu w krótszym czasie.",
        link: "/rezerwacja",
        image: "/images/offers/prosthetics.png"
    },
    {
        id: 6,
        title: "Bezbolesne Znieczulenie",
        icon: <Syringe size={60} className="text-[#dcb14a]" />,
        shortDesc: "Zapomnij o strachu przed igłą. Komputerowe znieczulenie The Wand.",
        fullDesc: "Komfort i spokój pacjenta są dla nas priorytetem, dlatego całkowicie wyeliminowaliśmy ból z procesu leczenia. Korzystamy z nowoczesnego systemu komputerowego znieczulenia The Wand. To rewolucyjne urządzenie, które podaje środek znieczulający pod kontrolą mikroprocesora, dostosowując ciśnienie do tkanki pacjenta. Eliminuje to nieprzyjemne uczucie rozpierania oraz ból towarzyszący tradycyjnym zastrzykom. Końcówka przypomina długopis, co redukuje stres wizualny. Dzięki temu znieczulenie obejmuje tylko leczony ząb, bez odrętwienia połowy twarzy, co pozwala na normalne funkcjonowanie zaraz po wizycie.",
        link: "/rezerwacja",
        image: "/images/offers/anesthesia.png"
    },
    {
        id: 7,
        title: "Profilaktyka Premium",
        icon: <ShieldCheck size={60} className="text-[#dcb14a]" />,
        shortDesc: "Zdrowe zęby na lata. Profesjonalna higienizacja, skaling i piaskowanie.",
        fullDesc: "Regularna profilaktyka to fundament zdrowego uśmiechu i klucz do uniknięcia kosztownego leczenia w przyszłości. Nasz autorski program higienizacji PREMIUM obejmuje dokładny skaling ultradźwiękowy, piaskowanie osadów (z kawy, herbaty, tytoniu) przy użyciu delikatnych piaskarek, polerowanie oraz profesjonalną fluoryzację. Każdemu pacjentowi poświęcamy czas na indywidualny instruktaż higieny jamy ustnej, dobierając odpowiednie szczoteczki, nici i pasty. Regularne wizyty higienizacyjne pozwalają nie tylko zachować biały uśmiech, ale także wcześnie wykryć ewentualne problemy, takie jak próchnica czy choroby przyzębia.",
        link: "/rezerwacja",
        image: "/images/offers/prophylaxis.png"
    },
    {
        id: 8,
        title: "Ortodoncja Nakładkowa",
        icon: <Smile size={60} className="text-[#dcb14a]" />,
        shortDesc: "Proste zęby bez metalowego aparatu. Niewidoczne nakładki Clear Correct.",
        fullDesc: "Marzysz o prostych zębach, ale nie chcesz nosić stałego, metalowego aparatu? Oferujemy nowoczesne leczenie ortodontyczne za pomocą przezroczystych nakładek (alignerów) Clear Correct. To dyskretna, wygodna i wyjmowana alternatywa dla tradycyjnych aparatów. Dzięki zaawansowanej technologii cyfrowej, już na pierwszej wizycie możemy przygotować wizualizację efektów leczenia. Nakładki są praktycznie niewidoczne, łatwe w utrzymaniu higieny i nie powodują otarć. Leczenie jest precyzyjnie zaplanowane, często krótsze niż metodami tradycyjnymi, i wymaga mniejszej liczby wizyt kontrolnych.",
        link: "/rezerwacja",
        image: "/images/offers/ortho.png"
    }
];

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8
    })
};

export default function OfferCarousel() {
    const [[page, direction], setPage] = useState([0, 0]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // Pause auto-play on hover

    const activeIndex = Math.abs(page % OFFERS.length);
    const offer = OFFERS[activeIndex];

    const paginate = (newDirection: number) => {
        setPage([page + newDirection, newDirection]);
        setIsExpanded(false); // Reset expansion on slide change
    };

    // Auto-play Effect
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            paginate(1);
        }, 5000); // 5 seconds
        return () => clearInterval(timer);
    }, [page, isPaused]); // Re-run when page changes or pause state changes

    const swipeConfidenceThreshold = 2000;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    return (
        <section
            className="relative w-full flex items-center justify-center overflow-hidden py-12 md:py-24"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Transparent background to allow global video to show through */}
            <div className="absolute inset-0 z-0 bg-transparent" />

            <div className="relative z-20 w-full max-w-6xl px-4 md:px-12 h-full flex flex-col justify-center">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);

                            if (swipe < -swipeConfidenceThreshold) {
                                paginate(1);
                            } else if (swipe > swipeConfidenceThreshold) {
                                paginate(-1);
                            }
                        }}
                        className="w-full cursor-grab active:cursor-grabbing select-none"
                        style={{ touchAction: "pan-y" }}
                    >
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                            gap: "var(--spacing-xl)",
                            alignItems: "center",
                            maxWidth: "1200px",
                            margin: "0 auto",
                            position: "relative" // Context for arrows
                        }}>
                            {/* Navigation Arrows (Inside Content) */}
                            <button
                                className="gallery-nav-btn gallery-nav-btn-prev"
                                onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                                title="Poprzednia"
                                style={{
                                    left: '0',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 40,
                                    position: 'absolute'
                                }}
                            >
                                ❮
                            </button>

                            <button
                                className="gallery-nav-btn gallery-nav-btn-next"
                                onClick={(e) => { e.stopPropagation(); paginate(1); }}
                                title="Następna"
                                style={{
                                    right: '0',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 40,
                                    position: 'absolute'
                                }}
                            >
                                ❯
                            </button>

                            {/* LEFT: Image Frame (Team Member Style) */}
                            <div className="flex justify-center md:justify-end order-1">
                                <div
                                    style={{
                                        width: '100%',
                                        maxWidth: '400px',
                                        aspectRatio: '3/4',
                                        position: 'relative',
                                        borderRadius: '2px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '10px',
                                        background: 'transparent',
                                    }}
                                >
                                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                        <Image
                                            src={offer.image}
                                            alt={offer.title}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            priority
                                            draggable={false} // Prevent image drag interfering with swipe
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Text Content (Team Member Style) - Order 2 */}
                            <div className="order-2 text-left" style={{ paddingLeft: "var(--spacing-md)" }}>
                                <p style={{
                                    color: "#dcb14a",
                                    marginBottom: "1rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    fontSize: "0.875rem"
                                }}>
                                    Oferta Specjalistyczna
                                </p>
                                <h2 style={{
                                    fontSize: "clamp(2rem, 4vw, 3rem)",
                                    marginBottom: "2rem",
                                    lineHeight: 1.1,
                                    fontFamily: 'serif',
                                    color: 'white'
                                }}>
                                    {offer.title}
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "2rem",
                                    color: "#e5e7eb",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid #dcb14a",
                                    paddingLeft: "1.5rem"
                                }}>
                                    "{offer.shortDesc}"
                                </blockquote>
                                <div style={{ marginBottom: "1rem", color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6 }}>
                                    {/* Brief part always visible + JUSTIFIED */}
                                    <p style={{ marginBottom: "1rem", textAlign: "justify" }}>
                                        {offer.fullDesc.split('.')[0]}.
                                    </p>

                                    {/* Expandable Part */}
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: isExpanded ? "auto" : 0,
                                            opacity: isExpanded ? 1 : 0
                                        }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ paddingTop: '1rem' }}>
                                            {/* JUSTIFIED TEXT */}
                                            <p style={{ marginBottom: "1rem", textAlign: "justify" }}>
                                                {offer.fullDesc.substring(offer.fullDesc.indexOf('.') + 1)}
                                            </p>
                                            {/* CENTERED CTA BUTTON */}
                                            <div className="flex justify-center w-full mb-4">
                                                <Link
                                                    href={offer.link}
                                                    className="
                                                        inline-flex items-center gap-3 px-8 py-3 
                                                        bg-[#dcb14a] text-black 
                                                        hover:bg-white hover:scale-105 active:scale-95
                                                        transition-all duration-300
                                                        rounded-[2px] 
                                                        uppercase tracking-wider text-sm font-bold
                                                        shadow-[0_0_20px_rgba(220,177,74,0.3)]
                                                    "
                                                >
                                                    Umów Wizytę <ChevronRight size={16} strokeWidth={3} />
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginTop: '1rem',
                                            color: '#dcb14a',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            padding: '0.5rem 0',
                                            cursor: 'pointer',
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none'
                                        }}
                                    >
                                        {isExpanded ? "Zwiń Opis" : "Najedź, aby rozwinąć"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Pagination Dots - Moved below content */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                {OFFERS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            const diff = i - activeIndex;
                            if (diff !== 0) paginate(diff);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-[#dcb14a]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </section>
    );
}

const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
};
