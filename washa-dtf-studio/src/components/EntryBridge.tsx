import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Entry bridge — softens the hand-off from the dark cinematic intro
// (/design/washa-ai) into the light studio. The studio boots behind a
// dark curtain tinted exactly like the intro, which then lifts to reveal
// the workbench. Short and pointer-transparent — not a second splash.

export default function EntryBridge() {
    const [lifted, setLifted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setLifted(true), 160);
        return () => clearTimeout(t);
    }, []);

    return (
        <AnimatePresence>
            {!lifted && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="pointer-events-none fixed inset-0 z-[9998]"
                    style={{
                        background:
                            'radial-gradient(ellipse at 50% 42%, #14110d 0%, #0c0a08 46%, #060504 100%)',
                    }}
                />
            )}
        </AnimatePresence>
    );
}
