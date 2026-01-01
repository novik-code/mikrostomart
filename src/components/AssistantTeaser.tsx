"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AssistantTeaser() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Show teaser after 5 seconds if not previously dismissed
        const timer = setTimeout(() => {
            const dismissed = localStorage.getItem("assistant_dismissed");
            if (!dismissed) {
                setIsVisible(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem("assistant_dismissed", "true");
    };

    if (isDismissed) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="fixed top-28 left-8 z-50 hidden md:block" // Hidden on mobile, positioned below logo (left-top)
                >
                    <div className="relative group">
                        <Link href="/asystent">
                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform duration-300">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-full flex items-center justify-center text-white shadow-lg">
                                        <MessageCircle size={24} />
                                    </div>
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                </div>

                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">
                                        Wirtualny Asystent
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Masz pytania? Chętnie pomogę!
                                    </span>
                                </div>
                            </div>
                        </Link>

                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-red-500 hover:text-white text-zinc-500 rounded-full p-1 shadow-md transition-colors duration-200"
                            aria-label="Zamknij asystenta"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
