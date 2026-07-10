"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — بطاقة إدارة رصيد WASHA AI (أدمن)
//  بحث عن مستخدم، عرض رصيده وسجله، ومنح/خصم يدوي.
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { Loader2, Search, Plus, Minus, Wallet } from "lucide-react";
import {
    adminAdjustWashaCredits,
    getWashaCreditOverview,
    type CreditOverview,
} from "@/app/actions/washa-ai-credits";

const ENTRY_LABELS: Record<string, string> = {
    purchase: "شراء",
    consume: "استهلاك",
    refund: "استرجاع",
    admin_grant: "منح إداري",
    admin_deduct: "خصم إداري",
};

export default function WashaCreditsAdminCard() {
    const [identifier, setIdentifier] = useState("");
    const [overview, setOverview] = useState<CreditOverview | null>(null);
    const [amount, setAmount] = useState("10");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    async function handleSearch() {
        if (!identifier.trim() || loading) return;
        setLoading(true);
        setMessage(null);
        const res = await getWashaCreditOverview(identifier);
        if (res.ok) {
            setOverview(res.data);
        } else {
            setOverview(null);
            setMessage({ type: "err", text: res.error });
        }
        setLoading(false);
    }

    async function handleAdjust(sign: 1 | -1) {
        if (busy) return;
        const value = Math.abs(Math.round(Number(amount))) * sign;
        if (!Number.isFinite(value) || value === 0) {
            setMessage({ type: "err", text: "أدخل مقداراً صحيحاً" });
            return;
        }
        setBusy(true);
        setMessage(null);
        const res = await adminAdjustWashaCredits({ identifier, delta: value, reason });
        if (res.ok) {
            setMessage({
                type: "ok",
                text: `تم ${sign > 0 ? "المنح" : "الخصم"} — الرصيد الآن ${res.balance} حصة`,
            });
            await handleSearch();
        } else {
            setMessage({ type: "err", text: res.error });
        }
        setBusy(false);
    }

    return (
        <div className="space-y-4">
            <p className="text-theme-subtle text-sm">
                ابحث بالاسم المستخدم أو البريد أو معرّف الحساب، ثم امنح أو اخصم رصيد توليد يدوياً. كل حركة تُقيَّد في السجل.
            </p>

            <div className="flex gap-2">
                <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="اسم المستخدم / البريد / المعرّف"
                    className="flex-1 bg-theme-input border border-theme-subtle/40 rounded-xl px-3 py-2.5 text-sm text-theme"
                />
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="btn-gold px-4 rounded-xl flex items-center gap-2 text-sm font-bold disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    بحث
                </button>
            </div>

            {message && (
                <p
                    className={`text-sm rounded-xl px-3 py-2 text-center ${
                        message.type === "ok"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                >
                    {message.text}
                </p>
            )}

            {overview && (
                <div className="rounded-xl border border-theme-subtle/40 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-theme">
                                {overview.user.display_name || overview.user.username || overview.user.id}
                            </div>
                            <div className="text-xs text-theme-subtle">
                                {overview.user.username ? `@${overview.user.username}` : overview.user.email} · {overview.user.role}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-amber-500">
                            <Wallet className="w-5 h-5" />
                            <span className="text-2xl font-extrabold tabular-nums">{overview.balance}</span>
                            <span className="text-xs text-theme-subtle">حصة</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-theme-subtle">
                        <span>إجمالي المُشترى: <b className="text-theme">{overview.lifetimePurchased}</b></span>
                        <span>إجمالي المُستهلك: <b className="text-theme">{overview.lifetimeConsumed}</b></span>
                    </div>

                    {/* أدوات المنح/الخصم */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-theme-subtle/40 pt-3">
                        <input
                            type="number"
                            dir="ltr"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="المقدار"
                            className="bg-theme-input border border-theme-subtle/40 rounded-xl px-3 py-2.5 text-sm text-theme"
                        />
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="السبب (اختياري)"
                            className="sm:col-span-2 bg-theme-input border border-theme-subtle/40 rounded-xl px-3 py-2.5 text-sm text-theme"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleAdjust(1)}
                            disabled={busy}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/90 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> منح
                        </button>
                        <button
                            onClick={() => handleAdjust(-1)}
                            disabled={busy}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600/90 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                            <Minus className="w-4 h-4" /> خصم
                        </button>
                    </div>

                    {/* السجل */}
                    {overview.ledger.length > 0 && (
                        <div className="border-t border-theme-subtle/40 pt-3">
                            <div className="text-xs font-bold text-theme mb-2">آخر الحركات</div>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                {overview.ledger.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between text-xs">
                                        <span className="text-theme-subtle">
                                            {ENTRY_LABELS[entry.entry_type] ?? entry.entry_type}
                                            {entry.reason ? ` · ${entry.reason}` : ""}
                                        </span>
                                        <span className={`font-bold tabular-nums ${entry.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            {entry.delta >= 0 ? "+" : ""}{entry.delta}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
