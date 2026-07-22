"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type {
    WashaBoardGenerationContext,
    WashaBoardManualPrintStatus,
} from "@/types/database";
import {
    normalizeBoardManualPrintFilter,
    normalizeBoardRequestStatus,
    type BoardManualPrintFilter,
    type BoardRequestStatusFilter,
} from "@/lib/board-request-filters";

export type { BoardManualPrintFilter, BoardRequestStatusFilter };

export interface BoardRequestAdminCustomer {
    displayName: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
}

export interface BoardRequestAdminRow {
    id: string;
    generationRequestId: string;
    prompt: string;
    generationContext: WashaBoardGenerationContext;
    boardImageUrl: string | null;
    provider: string | null;
    generationModel: string | null;
    status: BoardRequestStatusFilter;
    manualPrintStatus: WashaBoardManualPrintStatus;
    createdAt: string;
    updatedAt: string;
    customer: BoardRequestAdminCustomer | null;
}

const boardRequestProfileSchema = z.object({
    display_name: z.string().nullable(),
    username: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
});

const boardRequestQueryRowSchema = z.object({
    id: z.string().uuid(),
    generation_request_id: z.string(),
    prompt: z.string(),
    generation_context: z.record(z.string(), z.json()),
    board_image_url: z.string().nullable(),
    provider: z.string().nullable(),
    generation_model: z.string().nullable(),
    status: z.enum(["ready", "failed"]),
    manual_print_status: z.enum(["pending", "in_progress", "completed"]),
    created_at: z.string(),
    updated_at: z.string(),
    profile: z.union([
        boardRequestProfileSchema,
        z.array(boardRequestProfileSchema),
        z.null(),
    ]),
});

type BoardRequestQueryRow = z.infer<typeof boardRequestQueryRowSchema>;

const updateBoardStatusSchema = z.object({
    boardRequestId: z.string().uuid(),
    manualPrintStatus: z.enum(["pending", "in_progress", "completed"]),
});

function normalizeLimit(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return 50;
    return Math.min(100, Math.max(1, Math.round(numeric)));
}

async function requireBoardRequestsAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");

    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (profile?.role !== "admin" && profile?.role !== "dev") {
        throw new Error("Forbidden");
    }
    return supabase;
}

function mapBoardRequestRow(row: BoardRequestQueryRow): BoardRequestAdminRow {
    const relatedProfile = Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile;
    return {
        id: row.id,
        generationRequestId: row.generation_request_id,
        prompt: row.prompt,
        generationContext: row.generation_context,
        boardImageUrl: row.board_image_url,
        provider: row.provider,
        generationModel: row.generation_model,
        status: row.status,
        manualPrintStatus: row.manual_print_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        customer: relatedProfile
            ? {
                displayName: relatedProfile.display_name,
                username: relatedProfile.username,
                email: relatedProfile.email,
                phone: relatedProfile.phone,
            }
            : null,
    };
}

export async function getBoardRequests(input?: {
    status?: BoardRequestStatusFilter;
    manualPrintStatus?: BoardManualPrintFilter;
    limit?: number;
}): Promise<BoardRequestAdminRow[]> {
    const supabase = await requireBoardRequestsAdmin();
    const status = normalizeBoardRequestStatus(input?.status);
    const manualPrintStatus = normalizeBoardManualPrintFilter(input?.manualPrintStatus);
    const limit = normalizeLimit(input?.limit);

    let query = supabase
        .from("washa_board_requests")
        .select(`
            id,
            generation_request_id,
            prompt,
            generation_context,
            board_image_url,
            provider,
            generation_model,
            status,
            manual_print_status,
            created_at,
            updated_at,
            profile:profiles!washa_board_requests_profile_id_fkey(
                display_name,
                username,
                email,
                phone
            )
        `)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (status === "ready") {
        query = query.not("board_image_url", "is", null);
        if (manualPrintStatus !== "all") {
            query = query.eq("manual_print_status", manualPrintStatus);
        }
    }

    const { data, error } = await query;
    if (error) throw new Error("تعذّر تحميل طلبات اللوحات.");
    const parsedRows = z.array(boardRequestQueryRowSchema).safeParse(data ?? []);
    if (!parsedRows.success) throw new Error("تعذّر تحميل طلبات اللوحات.");

    return parsedRows.data.map(mapBoardRequestRow);
}

export async function updateBoardManualPrintStatus(input: {
    boardRequestId: string;
    manualPrintStatus: WashaBoardManualPrintStatus;
}): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await requireBoardRequestsAdmin();
    const parsed = updateBoardStatusSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "بيانات تحديث الطلب غير صالحة." };
    }

    const { data, error } = await supabase
        .from("washa_board_requests")
        .update({ manual_print_status: parsed.data.manualPrintStatus })
        .eq("id", parsed.data.boardRequestId)
        .eq("status", "ready")
        .select("id")
        .maybeSingle();

    if (error || !data) {
        return { success: false, error: "تعذّر تحديث حالة طلب اللوحة." };
    }

    revalidatePath("/dashboard/board-requests");
    return { success: true };
}
