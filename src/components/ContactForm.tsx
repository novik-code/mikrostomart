"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";

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
    const t = useTranslations('contactForm');

    // Cloudflare Turnstile state (replaces math captcha — better UX, anti-bot)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance | null>(null);
    // Honeypot kept as belt-and-suspenders defense alongside Turnstile (zero UX cost)
    const [honeypot, setHoneypot] = useState("");
    // RODO consent
    const [rodoConsent, setRodoConsent] = useState(false);

    // Cloudflare Turnstile site key. NEXT_PUBLIC_TURNSTILE_SITE_KEY env var is
    // the preferred source (visible in dashboard, can be rotated). Hardcoded
    // fallback below exists so the widget renders even when the env var didn't
    // make it into the bundle (e.g. Vercel "Sensitive" flag stripped it from
    // client-side injection, or Preview env scope missing). Site key is PUBLIC
    // by Cloudflare design — it appears in the rendered HTML/JS bundle
    // anyway, so there's no secrecy loss in hardcoding the fallback. The
    // matching SECRET key (server-side) stays in env vars and is what actually
    // authorizes verification.
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        || '0x4AAAAAADN3DS_czkcNj-aD';

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
        // Honeypot check — bots auto-fill hidden fields. Fail silently.
        if (honeypot) {
            setIsSuccess(true);
            return;
        }

        // Turnstile token must be present before submission. Submit button is
        // already disabled until widget completes, but guard here for safety.
        if (!turnstileToken) {
            setError(t('captchaError') || 'Please complete the verification challenge.');
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
                    attachment: attachmentData,
                    turnstileToken,
                }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(t('errorRateLimit') || 'Too many messages. Please wait a few minutes.');
                }
                if (response.status === 403) {
                    throw new Error(t('errorVerification') || 'Verification failed. Please refresh and try again.');
                }
                throw new Error("Błąd wysyłania wiadomości");
            }

            setIsSuccess(true);
            reset();
            setFileName(null);
            setTurnstileToken(null);
            turnstileRef.current?.reset(); // re-issue a fresh challenge for next submit

        } catch (err) {
            setError(err instanceof Error ? err.message : t('errorGeneral'));
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
                <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{t('successTitle')}</h3>
                <p style={{ color: "var(--color-text-muted)" }}>
                    {t('successMessage')}
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                    {t('sendAnother')}
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('nameLabel')} *</label>
                <input
                    {...register("name")}
                    type="text"
                    placeholder={t('namePlaceholder')}
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('emailLabel')} *</label>
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

            {/* SUBJECT (NEW) */}
            <div className="form-group">
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('subjectLabel')} *</label>
                <input
                    {...register("subject")}
                    type="text"
                    placeholder={t('subjectPlaceholder')}
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('messageLabel')} *</label>
                <textarea
                    {...register("message")}
                    placeholder={t('messagePlaceholder')}
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t('attachmentLabel')}</label>
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
                        <span>{fileName || t('selectFile')}</span>
                    </label>
                </div>
                {errors.attachment && <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.attachment.message as string}</p>}
            </div>


            {error && <div style={{ color: "#ff4d4d", background: "rgba(255, 0, 0, 0.1)", padding: "10px", borderRadius: "5px", fontSize: "0.9rem" }}>{error}</div>}

            {/* CLOUDFLARE TURNSTILE — invisible challenge, replaces math captcha (better UX, harder for bots) */}
            {turnstileSiteKey && (
                <div style={{ display: 'flex', justifyContent: 'center', minHeight: '70px' }}>
                    <Turnstile
                        ref={turnstileRef}
                        siteKey={turnstileSiteKey}
                        onSuccess={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                        options={{
                            theme: 'dark',
                            size: 'normal',
                        }}
                    />
                </div>
            )}

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
                    style={{ marginTop: '3px', accentColor: 'var(--color-primary)', minWidth: '18px', minHeight: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="rodo-consent-contact" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                    {t('rodoConsent')}{' '}
                    <a href="/rodo" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{t('rodoClause')}</a>{' '}
                    {t('rodoAnd')}{' '}
                    <a href="/polityka-prywatnosci" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{t('privacyPolicy')}</a>.
                </label>
            </div>

            <button
                type="submit"
                disabled={isSubmitting || !rodoConsent || !turnstileToken}
                className="btn-primary"
                style={{
                    width: "100%",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: (isSubmitting || !rodoConsent || !turnstileToken) ? 0.7 : 1,
                    cursor: (isSubmitting || !rodoConsent || !turnstileToken) ? "not-allowed" : "pointer",
                    marginTop: "0.5rem"
                }}
            >
                {isSubmitting ? t('submitting') : t('submit')}
            </button>

        </form>
    );
}
