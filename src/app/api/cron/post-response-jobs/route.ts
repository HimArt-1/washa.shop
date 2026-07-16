import { NextRequest, NextResponse } from "next/server";

import { recoverPostResponseJobs } from "@/lib/post-response-recovery";
import { recoverFailedUserNotificationPushes } from "@/lib/user-notifications";
import { recoverFailedAdminNotificationDeliveries } from "@/lib/admin-notification-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    try {
        const [result, notificationPushRecovery, adminNotificationRecovery] = await Promise.all([
            recoverPostResponseJobs(),
            recoverFailedUserNotificationPushes(),
            recoverFailedAdminNotificationDeliveries(),
        ]);
        const response = {
            ...result,
            ok: result.ok && notificationPushRecovery.ok && adminNotificationRecovery.ok,
            notificationPushRecovery,
            adminNotificationRecovery,
        };
        return NextResponse.json(response, { status: response.ok ? 200 : 500 });
    } catch (error) {
        console.error("Post-response job recovery failed", error);
        return NextResponse.json({ ok: false, error: "recovery_failed" }, { status: 500 });
    }
}
