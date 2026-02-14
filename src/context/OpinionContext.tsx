'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface OpinionContextType {
    isOpen: boolean;
    openSurvey: () => void;
    closeSurvey: () => void;
}

const OpinionContext = createContext<OpinionContextType>({
    isOpen: false,
    openSurvey: () => { },
    closeSurvey: () => { },
});

export function useOpinion() {
    return useContext(OpinionContext);
}

const STORAGE_KEY = 'msm_survey_shown';
const COOLDOWN_DAYS = 30;
const SKIP_PATHS = ['/pracownik', '/admin', '/rezerwacja'];

export function OpinionProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const openSurvey = useCallback(() => setIsOpen(true), []);
    const closeSurvey = useCallback(() => setIsOpen(false), []);

    // Timed popup logic
    useEffect(() => {
        // Skip on employee/admin/booking pages
        if (SKIP_PATHS.some(p => pathname.startsWith(p))) return;

        // Check localStorage cooldown
        try {
            const lastShown = localStorage.getItem(STORAGE_KEY);
            if (lastShown) {
                const daysSince = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24);
                if (daysSince < COOLDOWN_DAYS) return;
            }
        } catch {
            // localStorage not available
            return;
        }

        // 50% probability gate
        if (Math.random() > 0.5) return;

        // Random delay: 2-5 minutes
        const delayMs = (2 + Math.random() * 3) * 60 * 1000;

        const timer = setTimeout(() => {
            setIsOpen(true);
            try {
                localStorage.setItem(STORAGE_KEY, Date.now().toString());
            } catch { /* ignore */ }
        }, delayMs);

        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <OpinionContext.Provider value={{ isOpen, openSurvey, closeSurvey }}>
            {children}
        </OpinionContext.Provider>
    );
}
