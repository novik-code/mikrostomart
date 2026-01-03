"use client";

import { motion } from "framer-motion";
import { AtSign } from "lucide-react";

export default function AnimatedAt({ size = 20, color = "currentColor" }: { size?: number, color?: string }) {
    return (
        <motion.div
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            whileHover={{ scale: 1.1 }}
            animate={{
                rotate: [0, -10, 10, -10, 10, 0],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 4, // Slightly different rhythm than phone
                ease: "easeInOut"
            }}
        >
            <AtSign size={size} color={color} strokeWidth={2} />
        </motion.div>
    );
}
