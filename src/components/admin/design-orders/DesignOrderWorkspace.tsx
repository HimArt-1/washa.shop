"use client";

import { useMemo, useRef, useState, type ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    Loader2,
    Palette,
    Printer,
    RefreshCw,
    Ruler,
    Save,
    Send,
    Settings2,
    Shirt,
    Slash,
    Sparkles,
    SwatchBook,
    Upload,
    UserCircle2,
    Users,
    X,
} from "lucide-react";
import {
    assignDesignOrder,
    rejectDesignOrder,
    renewTrackerToken,
    sendDesignOrderToCustomer,
    skipDesignResults,
    updateDesignOrderNotes,
    updateDesignOrderStatus,
    uploadDesignResultFile,
} from "@/app/actions/smart-store";
import type { CustomDesignOrder, CustomDesignOrderStatus } from "@/types/database";
import { DesignOrderAdminChat } from "@/components/admin/DesignOrderAdminChat";

type AdminProfile = {
    id: string;
    display_name: string;
    avatar_url: string | null;
};

const statusMeta: Record<CustomDesignOrderStatus, { label: string; className: string; icon: ElementType }> = {
    new: { label: "جديد", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: AlertCircle },
    in_progress: { label: "قيد التنفيذ", className: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    awaiting_review: { label: "بانتظار المراجعة", className: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Sparkles },
    completed: { label: "مكتمل", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { label: "ملغي", className: "bg-red-500/10 text-red-400 border-red-500/20", icon: X },
    modification_requested: { label: "طلب تعديل", className: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertCircle },
};

const nextStatuses: Record<CustomDesignOrderStatus, CustomDesignOrderStatus[]> = {
    new: ["in_progress", "cancelled"],
    in_progress: ["awaiting_review", "cancelled"],
    awaiting_review: ["completed", "in_progress"],
    completed: [],
    cancelled: [],
    modification_requested: ["in_progress", "cancelled"],
};

function formatMoney(value: number | null) {
    if (!value) return "غير محدد";
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
    }).format(value);
}

function getMethodLabel(method: CustomDesignOrder["design_method"]) {
    switch (method) {
        case "from_text":
            return "من وصف";
        case "from_image":
            return "من صورة";
        case "studio":
            return "من الاستوديو";
        default:
            return method;
    }
}

function DetailCard({
    icon: Icon,
    label,
    value,
    color,
    imageUrl,
}: {
    icon: ElementType;
    label: string;
    value: string;
    color?: string;
    imageUrl?: string | null;
}) {
    return (
        <div className="theme-surface-panel rounded-2xl p-4 text-center">
            {imageUrl ? (
                <img src={imageUrl} alt={label} className="mb-3 h-24 w-full rounded-xl object-cover" />
            ) : (
                <div className="mb-3 flex items-center justify-center">
                    {color ? (
                        <div className="h-10 w-10 rounded-xl border border-theme-soft" style={{ backgroundColor: color }} />
                    ) : (
                        <Icon className="h-5 w-5 text-theme-faint" />
                    )}
                </div>
            )}
            <p className="text-[10px] text-theme-subtle">{label}</p>
            <p className="mt-1 text-xs font-medium text-theme">{value}</p>
        </div>
    );
}

function ResultUpload({
    label,
    currentUrl,
    uploading,
    onUpload,
    icon: Icon,
    accept,
}: {
    label: string;
    currentUrl: string | null;
    uploading: boolean;
    onUpload: (file: File) => void;
    icon: ElementType;
    accept?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-4 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)]">
                <Icon className="h-5 w-5 text-theme-faint" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-theme">{label}</p>
                {currentUrl ? (
                    <a href={currentUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-gold hover:underline">
                        عرض الملف المرفوع
                    </a>
                ) : (
                    <p className="mt-1 text-xs text-theme-faint">لم يتم الرفع بعد</p>
                )}
            </div>

            <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-theme-subtle bg-theme-faint px-3 py-2 text-xs font-medium text-theme-subtle transition-colors hover:border-gold/30 sm:justify-start">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "جاري..." : currentUrl ? "تغيير" : "رفع"}
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept ?? "image/*"}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (file) onUpload(file);
                    }}
                    className="hidden"
                    disabled={uploading}
                />
            </label>
        </div>
    );
}

