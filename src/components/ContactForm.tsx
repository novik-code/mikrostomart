"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema Validation
const contactSchema = z.object({
    name: z.string().min(3, "Imię jest wymagane (min. 3 znaki)"),
    email: z.string().email("Podaj poprawny adres email"),
    message: z.string().min(10, "Wiadomość musi mieć min. 10 znaków"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
    });

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "contact", ...data }),
            });

            if (!response.ok) throw new Error("Błąd wysyłania wiadomości");

            setIsSuccess(true);
        } catch (err) {
            setError("Wystąpił błąd. Spróbuj ponownie.");
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
                    <span style={{ fontSize: '3rem' }}>📬</span>
                </div>
                <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Wiadomość Wysłana!</h3>
                <p style={{ color: "var(--color-text-muted)" }}>
                    Odpowiemy najszybciej jak to możliwe (zazwyczaj do 24h).
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                    Wyślij kolejną wiadomość
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Imię *</label>
                <input
                    {...register("name")}
                    type="text"
                    placeholder="Twoje imię"
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

            {/* EMAIL */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Email *</label>
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

            {/* MESSAGE */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Wiadomość *</label>
                <textarea
                    {...register("message")}
                    placeholder="W czym możemy pomóc?"
                    rows={5}
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: errors.message ? "1px solid red" : "1px solid var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        outline: "none",
                        resize: "vertical"
                    }}
                />
                {errors.message && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.message.message}</p>}
            </div>

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
                {isSubmitting ? "Wysyłanie..." : "Wyślij Wiadomość"}
            </button>
        </form>
    );
}
