// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — إرسال البريد الإلكتروني
//  عبر Resend — قوالب احترافية بهوية وشّى
// ═══════════════════════════════════════════════════════════

import { Resend } from "resend";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "وشّى <info@washa.shop>";
const SITE_NAME = "وشّى";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_ADDRESS_LENGTH = 320;
const MAX_EMAIL_SUBJECT_LENGTH = 180;
const MAX_EMAIL_HTML_LENGTH = 250_000;

export const EMAIL_ENABLED = !!resend;

/* ─── Premium Email Wrapper ────────────────────────────── */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sanitizeText(value: string | null | undefined, maxLength = 160, fallback = "—"): string {
    const normalized = (value || "").trim().replace(/\s+/g, " ");
    if (!normalized) return fallback;
    return escapeHtml(normalized.slice(0, maxLength));
}

function sanitizeEmailAddress(value: string | null | undefined): string | null {
    const normalized = (value || "").trim().toLowerCase();
    if (!normalized || normalized.length > MAX_EMAIL_ADDRESS_LENGTH) return null;
    if (!EMAIL_REGEX.test(normalized)) return null;
    return normalized;
}

function getEmailDomain(value: string | null | undefined) {
    const sanitized = sanitizeEmailAddress(value);
    return sanitized?.split("@")[1] ?? null;
}

function sanitizeSubject(value: string): string {
    return value.trim().replace(/\s+/g, " ").slice(0, MAX_EMAIL_SUBJECT_LENGTH);
}

function buildSiteUrl(path: string) {
    try {
        return new URL(path, BASE_URL).toString();
    } catch {
        return BASE_URL;
    }
}

function wushaTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#080808;font-family:'Segoe UI',Tahoma,'IBM Plex Sans Arabic',sans-serif;direction:rtl;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080808;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:linear-gradient(135deg,#111111 0%,#1a1a1a 100%);border-radius:24px;border:1px solid rgba(206,174,127,0.15);overflow:hidden;">

          <!-- Header with gold gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#5A3E2B 0%,#ceae7f 50%,#5A3E2B 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#080808;letter-spacing:0.02em;">وشّى</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(8,8,8,0.7);letter-spacing:0.05em;">WASHA — فنٌ يرتدى</p>
            </td>
          </tr>

          <!-- Content area -->
          <tr>
            <td style="padding:40px 36px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(206,174,127,0.25),transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 32px;text-align:center;">
              <p style="margin:0 0 12px;font-size:13px;color:rgba(240,235,227,0.4);">
                منصة فنية رقمية للأزياء ..
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${BASE_URL}" style="color:#ceae7f;text-decoration:none;">washa.shop</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:rgba(240,235,227,0.25);">
                © ${new Date().getFullYear()} ${SITE_NAME} — جميع الحقوق محفوظة
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
    const safeText = sanitizeText(text, 80, SITE_NAME);
    const safeUrl = buildSiteUrl(url);
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
        <tr>
          <td style="background:linear-gradient(135deg,#5A3E2B,#ceae7f,#5A3E2B);border-radius:14px;padding:14px 32px;">
            <a href="${safeUrl}" style="color:#080808;font-weight:700;text-decoration:none;font-size:15px;display:inline-block;">
              ${safeText}
            </a>
          </td>
        </tr>
      </table>`;
}

function paragraph(text: string): string {
    return `<p style="margin:0 0 16px;color:#f0ebe3;font-size:15px;line-height:1.8;">${text}</p>`;
}

function heading(text: string): string {
    return `<h2 style="margin:0 0 20px;color:#ceae7f;font-size:22px;font-weight:700;">${text}</h2>`;
}

function infoBlock(label: string, value: string): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td style="color:rgba(240,235,227,0.5);font-size:13px;padding:6px 0;">${label}</td>
          <td style="color:#f0ebe3;font-size:15px;font-weight:600;padding:6px 0;text-align:left;" dir="auto">${value}</td>
        </tr>
      </table>`;
}

/* ─── Send Helper ──────────────────────────────────────── */

