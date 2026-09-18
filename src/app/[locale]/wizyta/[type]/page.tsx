'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import styles from './appointment.module.css';
import { sanitizeRichHtml } from '@/lib/sanitize';
import { brand } from '@/lib/brandConfig';
import { formatPhoneForTel } from '@/lib/phoneFormat';
import { DeklaracjaPrzedPotwierdzeniem, InformacjaPotwierdzonaWizyta } from '@/components/DeklaracjaPotwierdzenia';
import {
    KOD_WIZYTA_ODWOLANA,
    KOD_WIZYTA_POTWIERDZONA,
    TEKST_WIZYTA_JUZ_ODWOLANA,
    TELEFON_GABINETU,
    TELEFON_GABINETU_HREF,
} from '@/lib/deklaracjaPotwierdzenia';

/**
 * Zdanie od serwera pokazujemy WYŁĄCZNIE, gdy jest nasze: odmowa z polem `code` (blokada,
 * zgłoszone odwołanie) albo limit 429 (polski tekst). Reszta tras oddaje angielskie `error`
 * („Appointment not found”, „Cancellation must be…”), a błąd sieci/parsowania to techniczny
 * napis przeglądarki — wtedy polski tekst zapasowy z numerem (przegląd 18.09: heurystyka
 * „zawiera spację” przepuszczała wszystko i tekst zapasowy był martwy).
 */
function tekstSerwera(status: number, data: { code?: unknown; message?: unknown; error?: unknown } | null): string | null {
    if (!data || !(data.code || status === 429)) return null;
    const t = typeof data.message === 'string' ? data.message : data.error;
    return typeof t === 'string' && t.trim() ? t : null;
}

/** Ile najdłużej czekamy na stan wizyty, zanim pokażemy przyciski (awaria odczytu = widok domyślny). */
const LIMIT_SPRAWDZANIA_MS = 3000;

interface AppointmentInstruction {
    appointment_type: string;
    title: string;
    subtitle: string | null;
    icon: string | null;
    content: string;
    preparation_time: string | null;
    what_to_bring: string[] | null;
    important_notes: string[] | null;
}

