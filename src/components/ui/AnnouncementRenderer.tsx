"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import type { Announcement } from "@/lib/announcement-types";

// ─── Storage helpers ────────────────────────────────────

const STORAGE_KEY = "wusha_dismissed_announcements";

function getDismissed(): Record<string, string> {
    if (typeof window === "undefined") return {};
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch { return {}; }
}

function setDismissed(id: string, frequency: string) {
    const dismissed = getDismissed();
    dismissed[id] = frequency === "once" ? "permanent" : new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
}

function isDismissed(id: string, frequency: string): boolean {
    const dismissed = getDismissed();
    const val = dismissed[id];
    if (!val) return false;
    if (frequency === "once") return true; // permanent
    if (frequency === "session") {
        // Check if dismissed within session (tab is still open — we use sessionStorage instead)
        try {
            return sessionStorage.getItem(`wusha_ann_${id}`) === "1";
        } catch { return false; }
    }
    return false; // "always" → never dismissed
}

function dismissSession(id: string) {
    try { sessionStorage.setItem(`wusha_ann_${id}`, "1"); } catch {/* noop */ }
}

// ─── Template styles ────────────────────────────────────

const templateStyles: Record<string, string> = {
    gold: "bg-gradient-to-r from-[#5A3E2B] via-[#ceae7f] to-[#5A3E2B] text-white",
    gradient: "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white",
    minimal: "bg-[#1a1a1a] border border-white/[0.1] text-white/80",
    alert: "bg-red-950 border border-red-500/30 text-red-200",
    promo: "bg-gradient-to-r from-emerald-700 to-teal-600 text-white",
    neon: "bg-blue-950/80 border border-blue-400/20 text-blue-100 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.2)]",
    sunset: "bg-gradient-to-r from-amber-900/60 via-orange-900/60 to-rose-900/60 border border-amber-500/20 text-amber-50 backdrop-blur-sm",
    frost: "bg-white/[0.06] border border-white/[0.15] text-white/90 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]",
    rose: "bg-gradient-to-r from-pink-950/70 via-rose-950/70 to-fuchsia-950/70 border border-pink-400/15 text-pink-100 backdrop-blur-sm",
    aurora: "bg-gradient-to-r from-violet-950/60 via-cyan-950/60 to-emerald-950/60 border border-violet-400/15 text-cyan-50 backdrop-blur-md",
};

// ─── Banner Component ───────────────────────────────────

