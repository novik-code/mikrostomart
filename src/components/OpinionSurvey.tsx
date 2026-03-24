'use client';

import React, { useState } from 'react';
import { useOpinion } from '@/context/OpinionContext';
import { X, Star, ChevronRight, ChevronLeft, Loader2, Copy, ExternalLink, MessageSquareHeart, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */

interface SurveyAnswers {
    isPatient: string;
    duration: string;
    procedures: string[];
    staffRating: number;
    comfortRating: number;
    whatYouLike: string;
    improvements: string;
    recommend: string;
}

// PROCEDURES_OPTIONS moved inside component to use t()

const GOOGLE_REVIEW_URL = 'https://g.page/r/CSYarbrDoYcDEAE/review';

/* ══════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════ */

export default function OpinionSurvey() {
    const { isOpen, closeSurvey } = useOpinion();
    const t = useTranslations('opinionSurvey');

    const PROCEDURES_OPTIONS = [
        t('proc1'), t('proc2'), t('proc3'), t('proc4'), t('proc5'),
        t('proc6'), t('proc7'), t('proc8'), t('proc9'), t('proc10'),
    ];
    const [step, setStep] = useState(0); // 0=survey, 1=loading, 2=result
    const [questionIdx, setQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<SurveyAnswers>({
        isPatient: '',
        duration: '',
        procedures: [],
        staffRating: 0,
        comfortRating: 0,
        whatYouLike: '',
        improvements: '',
        recommend: '',
    });
    const [generatedReview, setGeneratedReview] = useState('');
    const [sentiment, setSentiment] = useState<'positive' | 'negative' | ''>('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const resetAndClose = () => {
        setStep(0);
        setQuestionIdx(0);
        setAnswers({
            isPatient: '',
            duration: '',
            procedures: [],
            staffRating: 0,
            comfortRating: 0,
            whatYouLike: '',
            improvements: '',
            recommend: '',
        });
        setGeneratedReview('');
        setSentiment('');
        setCopied(false);
        closeSurvey();
    };

    /* ── Submit survey → generate review ────── */
    const handleSubmit = async () => {
        setStep(1);
        try {
            const res = await fetch('/api/generate-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });
            const data = await res.json();
            setSentiment(data.sentiment);
            setGeneratedReview(data.review || '');
            setStep(2);
        } catch {
            setSentiment('negative');
            setStep(2);
        }
    };

    /* ── Copy review text ────── */
    const handleCopy = () => {
        navigator.clipboard.writeText(generatedReview);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /* ── Questions definition ────── */
    const questions = [
        // Q0: isPatient
        {
            title: t('q0Title'),
            render: () => (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' }}>
                    {[t('q0Opt1'), t('q0Opt2')].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setAnswers(p => ({ ...p, isPatient: opt }))}
                            style={optionStyle(answers.isPatient === opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            ),
            valid: () => !!answers.isPatient,
        },
        // Q1: duration
        {
            title: t('q1Title'),
            render: () => (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' }}>
                    {[t('q1Opt1'), t('q1Opt2'), t('q1Opt3'), t('q1Opt4')].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setAnswers(p => ({ ...p, duration: opt }))}
                            style={optionStyle(answers.duration === opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            ),
            valid: () => !!answers.duration,
        },
        // Q2: procedures (multi-select)
        {
            title: t('q2Title'),
            subtitle: t('q2Subtitle'),
            render: () => (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.4rem' }}>
                    {PROCEDURES_OPTIONS.map(opt => {
                        const sel = answers.procedures.includes(opt);
                        return (
                            <button
                                key={opt}
                                onClick={() => setAnswers(p => ({
                                    ...p,
                                    procedures: sel
                                        ? p.procedures.filter(x => x !== opt)
                                        : [...p.procedures, opt],
                                }))}
                                style={{
                                    ...chipStyle(sel),
                                    fontSize: '0.8rem',
                                }}
                            >
                                {sel ? '✓ ' : ''}{opt}
                            </button>
                        );
                    })}
                </div>
            ),
            valid: () => answers.procedures.length > 0,
        },
        // Q3: staffRating
        {
            title: t('q3Title'),
            render: () => <StarRating value={answers.staffRating} onChange={v => setAnswers(p => ({ ...p, staffRating: v }))} />,
            valid: () => answers.staffRating > 0,
        },
        // Q4: comfortRating
        {
            title: t('q4Title'),
            render: () => <StarRating value={answers.comfortRating} onChange={v => setAnswers(p => ({ ...p, comfortRating: v }))} />,
            valid: () => answers.comfortRating > 0,
        },
        // Q5: whatYouLike
        {
            title: t('q5Title'),
            subtitle: t('q5Subtitle'),
            render: () => (
                <textarea
                    value={answers.whatYouLike}
                    onChange={e => setAnswers(p => ({ ...p, whatYouLike: e.target.value }))}
                    placeholder={t('q5Placeholder')}
                    rows={3}
                    style={textareaStyle}
                />
            ),
            valid: () => true, // optional
        },
        // Q6: improvements
        {
            title: t('q6Title'),
            subtitle: t('q6Subtitle'),
            render: () => (
                <textarea
                    value={answers.improvements}
                    onChange={e => setAnswers(p => ({ ...p, improvements: e.target.value }))}
                    placeholder={t('q6Placeholder')}
                    rows={3}
                    style={textareaStyle}
                />
            ),
            valid: () => true, // optional
        },
        // Q7: recommend
        {
            title: t('q7Title'),
            render: () => (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' }}>
                    {[t('q7Opt1'), t('q7Opt2'), t('q7Opt3'), t('q7Opt4')].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setAnswers(p => ({ ...p, recommend: opt }))}
                            style={optionStyle(answers.recommend === opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            ),
            valid: () => !!answers.recommend,
        },
    ];

    const currentQ = questions[questionIdx];
    const isLast = questionIdx === questions.length - 1;

    /* ══════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════ */
    return (
        <div
            onClick={resetAndClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #1a1f2e, #141822)',
                    border: '1px solid rgba(var(--color-primary-dark-rgb),0.15)',
                    borderRadius: '1rem',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    position: 'relative',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 30px rgba(var(--color-primary-dark-rgb),0.06)',
                }}
            >
                {/* Close button */}
                <button
                    onClick={resetAndClose}
                    style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                >
                    <X size={14} />
                </button>

                {/* ── STEP 0: Survey ── */}
                {step === 0 && (
                    <div style={{ padding: '2rem 1.5rem 1.5rem' }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>
                                <MessageSquareHeart size={32} style={{ color: '#d4af37' }} />
                            </div>
                            <h2 style={{
                                fontSize: '1.15rem',
                                fontWeight: '700',
                                color: '#fff',
                                margin: 0,
                                letterSpacing: '-0.01em',
                            }}>
                                {t('headerTitle')}
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>
                                {t('headerSubtitle')}
                            </p>
                        </div>

                        {/* Progress */}
                        <div style={{ display: 'flex', gap: '3px', marginBottom: '1.5rem' }}>
                            {questions.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: '3px',
                                        borderRadius: '2px',
                                        background: i <= questionIdx ? '#d4af37' : 'rgba(255,255,255,0.08)',
                                        transition: 'background 0.3s',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Question */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                color: '#fff',
                                marginBottom: '0.3rem',
                            }}>
                                {currentQ.title}
                            </h3>
                            {'subtitle' in currentQ && currentQ.subtitle && (
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem', marginTop: 0 }}>
                                    {currentQ.subtitle}
                                </p>
                            )}
                            {currentQ.render()}
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={() => setQuestionIdx(i => Math.max(0, i - 1))}
                                disabled={questionIdx === 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    background: 'none',
                                    border: 'none',
                                    color: questionIdx === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                                    cursor: questionIdx === 0 ? 'default' : 'pointer',
                                    fontSize: '0.8rem',
                                    padding: '0.5rem',
                                }}
                            >
                                <ChevronLeft size={16} /> {t('back')}
                            </button>

                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                                {questionIdx + 1} / {questions.length}
                            </span>

                            {isLast ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!currentQ.valid()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        background: currentQ.valid() ? 'linear-gradient(135deg, #d4af37, #b8942e)' : 'rgba(255,255,255,0.05)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        color: currentQ.valid() ? '#000' : 'rgba(255,255,255,0.2)',
                                        cursor: currentQ.valid() ? 'pointer' : 'not-allowed',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                    }}
                                >
                                    {t('generateReview')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setQuestionIdx(i => Math.min(questions.length - 1, i + 1))}
                                    disabled={!currentQ.valid()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        background: currentQ.valid() ? 'rgba(var(--color-primary-dark-rgb),0.12)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${currentQ.valid() ? 'rgba(var(--color-primary-dark-rgb),0.3)' : 'rgba(255,255,255,0.06)'}`,
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        color: currentQ.valid() ? '#d4af37' : 'rgba(255,255,255,0.15)',
                                        cursor: currentQ.valid() ? 'pointer' : 'not-allowed',
                                        fontSize: '0.85rem',
                                        fontWeight: '500',
                                    }}
                                >
                                    {t('next')} <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── STEP 1: Loading ── */}
                {step === 1 && (
                    <div style={{
                        padding: '3rem 1.5rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                    }}>
                        <Loader2 size={36} style={{ color: '#d4af37', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
                            {t('loading')}
                        </p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* ── STEP 2: Result ── */}
                {step === 2 && (
                    <div style={{ padding: '2rem 1.5rem' }}>
                        {sentiment === 'positive' ? (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⭐</div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                                        {t('resultTitle')}
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>
                                        {t('resultSubtitle')}
                                    </p>
                                </div>

                                {/* Generated review */}
                                <div style={{
                                    background: 'rgba(var(--color-primary-dark-rgb),0.06)',
                                    border: '1px solid rgba(var(--color-primary-dark-rgb),0.15)',
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    position: 'relative',
                                }}>
                                    <p style={{
                                        color: 'rgba(255,255,255,0.85)',
                                        fontSize: '0.88rem',
                                        lineHeight: '1.6',
                                        margin: 0,
                                        fontStyle: 'italic',
                                    }}>
                                        &ldquo;{generatedReview}&rdquo;
                                    </p>
                                </div>

                                {/* CTA: Copy + Open Google */}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedReview);
                                        setCopied(true);
                                        setTimeout(() => {
                                            window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
                                        }, 300);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: copied ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #4285F4, #34A853)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem',
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    {copied ? (
                                        <><Check size={16} /> {t('copiedOpening')}</>
                                    ) : (
                                        <><ExternalLink size={16} /> {t('submitGoogle')}</>
                                    )}
                                </button>

                                <div style={{
                                    textAlign: 'center',
                                    marginTop: '0.75rem',
                                    padding: '0.6rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <p dangerouslySetInnerHTML={{ __html: t('pasteHint') }} style={{
                                        color: 'rgba(255,255,255,0.45)',
                                        fontSize: '0.75rem',
                                        margin: 0,
                                        lineHeight: 1.5,
                                        }} />
                                </div>

                        {/* Manual copy fallback */}
                        <button
                            onClick={handleCopy}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                margin: '0.75rem auto 0',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                            }}
                        >
                            <Copy size={12} /> {copied ? t('copied') : t('copyManual')}
                        </button>
                    </>
                ) : (
                /* Negative sentiment */
                <>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🙏</div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: '0 0 0.75rem' }}>
                            {t('negativeTitle')}
                        </h2>
                        <p style={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: '0.88rem',
                            lineHeight: '1.6',
                            maxWidth: '360px',
                            margin: '0 auto 1.25rem',
                        }}>
                            {t('negativeBody')}
                        </p>
                        <p style={{
                            color: 'rgba(var(--color-primary-dark-rgb),0.7)',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                        }}>
                            {t('negativeFooter')}
                        </p>
                    </div>
                </>
                        )}

                {/* Close */}
                <button
                    onClick={resetAndClose}
                    style={{
                        display: 'block',
                        margin: '1.25rem auto 0',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                    }}
                >
                    {t('close')}
                </button>
            </div>
                )}
        </div>
        </div >
    );
}

/* ══════════════════════════════════════════════════════
   SUB-COMPONENTS & STYLES
   ══════════════════════════════════════════════════════ */

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hover, setHover] = useState(0);
    return (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', padding: '0.5rem 0' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(0)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        transition: 'transform 0.15s',
                        transform: (hover || value) >= i ? 'scale(1.15)' : 'scale(1)',
                    }}
                >
                    <Star
                        size={32}
                        fill={(hover || value) >= i ? '#d4af37' : 'none'}
                        stroke={(hover || value) >= i ? '#d4af37' : 'rgba(255,255,255,0.2)'}
                        strokeWidth={1.5}
                    />
                </button>
            ))}
        </div>
    );
}

const optionStyle = (selected: boolean): React.CSSProperties => ({
    padding: '0.65rem 1rem',
    background: selected ? 'rgba(var(--color-primary-dark-rgb),0.12)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${selected ? 'rgba(var(--color-primary-dark-rgb),0.35)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '0.5rem',
    color: selected ? '#d4af37' : 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: selected ? '600' : '400',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
});

const chipStyle = (selected: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.75rem',
    background: selected ? 'rgba(var(--color-primary-dark-rgb),0.15)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${selected ? 'rgba(var(--color-primary-dark-rgb),0.3)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '2rem',
    color: selected ? '#d4af37' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontWeight: selected ? '600' : '400',
    transition: 'all 0.2s',
});

const textareaStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.5rem',
    padding: '0.65rem 0.85rem',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    lineHeight: '1.5',
};
