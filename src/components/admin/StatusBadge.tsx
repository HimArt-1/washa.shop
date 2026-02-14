"use client";

interface StatusBadgeProps {
    status: string;
    type?: "order" | "artwork" | "application" | "role";
}

const statusConfig: Record<string, Record<string, { label: string; color: string }>> = {
    order: {
        pending: { label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        confirmed: { label: "مؤكد", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
        processing: { label: "قيد المعالجة", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
        shipped: { label: "تم الشحن", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
        delivered: { label: "تم التوصيل", color: "bg-forest/10 text-forest border-forest/20" },
        cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-400 border-red-500/20" },
        refunded: { label: "مسترجع", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
    },
    artwork: {
        draft: { label: "مسودة", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
        pending: { label: "مراجعة", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        published: { label: "منشور", color: "bg-forest/10 text-forest border-forest/20" },
        rejected: { label: "مرفوض", color: "bg-red-500/10 text-red-400 border-red-500/20" },
        archived: { label: "مؤرشف", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
    },
    application: {
        pending: { label: "قيد المراجعة", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        reviewing: { label: "جاري المراجعة", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
        accepted: { label: "مقبول", color: "bg-forest/10 text-forest border-forest/20" },
        rejected: { label: "مرفوض", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    },
    role: {
        admin: { label: "مسؤول", color: "bg-gold/10 text-gold border-gold/20" },
        artist: { label: "فنان", color: "bg-accent/10 text-accent border-accent/20" },
        buyer: { label: "مشتري", color: "bg-forest/10 text-forest border-forest/20" },
        guest: { label: "زائر", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
    },
};

export function StatusBadge({ status, type = "order" }: StatusBadgeProps) {
    const config = statusConfig[type]?.[status] || {
        label: status,
        color: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };

    return (
        <span className={`
            inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
            border ${config.color} transition-colors
        `}>
            {config.label}
        </span>
    );
}
