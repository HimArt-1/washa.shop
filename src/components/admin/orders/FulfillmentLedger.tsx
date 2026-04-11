"use client";

import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, Clock, ExternalLink, ArrowUpRight, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
    id: string;
    amount: number;
    created_at: string;
    status: "pending" | "sent" | "failed";
    metadata: {
        order_id?: string;
        order_ids?: string[];
        amount: number;
    };
}

interface FulfillmentLedgerProps {
    transactions: Transaction[];
}

export function FulfillmentLedger({ transactions }: FulfillmentLedgerProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("ar-SA", {
            style: "currency",
            currency: "SAR",
            maximumFractionDigits: 0,
        }).format(val);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    النشاط المالي للمستودع
                </h3>
                <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    LIVE_LEDGER_V2
                </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {transactions.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                        <DollarSign className="w-8 h-8 text-white/5 mx-auto mb-2" />
                        <p className="text-xs text-white/20">لا يوجد نشاط مالي مؤخراً</p>
                    </div>
                ) : (
                    transactions.map((tx, idx) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors group"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center border",
                                        tx.status === "sent" 
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                    )}>
                                        {tx.status === "sent" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white group-hover:text-gold transition-colors">
                                            {tx.metadata.order_ids ? `دفعة جماعية (${tx.metadata.order_ids.length})` : `تجهيز طلب`}
                                        </div>
                                        <div className="text-[10px] text-white/40 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(tx.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-white">
                                        {formatCurrency(tx.amount)}
                                    </div>
                                    <div className="text-[10px] text-emerald-500/50 flex items-center justify-end gap-1">
                                        SUCCESS
                                        <ArrowUpRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <div className="pt-4 border-t border-white/5 mt-4">
                <button className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    عرض السجل الكامل
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
