"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Product = {
    id: string;
    name: string;
    price: number;
    image: string;
    // Optional fields that might be passed
    description?: string;
    category?: string;
    isVariablePrice?: boolean;
    minPrice?: number;
};

export type CartItem = Product & {
    quantity: number;
    originalId?: string; // To store the real product ID if 'id' is composite
};

type CartContextType = {
    items: CartItem[];
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem("cart");
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
    }, []);

    // Save to local storage on change
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(items));
    }, [items]);

    const addItem = (product: Product, quantity: number = 1) => {
        // Create a unique ID for the cart based on Product ID + Price
        // This ensures that "Voucher (500)" and "Voucher (1000)" are separate items
        // We use this composite ID for all cart operations (remove, update)
        const cartId = `${product.id}-${product.price}`;

        setItems((prev) => {
            const existing = prev.find((item) => item.id === cartId);
            if (existing) {
                return prev.map((item) =>
                    item.id === cartId
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            // Store with composite ID, preserving originalId
            return [...prev, {
                ...product,
                id: cartId,
                originalId: product.id,
                quantity
            }];
        });
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id);
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => setItems([]);

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