export function DesignOrderWorkspace({
    order,
    adminList,
}: {
    order: CustomDesignOrder;
    adminList: AdminProfile[];
}) {
    const router = useRouter();
    const [currentOrder, setCurrentOrder] = useState(order);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState(order.admin_notes ?? "");
    const [uploading, setUploading] = useState<string | null>(null);
    const [finalPrice, setFinalPrice] = useState(order.final_price?.toString() || "");
    const [assignedTo, setAssignedTo] = useState(order.assigned_to ?? "");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [showSendConfirm, setShowSendConfirm] = useState(false);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [tokenExpiry, setTokenExpiry] = useState(order.tracker_token_expires_at);
    const [renewingToken, setRenewingToken] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const status = statusMeta[currentOrder.status];
    const next = nextStatuses[currentOrder.status] || [];
    const assignedAdmin = useMemo(
        () => adminList.find((admin) => admin.id === assignedTo)?.display_name ?? null,
        [adminList, assignedTo],
    );

    const refreshView = () => {
        router.refresh();
    };

    const updateOrder = (patch: Partial<CustomDesignOrder>) => {
        setCurrentOrder((prev) => ({ ...prev, ...patch }));
    };

    const handleStatusChange = async (newStatus: CustomDesignOrderStatus) => {
        setLoading(true);
        setError(null);
        try {
            const res = await updateDesignOrderStatus(currentOrder.id, newStatus);
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }

            updateOrder({ status: newStatus });
            refreshView();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر تحديث حالة الطلب.");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (adminId: string) => {
        const previousAssignedTo = assignedTo;
        setAssignedTo(adminId);
        setError(null);

        try {
            const res = await assignDesignOrder(currentOrder.id, adminId || null);
            if ("error" in res && res.error) {
                setAssignedTo(previousAssignedTo);
                setError(res.error);
                return;
            }

            updateOrder({ assigned_to: adminId || null });
            refreshView();
        } catch (error) {
            setAssignedTo(previousAssignedTo);
            setError(error instanceof Error ? error.message : "تعذر تحديث التعيين.");
        }
    };

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(currentOrder.ai_prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            setError("تعذر نسخ البرومبت الآن.");
        }
    };

    const handleSaveNotes = async () => {
        setError(null);
        try {
            const res = await updateDesignOrderNotes(currentOrder.id, notes);
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }

            updateOrder({ admin_notes: notes });
            refreshView();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ الملاحظات.");
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await skipDesignResults(currentOrder.id);
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }

            updateOrder({ skip_results: true, status: "completed" });
            setShowSkipConfirm(false);
            refreshView();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر تجاوز النتائج.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrepareSendToCustomer = () => {
        const priceNum = parseFloat(finalPrice);
        if (Number.isNaN(priceNum) || priceNum <= 0) {
            setError("يرجى إدخال سعر صحيح أكبر من الصفر.");
            return;
        }

        setError(null);
        setShowSkipConfirm(false);
        setShowSendConfirm(true);
    };

    const handleSendToCustomer = async () => {
        const priceNum = parseFloat(finalPrice);
        if (Number.isNaN(priceNum) || priceNum <= 0) {
            setError("يرجى إدخال سعر صحيح أكبر من الصفر.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await sendDesignOrderToCustomer(currentOrder.id, priceNum);
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }

            updateOrder({
                is_sent_to_customer: true,
                final_price: priceNum,
                status: "awaiting_review",
            });
            setShowSendConfirm(false);
            refreshView();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر إرسال الطلب للعميل.");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setError("يرجى ذكر سبب الرفض.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await rejectDesignOrder(currentOrder.id, rejectReason.trim());
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }

            updateOrder({ status: "cancelled" });
            setShowRejectForm(false);
            setRejectReason("");
            refreshView();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر رفض الطلب.");
        } finally {
            setLoading(false);
        }
    };

    const trackerLink = typeof window !== "undefined"
        ? `${window.location.origin}/track/${currentOrder.id}?token=${currentOrder.tracker_token}`
        : `/track/${currentOrder.id}?token=${currentOrder.tracker_token}`;

    const isTokenExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : false;

    const handleRenewToken = async () => {
        setRenewingToken(true);
        setError(null);
        try {
            const res = await renewTrackerToken(currentOrder.id);
            if ("error" in res) { setError(res.error); return; }
            setTokenExpiry(res.newExpiry);
        } catch (err) {
            setError(err instanceof Error ? err.message : "تعذر تجديد الرابط.");
        } finally {
            setRenewingToken(false);
        }
    };

    const handleCopyTrackerLink = async () => {
        try {
            await navigator.clipboard.writeText(trackerLink);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            setError("تعذر نسخ الرابط.");
        }
    };

    const handleUpload = async (
        field: "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url",
        file: File,
    ) => {
        setUploading(field);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await uploadDesignResultFile(currentOrder.id, field, formData);
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }

            updateOrder({ [field]: res.url } as Partial<CustomDesignOrder>);
            refreshView();
        } catch (error) {
            console.error("Design result upload failed", error);
            setError("تعذر رفع الملف الآن. حاول مرة أخرى.");
        } finally {
            setUploading(null);
        }
    };

    return (
        <div className="space-y-6">
            {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <Link
                    href="/dashboard/design-orders"
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-medium text-theme-subtle transition-colors hover:text-theme sm:justify-start"
                >
                    <ArrowRight className="h-4 w-4" />
                    العودة إلى مركز العمليات
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-bold text-gold">
                        #{currentOrder.order_number}
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${status.className}`}>
                        <status.icon className="h-3.5 w-3.5" />
                        {status.label}
                    </span>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.12),transparent_30%)]" />
                    <div className="relative space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-violet-200 uppercase">
                                Design Case Workspace
                            </span>
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[11px] font-semibold text-theme-subtle">
                                {getMethodLabel(currentOrder.design_method)}
                            </span>
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-theme sm:text-3xl md:text-4xl">
                                {currentOrder.customer_name || "طلب تصميم بدون اسم عميل واضح"}
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                مساحة العمل الخاصة بهذا الطلب تجمع الفرز، التعيين، المخرجات، التسعير، والمحادثة في مسار واحد قابل للمتابعة.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">القطعة</p>
                                <p className="mt-2 text-lg font-bold text-theme">{currentOrder.garment_name}</p>
                                <p className="mt-1 text-xs text-theme-subtle">{currentOrder.color_name} · {currentOrder.size_name}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">المسؤول الحالي</p>
                                <p className="mt-2 text-lg font-bold text-theme">{assignedAdmin || "غير معيّن"}</p>
                                <p className="mt-1 text-xs text-theme-subtle">{currentOrder.customer_email || currentOrder.customer_phone || "بدون بيانات تواصل إضافية"}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">القيمة النهائية</p>
                                <p className="mt-2 text-lg font-bold text-theme">{formatMoney(currentOrder.final_price)}</p>
                                <p className="mt-1 text-xs text-theme-subtle">
                                    {currentOrder.is_sent_to_customer ? "أُرسل للعميل" : "لم يُرسل بعد"}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.aside
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel rounded-[28px] p-5 sm:p-6"
                >
                    <h3 className="text-lg font-bold text-theme">لوحة التحكم السريعة</h3>
                    <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs text-theme-faint">الأدمن المسؤول</p>
                            <div className="mt-2 flex items-start gap-3">
                                <Users className="mt-1 h-4 w-4 text-gold/70" />
                                <select
                                    value={assignedTo}
                                    onChange={(event) => handleAssign(event.target.value)}
                                    className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="">غير معيّن</option>
                                    {adminList.map((admin) => (
                                        <option key={admin.id} value={admin.id}>
                                            {admin.display_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {currentOrder.status === "new" ? (
                            <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
                                <p className="text-sm font-bold text-blue-200">قرار أولي على الطلب</p>
                                {!showRejectForm ? (
                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            onClick={() => handleStatusChange("in_progress")}
                                            disabled={loading}
                                            className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-300"
                                        >
                                            {loading ? "جاري..." : "قبول وبدء التنفيذ"}
                                        </button>
                                        <button
                                            onClick={() => setShowRejectForm(true)}
                                            disabled={loading}
                                            className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300"
                                        >
                                            رفض الطلب
                                        </button>
                                    </div>
                                ) : (
                                        <div className="mt-4 space-y-3">
                                        <textarea
                                            value={rejectReason}
                                            onChange={(event) => setRejectReason(event.target.value)}
                                            placeholder="اكتب سبب الرفض..."
                                            rows={3}
                                            className="input-dark w-full rounded-xl px-3 py-3 text-sm focus:border-red-500/30"
                                        />
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <button
                                                onClick={handleReject}
                                                disabled={loading}
                                                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300"
                                            >
                                                {loading ? "جاري..." : "تأكيد الرفض"}
                                            </button>
                                            <button
                                                onClick={() => setShowRejectForm(false)}
                                                className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm text-theme-subtle"
                                            >
                                                رجوع
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs text-theme-faint">تحريك الحالة</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {next.map((nextStatus) => {
                                        const meta = statusMeta[nextStatus];

                                        return (
                                            <button
                                                key={nextStatus}
                                                onClick={() => handleStatusChange(nextStatus)}
                                                disabled={loading}
                                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${meta.className}`}
                                            >
                                                <meta.icon className="h-3.5 w-3.5" />
                                                {meta.label}
                                            </button>
                                        );
                                    })}
                                    {!next.length ? (
                                        <span className="text-xs text-theme-faint">لا توجد نقلة حالة متاحة حاليًا.</span>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {!currentOrder.is_sent_to_customer && currentOrder.user_id && currentOrder.status !== "cancelled" ? (
                            <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
                                <p className="text-sm font-bold text-gold">اعتماد وإرسال للعميل</p>
                                <p className="mt-2 text-xs leading-6 text-theme-subtle">
                                    حدّد السعر النهائي ثم أرسل الطلب للعميل كتصميم جاهز للمراجعة أو الإضافة للسلة.
                                </p>
                                <div className="mt-4 flex flex-col gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={finalPrice}
                                        onChange={(event) => setFinalPrice(event.target.value)}
                                        placeholder="السعر النهائي"
                                        className="input-dark w-full rounded-xl border-gold/20 px-4 py-3 text-sm focus:border-gold/40"
                                    />
                                    <button
                                        onClick={handlePrepareSendToCustomer}
                                        disabled={loading || !finalPrice}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-3 text-sm font-bold text-[var(--wusha-bg)] disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        اعتماد وإرسال
                                    </button>
                                </div>
                                {showSendConfirm ? (
                                    <div className="mt-4 space-y-3 rounded-2xl border border-gold/20 bg-theme-faint p-4">
                                        <p className="text-sm font-semibold text-theme">
                                            سيتم إرسال الطلب للعميل بالسعر النهائي:
                                            <span className="mr-2 text-gold">{formatMoney(parseFloat(finalPrice) || null)}</span>
                                        </p>
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <button
                                                onClick={handleSendToCustomer}
                                                disabled={loading}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-3 text-sm font-bold text-[var(--wusha-bg)] disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                تأكيد الإرسال
                                            </button>
                                            <button
                                                onClick={() => setShowSendConfirm(false)}
                                                disabled={loading}
                                                className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm text-theme-subtle"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {/* ── Tracker Link ── */}
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-theme-faint uppercase tracking-wider">رابط متابعة العميل</p>
                                {isTokenExpired && (
                                    <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                                        منتهي الصلاحية
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-theme-faint truncate font-mono">
                                {trackerLink}
                            </p>
                            {tokenExpiry && (
                                <p className="text-[11px] text-theme-faint">
                                    ينتهي: {new Date(tokenExpiry).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyTrackerLink}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-xs font-medium text-theme-subtle hover:text-theme transition-colors"
                                >
                                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedLink ? "تم النسخ" : "نسخ الرابط"}
                                </button>
                                <button
                                    onClick={handleRenewToken}
                                    disabled={renewingToken}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/20 transition-colors disabled:opacity-50"
                                >
                                    {renewingToken
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <RefreshCw className="h-3.5 w-3.5" />
                                    }
                                    {renewingToken ? "جاري..." : "تجديد 90 يوم"}
                                </button>
                                <a
                                    href={trackerLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-xs text-theme-subtle hover:text-theme transition-colors"
                                    title="فتح رابط التتبع"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        </div>

                        {!currentOrder.skip_results && currentOrder.status !== "completed" && currentOrder.status !== "cancelled" ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setShowSendConfirm(false);
                                        setShowSkipConfirm((current) => !current);
                                    }}
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-medium text-theme-subtle transition-colors hover:text-theme"
                                >
                                    <Slash className="h-4 w-4" />
                                    تجاوز النتائج وإكمال الطلب
                                </button>
                                {showSkipConfirm ? (
                                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                        <p className="text-sm font-semibold text-theme">سيتم إغلاق الطلب كمكتمل بدون إلزامية رفع النتائج.</p>
                                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                onClick={handleSkip}
                                                disabled={loading}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-theme"
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                تأكيد التجاوز
                                            </button>
                                            <button
                                                onClick={() => setShowSkipConfirm(false)}
                                                disabled={loading}
                                                className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm text-theme-subtle"
                                            >
                                                رجوع
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel space-y-6 rounded-[28px] p-5 sm:p-6"
                >
                    {(currentOrder.customer_name || currentOrder.customer_email || currentOrder.customer_phone) ? (
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Customer Contact</p>
                            <div className="mt-3 flex items-start gap-3">
                                <UserCircle2 className="mt-1 h-5 w-5 text-gold/70" />
                                <div className="space-y-1 text-sm text-theme">
                                    <p>{currentOrder.customer_name || "—"}</p>
                                    {currentOrder.customer_email ? <p className="text-theme-subtle">{currentOrder.customer_email}</p> : null}
                                    {currentOrder.customer_phone ? <p className="text-theme-subtle">{currentOrder.customer_phone}</p> : null}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <DetailCard icon={Shirt} label="القطعة" value={currentOrder.garment_name} imageUrl={currentOrder.garment_image_url} />
                        <DetailCard icon={Palette} label="اللون" value={currentOrder.color_name} color={currentOrder.color_hex} imageUrl={currentOrder.color_image_url} />
                        <DetailCard icon={Ruler} label="المقاس" value={currentOrder.size_name} />
                        <DetailCard
                            icon={Sparkles}
                            label="Preset"
                            value={
                                currentOrder.preset_name
                                    ? currentOrder.preset_fully_aligned
                                        ? `${currentOrder.preset_name} (مطابقة بالكامل)`
                                        : `${currentOrder.preset_name} (بداية ثم تخصيص)`
                                    : "—"
                            }
                        />
                        <DetailCard icon={Sparkles} label="النمط" value={currentOrder.style_name} imageUrl={currentOrder.style_image_url} />
                        <DetailCard icon={SwatchBook} label="الأسلوب" value={currentOrder.art_style_name} imageUrl={currentOrder.art_style_image_url} />
                        <DetailCard
                            icon={Palette}
                            label="الألوان"
                            value={
                                currentOrder.color_package_name ??
                                (currentOrder.custom_colors?.length > 0 ? `${currentOrder.custom_colors.length} ألوان` : "—")
                            }
                        />
                    </div>

                    {currentOrder.modification_request ? (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                            <p className="text-xs font-bold text-amber-300">طلب تعديل من العميل</p>
                            <p className="mt-2 text-sm leading-7 text-theme">{currentOrder.modification_request}</p>
                        </div>
                    ) : null}

                    {currentOrder.text_prompt ? (
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Customer Brief</p>
                            <p className="mt-3 text-sm leading-7 text-theme">{currentOrder.text_prompt}</p>
                        </div>
                    ) : null}

                    {currentOrder.reference_image_url ? (
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Reference Image</p>
                            <img src={currentOrder.reference_image_url} alt="Reference" className="mt-3 max-h-72 rounded-2xl object-contain" />
                        </div>
                    ) : null}

                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-gold">
                                <Settings2 className="h-4 w-4" />
                                <p className="text-sm font-bold">AI Prompt</p>
                            </div>
                            <button
                                onClick={handleCopyPrompt}
                                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-medium text-gold sm:justify-start"
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? "تم النسخ" : "نسخ"}
                            </button>
                        </div>
                        <pre className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4 text-xs leading-relaxed text-theme-soft">
                            {currentOrder.ai_prompt}
                        </pre>
                    </div>

                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                        <label className="block text-xs uppercase tracking-[0.18em] text-theme-faint">Admin Notes</label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={4}
                            placeholder="أضف ملاحظات تشغيلية أو إبداعية على الطلب..."
                            className="input-dark mt-3 w-full rounded-2xl px-4 py-3 text-sm"
                        />
                        <button
                            onClick={handleSaveNotes}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2 text-xs font-medium text-theme-subtle transition-colors hover:text-theme"
                        >
                            <Save className="h-3.5 w-3.5" />
                            حفظ الملاحظات
                        </button>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel space-y-6 rounded-[28px] p-5 sm:p-6"
                >
                    {/* ── WASHA AI Preview (shown when order came from WASHA AI) ── */}
                    {currentOrder.dtf_mockup_url && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Printer className="h-4 w-4 text-gold" />
                                <p className="text-sm font-bold text-theme">معاينة WASHA AI</p>
                                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
                                    AI Generated
                                </span>
                            </div>

                            {/* Style badges */}
                            {(currentOrder.dtf_style_label || currentOrder.dtf_technique_label || currentOrder.dtf_palette_label) && (
                                <div className="flex flex-wrap gap-2">
                                    {currentOrder.dtf_style_label && (
                                        <span className="rounded-full border border-gold/20 bg-gold/8 px-2.5 py-1 text-[11px] text-gold">
                                            {currentOrder.dtf_style_label}
                                        </span>
                                    )}
                                    {currentOrder.dtf_technique_label && (
                                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[11px] text-theme-subtle">
                                            {currentOrder.dtf_technique_label}
                                        </span>
                                    )}
                                    {currentOrder.dtf_palette_label && (
                                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[11px] text-theme-subtle">
                                            {currentOrder.dtf_palette_label}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Mockup preview */}
                            <div className="relative overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint">
                                <img
                                    src={currentOrder.dtf_mockup_url}
                                    alt="AI Mockup"
                                    className="h-72 w-full object-contain p-3"
                                />
                                <a
                                    href={currentOrder.dtf_mockup_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
                                >
                                    <Download className="h-3 w-3" />
                                    تحميل الموكب
                                </a>
                            </div>

                            {/* Extracted DTF print template */}
                            {currentOrder.dtf_extracted_url ? (
                                <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-[color:var(--surface-elevated)]">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gold/15">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                            <span className="text-xs font-bold text-gold uppercase tracking-wider">نموذج الطباعة DTF</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-theme-faint">2K Print Ready</span>
                                            <a
                                                href={currentOrder.dtf_extracted_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                download
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/25 transition-colors"
                                            >
                                                <Download className="h-3 w-3" />
                                                تحميل ملف DTF
                                            </a>
                                        </div>
                                    </div>
                                    {/* Checkerboard bg for transparent PNG */}
                                    <div
                                        className="flex items-center justify-center p-4 min-h-[200px]"
                                        style={{
                                            backgroundImage: "repeating-conic-gradient(#3a3a3a 0% 25%, #2a2a2a 0% 50%)",
                                            backgroundSize: "20px 20px",
                                        }}
                                    >
                                        <img
                                            src={currentOrder.dtf_extracted_url}
                                            alt="DTF Print Template"
                                            className="max-h-56 max-w-full object-contain drop-shadow-xl"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint p-4 text-center">
                                    <Printer className="h-6 w-6 text-theme-faint mx-auto mb-2" />
                                    <p className="text-xs text-theme-faint">لم يتم استخراج ملف DTF بعد من قِبَل العميل</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!currentOrder.skip_results && currentOrder.status !== "cancelled" ? (
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Result Delivery</p>
                                <h3 className="mt-2 text-xl font-bold text-theme">مخرجات الطلب</h3>
                            </div>

                            <ResultUpload
                                label="صورة التصميم"
                                currentUrl={currentOrder.result_design_url}
                                uploading={uploading === "result_design_url"}
                                onUpload={(file) => handleUpload("result_design_url", file)}
                                icon={ImageIcon}
                            />
                            <ResultUpload
                                label="صورة الموكاب"
                                currentUrl={currentOrder.result_mockup_url}
                                uploading={uploading === "result_mockup_url"}
                                onUpload={(file) => handleUpload("result_mockup_url", file)}
                                icon={ImageIcon}
                            />
                            <ResultUpload
                                label="ملف PDF"
                                currentUrl={currentOrder.result_pdf_url}
                                uploading={uploading === "result_pdf_url"}
                                onUpload={(file) => handleUpload("result_pdf_url", file)}
                                icon={FileText}
                                accept=".pdf"
                            />
                            {currentOrder.modification_request ? (
                                <ResultUpload
                                    label="التصميم بعد التعديل"
                                    currentUrl={currentOrder.modification_design_url ?? null}
                                    uploading={uploading === "modification_design_url"}
                                    onUpload={(file) => handleUpload("modification_design_url", file)}
                                    icon={ImageIcon}
                                />
                            ) : null}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                            تم تجاوز النتائج أو إغلاق الطلب، لذلك لا توجد مرفقات إلزامية مطلوبة هنا.
                        </div>
                    )}

                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-gold" />
                            <h3 className="text-lg font-bold text-theme">محادثة الطلب</h3>
                        </div>
                        <div className="mt-4">
                            <DesignOrderAdminChat orderId={currentOrder.id} />
                        </div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
