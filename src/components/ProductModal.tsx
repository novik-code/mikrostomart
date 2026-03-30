"use client";

import { X, ShoppingCart, CreditCard, ChevronLeft, ChevronRight, CheckCircle, ArrowLeft } from "lucide-react";
import { brandI18nParams } from '@/lib/brandConfig';
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useTranslations, useLocale } from "next-intl";
import CheckoutForm from "@/components/CheckoutForm";

// Define Product type interface to match usage
export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string; // Main image
    gallery?: string[]; // Optional gallery
    isVisible?: boolean;
    isVariablePrice?: boolean;
    minPrice?: number;
    nameTranslations?: Record<string, string>;
    descriptionTranslations?: Record<string, string>;
    categoryTranslations?: Record<string, string>;
}

interface ProductModalProps {
    product: Product | null;
    initialStep?: Step;
    onClose: () => void;
    initialValues?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}

type Step = "PRODUCT" | "CHECKOUT" | "SUCCESS";

// Helper to get translated product field
function getTranslated(product: Product, field: 'name' | 'description' | 'category', locale: string): string {
    if (locale === 'pl') return product[field];
    const translationsMap: Record<string, Record<string, string> | undefined> = {
        name: product.nameTranslations,
        description: product.descriptionTranslations,
        category: product.categoryTranslations,
    };
    return translationsMap[field]?.[locale] || product[field];
}

