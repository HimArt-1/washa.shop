export const WASHA_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_BANK_TRANSFER_WHATSAPP_NUMBER?.replace(/\D/g, "") || "966532235005";

export type BankTransferWhatsAppDetails = {
    orderNumber: string;
    total: number;
    customerName: string;
    customerPhone?: string | null;
    items: Array<{
        title: string;
        quantity: number;
        size?: string | null;
    }>;
};

export function buildBankTransferWhatsAppUrl(details: BankTransferWhatsAppDetails) {
    const itemLines = details.items.slice(0, 8).map((item) => {
        const size = item.size ? ` — المقاس: ${item.size}` : "";
        return `- ${item.title} × ${item.quantity}${size}`;
    });
    const remainingCount = Math.max(0, details.items.length - itemLines.length);
    if (remainingCount > 0) itemLines.push(`- و${remainingCount} منتج إضافي`);

    const message = [
        "السلام عليكم فريق وشّى،",
        "أرغب في تأكيد طلب التحويل البنكي التالي:",
        "",
        `رقم الطلب: ${details.orderNumber}`,
        `اسم العميل: ${details.customerName}`,
        ...(details.customerPhone ? [`رقم الجوال: ${details.customerPhone}`] : []),
        `إجمالي الطلب: ${details.total.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
        "",
        "تفاصيل الطلب:",
        ...itemLines,
        "",
        "في حال إتمام التحويل، سأرفق إيصال التحويل في هذه المحادثة لتأكيد الدفعة.",
        "نرجو تأكيد استلام التحويل وربطه بالطلب. شكرًا لكم.",
    ].join("\n");

    return `https://wa.me/${WASHA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