async function send(options: { to: string; subject: string; html: string }) {
    if (!resend) {
        console.warn("[Email] RESEND_API_KEY غير معرّف — تخطي الإرسال");
        await reportAdminOperationalAlert({
            dispatchKey: "email:resend_config_missing",
            bucketMs: 6 * 60 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "خدمة البريد غير مهيأة",
            message: "RESEND_API_KEY غير مضبوط حالياً، لذلك يتم تخطي رسائل البريد الخارجة من النظام.",
            link: "/dashboard/settings",
            source: "email.resend.config",
        });
        return { success: false };
    }

    const recipient = sanitizeEmailAddress(options.to);
    const subject = sanitizeSubject(options.subject);
    if (!recipient || !subject || !options.html || options.html.length > MAX_EMAIL_HTML_LENGTH) {
        return { success: false };
    }

    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipient,
            subject,
            html: options.html,
        });
        if (error) {
            console.error("[Email]", error);
            await reportAdminOperationalAlert({
                dispatchKey: "email:delivery_failed",
                bucketMs: 30 * 60 * 1000,
                category: "system",
                severity: "warning",
                title: "فشل إرسال بريد تشغيلي",
                message: "خدمة البريد أعادت خطأ أثناء محاولة إرسال رسالة من النظام.",
                link: "/dashboard/notifications",
                source: "email.resend.send",
                metadata: {
                    subject,
                    recipient_domain: getEmailDomain(recipient),
                    error: error.message,
                },
            });
            return { success: false };
        }
        return { success: true };
    } catch (err) {
        console.error("[Email]", err);
        await reportAdminOperationalAlert({
            dispatchKey: "email:delivery_exception",
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "استثناء أثناء إرسال البريد",
            message: "حدث استثناء غير متوقع أثناء إرسال بريد من النظام عبر Resend.",
            link: "/dashboard/notifications",
            source: "email.resend.send",
            metadata: {
                subject,
                recipient_domain: getEmailDomain(recipient),
                error: err instanceof Error ? err.message : String(err),
            },
            stack: err instanceof Error ? err.stack ?? null : null,
        });
        return { success: false };
    }
}

/* ─── Email Functions ──────────────────────────────────── */

export async function sendWelcomeEmail(to: string, name: string) {
    const safeName = sanitizeText(name, 80, "صديق وشّى");
    return send({
        to,
        subject: `مرحباً بك في ${SITE_NAME} 👋`,
        html: wushaTemplate(`
            ${heading(`مرحباً ${safeName} 👋`)}
            ${paragraph(`شكراً لانضمامك إلى <strong style="color:#ceae7f;">${SITE_NAME}</strong>. أنت الآن جزء من مجتمعنا.`)}
            ${paragraph("يمكنك تصفح المتجر، اكتشاف التصاميم، وتصميم قطعك بالذكاء الاصطناعي.")}
            ${ctaButton("استكشف المتجر", "/store")}
        `),
    });
}

