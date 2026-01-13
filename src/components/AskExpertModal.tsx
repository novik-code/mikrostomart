"use client";

import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AskExpertModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AskExpertModal({ isOpen, onClose }: AskExpertModalProps) {
    const [question, setQuestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase.from('article_ideas').insert({
                question: question.trim()
            });

            if (insertError) throw insertError;

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setQuestion('');
            }, 6000);

        } catch (err: any) {
            setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.3s ease-out'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                width: '100%',
                maxWidth: '500px',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                animation: 'slideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                {isSuccess ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: 'var(--color-secondary)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            fontSize: '2rem'
                        }}>
                            ✅
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                            Pytanie wysłane!
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                            Dziękujemy za inspirację. Nasi eksperci już pracują nad odpowiedzią.
                            Artykuł pojawi się w Bazie Wiedzy w najbliższych dniach.
                        </p>
                    </div>
                ) : (
                    <>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                            Zadaj Pytanie 🧠
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Masz pytanie o zdrowie zębów? Zadaj je tutaj. Stworzymy na jego podstawie rzetelny artykuł poradnikowy.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Np. Czy wybielanie zębów boli? Czym różni się licówka od korony?"
                                required
                                rows={4}
                                style={{
                                    width: '100%',
                                    background: 'var(--color-background)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    color: 'var(--color-text)',
                                    fontSize: '1rem',
                                    marginBottom: '1.5rem',
                                    resize: 'none',
                                    outline: 'none'
                                }}
                            />

                            {error && (
                                <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || question.length < 5}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: 'var(--color-primary)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: isSubmitting || question.length < 5 ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting || question.length < 5 ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                Wyślij Pytanie
                            </button>
                        </form>
                    </>
                )}
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
