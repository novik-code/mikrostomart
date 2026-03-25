"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VisualEditorContextValue {
    isEditorOpen: boolean;
    toggleEditor: () => void;
    openEditor: () => void;
    closeEditor: () => void;
}

const VisualEditorContext = createContext<VisualEditorContextValue>({
    isEditorOpen: false,
    toggleEditor: () => {},
    openEditor: () => {},
    closeEditor: () => {},
});

export function useVisualEditor() {
    return useContext(VisualEditorContext);
}

export function VisualEditorProvider({ children }: { children: ReactNode }) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const toggleEditor = useCallback(() => setIsEditorOpen(prev => !prev), []);
    const openEditor = useCallback(() => setIsEditorOpen(true), []);
    const closeEditor = useCallback(() => setIsEditorOpen(false), []);

    return (
        <VisualEditorContext.Provider value={{ isEditorOpen, toggleEditor, openEditor, closeEditor }}>
            {children}
        </VisualEditorContext.Provider>
    );
}