export default function AppointmentPreparationPage() {
    const params = useParams<{ type: string }>();
    const searchParams = useSearchParams();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [instruction, setInstruction] = useState<AppointmentInstruction | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirmationStatus, setConfirmationStatus] = useState<'idle' | 'confirming' | 'confirmed' | 'already-confirmed' | 'cancelling' | 'cancelled' | 'already-cancelled'>('idle');
    /** Zdanie od serwera (odmowa, błąd) — pokazywane wprost, zamiast ogólnego „Spróbuj ponownie”. */
    const [komunikat, setKomunikat] = useState<string | null>(null);
    /**
     * Czy stan wizyty już znamy. Do tego czasu przycisków NIE ma — inaczej przy potwierdzonej
     * wizycie „Odwołuję” wisiało, dopóki nie wrócił odczyt (zimny start trasy), a pacjent
     * najpierw deklarował odwołanie, a dopiero potem słyszał, że nie może (przegląd 18.09).
     */
    const [stanSprawdzony, setStanSprawdzony] = useState(false);

    // Extract appointment details from URL.
    // Legitymacją jest LOSOWY TOKEN (16 znaków) z linku w SMS-ie.
    // 🔴 P-088 (06.09): zniknął stąd odczyt `?appointmentId=`. Był to surowy UUID wiersza
    // `appointment_actions`, przyjmowany „na 14 dni karencji" — trzy miesiące wcześniej.
    // Identyfikator nie jest sekretem, więc link z nim pozwalał ruszyć CUDZĄ wizytę.
    // ⚪ Zmierzone przed usunięciem: 92 żywe short-linki, wszystkie z `token=`.
    const token = searchParams.get('token');
    const appointmentDate = searchParams.get('date');
    const appointmentTime = searchParams.get('time');
    const doctorName = searchParams.get('doctor');
    const patientId = searchParams.get('patientId');
    const hasIdentifier = !!token;

    useEffect(() => {
        const fetchInstruction = async () => {
            try {
                const res = await fetch(`/api/appointment-instructions/${params.type}`);

                if (!res.ok) {
                    setNotFound(true);
                    return;
                }

                const data = await res.json();
                setInstruction(data.instruction);
            } catch (error) {
                console.error('[Appointment Page] Fetch error:', error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchInstruction();
    }, [params.type]);

    /**
     * 🔒 Stan wizyty przy wejściu (decyzja właściciela 18.09.2026): potwierdzona wizyta od razu
     * pokazuje blokadę zamiast przycisku „Odwołuję”; odwołana — informację o odwołaniu. Odpowiedź
     * to wyłącznie tak/nie. Awaria odczytu = zostaje widok domyślny (serwer i tak odmówi odwołania).
     */
    // Inny token = inna wizyta: stan poprzedniej nie może przejść dalej. Reset w trakcie renderu
    // (wzorzec Reacta „poprzednia wartość w stanie”), nie w efekcie — bez dodatkowego przebiegu.
    const [tokenStanu, setTokenStanu] = useState(token);
    if (tokenStanu !== token) {
        setTokenStanu(token);
        setConfirmationStatus('idle');
        setKomunikat(null);
        setStanSprawdzony(false);
    }

    useEffect(() => {
        if (!token) return;
        let aktywny = true;
        const limit = setTimeout(() => { if (aktywny) setStanSprawdzony(true); }, LIMIT_SPRAWDZANIA_MS);
        fetch('/api/appointments/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((stan) => {
                if (!aktywny || !stan) return;
                // 🔑 Zgłoszone odwołanie PRZED potwierdzeniem: oba naraz mają tylko wiersze sprzed
                // 18.09 (potwierdzone, a potem odwołane linkiem) — późniejsze zgłoszenie wygrywa.
                if (stan.cancelled) setConfirmationStatus('already-cancelled');
                else if (stan.confirmed) setConfirmationStatus('already-confirmed');
            })
            .catch(() => { /* widok domyślny */ })
            .finally(() => { if (aktywny) setStanSprawdzony(true); });
        return () => { aktywny = false; clearTimeout(limit); };
    }, [token]);

    const handleConfirm = async () => {
        if (!hasIdentifier) {
            alert('Brak ID wizyty');
            return;
        }

        setConfirmationStatus('confirming');

        try {
            const res = await fetch('/api/appointments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    patientId,
                })
            });

            const data = await res.json().catch(() => null);

            if (res.ok && data) {
                setKomunikat(null);
                // Check if already confirmed
                if (data.alreadyConfirmed) {
                    setConfirmationStatus('already-confirmed');
                } else {
                    setConfirmationStatus('confirmed');
                }
            } else if (data?.code === KOD_WIZYTA_ODWOLANA) {
                setKomunikat(null);
                setConfirmationStatus('already-cancelled');
            } else {
                setKomunikat(tekstSerwera(res.status, data) ?? `Nie udało się potwierdzić wizyty. Spróbuj ponownie albo zadzwoń: ${TELEFON_GABINETU}.`);
                setConfirmationStatus('idle');
            }
        } catch (error) {
            console.error('[Confirm] Error:', error);
            setKomunikat(`Nie udało się potwierdzić wizyty. Spróbuj ponownie albo zadzwoń: ${TELEFON_GABINETU}.`);
            setConfirmationStatus('idle');
        }
    };

    const handleCancel = async () => {
        if (!hasIdentifier) {
            alert('Brak ID wizyty');
            return;
        }

        const confirmation = confirm('Czy na pewno chcesz odwołać wizytę?');
        if (!confirmation) return;

        setConfirmationStatus('cancelling');

        try {
            const res = await fetch('/api/appointments/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    patientId,
                })
            });

            const data = await res.json().catch(() => null);

            if (res.ok && data) {
                setKomunikat(null);
                // Check if already cancelled
                if (data.alreadyCancelled) {
                    setConfirmationStatus('already-cancelled');
                } else {
                    setConfirmationStatus('cancelled');
                }
            } else if (data?.code === KOD_WIZYTA_POTWIERDZONA) {
                // 🔒 Potwierdzona wizyta — serwer odmówił odwołania; pokazujemy blokadę, nie „spróbuj ponownie”.
                setKomunikat(tekstSerwera(res.status, data));
                setConfirmationStatus('already-confirmed');
            } else {
                setKomunikat(tekstSerwera(res.status, data) ?? `Nie udało się odwołać wizyty. Zadzwoń: ${TELEFON_GABINETU}.`);
                setConfirmationStatus('idle');
            }
        } catch (error) {
            console.error('[Cancel] Error:', error);
            setKomunikat(`Nie udało się odwołać wizyty. Zadzwoń: ${TELEFON_GABINETU}.`);
            setConfirmationStatus('idle');
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}>Ładowanie...</div>
            </div>
        );
    }

    if (notFound || !instruction) {
        return (
            <div className={styles.notFound}>
                <h1>404 - Nie znaleziono</h1>
                <p>Nie znaleziono instrukcji dla tego typu wizyty.</p>
                <Link href="/" className={styles.backHome}>Wróć do strony głównej</Link>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Video Background */}
            <div className={styles.videoContainer}>
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={() => { /* swallow video load errors */ }}
                    onCanPlay={() => {
                        // Catch autoplay rejection (Safari iOS throws unhandled rejection)
                        videoRef.current?.play().catch(() => {});
                    }}
                >
                    <source src="/videos/background.mp4" type="video/mp4" />
                </video>
            </div>
            <div className={styles.videoOverlay}></div>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.container}>
                    <div className={styles.heroContent}>
                        {instruction.icon && (
                            <div className={styles.icon}>{instruction.icon}</div>
                        )}
                        <h1>{instruction.title}</h1>
                        {instruction.subtitle && (
                            <p className={styles.subtitle}>{instruction.subtitle}</p>
                        )}

                        {/* Appointment Details (if from SMS) */}
                        {(appointmentDate || appointmentTime || doctorName) && (
                            <div className={styles.appointmentDetails}>
                                <h3>📅 Twoja Wizyta</h3>
                                <div className={styles.detailsGrid}>
                                    {appointmentDate && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Data:</span>
                                            <span className={styles.value}>
                                                {new Date(appointmentDate).toLocaleDateString('pl-PL', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {appointmentTime && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Godzina:</span>
                                            <span className={styles.value}>{appointmentTime}</span>
                                        </div>
                                    )}
                                    {doctorName && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Lekarz:</span>
                                            <span className={styles.value}>{doctorName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Deklaracja PRZED potwierdzeniem + ewentualna odmowa/błąd od serwera */}
                                {hasIdentifier && (confirmationStatus === 'idle' || confirmationStatus === 'confirming' || confirmationStatus === 'cancelling') && (
                                    <DeklaracjaPrzedPotwierdzeniem />
                                )}
                                {komunikat && confirmationStatus === 'idle' && (
                                    <p role="alert" style={{ marginTop: '1rem', color: '#f87171', fontWeight: 600 }}>{komunikat}</p>
                                )}

                                {hasIdentifier && !stanSprawdzony && confirmationStatus === 'idle' && (
                                    <p style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.7 }}>⏳ Sprawdzamy stan wizyty…</p>
                                )}

                                {/* Przyciski — tylko gdy link niesie token, stan jest znany i wizyta nie jest już potwierdzona ani odwołana */}
                                {hasIdentifier && stanSprawdzony && (confirmationStatus === 'idle' || confirmationStatus === 'confirming' || confirmationStatus === 'cancelling') && (
                                    <div style={{
                                        marginTop: '2rem',
                                        display: 'flex',
                                        gap: '1rem',
                                        justifyContent: 'center',
                                        flexWrap: 'wrap'
                                    }}>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={confirmationStatus === 'confirming'}
                                            style={{
                                                padding: '1rem 2rem',
                                                background: 'var(--color-primary)',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: 'var(--radius-md)',
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                cursor: confirmationStatus === 'confirming' ? 'wait' : 'pointer',
                                                opacity: confirmationStatus === 'confirming' ? 0.6 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {confirmationStatus === 'confirming' ? '⏳ Potwierdzanie...' : '✅ Potwierdzam Obecność'}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={confirmationStatus === 'cancelling'}
                                            style={{
                                                padding: '1rem 2rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'var(--color-text-main)',
                                                border: '2px solid rgba(239, 68, 68, 0.5)',
                                                borderRadius: 'var(--radius-md)',
                                                fontWeight: '600',
                                                fontSize: '1rem',
                                                cursor: confirmationStatus === 'cancelling' ? 'wait' : 'pointer',
                                                opacity: confirmationStatus === 'cancelling' ? 0.6 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {confirmationStatus === 'cancelling' ? '⏳ Odwoływanie...' : '❌ Odwołuję Wizytę'}
                                        </button>
                                    </div>
                                )}

                                {/* Confirmation Status Messages */}
                                {confirmationStatus === 'confirmed' && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.5rem',
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '2px solid rgba(16, 185, 129, 0.5)',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center',
                                        color: '#10b981',
                                        fontWeight: '600',
                                        fontSize: '1.1rem'
                                    }}>
                                        ✅ <strong>Wizyta potwierdzona!</strong><br />
                                        <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                                            Potwierdzenie zostało wysłane do lekarza.
                                        </span>
                                    </div>
                                )}
                                {(confirmationStatus === 'confirmed' || confirmationStatus === 'already-confirmed') && (
                                    <InformacjaPotwierdzonaWizyta tekst={komunikat ?? undefined} />
                                )}

                                {confirmationStatus === 'already-confirmed' && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.5rem',
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        border: '2px solid rgba(59, 130, 246, 0.5)',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center',
                                        color: '#3b82f6',
                                        fontWeight: '600',
                                        fontSize: '1.1rem'
                                    }}>
                                        ℹ️ <strong>Wizyta już potwierdzona</strong><br />
                                        <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                                            Ta wizyta została wcześniej potwierdzona.
                                        </span>
                                    </div>
                                )}

                                {confirmationStatus === 'already-cancelled' && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.5rem',
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        border: '2px solid rgba(59, 130, 246, 0.5)',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center',
                                        color: '#3b82f6',
                                        fontWeight: '600',
                                        fontSize: '1.1rem'
                                    }}>
                                        ℹ️ <strong>Zgłoszono odwołanie wizyty</strong><br />
                                        <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                                            {TEKST_WIZYTA_JUZ_ODWOLANA}
                                        </span><br />
                                        <a href={TELEFON_GABINETU_HREF} style={{ display: 'inline-block', marginTop: '0.75rem', color: '#3b82f6', textDecoration: 'underline' }}>
                                            📞 Zadzwoń: {TELEFON_GABINETU}
                                        </a>
                                    </div>
                                )}

                                {confirmationStatus === 'cancelled' && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1.5rem',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '2px solid rgba(239, 68, 68, 0.5)',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center',
                                        color: '#ef4444',
                                        fontWeight: '600',
                                        fontSize: '1.1rem'
                                    }}>
                                        ❌ <strong>Wizyta odwołana</strong><br />
                                        <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                                            Informacja została przekazana do gabinetu.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Important Notes Badges */}
            {instruction.important_notes && instruction.important_notes.length > 0 && (
                <section className={styles.importantNotes}>
                    <div className={styles.container}>
                        <div className={styles.notesGrid}>
                            {instruction.important_notes.map((note, index) => (
                                <div key={index} className={styles.noteBadge}>
                                    <span className={styles.noteIcon}>⚠️</span>
                                    <span>{note}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Main Content */}
            <section className={styles.content}>
                <div className={styles.container}>
                    <div className={styles.contentWrapper}>
                        {/* What to Bring */}
                        {instruction.what_to_bring && instruction.what_to_bring.length > 0 && (
                            <div className={styles.infoBox}>
                                <h3>🎒 Co zabrać ze sobą?</h3>
                                <ul>
                                    {instruction.what_to_bring.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Preparation Time */}
                        {instruction.preparation_time && (
                            <div className={styles.infoBox}>
                                <h3>⏰ Przygotowanie</h3>
                                <p><strong>{instruction.preparation_time}</strong></p>
                            </div>
                        )}

                        {/* HTML Content — sanitized at render (defense layer 2) */}
                        <div
                            className={styles.htmlContent}
                            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(instruction.content) }}
                        />
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className={styles.cta}>
                <div className={styles.container}>
                    <div className={styles.ctaBox}>
                        <h2>Masz pytania?</h2>
                        <p>Skontaktuj się z nami - chętnie odpowiemy!</p>
                        <div className={styles.ctaButtons}>
                            <a href={`tel:${formatPhoneForTel(brand.phone1)}`} className={`${styles.btn} ${styles.btnPrimary}`}>
                                📞 Zadzwoń: {TELEFON_GABINETU}
                            </a>
                            <Link href="/kontakt" className={`${styles.btn} ${styles.btnSecondary}`}>
                                ✉️ Napisz do nas
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
