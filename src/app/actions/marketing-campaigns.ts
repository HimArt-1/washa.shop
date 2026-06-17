// وشّى | WASHA — إرسال الحملات البريدية التسويقية عبر Resend
"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@washa.shop";
const FROM_NAME = "وشّى | WASHA";

interface SendCampaignInput {
    segmentId: string;
    userIds: string[];
    subject: string;
    body: string;
}

interface SendCampaignResult {
    sent: number;
    failed: number;
    message: string;
}

export async function sendCampaignToSegment(
    input: SendCampaignInput
): Promise<SendCampaignResult> {
    // ─── Auth check ──────────────────────────────────────────────────────────
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return { sent: 0, failed: 0, message: "غير مصرح" };

    const access = await resolveAdminAccess(user);
    if (!access.isAdmin) return { sent: 0, failed: 0, message: "صلاحيات غير كافية" };

    // Use untyped client so new tables (marketing_campaigns) pass TS without regen
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient<any>(url, key, { auth: { persistSession: false } });

    if (!input.subject.trim() || !input.body.trim()) {
        return { sent: 0, failed: 0, message: "العنوان أو النص فارغ" };
    }

    if (input.userIds.length === 0) {
        return { sent: 0, failed: 0, message: "لا يوجد مستخدمون في هذه الشريحة" };
    }

    // ─── Resolve emails for userIds ───────────────────────────────────────────
    const { data: profiles } = await sb
        .from("profiles")
        .select("id, email")
        .in("id", input.userIds.slice(0, 500))
        .not("email", "is", null);

    const emails: string[] = (profiles ?? [])
        .map((p) => p.email)
        .filter((e): e is string => typeof e === "string" && e.includes("@"));

    if (emails.length === 0) {
        return {
            sent: 0,
            failed: 0,
            message: "لم يُعثر على عناوين بريد إلكتروني صالحة في هذه الشريحة",
        };
    }

    // ─── Send in batches of 50 (Resend batch limit) ───────────────────────────
    const BATCH_SIZE = 50;
    let sent = 0;
    let failed = 0;

    const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family: Tahoma, Arial, sans-serif; background:#f4ede3; margin:0; padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede3; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1612 0%, #2d261f 100%); padding: 28px 32px; text-align:center;">
              <h1 style="color:#D4AF37; margin:0; font-size:28px; letter-spacing:2px;">وشّى | WASHA</h1>
              <p style="color:#c9b99a; margin:8px 0 0; font-size:13px;">فنٌ يُرتدى</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px; color:#1a1612; line-height:1.8; font-size:15px; direction:rtl; text-align:right;">
              ${input.body.replace(/\n/g, "<br/>")}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; border-top:1px solid #e8ddd0; text-align:center; color:#9c8c7a; font-size:12px;">
              <p style="margin:0;">© ${new Date().getFullYear()} وشّى | WASHA — جميع الحقوق محفوظة</p>
              <p style="margin:6px 0 0;">
                <a href="https://washa.shop" style="color:#D4AF37; text-decoration:none;">washa.shop</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        const messages = batch.map((to) => ({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to,
            subject: input.subject,
            html: htmlBody,
        }));

        try {
            const result = await resend.batch.send(messages);
            const successCount = result.data?.data?.filter((r) => r.id).length ?? 0;
            sent += successCount;
            failed += batch.length - successCount;
        } catch {
            failed += batch.length;
        }
    }

    // ─── Log campaign ─────────────────────────────────────────────────────────
    await sb.from("marketing_campaigns").insert({
        segment_id: input.segmentId,
        subject: input.subject,
        recipients_count: sent,
        failed_count: failed,
        sent_at: new Date().toISOString(),
    }).then(() => {});

    const message =
        sent > 0
            ? `تم الإرسال بنجاح لـ ${sent} عميل${failed > 0 ? ` · فشل ${failed}` : ""}`
            : `فشل الإرسال لجميع المستلمين (${failed})`;

    return { sent, failed, message };
}
