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
                    gap: '0.5rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    margin: '0 auto 2rem'
                }}
            >
                <MessageCircleQuestion size={20} />
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