function BannerAnnouncement({ ann, onDismiss }: { ann: Announcement; onDismiss: () => void }) {
    return (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={`relative ${templateStyles[ann.template] || templateStyles.gold}`}>
            <div className="flex items-center justify-center gap-3 px-6 py-2.5 text-center">
                <p className="text-sm font-bold">{ann.title}</p>
                <span className="text-xs opacity-80">{ann.body}</span>
                {ann.link && ann.linkText && (
                    <Link href={ann.link} className="text-xs font-bold underline underline-offset-2 hover:opacity-80">
                        {ann.linkText}
                    </Link>
                )}
                {ann.trigger?.dismissible && (
                    <button onClick={onDismiss} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Popup Component ────────────────────────────────────

function PopupAnnouncement({ ann, onDismiss }: { ann: Announcement; onDismiss: () => void }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={ann.trigger?.dismissible ? onDismiss : undefined}
        >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-2xl p-6 text-center shadow-2xl ${templateStyles[ann.template] || templateStyles.gold}`}
            >
                {ann.trigger?.dismissible && (
                    <button onClick={onDismiss} className="absolute top-3 left-3 p-1.5 rounded-full hover:bg-black/20 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
                <h3 className="text-xl font-black mb-2">{ann.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{ann.body}</p>
                {ann.link && ann.linkText && (
                    <Link href={ann.link} onClick={onDismiss}
                        className="inline-block mt-4 px-6 py-2.5 bg-black/20 rounded-xl font-bold text-sm hover:bg-black/30 transition-colors">
                        {ann.linkText}
                    </Link>
                )}
                {ann.trigger?.dismissible && !ann.link && (
                    <button onClick={onDismiss}
                        className="inline-block mt-4 px-6 py-2.5 bg-black/20 rounded-xl font-bold text-sm hover:bg-black/30 transition-colors">
                        فهمت
                    </button>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── Toast Component ────────────────────────────────────

function ToastAnnouncement({ ann, onDismiss }: { ann: Announcement; onDismiss: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 8000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
            className={`fixed bottom-6 left-6 z-[9999] max-w-sm rounded-xl p-4 shadow-2xl ${templateStyles[ann.template] || templateStyles.gold}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <p className="font-bold text-sm">{ann.title}</p>
                    <p className="text-xs opacity-80 mt-0.5">{ann.body}</p>
                    {ann.link && ann.linkText && (
                        <Link href={ann.link} onClick={onDismiss} className="text-xs font-bold underline mt-1 inline-block">
                            {ann.linkText}
                        </Link>
                    )}
                </div>
                {ann.trigger?.dismissible && (
                    <button onClick={onDismiss} className="p-1 rounded-full hover:bg-black/20 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Marquee Component ──────────────────────────────────

function MarqueeAnnouncement({ ann, onDismiss }: { ann: Announcement; onDismiss: () => void }) {
    return (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={`relative overflow-hidden ${templateStyles[ann.template] || templateStyles.gold}`}>
            <div className="py-2 whitespace-nowrap animate-marquee">
                <span className="inline-block px-8 text-sm font-bold">{ann.title}</span>
                <span className="inline-block px-8 text-sm opacity-80">{ann.body}</span>
                {ann.link && ann.linkText && (
                    <Link href={ann.link} className="inline-block px-8 text-sm font-bold underline">{ann.linkText}</Link>
                )}
                <span className="inline-block px-8 text-sm font-bold">{ann.title}</span>
                <span className="inline-block px-8 text-sm opacity-80">{ann.body}</span>
            </div>
            {ann.trigger?.dismissible && (
                <button onClick={onDismiss} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20 transition-colors z-10 bg-black/10">
                    <X className="w-3 h-3" />
                </button>
            )}
        </motion.div>
    );
}

// ═══ MAIN RENDERER ══════════════════════════════════════

export function AnnouncementRenderer({ announcements }: { announcements: Announcement[] }) {
    const pathname = usePathname();
    const [visible, setVisible] = useState<Record<string, boolean>>({});
    const [ready, setReady] = useState(false);
    const scrollRef = useRef(false);
    const exitRef = useRef(false);

    // Initialize on mount
    useEffect(() => {
        setReady(true);
    }, []);

    // ─── Trigger engine ─────────────────────────────────
    useEffect(() => {
        if (!ready) return;
        const timers: number[] = [];

        announcements.forEach((ann) => {
            const trigger = ann.trigger;
            if (!trigger) return;

            // Check if already dismissed
            if (isDismissed(ann.id, trigger.frequency)) return;

            switch (trigger.type) {
                case "always":
                case "on_load":
                    setVisible((v) => ({ ...v, [ann.id]: true }));
                    break;

                case "after_delay": {
                    const delay = (trigger.delaySeconds || 5) * 1000;
                    const t = window.setTimeout(() => {
                        if (!isDismissed(ann.id, trigger.frequency)) {
                            setVisible((v) => ({ ...v, [ann.id]: true }));
                        }
                    }, delay);
                    timers.push(t);
                    break;
                }

                case "page_enter": {
                    const pages = trigger.targetPages || [];
                    if (pages.some((p: string) => pathname === p || pathname.startsWith(p + "/"))) {
                        setVisible((v) => ({ ...v, [ann.id]: true }));
                    }
                    break;
                }

                case "exit_intent": {
                    if (exitRef.current) break;
                    exitRef.current = true;
                    const handler = (e: MouseEvent) => {
                        if (e.clientY <= 5) {
                            if (!isDismissed(ann.id, trigger.frequency)) {
                                setVisible((v) => ({ ...v, [ann.id]: true }));
                            }
                            document.removeEventListener("mouseleave", handler);
                        }
                    };
                    document.addEventListener("mouseleave", handler);
                    break;
                }

                case "scroll_depth": {
                    if (scrollRef.current) break;
                    scrollRef.current = true;
                    const pct = trigger.scrollPercent || 50;
                    const handler = () => {
                        const scrollTop = window.scrollY;
                        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                        if (docHeight > 0 && (scrollTop / docHeight) * 100 >= pct) {
                            if (!isDismissed(ann.id, trigger.frequency)) {
                                setVisible((v) => ({ ...v, [ann.id]: true }));
                            }
                            window.removeEventListener("scroll", handler);
                        }
                    };
                    window.addEventListener("scroll", handler, { passive: true });
                    break;
                }
            }
        });

        return () => {
            timers.forEach((t) => clearTimeout(t));
        };
    }, [announcements, pathname, ready]);

    // Re-evaluate page_enter on pathname change
    useEffect(() => {
        if (!ready) return;
        announcements.forEach((ann) => {
            if (ann.trigger?.type === "page_enter") {
                const pages = ann.trigger.targetPages || [];
                if (pages.some((p: string) => pathname === p || pathname.startsWith(p + "/"))) {
                    if (!isDismissed(ann.id, ann.trigger.frequency)) {
                        setVisible((v) => ({ ...v, [ann.id]: true }));
                    }
                }
            }
        });
    }, [pathname, announcements, ready]);

    const handleDismiss = useCallback((ann: Announcement) => {
        setVisible((v) => ({ ...v, [ann.id]: false }));
        if (ann.trigger) {
            setDismissed(ann.id, ann.trigger.frequency);
            if (ann.trigger.frequency === "session") {
                dismissSession(ann.id);
            }
        }
    }, []);

    if (!ready) return null;

    // Split by type for rendering
    const banners = announcements.filter((a) => a.type === "banner" && visible[a.id]);
    const marquees = announcements.filter((a) => a.type === "marquee" && visible[a.id]);
    const popups = announcements.filter((a) => a.type === "popup" && visible[a.id]);
    const toasts = announcements.filter((a) => a.type === "toast" && visible[a.id]);

    return (
        <>
            {/* Banners — top of page */}
            <AnimatePresence>
                {banners.map((a) => (
                    <BannerAnnouncement key={a.id} ann={a} onDismiss={() => handleDismiss(a)} />
                ))}
            </AnimatePresence>

            {/* Marquees — under banners */}
            <AnimatePresence>
                {marquees.map((a) => (
                    <MarqueeAnnouncement key={a.id} ann={a} onDismiss={() => handleDismiss(a)} />
                ))}
            </AnimatePresence>

            {/* Popups — modal overlay */}
            <AnimatePresence>
                {popups.length > 0 && (
                    <PopupAnnouncement ann={popups[0]} onDismiss={() => handleDismiss(popups[0])} />
                )}
            </AnimatePresence>

            {/* Toasts — bottom corner */}
            <AnimatePresence>
                {toasts.map((a) => (
                    <ToastAnnouncement key={a.id} ann={a} onDismiss={() => handleDismiss(a)} />
                ))}
            </AnimatePresence>

            {/* Marquee animation CSS */}
            <style jsx global>{`
                @keyframes marquee {
                    from { transform: translateX(100%); }
                    to { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
            `}</style>
        </>
    );
}
