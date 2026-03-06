"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff, Clock, Megaphone,
    Calendar, Link as LinkIcon, ArrowUpDown, Zap, AlertTriangle, Gift,
    Sparkles, ChevronDown, Save, Search, Target, Timer, LogOut,
    MousePointerClick, ArrowDown, Globe2,
} from "lucide-react";
import {
    createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementActive,
} from "@/app/actions/announcements";
import {
    type Announcement, type AnnouncementTrigger, type TriggerType,
    PAGE_OPTIONS, DEFAULT_TRIGGER,
} from "@/lib/announcement-types";

// ─── Template Definitions ───────────────────────────────

const templates = [
    { id: "gold" as const, label: "ذهبي فاخر", preview: "bg-gradient-to-r from-[#5A3E2B] via-[#ceae7f] to-[#5A3E2B] text-white", icon: Sparkles },
    { id: "gradient" as const, label: "متدرج حيوي", preview: "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white", icon: Zap },
    { id: "minimal" as const, label: "بسيط أنيق", preview: "bg-white/[0.05] border border-white/[0.1] text-fg/80", icon: Eye },
    { id: "alert" as const, label: "تنبيه عاجل", preview: "bg-red-500/10 border border-red-500/30 text-red-400", icon: AlertTriangle },
    { id: "promo" as const, label: "عرض ترويجي", preview: "bg-gradient-to-r from-emerald-600 to-teal-500 text-white", icon: Gift },
    // ── قوالب جديدة ──
    { id: "neon" as const, label: "نيون زجاجي", preview: "bg-blue-500/[0.08] border border-blue-400/20 text-blue-200 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.15)]", icon: Zap },
    { id: "sunset" as const, label: "غروب دافئ", preview: "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-400/15 text-amber-100 backdrop-blur-sm", icon: Sparkles },
    { id: "frost" as const, label: "صقيع لامع", preview: "bg-white/[0.06] border border-white/[0.12] text-white/90 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]", icon: Eye },
    { id: "rose" as const, label: "وردي ناعم", preview: "bg-gradient-to-r from-pink-500/10 via-rose-400/10 to-fuchsia-500/10 border border-pink-400/15 text-pink-200 backdrop-blur-sm", icon: Gift },
    { id: "aurora" as const, label: "شفق قطبي", preview: "bg-gradient-to-r from-violet-600/15 via-cyan-500/15 to-emerald-500/15 border border-violet-400/15 text-cyan-100 backdrop-blur-md", icon: Sparkles },
];

const typeLabels: Record<string, { label: string; icon: any }> = {
    banner: { label: "شريط علوي", icon: Megaphone },
    popup: { label: "نافذة منبثقة", icon: Eye },
    toast: { label: "إشعار سريع", icon: Zap },
    marquee: { label: "شريط متحرك", icon: ArrowUpDown },
};

const triggerLabels: Record<TriggerType, { label: string; desc: string; icon: any }> = {
    on_load: { label: "عند الدخول", desc: "يظهر فوراً عند فتح الموقع", icon: Globe2 },
    after_delay: { label: "بعد مدة", desc: "يظهر بعد مرور وقت محدد", icon: Timer },
    page_enter: { label: "دخول صفحة", desc: "يظهر عند الانتقال لصفحة معينة", icon: MousePointerClick },
    exit_intent: { label: "نية المغادرة", desc: "يظهر عند محاولة مغادرة الصفحة", icon: LogOut },
    scroll_depth: { label: "عمق التمرير", desc: "يظهر بعد التمرير لنسبة من الصفحة", icon: ArrowDown },
    always: { label: "دائماً", desc: "يظهر في كل صفحة بشكل مستمر", icon: Target },
};

const frequencyLabels: Record<string, string> = {
    once: "مرة واحدة فقط",
    session: "كل جلسة",
    always: "في كل مرة",
};

// ─── Main Component ─────────────────────────────────────

