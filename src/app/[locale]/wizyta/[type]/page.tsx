'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import styles from './appointment.module.css';

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

    // Extract appointment details from URL
    const appointmentId = searchParams.get('appointmentId');
    const appointmentDate = searchParams.get('date');
    const appointmentTime = searchParams.get('time');
    const doctorName = searchParams.get('doctor');
    const patientId = searchParams.get('patientId');

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

    const handleConfirm = async () => {
        if (!appointmentId) {
            alert('Brak ID wizyty');
            return;
        }

        setConfirmationStatus('confirming');

        try {
            const res = await fetch('/api/appointments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId,
                    patientId,
                    prodentisId: appointmentId
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Check if already confirmed
                if (data.alreadyConfirmed) {
                    setConfirmationStatus('already-confirmed');
                } else {
                    setConfirmationStatus('confirmed');
                }
            } else {
                throw new Error(data.error || 'Confirmation failed');
            }
        } catch (error) {
            console.error('[Confirm] Error:', error);
            alert('Wystąpił błąd. Spróbuj ponownie.');
            setConfirmationStatus('idle');
        }
    };

    const handleCancel = async () => {
        if (!appointmentId) {
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
                    appointmentId,
                    patientId,
                    prodentisId: appointmentId
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Check if already cancelled
                if (data.alreadyCancelled) {
                    setConfirmationStatus('already-cancelled');
                } else {
                    setConfirmationStatus('cancelled');
                }
            } else {
                throw new Error(data.error || 'Cancellation failed');
            }
        } catch (error) {
            console.error('[Cancel] Error:', error);
            alert('Wystąpił błąd. Spróbuj ponownie.');
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
                <a href="/" className={styles.backHome}>Wróć do strony głównej</a>
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
                                            <span className={styles.value}>Dr {doctorName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirmation Buttons - Only show if appointmentId exists */}
                                {appointmentId && confirmationStatus !== 'confirmed' && confirmationStatus !== 'cancelled' && (
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
                                        ℹ️ <strong>Wizyta już odwołana</strong><br />
                                        <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                                            Ta wizyta została wcześniej odwołana.
                                        </span>
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

                        {/* HTML Content */}
                        <div
                            className={styles.htmlContent}
                            dangerouslySetInnerHTML={{ __html: instruction.content }}
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
                            <a href="tel:+48570270470" className={`${styles.btn} ${styles.btnPrimary}`}>
                                📞 Zadzwoń: 570 270 470
                            </a>
                            <a href="/kontakt" className={`${styles.btn} ${styles.btnSecondary}`}>
                                ✉️ Napisz do nas
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
