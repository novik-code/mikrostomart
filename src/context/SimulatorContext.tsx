"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SimulatorContextType {
    isOpen: boolean;
    openSimulator: () => void;
    closeSimulator: () => void;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export function SimulatorProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openSimulator = () => setIsOpen(true);
    const closeSimulator = () => setIsOpen(false);

    return (
        <SimulatorContext.Provider value={{ isOpen, openSimulator, closeSimulator }}>
            {children}
        </SimulatorContext.Provider>
    );
}

export function useSimulator() {
    const context = useContext(SimulatorContext);
    if (context === undefined) {
        throw new Error('useSimulator must be used within a SimulatorProvider');
    }
    return context;
}
