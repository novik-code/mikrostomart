"use client";

import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useVisualEditor } from '@/context/VisualEditorContext';
import { usePathname, useRouter } from 'next/navigation';

/**
 * AdminFloatingBar — compact floating pill visible on ALL pages
 * when the current user has the 'admin' role.
 * 
 * - Shows "🛡 Admin" pill (bottom-right)
 * - Expands on hover to show email + two action buttons
 * - "Panel Admin" → navigates to /admin
 * - "Edytor wizualny" → toggles visual editor overlay
 * 
 * Does NOT render at all if:
 *   - user is not logged in
 *   - user doesn't have admin role
 *   - user is already on /admin/* pages (admin panel has its own UI)
 */
export default function AdminFloatingBar() {
    const { isAdmin, email, loading } = useUserRoles();
    const { isEditorOpen, toggleEditor } = useVisualEditor();
    const pathname = usePathname();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    // Don't render if not admin, still loading, or already in admin panel
    if (loading || !isAdmin) return null;
    if (pathname?.startsWith('/admin')) return null;

    const shortEmail = email ? email.split('@')[0] : 'Admin';

    return (
        <div
            data-ve-ui="true"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                gap: isExpanded ? '0.5rem' : '0',
                padding: isExpanded ? '0.5rem 0.75rem' : '0.5rem 0.85rem',
                background: isEditorOpen
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'rgba(15, 17, 21, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isEditorOpen
                    ? '1px solid rgba(59, 130, 246, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '999px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                maxWidth: isExpanded ? '500px' : '120px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
            }}
        >
            {/* Admin badge */}
            <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: isEditorOpen ? '#93c5fd' : '#dcb14a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexShrink: 0,
            }}>
                🛡 {isExpanded ? shortEmail : 'Admin'}
            </span>

            {/* Expanded buttons */}
            {isExpanded && (
                <>
                    <div style={{
                        width: '1px',
                        height: '20px',
                        background: 'rgba(255,255,255,0.15)',
                        flexShrink: 0,
                    }} />

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push('/admin');
                        }}
                        style={{
                            padding: '0.3rem 0.65rem',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px',
                            color: '#e5e7eb',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                            (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                        }}
                    >
                        📋 Panel
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleEditor();
                        }}
                        style={{
                            padding: '0.3rem 0.65rem',
                            background: isEditorOpen
                                ? 'rgba(59, 130, 246, 0.3)'
                                : 'rgba(139, 92, 246, 0.15)',
                            border: isEditorOpen
                                ? '1px solid rgba(59, 130, 246, 0.5)'
                                : '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            color: isEditorOpen ? '#93c5fd' : '#c4b5fd',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                            (e.target as HTMLElement).style.background = isEditorOpen
                                ? 'rgba(59, 130, 246, 0.4)'
                                : 'rgba(139, 92, 246, 0.25)';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLElement).style.background = isEditorOpen
                                ? 'rgba(59, 130, 246, 0.3)'
                                : 'rgba(139, 92, 246, 0.15)';
                        }}
                    >
                        {isEditorOpen ? '✕ Zamknij edytor' : '✏️ Edytor'}
                    </button>
                </>
            )}
        </div>
    );
}
