"use client";

// وشّى | WASHA — مركز التسويق الذكي: الشرائح + الحملات البريدية
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Crown, Heart, AlertTriangle, ShoppingBag, ShoppingCart,
    Paintbrush, Sparkles, Mail, Users, Send, Loader2,
    ChevronDown, CheckCircle, XCircle, BarChart2, RefreshCw,
} from "lucide-react";
import type { SegmentSummary, CustomerSegment } from "@/lib/segment-engine";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
    Crown, Heart, AlertTriangle, ShoppingBag, ShoppingCart,
    Paintbrush, Sparkles, Mail,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignResult {
    sent: number;
    failed: number;
    message: string;
}

interface Props {
    segments: SegmentSummary;
    onRefresh: () => void;
    isRefreshing: boolean;
}

// ─── Segment Card ─────────────────────────────────────────────────────────────
function SegmentCard({
    segment,
    selected,
    onSelect,
}: {
    segment: CustomerSegment;
    selected: boolean;
    onSelect: (id: string) => void;
}) {
    const Icon = ICON_MAP[segment.icon] ?? Users;
    return (
        <motion.button
            layout
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(segment.id)}
            className={`relative w-full text-right p-4 rounded-2xl border transition-all duration-200 ${
                selected
                    ? "border-gold/60 bg-gold/10 shadow-[0_0_20px_var(--neon-gold,rgba(212,175,55,0.15))]"
                    : "border-theme-soft bg-theme-surface hover:border-gold/30"
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className="mt-0.5 rounded-xl p-2 shrink-0"
                    style={{ backgroundColor: `${segment.color}22`, color: segment.color }}
                >
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-theme-strong">{segment.labelAr}</span>
                        <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${segment.color}22`, color: segment.color }}
                        >
                            {segment.count}
                        </span>
                    </div>
                    <p className="text-xs text-theme-faint mt-1 truncate">{segment.description}</p>
                </div>
            </div>
            {selected && (
                <div className="absolute top-3 left-3">
                    <CheckCircle className="w-4 h-4 text-gold" />
                </div>
            )}
        </motion.button>
    );
}

// ─── Campaign Builder ─────────────────────────────────────────────────────────
function CampaignBuilder({
    segments,
    selectedSegmentId,
}: {
    segments: CustomerSegment[];
    selectedSegmentId: string | null;
}) {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [result, setResult] = useState<CampaignResult | null>(null);
    const [isPending, startTransition] = useTransition();

    const targetSegment = segments.find((s) => s.id === selectedSegmentId);
    const canSend = subject.trim().length > 0 && body.trim().length > 0 && !!targetSegment;

    const handleSend = () => {
        if (!canSend || !targetSegment) return;
        startTransition(async () => {
            try {
                const { sendCampaignToSegment } = await import("@/app/actions/marketing-campaigns");
                const res = await sendCampaignToSegment({
                    segmentId: targetSegment.id,
                    userIds: targetSegment.userIds,
                    subject: subject.trim(),
                    body: body.trim(),
                });
                setResult(res);
                if (res.sent > 0) {
                    setSubject("");
                    setBody("");
                }
            } catch {
                setResult({ sent: 0, failed: 0, message: "حدث خطأ أثناء إرسال الحملة" });
            }
        });
    };

    return (
        <div className="rounded-2xl border border-theme-soft bg-theme-surface overflow-hidden">
            <button
                className="w-full flex items-center justify-between p-4 text-right"
                onClick={() => setExpanded((v) => !v)}
            >
                <span className="font-bold text-theme-strong flex items-center gap-2">
                    <Send className="w-4 h-4 text-gold" />
                    بناء حملة بريدية
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-theme-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4">
                            {/* Target segment indicator */}
                            {targetSegment ? (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20">
                                    <Users className="w-4 h-4 text-gold shrink-0" />
                                    <span className="text-sm text-theme-strong">
                                        الشريحة المستهدفة:{" "}
                                        <strong>{targetSegment.labelAr}</strong>{" "}
                                        <span className="text-theme-faint">({targetSegment.count} عميل)</span>
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-theme-faint p-3 rounded-xl bg-theme-subtle">
                                    اختر شريحة من الأعلى لتحديد المستلمين
                                </p>
                            )}

                            {/* Subject */}
                            <div>
                                <label className="block text-xs text-theme-faint mb-1.5 font-medium">
                                    عنوان الرسالة
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="مثال: عرض حصري لعملائنا المميزين..."
                                    className="input-dark w-full text-sm"
                                    maxLength={150}
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block text-xs text-theme-faint mb-1.5 font-medium">
                                    نص الرسالة
                                </label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="اكتب نص رسالتك هنا... يمكنك استخدام HTML بسيط."
                                    className="input-dark w-full text-sm min-h-[120px] resize-none"
                                    maxLength={5000}
                                />
                                <p className="text-xs text-theme-faint mt-1">
                                    {body.length}/5000 حرف
                                </p>
                            </div>

                            {/* Send button */}
                            <button
                                onClick={handleSend}
                                disabled={!canSend || isPending}
                                className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        جارٍ الإرسال...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        إرسال الحملة
                                    </>
                                )}
                            </button>

                            {/* Result */}
                            <AnimatePresence>
                                {result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                                            result.sent > 0
                                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                                : "bg-red-500/10 border border-red-500/20 text-red-400"
                                        }`}
                                    >
                                        {result.sent > 0 ? (
                                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        )}
                                        <span>{result.message}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MarketingHubClient({ segments, onRefresh, isRefreshing }: Props) {
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

    const handleSegmentSelect = (id: string) => {
        setSelectedSegment((prev) => (prev === id ? null : id));
    };

    const totalUsers = segments.totalProfilesAnalyzed;
    const computedAt = new Date(segments.computedAt).toLocaleString("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <div className="space-y-6" dir="rtl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-xl font-bold text-theme-strong flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-gold" />
                        شرائح الجمهور والحملات
                    </h2>
                    <p className="text-xs text-theme-faint mt-1">
                        {totalUsers} ملف تم تحليله · محدّث {computedAt}
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-soft bg-theme-surface text-sm text-theme-soft hover:border-gold/40 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    تحديث
                </button>
            </div>

            {/* ── Segment Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {segments.segments.map((seg) => (
                    <SegmentCard
                        key={seg.id}
                        segment={seg}
                        selected={selectedSegment === seg.id}
                        onSelect={handleSegmentSelect}
                    />
                ))}
            </div>

            {/* ── Selected segment detail ── */}
            <AnimatePresence>
                {selectedSegment && (() => {
                    const seg = segments.segments.find((s) => s.id === selectedSegment);
                    if (!seg) return null;
                    const Icon = ICON_MAP[seg.icon] ?? Users;
                    return (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div
                                className="p-4 rounded-2xl border"
                                style={{
                                    borderColor: `${seg.color}40`,
                                    backgroundColor: `${seg.color}0d`,
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="rounded-xl p-2.5"
                                        style={{ backgroundColor: `${seg.color}22`, color: seg.color }}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-theme-strong">{seg.labelAr}</h3>
                                        <p className="text-sm text-theme-faint">{seg.description}</p>
                                    </div>
                                    <div className="mr-auto text-left">
                                        <span
                                            className="text-2xl font-black"
                                            style={{ color: seg.color }}
                                        >
                                            {seg.count}
                                        </span>
                                        <p className="text-xs text-theme-faint">عميل</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* ── Campaign Builder ── */}
            <CampaignBuilder
                segments={segments.segments}
                selectedSegmentId={selectedSegment}
            />
        </div>
    );
}
