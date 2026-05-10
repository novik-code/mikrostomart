'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentStatus() {
    const params = useSearchParams();
    const status = params.get('status');
    const provider = params.get('provider') || 'payu';
    const orderId = params.get('orderId') || params.get('token') || '';

    const isSuccess = status === 'return' || status === 'success';
    const isCancelled = status === 'cancel' || status === 'error';

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
