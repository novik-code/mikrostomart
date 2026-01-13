"use client";

import { useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import AskExpertModal from '@/components/AskExpertModal';

export default function AskExpertButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="btn-expert"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    margin: '0 auto 2rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}
            >
                <MessageCircleQuestion size={24} />
                Zadaj Pytanie Ekspertowi
            </button>

            <AskExpertModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <style jsx>{`
                .btn-expert:hover {
                    background: var(--color-primary);
                    color: black;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(220, 177, 74, 0.3);
                }
            `}</style>
        </>
    );
}
