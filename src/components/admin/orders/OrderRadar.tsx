"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { getAdminNotifications } from "@/app/actions/notifications";
import type { AdminNotification } from "@/types/database";

export function OrderRadar() {
    const [latestOrder, setLatestOrder] = useState<AdminNotification | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);

    const playCyberAlert = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.4);
            
            // Secondary High-Pitch Pulse
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = "square";
                osc2.frequency.setValueAtTime(1760, ctx.currentTime);
                gain2.gain.setValueAtTime(0.05, ctx.currentTime);
                gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.1);
            }, 100);
        } catch (e) {
            console.error("Audio Synthesis Failed", e);
        }
    };

    const checkNewOrders = useCallback(async () => {
        try {
            const notifications = await getAdminNotifications(5);
            const paidOrder = notifications.find(
                (n) => n.category === "orders" && n.type === "payment_received" && !n.is_read
            );

            if (paidOrder && paidOrder.id !== lastCheckedId) {
                setLatestOrder(paidOrder);
                setLastCheckedId(paidOrder.id);
                setIsVisible(true);
                
                playCyberAlert();

                // Auto-hide after 15 seconds
                setTimeout(() => setIsVisible(false), 15000);
            }
        } catch (error) {
            console.error("OrderRadar error:", error);
        }
    }, [lastCheckedId]);

    useEffect(() => {
        // initial check
        checkNewOrders();
        
        // poll every 20 seconds
        const interval = setInterval(checkNewOrders, 20000);
        return () => clearInterval(interval);
    }, [checkNewOrders]);

    return (
        <AnimatePresence>
            {isVisible && latestOrder && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-sm z-[60] px-4"
                >
                    <div className="relative overflow-hidden group">
                        {/* Glow effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-gold via-amber-400 to-gold rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                        
                        <div className="relative flex items-center gap-4 p-4 rounded-2xl bg-[var(--wusha-surface)] border border-gold/20 shadow-2xl backdrop-blur-xl">
                            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0 border border-gold/20">
                                <div className="relative">
                                    <ShoppingCart className="w-6 h-6 text-gold" />
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -top-1 -right-1"
                                    >
                                        <Sparkles className="w-3 h-3 text-gold" />
                                    </motion.div>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold tracking-widest text-gold mb-0.5 uppercase">مدفوع — جديد</p>
                                <h4 className="font-bold text-theme truncate">{latestOrder.title}</h4>
                                <p className="text-xs text-theme-subtle truncate">{latestOrder.message}</p>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0 border-r border-theme-soft pr-3 mr-1">
                                <Link
                                    href={latestOrder.link || "/dashboard/orders/command-center"}
                                    onClick={() => setIsVisible(false)}
                                    className="flex items-center justify-center p-2 rounded-lg bg-gold text-[#0a0a0a] hover:bg-gold-light transition-colors"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="flex items-center justify-center p-2 rounded-lg bg-theme-subtle text-theme-faint hover:text-theme transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
