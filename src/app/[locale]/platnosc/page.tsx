'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';

function PaymentStatus() {
    const params = useSearchParams();
    const status = params.get('status');
    const provider = params.get('provider') || 'payu';
    const orderId = params.get('orderId') || params.get('token') || '';

    const isSuccess = status === 'return' || status === 'success';
    const isCancelled = status === 'cancel' || status === 'error';

    // Trigger /api/order-confirmation for PayU/P24 return URL. The server
    // reads orders.status — after S2-3 this only flips to 'paid' once the
    // verified webhook fires, which can lag the user's redirect by 1–10s.
    // So we poll: retry every 2s up to ~20s, stop on first success or
    // explicit failure. Safe to repeat (markOrderPaid + email path are
    // idempotent on status='paid').
    const confirmFired = useRef(false);
    useEffect(() => {
        if (confirmFired.current) return;
        if (!isSuccess || !orderId) return;
        confirmFired.current = true;

        let cancelled = false;
        const POLL_INTERVAL_MS = 2000;
        const MAX_ATTEMPTS = 10; // ~20s total
        let attempts = 0;

        const tick = async () => {
            if (cancelled) return;
            attempts += 1;
            try {
                const res = await fetch('/api/order-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId }),
                });
                if (res.status === 202 && attempts < MAX_ATTEMPTS) {
                    // Webhook hasn't fired yet; retry shortly
                    setTimeout(tick, POLL_INTERVAL_MS);
                }
                // 200 (paid) / 4xx (terminal) / max attempts → stop
            } catch (err) {
                console.error('[Platnosc] order-confirmation error:', err);
                if (attempts < MAX_ATTEMPTS) setTimeout(tick, POLL_INTERVAL_MS);
            }
        };

        tick();
        return () => { cancelled = true; };
    }, [isSuccess, orderId]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-background)',
            padding: '2rem',
        }}>
            <div style={{
                maxWidth: 480,
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '2.5rem',
                textAlign: 'center',
            }}>
                {isCancelled ? (
                    <>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>❌</div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#ef4444' }}>
                            Płatność anulowana
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
                            Płatność została anulowana lub wystąpił błąd. Twój koszyk jest nienaruszony — możesz spróbować ponownie.
                        </p>
                        <Link href="/koszyk" className="btn-primary" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                            Wróć do koszyka
                        </Link>
                        <br />
                        <Link href="/" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            Strona główna
                        </Link>
                    </>
                ) : isSuccess ? (
                    <>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(16,185,129,0.15)',
                            border: '2px solid rgba(16,185,129,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', margin: '0 auto 1.5rem',
                        }}>✅</div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: '700', marginBottom: '0.5rem', color: '#10b981' }}>
                            Płatność zrealizowana!
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                            Dziękujemy! Twoja płatność jest przetwarzana. Potwierdzenie zostanie wysłane na podany adres email.
                        </p>
                        {orderId && (
                            <div style={{
                                padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)',
                                borderRadius: '8px', fontSize: '0.8rem',
                                color: '#10b981', fontFamily: 'monospace', marginBottom: '1.5rem',
                            }}>
                                ID: {orderId}
                            </div>
                        )}
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                            {provider === 'payu' ? '💸 PayU' : provider === 'p24' ? '🏦 Przelewy24' : '💳 Stripe'}
                            {' '}— płatność procedowana przez {provider === 'payu' ? 'PayU S.A.' : provider === 'p24' ? 'PayPro S.A.' : 'Stripe Inc.'}
                        </p>
                        <Link href="/" className="btn-primary" style={{ display: 'inline-block' }}>
                            Powrót na stronę główną
                        </Link>
                    </>
                ) : (
                    // Waiting state — PayU/P24 IPN verifying
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 2s infinite' }}>⏳</div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.75rem' }}>
                            Weryfikacja płatności...
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
                            Twoja płatność jest weryfikowana przez bramkę płatności. Potwierdzenie zostanie wysłane emailem po zakończeniu procesu (zazwyczaj kilka sekund).
                        </p>
                        <Link href="/" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            Strona główna
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default function PlatnosPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Ładowanie...
            </div>
        }>
            <PaymentStatus />
        </Suspense>
    );
}
