"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import AppointmentScheduler from "./scheduler/AppointmentScheduler";
import { useTranslations } from "next-intl";

// Specialists Data
const SPECIALISTS = [
    { id: "marcin", name: "lek. dent. Marcin Nowosielski", role: "doctor" },
    { id: "ilona", name: "lek. dent. Ilona Piechaczek", role: "doctor" },
    { id: "katarzyna", name: "lek. dent. Katarzyna Halupczok", role: "doctor" },
    { id: "dominika", name: "lek. dent. Dominika Milicz", role: "doctor" },
    { id: "malgorzata", name: "hig. stom. Małgorzata Maćków-Huras", role: "hygienist" },
] as const;

// Service IDs per role (labels resolved via t())
const SERVICE_IDS = {
    doctor: [
        { id: "konsultacja" },
        { id: "bol" },
        { id: "implanty" },
        { id: "licowki" },
        { id: "ortodoncja" },
    ],
    hygienist: [
        { id: "higienizacja" },
        { id: "wybielanie" },
    ]
} as const;

export default function ReservationForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rodoConsent, setRodoConsent] = useState(false);
    const [intakeUrl, setIntakeUrl] = useState<string | null>(null);
    const t = useTranslations('reservationForm');

    // Build schema with translated validation messages
    const reservationSchema = z.object({
        firstName: z.string().min(2, t('validationFirstName')),
        lastName: z.string().min(2, t('validationLastName')),
        phone: z.string().min(9, t('validationPhone')),
        email: z.string().email(t('validationEmail')).optional().or(z.literal("")),
        specialist: z.string().min(1, t('validationSpecialist')),
        service: z.string().min(1, t('validationService')),
        date: z.string().min(1, t('validationDate')),
        time: z.string().min(1, t('validationDate')),
        description: z.string().optional(),
        attachment: z.any().optional(),
    });

    type ReservationFormData = z.infer<typeof reservationSchema>;

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors },
    } = useForm<ReservationFormData>({
        resolver: zodResolver(reservationSchema),
        defaultValues: {
            specialist: "",
            service: "",
            date: "",
            time: "",
            description: "",
        }
    });

    // Read query params from Pain Map links (client-side only)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const specialist = params.get('specialist');
        const reason = params.get('reason');
        if (specialist) setValue('specialist', specialist);
        if (reason) setValue('description', `Mapa Bólu: ${reason}`);
    }, [setValue]);

    const selectedSpecialistId = watch("specialist");
    const selectedDate = watch("date");
    const selectedTime = watch("time");

    // Derived values
    const selectedSpecialist = SPECIALISTS.find(s => s.id === selectedSpecialistId);
    const availableServices = selectedSpecialist
        ? (SERVICE_IDS[selectedSpecialist.role as keyof typeof SERVICE_IDS] || []).map(svc => ({ id: svc.id, label: t(svc.id) }))
        : [];

    // Reset service & slots when specialist changes
    useEffect(() => {
        setValue("service", "");
        setValue("date", "");
        setValue("time", "");
    }, [selectedSpecialistId, setValue]);

    const handleSlotSelect = (slot: { date: string, time: string, doctor: string } | null) => {
        if (slot) {
            setValue("date", slot.date);
            setValue("time", slot.time);
            trigger(["date", "time"]); // Validate immediately
        } else {
            setValue("date", "");
            setValue("time", "");
        }
    };

    const onSubmit = async (data: ReservationFormData) => {
        setIsSubmitting(true);
        setError(null);

        // Find formatted names for email
        const specialistName = SPECIALISTS.find(s => s.id === data.specialist)?.name || data.specialist;

        let attachmentData = null;
        if (data.attachment && data.attachment.length > 0) {
            const file = data.attachment[0];
            const reader = new FileReader();
            try {
                const base64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                attachmentData = {
                    name: file.name,
                    content: base64,
                    type: file.type
                };
            } catch (e) {
                console.error("File upload error", e);
            }
        }

        try {
            const response = await fetch("/api/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    name: `${data.firstName} ${data.lastName}`,
                    specialistName,
                    attachment: attachmentData
                }),
            });

            if (!response.ok) throw new Error(t('submitError'));

            const result = await response.json();
            if (result.intakeUrl) {
                setIntakeUrl(result.intakeUrl);
            }

            setIsSuccess(true);
        } catch (err) {
            setError(t('errorGeneral'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                padding: "3rem",
                borderRadius: "var(--radius-lg)",
                textAlign: "center",
                border: "1px solid var(--color-surface-hover)"
            }}>
                <div style={{ color: "var(--color-primary)", marginBottom: "1rem", display: 'flex', justifyContent: 'center' }}>
                    <CheckCircle className="w-16 h-16 text-[#dcb14a]" />
                </div>
                <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{t('successTitle')}</h3>
                <p style={{ color: "var(--color-text-muted)" }}>
                    {t('successMessage')}
                </p>

                {intakeUrl && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1.25rem',
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                    }}>
                        <p style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--color-text-main)', fontWeight: 500 }}>
                            📋 Pierwszy raz u nas?
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                            Prosimy o uzupełnienie e-Karty pacjenta — pozwoli to oszczędzić Twój czas przed wizytą
                            i przyspieszyć jej przebieg.
                        </p>
                        <a
                            href={intakeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block',
                                padding: '0.7rem 1.5rem',
                                background: 'var(--color-primary)',
                                color: 'black',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                transition: 'opacity 0.2s',
                            }}
                        >
                            Wypełnij e-Kartę pacjenta →
                        </a>
                    </div>
                )}

                <button
                    onClick={() => { setIsSuccess(false); setIntakeUrl(null); }}
                    style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                    {t('bookAnother')}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(10px)",
            padding: "2rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-surface-hover)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
        }}>
            {/* FIRST NAME & LAST NAME */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('firstNameLabel')} *</label>
                    <input
                        {...register("firstName")}
                        type="text"
                        placeholder={t('firstNamePlaceholder')}
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: errors.firstName ? "1px solid red" : "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            outline: "none"
                        }}
                    />
                    {errors.firstName && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.firstName.message}</p>}
                </div>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('lastNameLabel')} *</label>
                    <input
                        {...register("lastName")}
                        type="text"
                        placeholder={t('lastNamePlaceholder')}
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: errors.lastName ? "1px solid red" : "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            outline: "none"
                        }}
                    />
                    {errors.lastName && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.lastName.message}</p>}
                </div>
            </div>

            {/* PHONE & EMAIL GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('phoneLabel')} *</label>
                    <input
                        {...register("phone")}
                        type="tel"
                        placeholder={t('phonePlaceholder')}
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: errors.phone ? "1px solid red" : "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            outline: "none"
                        }}
                    />
                    {errors.phone && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.phone.message}</p>}
                </div>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('emailLabel')}</label>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: errors.email ? "1px solid red" : "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            outline: "none"
                        }}
                    />
                    {errors.email && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.email.message}</p>}
                </div>
            </div>

            {/* SPECIALIST */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('specialistLabel')} *</label>
                <select
                    {...register("specialist")}
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: errors.specialist ? "1px solid red" : "1px solid var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        outline: "none",
                        appearance: "none",
                    }}
                >
                    <option value="">{t('selectSpecialist')}</option>
                    {SPECIALISTS.map(spec => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                </select>
                {errors.specialist && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.specialist.message}</p>}
            </div>

            {/* SERVICE - CONDITIONAL */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('serviceLabel')} *</label>
                <select
                    {...register("service")}
                    disabled={!selectedSpecialist}
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: errors.service ? "1px solid red" : "1px solid var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        outline: "none",
                        appearance: "none",
                        opacity: !selectedSpecialist ? 0.5 : 1
                    }}
                >
                    <option value="">
                        {!selectedSpecialist ? t('selectService') : t('chooseService')}
                    </option>
                    {availableServices.map(svc => (
                        <option key={svc.id} value={svc.label}>{svc.label}</option>
                    ))}
                </select>
                {errors.service && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.service.message}</p>}
            </div>

            {/* NEW REAL-TIME SCHEDULER */}
            {
                selectedSpecialist && (
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                            {t('availableSlots')} * <span className="text-xs text-[#dcb14a]">({t('duration', { duration: selectedSpecialist.id === 'malgorzata' ? '60min' : '30min' })})</span>
                        </label>
                        <AppointmentScheduler
                            specialistId={selectedSpecialist.id}
                            specialistName={selectedSpecialist.name}
                            onSlotSelect={handleSlotSelect}
                        />
                        {/* Hidden inputs to hold values for react-hook-form validation */}
                        <input type="hidden" {...register("date")} />
                        <input type="hidden" {...register("time")} />

                        {(errors.date || errors.time) && (
                            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                                {t('dateError')}
                            </p>
                        )}

                        {selectedDate && selectedTime && (
                            <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#dcb14a" }}>
                                {t('selectedSlot', { date: selectedDate, time: selectedTime })}
                            </p>
                        )}
                    </div>
                )
            }

            {/* DESCRIPTION & PHOTO */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('descriptionLabel')}</label>
                <textarea
                    {...register("description")}
                    placeholder={t('descriptionPlaceholder')}
                    rows={3}
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px solid var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit"
                    }}
                />
            </div>

            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                    {t('attachmentLabel')} 📸
                </label>
                <input
                    {...register("attachment")}
                    type="file"
                    accept="image/*,.pdf"
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px dashed var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-muted)",
                        cursor: "pointer"
                    }}
                />
            </div>

            {/* INFO TEXT */}
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                {t('dataAdmin')}
            </p>

            {/* RODO CONSENT CHECKBOX */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                    type="checkbox"
                    id="rodo-consent-reservation"
                    checked={rodoConsent}
                    onChange={(e) => setRodoConsent(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: '#dcb14a', minWidth: '18px', minHeight: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="rodo-consent-reservation" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                    {t('rodoConsent')}{' '}
                    <a href="/rodo" target="_blank" style={{ color: '#dcb14a', textDecoration: 'underline' }}>{t('rodoClause')}</a>{' '}
                    {t('rodoAnd')}{' '}
                    <a href="/polityka-prywatnosci" target="_blank" style={{ color: '#dcb14a', textDecoration: 'underline' }}>{t('privacyPolicy')}</a>.
                </label>
            </div>

            {error && <div style={{ color: "#ff4d4d", background: "rgba(255, 0, 0, 0.1)", padding: "10px", borderRadius: "5px", fontSize: "0.9rem" }}>{error}</div>}

            <button
                type="submit"
                disabled={isSubmitting || !rodoConsent}
                className="btn-primary"
                style={{
                    width: "100%",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: (isSubmitting || !rodoConsent) ? 0.7 : 1,
                    cursor: (isSubmitting || !rodoConsent) ? "not-allowed" : "pointer"
                }}
            >
                {isSubmitting ? t('submitting') : t('submit')}
            </button>

            <style jsx>{`
                @media (max-width: 600px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </form >
    );
}
