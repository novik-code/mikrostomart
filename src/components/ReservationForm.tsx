"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, CheckCircle, Loader2 } from "lucide-react"; // Assuming lucide-react is available, else I'll use text or basic svgs

// Schema Validation
const reservationSchema = z.object({
    name: z.string().min(3, "Imię i nwisko jest wymagane (min. 3 znaki)"),
    phone: z.string().min(9, "Numer telefonu jest wymagany (min. 9 znaków)"),
    email: z.string().email("Podaj poprawny adres email").optional().or(z.literal("")),
    service: z.string().min(1, "Wybierz rodzaj usługi"),
    date: z.string().min(1, "Wybierz preferowaną datę"),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

export default function ReservationForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReservationFormData>({
        resolver: zodResolver(reservationSchema),
        defaultValues: {
            service: "konsultacja",
        }
    });

    const onSubmit = async (data: ReservationFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "reservation", ...data }),
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
                    <span style={{ fontSize: '3rem' }}>✨</span>
                </div>
                <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Dziękujemy za zgłoszenie!</h3>
                <p style={{ color: "var(--color-text-muted)" }}>
                    Skontaktujemy się z Tobą telefonicznie w celu potwierdzenia terminu.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                    Wyślij kolejne zgłoszenie
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

            {/* SERVICE & DATE GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Usługa *</label>
                    <select
                        {...register("service")}
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: errors.service ? "1px solid red" : "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            outline: "none",
                            appearance: "none", // Remove default arrow in some browsers
                        }}
                    >
                        <option value="konsultacja">Konsultacja Wstępna</option>
                        <option value="higiena">Higienizacja / Wybielanie</option>
                        <option value="implanty">Implanty</option>
                        <option value="licowki">Licówki / Metamorfoza</option>
                        <option value="ortodoncja">Ortodoncja (Nakładki)</option>
                        <option value="bol">Ból zęba (Pilne)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Preferowana Data *</label>
                    <input
                        {...register("date")}
                        type="date"
                        min={new Date().toISOString().split('T')[0]} // Disable past dates
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            background: "rgba(0, 0, 0, 0.2)",
                            border: errors.date ? "1px solid red" : "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            colorScheme: "dark", // Ensures calendar popup is dark mode friendly
                            outline: "none"
                        }}
                    />
                    {errors.date && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.date.message}</p>}
                </div>
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
                /* Little helper for mobile grid reset if needed */
                @media (max-width: 600px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </form>
    );
}
