"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
    reviewApplication,
    acceptApplicationAndCreateUser,
    bulkReviewApplications,
    bulkProvisionAcceptedApplications,
    exportAdminApplicationsCsv,
} from "@/app/actions/admin";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    XCircle,
    ExternalLink,
    Loader2,
    FileText,
    Instagram,
    Clock,
    Palette,
    Phone,
    Sparkles,
    X,
    UserPlus,
    Download,
} from "lucide-react";

interface ApplicationsClientProps {
    applications: any[];
    count: number;
    currentStatus: string;
    currentJoinType: string;
    currentGender: string;
    currentAgeBand: string;
    currentIdentityState: string;
}

const statuses = [
    { value: "all", label: "الكل" },
    { value: "pending", label: "قيد المراجعة" },
    { value: "reviewing", label: "جاري المراجعة" },
    { value: "accepted", label: "مقبول" },
    { value: "rejected", label: "مرفوض" },
];

const joinTypeOptions = [
    { value: "all", label: "كل الفئات" },
    { value: "artist", label: "فنان" },
    { value: "designer", label: "مصمم" },
    { value: "model", label: "مودل" },
    { value: "customer", label: "عميل مهتم" },
    { value: "partner", label: "شريك أو متعاون" },
];

const genderOptions = [
    { value: "all", label: "كل الأجناس" },
    { value: "male", label: "ذكر" },
    { value: "female", label: "أنثى" },
];

const ageBandOptions = [
    { value: "all", label: "كل الأعمار" },
    { value: "under_18", label: "أقل من 18" },
    { value: "age_18_24", label: "18 - 24" },
    { value: "age_25_34", label: "25 - 34" },
    { value: "age_35_plus", label: "35+" },
];

const identityStateLabelMap = {
    needs_profile: "مقبولون بلا profile",
    needs_clerk: "مقبولون بلا Clerk",
    ready_identity: "هوية مكتملة",
} as const;

const quickFilters = [
    { key: "new_artists", label: "فنانون جدد", filters: { status: "pending", joinType: "artist" } },
    { key: "models_18_24", label: "مودلز 18-24", filters: { joinType: "model", ageBand: "age_18_24" } },
    { key: "interested_customers", label: "عملاء مهتمون", filters: { joinType: "customer" } },
    { key: "needs_profile", label: "مقبولون بلا profile", filters: { status: "accepted", identityState: "needs_profile" } },
    { key: "needs_clerk", label: "مقبولون بلا Clerk", filters: { status: "accepted", identityState: "needs_clerk" } },
] as const;

const savedViews = [
    {
        key: "talent_radar",
        title: "Talent Radar",
        description: "التقاط الفنانين والمصممين الجدد الذين يحتاجون قرارًا سريعًا.",
        filters: { status: "pending", joinType: "artist" },
    },
    {
        key: "model_pipeline",
        title: "Model Pipeline",
        description: "متابعة المودلز الشباب داخل الشريحة الأكثر نشاطًا حاليًا.",
        filters: { joinType: "model", ageBand: "age_18_24" },
    },
    {
        key: "identity_recovery",
        title: "Identity Recovery",
        description: "تركيز فوري على المقبولين الذين لم يكتمل ربطهم تشغيليًا بعد.",
        filters: { status: "accepted", identityState: "needs_clerk" },
    },
] as const;

const genderLabelMap = {
    male: "ذكر",
    female: "أنثى",
} as const;

const joinTypeLabelMap = {
    artist: "فنان",
    designer: "مصمم",
    model: "مودل",
    customer: "عميل مهتم",
    partner: "شريك أو متعاون",
} as const;

const ageBandLabelMap = {
    under_18: "أقل من 18",
    age_18_24: "18 - 24",
    age_25_34: "25 - 34",
    age_35_plus: "35+",
} as const;

const priorityMetaMap = {
    critical: { label: "حرج", className: "border-red-500/20 bg-red-500/10 text-red-200" },
    high: { label: "عالٍ", className: "border-amber-500/20 bg-amber-500/10 text-amber-200" },
    medium: { label: "متوسط", className: "border-sky-500/20 bg-sky-500/10 text-sky-200" },
    low: { label: "منخفض", className: "border-white/10 bg-white/5 text-theme-subtle" },
} as const;

const provisioningStrategyOptions = [
    { value: "smart", label: "ذكي حسب نوع الانضمام" },
    { value: "wushsha", label: "كلهم وشّاي" },
    { value: "subscriber", label: "كلهم مشترك" },
] as const;

function getApplicationAgeBandLabel(birthDate: string | null | undefined) {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age -= 1;
    }

    if (age < 18) return ageBandLabelMap.under_18;
    if (age <= 24) return ageBandLabelMap.age_18_24;
    if (age <= 34) return ageBandLabelMap.age_25_34;
    return ageBandLabelMap.age_35_plus;
}

function csvCell(value: unknown) {
    const raw = value == null ? "" : String(value).replace(/\s*\n+\s*/g, " ").trim();
    return `"${raw.replace(/"/g, '""')}"`;
}

type FeedbackTone = "error" | "success" | "info";

type FeedbackState = {
    tone: FeedbackTone;
    message: string;
};

type ConfirmState = {
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "danger" | "success" | "warning" | "gold";
    onConfirm: () => Promise<void> | void;
};

