// ─── Announcement Trigger Types ─────────────────────────

export type TriggerType =
    | "on_load"       // عند دخول الموقع
    | "after_delay"   // بعد وقت محدد
    | "page_enter"    // عند الانتقال لصفحة محددة
    | "exit_intent"   // عند محاولة مغادرة الصفحة
    | "scroll_depth"  // عند التمرير لنسبة معينة
    | "always";       // يظهر دائماً

export interface AnnouncementTrigger {
    type: TriggerType;
    delaySeconds?: number;
    targetPages?: string[];
    scrollPercent?: number;
    frequency: "once" | "session" | "always";
    dismissible: boolean;
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    type: "banner" | "popup" | "toast" | "marquee";
    template: "gold" | "gradient" | "minimal" | "alert" | "promo" | "neon" | "sunset" | "frost" | "rose" | "aurora";
    link?: string;
    linkText?: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    priority: number;
    trigger: AnnouncementTrigger;
    createdAt: string;
}

// ─── Constants ──────────────────────────────────────────

export const PAGE_OPTIONS = [
    { value: "/", label: "الصفحة الرئيسية" },
    { value: "/store", label: "المتجر" },
    { value: "/gallery", label: "المعرض" },
    { value: "/studio", label: "الاستوديو" },
    { value: "/studio/design-piece", label: "صمم قطعتك" },
    { value: "/account", label: "حسابي" },
    { value: "/cart", label: "سلة المشتريات" },
    { value: "/checkout", label: "الدفع" },
] as const;

export const DEFAULT_TRIGGER: AnnouncementTrigger = {
    type: "on_load",
    frequency: "session",
    dismissible: true,
};
