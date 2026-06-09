"use client";

// 4A (perf): LazyMotion + m zamiast eager motion (Footer na każdej stronie → globalny zysk).
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Phone } from "lucide-react";

export default function AnimatedPhone({ size = 20, color = "currentColor" }: { size?: number, color?: string }) {
    return (
        <LazyMotion features={domAnimation} strict>
            <m.div
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                whileHover={{ scale: 1.1 }}
                animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3, // Pauses between rings
                    ease: "easeInOut"
                }}
            >
                <Phone size={size} color={color} strokeWidth={2} />
            </m.div>
        </LazyMotion>
    );
}
