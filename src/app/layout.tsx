import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import AssistantTeaser from "@/components/AssistantTeaser";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Mikrostomart - Gabinet Stomatologiczny Opole",
  description: "Nowoczesna stomatologia mikroskopowa, implanty, estetyka. Umów wizytę w Opolu.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
};

import BackgroundVideo from "@/components/BackgroundVideo";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <CartProvider>
          <BackgroundVideo videoId="vGAu6rdJ8WQ" />
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            {children}
            <AssistantTeaser />
            <Footer />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
