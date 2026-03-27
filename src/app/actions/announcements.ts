"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type {
    Announcement,
    AnnouncementEngagementItem,
    AnnouncementEngagementSnapshot,
    AnnouncementMediaUploadPurpose,
    AnnouncementPathPerformance,
    AnnouncementTrigger,
} from "@/lib/announcement-types";
import {
    DEFAULT_TRIGGER,
    PAGE_OPTIONS,
    validateAnnouncementMediaFile,
} from "@/lib/announcement-types";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import type { Database } from "@/types/database";

// ─── Admin Supabase Client ──────────────────────────────────

function getAdminSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });
}

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase.from("profiles").select("role").eq("clerk_id", user.id).single();
    if (profile?.role !== "admin") throw new Error("Forbidden");
    return user;
}

const VALID_ANNOUNCEMENT_PAGES = new Set<string>(PAGE_OPTIONS.map((page) => page.value));

function normalizeAnnouncementTrigger(trigger?: AnnouncementTrigger): AnnouncementTrigger {
    const next = { ...DEFAULT_TRIGGER, ...(trigger || {}) };

    if (next.type === "after_delay") {
        next.delaySeconds = Math.min(Math.max(next.delaySeconds || 5, 1), 300);
    }

    if (next.type === "scroll_depth") {
        next.scrollPercent = Math.min(Math.max(next.scrollPercent || 50, 10), 100);
    }

    if (next.type === "page_enter") {
        next.targetPages = Array.from(
            new Set((next.targetPages || []).filter((page) => VALID_ANNOUNCEMENT_PAGES.has(page)))
        );
    } else {
        delete next.targetPages;
    }

    if (next.type !== "after_delay") {
        delete next.delaySeconds;
    }

    if (next.type !== "scroll_depth") {
        delete next.scrollPercent;
    }

    return next;
}