export function ApplicationsClient({
    applications,
    count,
    currentStatus,
    currentJoinType,
    currentGender,
    currentAgeBand,
    currentIdentityState,
}: ApplicationsClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");
    const [showAcceptModal, setShowAcceptModal] = useState<string | null>(null);
    const [createClerkOnlyId, setCreateClerkOnlyId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkNotes, setBulkNotes] = useState("");
    const [bulkLoading, setBulkLoading] = useState<"accepted" | "reviewing" | "rejected" | "provision" | null>(null);
    const [serverExporting, setServerExporting] = useState(false);
    const [provisionStrategy, setProvisionStrategy] = useState<"smart" | "wushsha" | "subscriber">("smart");
    const [provisionLevel, setProvisionLevel] = useState(1);
    const [bulkProvisionResult, setBulkProvisionResult] = useState<{
        processed: number;
        succeeded: number;
        failed: number;
        credentials: Array<{ id: string; full_name: string; email: string | null; tempPassword: string }>;
        failures: Array<{ id: string; full_name: string; email: string | null; error: string }>;
    } | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => applications.some((app) => app.id === id)));
    }, [applications]);

    useEffect(() => {
        if (!feedback) return;
        const timeout = window.setTimeout(() => setFeedback(null), 4500);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const showFeedback = (tone: FeedbackTone, message: string) => {
        setFeedback({ tone, message });
    };

    const requestConfirmation = (state: ConfirmState) => {
        setConfirmState(state);
    };

    const closeConfirmation = () => {
        if (confirmLoading) return;
        setConfirmState(null);
    };

    const executeConfirmation = async () => {
        if (!confirmState) return;
        setConfirmLoading(true);
        try {
            await confirmState.onConfirm();
            setConfirmState(null);
        } finally {
            setConfirmLoading(false);
        }
    };

    const navigate = (next: {
        status?: string;
        joinType?: string;
        gender?: string;
        ageBand?: string;
        identityState?: string;
    }) => {
        const sp = new URLSearchParams();

        const filters = {
            status: next.status ?? currentStatus,
            joinType: next.joinType ?? currentJoinType,
            gender: next.gender ?? currentGender,
            ageBand: next.ageBand ?? currentAgeBand,
            identityState: next.identityState ?? currentIdentityState,
        };

        if (filters.status !== "all") sp.set("status", filters.status);
        if (filters.joinType !== "all") sp.set("joinType", filters.joinType);
        if (filters.gender !== "all") sp.set("gender", filters.gender);
        if (filters.ageBand !== "all") sp.set("ageBand", filters.ageBand);
        if (filters.identityState !== "all") sp.set("identityState", filters.identityState);

        startTransition(() => {
            router.push(`/dashboard/applications?${sp.toString()}`);
        });
    };

    const activeFilterTags = [
        currentStatus !== "all" ? statuses.find((item) => item.value === currentStatus)?.label ?? currentStatus : null,
        currentJoinType !== "all" ? joinTypeOptions.find((item) => item.value === currentJoinType)?.label ?? currentJoinType : null,
        currentGender !== "all" ? genderOptions.find((item) => item.value === currentGender)?.label ?? currentGender : null,
        currentAgeBand !== "all" ? ageBandOptions.find((item) => item.value === currentAgeBand)?.label ?? currentAgeBand : null,
        currentIdentityState !== "all"
            ? identityStateLabelMap[currentIdentityState as keyof typeof identityStateLabelMap] ?? currentIdentityState
            : null,
    ].filter(Boolean) as string[];

    const isPresetActive = (filters: {
        status?: string;
        joinType?: string;
        gender?: string;
        ageBand?: string;
        identityState?: string;
    }) =>
        (filters.status ?? "all") === currentStatus &&
        (filters.joinType ?? "all") === currentJoinType &&
        (filters.gender ?? "all") === currentGender &&
        (filters.ageBand ?? "all") === currentAgeBand &&
        (filters.identityState ?? "all") === currentIdentityState;

    const handleReview = async (id: string, decision: "accepted" | "rejected") => {
        const label = decision === "accepted" ? "قبول" : "رفض";
        requestConfirmation({
            title: `${label} الطلب`,
            description: `سيتم ${label} هذا الطلب${reviewNotes ? " مع حفظ ملاحظات المراجع الحالية." : "."}`,
            confirmLabel: label,
            tone: decision === "rejected" ? "danger" : "success",
            onConfirm: async () => {
                setReviewingId(id);
                try {
                    const result = await reviewApplication(id, decision, reviewNotes || undefined);
                    if (!result?.success) {
                        showFeedback("error", result?.error || `تعذر ${label} الطلب الآن.`);
                        return;
                    }
                    setReviewNotes("");
                    showFeedback("success", decision === "accepted" ? "تم قبول الطلب بنجاح." : "تم رفض الطلب بنجاح.");
                    router.refresh();
                } catch (error) {
                    console.error("Application review failed", error);
                    showFeedback("error", `تعذر ${label} الطلب الآن. حاول مرة أخرى.`);
                } finally {
                    setReviewingId(null);
                }
            },
        });
    };

    const handleAcceptAndCreate = (id: string) => {
        setShowAcceptModal(id);
    };

    const visibleIds = applications.map((app) => app.id);
    const selectedApplications = applications.filter((app) => selectedIds.includes(app.id));
    const actionableSelectedApplications = selectedApplications.filter(
        (app) => app.status === "pending" || app.status === "reviewing"
    );
    const actionableSelectedIds = actionableSelectedApplications.map((app) => app.id);
    const provisionableSelectedApplications = selectedApplications.filter(
        (app) => app.status === "accepted" && (!app.hasProfile || !app.hasClerkAccount)
    );
    const provisionableSelectedIds = provisionableSelectedApplications.map((app) => app.id);
    const nonActionableSelectedCount = selectedApplications.length - actionableSelectedApplications.length;
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const toggleSelectAllVisible = () => {
        setSelectedIds((prev) => {
            if (allVisibleSelected) {
                return prev.filter((id) => !visibleIds.includes(id));
            }
            return Array.from(new Set([...prev, ...visibleIds]));
        });
    };

    const exportApplicationsCsv = (mode: "current" | "selected") => {
        const source = mode === "selected" ? selectedApplications : applications;

        if (source.length === 0) {
            showFeedback("info", mode === "selected" ? "لا يوجد طلبات محددة للتصدير." : "لا توجد نتائج حالية للتصدير.");
            return;
        }

        const headers = [
            "id",
            "full_name",
            "email",
            "phone",
            "status",
            "join_type",
            "gender",
            "birth_date",
            "age_band",
            "art_style",
            "experience_years",
            "priority_tier",
            "priority_score",
            "priority_reasons",
            "has_profile",
            "has_clerk_account",
            "portfolio_url",
            "instagram_url",
            "motivation",
            "created_at",
            "updated_at",
        ];

        const rows = source.map((app) =>
            [
                app.id,
                app.full_name,
                app.email,
                app.phone,
                app.status,
                app.join_type,
                app.gender,
                app.birth_date,
                getApplicationAgeBandLabel(app.birth_date),
                app.art_style,
                app.experience_years,
                app.priorityTier,
                app.priorityScore,
                Array.isArray(app.priorityReasons) ? app.priorityReasons.join(" | ") : "",
                app.hasProfile ? "yes" : "no",
                app.hasClerkAccount ? "yes" : "no",
                app.portfolio_url,
                app.instagram_url,
                app.motivation,
                app.created_at,
                app.updated_at,
            ]
                .map(csvCell)
                .join(",")
        );

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download =
            mode === "selected" ? `applications-selected-${stamp}.csv` : `applications-filtered-${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleServerExport = async () => {
        setServerExporting(true);
        let res: Awaited<ReturnType<typeof exportAdminApplicationsCsv>>;
        try {
            res = await exportAdminApplicationsCsv({
                status: currentStatus,
                joinType: currentJoinType,
                gender: currentGender,
                ageBand: currentAgeBand,
                identityState: currentIdentityState,
            });
        } catch (error) {
            console.error("Server export failed", error);
            showFeedback("error", "فشل التصدير من الخادم.");
            setServerExporting(false);
            return;
        }
        setServerExporting(false);

        if (!res?.success || typeof res.csv !== "string" || typeof res.filename !== "string") {
            showFeedback("error", "فشل التصدير من الخادم.");
            return;
        }

        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showFeedback("success", "تم تجهيز ملف التصدير من الخادم.");
    };

    const handleBulkReview = async (decision: "accepted" | "reviewing" | "rejected") => {
        if (selectedIds.length === 0) {
            showFeedback("info", "حدد طلبًا واحدًا على الأقل أولًا.");
            return;
        }

        if (actionableSelectedIds.length === 0) {
            showFeedback("info", "الطلبات المحددة ليست في حالة تسمح بتنفيذ هذا الإجراء.");
            return;
        }

        const actionLabel =
            decision === "accepted" ? "قبول" : decision === "reviewing" ? "نقل إلى قيد المراجعة" : "رفض";
        const ignoredMessage =
            nonActionableSelectedCount > 0
                ? `\nسيتم تجاهل ${nonActionableSelectedCount} طلبًا لأن حالته الحالية لا تسمح بهذا الإجراء.`
                : "";

        requestConfirmation({
            title: `${actionLabel} الطلبات المحددة`,
            description: `سيتم ${actionLabel} ${actionableSelectedIds.length} طلبًا.${ignoredMessage}`,
            confirmLabel: actionLabel,
            tone: decision === "rejected" ? "danger" : decision === "reviewing" ? "warning" : "success",
            onConfirm: async () => {
                setBulkLoading(decision);
                try {
                    const res = await bulkReviewApplications(actionableSelectedIds, decision, bulkNotes || undefined);

                    if (!res.success) {
                        showFeedback("error", res.error || "فشل تنفيذ الإجراء الجماعي.");
                        return;
                    }

                    setSelectedIds([]);
                    setBulkNotes("");
                    router.refresh();

                    const completed = res.updated ?? actionableSelectedIds.length;
                    showFeedback(
                        "success",
                        decision === "accepted"
                            ? `تم قبول ${completed} طلبًا بنجاح.`
                            : decision === "reviewing"
                            ? `تم نقل ${completed} طلبًا إلى قيد المراجعة بنجاح.`
                            : `تم رفض ${completed} طلبًا بنجاح.`
                    );
                } catch (error) {
                    console.error("Bulk review failed", error);
                    showFeedback("error", "تعذر تنفيذ الإجراء الجماعي الآن.");
                } finally {
                    setBulkLoading(null);
                }
            },
        });
    };

    const handleBulkProvision = async () => {
        if (selectedIds.length === 0) {
            showFeedback("info", "حدد طلبًا واحدًا على الأقل أولًا.");
            return;
        }

        if (provisionableSelectedIds.length === 0) {
            showFeedback("info", "لا توجد ضمن المحدد طلبات مقبولة تحتاج تجهيز حسابات.");
            return;
        }

        const strategyLabel =
            provisioningStrategyOptions.find((option) => option.value === provisionStrategy)?.label ?? provisionStrategy;

        requestConfirmation({
            title: "تشغيل المقبولين المحددين",
            description: `سيتم تجهيز ${provisionableSelectedIds.length} طلبًا مقبولًا.\nاستراتيجية الدور: ${strategyLabel}${
                provisionStrategy !== "subscriber" ? `\nمستوى الوشّاي: ${provisionLevel}` : ""
            }`,
            confirmLabel: "تشغيل الآن",
            tone: "gold",
            onConfirm: async () => {
                setBulkLoading("provision");
                try {
                    const res = await bulkProvisionAcceptedApplications(provisionableSelectedIds, {
                        roleStrategy: provisionStrategy,
                        wushshaLevel: provisionLevel,
                    });

                    if (
                        !("processed" in res) ||
                        !Array.isArray((res as any).failures) ||
                        !Array.isArray((res as any).credentials)
                    ) {
                        showFeedback("error", res.error || "فشل تجهيز الحسابات.");
                        return;
                    }

                    const report = res as {
                        processed: number;
                        succeeded: number;
                        failed: number;
                        credentials: Array<{ id: string; full_name: string; email: string | null; tempPassword: string }>;
                        failures: Array<{ id: string; full_name: string; email: string | null; error: string }>;
                    };

                    const failedIds = new Set(report.failures.map((failure) => failure.id));
                    setSelectedIds((prev) =>
                        prev.filter((id) => !provisionableSelectedIds.includes(id) || failedIds.has(id))
                    );
                    setBulkProvisionResult(report);
                    router.refresh();
                    showFeedback(
                        report.failed > 0 ? "info" : "success",
                        report.failed > 0
                            ? `اكتمل التشغيل مع ${report.failed} حالة تحتاج مراجعة.`
                            : `تم تشغيل ${report.succeeded} حسابًا بنجاح.`
                    );
                } catch (error) {
                    console.error("Bulk provisioning failed", error);
                    showFeedback("error", "تعذر تجهيز الحسابات الآن.");
                } finally {
                    setBulkLoading(null);
                }
            },
        });
    };

    return (
        <div className="space-y-6">
            {feedback && <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />}
            {/* ─── Status Tabs ─── */}
            <div className="theme-surface-panel flex gap-1 rounded-xl p-1">
                {statuses.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => navigate({ status: s.value })}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentStatus === s.value
                            ? "bg-gold/10 text-gold"
                            : "text-theme-subtle hover:text-theme-soft hover:bg-theme-subtle"
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="theme-surface-panel grid gap-3 rounded-2xl p-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                        نوع الانضمام
                    </label>
                    <select
                        value={currentJoinType}
                        onChange={(e) => navigate({ joinType: e.target.value })}
                        className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                    >
                        {joinTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                        الجنس
                    </label>
                    <select
                        value={currentGender}
                        onChange={(e) => navigate({ gender: e.target.value })}
                        className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                    >
                        {genderOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                        الشريحة العمرية
                    </label>
                    <select
                        value={currentAgeBand}
                        onChange={(e) => navigate({ ageBand: e.target.value })}
                        className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                    >
                        {ageBandOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="theme-surface-panel space-y-3 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">Quick Filters</p>
                        <p className="mt-1 text-sm text-theme-subtle">انتقالات جاهزة للفئات الأكثر استخدامًا أثناء التشغيل اليومي.</p>
                    </div>
                    {activeFilterTags.length > 0 && (
                        <button
                            onClick={() =>
                                navigate({
                                    status: "all",
                                    joinType: "all",
                                    gender: "all",
                                    ageBand: "all",
                                    identityState: "all",
                                })
                            }
                            className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-[11px] font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme"
                        >
                            مسح الفلاتر
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {quickFilters.map((preset) => (
                        <button
                            key={preset.key}
                            onClick={() => navigate(preset.filters)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                isPresetActive(preset.filters)
                                    ? "border-gold/30 bg-gold/10 text-gold"
                                    : "border-theme-subtle bg-theme-faint text-theme-subtle hover:bg-theme-subtle hover:text-theme"
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {activeFilterTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {activeFilterTags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-gold/15 bg-gold/[0.06] px-3 py-1 text-[11px] font-bold text-gold"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                {savedViews.map((view) => (
                    <button
                        key={view.key}
                        onClick={() => navigate(view.filters)}
                        className={`rounded-2xl border p-4 text-right transition-all ${
                            isPresetActive(view.filters)
                                ? "border-gold/25 bg-gold/[0.06]"
                                : "theme-surface-panel hover:border-theme-soft"
                        }`}
                    >
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-theme-faint">{view.title}</p>
                        <p className="mt-2 text-sm font-bold text-theme">{view.description}</p>
                    </button>
                ))}
            </div>

            <div className="theme-surface-panel grid gap-4 rounded-2xl p-4 lg:grid-cols-[1.35fr,0.65fr]">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={toggleSelectAllVisible}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                allVisibleSelected
                                    ? "border-gold/30 bg-gold/10 text-gold"
                                    : "border-theme-subtle bg-theme-faint text-theme-subtle hover:bg-theme-subtle hover:text-theme"
                            }`}
                        >
                            {allVisibleSelected ? "إلغاء تحديد المعروض" : "تحديد المعروض"}
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                            className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            مسح التحديد
                        </button>
                        <button
                            onClick={handleServerExport}
                            disabled={serverExporting}
                            className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-200 transition-colors hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {serverExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            تصدير كامل من الخادم
                        </button>
                        <button
                            onClick={() => exportApplicationsCsv("selected")}
                            disabled={selectedApplications.length === 0}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Download className="h-3.5 w-3.5" />
                            تصدير المحدد
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <button
                            onClick={() => handleBulkReview("accepted")}
                            disabled={bulkLoading !== null || actionableSelectedIds.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {bulkLoading === "accepted" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            قبول المحدد
                        </button>
                        <button
                            onClick={() => handleBulkReview("reviewing")}
                            disabled={bulkLoading !== null || actionableSelectedIds.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {bulkLoading === "reviewing" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Clock className="h-4 w-4" />
                            )}
                            نقل المحدد إلى قيد المراجعة
                        </button>
                        <button
                            onClick={() => handleBulkReview("rejected")}
                            disabled={bulkLoading !== null || actionableSelectedIds.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {bulkLoading === "rejected" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            رفض المحدد
                        </button>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3 md:grid-cols-[1.2fr,0.7fr,0.5fr]">
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                                استراتيجية إنشاء الحسابات
                            </label>
                            <select
                                value={provisionStrategy}
                                onChange={(e) =>
                                    setProvisionStrategy(e.target.value as "smart" | "wushsha" | "subscriber")
                                }
                                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                            >
                                {provisioningStrategyOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                                مستوى الوشّاي
                            </label>
                            <select
                                value={provisionLevel}
                                onChange={(e) => setProvisionLevel(Number(e.target.value))}
                                disabled={provisionStrategy === "subscriber"}
                                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <option key={level} value={level}>
                                        المستوى {level}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleBulkProvision}
                            disabled={bulkLoading !== null || provisionableSelectedIds.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {bulkLoading === "provision" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <UserPlus className="h-4 w-4" />
                            )}
                            تشغيل المقبولين
                        </button>
                    </div>
                </div>

                <div className="theme-surface-panel space-y-3 rounded-2xl p-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                            Execution Rail
                        </p>
                        <p className="mt-1 text-sm text-theme-subtle">
                            إدارة جماعية آمنة للطلبات الحالية مع تصدير مباشر للحالة التشغيلية.
                        </p>
                        <p className="mt-2 text-xs text-theme-faint">
                            القبول الجماعي هنا يحدّث حالة الطلب فقط. إنشاء الحسابات يبقى إجراءً منفصلًا للحالات التي تريد
                            تشغيلها فعليًا.
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">نتائج معروضة</p>
                            <p className="mt-1 text-lg font-bold text-theme">{applications.length}</p>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">محدد الآن</p>
                            <p className="mt-1 text-lg font-bold text-theme">{selectedApplications.length}</p>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">قابل للتنفيذ</p>
                            <p className="mt-1 text-lg font-bold text-theme">{actionableSelectedIds.length}</p>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">جاهز للتشغيل</p>
                            <p className="mt-1 text-lg font-bold text-theme">{provisionableSelectedIds.length}</p>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">سيُتجاهل</p>
                            <p className="mt-1 text-lg font-bold text-theme">{nonActionableSelectedCount}</p>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                            ملاحظات جماعية
                        </label>
                        <textarea
                            value={bulkNotes}
                            onChange={(e) => setBulkNotes(e.target.value)}
                            placeholder="ستُضاف هذه الملاحظات إلى الطلبات المنفذ عليها جماعيًا."
                            className="min-h-[96px] w-full rounded-xl border border-theme-soft bg-theme-subtle px-3 py-2.5 text-sm text-theme placeholder:text-theme-faint outline-none transition-colors focus:border-gold/30"
                        />
                    </div>
                </div>
            </div>

            {/* ─── Applications Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {applications.map((app, i) => (
                    <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm p-6 hover:border-theme-soft transition-all group"
                    >
                        {(() => {
                            const genderLabel =
                                app.gender && app.gender in genderLabelMap
                                    ? genderLabelMap[app.gender as keyof typeof genderLabelMap]
                                    : "غير محدد";
                            const joinTypeLabel =
                                app.join_type && app.join_type in joinTypeLabelMap
                                    ? joinTypeLabelMap[app.join_type as keyof typeof joinTypeLabelMap]
                                    : "غير محدد";
                            const ageBandLabel = getApplicationAgeBandLabel(app.birth_date);
                            const priorityMeta =
                                priorityMetaMap[app.priorityTier as keyof typeof priorityMetaMap] ?? priorityMetaMap.low;
                            const audienceTags = [
                                joinTypeLabel !== "غير محدد" ? joinTypeLabel : null,
                                genderLabel !== "غير محدد" ? genderLabel : null,
                                ageBandLabel,
                                app.status === "accepted" && !app.hasProfile
                                    ? "مقبول بلا profile"
                                    : app.status === "accepted" && app.hasProfile && !app.hasClerkAccount
                                      ? "مقبول بلا Clerk"
                                      : null,
                            ].filter(Boolean) as string[];

                            return (
                                <>
                        {/* Header */}
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(app.id)}
                                    onChange={() => toggleSelect(app.id)}
                                    className="mt-1 h-4 w-4 rounded border-theme-soft bg-theme-subtle text-gold focus:ring-gold/30"
                                    aria-label={`تحديد طلب ${app.full_name}`}
                                />
                                <div>
                                    <h3 className="font-bold text-theme text-lg">{app.full_name}</h3>
                                    <p className="text-theme-subtle text-sm mt-0.5">{app.email}</p>
                                    {app.phone && (
                                        <p className="text-theme-subtle text-sm mt-0.5 flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span dir="ltr">{app.phone}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <StatusBadge status={app.status} type="application" />
                                <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${priorityMeta.className}`}>
                                    {priorityMeta.label} · {app.priorityScore}
                                </span>
                                <button
                                    onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-theme-soft bg-theme-subtle px-3 py-1.5 text-[11px] font-bold text-theme-subtle transition-colors hover:text-theme"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    ملف الطلب
                                </button>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <UserPlus className="w-4 h-4 text-sky-300/80" />
                                <span className="text-theme-soft">{joinTypeLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-gold/70" />
                                <span className="text-theme-soft">{genderLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Palette className="w-4 h-4 text-accent/60" />
                                <span className="text-theme-soft">{app.art_style}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-theme-faint" />
                                <span className="text-theme-subtle">
                                    {app.experience_years ? `${app.experience_years} سنوات خبرة` : "لم يحدد"}
                                </span>
                            </div>
                            {app.portfolio_url && (
                                <a
                                    href={app.portfolio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>معرض الأعمال</span>
                                </a>
                            )}
                            {app.instagram_url && (
                                <a
                                    href={app.instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
                                >
                                    <Instagram className="w-4 h-4" />
                                    <span>انستقرام</span>
                                </a>
                            )}
                        </div>

                        {/* Motivation */}
                        <div className="p-4 rounded-xl bg-theme-faint border border-theme-faint mb-4">
                            <p className="text-theme-subtle text-sm leading-relaxed line-clamp-3">{app.motivation}</p>
                        </div>

                        {audienceTags.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {audienceTags.map((tag) => (
                                    <span
                                        key={`${app.id}-${tag}`}
                                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold text-theme-subtle"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {app.priorityReasons?.length > 0 && (
                            <div className="mb-4 rounded-xl border border-white/8 bg-black/15 p-3">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">
                                    لماذا هذه الأولوية؟
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {app.priorityReasons.map((reason: string) => (
                                        <span
                                            key={`${app.id}-${reason}`}
                                            className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-theme-subtle"
                                        >
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Review Notes */}
                        {app.reviewer_notes && (
                            <div className="p-3 rounded-lg bg-gold/5 border border-gold/10 mb-4">
                                <p className="text-gold/70 text-xs font-medium">ملاحظات المراجع: {app.reviewer_notes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        {app.status === "pending" || app.status === "reviewing" ? (
                            <div className="space-y-3">
                                <textarea
                                    placeholder="ملاحظات المراجع (اختياري)..."
                                    value={reviewingId === app.id ? reviewNotes : ""}
                                    onChange={(e) => {
                                        setReviewingId(app.id);
                                        setReviewNotes(e.target.value);
                                    }}
                                    className="w-full p-3 bg-theme-faint border border-theme-subtle rounded-xl text-sm text-theme placeholder:text-theme-faint resize-none focus:outline-none focus:border-gold/20 transition-colors"
                                    rows={2}
                                />
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAcceptAndCreate(app.id)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-bold hover:bg-gold/20 transition-all"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            قبول وإنشاء مستخدم
                                        </button>
                                        <button
                                            onClick={() => handleReview(app.id, "accepted")}
                                            disabled={reviewingId === app.id}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-forest/10 text-forest border border-forest/20 rounded-xl text-sm font-bold hover:bg-forest/20 transition-all disabled:opacity-50"
                                        >
                                            {reviewingId === app.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            قبول فقط
                                        </button>
                                        <button
                                            onClick={() => handleReview(app.id, "rejected")}
                                            disabled={reviewingId === app.id}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            رفض
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-theme-faint text-xs text-center" suppressHydrationWarning>
                                    {isHydrated
                                        ? new Date(app.updated_at || app.created_at).toLocaleDateString("ar-SA", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })
                                        : String(app.updated_at || app.created_at || "").split("T")[0] || "—"}
                                </p>
                                {app.status === "accepted" && (
                                    <div className="flex gap-2 justify-center">
                                        {!app.hasProfile && (
                                            <button
                                                onClick={() => handleAcceptAndCreate(app.id)}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-bold hover:bg-gold/20 transition-all"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                إنشاء حساب
                                            </button>
                                        )}
                                        {app.hasProfile && !app.hasClerkAccount && app.email && (
                                            <button
                                                onClick={() => setCreateClerkOnlyId(app.id)}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-forest/10 text-forest border border-forest/20 rounded-xl text-sm font-bold hover:bg-forest/20 transition-all"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                إنشاء حساب في Clerk
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                                </>
                            );
                        })()}
                    </motion.div>
                ))}
            </div>

            {/* ─── Empty State ─── */}
            {applications.length === 0 && (
                <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-fg/10 mx-auto mb-4" />
                    <p className="text-theme-faint text-lg font-medium">لا توجد طلبات</p>
                    <p className="text-theme-faint text-sm mt-1">ستظهر هنا عندما يتقدم أحد الفنانين للانضمام</p>
                </div>
            )}

            {/* ─── Count ─── */}
            {count > 0 && (
                <p className="text-xs text-theme-faint">{count} طلب</p>
            )}

            {/* ─── Accept & Create User Modal ─── */}
            {showAcceptModal && (
                <AcceptAndCreateModal
                    applicationId={showAcceptModal}
                    application={applications.find((a) => a.id === showAcceptModal)}
                    onClose={() => setShowAcceptModal(null)}
                    onSuccess={() => {
                        setShowAcceptModal(null);
                        router.refresh();
                    }}
                />
            )}

            {/* ─── Create Clerk Only Modal (للمقبولين بدون حساب Clerk) ─── */}
            {createClerkOnlyId && (
                <CreateClerkOnlyModal
                    applicationId={createClerkOnlyId}
                    application={applications.find((a) => a.id === createClerkOnlyId)}
                    onClose={() => setCreateClerkOnlyId(null)}
                    onSuccess={() => {
                        setCreateClerkOnlyId(null);
                        router.refresh();
                    }}
                />
            )}

            {bulkProvisionResult && (
                <BulkProvisionReportModal
                    report={bulkProvisionResult}
                    onClose={() => setBulkProvisionResult(null)}
                />
            )}

            <ConfirmationDialog
                state={confirmState}
                loading={confirmLoading}
                onClose={closeConfirmation}
                onConfirm={executeConfirmation}
            />
        </div>
    );
}

function FeedbackBanner({
    feedback,
    onDismiss,
}: {
    feedback: FeedbackState;
    onDismiss: () => void;
}) {
    const palette =
        feedback.tone === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
            : feedback.tone === "info"
            ? "border-sky-500/20 bg-sky-500/10 text-sky-200"
            : "border-red-500/20 bg-red-500/10 text-red-200";

    return (
        <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${palette}`}>
            <p className="leading-relaxed">{feedback.message}</p>
            <button
                onClick={onDismiss}
                className="rounded-lg p-1 text-current/80 transition-colors hover:bg-black/10 hover:text-current"
                aria-label="إغلاق"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

function ConfirmationDialog({
    state,
    loading,
    onClose,
    onConfirm,
}: {
    state: ConfirmState | null;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    if (!state) return null;

    const confirmClass =
        state.tone === "danger"
            ? "border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
            : state.tone === "warning"
            ? "border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
            : state.tone === "gold"
            ? "border-gold/20 bg-gold/10 text-gold hover:bg-gold/15"
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] p-4 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                onClick={(event) => event.stopPropagation()}
                className="theme-surface-panel w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">Confirmation</p>
                        <h3 className="mt-2 text-lg font-bold text-theme">{state.title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg p-2 text-theme-subtle transition-colors hover:bg-theme-subtle disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-theme-subtle">
                    {state.description}
                </p>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${confirmClass}`}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {state.confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export function BulkProvisionReportModal({
    report,
    onClose,
}: {
    report: {
        processed: number;
        succeeded: number;
        failed: number;
        credentials: Array<{ id: string; full_name: string; email: string | null; tempPassword: string }>;
        failures: Array<{ id: string; full_name: string; email: string | null; error: string }>;
    };
    onClose: () => void;
}) {
    const copyAllCredentials = async () => {
        const content = report.credentials
            .map(
                (item) =>
                    `${item.full_name}${item.email ? ` <${item.email}>` : ""}\n${item.tempPassword}`
            )
            .join("\n\n");

        if (!content) return;
        await navigator.clipboard.writeText(content);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel w-full max-w-3xl rounded-2xl shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-theme-subtle px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-theme">تقرير تشغيل المقبولين</h2>
                        <p className="mt-1 text-sm text-theme-subtle">
                            تم معالجة {report.processed} طلبًا، نجح {report.succeeded} وفشل {report.failed}.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-theme-subtle hover:bg-theme-subtle">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">تمت المعالجة</p>
                            <p className="mt-1 text-2xl font-bold text-theme">{report.processed}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">نجاح</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-200">{report.succeeded}</p>
                        </div>
                        <div className="rounded-xl border border-red-500/15 bg-red-500/[0.06] px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">إخفاق</p>
                            <p className="mt-1 text-2xl font-bold text-red-200">{report.failed}</p>
                        </div>
                    </div>

                    {report.credentials.length > 0 && (
                        <div className="space-y-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-theme">الحسابات التي تم إنشاؤها</p>
                                    <p className="mt-1 text-xs text-theme-subtle">انسخ كلمات المرور المؤقتة وأرسلها للمستخدمين.</p>
                                </div>
                                <button
                                    onClick={copyAllCredentials}
                                    className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold transition-colors hover:bg-gold/15"
                                >
                                    نسخ الكل
                                </button>
                            </div>

                            <div className="space-y-3">
                                {report.credentials.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-theme-subtle bg-theme-faint p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-theme">{item.full_name}</p>
                                                {item.email && <p className="text-xs text-theme-subtle">{item.email}</p>}
                                            </div>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(item.tempPassword)}
                                                className="rounded-full border border-theme-subtle bg-theme-subtle px-3 py-1 text-[11px] font-bold text-theme-subtle transition-colors hover:text-theme"
                                            >
                                                نسخ كلمة المرور
                                            </button>
                                        </div>
                                        <code
                                            dir="ltr"
                                            className="mt-3 block rounded-lg bg-theme-subtle px-3 py-2 text-sm text-theme"
                                        >
                                            {item.tempPassword}
                                        </code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.failures.length > 0 && (
                        <div className="space-y-3 rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4">
                            <p className="text-sm font-bold text-theme">الحالات التي تحتاج مراجعة</p>
                            <div className="space-y-2">
                                {report.failures.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-theme-subtle bg-theme-faint p-3">
                                        <p className="font-bold text-theme">{item.full_name}</p>
                                        <p className="mt-1 text-xs text-theme-subtle">{item.email || "بدون بريد إلكتروني"}</p>
                                        <p className="mt-2 text-sm text-red-200">{item.error}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export function CreateClerkOnlyModal({
    applicationId,
    application,
    onClose,
    onSuccess,
}: {
    applicationId: string;
    application: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!application?.email) return;
        setLoading(true);
        setError(null);
        setTempPassword(null);
        try {
            const res = await acceptApplicationAndCreateUser(applicationId, {
                createInClerk: true,
            });

            if (res.success) {
                if (res.tempPassword) setTempPassword(res.tempPassword);
                else onSuccess();
            } else {
                setError(res.error || "فشل إنشاء الحساب");
            }
        } catch (error) {
            console.error("Create Clerk account failed", error);
            setError("تعذر إنشاء الحساب الآن. حاول مرة أخرى.");
        } finally {
            setLoading(false);
        }
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel w-full max-w-md rounded-2xl shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle">
                    <h2 className="text-lg font-bold text-theme flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-forest" />
                        إنشاء حساب في Clerk
                    </h2>
                    <button onClick={tempPassword ? onSuccess : onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {tempPassword ? (
                    <div className="p-6 space-y-4">
                        <div className="p-4 rounded-xl bg-forest/10 border border-forest/20 text-forest">
                            <p className="text-sm font-medium mb-2">تم إنشاء الحساب بنجاح ✓</p>
                            <p className="text-xs text-theme-soft mb-3">انسخ كلمة المرور وأرسلها للمستخدم:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded-lg border border-theme-subtle bg-theme-faint px-3 py-2 text-sm font-mono break-all select-all" dir="ltr">
                                    {tempPassword}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                                    className="rounded-lg border border-gold/20 bg-gold/15 px-3 py-2 text-xs font-bold text-gold hover:bg-gold/25"
                                >
                                    نسخ
                                </button>
                            </div>
                            <p className="text-[10px] text-theme-subtle mt-2">البريد: {application.email}</p>
                        </div>
                        <button type="button" onClick={onSuccess} className="w-full rounded-xl bg-gold py-2.5 font-bold text-[var(--wusha-bg)] hover:bg-gold-light">
                            تم
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-theme-soft text-sm">
                            سيتم إنشاء حساب Clerk لـ <strong className="text-theme">{application.full_name}</strong> بالبريد {application.email}
                        </p>
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle">
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 rounded-xl bg-forest/20 text-forest font-bold hover:bg-forest/30 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                إنشاء
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

export function AcceptAndCreateModal({
    applicationId,
    application,
    onClose,
    onSuccess,
}: {
    applicationId: string;
    application: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<"wushsha" | "subscriber">("wushsha");
    const [wushshaLevel, setWushshaLevel] = useState(1);
    const [clerkId, setClerkId] = useState("");
    const [createInClerk, setCreateInClerk] = useState(true);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setTempPassword(null);
        try {
            const res = await acceptApplicationAndCreateUser(applicationId, {
                role,
                wushsha_level: role === "wushsha" ? wushshaLevel : undefined,
                clerk_id: !createInClerk ? (clerkId.trim() || undefined) : undefined,
                createInClerk: createInClerk && !!application?.email,
            });

            if (res.success) {
                if (res.tempPassword) {
                    setTempPassword(res.tempPassword);
                } else {
                    onSuccess();
                }
            } else {
                setError(res.error || "فشل إنشاء المستخدم");
            }
        } catch (error) {
            console.error("Accept and create user failed", error);
            setError("تعذر إنشاء المستخدم الآن. حاول مرة أخرى.");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseAfterPassword = () => {
        setTempPassword(null);
        onSuccess();
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel w-full max-w-md rounded-2xl shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle">
                    <h2 className="text-lg font-bold text-theme flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-gold" />
                        قبول وإنشاء مستخدم
                    </h2>
                    <button onClick={tempPassword ? handleCloseAfterPassword : onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {tempPassword ? (
                    <div className="p-6 space-y-4">
                        <div className="p-4 rounded-xl bg-forest/10 border border-forest/20 text-forest">
                            <p className="text-sm font-medium mb-2">تم إنشاء الحساب بنجاح ✓</p>
                            <p className="text-xs text-theme-soft mb-3">المستخدم يمكنه تسجيل الدخول بالبريد وكلمة المرور التالية. انسخها وأرسلها له:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-theme-subtle rounded-lg text-sm font-mono break-all select-all" dir="ltr">
                                    {tempPassword}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                                    className="px-3 py-2 rounded-lg bg-gold/20 text-gold text-xs font-bold hover:bg-gold/30"
                                >
                                    نسخ
                                </button>
                            </div>
                            <p className="text-[10px] text-theme-subtle mt-2">البريد: {application.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCloseAfterPassword}
                            className="w-full py-2.5 rounded-xl bg-gold/20 text-gold font-bold hover:bg-gold/30"
                        >
                            تم
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-theme-soft text-sm">
                            سيتم إنشاء مستخدم جديد من طلب <strong className="text-theme">{application.full_name}</strong>
                            {application.email && <span className="block text-theme-subtle mt-1">البريد: {application.email}</span>}
                        </p>
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={createInClerk}
                                onChange={(e) => setCreateInClerk(e.target.checked)}
                                className="rounded border-theme-soft"
                            />
                            <span className="text-sm text-theme-strong">إنشاء حساب في Clerk (ليتمكن من تسجيل الدخول)</span>
                        </label>
                        {createInClerk && application.email && (
                            <p className="text-[10px] text-theme-subtle">سيُنشأ حساب بالبريد أعلاه وكلمة مرور مؤقتة تُعرض بعد الإنشاء</p>
                        )}
                        {!createInClerk && (
                            <p className="text-[10px] text-amber-400/80">بدون Clerk لن يتمكن المستخدم من تسجيل الدخول — استخدم إن كان لديه حساب مسبقاً</p>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-theme-subtle mb-1.5">الدور</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as "wushsha" | "subscriber")}
                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            >
                                <option value="wushsha">وشّاي</option>
                                <option value="subscriber">مشترك</option>
                            </select>
                        </div>
                        {role === "wushsha" && (
                            <div>
                                <label className="block text-xs font-medium text-theme-subtle mb-1.5">مستوى الوشّاي</label>
                                <select
                                    value={wushshaLevel}
                                    onChange={(e) => setWushshaLevel(Number(e.target.value))}
                                    className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                                >
                                    {[1, 2, 3, 4, 5].map((l) => (
                                        <option key={l} value={l}>المستوى {l}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {!createInClerk && (
                            <div>
                                <label className="block text-xs font-medium text-theme-subtle mb-1.5">معرف Clerk (اختياري)</label>
                                <input
                                    type="text"
                                    value={clerkId}
                                    onChange={(e) => setClerkId(e.target.value)}
                                    placeholder="user_xxx — اتركه فارغاً للإنشاء التلقائي"
                                    className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                                    dir="ltr"
                                />
                                <p className="text-[10px] text-theme-faint mt-1">إن تركت فارغاً سيُستخدم معرف مؤقت حتى يسجّل المستخدم</p>
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={loading || (createInClerk && !application?.email)}
                                className="flex-1 rounded-xl bg-gold py-2.5 font-bold text-[var(--wusha-bg)] hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                إنشاء وقبول
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
