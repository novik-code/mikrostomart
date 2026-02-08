"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X } from "lucide-react"; // Assuming lucide-react is available, if not I'll use text or check imports.

// Schema Validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const contactSchema = z.object({
    name: z.string().min(3, "Imię jest wymagane (min. 3 znaki)"),
    email: z.string().email("Podaj poprawny adres email"),
    subject: z.string().min(3, "Temat jest wymagany"),
    message: z.string().min(10, "Wiadomość musi mieć min. 10 znaków"),
    attachment: z
        .any()
        .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Maksymalny rozmiar pliku to 5MB.`)
        .refine(
            (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files[0].type),
            "Dozwolone formaty: .jpg, .png, .pdf"
        )
        .optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    // Captcha State
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [userAnswer, setUserAnswer] = useState("");
    // Honeypot (anti-bot)
    const [honeypot, setHoneypot] = useState("");
    // RODO consent
    const [rodoConsent, setRodoConsent] = useState(false);

    useEffect(() => {
        setNum1(Math.floor(Math.random() * 10) + 1);
        setNum2(Math.floor(Math.random() * 10) + 1);
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
    });

    const fileRef = watch("attachment");

    useEffect(() => {
        if (fileRef && fileRef.length > 0) {
            setFileName(fileRef[0].name);
        } else {
            setFileName(null);
        }
    }, [fileRef]);


    const onSubmit = async (data: ContactFormData) => {
        // Honeypot check — bots fill hidden fields
        if (honeypot) {
            // Silently "succeed" to fool the bot
            setIsSuccess(true);
            return;
        }

        // Captcha Validation
        if (parseInt(userAnswer) !== num1 + num2) {
            setError(`Błędny wynik działania. Ile to jest ${num1} + ${num2}?`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let attachmentData = null;

            // Handle File Conversion to Base64
            if (data.attachment && data.attachment.length > 0) {
                const file = data.attachment[0];
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });
                attachmentData = {
                    name: file.name,
                    content: base64, // Data URL string
                    type: file.type
                };
            }

            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "contact",
                    name: data.name,
                    email: data.email,
                    subject: data.subject,
                    message: data.message,
                    attachment: attachmentData
                }),
            });

            if (!response.ok) throw new Error("Błąd wysyłania wiadomości");

            setIsSuccess(true);
            reset();
            setFileName(null);
            setUserAnswer("");
            // Regenerate Captcha
            setNum1(Math.floor(Math.random() * 10) + 1);
            setNum2(Math.floor(Math.random() * 10) + 1);

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

            {/* SUBJECT (NEW) */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Temat *</label>
                <input
                    {...register("subject")}
                    type="text"
                    placeholder="Czego dotyczy wiadomość?"
                    style={{
                        width: "100%",
                        padding: "0.8rem",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: errors.subject ? "1px solid red" : "1px solid var(--color-surface-hover)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-main)",
                        outline: "none"
                    }}
                />
                {errors.subject && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.subject.message}</p>}
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

            {/* ATTACHMENT (NEW) */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Załącznik (max 5MB)</label>
                <div style={{ position: "relative" }}>
                    <input
                        {...register("attachment")}
                        id="attachment-upload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        style={{
                            width: "0.1px",
                            height: "0.1px",
                            opacity: 0,
                            overflow: "hidden",
                            position: "absolute",
                            zIndex: -1
                        }}
                    />
                    <label
                        htmlFor="attachment-upload"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.8rem 1.2rem",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px dashed var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-primary)",
                            cursor: "pointer",
                            transition: "background 0.3s ease",
                            width: "100%",
                            justifyContent: "center"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                    >
                        <Paperclip size={18} />
                        <span>{fileName || "Wybierz plik (JPG, PNG, PDF)"}</span>
                    </label>
                </div>
                {errors.attachment && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.attachment.message as string}</p>}
            </div>


            {error && <div style={{ color: "#ff4d4d", background: "rgba(255, 0, 0, 0.1)", padding: "10px", borderRadius: "5px", fontSize: "0.9rem" }}>{error}</div>}

            {/* MATH CAPTCHA */}
            <div style={{
                background: "rgba(0,0,0,0.2)",
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-surface-hover)",
            }}>
                <label style={{ display: "block", marginBottom: "0.8rem", fontSize: "0.9rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Weryfikacja
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                        color: "var(--color-primary)",
                        background: "rgba(255,255,255,0.05)",
                        padding: "0.5rem 1rem",
                        borderRadius: "4px",
                        letterSpacing: "2px"
                    }}>
                        {num1} + {num2} = ?
                    </div>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Wynik"
                        style={{
                            width: "80px",
                            padding: "0.6rem",
                            background: "rgba(255, 255, 255, 0.1)",
                            border: "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-text-main)",
                            outline: "none",
                            textAlign: "center",
                            fontSize: "0.9rem"
                        }}
                    />
                </div>
            </div>

            {/* HONEYPOT — hidden from humans, bots auto-fill */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                    type="text"
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                />
            </div>

            {/* RODO CONSENT CHECKBOX */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                    type="checkbox"
                    id="rodo-consent-contact"
                    checked={rodoConsent}
                    onChange={(e) => setRodoConsent(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: '#dcb14a', minWidth: '18px', minHeight: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="rodo-consent-contact" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                    Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zapytania, zgodnie z{' '}
                    <a href="/rodo" target="_blank" style={{ color: '#dcb14a', textDecoration: 'underline' }}>Klauzulą RODO</a>{' '}
                    oraz{' '}
                    <a href="/polityka-prywatnosci" target="_blank" style={{ color: '#dcb14a', textDecoration: 'underline' }}>Polityką Prywatności</a>.
                </label>
            </div>

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
                    cursor: (isSubmitting || !rodoConsent) ? "not-allowed" : "pointer",
                    marginTop: "0.5rem"
                }}
            >
                {isSubmitting ? "Wysyłanie..." : "Wyślij Wiadomość"}
            </button>

        </form>
    );
}
