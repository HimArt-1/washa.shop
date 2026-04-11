"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CyberGlitchTextProps {
    text: string;
    className?: string;
}

export function CyberGlitchText({ text, className }: CyberGlitchTextProps) {
    return (
        <div className={cn("relative group cursor-default", className)}>
            <motion.span
                initial={{ opacity: 1 }}
                animate={{
                    opacity: [1, 0.8, 1, 0.9, 1],
                    x: [0, -1, 1, -1, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
                className="relative z-10 block"
            >
                {text}
            </motion.span>
            
            {/* Glitch Layers */}
            <motion.span
                animate={{
                    opacity: [0, 0.2, 0, 0.1, 0],
                    x: [-2, 2, -1, 3, 0],
                    y: [1, -1, 2, -2, 0],
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 5,
                }}
                className="absolute inset-0 z-0 text-red-500/30 font-black overflow-hidden pointer-events-none select-none"
            >
                {text}
            </motion.span>
            
            <motion.span
                animate={{
                    opacity: [0, 0.2, 0, 0.1, 0],
                    x: [2, -2, 1, -3, 0],
                    y: [-1, 1, -2, 2, 0],
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 5,
                }}
                className="absolute inset-0 z-0 text-cyan-500/30 font-black overflow-hidden pointer-events-none select-none"
            >
                {text}
            </motion.span>
        </div>
    );
}