export async function sendApplicationAcceptedEmail(to: string, name: string, tempPassword?: string) {
    const safeName = sanitizeText(name, 80, "فنان وشّى");
    const safePassword = tempPassword ? sanitizeText(tempPassword, 128, "") : "";
    const passwordNote = tempPassword
        ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:rgba(206,174,127,0.08);border:1px solid rgba(206,174,127,0.15);border-radius:12px;padding:16px 20px;">
              <tr><td>
                ${paragraph(`تم إنشاء حسابك. كلمة المرور المؤقتة:`)}
                <p style="margin:0;color:#ceae7f;font-size:18px;font-weight:700;font-family:monospace;direction:ltr;text-align:center;">${safePassword}</p>
                <p style="margin:8px 0 0;color:rgba(240,235,227,0.4);font-size:12px;">ننصحك بتغييرها فور تسجيل الدخول.</p>
              </td></tr>
            </table>`
        : "";

    return send({
        to,
        subject: `تم قبول طلبك — أنت الآن وشّاي 🎨`,
        html: wushaTemplate(`
            ${heading(`مبروك ${safeName}! 🎨`)}
            ${paragraph("تم قبول طلب انضمامك كفنان وشّاي. يمكنك الآن الدخول إلى الاستوديو ورفع أعمالك وبيعها.")}
            ${passwordNote}
            ${ctaButton("ادخل إلى الاستوديو", "/studio")}
        `),
    });
}

export async function sendApplicationRejectedEmail(to: string, name: string) {
    const safeName = sanitizeText(name, 80, "صديق وشّى");
    return send({
        to,
        subject: `بخصوص طلب الانضمام إلى ${SITE_NAME}`,
        html: wushaTemplate(`
            ${heading(`أهلاً ${safeName}،`)}
            ${paragraph("شكراً لاهتمامك بالانضمام كفنان. للأسف لم نتمكن من قبول طلبك هذه المرة.")}
            ${paragraph("يمكنك إعادة التقديم لاحقاً بعد تطوير معرض أعمالك. نتطلع لرؤيتك مجدداً.")}
            ${ctaButton("تصفح المعرض", "/gallery")}
        `),
    });
}

export interface OrderEmailItem {
    title: string;
    quantity: number;
    size?: string | null;
    unit_price: number;
}

export async function sendOrderConfirmationEmail(
    to: string,
    name: string,
    orderNumber: string,
    total: number,
    items?: OrderEmailItem[],
    breakdown?: {
        subtotal: number;
        discount: number;
        shipping: number;
        tax: number;
    }
) {
    const safeName = sanitizeText(name, 80, "عميل");
    const safeOrderNumber = sanitizeText(orderNumber, 40, "—");
    
    // Items table
    const itemsHtml = items && items.length > 0 ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">
          <tr>
            <td style="color:rgba(240,235,227,0.35);font-size:11px;padding:6px 0 8px;border-bottom:1px solid rgba(206,174,127,0.12);">المنتج</td>
            <td style="color:rgba(240,235,227,0.35);font-size:11px;padding:6px 0 8px;border-bottom:1px solid rgba(206,174,127,0.12);text-align:center;" width="40">الكمية</td>
            <td style="color:rgba(240,235,227,0.35);font-size:11px;padding:6px 0 8px;border-bottom:1px solid rgba(206,174,127,0.12);text-align:left;" dir="ltr" width="100">السعر</td>
          </tr>
          ${items.map(item => `<tr>
            <td style="color:#f0ebe3;font-size:13px;padding:9px 0;border-bottom:1px solid rgba(240,235,227,0.04);">
              ${sanitizeText(item.title, 120, "منتج")}${item.size ? ` <span style="color:#ceae7f;font-size:11px;">(${sanitizeText(item.size, 30, "")})</span>` : ""}
            </td>
            <td style="color:rgba(240,235,227,0.5);font-size:13px;padding:9px 0;border-bottom:1px solid rgba(240,235,227,0.04);text-align:center;">${item.quantity}</td>
            <td style="color:#ceae7f;font-size:13px;font-weight:600;padding:9px 0;border-bottom:1px solid rgba(240,235,227,0.04);text-align:left;" dir="ltr">${(item.unit_price * item.quantity).toLocaleString()} ر.س</td>
          </tr>`).join("")}
        </table>` : "";

    // Detailed breakdown (if provided) or fallback to simple total
    const summaryHtml = breakdown ? `
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(206,174,127,0.12);">
          ${infoBlock("المجموع الفرعي", `${breakdown.subtotal.toLocaleString()} ر.س`)}
          ${breakdown.discount > 0 ? infoBlock("الخصم", `<span style="color:#4ade80;">- ${breakdown.discount.toLocaleString()} ر.س</span>`) : ""}
          ${infoBlock("الشحن", breakdown.shipping > 0 ? `${breakdown.shipping.toLocaleString()} ر.س` : `<span style="color:#4ade80;">مجاني</span>`)}
          ${breakdown.tax > 0 ? infoBlock("الضريبة", `${breakdown.tax.toLocaleString()} ر.س`) : ""}
          <div style="height:8px;"></div>
          ${infoBlock("الإجمالي النهائي", `<strong style="color:#ceae7f;font-size:18px;">${total.toLocaleString()} ر.س</strong>`)}
        </div>
    ` : infoBlock("الإجمالي", `<strong style="color:#ceae7f;font-size:17px;">${total.toLocaleString()} ر.س</strong>`);

    return send({
        to,
        subject: `تم استلام طلبك #${safeOrderNumber} ✅`,
        html: wushaTemplate(`
            ${heading(`شكراً لطلبك، ${safeName} ✅`)}
            ${paragraph("تم استلام طلبك بنجاح. فيما يلي ملخص الفاتورة وتفاصيل المنتجات:")}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.05);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${itemsHtml}
                ${summaryHtml}
                <div style="height:12px;"></div>
                ${infoBlock("رقم الطلب", `#${safeOrderNumber}`)}
              </td></tr>
            </table>

            ${ctaButton("تتبع طلبك", "/account/orders")}
        `),
    });
}

export async function sendAdminOrderNotificationEmail(
    orderNumber: string,
    total: number,
    type: "new_order" | "payment_received",
    adminEmailOverride?: string
) {
    const adminEmail = sanitizeEmailAddress(adminEmailOverride || process.env.ADMIN_EMAIL);
    if (!adminEmail?.trim()) {
        return { success: false };
    }
    const safeOrderNumber = sanitizeText(orderNumber, 40, "—");

    const isNew = type === "new_order";
    const title = isNew ? "طلب جديد 🛒" : "تم استلام الدفع 💳";
    const desc = isNew
        ? "تم إنشاء طلب جديد في المتجر."
        : "تم تأكيد الدفع لطلب عبر Stripe.";
    const subject = isNew
        ? `طلب جديد #${safeOrderNumber} — ${total.toLocaleString()} ر.س`
        : `تم استلام الدفع #${safeOrderNumber} — ${total.toLocaleString()} ر.س`;

    return send({
        to: adminEmail,
        subject: `[${SITE_NAME}] ${subject}`,
        html: wushaTemplate(`
            ${heading(title)}
            ${paragraph(desc)}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.06);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${infoBlock("رقم الطلب", `#${safeOrderNumber}`)}
                ${infoBlock("الإجمالي", `${total.toLocaleString()} ر.س`)}
              </td></tr>
            </table>

            ${ctaButton("عرض الطلبات", "/dashboard/orders")}
        `),
    });
}

export async function sendAdminApplicationNotificationEmail(
    fullName: string,
    email: string,
    artStyle: string
) {
    const adminEmail = sanitizeEmailAddress(process.env.ADMIN_EMAIL);
    if (!adminEmail?.trim()) return { success: false };
    const safeFullName = sanitizeText(fullName, 100, "مقدم الطلب");
    const safeApplicantEmail = sanitizeText(sanitizeEmailAddress(email) || email, 160, "—");
    const safeArtStyle = sanitizeText(artStyle, 120, "—");

    return send({
        to: adminEmail,
        subject: `[${SITE_NAME}] طلب انضمام جديد — ${safeFullName}`,
        html: wushaTemplate(`
            ${heading("طلب انضمام جديد 📬")}
            ${paragraph("تم تقديم طلب انضمام كفنان وشّاي.")}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.06);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${infoBlock("الاسم", safeFullName)}
                ${infoBlock("البريد", safeApplicantEmail)}
                ${infoBlock("الأسلوب الفني", safeArtStyle)}
              </td></tr>
            </table>

            ${ctaButton("مراجعة الطلبات", "/dashboard/applications")}
        `),
    });
}

export async function sendAdminDesignOrderNotificationEmail(
    orderNumber: number,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    garmentName: string,
    colorName: string,
    designMethod: string,
    orderId: string
) {
    const adminEmail = sanitizeEmailAddress(process.env.ADMIN_EMAIL);
    if (!adminEmail?.trim()) return { success: false };
    const safeCustomerName = sanitizeText(customerName, 100, "—");
    const safeCustomerEmail = sanitizeText(sanitizeEmailAddress(customerEmail) || customerEmail, 160, "—");
    const safeCustomerPhone = sanitizeText(customerPhone, 40, "—");
    const safeGarmentName = sanitizeText(garmentName, 100, "—");
    const safeColorName = sanitizeText(colorName, 100, "—");
    const safeOrderId = encodeURIComponent((orderId || "").trim());

    const methodAr = designMethod === 'from_text' ? 'صورة بالذكاء الاصطناعي' 
                   : designMethod === 'from_image' ? 'صورة مرجعية مرفقة' 
                   : 'تصميم من الاستوديو';

    return send({
        to: adminEmail,
        subject: `[${SITE_NAME}] طلب تصميم جديد 🎨 — #${orderNumber}`,
        html: wushaTemplate(`
            ${heading("طلب تصميم جديد 🎨")}
            ${paragraph("لقد استلمت طلب تصميم جديد عبر خدمة 'صمم قطعتك'. يرجى مراجعة تفاصيل الطلب.")}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.06);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${infoBlock("رقم الطلب", `#${orderNumber}`)}
                ${infoBlock("العميل", safeCustomerName)}
                ${infoBlock("البريد", safeCustomerEmail)}
                ${infoBlock("الجوال", safeCustomerPhone)}
                <div style="height:12px;"></div>
                ${infoBlock("القطعة المحددة", safeGarmentName)}
                ${infoBlock("اللون", safeColorName)}
                ${infoBlock("طريقة التصميم", methodAr)}
              </td></tr>
            </table>

            ${ctaButton("عرض تفاصيل الطلب", safeOrderId ? `/dashboard/design-orders?id=${safeOrderId}` : "/dashboard/design-orders")}
        `),
    });
}
