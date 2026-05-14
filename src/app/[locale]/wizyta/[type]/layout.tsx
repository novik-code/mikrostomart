import type { Metadata } from 'next';

// S5-2 (2026-05-15): /wizyta/[type] is the post-booking pre-appointment
// instruction page reached via SMS/email link. It has no organic search intent
// (each URL is per-appointment context), and indexing leaks appointment_type
// strings + URL patterns. Robots disallow + noindex meta both block.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function WizytaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
