// وشّى | WASHA — Cron: استرداد تاركي السلة
// يُستدعى كل ساعة عبر Vercel Cron أو cURL خارجي
// يبحث عن: add_to_cart في آخر 2-24 ساعة بدون checkout_complete → يرسل بريد استرداد

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@washa.shop";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

function getAdminSB() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

function authorizeCron(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const auth = req.headers.get("authorization");
    return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
    if (!authorizeCron(req)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const sb = getAdminSB();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // -24h
    const windowEnd   = new Date(now.getTime() -  2 * 60 * 60 * 1000).toISOString(); // -2h

    // 1. Find users who added to cart between 24h and 2h ago
    const { data: cartEvents } = await sb
        .from("behavioral_events")
        .select("user_id, metadata, created_at")
        .eq("event_type", "add_to_cart")
        .gte("created_at", windowStart)
        .lte("created_at", windowEnd)
        .not("user_id", "is", null);

    if (!cartEvents || cartEvents.length === 0) {
        return NextResponse.json({ ok: true, sent: 0, reason: "no cart events" });
    }

    // Unique user IDs who added to cart in window
    const cartUserIds = Array.from(new Set(cartEvents.map((e: { user_id: string }) => e.user_id)));

    // 2. Exclude those who already completed checkout in the same window
    const { data: completedEvents } = await sb
        .from("behavioral_events")
        .select("user_id")
        .eq("event_type", "checkout_complete")
        .gte("created_at", windowStart)
        .in("user_id", cartUserIds);

    const completedIds = new Set((completedEvents ?? []).map((e: { user_id: string }) => e.user_id));
    const abandonerIds = cartUserIds.filter((id) => !completedIds.has(id));

    if (abandonerIds.length === 0) {
        return NextResponse.json({ ok: true, sent: 0, reason: "all completed checkout" });
    }

    // 3. Check who already got a recovery email in the last 24h (avoid spam)
    const { data: alreadySent } = await sb
        .from("behavioral_events")
        .select("user_id")
        .eq("event_type", "cart_abandon")
        .gte("created_at", windowStart)
        .in("user_id", abandonerIds);

    const alreadySentIds = new Set((alreadySent ?? []).map((e: { user_id: string }) => e.user_id));
    const toNotify = abandonerIds.filter((id) => !alreadySentIds.has(id));

    if (toNotify.length === 0) {
        return NextResponse.json({ ok: true, sent: 0, reason: "already notified" });
    }

    // 4. Fetch emails for those users
    const { data: profiles } = await sb
        .from("profiles")
        .select("id, email, display_name")
        .in("id", toNotify)
        .not("email", "is", null);

    let sent = 0;

    for (const profile of profiles ?? []) {
        if (!profile.email) continue;

        // Find their last cart product from metadata
        const lastCartEvent = cartEvents
            .filter((e: { user_id: string }) => e.user_id === profile.id)
            .sort((a: { created_at: string }, b: { created_at: string }) =>
                b.created_at.localeCompare(a.created_at)
            )[0];

        const productTitle = lastCartEvent?.metadata?.title as string | undefined;
        const productPrice = lastCartEvent?.metadata?.price as number | undefined;

        const name = profile.display_name || "عزيزنا";
        const html = buildCartRecoveryEmail(name, productTitle, productPrice);

        try {
            await resend.emails.send({
                from: `وشّى | WASHA <${FROM_EMAIL}>`,
                to: profile.email,
                subject: "نسيت شيئاً في سلتك 🛒 — وشّى",
                html,
            });

            // Mark as notified so we don't spam
            await sb.from("behavioral_events").insert({
                event_type: "cart_abandon",
                user_id: profile.id,
                metadata: { recovery_email_sent: true, product_title: productTitle },
            });

            sent++;
        } catch {
            // continue with next user
        }
    }

    return NextResponse.json({ ok: true, sent, total_abandoners: toNotify.length });
}

function buildCartRecoveryEmail(
    name: string,
    productTitle?: string,
    productPrice?: number
): string {
    const productSection = productTitle
        ? `
        <div style="margin: 24px 0; padding: 20px; background: #f9f3ea; border-radius: 12px; border: 1px solid #e8ddd0; text-align: right;">
            <p style="margin:0 0 6px; font-size:12px; color:#9c8c7a;">المنتج في سلتك</p>
            <p style="margin:0; font-size:16px; font-weight:bold; color:#1a1612;">${productTitle}</p>
            ${productPrice ? `<p style="margin:4px 0 0; font-size:14px; color:#D4AF37;">${productPrice.toFixed(2)} ريال</p>` : ""}
        </div>`
        : "";

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f4ede3;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede3;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:linear-gradient(135deg,#1a1612 0%,#2d261f 100%);padding:28px 32px;text-align:center;">
          <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">وشّى | WASHA</h1>
          <p style="color:#c9b99a;margin:8px 0 0;font-size:13px;">فنٌ يُرتدى</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;direction:rtl;text-align:right;">
          <h2 style="color:#1a1612;font-size:20px;margin:0 0 12px;">مرحباً ${name}،</h2>
          <p style="color:#5a4a3a;font-size:15px;line-height:1.8;margin:0 0 8px;">
            لاحظنا أنك تركت شيئاً في سلتك — وكان اختياراً رائعاً!
          </p>
          ${productSection}
          <p style="color:#5a4a3a;font-size:14px;line-height:1.8;margin:12px 0 24px;">
            سلتك لا تزال في انتظارك. أكمل طلبك الآن قبل نفاد الكمية.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${SITE_URL}/cart"
               style="display:inline-block;background:#D4AF37;color:#1a1612;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:bold;font-size:16px;">
              أكمل الشراء 🛒
            </a>
          </div>
          <p style="color:#9c8c7a;font-size:12px;text-align:center;margin:16px 0 0;">
            إذا كنت تريد الاستمرار بالتسوق، زر <a href="${SITE_URL}/store" style="color:#D4AF37;">متجرنا</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #e8ddd0;text-align:center;color:#9c8c7a;font-size:11px;">
          © ${new Date().getFullYear()} وشّى | WASHA — <a href="${SITE_URL}" style="color:#D4AF37;text-decoration:none;">washa.shop</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
