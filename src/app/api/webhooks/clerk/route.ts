// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Clerk Webhook
//  مزامنة المستخدمين مع Supabase — user.created, updated, deleted
// ═══════════════════════════════════════════════════════════

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
    try {
        const evt = await verifyWebhook(req);
        const supabase = getAdminSupabase();

        if (!supabase) {
            console.error("[Clerk Webhook] Supabase غير معرّف");
            return NextResponse.json({ error: "Server config" }, { status: 500 });
        }

        if (evt.type === "user.created") {
            const { id, first_name, last_name, username, image_url, email_addresses, phone_numbers } = evt.data;

            const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || "مستخدم وشّى";
            const email = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address || null;
            const phone = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)?.phone_number || phone_numbers?.[0]?.phone_number || null;
            
            const baseUsername = (username || email?.split("@")[0] || "user")
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, "_")
                .slice(0, 20);
            const usernameUnique = `${baseUsername}_${Date.now().toString(36)}`;

            const { error } = await supabase.from("profiles").insert({
                clerk_id: id,
                display_name: displayName,
                username: usernameUnique,
                role: "subscriber",
                avatar_url: image_url || null,
                email: email,
                phone: phone,
            });

            if (error) {
                if (error.code === "23505") {
                    console.warn("[Clerk Webhook] الملف موجود مسبقاً:", id);
                    return NextResponse.json({ received: true }, { status: 200 });
                }
                console.error("[Clerk Webhook] user.created:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (email) {
                sendWelcomeEmail(email, displayName).catch(console.error);
            }
            console.log("[Clerk Webhook] تم إنشاء ملف للمستخدم:", id);
        }

        if (evt.type === "user.updated") {
            const { id, first_name, last_name, username, image_url, email_addresses, phone_numbers } = evt.data;

            const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || undefined;
            const email = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address || null;
            const phone = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)?.phone_number || phone_numbers?.[0]?.phone_number || null;

            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (displayName) updates.display_name = displayName;
            if (image_url !== undefined) updates.avatar_url = image_url;
            if (email !== undefined) updates.email = email;
            if (phone !== undefined) updates.phone = phone;

            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("clerk_id", id);

            if (error) {
                console.error("[Clerk Webhook] user.updated:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        if (evt.type === "user.deleted") {
            const { id } = evt.data;

            const { error } = await supabase.from("profiles").delete().eq("clerk_id", id);

            if (error) {
                console.error("[Clerk Webhook] user.deleted:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            console.log("[Clerk Webhook] تم حذف ملف المستخدم:", id);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
        console.error("[Clerk Webhook] خطأ:", err);
        return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
    }
}
