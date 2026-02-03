"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import AppointmentScheduler from "./scheduler/AppointmentScheduler";

// Specialists Data
const SPECIALISTS = [
    { id: "marcin", name: "lek. dent. Marcin Nowosielski", role: "doctor" },
    { id: "ilona", name: "lek. dent. Ilona Piechaczek", role: "doctor" },
    { id: "katarzyna", name: "lek. dent. Katarzyna Halupczok", role: "doctor" },
    { id: "dominika", name: "lek. dent. Dominika Walecko", role: "doctor" },
    { id: "malgorzata", name: "hig. stom. Małgorzata Maćków-Huras", role: "hygienist" },
] as const;

// Services Data
const SERVICES = {
    doctor: [
        { id: "konsultacja", label: "Konsultacja Wstępna" },
        { id: "bol", label: "Pomoc doraźna (Ból)" },
        { id: "implanty", label: "Implanty" },
        { id: "licowki", label: "Licówki / Metamorfoza" },
        { id: "ortodoncja", label: "Ortodoncja (Nakładki)" },
    ],
    hygienist: [
        { id: "higienizacja", label: "Higienizacja (Profilaktyka)" },
        { id: "wybielanie", label: "Wybielanie Zębów" },
    ]
};

// Schema Validation
const reservationSchema = z.object({
    name: z.string().min(3, "Imię i nazwisko jest wymagane (min. 3 znaki)"),
    phone: z.string().min(9, "Numer telefonu jest wymagany (min. 9 znaków)"),
    email: z.string().email("Podaj poprawny adres email").optional().or(z.literal("")),
    specialist: z.string().min(1, "Wybierz specjalistę"),
    service: z.string().min(1, "Wybierz rodzaj usługi"),
    date: z.string().min(1, "Wybierz termin z kalendarza"), // Populated by Scheduler
    time: z.string().min(1, "Wybierz termin z kalendarza"), // Populated by Scheduler
    description: z.string().optional(),
    attachment: z.any().optional(),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

export default function ReservationForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            time: ""
        }
    });

    const selectedSpecialistId = watch("specialist");
    const selectedDate = watch("date");
    const selectedTime = watch("time");

    // Derived values
    const selectedSpecialist = SPECIALISTS.find(s => s.id === selectedSpecialistId);
    const availableServices = selectedSpecialist
        ? SERVICES[selectedSpecialist.role as keyof typeof SERVICES] || []
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
                    specialistName,
                    attachment: attachmentData
                }),
            });

            if (!response.ok) throw new Error("Błąd wysyłania formularza");

            setIsSuccess(true);
        } catch (err) {
            setError("Wystąpił błąd. Spróbuj ponownie lub zadzwoń.");
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
                <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Dziękujemy za zgłoszenie!</h3>
                <p style={{ color: "var(--color-text-muted)" }}>
                    Twój termin został wstępnie zarezerwowany.<br />
                    Otrzymasz potwierdzenie mailowe oraz telefoniczne.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                    Umów kolejną wizytę
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
            {/* NAME */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Imię i Nazwisko *</label>
                <input
                    {...register("name")}
                    type="text"
                    placeholder="np. Jan Kowalski"
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: errors.name ? "1px solid red" : "1px solid var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        outline: "none"
                    }}
                />
                {errors.name && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.name.message}</p>}
            </div>

            {/* PHONE & EMAIL GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Telefon *</label>
                    <input
                        {...register("phone")}
                        type="tel"
                        placeholder="np. 500 123 456"
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
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Email (opcjonalnie)</label>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="kontakt@example.com"
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Specjalista *</label>
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
                    <option value="">Wybierz lekarza lub higienistkę...</option>
                    {SPECIALISTS.map(spec => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                </select>
                {errors.specialist && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.specialist.message}</p>}
            </div>

            {/* SERVICE - CONDITIONAL */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Usługa *</label>
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
                        {!selectedSpecialist ? "Najpierw wybierz specjalistę" : "Wybierz usługę..."}
                    </option>
                    {availableServices.map(svc => (
                        <option key={svc.id} value={svc.label}>{svc.label}</option>
                    ))}
                </select>
                {errors.service && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.service.message}</p>}
            </div>

            {/* NEW REAL-TIME SCHEDULER */}
            {selectedSpecialist && (
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                        Dostępne Terminy * <span className="text-xs text-[#dcb14a]">(Czas trwania: {selectedSpecialist.id === 'malgorzata' ? '60min' : '30min'})</span>
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
                            Proszę wybrać termin z powyższego kalendarza.
                        </p>
                    )}

                    {selectedDate && selectedTime && (
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#dcb14a" }}>
                            Wybrano: <strong>{selectedDate}, godz. {selectedTime}</strong>
                        </p>
                    )}
                </div>
            )}

            {/* DESCRIPTION & PHOTO */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Opis problemu (Opcjonalnie)</label>
                <textarea
                    {...register("description")}
                    placeholder="Opisz krótko z czym się zgłaszasz..."
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
                    Zdjęcie RVG / Pantomogram (Opcjonalnie) 📸
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
                Administratorem Twoich danych osobowych jest Mikrostomart. Dane będą przetwarzane w celu obsługi zgłoszenia.
            </p>

            {error && <div style={{ color: "#ff4d4d", background: "rgba(255, 0, 0, 0.1)", padding: "10px", borderRadius: "5px", fontSize: "0.9rem" }}>{error}</div>}

            <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                    width: "100%",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? "wait" : "pointer"
                }}
            >
                {isSubmitting ? "Wysyłanie..." : "Umów Wizytę"}
            </button>

            <style jsx>{`
                @media (max-width: 600px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </form>
    );
}
