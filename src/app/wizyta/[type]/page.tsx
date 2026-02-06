'use client';

import { useEffect, useState } from 'react';
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
    const [instruction, setInstruction] = useState<AppointmentInstruction | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

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

    // Extract query params from SMS
    const appointmentDate = searchParams.get('date');
    const appointmentTime = searchParams.get('time');
    const doctorName = searchParams.get('doctor');

    return (
        <div className={styles.page}>
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
                                <h3>📅 Szczegóły Wizyty</h3>
                                <div className={styles.detailsGrid}>
                                    {appointmentDate && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.label}>Data:</span>
                                            <span className={styles.value}>{new Date(appointmentDate).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
                            <a href="tel:+48774545225" className={`${styles.btn} ${styles.btnPrimary}`}>
                                📞 Zadzwoń: 77 454 52 25
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
