// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — توليد ملصق الشحن (Waybill/Shipping Label)
//  نظام إنشاء بوالص الشحن للعمليات اللوجستية
// ═══════════════════════════════════════════════════════════

import { InvoiceOrder } from "./invoice";

export interface LabelConfig {
    format: "standard" | "thermal"; // standard = A4, thermal = 4x6
    showItems: boolean;
    companyName: string;
    companyPhone: string;
    fontFamily: string;
}

export const defaultLabelConfig: LabelConfig = {
    format: "thermal",
    showItems: true,
    companyName: "وشّى | WASHA",
    companyPhone: "+966 500 000 000", // Placeholder or dynamic
    fontFamily: "IBM Plex Sans Arabic",
};

export function generateLabelHTML(order: InvoiceOrder, config: LabelConfig = defaultLabelConfig): string {
    const addr = order.shipping_address;
    const buyerName = order.buyer?.display_name || addr?.name || "عميل غير معروف";
    const items = order.order_items || [];
    
    const addressLines: string[] = [];
    if (addr?.city) addressLines.push(addr.city);
    if (addr?.state) addressLines.push(addr.state);
    if (addr?.line1) addressLines.push(addr.line1);
    if (addr?.line2) addressLines.push(addr.line2);
    if (addr?.postal_code) addressLines.push(`الرمز البريدي: ${addr.postal_code}`);

    const isThermal = config.format === "thermal";
    const fontImport = config.fontFamily === "Cairo"
        ? "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
        : config.fontFamily === "Tajawal"
            ? "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
            : "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap";

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>بوليصة #${order.order_number}</title>
    <link href="${fontImport}" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: "${config.fontFamily}", Tahoma, sans-serif; 
            background: #fff;
            color: #000;
        }
        
        .label-container {
            width: ${isThermal ? "100mm" : "210mm"};
            min-height: ${isThermal ? "150mm" : "auto"};
            padding: ${isThermal ? "5mm" : "15mm"};
            margin: 0 auto;
            border: 1px solid #000;
            position: relative;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5mm;
            margin-bottom: 5mm;
        }

        .logo-section h1 { font-size: ${isThermal ? "18pt" : "24pt"}; font-weight: 800; }
        .order-id { font-size: ${isThermal ? "14pt" : "18pt"}; font-weight: 700; text-align: left; }

        .address-section {
            display: grid;
            grid-template-columns: 1fr;
            gap: 5mm;
            margin-bottom: 8mm;
        }

        .box {
            border: 1.5px solid #000;
            padding: 4mm;
        }

        .box-title {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2mm;
            border-bottom: 1px solid #eee;
            padding-bottom: 1mm;
        }

        .name { font-size: ${isThermal ? "14pt" : "16pt"}; font-weight: 700; margin-bottom: 2mm; }
        .phone { font-size: 13pt; font-weight: 700; font-family: Tahoma, sans-serif; direction: ltr; margin-bottom: 2mm; display: block; }
        .address-text { font-size: 11pt; line-height: 1.4; color: #333; }

        .barcode-placeholder {
            width: 100%;
            height: ${isThermal ? "25mm" : "30mm"};
            border: 1px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 5mm 0;
            font-size: 8pt;
            color: #999;
        }

        .items-summary {
            font-size: 10pt;
            border-top: 1px solid #000;
            padding-top: 3mm;
        }

        .item-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }

        .footer {
            position: absolute;
            bottom: 5mm;
            left: 5mm;
            right: 5mm;
            text-align: center;
            font-size: 8pt;
            color: #666;
        }

        @media print {
            body { padding: 0; }
            .label-container { border: none; width: 100%; padding: 0; }
            @page { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="label-container">
        <div class="header">
            <div class="logo-section">
                <h1>${config.companyName}</h1>
                <p style="font-size: 8pt;">${config.companyPhone}</p>
            </div>
            <div class="order-id">
                <div style="font-size: 8pt; color: #666;">رقم الطلب</div>
                #${order.order_number}
            </div>
        </div>

        <div class="address-section">
            <div class="box">
                <div class="box-title">المستلم (SHIP TO)</div>
                <div class="name">${buyerName}</div>
                <div class="phone">${addr?.phone || "—"}</div>
                <div class="address-text">
                    ${addressLines.join("<br/>")}
                </div>
            </div>
            
            <div class="box">
                <div class="box-title">المرسل (FROM)</div>
                <div class="name">${config.companyName}</div>
                <div class="phone">${config.companyPhone}</div>
                <div class="address-text">المملكة العربية السعودية</div>
            </div>
        </div>

        <div class="barcode-placeholder">
            [ Barcode Strategy: Order ID Placeholder ]
            <br/>
            ${order.id}
        </div>

        ${config.showItems ? `
            <div class="items-summary">
                <div class="box-title">محتويات الشحنة</div>
                ${items.map(item => `
                    <div class="item-row">
                        <span>${item.product?.title || item.custom_title || "منتج"} ${item.size ? `(${item.size})` : ""}</span>
                        <span style="font-weight: 700;">x${item.quantity}</span>
                    </div>
                `).join("")}
            </div>
        ` : ""}

        <div class="footer">
            Printed via WASHA Fulfillment System | ${new Date().toLocaleString("ar-SA")}
        </div>
    </div>
</body>
</html>
    `;
    return html;
}

/**
 * يفتح نافذة الطباعة لمحاكاة البوليصة
 */
export function openLabelPrint(order: InvoiceOrder, config: LabelConfig = defaultLabelConfig) {
    const html = generateLabelHTML(order, config);
    const width = config.format === "thermal" ? 450 : 900;
    const height = config.format === "thermal" ? 650 : 800;
    
    const win = window.open("", "_blank", `width=${width},height=${height},scrollbars=yes`);
    if (!win) return false;

    setTimeout(() => {
        win.document.open();
        win.document.write(html);
        win.document.close();

        win.setTimeout(() => {
            win.print();
        }, 800);
    }, 50);

    return true;
}
