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
    layoutMode?: "classic" | "hero" | "split" | "compact";
    template:
        | "gold"
        | "gradient"
        | "minimal"
        | "alert"
        | "promo"
        | "neon"
        | "sunset"
        | "frost"
        | "rose"
        | "aurora"
        | "spotlight"
        | "cinema"
        | "editorial"
        | "atelier"
        | "monogram"
        | "obsidian"
        | "pearl"
        | "kinetic";
    link?: string;
    linkText?: string;
    dismissText?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    mediaPosterUrl?: string;
    mediaAlt?: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    priority: number;
    trigger: AnnouncementTrigger;
    createdAt: string;
}

export type AnnouncementMediaUploadPurpose = "media" | "poster";

export interface AnnouncementEngagementItem {
    id: string;
    title: string;
    type: Announcement["type"];
    views: number;
    clicks: number;
    dismisses: number;
    ctr: number;
    dismissRate: number;
    lastSeenAt: string | null;
    lastClickAt: string | null;
    lastDismissAt: string | null;
}

export interface AnnouncementPathPerformance {
    path: string;
    views: number;
    clicks: number;
    dismisses: number;
    ctr: number;
    dismissRate: number;
}

export interface AnnouncementEngagementSnapshot {
    totals: {
        views: number;
        clicks: number;
        dismisses: number;
        ctr: number;
        dismissRate: number;
        trackedAnnouncements: number;
    };
    topAnnouncements: AnnouncementEngagementItem[];
    topPaths: AnnouncementPathPerformance[];
    livePerformance: AnnouncementEngagementItem[];
    frictionQueue: AnnouncementEngagementItem[];
    lookbackDays: number;
}

// ─── Constants ──────────────────────────────────────────

export const PAGE_OPTIONS = [
    { value: "/", label: "الصفحة الرئيسية" },
    { value: "/store", label: "المتجر" },
    { value: "/gallery", label: "المعرض" },
    { value: "/design", label: "صمّم قطعتك" },
    { value: "/design/tracker", label: "متابعة التصميم" },
    { value: "/join", label: "الانضمام للمجتمع" },
    { value: "/support", label: "الدعم" },
    { value: "/contact", label: "تواصل معنا" },
    { value: "/faq", label: "الأسئلة الشائعة" },
    { value: "/account", label: "حسابي" },
    { value: "/cart", label: "سلة المشتريات" },
    { value: "/checkout", label: "الدفع" },
] as const;

export const DEFAULT_TRIGGER: AnnouncementTrigger = {
    type: "on_load",
    frequency: "session",
    dismissible: true,
};

export const ANNOUNCEMENT_MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const ANNOUNCEMENT_MEDIA_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const ANNOUNCEMENT_MEDIA_ACCEPT = [...ANNOUNCEMENT_MEDIA_IMAGE_TYPES, ...ANNOUNCEMENT_MEDIA_VIDEO_TYPES].join(",");
export const ANNOUNCEMENT_POSTER_ACCEPT = ANNOUNCEMENT_MEDIA_IMAGE_TYPES.join(",");
export const ANNOUNCEMENT_MEDIA_MAX_SIZE = 25 * 1024 * 1024;

export function getAnnouncementMediaKind(fileType?: string | null): Announcement["mediaType"] | null {
    if (!fileType) return null;
    if (ANNOUNCEMENT_MEDIA_IMAGE_TYPES.includes(fileType as (typeof ANNOUNCEMENT_MEDIA_IMAGE_TYPES)[number])) return "image";
    if (ANNOUNCEMENT_MEDIA_VIDEO_TYPES.includes(fileType as (typeof ANNOUNCEMENT_MEDIA_VIDEO_TYPES)[number])) return "video";
    return null;
}

export function validateAnnouncementMediaFile(
    file: Pick<File, "size" | "type"> | { size: number; type?: string | null },
    purpose: AnnouncementMediaUploadPurpose = "media"
) {
    if (!Number.isFinite(file.size) || file.size <= 0) {
        return { error: "الملف فارغ" as const, mediaType: null };
    }

    const mediaType = getAnnouncementMediaKind(file.type);
    if (!mediaType) {
        return { error: "الملف غير مدعوم. استخدم JPG/PNG/WebP/GIF أو MP4/WebM/MOV" as const, mediaType: null };
    }

    if (purpose === "poster" && mediaType !== "image") {
        return { error: "صورة الغلاف يجب أن تكون ملف صورة فقط" as const, mediaType: null };
    }

    if (file.size > ANNOUNCEMENT_MEDIA_MAX_SIZE) {
        return { error: "حجم الملف كبير جدًا. الحد الأقصى 25MB" as const, mediaType };
    }

    return { error: null, mediaType };
}

export function getAnnouncementDismissLabel(
    announcement: Pick<Announcement, "dismissText" | "template" | "title" | "body" | "linkText" | "type">
) {
    const custom = announcement.dismissText?.trim();
    if (custom) return custom;

    const content = `${announcement.title} ${announcement.body} ${announcement.linkText || ""}`;

    if (/(تنبيه|عاجل|مهم|تحذير|تنويه)/.test(content)) {
        return "اطّلعت على التنبيه";
    }

    if (/(خصم|عرض|كود|تسوّق|تسوق|المتجر|الدفع|الطلب)/.test(content)) {
        return "ربما لاحقًا";
    }

    if (/(انضم|الانضمام|المجتمع|اشترك|التسجيل)/.test(content)) {
        return "سأعود لاحقًا";
    }

    switch (announcement.template) {
        case "alert":
            return "اطّلعت على التنبيه";
        case "promo":
        case "gold":
        case "kinetic":
            return "ربما لاحقًا";
        case "cinema":
        case "editorial":
        case "spotlight":
        case "monogram":
            return "متابعة لاحقًا";
        default:
            return announcement.type === "popup" ? "إغلاق الإعلان" : "إخفاء الإعلان";
    }
}
