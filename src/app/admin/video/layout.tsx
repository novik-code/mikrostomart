import type { Metadata } from "next";
import { demoSanitize } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: "Video Shorts — Mikrostomart",
    description: "Upload wideo → AI obrabia → auto-publish",
    manifest: "/manifest-video.json",
    themeColor: "#FFD700",
    appleWebApp: {
        capable: true,
        title: "Video Shorts",
        statusBarStyle: "black-translucent",
    },
    viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
    },
};

export default function VideoLayout({ children }: { children: React.ReactNode }) {
    return children;
}
