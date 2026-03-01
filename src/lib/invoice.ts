// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — توليد الفاتورة الإلكترونية
//  إنشاء HTML للطباعة أو حفظ PDF
// ═══════════════════════════════════════════════════════════

export interface InvoiceOrderItem {
    id: string;
    quantity: number;
    size?: string | null;
    unit_price: number;
    total_price: number;
    custom_title?: string | null;
    custom_garment?: string | null;
    product?: { title?: string; image_url?: string } | null;
}

export interface InvoiceOrder {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    subtotal: number;
    shipping_cost: number;
    tax: number;
    total: number;
    currency: string;
    created_at: string;
    shipping_address?: {
        name?: string;
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
        phone?: string;
    } | null;
    buyer?: { display_name?: string; username?: string } | null;
    order_items?: InvoiceOrderItem[];
}

const statusLabels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "جاري المعالجة",
    shipped: "تم الشحن",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
    refunded: "مسترجع",
};

const paymentLabels: Record<string, string> = {
    pending: "معلق",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "مسترجع",
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getItemTitle(item: InvoiceOrderItem): string {
    if (item.custom_title) return item.custom_title;
    if (item.product?.title) return item.product.title;
    return "منتج";
}

export function generateInvoiceHTML(order: InvoiceOrder): string {
    const items = order.order_items || [];
    const addr = order.shipping_address;
    const buyerName = order.buyer?.display_name || addr?.name || "—";
    const buyerUsername = order.buyer?.username ? `@${order.buyer.username}` : "";

    const addressLines: string[] = [];
    if (addr?.line1) addressLines.push(addr.line1);
    if (addr?.line2) addressLines.push(addr.line2);
    const cityParts: string[] = [];
    if (addr?.city) cityParts.push(addr.city);
    if (addr?.state) cityParts.push(addr.state);
    if (addr?.postal_code) cityParts.push(addr.postal_code);
    if (cityParts.length) addressLines.push(cityParts.join("، "));
    if (addr?.country) addressLines.push(addr.country);
    if (addr?.phone) addressLines.push(`هاتف: ${addr.phone}`);

    const addrHtml = addressLines.length
        ? addressLines.map((l) => `<p class="addr-line">${l}</p>`).join("")
        : '<p class="addr-line">—</p>';

    const itemsRows = items
        .map(
            (item) => `
        <tr>
            <td>${getItemTitle(item)}${item.size ? ` — مقاس ${item.size}` : ""}</td>
            <td class="num">${item.quantity}</td>
            <td class="num">${Number(item.unit_price).toLocaleString("ar-SA")} ر.س</td>
            <td class="num">${Number(item.total_price).toLocaleString("ar-SA")} ر.س</td>
        </tr>`
        )
        .join("");

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>فاتورة #${order.order_number} — وشّى</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "IBM Plex Sans Arabic", Tahoma, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a1a;
            background: #fff;
            padding: 24px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ceae7f;
        }
        .logo { font-size: 24px; font-weight: 700; color: #5A3E2B; }
        .invoice-title { font-size: 20px; font-weight: 700; color: #1a1a1a; }
        .invoice-number { font-size: 18px; color: #ceae7f; font-weight: 600; margin-top: 4px; }
        .meta { margin-top: 24px; }
        .meta p { margin-bottom: 6px; color: #555; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
        .addr-line { margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 10px 12px; text-align: right; border-bottom: 1px solid #eee; }
        th { background: #f8f6f0; font-weight: 600; color: #5A3E2B; font-size: 12px; }
        .num { font-family: "IBM Plex Sans Arabic", monospace; }
        .totals { margin-top: 24px; max-width: 320px; margin-right: auto; margin-left: 0; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .totals-row.total { font-size: 18px; font-weight: 700; color: #5A3E2B; border-bottom: none; margin-top: 8px; padding-top: 12px; border-top: 2px solid #ceae7f; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-left: 8px; }
        .badge-status { background: #e8f4f0; color: #2a7a5a; }
        .badge-payment { background: #fef3e2; color: #b45309; }
        .badge-payment.paid { background: #e8f4f0; color: #2a7a5a; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center; }
        @media print { body { padding: 16px; } .no-print { display: none !important; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">وشّى</div>
            <div class="invoice-title">فاتورة إلكترونية</div>
            <div class="invoice-number">#${order.order_number}</div>
            <div class="meta" style="margin-top: 12px;">
                <p>التاريخ: ${formatDate(order.created_at)}</p>
                <p>
                    الحالة: <span class="badge badge-status">${statusLabels[order.status] || order.status}</span>
                    الدفع: <span class="badge badge-payment ${order.payment_status === "paid" ? "paid" : ""}">${paymentLabels[order.payment_status] || order.payment_status}</span>
                </p>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">المشتري</div>
        <p><strong>${buyerName}</strong> ${buyerUsername ? `(${buyerUsername})` : ""}</p>
    </div>

    <div class="section">
        <div class="section-title">عنوان التوصيل</div>
        <div>${addrHtml}</div>
    </div>

    <div class="section">
        <div class="section-title">تفاصيل الطلب</div>
        <table>
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th class="num">الكمية</th>
                    <th class="num">السعر</th>
                    <th class="num">الإجمالي</th>
                </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
        </table>
    </div>

    <div class="totals">
        <div class="totals-row"><span>المجموع الفرعي</span><span>${Number(order.subtotal).toLocaleString("ar-SA")} ر.س</span></div>
        <div class="totals-row"><span>الشحن</span><span>${Number(order.shipping_cost || 0).toLocaleString("ar-SA")} ر.س</span></div>
        <div class="totals-row"><span>الضريبة</span><span>${Number(order.tax || 0).toLocaleString("ar-SA")} ر.س</span></div>
        <div class="totals-row total"><span>الإجمالي</span><span>${Number(order.total).toLocaleString("ar-SA")} ر.س</span></div>
    </div>

    <div class="footer no-print" style="margin-top: 48px;">
        <p>وشّى — منصة فنية رقمية عربية</p>
        <p style="margin-top: 8px;">يمكنك استخدام "طباعة" ثم "حفظ كـ PDF" من المتصفح</p>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;
}

export function openInvoicePrint(order: InvoiceOrder) {
    const html = generateInvoiceHTML(order);
    const win = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
    if (!win) {
        alert("يرجى السماح بالنوافذ المنبثقة لفتح الفاتورة");
        return;
    }
    win.document.write(html);
    win.document.close();
}
