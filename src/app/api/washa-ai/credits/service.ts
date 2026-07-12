// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — خدمة شراء رصيد WASHA AI
//  تنسّق بين إعدادات الحزم، طلبات الشراء، بوابة Paylink،
//  وشحن المحفظة (idempotent). مشتركة بين مساري checkout/verify.
// ═══════════════════════════════════════════════════════════

import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    createPaylinkInvoice,
    getPaylinkInvoice,
    PAYLINK_ENABLED,
    PAYLINK_CREATION_ENABLED,
} from "@/lib/paylink";
import {
    getPaylinkInvoiceAmount,
    getPaylinkInvoiceOrderNumber,
    getPaylinkInvoiceTransactionNo,
    isPaylinkInvoicePaid,
    moneyMatches,
} from "@/lib/paylink-security";
import { getWashaAiSettings } from "@/app/actions/settings";
import type { WashaAiCreditPackage } from "@/types/database";

const PURCHASE_ROLES = new Set(["subscriber", "wushsha"]);

export type CreditCheckoutProvider = "paylink" | "tap";

export function getCreditCheckoutCapability() {
    const provider = process.env.WASHA_AI_CREDIT_CHECKOUT_PROVIDER === "tap" ? "tap" : "paylink";
    const enabled = process.env.WASHA_AI_CREDIT_CHECKOUT_ENABLED === "true"
        && (provider === "paylink" ? PAYLINK_ENABLED && PAYLINK_CREATION_ENABLED : false);
    return { provider: provider as CreditCheckoutProvider, enabled };
}

/** يتحقق من مفاتيح التحكّم: نظام الرصيد مفعّل + الدور مسموح له بالشراء. */
async function purchaseAllowedByControls(role: string | null | undefined): Promise<boolean> {
    if (!role || !PURCHASE_ROLES.has(role)) return false;
    try {
        const settings = await getWashaAiSettings();
        const controls = settings.controls;
        if (!controls?.credits_enabled) return false;
        if (role === "subscriber") return controls.purchase.subscriber;
        if (role === "wushsha") return controls.purchase.wushsha;
        return false;
    } catch {
        // فشل قراءة الإعدادات — نسمح للأدوار الأساسية (fail-open للشراء).
        return true;
    }
}

export type CreditPurchaseProfile = {
    id: string;
    role: string | null;
    displayName: string | null;
    email: string | null;
    phone: string | null;
};

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; error: string };

function fail(status: number, error: string): ServiceResult<never> {
    return { ok: false, status, error };
}

type CreditOrderRecord = {
    order_number: string;
    profile_id: string;
    credits: number;
    amount: number | string;
    status: string;
    transaction_no: string | null;
};

/** يجلب profile المستخدم الحالي مع الدور وبيانات التواصل. */
export async function resolveCreditPurchaseProfile(clerkId: string): Promise<CreditPurchaseProfile | null> {
    const sb = getSupabaseAdminClient();
    const { data } = await sb
        .from("profiles")
        .select("id, role, display_name, email, phone")
        .eq("clerk_id", clerkId)
        .maybeSingle();

    if (!data) return null;
    return {
        id: data.id,
        role: data.role ?? null,
        displayName: data.display_name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
    };
}

async function resolvePackage(packageId: string): Promise<WashaAiCreditPackage | null> {
    const settings = await getWashaAiSettings();
    const pkg = (settings.credit_packages ?? []).find((item) => item.id === packageId);
    if (!pkg || pkg.active === false) return null;
    return pkg;
}

function generateOrderNumber() {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `WAI-${stamp}-${rand}`;
}

async function readWalletBalance(profileId: string) {
    const sb = getSupabaseAdminClient();
    const { data: wallet } = await sb
        .from("washa_ai_credit_wallet")
        .select("balance")
        .eq("profile_id", profileId)
        .maybeSingle();

    return typeof wallet?.balance === "number" ? wallet.balance : null;
}