export default function ProductModal({ product, initialStep = "PRODUCT", onClose, initialValues }: ProductModalProps) {
    const { addItem, items, updateQuantity, removeItem, total } = useCart();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [step, setStep] = useState<Step>(initialStep);
    const [quantity, setQuantity] = useState(1);
    const t = useTranslations('productModal');
    const locale = useLocale();

    // State for variable price products
    const [currentPrice, setCurrentPrice] = useState(product ? product.price : 0);

    // Reset state when product changes
    if (product && currentPrice === 0 && product.price > 0) {
        setCurrentPrice(product.price);
    }

    // Safety check
    if (!product && step === "PRODUCT") return null;

    // Combine main image and gallery
    const images = product ? [product.image, ...(product.gallery || [])].filter(Boolean) : [];

    const handleNextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
    const handlePrevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            setCurrentPrice(val);
        }
    };

    const handleAddToCart = () => {
        if (!product) return;
        // Construct product with actual selected price
        const productToAdd = {
            ...product,
            price: currentPrice
        };
        addItem(productToAdd, quantity);
        setQuantity(1);
    };

    const handleBuyNow = () => {
        if (!product) return;
        const productToAdd = {
            ...product,
            price: currentPrice
        };
        addItem(productToAdd, quantity);
        setStep("CHECKOUT");
    };

    const handleCheckoutSuccess = () => setStep("SUCCESS");


    // --- RENDER CONTENT BASED ON STEP ---
    const renderContent = () => {
        if (step === "SUCCESS") {
            const isDeposit = product?.id === 'deposit-payment';
            return (
                <div style={{ padding: "4rem", textAlign: "center", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <CheckCircle size={64} color="var(--color-primary)" style={{ marginBottom: "1.5rem" }} />
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                        {isDeposit ? t('depositPaid') : t('thankYou')}
                    </h2>
                    <p style={{ color: "#d1d5db", maxWidth: "400px", lineHeight: "1.6", marginBottom: "2rem" }}>
                        {isDeposit ? t('depositConfirmation') : t('orderConfirmation')}
                    </p>
                    <button onClick={onClose} className="btn-primary" style={{ background: "var(--color-primary)", color: "black", border: "none" }}>
                        {isDeposit ? t('backToHome') : t('closeWindow')}
                    </button>
                </div>
            );
        }

        if (step === "CHECKOUT") {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', overflow: 'hidden' }}>
                    {/* LEFT: Cart Summary */}
                    <div style={{ background: '#121212', padding: '2rem', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                        {product && (
                            <button onClick={() => setStep("PRODUCT")} style={{ background: 'none', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '1.5rem', cursor: 'pointer' }}>
                                <ArrowLeft size={16} /> {t('backToProduct')}
                            </button>
                        )}
                        <h3 style={{ color: 'white', marginBottom: '1.5rem', fontFamily: 'serif' }}>{t('yourCart')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {items.map((item) => (
                                <div key={item.id} style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                    <img src={item.image} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                    <div style={{ flex: 1, color: 'white' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{item.price} PLN x {item.quantity}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <span>{t('total')}</span>
                            <span style={{ color: 'var(--color-primary)' }}>{total} PLN</span>
                        </div>
                    </div>

                    {/* RIGHT: Checkout Form */}
                    <div style={{ padding: '2rem', overflowY: 'auto', background: '#1c1c1c' }}>
                        <h3 style={{ color: 'white', marginBottom: '1.5rem', fontFamily: 'serif' }}>{t('checkoutTitle')}</h3>
                        <CheckoutForm onSuccess={handleCheckoutSuccess} initialValues={initialValues} />
                    </div>
                </div>
            );
        }

        // DEFAULT: PRODUCT STEP
        if (!product) return null; // Safety check

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', overflow: 'hidden' }}>
                {/* LEFT: Image Slider */}
                <div style={{ backgroundColor: '#000', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        {/* Main Image */}
                        <img
                            src={images[currentImageIndex]}
                            alt={getTranslated(product, 'name', locale)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                            <>
                                <button onClick={handlePrevImage} style={{
                                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                    backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <ChevronLeft size={20} />
                                </button>
                                <button onClick={handleNextImage} style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <ChevronRight size={20} />
                                </button>
                            </>
                        )}

                        {/* Thumbnails Overlay at Bottom */}
                        {images.length > 1 && (
                            <div style={{
                                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                display: 'flex', gap: '10px', padding: '10px',
                                background: 'rgba(0,0,0,0.6)', borderRadius: '12px', backdropFilter: 'blur(5px)'
                            }}>
                                {images.map((img, idx) => (
                                    <button key={idx} onClick={() => setCurrentImageIndex(idx)} style={{
                                        border: currentImageIndex === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                                        borderRadius: '6px', overflow: 'hidden', width: '50px', height: '50px', flexShrink: 0, padding: 0
                                    }}>
                                        <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Info */}
                <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', color: '#fff', overflowY: 'auto' }}>
                    <div>
                        <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af' }}>
                            {getTranslated(product, 'category', locale)}
                        </span>
                        <h2 style={{ fontSize: '28px', margin: '10px 0', fontFamily: 'serif', lineHeight: '1.2' }}>
                            {getTranslated(product, 'name', locale)}
                        </h2>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            {currentPrice} PLN
                        </div>

                        {/* Variable Price Input */}
                        {(product as any).isVariablePrice && (
                            <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
                                <label style={{ display: "block", color: "#9ca3af", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                                    {t('voucherAmount')}
                                </label>
                                <input
                                    type="number"
                                    min={(product as any).minPrice || 100}
                                    step="50"
                                    value={currentPrice}
                                    onChange={handlePriceChange}
                                    style={{
                                        width: "100%",
                                        padding: "1rem",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid var(--color-primary)",
                                        borderRadius: "8px",
                                        color: "white",
                                        fontSize: "1.2rem",
                                        fontWeight: "bold",
                                        outline: "none"
                                    }}
                                />
                                <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
                                    {t('minimum', { min: (product as any).minPrice || 100 })}
                                </p>
                            </div>
                        )}
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                    <p style={{ lineHeight: '1.6', color: '#d1d5db', fontSize: '16px', flex: 1 }}>
                        {getTranslated(product, 'description', locale)}
                    </p>

                    {/* Mini Cart Preview (if items exist) */}
                    {items.length > 0 && (
                        <div
                            onClick={() => setStep("CHECKOUT")}
                            style={{
                                background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '10px',
                                cursor: 'pointer', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', transition: 'background 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#9ca3af', marginBottom: '5px' }}>
                                <span>{t('inCart', { count: items.length })}</span>
                                <span>{t('cartTotal', { total })}</span>
                            </div>
                            <div style={{ color: 'var(--color-primary)', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }}>
                                {t('goToCart')}
                            </div>
                        </div>
                    )}



                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>


                        {/* Quantity Selector handled locally before adding */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{t('quantity')}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.1)", padding: "0.25rem", borderRadius: "8px" }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{ width: "32px", height: "32px", cursor: "pointer", border: "none", background: "transparent", color: "white", fontSize: "1.2rem" }}
                                >
                                    -
                                </button>
                                <span style={{ fontWeight: "bold", minWidth: "30px", textAlign: "center", color: 'white' }}>{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    style={{ width: "32px", height: "32px", cursor: "pointer", border: "none", background: "transparent", color: "white", fontSize: "1.2rem" }}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button
                                onClick={handleAddToCart}
                                style={{
                                    flex: 1, padding: '16px', borderRadius: '8px', border: '1px solid var(--color-primary)',
                                    background: 'transparent', color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <ShoppingCart size={20} />
                                {t('addToCart')}
                            </button>
                            <button
                                onClick={handleBuyNow}
                                style={{
                                    flex: 1, padding: '16px', borderRadius: '8px', border: 'none',
                                    background: 'var(--color-primary)', color: 'black', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.3)'
                                }}
                            >
                                <CreditCard size={20} />
                                {t('buyNow')}
                            </button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                            {t('safePurchase', brandI18nParams())}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                width: '100%',
                maxWidth: '1000px', // Wider for split view in checkout
                height: '80vh', // Fixed height for consistency
                backgroundColor: 'rgba(18, 20, 24, 0.98)',
                border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
                borderRadius: '16px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                position: 'relative'
            }} onClick={(e) => e.stopPropagation()}>

                {/* Close Button (visible except in success maybe? No, always visible) */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: '15px', right: '15px',
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 50
                }}>
                    <X size={20} />
                </button>

                {renderContent()}

            </div>

            {/* Mobile query */}
            <style jsx>{`
                @media (max-width: 768px) {
                    div[style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                        overflow-y: auto !important;
                    }
                    div[style*="height: 100%"] {
                        height: auto !important;
                    }
                }
            `}
            </style>
        </div>
    );
}
