// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — إرسال البريد الإلكتروني
//  عبر Resend — قوالب احترافية بهوية وشّى
// ═══════════════════════════════════════════════════════════

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "وشّى <info@washa.shop>";
const SITE_NAME = "وشّى";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export const EMAIL_ENABLED = !!resend;

/* ─── Premium Email Wrapper ────────────────────────────── */

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
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
        <tr>
          <td style="background:linear-gradient(135deg,#5A3E2B,#ceae7f,#5A3E2B);border-radius:14px;padding:14px 32px;">
            <a href="${url}" style="color:#080808;font-weight:700;text-decoration:none;font-size:15px;display:inline-block;">
              ${text}
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
        return { success: false };
    }
    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        if (error) {
            console.error("[Email]", error);
            return { success: false };
        }
        return { success: true };
    } catch (err) {
        console.error("[Email]", err);
        return { success: false };
    }
}

/* ─── Email Functions ──────────────────────────────────── */

export async function sendWelcomeEmail(to: string, name: string) {
    return send({
        to,
        subject: `مرحباً بك في ${SITE_NAME} 👋`,
        html: wushaTemplate(`
            ${heading(`مرحباً ${name} 👋`)}
            ${paragraph(`شكراً لانضمامك إلى <strong style="color:#ceae7f;">${SITE_NAME}</strong>. أنت الآن جزء من مجتمعنا.`)}
            ${paragraph("يمكنك تصفح المتجر، اكتشاف التصاميم، وتصميم قطعك بالذكاء الاصطناعي.")}
            ${ctaButton("استكشف المتجر", `${BASE_URL}/store`)}
        `),
    });
}

