"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AssistantContextType {
    isChatOpen: boolean;
    openChat: () => void;
    closeChat: () => void;
    toggleChat: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
    const [isChatOpen, setIsChatOpen] = useState(false);

    const openChat = () => setIsChatOpen(true);
    const closeChat = () => setIsChatOpen(false);
    const toggleChat = () => setIsChatOpen(prev => !prev);

    return (
        <AssistantContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat }}>
            {children}
        </AssistantContext.Provider>
    );
}

export function useAssistant() {
    const context = useContext(AssistantContext);
    if (context === undefined) {
        throw new Error('useAssistant must be used within an AssistantProvider');
    }
    return context;
}
