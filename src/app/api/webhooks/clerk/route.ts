// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Clerk Webhook
//  مزامنة المستخدمين مع Supabase — user.created, updated, deleted
// ═══════════════════════════════════════════════════════════

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAdminNewUserNotificationEmail, sendAdminUserLoginNotificationEmail, sendWelcomeEmail } from "@/lib/email";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { ensureIdentityProfile, findProfileForIdentity } from "@/lib/identity-sync";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";
import { runRecoverableAdminWebhookDispatch } from "@/lib/admin-notification-delivery";
import { escapeAdminNotificationHtml } from "@/lib/notifications";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

type ClerkWebhookUser = {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    primary_email_address_id?: string | null;
    primary_phone_number_id?: string | null;
    email_addresses?: Array<{ id: string; email_address: string }>;
    phone_numbers?: Array<{ id: string; phone_number: string }>;
};

async function reportClerkWebhookAlert(params: {
    dispatchKey: string;
    title: string;
    message: string;
    severity: "warning" | "critical";
    category?: "system" | "security";
    source: string;
    link?: string;
    metadata?: Record<string, unknown>;
    bucketMs?: number;
    stack?: string | null;
}) {
    await reportAdminOperationalAlert({
        dispatchKey: params.dispatchKey,
        bucketMs: params.bucketMs,
        title: params.title,
        message: params.message,
        severity: params.severity,
        category: params.category ?? "system",
        source: params.source,
        link: params.link,
        metadata: params.metadata,
        stack: params.stack,
    });
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

function getWebhookUserDisplayName(user: ClerkWebhookUser | null | undefined, fallback = "مستخدم وشّى") {
    if (!user) return fallback;
    return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || fallback;
}

function getWebhookUserEmail(user: ClerkWebhookUser | null | undefined) {
    if (!user) return null;
    return user.email_addresses?.find((entry) => entry.id === user.primary_email_address_id)?.email_address ||
        user.email_addresses?.[0]?.email_address ||
        null;
}

function getWebhookUserPhone(user: ClerkWebhookUser | null | undefined) {
    if (!user) return null;
    return user.phone_numbers?.find((entry) => entry.id === user.primary_phone_number_id)?.phone_number ||
        user.phone_numbers?.[0]?.phone_number ||
        null;
}

export async function POST(req: NextRequest) {
    try {
        if (!CLERK_WEBHOOK_SECRET) {
            await reportClerkWebhookAlert({
                dispatchKey: "clerk_webhook:missing_secret",
                bucketMs: 6 * 60 * 60 * 1000,
                title: "Clerk webhook غير مهيأ",
                message: "CLERK_WEBHOOK_SIGNING_SECRET غير مضبوط، لذلك تتعطل مزامنة المستخدمين القادمة من Clerk.",
                severity: "critical",
                source: "clerk.webhook.config",
                link: "/dashboard/settings",
            });
            return NextResponse.json({ error: "Webhook config missing" }, { status: 500 });
        }

        const evt = await verifyWebhook(req);
        const supabase = getAdminSupabase();

        if (!supabase) {
            console.error("[Clerk Webhook] Supabase غير معرّف");
            await reportClerkWebhookAlert({
                dispatchKey: "clerk_webhook:supabase_missing",
                bucketMs: 6 * 60 * 60 * 1000,
                title: "Clerk webhook لا يستطيع الوصول إلى Supabase",
                message: "إعدادات Supabase غير مكتملة داخل مسار Clerk webhook، لذلك لا يمكن مزامنة الملفات الشخصية.",
                severity: "critical",
                source: "clerk.webhook.config",
                link: "/dashboard/settings",
            });
            return NextResponse.json({ error: "Server config" }, { status: 500 });
        }

        if (evt.type === "user.created") {
            const { id, first_name, last_name, username, image_url, email_addresses, phone_numbers } = evt.data;

            const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || "مستخدم وشّى";
            const email = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address || null;
            const phone = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)?.phone_number || phone_numbers?.[0]?.phone_number || null;

            try {
                const ensured = await ensureIdentityProfile(
                    supabase,
                    {
                        clerkId: id,
                        email,
                        phone,
                        username: username || null,
                        firstName: first_name || null,
                        lastName: last_name || null,
                        imageUrl: image_url || null,
                        role: "subscriber",
                    },
                    { role: "subscriber" }
                );

                if (ensured.action === "conflict") {
                    await reportClerkWebhookAlert({
                        dispatchKey: `clerk_webhook:user_created_conflict:${id}`,
                        bucketMs: 30 * 60 * 1000,
                        title: "تعارض هوية أثناء مزامنة Clerk",
                        message: `تم رصد ملف منصة مرتبط مسبقًا بهوية مختلفة للمستخدم ${displayName}.`,
                        severity: "warning",
                        source: "clerk.webhook.user_created",
                        link: "/dashboard/users-clerk",
                        metadata: {
                            clerk_id: id,
                            email,
                        },
                    });
                    return NextResponse.json({ received: true, conflict: true }, { status: 200 });
                }

                const userCreatedSideEffects: Promise<unknown>[] = [];

                if (email && ensured.action === "created") {
                    userCreatedSideEffects.push(sendWelcomeEmail(email, displayName));
                }

                userCreatedSideEffects.push(
                    runIdempotentDispatch(
                        {
                            dispatchKey: `clerk_user:${id}:admin_email:user_created`,
                            eventType: "user_created",
                            channel: "email_admin",
                            resourceType: "user",
                            resourceId: ensured.profile?.id ?? id,
                            metadata: {
                                clerk_id: id,
                                profile_id: ensured.profile?.id ?? null,
                                email,
                                action: ensured.action,
                            },
                        },
                        async () => {
                            const result = await sendAdminNewUserNotificationEmail({
                                name: displayName,
                                email,
                                phone,
                                username: username || null,
                                clerkId: id,
                                profileAction: ensured.action,
                            });
                            if (result.success === false) {
                                throw new Error("Failed to send admin new user email");
                            }
                        }
                    )
                );

                userCreatedSideEffects.push(
                    runRecoverableAdminWebhookDispatch(
                        {
                            dispatchKey: `clerk_user:${id}:webhook_admin:user_created`,
                            eventType: "user_created",
                            resourceType: "user",
                            resourceId: ensured.profile?.id ?? id,
                            metadata: {
                                clerk_id: id,
                                profile_id: ensured.profile?.id ?? null,
                                email,
                                action: ensured.action,
                            },
                        },
                        [
                            "👤 <b>تسجيل اشتراك جديد</b>",
                            `الاسم: ${escapeAdminNotificationHtml(displayName)}`,
                            `البريد: ${escapeAdminNotificationHtml(email)}`,
                            `الجوال: ${escapeAdminNotificationHtml(phone)}`,
                            `الحالة: ${escapeAdminNotificationHtml(ensured.action === "created" ? "مستخدم جديد" : "تحديث ربط موجود")}`,
                        ].join("\n")
                    )
                );

                const sideEffectResults = await Promise.allSettled(userCreatedSideEffects);
                for (const result of sideEffectResults) {
                    if (result.status === "rejected") {
                        console.error("[Clerk Webhook] user.created side effect:", result.reason);
                    }
                }
            } catch (error) {
                console.error("[Clerk Webhook] user.created:", error);
                await reportClerkWebhookAlert({
                    dispatchKey: `clerk_webhook:user_created_failed:${id}`,
                    bucketMs: 30 * 60 * 1000,
                    title: "فشل إنشاء ملف مستخدم من Clerk",
                    message: `تعذر إنشاء ملف Supabase للمستخدم ${displayName} القادم من حدث user.created.`,
                    severity: "critical",
                    source: "clerk.webhook.user_created",
                    link: "/dashboard/users-clerk",
                    metadata: {
                        clerk_id: id,
                        email,
                        db_error: error instanceof Error ? error.message : String(error),
                    },
                });
                return NextResponse.json({ error: error instanceof Error ? error.message : "Identity sync failed" }, { status: 500 });
            }

            console.log("[Clerk Webhook] تم إنشاء ملف للمستخدم:", id);
        }

        if (evt.type === "session.created") {
            const { id, user_id, user, latest_activity } = evt.data;
            const displayName = getWebhookUserDisplayName(user, "مستخدم وشّى");
            const email = getWebhookUserEmail(user);
            const phone = getWebhookUserPhone(user);
            const ipAddress = latest_activity?.ip_address || evt.event_attributes?.http_request?.client_ip || null;
            const userAgent = evt.event_attributes?.http_request?.user_agent || null;

            try {
                const sessionSideEffects = [
                    runIdempotentDispatch(
                        {
                            dispatchKey: `clerk_session:${id}:admin_email:session_created`,
                            eventType: "session_created",
                            channel: "email_admin",
                            resourceType: "session",
                            resourceId: id,
                            metadata: {
                                clerk_id: user_id,
                                session_id: id,
                                email,
                                ip_address: ipAddress,
                                city: latest_activity?.city ?? null,
                                country: latest_activity?.country ?? null,
                                device_type: latest_activity?.device_type ?? null,
                                browser_name: latest_activity?.browser_name ?? null,
                            },
                        },
                        async () => {
                            const result = await sendAdminUserLoginNotificationEmail({
                                name: displayName,
                                email,
                                phone,
                                username: user?.username ?? null,
                                clerkId: user_id,
                                sessionId: id,
                                ipAddress,
                                userAgent,
                                city: latest_activity?.city ?? null,
                                country: latest_activity?.country ?? null,
                                deviceType: latest_activity?.device_type ?? null,
                                browserName: latest_activity?.browser_name ?? null,
                            });
                            if (result.success === false) {
                                throw new Error("Failed to send admin user login email");
                            }
                        }
                    ),
                    runRecoverableAdminWebhookDispatch(
                        {
                            dispatchKey: `clerk_session:${id}:webhook_admin:session_created`,
                            eventType: "session_created",
                            resourceType: "session",
                            resourceId: id,
                            metadata: {
                                clerk_id: user_id,
                                session_id: id,
                                email,
                                ip_address: ipAddress,
                                city: latest_activity?.city ?? null,
                                country: latest_activity?.country ?? null,
                                device_type: latest_activity?.device_type ?? null,
                                browser_name: latest_activity?.browser_name ?? null,
                            },
                        },
                        [
                            "🔐 <b>تسجيل دخول جديد</b>",
                            `المستخدم: ${escapeAdminNotificationHtml(displayName)}`,
                            `البريد: ${escapeAdminNotificationHtml(email)}`,
                            `الدولة/المدينة: ${escapeAdminNotificationHtml([latest_activity?.country, latest_activity?.city].filter(Boolean).join(" / ") || null)}`,
                            `الجهاز: ${escapeAdminNotificationHtml(latest_activity?.device_type || null)}`,
                            `المتصفح: ${escapeAdminNotificationHtml(latest_activity?.browser_name || null)}`,
                            `IP: ${escapeAdminNotificationHtml(ipAddress)}`,
                        ].join("\n")
                    ),
                ];

                const sessionResults = await Promise.allSettled(sessionSideEffects);
                for (const result of sessionResults) {
                    if (result.status === "rejected") {
                        console.error("[Clerk Webhook] session.created side effect:", result.reason);
                    }
                }
            } catch (error) {
                console.error("[Clerk Webhook] session.created side effect:", error);
            }
        }

        if (evt.type === "user.updated") {
            const { id, first_name, last_name, username, image_url, email_addresses, phone_numbers } = evt.data;

            const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || undefined;
            const email = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address || null;
            const phone = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)?.phone_number || phone_numbers?.[0]?.phone_number || null;

            try {
                const existing = await findProfileForIdentity(supabase, { clerkId: id, email });
                if (!existing) {
                    const ensured = await ensureIdentityProfile(
                        supabase,
                        {
                            clerkId: id,
                            email,
                            phone,
                            username: username || null,
                            firstName: first_name || null,
                            lastName: last_name || null,
                            imageUrl: image_url || null,
                            role: "subscriber",
                        },
                        { role: "subscriber" }
                    );

                    if (ensured.action === "conflict") {
                        return NextResponse.json({ received: true, conflict: true }, { status: 200 });
                    }
                } else {
                    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), clerk_id: id };
                    if (displayName) updates.display_name = displayName;
                    if (image_url !== undefined) updates.avatar_url = image_url;
                    if (email !== undefined) updates.email = email;
                    if (phone !== undefined) updates.phone = phone;

                    const { error } = await supabase
                        .from("profiles")
                        .update(updates)
                        .eq("id", existing.id);

                    if (error) throw error;
                }
            } catch (error) {
                console.error("[Clerk Webhook] user.updated:", error);
                await reportClerkWebhookAlert({
                    dispatchKey: `clerk_webhook:user_updated_failed:${id}`,
                    bucketMs: 30 * 60 * 1000,
                    title: "فشل تحديث ملف مستخدم من Clerk",
                    message: `تعذر تحديث ملف Supabase للمستخدم ${id} بعد حدث user.updated.`,
                    severity: "warning",
                    source: "clerk.webhook.user_updated",
                    link: "/dashboard/users-clerk",
                    metadata: {
                        clerk_id: id,
                        email,
                        db_error: error instanceof Error ? error.message : String(error),
                    },
                });
                return NextResponse.json({ error: error instanceof Error ? error.message : "Profile update failed" }, { status: 500 });
            }
        }

        if (evt.type === "user.deleted") {
            const { id } = evt.data;

            const { error } = await supabase.from("profiles").delete().eq("clerk_id", id);

            if (error) {
                console.error("[Clerk Webhook] user.deleted:", error);
                await reportClerkWebhookAlert({
                    dispatchKey: `clerk_webhook:user_deleted_failed:${id}`,
                    bucketMs: 30 * 60 * 1000,
                    title: "فشل حذف ملف مستخدم من Clerk",
                    message: `تعذر حذف ملف Supabase المرتبط بالمستخدم ${id} بعد حدث user.deleted.`,
                    severity: "warning",
                    source: "clerk.webhook.user_deleted",
                    link: "/dashboard/users-clerk",
                    metadata: {
                        clerk_id: id,
                        db_error: error.message,
                    },
                });
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            console.log("[Clerk Webhook] تم حذف ملف المستخدم:", id);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
        console.error("[Clerk Webhook] خطأ:", err);
        await reportClerkWebhookAlert({
            dispatchKey: "clerk_webhook:verification_failed",
            bucketMs: 30 * 60 * 1000,
            title: "فشل التحقق من Clerk webhook",
            message: "تم رفض أو فشل التحقق من طلب وارد من Clerk webhook قبل إتمام المزامنة.",
            severity: "warning",
            category: "security",
            source: "clerk.webhook.verification",
            link: "/dashboard/notifications",
            metadata: {
                error: err instanceof Error ? err.message : String(err),
            },
            stack: err instanceof Error ? err.stack ?? null : null,
        });
        return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
    }
}
