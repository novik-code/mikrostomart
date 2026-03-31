'use client';

import { useEffect, useState } from 'react';

export type PaymentMethod = 'stripe' | 'p24' | 'payu';

interface PaymentMethodPickerProps {
    onSelect: (method: PaymentMethod) => void;
    loading?: boolean;
}

interface Availability {
    stripe: boolean;
    p24: boolean;
    payu: boolean;
}

const methods: {
    id: PaymentMethod;
    name: string;
    tagline: string;
    badges: string[];
    color: string;
    icon: string;
}[] = [
    {
        id: 'stripe',
        name: 'Karta płatnicza',
        tagline: 'Visa, Mastercard, Apple Pay',
        badges: ['VISA', 'MC', 'Apple Pay', 'Google Pay'],
        color: '#635bff',
        icon: '💳',
    },
    {
        id: 'payu',
        name: 'PayU',
        tagline: 'BLIK, szybki przelew, karta',
        badges: ['BLIK', 'Przelew', 'Karta'],
        color: '#00b14f',
        icon: '🏦',
    },
    {
        id: 'p24',
        name: 'Przelewy24',
        tagline: 'BLIK, przelew bankowy, karta',
        badges: ['BLIK', 'Przelew', 'Karta'],
        color: '#e4001a',
        icon: '💸',
    },
];

export default function PaymentMethodPicker({ onSelect, loading = false }: PaymentMethodPickerProps) {
    const [availability, setAvailability] = useState<Availability | null>(null);
    const [selected, setSelected] = useState<PaymentMethod | null>(null);
    const [loadingAvail, setLoadingAvail] = useState(true);

    useEffect(() => {
        fetch('/api/payment-methods')
            .then(r => r.json())
            .then(d => setAvailability(d))
            .catch(() => setAvailability({ stripe: true, p24: false, payu: false }))
            .finally(() => setLoadingAvail(false));
    }, []);

    const isAvailable = (id: PaymentMethod) => {
        if (!availability) return false;
        return availability[id];
    };

    const handleSelect = (id: PaymentMethod) => {
        if (!isAvailable(id)) return;
        setSelected(id);
    };

    const handleConfirm = () => {
        if (!selected) return;
        onSelect(selected);
    };

    if (loadingAvail) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>⟳</div>
                <div>Sprawdzanie dostępnych metod płatności...</div>
            </div>
        );
    }

    const available = methods.filter(m => isAvailable(m.id));
    const unavailable = methods.filter(m => !isAvailable(m.id));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--color-text-main)' }}>
                    Wybierz metodę płatności
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Wszystkie płatności są szyfrowane i bezpieczne.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {available.map(method => (
                    <button
                        key={method.id}
                        onClick={() => handleSelect(method.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem 1.25rem',
                            background: selected === method.id
                                ? `linear-gradient(135deg, ${method.color}22, ${method.color}11)`
                                : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${selected === method.id ? method.color : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Glow effect for selected */}
                        {selected === method.id && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `radial-gradient(circle at 10% 50%, ${method.color}15, transparent 60%)`,
                                pointerEvents: 'none',
                            }} />
                        )}

                        {/* Radio indicator */}
                        <div style={{
                            width: 20, height: 20,
                            borderRadius: '50%',
                            border: `2px solid ${selected === method.id ? method.color : 'rgba(255,255,255,0.3)'}`,
                            background: selected === method.id ? method.color : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                        }}>
                            {selected === method.id && (
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                            )}
                        </div>

                        {/* Icon */}
                        <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{method.icon}</div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', color: 'var(--color-text-main)', fontSize: '1rem' }}>
                                {method.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                {method.tagline}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                {method.badges.map(badge => (
                                    <span key={badge} style={{
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        background: `${method.color}22`,
                                        color: method.color,
                                        border: `1px solid ${method.color}44`,
                                        letterSpacing: '0.5px',
                                    }}>{badge}</span>
                                ))}
                            </div>
                        </div>

                        {/* Arrow for selected */}
                        {selected === method.id && (
                            <div style={{ color: method.color, fontSize: '1.2rem', flexShrink: 0 }}>→</div>
                        )}
                    </button>
                ))}

                {/* Unavailable methods (greyed) */}
                {unavailable.length > 0 && (
                    <div style={{ opacity: 0.35 }}>
                        {unavailable.map(method => (
                            <div key={method.id} style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '0.85rem 1.25rem',
                                background: 'rgba(255,255,255,0.02)',
                                border: '2px solid rgba(255,255,255,0.06)',
                                borderRadius: '12px', marginBottom: '0.5rem',
                                cursor: 'not-allowed',
                            }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{method.icon}</div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>{method.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>Niedostępne — skonfiguruj w panelu admina</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Trust badges */}
            <div style={{
                display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap',
                padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
                <span>🔒 SSL / TLS</span>
                <span>•</span>
                <span>🛡️ 3D Secure</span>
                <span>•</span>
                <span>✅ PCI DSS</span>
            </div>

            {/* Confirm button */}
            <button
                onClick={handleConfirm}
                disabled={!selected || loading}
                className="btn-primary"
                style={{
                    width: '100%',
                    opacity: !selected || loading ? 0.5 : 1,
                    cursor: !selected || loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
            >
                {loading ? (
                    <>⟳ Trwa przekierowanie...</>
                ) : (
                    <>Przejdź do płatności →</>
                )}
            </button>
        </div>
    );
}