function buildAnnouncementMediaPath(fileName: string, fileType: string) {
    const ext = fileName.split(".").pop()?.trim().toLowerCase() || (fileType.startsWith("video/") ? "mp4" : "png");
    return `announcements/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function prepareAnnouncementMediaUpload(input: {
    fileName: string;
    fileType: string;
    fileSize: number;
    purpose?: AnnouncementMediaUploadPurpose;
}) {
    const purpose = input.purpose === "poster" ? "poster" : "media";
    const validation = validateAnnouncementMediaFile({ size: input.fileSize, type: input.fileType }, purpose);

    if (validation.error || !validation.mediaType) {
        return { error: validation.error || "الملف غير صالح" } as const;
    }

    const basePath = buildAnnouncementMediaPath(input.fileName, input.fileType);
    const path = purpose === "poster"
        ? basePath.replace("announcements/", "announcements/posters/")
        : basePath;

    return {
        path,
        mediaType: validation.mediaType,
    } as const;
}

function normalizeAnnouncementPayload(data: Omit<Announcement, "id" | "createdAt">) {
    const link = data.link?.trim();
    const linkText = data.linkText?.trim();
    const dismissText = data.dismissText?.trim();
    const mediaAlt = data.mediaAlt?.trim();
    const mediaPosterUrl = data.mediaPosterUrl?.trim();

    return {
        ...data,
        title: data.title.trim(),
        body: data.body.trim(),
        layoutMode: data.layoutMode || "classic",
        link: link || undefined,
        linkText: linkText || undefined,
        dismissText: dismissText || undefined,
        mediaUrl: data.mediaUrl?.trim() || undefined,
        mediaPosterUrl: mediaPosterUrl || undefined,
        mediaAlt: mediaAlt || undefined,
        priority: Number.isFinite(data.priority) ? data.priority : 0,
        trigger: normalizeAnnouncementTrigger(data.trigger),
    };
}

function validateAnnouncementPayload(data: Omit<Announcement, "id" | "createdAt">) {
    if (!data.title) return "عنوان الإعلان مطلوب";
    if (!data.body) return "محتوى الإعلان مطلوب";

    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
        return "تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية";
    }

    if (data.link && !data.linkText) {
        return "أضف نصًا واضحًا للرابط قبل حفظ الإعلان";
    }

    if (!data.link && data.linkText) {
        return "أضف رابطًا صالحًا أو احذف نص الرابط";
    }

    if (data.trigger.type === "page_enter" && (!data.trigger.targetPages || data.trigger.targetPages.length === 0)) {
        return "اختر صفحة واحدة على الأقل عند استخدام محفّز دخول الصفحة";
    }

    if (data.mediaUrl && !data.mediaType) {
        return "حدد نوع الوسيط قبل حفظ الإعلان";
    }

    if (!data.mediaUrl && data.mediaType) {
        return "ارفع الوسيط أولاً أو احذف نوع الوسيط";
    }

    if (data.mediaPosterUrl && data.mediaType !== "video") {
        return "صورة الغلاف مخصصة للإعلانات التي تحتوي على فيديو فقط";
    }

    return null;
}

function revalidateAnnouncementSurfaces() {
    revalidatePath("/dashboard/announcements");
    revalidatePath("/", "layout");
}

// ─── GET Announcements ──────────────────────────────────────

export async function getAnnouncements(): Promise<Announcement[]> {
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return [];
    }

    try {
        const supabase = getAdminSupabase();
        const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "announcements")
            .maybeSingle();

        const raw = data?.value;
        if (!raw || !Array.isArray(raw)) return [];

        // Migrate old announcements that don't have trigger field
        return (raw as Record<string, unknown>[]).map((a) => ({
            ...a,
            trigger: a.trigger || DEFAULT_TRIGGER,
        })) as Announcement[];
    } catch (error) {
        // Return empty array if Supabase is not configured (development mode)
        console.warn("getAnnouncements: Supabase not configured, returning empty array");
        return [];
    }
}

// ─── GET Active Public Announcements ────────────────────────

export async function getActiveAnnouncements(): Promise<Announcement[]> {
    const all = await getAnnouncements();
    const now = new Date();

    return all.filter((a) => {
        if (!a.isActive) return false;
        if (a.startDate && new Date(a.startDate) > now) return false;
        if (a.endDate && new Date(a.endDate) < now) return false;
        return true;
    }).sort((a, b) => a.priority - b.priority);
}

// ─── CREATE Announcement ────────────────────────────────────

export async function createAnnouncement(data: Omit<Announcement, "id" | "createdAt">) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const existing = await getAnnouncements();
    const normalized = normalizeAnnouncementPayload(data);
    const validationError = validateAnnouncementPayload(normalized);
    if (validationError) return { success: false, error: validationError };

    const newAnnouncement: Announcement = {
        ...normalized,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };

    const updated = [...existing, newAnnouncement];

    const { error } = await supabase
        .from("site_settings")
        .upsert(
            { key: "announcements", value: updated, updated_at: new Date().toISOString() },
            { onConflict: "key" }
        );

    if (error) return { success: false, error: error.message };

    revalidateAnnouncementSurfaces();
    return { success: true, id: newAnnouncement.id };
}

// ─── UPDATE Announcement ────────────────────────────────────

export async function updateAnnouncement(id: string, updates: Partial<Omit<Announcement, "id" | "createdAt">>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const existing = await getAnnouncements();
    const index = existing.findIndex((a) => a.id === id);
    if (index === -1) return { success: false, error: "الإعلان غير موجود" };

    const normalized = normalizeAnnouncementPayload({ ...existing[index], ...updates });
    const validationError = validateAnnouncementPayload(normalized);
    if (validationError) return { success: false, error: validationError };

    existing[index] = { ...existing[index], ...normalized };

    const { error } = await supabase
        .from("site_settings")
        .upsert(
            { key: "announcements", value: existing, updated_at: new Date().toISOString() },
            { onConflict: "key" }
        );

    if (error) return { success: false, error: error.message };

    revalidateAnnouncementSurfaces();
    return { success: true };
}

// ─── DELETE Announcement ────────────────────────────────────

export async function deleteAnnouncement(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const existing = await getAnnouncements();
    const updated = existing.filter((a) => a.id !== id);

    const { error } = await supabase
        .from("site_settings")
        .upsert(
            { key: "announcements", value: updated, updated_at: new Date().toISOString() },
            { onConflict: "key" }
        );

    if (error) return { success: false, error: error.message };

    revalidateAnnouncementSurfaces();
    return { success: true };
}

// ─── TOGGLE Active ──────────────────────────────────────────

export async function toggleAnnouncementActive(id: string) {
    const existing = await getAnnouncements();
    const announcement = existing.find((a) => a.id === id);
    if (!announcement) return { success: false, error: "غير موجود" };

    return updateAnnouncement(id, { isActive: !announcement.isActive });
}

export async function createAnnouncementMediaUploadUrl(input: {
    fileName: string;
    fileType: string;
    fileSize: number;
    purpose?: AnnouncementMediaUploadPurpose;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const prepared = prepareAnnouncementMediaUpload(input);
    if ("error" in prepared) {
        return { success: false, error: prepared.error } as const;
    }

    const { data, error } = await supabase.storage.from("smart-store").createSignedUploadUrl(prepared.path);

    if (error || !data?.token) {
        console.error("[createAnnouncementMediaUploadUrl]", error);
        return { success: false, error: error?.message || "فشل تجهيز رفع الوسيط" } as const;
    }

    const { data: publicUrlData } = supabase.storage.from("smart-store").getPublicUrl(prepared.path);
    return {
        success: true,
        path: prepared.path,
        token: data.token,
        url: publicUrlData.publicUrl,
        mediaType: prepared.mediaType,
    } as const;
}

export async function getAnnouncementEngagementSnapshot(): Promise<AnnouncementEngagementSnapshot> {
    const emptySnapshot: AnnouncementEngagementSnapshot = {
        totals: { views: 0, clicks: 0, dismisses: 0, ctr: 0, dismissRate: 0, trackedAnnouncements: 0 },
        topAnnouncements: [],
        topPaths: [],
        livePerformance: [],
        frictionQueue: [],
        lookbackDays: 30,
    };

    try {
        await requireAdmin();
        const logsSupabase = createClient<any>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );
        const lookbackDays = 30;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await logsSupabase
            .from("system_logs")
            .select("source, metadata, created_at")
            .in("source", ["announcement.view", "announcement.click", "announcement.dismiss"])
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(3000);

        if (error || !data) return emptySnapshot;

        const liveAnnouncementIds = new Set((await getActiveAnnouncements()).map((announcement) => announcement.id));
        const byAnnouncement = new Map<string, AnnouncementEngagementItem>();
        const byPath = new Map<string, AnnouncementPathPerformance>();

        for (const row of data as Array<{ source: string; metadata?: Record<string, unknown> | null; created_at: string }>) {
            const metadata =
                row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
                    ? row.metadata
                    : {};

            const announcementId = typeof metadata.announcement_id === "string" ? metadata.announcement_id : null;
            const announcementTitle = typeof metadata.announcement_title === "string" ? metadata.announcement_title : "إعلان";
            const announcementType = typeof metadata.announcement_type === "string" ? metadata.announcement_type : "banner";
            const pathname = typeof metadata.pathname === "string" ? metadata.pathname : "/";

            if (!announcementId) continue;

            const announcementEntry =
                byAnnouncement.get(announcementId) ||
                {
                    id: announcementId,
                    title: announcementTitle,
                    type: (["banner", "popup", "toast", "marquee"].includes(announcementType)
                        ? announcementType
                        : "banner") as Announcement["type"],
                    views: 0,
                    clicks: 0,
                    dismisses: 0,
                    ctr: 0,
                    dismissRate: 0,
                    lastSeenAt: null,
                    lastClickAt: null,
                    lastDismissAt: null,
                };

            const pathEntry =
                byPath.get(pathname) ||
                {
                    path: pathname,
                    views: 0,
                    clicks: 0,
                    dismisses: 0,
                    ctr: 0,
                    dismissRate: 0,
                };

            if (row.source === "announcement.view") {
                announcementEntry.views += 1;
                announcementEntry.lastSeenAt = announcementEntry.lastSeenAt || row.created_at;
                pathEntry.views += 1;
            }

            if (row.source === "announcement.click") {
                announcementEntry.clicks += 1;
                announcementEntry.lastClickAt = announcementEntry.lastClickAt || row.created_at;
                pathEntry.clicks += 1;
            }

            if (row.source === "announcement.dismiss") {
                announcementEntry.dismisses += 1;
                announcementEntry.lastDismissAt = announcementEntry.lastDismissAt || row.created_at;
                pathEntry.dismisses += 1;
            }

            byAnnouncement.set(announcementId, announcementEntry);
            byPath.set(pathname, pathEntry);
        }

        const announcementStats = Array.from(byAnnouncement.values())
            .map((item) => ({
                ...item,
                ctr: item.views > 0 ? Number(((item.clicks / item.views) * 100).toFixed(1)) : 0,
                dismissRate: item.views > 0 ? Number(((item.dismisses / item.views) * 100).toFixed(1)) : 0,
            }))
            .sort((left, right) => {
                if (right.clicks !== left.clicks) return right.clicks - left.clicks;
                if (right.views !== left.views) return right.views - left.views;
                return left.title.localeCompare(right.title, "ar");
            });

        const pathStats = Array.from(byPath.values())
            .map((item) => ({
                ...item,
                ctr: item.views > 0 ? Number(((item.clicks / item.views) * 100).toFixed(1)) : 0,
                dismissRate: item.views > 0 ? Number(((item.dismisses / item.views) * 100).toFixed(1)) : 0,
            }))
            .sort((left, right) => {
                if (right.views !== left.views) return right.views - left.views;
                return right.clicks - left.clicks;
            });

        const frictionQueue = [...announcementStats]
            .filter((item) => item.views >= 5 && item.dismisses > 0)
            .sort((left, right) => {
                if (right.dismissRate !== left.dismissRate) return right.dismissRate - left.dismissRate;
                return right.dismisses - left.dismisses;
            })
            .slice(0, 6);

        const totals = announcementStats.reduce(
            (acc, item) => {
                acc.views += item.views;
                acc.clicks += item.clicks;
                acc.dismisses += item.dismisses;
                return acc;
            },
            { views: 0, clicks: 0, dismisses: 0 }
        );

        return {
            totals: {
                views: totals.views,
                clicks: totals.clicks,
                dismisses: totals.dismisses,
                ctr: totals.views > 0 ? Number(((totals.clicks / totals.views) * 100).toFixed(1)) : 0,
                dismissRate: totals.views > 0 ? Number(((totals.dismisses / totals.views) * 100).toFixed(1)) : 0,
                trackedAnnouncements: announcementStats.length,
            },
            topAnnouncements: announcementStats.slice(0, 6),
            topPaths: pathStats.slice(0, 6),
            livePerformance: announcementStats.filter((item) => liveAnnouncementIds.has(item.id)).slice(0, 4),
            frictionQueue,
            lookbackDays,
        };
    } catch {
        return emptySnapshot;
    }
}