export async function sendApplicationAcceptedEmail(to: string, name: string, tempPassword?: string) {
    const passwordNote = tempPassword
        ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:rgba(206,174,127,0.08);border:1px solid rgba(206,174,127,0.15);border-radius:12px;padding:16px 20px;">
              <tr><td>
                ${paragraph(`تم إنشاء حسابك. كلمة المرور المؤقتة:`)}
                <p style="margin:0;color:#ceae7f;font-size:18px;font-weight:700;font-family:monospace;direction:ltr;text-align:center;">${tempPassword}</p>
                <p style="margin:8px 0 0;color:rgba(240,235,227,0.4);font-size:12px;">ننصحك بتغييرها فور تسجيل الدخول.</p>
              </td></tr>
            </table>`
        : "";

    return send({
        to,
        subject: `تم قبول طلبك — أنت الآن وشّاي 🎨`,
        html: wushaTemplate(`
            ${heading(`مبروك ${name}! 🎨`)}
            ${paragraph("تم قبول طلب انضمامك كفنان وشّاي. يمكنك الآن الدخول إلى الاستوديو ورفع أعمالك وبيعها.")}
            ${passwordNote}
            ${ctaButton("ادخل إلى الاستوديو", `${BASE_URL}/studio`)}
        `),
    });
}

export async function sendApplicationRejectedEmail(to: string, name: string) {
    return send({
        to,
        subject: `بخصوص طلب الانضمام إلى ${SITE_NAME}`,
        html: wushaTemplate(`
            ${heading(`أهلاً ${name}،`)}
            ${paragraph("شكراً لاهتمامك بالانضمام كفنان. للأسف لم نتمكن من قبول طلبك هذه المرة.")}
            ${paragraph("يمكنك إعادة التقديم لاحقاً بعد تطوير معرض أعمالك. نتطلع لرؤيتك مجدداً.")}
            ${ctaButton("تصفح المعرض", `${BASE_URL}/gallery`)}
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
    items?: OrderEmailItem[]
) {
    const itemsHtml = items && items.length > 0 ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">
          <tr>
            <td style="color:rgba(240,235,227,0.35);font-size:11px;padding:6px 0 8px;border-bottom:1px solid rgba(206,174,127,0.12);">المنتج</td>
            <td style="color:rgba(240,235,227,0.35);font-size:11px;padding:6px 0 8px;border-bottom:1px solid rgba(206,174,127,0.12);text-align:center;" width="40">الكمية</td>
            <td style="color:rgba(240,235,227,0.35);font-size:11px;padding:6px 0 8px;border-bottom:1px solid rgba(206,174,127,0.12);text-align:left;" dir="ltr" width="100">السعر</td>
          </tr>
          ${items.map(item => `<tr>
            <td style="color:#f0ebe3;font-size:13px;padding:9px 0;border-bottom:1px solid rgba(240,235,227,0.04);">
              ${item.title}${item.size ? ` <span style="color:#ceae7f;font-size:11px;">(${item.size})</span>` : ""}
            </td>
            <td style="color:rgba(240,235,227,0.5);font-size:13px;padding:9px 0;border-bottom:1px solid rgba(240,235,227,0.04);text-align:center;">${item.quantity}</td>
            <td style="color:#ceae7f;font-size:13px;font-weight:600;padding:9px 0;border-bottom:1px solid rgba(240,235,227,0.04);text-align:left;" dir="ltr">${(item.unit_price * item.quantity).toLocaleString()} ر.س</td>
          </tr>`).join("")}
        </table>` : "";

    return send({
        to,
        subject: `تم استلام طلبك #${orderNumber} ✅`,
        html: wushaTemplate(`
            ${heading(`شكراً لطلبك، ${name} ✅`)}
            ${paragraph("تم استلام طلبك بنجاح. فيما يلي تفاصيل طلبك:")}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.05);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${itemsHtml}
                ${infoBlock("رقم الطلب", `#${orderNumber}`)}
                ${infoBlock("الإجمالي", `<strong style="color:#ceae7f;font-size:17px;">${total.toLocaleString()} ر.س</strong>`)}
              </td></tr>
            </table>

            ${ctaButton("تتبع طلبك", `${BASE_URL}/account/orders`)}
        `),
    });
}

export async function sendAdminOrderNotificationEmail(
    orderNumber: string,
    total: number,
    type: "new_order" | "payment_received",
    adminEmailOverride?: string
) {
    const adminEmail = adminEmailOverride || process.env.ADMIN_EMAIL;
    if (!adminEmail?.trim()) {
        return { success: false };
    }

    const isNew = type === "new_order";
    const title = isNew ? "طلب جديد 🛒" : "تم استلام الدفع 💳";
    const desc = isNew
        ? "تم إنشاء طلب جديد في المتجر."
        : "تم تأكيد الدفع لطلب عبر Stripe.";
    const subject = isNew
        ? `طلب جديد #${orderNumber} — ${total.toLocaleString()} ر.س`
        : `تم استلام الدفع #${orderNumber} — ${total.toLocaleString()} ر.س`;

    return send({
        to: adminEmail,
        subject: `[${SITE_NAME}] ${subject}`,
        html: wushaTemplate(`
            ${heading(title)}
            ${paragraph(desc)}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.06);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${infoBlock("رقم الطلب", `#${orderNumber}`)}
                ${infoBlock("الإجمالي", `${total.toLocaleString()} ر.س`)}
              </td></tr>
            </table>

            ${ctaButton("عرض الطلبات", `${BASE_URL}/dashboard/orders`)}
        `),
    });
}

export async function sendAdminApplicationNotificationEmail(
    fullName: string,
    email: string,
    artStyle: string
) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail?.trim()) return { success: false };

    return send({
        to: adminEmail,
        subject: `[${SITE_NAME}] طلب انضمام جديد — ${fullName}`,
        html: wushaTemplate(`
            ${heading("طلب انضمام جديد 📬")}
            ${paragraph("تم تقديم طلب انضمام كفنان وشّاي.")}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(206,174,127,0.06);border:1px solid rgba(206,174,127,0.12);border-radius:12px;padding:20px 24px;">
              <tr><td>
                ${infoBlock("الاسم", fullName)}
                ${infoBlock("البريد", email)}
                ${infoBlock("الأسلوب الفني", artStyle)}
              </td></tr>
            </table>

            ${ctaButton("مراجعة الطلبات", `${BASE_URL}/dashboard/applications`)}
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
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail?.trim()) return { success: false };

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
                ${infoBlock("العميل", customerName || '—')}
                ${infoBlock("البريد", customerEmail || '—')}
                ${infoBlock("الجوال", customerPhone || '—')}
                <div style="height:12px;"></div>
                ${infoBlock("القطعة المحددة", garmentName)}
                ${infoBlock("اللون", colorName)}
                ${infoBlock("طريقة التصميم", methodAr)}
              </td></tr>
            </table>

            ${ctaButton("عرض تفاصيل الطلب", `${BASE_URL}/dashboard/design-orders?id=${orderId}`)}
        `),
    });
}
