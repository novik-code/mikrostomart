'use client';

import styles from '../app/strefa-pacjenta/patient.module.css';

interface SkeletonProps {
    variant?: 'card' | 'line' | 'lineShort' | 'circle';
    count?: number;
    className?: string;
}

/**
 * Reusable skeleton loading component for patient zone.
 * Uses CSS Module shimmer animation.
 */
export default function PatientSkeleton({ variant = 'line', count = 1, className = '' }: SkeletonProps) {
    const getClass = () => {
        switch (variant) {
            case 'card': return styles.skeletonCard;
            case 'lineShort': return styles.skeletonLineShort;
            case 'circle': return styles.skeletonCircle;
            default: return styles.skeletonLine;
        }
    };

    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`${getClass()} ${className}`} />
            ))}
        </>
    );
}

/**
 * Pre-built skeleton layouts for common patient zone sections.
 */
export function DashboardSkeleton() {
    return (
        <div className={styles.container}>
            {/* Stats grid skeleton */}
            <div className={styles.statsGrid}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={styles.skeletonCard} />
                ))}
            </div>

            {/* Action bar skeleton */}
            <div className={styles.card} style={{ marginBottom: '2rem' }}>
                <PatientSkeleton variant="lineShort" />
                <PatientSkeleton variant="line" />
            </div>

            {/* Appointments skeleton */}
            <div className={styles.card} style={{ marginBottom: '2rem' }}>
                <PatientSkeleton variant="lineShort" />
                <div style={{ marginTop: '1rem' }}>
                    <PatientSkeleton variant="line" count={3} />
                </div>
            </div>

            {/* History skeleton */}
            <div className={styles.card}>
                <PatientSkeleton variant="lineShort" />
                <div style={{ marginTop: '1rem' }}>
                    <PatientSkeleton variant="line" count={5} />
                </div>
            </div>
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className={styles.container}>
            <div className={styles.card} style={{ marginBottom: '2rem' }}>
                <PatientSkeleton variant="lineShort" />
                <div style={{ marginTop: '1rem' }}>
                    <PatientSkeleton variant="line" count={4} />
                </div>
            </div>
            <div className={styles.card}>
                <PatientSkeleton variant="lineShort" />
                <div style={{ marginTop: '1rem' }}>
                    <PatientSkeleton variant="line" count={3} />
                </div>
            </div>
        </div>
    );
}

export function HistorySkeleton() {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <PatientSkeleton variant="lineShort" />
                <div style={{ marginTop: '1rem' }}>
                    <PatientSkeleton variant="line" count={8} />
                </div>
            </div>
        </div>
    );
}
