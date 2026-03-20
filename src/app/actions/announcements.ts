"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Announcement, AnnouncementTrigger } from "@/lib/announcement-types";
import { DEFAULT_TRIGGER } from "@/lib/announcement-types";
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
    const newAnnouncement: Announcement = {
        ...data,
        trigger: data.trigger || DEFAULT_TRIGGER,
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

    revalidatePath("/dashboard/announcements");
    revalidatePath("/");
    return { success: true, id: newAnnouncement.id };
}

// ─── UPDATE Announcement ────────────────────────────────────

export async function updateAnnouncement(id: string, updates: Partial<Omit<Announcement, "id" | "createdAt">>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const existing = await getAnnouncements();
    const index = existing.findIndex((a) => a.id === id);
    if (index === -1) return { success: false, error: "الإعلان غير موجود" };

    existing[index] = { ...existing[index], ...updates };

    const { error } = await supabase
        .from("site_settings")
        .upsert(
            { key: "announcements", value: existing, updated_at: new Date().toISOString() },
            { onConflict: "key" }
        );

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/announcements");
    revalidatePath("/");
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

    revalidatePath("/dashboard/announcements");
    revalidatePath("/");
    return { success: true };
}

// ─── TOGGLE Active ──────────────────────────────────────────

export async function toggleAnnouncementActive(id: string) {
    const existing = await getAnnouncements();
    const announcement = existing.find((a) => a.id === id);
    if (!announcement) return { success: false, error: "غير موجود" };

    return updateAnnouncement(id, { isActive: !announcement.isActive });
}
