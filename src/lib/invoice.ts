// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — توليد الفاتورة الإلكترونية المتقدمة
//  محرك القوالب وإنشاء HTML للطباعة
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
    discount_amount?: number;
    coupon_code?: string | null;
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

export interface InvoiceConfig {
    template: "classic" | "modern" | "minimal";
    companyName: string;
    tagline: string;
    vatNumber: string;
    primaryColor: string;
    accentColor: string;
    showLogo: boolean;
    fontFamily: string;
    notes: string;
    showWatermark: boolean;
    showTax: boolean;
    taxRate: number;
    hiddenColumns: {
        quantity: boolean;
        unitPrice: boolean;
        subtotal: boolean;
    };
}

export const defaultInvoiceConfig: InvoiceConfig = {
    template: "classic",
    companyName: "وشّى | WASHA",
    tagline: "فنٌ يُرتدَى",
    vatNumber: "",
    primaryColor: "#5A3E2B",
    accentColor: "#ceae7f",
    showLogo: true,
    fontFamily: "IBM Plex Sans Arabic",
    notes: "نشكركم على تسوقكم من وشّى. نأمل أن تكون قد حظيتم بتجربة مميزة.",
    showWatermark: true,
    showTax: false,
    taxRate: 15,
    hiddenColumns: {
        quantity: false,
        unitPrice: false,
        subtotal: false,
    },
};

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
        month: "short",
        day: "numeric",
    });
}

function getItemTitle(item: InvoiceOrderItem): string {
    if (item.custom_title) return item.custom_title;
    if (item.product?.title) return item.product.title;
    return "منتج";
}