async function confirmVerifiedCreditOrder(params: {
    order: CreditOrderRecord;
    transactionNo?: string | null;
    invoice?: unknown;
}): Promise<ServiceResult<VerifyResult>> {
    const sb = getSupabaseAdminClient();

    if (params.order.status === "paid") {
        return {
            ok: true,
            data: {
                credited: false,
                alreadyProcessed: true,
                credits: params.order.credits,
                balance: await readWalletBalance(params.order.profile_id),
            },
        };
    }

    const effectiveTransactionNo = (params.transactionNo || params.order.transaction_no || "").trim();
    if (!effectiveTransactionNo) {
        return fail(400, "رقم معاملة Paylink غير متاح");
    }

    let invoice = params.invoice;
    if (!invoice) {
        try {
            invoice = await getPaylinkInvoice(effectiveTransactionNo);
        } catch (error) {
            return fail(502, error instanceof Error ? error.message : "تعذّر التحقق من الفاتورة");
        }
    }

    const invoiceLike = invoice as Parameters<typeof isPaylinkInvoicePaid>[0];
    if (!isPaylinkInvoicePaid(invoiceLike)) {
        return fail(402, "لم يكتمل الدفع بعد");
    }

    const invoiceTransactionNo = getPaylinkInvoiceTransactionNo(invoiceLike);
    if (invoiceTransactionNo && invoiceTransactionNo !== effectiveTransactionNo) {
        return fail(409, "رقم معاملة Paylink لا يطابق الطلب");
    }

    const invoiceOrderNumber = getPaylinkInvoiceOrderNumber(invoiceLike);
    if (invoiceOrderNumber !== params.order.order_number) {
        return fail(409, "فاتورة Paylink لا تطابق رقم الطلب");
    }

    const invoiceAmount = getPaylinkInvoiceAmount(invoiceLike);
    if (invoiceAmount === null || !moneyMatches(params.order.amount, invoiceAmount)) {
        return fail(409, "مبلغ فاتورة Paylink لا يطابق قيمة الباقة");
    }

    // شحن المحفظة idempotent عبر (ref_type, ref_id).
    const { data: creditData, error: creditError } = await sb.rpc("credit_washa_ai_wallet", {
        p_profile_id: params.order.profile_id,
        p_amount: params.order.credits,
        p_entry_type: "purchase",
        p_reason: `شراء رصيد — ${params.order.credits} حصة`,
        p_ref_type: "washa_ai_credit_order",
        p_ref_id: params.order.order_number,
        p_metadata: { transaction_no: effectiveTransactionNo, amount: invoiceAmount },
    });

    if (creditError) {
        return fail(500, "تعذّر شحن الرصيد");
    }

    const payload = (creditData && typeof creditData === "object" ? creditData : {}) as Record<string, unknown>;
    const balance = typeof payload.balance === "number" ? payload.balance : null;
    const duplicate = payload.duplicate === true;

    await sb
        .from("washa_ai_credit_orders")
        .update({
            status: "paid",
            transaction_no: effectiveTransactionNo,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("order_number", params.order.order_number)
        .neq("status", "paid");

    return {
        ok: true,
        data: {
            credited: payload.credited === true,
            alreadyProcessed: duplicate,
            credits: params.order.credits,
            balance,
        },
    };
}

// ─── إنشاء طلب شراء + فاتورة Paylink ─────────────────────────
export type CheckoutResult = {
    orderNumber: string;
    url: string;
    mobileUrl: string | null;
    transactionNo: string;
    credits: number;
    amount: number;
};

export async function createCreditCheckout(params: {
    profile: CreditPurchaseProfile;
    packageId: string;
    clientMobile?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
}): Promise<ServiceResult<CheckoutResult>> {
    const checkoutCapability = getCreditCheckoutCapability();
    if (!checkoutCapability.enabled) {
        return fail(503, "بوابة الدفع غير مفعّلة حالياً");
    }

    if (!(await purchaseAllowedByControls(params.profile.role))) {
        return fail(403, "شراء الرصيد غير متاح لحسابك حالياً");
    }

    const pkg = await resolvePackage(params.packageId);
    if (!pkg) {
        return fail(404, "الباقة غير متاحة");
    }

    const amount = Math.round(pkg.price * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
        return fail(409, "سعر الباقة غير صالح");
    }

    const clientMobile = (params.clientMobile || params.profile.phone || "").trim();
    if (!clientMobile) {
        return fail(400, "رقم الجوال مطلوب لإتمام الدفع");
    }

    const sb = getSupabaseAdminClient();
    const orderNumber = generateOrderNumber();

    const { error: insertError } = await sb.from("washa_ai_credit_orders").insert({
        order_number: orderNumber,
        profile_id: params.profile.id,
        package_id: pkg.id,
        credits: pkg.credits,
        amount,
        status: "pending",
        metadata: { package_label: pkg.label },
    });

    if (insertError) {
        return fail(500, "تعذّر إنشاء طلب الشراء");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
    const callBackUrl = `${baseUrl}/washa-ai/credits/return?order=${encodeURIComponent(orderNumber)}&success=1`;
    const cancelUrl = `${baseUrl}/washa-ai/credits/return?order=${encodeURIComponent(orderNumber)}&canceled=1`;

    try {
        const invoice = await createPaylinkInvoice({
            orderNumber,
            amount,
            callBackUrl,
            cancelUrl,
            clientName: params.clientName || params.profile.displayName || "عميل وشّى",
            clientEmail: params.clientEmail || params.profile.email || undefined,
            clientMobile,
            products: [
                {
                    title: `${pkg.label} — ${pkg.credits} حصة توليد`,
                    price: amount,
                    qty: 1,
                    isDigital: true,
                    description: "رصيد توليد وشّى AI",
                },
            ],
            note: `شراء رصيد وشّى AI — ${pkg.credits} حصة (#${orderNumber})`,
        });

        if (!invoice.success || !invoice.url || !invoice.transactionNo) {
            await sb
                .from("washa_ai_credit_orders")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("order_number", orderNumber);
            return fail(500, invoice.paymentErrors || "فشل في إنشاء رابط الدفع");
        }

        await sb
            .from("washa_ai_credit_orders")
            .update({ transaction_no: invoice.transactionNo, updated_at: new Date().toISOString() })
            .eq("order_number", orderNumber);

        return {
            ok: true,
            data: {
                orderNumber,
                url: invoice.url,
                mobileUrl: invoice.mobileUrl ?? null,
                transactionNo: invoice.transactionNo,
                credits: pkg.credits,
                amount,
            },
        };
    } catch (error) {
        await sb
            .from("washa_ai_credit_orders")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("order_number", orderNumber);
        return fail(502, error instanceof Error ? error.message : "تعذّر الاتصال ببوابة الدفع");
    }
}

// ─── التحقق من الدفع + شحن المحفظة (idempotent) ──────────────
export type VerifyResult = {
    credited: boolean;
    alreadyProcessed: boolean;
    credits: number;
    balance: number | null;
};

export async function verifyCreditPurchase(params: {
    profile: CreditPurchaseProfile;
    orderNumber: string;
    transactionNo?: string | null;
}): Promise<ServiceResult<VerifyResult>> {
    const sb = getSupabaseAdminClient();

    const { data: order } = await sb
        .from("washa_ai_credit_orders")
        .select("order_number, profile_id, credits, amount, status, transaction_no")
        .eq("order_number", params.orderNumber)
        .maybeSingle();

    if (!order) {
        return fail(404, "طلب الشراء غير موجود");
    }

    if (order.profile_id !== params.profile.id) {
        return fail(403, "غير مصرح لهذا الطلب");
    }

    return confirmVerifiedCreditOrder({
        order: order as CreditOrderRecord,
        transactionNo: params.transactionNo,
    });
}

export async function verifyCreditPurchaseWebhook(params: {
    orderNumber: string;
    transactionNo: string;
    invoice?: unknown;
}): Promise<ServiceResult<VerifyResult>> {
    const sb = getSupabaseAdminClient();
    const { data: order } = await sb
        .from("washa_ai_credit_orders")
        .select("order_number, profile_id, credits, amount, status, transaction_no")
        .eq("order_number", params.orderNumber)
        .maybeSingle();

    if (!order) {
        return fail(404, "طلب شراء رصيد WASHA AI غير موجود");
    }

    return confirmVerifiedCreditOrder({
        order: order as CreditOrderRecord,
        transactionNo: params.transactionNo,
        invoice: params.invoice,
    });
}
