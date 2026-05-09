"use client";

import dynamic from "next/dynamic";

// Faza C (SEO/perf 2026-05-09): admin-only UI lazy-loaded after hydration so it
// doesn't ship in the initial bundle for the ~99% of visitors who aren't admins.
// Dynamic with ssr:false has to live in a client component (Server Components can't
// opt out of SSR per the Next 16 rule), so this thin wrapper exists only to host them.
const AdminFloatingBar = dynamic(() => import("@/components/AdminFloatingBar"), { ssr: false });
const VisualEditorOverlay = dynamic(() => import("@/components/editor/VisualEditorOverlay"), { ssr: false });
const PageOverridesApplier = dynamic(() => import("@/components/editor/PageOverridesApplier"), { ssr: false });

export function AdminFloatingBarLazy() {
    return <AdminFloatingBar />;
}

export function VisualEditorOverlayLazy() {
    return <VisualEditorOverlay />;
}

export function PageOverridesApplierLazy() {
    return <PageOverridesApplier />;
}