export function generateInvoiceHTML(order: InvoiceOrder, config: InvoiceConfig = defaultInvoiceConfig): string {
    const items = order.order_items || [];
    const addr = order.shipping_address;
    const buyerName = order.buyer?.display_name || addr?.name || "عميل غير معروف";
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
    if (addr?.phone) addressLines.push(addr.phone);

    const addrHtml = addressLines.length
        ? addressLines.map((l) => `<p>${l}</p>`).join("")
        : '<p>—</p>';

    const showQty = !config.hiddenColumns?.quantity;
    const showPrice = !config.hiddenColumns?.unitPrice;
    const showSubtotal = !config.hiddenColumns?.subtotal;

    const itemsRows = items
        .map(
            (item) => `
        <tr>
            <td class="col-product">
                <div class="product-title">${getItemTitle(item)}</div>
                ${item.size ? `<div class="product-meta">مقاس: ${item.size}</div>` : ""}
            </td>
            ${showQty ? `<td class="col-qty num">${item.quantity}</td>` : ""}
            ${showPrice ? `<td class="col-price num">${Number(item.unit_price).toLocaleString("ar-SA")} ر.س</td>` : ""}
            ${showSubtotal ? `<td class="col-total num">${Number(item.total_price).toLocaleString("ar-SA")} ر.س</td>` : ""}
        </tr>`
        )
        .join("");

    const fontImport = config.fontFamily === "Cairo"
        ? "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
        : config.fontFamily === "Tajawal"
            ? "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
            : "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap";

    const watermarkHtml = config.showWatermark ? `<div class="watermark">WASHA</div>` : "";
    const logoHtml = config.showLogo ? `<img src="/logo.png" class="logo-img" alt="WASHA Logo"/>` : `<div class="logo-text">${config.companyName}</div>`;
    const vatHtml = config.vatNumber ? `<p class="info-label">الرقم الضريبي:</p><p>${config.vatNumber}</p>` : "";
    const invoiceTitle = config.showTax ? "فاتورة ضريبية" : "فاتورة";

    // حساب الضريبة
    const taxAmount = config.showTax
        ? Math.round((order.subtotal * (config.taxRate / 100)) * 100) / 100
        : 0;
    const discountAmount = order.discount_amount || 0;
    const finalTotal = config.showTax
        ? order.subtotal + (order.shipping_cost || 0) + taxAmount - discountAmount
        : order.subtotal + (order.shipping_cost || 0) - discountAmount;

    // ─── STYLES PER TEMPLATE ─────────────────────────────────

    let customCss = "";
    if (config.template === "classic") {
        customCss = `
            .invoice-wrapper { border: 1px solid #ddd; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${config.accentColor}; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-img { max-height: 80px; }
            .logo-text { font-size: 28px; font-weight: 700; color: ${config.primaryColor}; }
            .document-title { font-size: 32px; font-weight: 700; color: ${config.primaryColor}; margin-bottom: 5px; }
            .document-id { font-size: 16px; color: #777; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .info-box { flex: 1; }
            .info-box:last-child { text-align: left; }
            .info-label { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 2px solid #ceae7f; border-top: 1px solid #eee; padding: 12px; text-align: right; color: ${config.primaryColor}; font-weight: 600; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .totals-container { display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; }
            .totals-table th, .totals-table td { padding: 8px 12px; border: none; }
            .total-row { border-top: 2px solid ${config.accentColor}; font-weight: 700; font-size: 18px; color: ${config.primaryColor}; }
            .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; text-align: center; color: #777; font-size: 13px; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 140px; color: rgba(0,0,0,0.03); font-weight: 800; z-index: -1; user-select: none; }
        `;
    } else if (config.template === "modern") {
        customCss = `
            body { background: #f9fafb; padding: 40px; }
            .invoice-wrapper { background: #fff; padding: 0; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; }
            .header { background: ${config.primaryColor}; color: #fff; padding: 40px; display: flex; justify-content: space-between; align-items: center; }
            .logo-img { max-height: 60px; filter: brightness(0) invert(1); } /* Force white logo if it's dark normally, ideally user handles this, but we try */
            .logo-text { font-size: 28px; font-weight: 700; color: #fff; }
            .document-title { font-size: 32px; font-weight: 700; letter-spacing: 1px; }
            .tagline { color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 8px; }
            .meta-bar { background: ${config.accentColor}; color: #fff; padding: 15px 40px; display: flex; justify-content: space-between; font-weight: 600; }
            .content-body { padding: 40px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
            .info-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; }
            th { background: #f3f4f6; color: ${config.primaryColor}; font-weight: 600; padding: 15px; text-align: right; border-bottom: 2px solid #e5e7eb; }
            th:first-child { border-radius: 0 8px 8px 0; } th:last-child { border-radius: 8px 0 0 8px; }
            td { padding: 15px; border-bottom: 1px solid #f3f4f6; }
            .totals-container { background: #f9fafb; padding: 20px; border-radius: 8px; margin-left: left; width: 350px; float: left; }
            .totals-table { width: 100%; }
            .totals-table td { padding: 10px; border: none; }
            .totals-table td:last-child { text-align: left; }
            .total-row td { border-top: 2px dashed #d1d5db; font-weight: 700; font-size: 20px; color: ${config.primaryColor}; padding-top: 15px; margin-top: 5px; }
            .clearfix::after { content: ""; display: table; clear: both; }
            .footer { padding: 20px 40px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
            .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 180px; color: rgba(0,0,0,0.02); font-weight: 900; z-index: 0; user-select: none; }
        `;
    } else {
        // minimal
        customCss = `
            .invoice-wrapper { border: none; padding: 20px; max-width: 700px; margin: 0 auto; }
            .header { display: flex; flex-direction: column; align-items: center; margin-bottom: 50px; text-align: center; }
            .logo-img { max-height: 80px; margin-bottom: 15px; }
            .logo-text { font-size: 24px; font-weight: 700; margin-bottom: 10px; }
            .document-title { font-size: 14px; font-weight: 600; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
            .document-id { font-size: 24px; font-weight: 300; }
            .info-grid { display: flex; justify-content: space-between; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 20px 0; margin-bottom: 40px; }
            .info-label { font-size: 10px; color: #999; text-transform: uppercase; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 1px solid #000; padding: 10px 5px; text-align: right; font-weight: 600; font-size: 12px; }
            td { padding: 15px 5px; border-bottom: 1px solid #eee; }
            .totals-container { margin-top: 30px; padding-top: 20px; border-top: 1px solid #000; display: flex; justify-content: flex-end; }
            .totals-table { width: 50%; }
            .totals-table td { padding: 8px 5px; }
            .totals-table td:last-child { text-align: left; }
            .total-row td { font-weight: 700; font-size: 16px; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; }
            .watermark { display: none; }
        `;
    }

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>فاتورة #${order.order_number}</title>
    <link href="${fontImport}" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "${config.fontFamily}", Tahoma, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a1a;
            background: #fff;
            padding: 24px;
            max-width: 900px;
            margin: 0 auto;
        }
        .num { font-family: Tahoma, monospace; direction: ltr; display: inline-block; }
        .product-title { font-weight: 600; }
        .product-meta { font-size: 12px; color: #777; margin-top: 2px; }
        .notes-box { margin-top: 40px; padding: 15px; background: #f9f9f9; border-right: 3px solid ${config.accentColor}; font-size: 13px; color: #555; }
        
        ${customCss}
        
        @media print { 
            body { padding: 0; background: #fff !important; } 
            .invoice-wrapper { box-shadow: none !important; border: none !important; padding: 0 !important; }
            /* Force background colors to print */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
    </style>
</head>
<body>
    <div class="invoice-wrapper relative">
        ${watermarkHtml}
        
        ${config.template === "modern" ? `
            <div class="header">
                <div>
                    ${logoHtml}
                    <div class="tagline">${config.tagline}</div>
                </div>
                <div style="text-align: left;">
                    <div class="document-title">${invoiceTitle}</div>
                    <div class="tagline">${invoiceTitle} #${order.order_number}</div>
                </div>
            </div>
            <div class="meta-bar">
                <div>التاريخ: ${formatDate(order.created_at)}</div>
                <div>الحالة: ${paymentLabels[order.payment_status] || "مجدولة"}</div>
            </div>
            <div class="content-body">
        ` : config.template === "minimal" ? `
            <div class="header">
                ${logoHtml}
                <div class="document-title">${invoiceTitle}</div>
                <div class="document-id">#${order.order_number}</div>
            </div>
        ` : `
            <div class="header">
                <div>
                    ${logoHtml}
                    <div style="font-size: 12px; color: #777; margin-top: 8px;">${config.companyName}<br/>${config.tagline}</div>
                </div>
                <div style="text-align: left;">
                    <div class="document-title">${invoiceTitle} إلكترونية</div>
                    <div class="document-id">${invoiceTitle} #${order.order_number}</div>
                </div>
            </div>
        `}

        ${config.template !== "modern" ? `
            <div class="info-grid">
                <div class="info-box">
                    <p class="info-label">معلومات العميل:</p>
                    <p><strong>${buyerName}</strong></p>
                    ${buyerUsername ? `<p class="num" style="direction:ltr; text-align:right;">${buyerUsername}</p>` : ""}
                    ${addrHtml}
                </div>
                <div class="info-box">
                    <p class="info-label">تفاصيل الفاتورة:</p>
                    <p>تاريخ الإصدار: <span class="num">${formatDate(order.created_at)}</span></p>
                    <p>حالة الدفع: <strong>${paymentLabels[order.payment_status] || order.payment_status}</strong></p>
                    <p>طريقة الدفع: الإفتراضية</p>
                    ${vatHtml}
                </div>
            </div>
        ` : `
            <div class="info-grid">
                <div>
                    <h3 class="info-label">إصدار إلى</h3>
                    <p><strong>${buyerName}</strong></p>
                    ${buyerUsername ? `<p dir="ltr" style="text-align:right">${buyerUsername}</p>` : ""}
                    ${addrHtml}
                </div>
                <div>
                    <h3 class="info-label">معلومات الشركة</h3>
                    <p><strong>${config.companyName}</strong></p>
                    ${vatHtml}
                </div>
            </div>
        `}

        <table>
            <thead>
                <tr>
                    <th style="min-width: 40%">البيان</th>
                    ${showQty ? `<th class="col-qty text-center">الكمية</th>` : ""}
                    ${showPrice ? `<th class="col-price text-center">سعر الوحدة</th>` : ""}
                    ${showSubtotal ? `<th class="col-total" style="text-align: left;">الإجمالي</th>` : ""}
                </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
        </table>

        <div class="clearfix">
            <div class="totals-container ${config.template === "modern" ? "float-left" : ""}" style="${config.template === "modern" ? "float: left;" : ""}">
                <table class="totals-table">
                    <tr>
                        <td>المجموع الفرعي</td>
                        <td class="num">${Number(order.subtotal).toLocaleString("ar-SA")} ر.س</td>
                    </tr>
                    <tr>
                        <td>رسوم الشحن</td>
                        <td class="num">${Number(order.shipping_cost || 0).toLocaleString("ar-SA")} ر.س</td>
                    </tr>
                    ${config.showTax ? `<tr>
                        <td>ضريبة القيمة المضافة (${config.taxRate}%)</td>
                        <td class="num">${taxAmount.toLocaleString("ar-SA")} ر.س</td>
                    </tr>` : ""}
                    ${discountAmount > 0 ? `<tr style="color: #16a34a;">
                        <td>الخصم ${order.coupon_code ? `<span style="font-size:11px; background:#f0fdf4; padding:2px 6px; border-radius:4px; margin-right:4px;">${order.coupon_code}</span>` : ""}</td>
                        <td class="num" style="color: #16a34a;">- ${discountAmount.toLocaleString("ar-SA")} ر.س</td>
                    </tr>` : ""}
                    <tr class="total-row">
                        <td>الإجمالي الكلي</td>
                        <td class="num">${finalTotal.toLocaleString("ar-SA")} ر.س</td>
                    </tr>
                </table>
            </div>
        </div>

        ${config.notes ? `<div class="notes-box"><strong>ملاحظات:</strong><br/>${config.notes.replace(/\n/g, '<br/>')}</div>` : ""}

        ${config.template === "modern" ? `</div>` : ""}

        <div class="footer">
            تم إصدار هذه الفاتورة إلكترونياً ولا تتطلب توقيعاً.
            <br/>${config.companyName}
        </div>
    </div>
</body>
</html>`;

    return html;
}

export function openInvoicePrint(order: InvoiceOrder, config?: InvoiceConfig) {
    const html = generateInvoiceHTML(order, config);
    const win = window.open("", "_blank", "width=900,height=800,scrollbars=yes");
    if (!win) {
        console.warn("[openInvoicePrint] Popup was blocked by the browser.");
        return false;
    }
    // Set a tiny delay to ensure the window has fully opened before writing (safari bug workaround)
    setTimeout(() => {
        win.document.open();
        win.document.write(html);
        win.document.close();

        // Let images and fonts load before printing
        win.setTimeout(() => {
            win.print();
        }, 1000);
    }, 50);

    return true;
}