export function AnnouncementsClient({ announcements: initial }: { announcements: Announcement[] }) {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: "", body: "", type: "banner" as Announcement["type"],
        template: "gold" as Announcement["template"],
        link: "", linkText: "", isActive: true,
        startDate: "", endDate: "", priority: 0,
        trigger: { ...DEFAULT_TRIGGER } as AnnouncementTrigger,
    });

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const resetForm = () => {
        setForm({
            title: "", body: "", type: "banner", template: "gold", link: "", linkText: "",
            isActive: true, startDate: "", endDate: "", priority: 0,
            trigger: { ...DEFAULT_TRIGGER },
        });
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (a: Announcement) => {
        setForm({
            title: a.title, body: a.body, type: a.type, template: a.template,
            link: a.link || "", linkText: a.linkText || "", isActive: a.isActive,
            startDate: a.startDate ? a.startDate.slice(0, 16) : "",
            endDate: a.endDate ? a.endDate.slice(0, 16) : "",
            priority: a.priority,
            trigger: a.trigger ? { ...a.trigger } : { ...DEFAULT_TRIGGER },
        });
        setEditingId(a.id);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.body.trim()) { showToast("يرجى ملء العنوان والمحتوى"); return; }
        setLoading(true);

        const payload = {
            title: form.title.trim(),
            body: form.body.trim(),
            type: form.type,
            template: form.template,
            link: form.link.trim() || undefined,
            linkText: form.linkText.trim() || undefined,
            isActive: form.isActive,
            startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
            endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
            priority: form.priority,
            trigger: form.trigger,
        };

        const result = editingId
            ? await updateAnnouncement(editingId, payload)
            : await createAnnouncement(payload);

        setLoading(false);

        if (result.success) {
            showToast(editingId ? "تم تحديث الإعلان ✓" : "تم إنشاء الإعلان ✓");
            resetForm();
            router.refresh();
        } else {
            showToast("خطأ: " + (result.error || "فشلت العملية"));
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmDeleteId(null);
        setLoading(true);
        const result = await deleteAnnouncement(id);
        setLoading(false);
        if (result.success) { showToast("تم حذف الإعلان ✓"); router.refresh(); }
        else showToast("خطأ: " + result.error);
    };

    const handleToggle = async (id: string) => {
        setLoading(true);
        const result = await toggleAnnouncementActive(id);
        setLoading(false);
        if (result.success) { showToast("تم التبديل ✓"); router.refresh(); }
    };

    const updateTrigger = (updates: Partial<AnnouncementTrigger>) => {
        setForm((f) => ({ ...f, trigger: { ...f.trigger, ...updates } }));
    };

    // ─── Stats
    const stats = useMemo(() => {
        const now = new Date();
        const active = initial.filter((a) => {
            if (!a.isActive) return false;
            if (a.startDate && new Date(a.startDate) > now) return false;
            if (a.endDate && new Date(a.endDate) < now) return false;
            return true;
        }).length;
        const scheduled = initial.filter((a) => a.isActive && a.startDate && new Date(a.startDate) > now).length;
        const expired = initial.filter((a) => a.endDate && new Date(a.endDate) < now).length;
        return { total: initial.length, active, scheduled, expired };
    }, [initial]);

    const filtered = useMemo(() => {
        if (!search.trim()) return initial;
        const q = search.toLowerCase();
        return initial.filter((a) =>
            a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
        );
    }, [initial, search]);

    const templatePreview = templates.find((t) => t.id === form.template);

    return (
        <div className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm shadow-lg backdrop-blur">
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "الإجمالي", value: stats.total, color: "text-fg/60", bg: "bg-white/[0.03] border-white/[0.06]" },
                    { label: "نشطة حالياً", value: stats.active, color: "text-emerald-400", bg: stats.active > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.03] border-white/[0.06]" },
                    { label: "مجدولة", value: stats.scheduled, color: "text-blue-400", bg: stats.scheduled > 0 ? "bg-blue-500/5 border-blue-500/20" : "bg-white/[0.03] border-white/[0.06]" },
                    { label: "منتهية", value: stats.expired, color: "text-fg/30", bg: "bg-white/[0.03] border-white/[0.06]" },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-2xl border backdrop-blur-sm ${s.bg}`}>
                        <span className="text-[11px] text-fg/40 font-medium">{s.label}</span>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* ─── Toolbar ─── */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث في الإعلانات..."
                        className="w-full pr-10 pl-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30 transition-all" />
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-lg text-sm font-bold hover:bg-gold/20 transition-all">
                    <Plus className="w-4 h-4" /> إعلان جديد
                </button>
            </div>

            {/* ─── Create/Edit Form ─── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="rounded-2xl border border-gold/20 bg-gold/[0.02] backdrop-blur-sm overflow-hidden"
                    >
                        <div className="p-6 space-y-5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-fg/80 flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-gold" />
                                    {editingId ? "تعديل الإعلان" : "إعلان جديد"}
                                </h3>
                                <button onClick={resetForm} className="p-2 rounded-lg hover:bg-white/5 text-fg/40">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Title + Body */}
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5">العنوان *</label>
                                    <input type="text" value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="عنوان الإعلان"
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5">المحتوى *</label>
                                    <textarea value={form.body}
                                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                                        placeholder="نص الإعلان..."
                                        rows={2}
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30 resize-none" />
                                </div>
                            </div>

                            {/* Type + Template */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5">نوع العرض</label>
                                    <select value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30">
                                        {Object.entries(typeLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5">الأولوية</label>
                                    <input type="number" min="0" value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30" />
                                </div>
                            </div>

                            {/* Template Selection */}
                            <div>
                                <label className="block text-xs font-medium text-fg/50 mb-2">القالب</label>
                                <div className="grid grid-cols-5 gap-2 max-h-[140px] overflow-y-auto pr-1">
                                    {templates.map((t) => (
                                        <button key={t.id}
                                            onClick={() => setForm({ ...form, template: t.id })}
                                            className={`relative p-3 rounded-xl border-2 transition-all text-center ${form.template === t.id
                                                ? "border-gold shadow-[0_0_15px_rgba(206,174,127,0.2)]"
                                                : "border-white/[0.06] hover:border-white/[0.15]"}`}
                                        >
                                            <div className={`w-full h-6 rounded-lg mb-1.5 ${t.preview}`} />
                                            <span className="text-[10px] text-fg/50 font-medium">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div>
                                <label className="block text-xs font-medium text-fg/50 mb-2">معاينة حية</label>
                                <div className={`px-5 py-3 rounded-xl text-center ${templatePreview?.preview}`}>
                                    <p className="font-bold text-sm">{form.title || "عنوان الإعلان"}</p>
                                    <p className="text-xs opacity-80 mt-0.5">{form.body || "محتوى الإعلان سيظهر هنا..."}</p>
                                    {form.linkText && (
                                        <span className="inline-block mt-1.5 text-xs font-bold underline">{form.linkText}</span>
                                    )}
                                </div>
                            </div>

                            {/* ═══ TRIGGER SETTINGS ═══ */}
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
                                <h4 className="text-xs font-bold text-gold flex items-center gap-2">
                                    <Target className="w-4 h-4" /> إعدادات الظهور والمحفّزات
                                </h4>

                                {/* Trigger Type */}
                                <div>
                                    <label className="block text-[11px] font-medium text-fg/40 mb-2">متى يظهر الإعلان؟</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {(Object.entries(triggerLabels) as [TriggerType, typeof triggerLabels[TriggerType]][]).map(([key, val]) => (
                                            <button key={key}
                                                onClick={() => updateTrigger({ type: key })}
                                                className={`p-2.5 rounded-lg border text-right transition-all ${form.trigger.type === key
                                                    ? "border-gold/30 bg-gold/5"
                                                    : "border-white/[0.06] hover:border-white/[0.12]"}`}
                                            >
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <val.icon className={`w-3.5 h-3.5 ${form.trigger.type === key ? "text-gold" : "text-fg/30"}`} />
                                                    <span className={`text-[11px] font-bold ${form.trigger.type === key ? "text-gold" : "text-fg/50"}`}>{val.label}</span>
                                                </div>
                                                <p className="text-[9px] text-fg/25 leading-tight">{val.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Conditional Fields based on trigger type */}
                                {form.trigger.type === "after_delay" && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-fg/40 mb-1.5">
                                            <Timer className="w-3 h-3 inline ml-1" /> المدة بالثواني
                                        </label>
                                        <input type="number" min="1" max="300"
                                            value={form.trigger.delaySeconds || 5}
                                            onChange={(e) => updateTrigger({ delaySeconds: parseInt(e.target.value) || 5 })}
                                            className="w-32 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-fg focus:outline-none focus:border-gold/30" />
                                        <p className="text-[9px] text-fg/20 mt-1">سيظهر الإعلان بعد {form.trigger.delaySeconds || 5} ثانية من دخول الزائر</p>
                                    </div>
                                )}

                                {form.trigger.type === "page_enter" && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-fg/40 mb-2">
                                            <MousePointerClick className="w-3 h-3 inline ml-1" /> الصفحات المستهدفة
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {PAGE_OPTIONS.map((p) => {
                                                const selected = form.trigger.targetPages?.includes(p.value) || false;
                                                return (
                                                    <button key={p.value}
                                                        onClick={() => {
                                                            const current = form.trigger.targetPages || [];
                                                            const next = selected
                                                                ? current.filter((v) => v !== p.value)
                                                                : [...current, p.value];
                                                            updateTrigger({ targetPages: next });
                                                        }}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${selected
                                                            ? "border-gold/30 bg-gold/10 text-gold"
                                                            : "border-white/[0.06] text-fg/40 hover:border-white/[0.12]"}`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {form.trigger.type === "scroll_depth" && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-fg/40 mb-1.5">
                                            <ArrowDown className="w-3 h-3 inline ml-1" /> نسبة التمرير (%)
                                        </label>
                                        <input type="number" min="10" max="100" step="10"
                                            value={form.trigger.scrollPercent || 50}
                                            onChange={(e) => updateTrigger({ scrollPercent: parseInt(e.target.value) || 50 })}
                                            className="w-32 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-fg focus:outline-none focus:border-gold/30" />
                                        <p className="text-[9px] text-fg/20 mt-1">يظهر عند تمرير {form.trigger.scrollPercent || 50}% من الصفحة</p>
                                    </div>
                                )}

                                {/* Frequency + Dismissible */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-fg/40 mb-1.5">تكرار الظهور</label>
                                        <select value={form.trigger.frequency}
                                            onChange={(e) => updateTrigger({ frequency: e.target.value as any })}
                                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-fg focus:outline-none focus:border-gold/30">
                                            {Object.entries(frequencyLabels).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={form.trigger.dismissible}
                                                onChange={(e) => updateTrigger({ dismissible: e.target.checked })}
                                                className="rounded border-white/20" />
                                            <span className="text-xs text-fg/50">يمكن إغلاقه</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Link */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5">رابط (اختياري)</label>
                                    <input type="url" value={form.link}
                                        onChange={(e) => setForm({ ...form, link: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5">نص الرابط</label>
                                    <input type="text" value={form.linkText}
                                        onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                                        placeholder="مثال: تسوق الآن"
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30" />
                                </div>
                            </div>

                            {/* Scheduling */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> بداية العرض
                                    </label>
                                    <input type="datetime-local" value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-fg/50 mb-1.5 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> نهاية العرض
                                    </label>
                                    <input type="datetime-local" value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30" dir="ltr" />
                                </div>
                            </div>

                            {/* Active + Submit */}
                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="rounded border-white/20" />
                                    <span className="text-sm text-fg/70">نشط فوراً</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button onClick={resetForm}
                                        className="px-4 py-2 text-sm text-fg/40 hover:text-fg/60 transition-colors">
                                        إلغاء
                                    </button>
                                    <button onClick={handleSubmit} disabled={loading}
                                        className="px-6 py-2.5 bg-gold/20 text-gold font-bold rounded-xl hover:bg-gold/30 transition-all disabled:opacity-50 flex items-center gap-2 text-sm">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {editingId ? "حفظ التعديلات" : "إنشاء الإعلان"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Announcements List ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-16 text-center text-fg/20">
                        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">لا توجد إعلانات</p>
                        <button onClick={() => { resetForm(); setShowForm(true); }}
                            className="mt-3 text-gold hover:text-gold-light text-sm font-medium">
                            إنشاء أول إعلان
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {filtered.map((a, i) => {
                            const tmpl = templates.find((t) => t.id === a.template);
                            const typeInfo = typeLabels[a.type];
                            const triggerInfo = a.trigger ? triggerLabels[a.trigger.type] : null;
                            const now = new Date();
                            const isScheduled = a.startDate && new Date(a.startDate) > now;
                            const isExpired = a.endDate && new Date(a.endDate) < now;
                            const isLive = a.isActive && !isScheduled && !isExpired;

                            return (
                                <motion.div key={a.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                    className={`px-5 py-4 hover:bg-white/[0.02] transition-all ${!a.isActive ? "opacity-50" : ""}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Template Preview Mini */}
                                        <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${tmpl?.preview || "bg-white/5"}`}>
                                            {tmpl?.icon && <tmpl.icon className="w-5 h-5" />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="text-sm font-bold text-fg/80 truncate">{a.title}</h4>
                                                {isLive && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> نشط
                                                    </span>
                                                )}
                                                {isScheduled && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">مجدول</span>
                                                )}
                                                {isExpired && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-fg/30 font-bold">منتهي</span>
                                                )}
                                                {!a.isActive && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-fg/20 font-bold">معطّل</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-fg/30 truncate">{a.body}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-fg/20 flex-wrap">
                                                <span className="flex items-center gap-0.5">
                                                    {typeInfo?.icon && <typeInfo.icon className="w-2.5 h-2.5" />} {typeInfo?.label}
                                                </span>
                                                {triggerInfo && (
                                                    <span className="flex items-center gap-0.5 text-gold/50">
                                                        <triggerInfo.icon className="w-2.5 h-2.5" /> {triggerInfo.label}
                                                    </span>
                                                )}
                                                {a.trigger?.frequency && (
                                                    <span className="text-fg/15">· {frequencyLabels[a.trigger.frequency]}</span>
                                                )}
                                                {a.startDate && <span>من: {new Date(a.startDate).toLocaleDateString("ar-SA")}</span>}
                                                {a.endDate && <span>إلى: {new Date(a.endDate).toLocaleDateString("ar-SA")}</span>}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => handleToggle(a.id)}
                                                className={`p-2 rounded-lg transition-all ${a.isActive ? "text-emerald-400 hover:bg-emerald-500/10" : "text-fg/20 hover:bg-white/5"}`}
                                                title={a.isActive ? "إيقاف" : "تفعيل"}>
                                                {a.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => startEdit(a)}
                                                className="p-2 rounded-lg text-fg/40 hover:text-gold hover:bg-gold/10 transition-all" title="تعديل">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            {confirmDeleteId === a.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleDelete(a.id)}
                                                        className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                                        تأكيد
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2 py-1 rounded text-[10px] text-fg/40 hover:bg-white/5">
                                                        إلغاء
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteId(a.id)}
                                                    className="p-2 rounded-lg text-fg/40 hover:text-red-400 hover:bg-red-500/10 transition-all" title="حذف">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
