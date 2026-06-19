// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Orders Actions
//  Server Actions لإنشاء وإدارة الطلبات
// ═══════════════════════════════════════════════════════════

"use server";

import { currentUser } from "@clerk/nextjs/server";
import { sendOrderConfirmationEmail, sendAdminOrderNotificationEmail, type OrderEmailItem } from "@/lib/email";
import { sendPushToAdmins } from "@/lib/push";
import { checkStockAvailability, decrementStockForOrder } from "@/lib/inventory";
import { createUserNotification } from "@/app/actions/user-notifications";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";
import { getSiteSettings } from "@/app/actions/settings";
import { emitOrderCreatedAlert, emitPaymentReceivedAlert } from "@/lib/operational-event-alerts";
import type { DiscountCoupon, UserRole } from "@/types/database";

interface OrderItemInput {
    product_id: string | null;
    quantity: number;
    size: string | null;
    color_code?: string | null;
    unit_price: number;
    custom_design_url?: string | null;
    custom_garment?: string | null;
    custom_title?: string | null;
    custom_position?: string | null;
    custom_design_order_id?: string | null;
}

interface ShippingAddressInput {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
    phone?: string;
}

type OrderPaymentMethod = "cod" | "stripe" | "paylink" | "pos_cash" | "pos_card";
type OrdersSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

type ProductPricingRow = {
    id: string;
    title: string | null;
    price: number | string | null;
    in_stock: boolean | null;
    stock_quantity: number | null;
    sizes?: string[] | null;
};

type CustomDesignPricingRow = {
    id: string;
    order_number: number | null;
    user_id: string | null;
    customer_email: string | null;
    status: string | null;
    final_price: number | string | null;
    result_design_url: string | null;
    result_mockup_url: string | null;
    dtf_mockup_url: string | null;
    dtf_extracted_url: string | null;
    garment_name: string | null;
    color_name: string | null;
    size_name: string | null;
    print_position: string | null;
    pricing_snapshot: unknown;
};

type ServerOrderPayload =
    | {
        ok: true;
        items: OrderItemInput[];
        subtotal: number;
        discount: number;
        couponId: string | null;
        paymentMethod: OrderPaymentMethod;
    }
    | {
        ok: false;
        error: string;
    };

const VALID_PAYMENT_METHODS: OrderPaymentMethod[] = ["cod", "stripe", "paylink", "pos_cash", "pos_card"];
const POS_PAYMENT_METHODS: OrderPaymentMethod[] = ["pos_cash", "pos_card"];
const POS_ALLOWED_ROLES: UserRole[] = ["admin", "dev", "booth"];

function isMissingColumnError(error: unknown, columnName: string) {
    const message = typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");
    return message.toLowerCase().includes(`'${columnName.toLowerCase()}'`)
        || message.toLowerCase().includes(`\"${columnName.toLowerCase()}\"`)
        || message.toLowerCase().includes(columnName.toLowerCase());
}

function omitCustomPosition<T extends { custom_position?: string | null }>(item: T) {
    const { custom_position: _customPosition, ...rest } = item;
    return rest;
}


function buildOrderDispatchMetadata(
    orderId: string,
    orderNumber: string,
    total: number,
    extra?: Record<string, unknown>
) {
    return {
        order_id: orderId,
        order_number: orderNumber,
        total,
        ...(extra || {}),
    };
}

function getShippingContactName(shippingAddress: unknown) {
    if (!shippingAddress || typeof shippingAddress !== "object") {
        return null;
    }

    const rawName = (shippingAddress as Record<string, unknown>).name;
    return typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;
}

function buildOrderEmailItems(items: OrderItemInput[]) {
    return items.map((item) => ({
        title: item.custom_title || "منتج",
        quantity: item.quantity,
        size: item.size,
        color_code: item.color_code ?? null,
        unit_price: item.unit_price,
    }));
}

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

function parsePositiveAmount(value: unknown) {
    const amount = typeof value === "number" ? value : Number(value);
    return Number.isFinite(amount) && amount > 0 ? roundMoney(amount) : null;
}

function normalizePaymentMethod(value?: OrderPaymentMethod): OrderPaymentMethod {
    return value && VALID_PAYMENT_METHODS.includes(value) ? value : "cod";
}

function canUsePosPayment(role?: UserRole | null) {
    return Boolean(role && POS_ALLOWED_ROLES.includes(role));
}

function normalizeQuantity(value: unknown, max = 99) {
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > max) {
        return null;
    }

    return value as number;
}

function normalizeSize(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeColorCode(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmail(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function getCustomDesignPrice(order: CustomDesignPricingRow) {
    const directPrice = parsePositiveAmount(order.final_price);
    if (directPrice !== null) return directPrice;

    if (order.pricing_snapshot && typeof order.pricing_snapshot === "object") {
        return parsePositiveAmount((order.pricing_snapshot as { final_price?: unknown }).final_price);
    }

    return null;
}

function getCustomDesignUrl(order: CustomDesignPricingRow) {
    return order.dtf_extracted_url
        || order.result_design_url
        || order.dtf_mockup_url
        || order.result_mockup_url
        || null;
}

function calculateCouponDiscount(coupon: DiscountCoupon, subtotal: number) {
    const rawValue = Number(coupon.discount_value);
    if (!Number.isFinite(rawValue) || rawValue <= 0) return 0;

    const value = coupon.discount_type === "percentage"
        ? subtotal * (Math.min(rawValue, 100) / 100)
        : rawValue;

    return roundMoney(Math.min(Math.max(value, 0), subtotal));
}

async function validateCouponForSubtotal(
    supabase: OrdersSupabaseClient,
    couponId: string | null | undefined,
    subtotal: number
) {
    if (!couponId) {
        return { couponId: null, discount: 0 };
    }

    const { data: coupon, error } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("id", couponId)
        .eq("is_active", true)
        .single();

    if (error || !coupon) {
        throw new Error("كوبون الخصم غير صالح");
    }

    const typedCoupon = coupon as DiscountCoupon;
    if (typedCoupon.valid_until && new Date(typedCoupon.valid_until) < new Date()) {
        throw new Error("انتهت صلاحية كوبون الخصم");
    }

    if (typedCoupon.max_uses > 0 && typedCoupon.current_uses >= typedCoupon.max_uses) {
        throw new Error("تم الوصول للحد الأقصى لاستخدام كوبون الخصم");
    }

    return {
        couponId: typedCoupon.id,
        discount: calculateCouponDiscount(typedCoupon, subtotal),
    };
}

async function buildServerOrderPayload(params: {
    supabase: OrdersSupabaseClient;
    items: OrderItemInput[];
    buyerId: string;
    buyerRole?: UserRole | null;
    buyerEmail?: string | null;
    paymentMethod?: OrderPaymentMethod;
    couponId?: string | null;
}): Promise<ServerOrderPayload> {
    const { supabase, items, buyerId, buyerRole } = params;
    const buyerEmail = normalizeEmail(params.buyerEmail);

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return { ok: false, error: "السلة غير صالحة" };
    }

    const paymentMethod = normalizePaymentMethod(params.paymentMethod);
    if (POS_PAYMENT_METHODS.includes(paymentMethod) && !canUsePosPayment(buyerRole)) {
        return { ok: false, error: "طريقة دفع نقطة البيع غير متاحة لهذا الحساب" };
    }

    const productIds = Array.from(new Set(
        items
            .map((item) => typeof item.product_id === "string" ? item.product_id.trim() : "")
            .filter(Boolean)
    ));
    const customDesignIds = Array.from(new Set(
        items
            .filter((item) => !item.product_id)
            .map((item) => typeof item.custom_design_order_id === "string" ? item.custom_design_order_id.trim() : "")
            .filter(Boolean)
    ));

    const [productsResult, customDesignsResult] = await Promise.all([
        productIds.length
            ? supabase
                .from("products")
                .select("id, title, price, in_stock, stock_quantity, sizes")
                .in("id", productIds)
            : Promise.resolve({ data: [], error: null }),
        customDesignIds.length
            ? supabase
                .from("custom_design_orders")
                .select("id, order_number, user_id, customer_email, status, final_price, result_design_url, result_mockup_url, dtf_mockup_url, dtf_extracted_url, garment_name, color_name, size_name, print_position, pricing_snapshot")
                .in("id", customDesignIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsResult.error || customDesignsResult.error) {
        return { ok: false, error: "تعذر التحقق من عناصر السلة" };
    }

    const products = new Map(
        ((productsResult.data || []) as ProductPricingRow[]).map((product) => [product.id, product])
    );
    const customDesigns = new Map(
        ((customDesignsResult.data || []) as CustomDesignPricingRow[]).map((order) => [order.id, order])
    );

    const serverItems: OrderItemInput[] = [];

    for (const item of items) {
        const productId = typeof item.product_id === "string" && item.product_id.trim()
            ? item.product_id.trim()
            : null;

        if (productId) {
            const product = products.get(productId);
            if (!product) {
                return { ok: false, error: "أحد المنتجات في السلة غير موجود" };
            }

            if (!product.in_stock) {
                return { ok: false, error: `المنتج "${product.title || "منتج"}" غير متوفر` };
            }

            const quantity = normalizeQuantity(item.quantity);
            if (quantity === null) {
                return { ok: false, error: "كمية المنتج غير صالحة" };
            }

            const size = normalizeSize(item.size);
            const colorCode = normalizeColorCode(item.color_code);
            const allowedSizes = Array.isArray(product.sizes)
                ? product.sizes.filter((sizeValue) => typeof sizeValue === "string")
                : [];

            if (size && allowedSizes.length > 0 && !allowedSizes.includes(size)) {
                return { ok: false, error: "المقاس المحدد غير متاح لهذا المنتج" };
            }

            const unitPrice = parsePositiveAmount(product.price);
            if (unitPrice === null) {
                return { ok: false, error: "سعر المنتج غير صالح" };
            }

            serverItems.push({
                product_id: productId,
                quantity,
                size,
                color_code: colorCode,
                unit_price: unitPrice,
                custom_title: product.title || "منتج",
            });
            continue;
        }

        const designOrderId = typeof item.custom_design_order_id === "string" && item.custom_design_order_id.trim()
            ? item.custom_design_order_id.trim()
            : null;

        if (!designOrderId) {
            return { ok: false, error: "طلب التصميم المخصص غير صالح" };
        }

        const designOrder = customDesigns.get(designOrderId);
        if (!designOrder) {
            return { ok: false, error: "طلب التصميم المخصص غير موجود" };
        }

        if (designOrder.user_id && designOrder.user_id !== buyerId) {
            return { ok: false, error: "طلب التصميم المخصص لا يخص هذا الحساب" };
        }

        const designOrderEmail = normalizeEmail(designOrder.customer_email);
        if (!designOrder.user_id && designOrderEmail && designOrderEmail !== buyerEmail) {
            return { ok: false, error: "طلب التصميم المخصص لا يخص هذا الحساب" };
        }

        if (designOrder.status === "cancelled") {
            return { ok: false, error: "طلب التصميم المخصص ملغي" };
        }

        const quantity = normalizeQuantity(item.quantity, 1);
        if (quantity === null) {
            return { ok: false, error: "تصميم DTF المخصص يضاف بقطعة واحدة فقط" };
        }

        const unitPrice = getCustomDesignPrice(designOrder);
        if (unitPrice === null) {
            return { ok: false, error: "سعر التصميم المخصص غير جاهز" };
        }

        const customDesignUrl = getCustomDesignUrl(designOrder);
        const garmentLabel = [designOrder.garment_name, designOrder.color_name]
            .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
            .join(" ");

        serverItems.push({
            product_id: null,
            quantity,
            size: normalizeSize(designOrder.size_name),
            unit_price: unitPrice,
            custom_design_url: customDesignUrl,
            custom_garment: garmentLabel || null,
            custom_title: designOrder.order_number
                ? `تصميم مخصص #${designOrder.order_number}`
                : "تصميم مخصص",
            custom_position: normalizeSize(designOrder.print_position),
            custom_design_order_id: designOrder.id,
        });
    }

    const subtotal = roundMoney(
        serverItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    );

    if (subtotal <= 0) {
        return { ok: false, error: "إجمالي السلة غير صالح" };
    }

    try {
        const coupon = await validateCouponForSubtotal(supabase, params.couponId, subtotal);
        return {
            ok: true,
            items: serverItems,
            subtotal,
            discount: coupon.discount,
            couponId: coupon.couponId,
            paymentMethod,
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "كوبون الخصم غير صالح",
        };
    }
}

function assertSuccessfulDispatch(
    result: { success?: boolean; error?: string } | undefined,
    label: string
) {
    if (result?.success === false) {
        throw new Error(result.error || label);
    }
}

function logDispatchFailures(scope: string, results: PromiseSettledResult<unknown>[]) {
    for (const result of results) {
        if (result.status === "rejected") {
            console.error(`[${scope}]`, result.reason);
        }
    }
}

async function dispatchOrderCreatedSideEffects(params: {
    orderId: string;
    orderNumber: string;
    total: number;
    buyerId: string;
    isCod: boolean;
    paymentLabel: string;
    customerEmail?: string | null;
    customerName?: string | null;
    emailItems: OrderEmailItem[];
    breakdown?: {
        subtotal: number;
        discount: number;
        shipping: number;
        tax: number;
    };
}) {
    const { orderId, orderNumber, total, buyerId, isCod, paymentLabel, customerEmail, customerName, emailItems, breakdown } = params;
    const metadata = buildOrderDispatchMetadata(orderId, orderNumber, total);

    const sideEffects = [
        emitOrderCreatedAlert({
            orderId,
            orderNumber,
            total,
            paymentLabel,
            customerName,
        }),
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:user_notification:created`,
                eventType: "order_created",
                channel: "user_notification",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                const result = await createUserNotification({
                    userId: buyerId,
                    type: "order_update",
                    title: "تم استلام طلبك ✓",
                    message: `طلبك #${orderNumber} تم تسجيله بنجاح — ${total.toLocaleString()} ر.س`,
                    link: `/account/orders?order=${orderId}`,
                    metadata,
                });
                assertSuccessfulDispatch(result, "Failed to create buyer order notification");
            }
        ),
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:admin_email:new_order`,
                eventType: "order_created",
                channel: "email_admin",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                const result = await sendAdminOrderNotificationEmail(orderNumber, total, "new_order");
                assertSuccessfulDispatch(result, "Failed to send admin order email");
            }
        ),
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:admin_push:new_order`,
                eventType: "order_created",
                channel: "push_admin",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                await sendPushToAdmins(
                    "طلب جديد",
                    `طلب #${orderNumber} — ${total.toLocaleString()} ر.س`,
                    "/dashboard/orders"
                );
            }
        ),
    ];

    if (isCod && customerEmail) {
        sideEffects.push(
            runIdempotentDispatch(
                {
                    dispatchKey: `order:${orderId}:customer_email:created`,
                    eventType: "order_created",
                    channel: "email_customer",
                    resourceType: "order",
                    resourceId: orderId,
                    metadata,
                },
                async () => {
                    const result = await sendOrderConfirmationEmail(
                        customerEmail,
                        customerName || "عميل",
                        orderNumber,
                        total,
                        emailItems,
                        breakdown
                    );
                    assertSuccessfulDispatch(result, "Failed to send customer order confirmation email");
                }
            )
        );
    }

    const results = await Promise.allSettled(sideEffects);
    logDispatchFailures("dispatchOrderCreatedSideEffects", results);
}

async function finalizeOrderPaymentState(orderId: string, metadata: Record<string, unknown>) {
    await runIdempotentDispatch(
        {
            dispatchKey: `order:${orderId}:payment_finalize`,
            eventType: "order_payment_finalize",
            channel: "order_state",
            resourceType: "order",
            resourceId: orderId,
            metadata,
        },
        async () => {
            const supabase = getSupabaseAdminClient();
            const { data: currentOrder, error: currentOrderError } = await supabase
                .from("orders")
                .select("payment_status, status, coupon_id")
                .eq("id", orderId)
                .single();

            if (currentOrderError || !currentOrder) {
                throw new Error("Order not found during payment finalization");
            }

            if (currentOrder.payment_status !== "paid") {
                const { error: updateError } = await supabase
                    .from("orders")
                    .update({
                        payment_status: "paid",
                        status: "confirmed",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", orderId);

                if (updateError) {
                    throw new Error(updateError.message);
                }
            }

            const wasStripePending = currentOrder.status === "pending";
            if (wasStripePending) {
                await decrementStockForOrder(orderId);
            }

            if (wasStripePending && currentOrder.coupon_id) {
                const { error: couponError } = await supabase.rpc(
                    "increment_coupon_uses_by_id" as never,
                    { p_coupon_id: currentOrder.coupon_id } as never
                );

                if (couponError) {
                    throw new Error(couponError.message);
                }
            }
        }
    );
}

async function fetchOrderEmailItems(orderId: string) {
    const supabase = getSupabaseAdminClient();
    const { data: orderItems, error } = await supabase
        .from("order_items")
        .select("quantity, size, color_code, unit_price, custom_title, product:products(title)")
        .eq("order_id", orderId);

    if (error) {
        throw new Error(error.message);
    }

    return (orderItems || []).map((item: any) => ({
        title: item.product?.title || item.custom_title || "منتج",
        quantity: item.quantity,
        size: item.size,
        color_code: item.color_code,
        unit_price: item.unit_price,
    })) as OrderEmailItem[];
}

async function dispatchOrderPaymentSideEffects(params: {
    orderId: string;
    orderNumber: string;
    total: number;
    buyerId?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
    webhookEventId?: string;
    paymentProvider?: string;
    breakdown?: {
        subtotal: number;
        discount: number;
        shipping: number;
        tax: number;
    };
}) {
    const { orderId, orderNumber, total, buyerId, customerEmail, customerName, webhookEventId, paymentProvider, breakdown } = params;
    const metadata = buildOrderDispatchMetadata(
        orderId,
        orderNumber,
        total,
        {
            ...(webhookEventId ? { webhook_event_id: webhookEventId } : {}),
            ...(paymentProvider ? { payment_provider: paymentProvider } : {}),
        }
    );

    const sideEffects = [
        emitPaymentReceivedAlert({
            orderId,
            orderNumber,
            total,
            provider: paymentProvider,
            webhookEventId,
        }),
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:admin_email:payment_received`,
                eventType: "order_payment_received",
                channel: "email_admin",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                const result = await sendAdminOrderNotificationEmail(orderNumber, total, "payment_received");
                assertSuccessfulDispatch(result, "Failed to send payment admin email");
            }
        ),
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:admin_push:payment_received`,
                eventType: "order_payment_received",
                channel: "push_admin",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                await sendPushToAdmins(
                    "تم استلام الدفع",
                    `طلب #${orderNumber} — ${total.toLocaleString()} ر.س`,
                    "/dashboard/orders"
                );
            }
        ),
    ];

    if (buyerId) {
        sideEffects.push(
            runIdempotentDispatch(
                {
                    dispatchKey: `order:${orderId}:user_notification:payment_received`,
                    eventType: "order_payment_received",
                    channel: "user_notification",
                    resourceType: "order",
                    resourceId: orderId,
                    metadata,
                },
                async () => {
                    const result = await createUserNotification({
                        userId: buyerId,
                        type: "order_update",
                        title: "تم استلام الدفع ✓",
                        message: `تم تأكيد الدفع لطلبك #${orderNumber} — ${total.toLocaleString()} ر.س`,
                        link: `/account/orders?order=${orderId}`,
                        metadata,
                    });
                    assertSuccessfulDispatch(result, "Failed to create payment buyer notification");
                }
            )
        );
    }

    if (customerEmail) {
        sideEffects.push(
            runIdempotentDispatch(
                {
                    dispatchKey: `order:${orderId}:customer_email:payment_received`,
                    eventType: "order_payment_received",
                    channel: "email_customer",
                    resourceType: "order",
                    resourceId: orderId,
                    metadata,
                },
                async () => {
                    const emailItems = await fetchOrderEmailItems(orderId);
                    const result = await sendOrderConfirmationEmail(
                        customerEmail,
                        customerName || "عميل",
                        orderNumber,
                        total,
                        emailItems,
                        breakdown
                    );
                    assertSuccessfulDispatch(result, "Failed to send payment customer email");
                }
            )
        );
    }

    const results = await Promise.allSettled(sideEffects);
    logDispatchFailures("dispatchOrderPaymentSideEffects", results);
}

export async function createOrder(
    items: OrderItemInput[],
    shippingAddress: ShippingAddressInput,
    options?: {
        paymentMethod?: "cod" | "stripe" | "paylink" | "pos_cash" | "pos_card";
        couponId?: string | null;
        discountAmount?: number;
    }
) {
    // 1. Verify authenticated user
    const user = await currentUser();
    if (!user) {
        return { success: false, error: "يجب تسجيل الدخول لإتمام الطلب" };
    }

    const supabase = getSupabaseAdminClient();

    // 2. Get or create buyer's profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    let buyerId: string;
    let buyerRole: UserRole = "subscriber";

    if (profile) {
        buyerId = profile.id;
        buyerRole = profile.role as UserRole;
    } else {
        // Create a profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
            .from("profiles")
            .insert({
                clerk_id: user.id,
                display_name: user.firstName || user.username || "مشترك",
                username: user.username || `user_${user.id.slice(-8)}`,
                role: "subscriber",
                bio: null,
                avatar_url: null,
                cover_url: null,
                website: null,
                wushsha_level: null,
            })
            .select("id, role")
            .single();

        if (profileError || !newProfile) {
            return { success: false, error: "فشل في إنشاء الملف الشخصي" };
        }
        buyerId = newProfile.id;
        buyerRole = newProfile.role as UserRole;
    }

    const serverPayload = await buildServerOrderPayload({
        supabase,
        items,
        buyerId,
        buyerRole,
        buyerEmail: user.emailAddresses?.[0]?.emailAddress ?? null,
        paymentMethod: options?.paymentMethod,
        couponId: options?.couponId ?? null,
    });

    if (!serverPayload.ok) {
        return { success: false, error: serverPayload.error };
    }

    const verifiedItems = serverPayload.items;
    const paymentMethod = serverPayload.paymentMethod;

    // 3. Check stock availability
    const stockCheck = await checkStockAvailability(verifiedItems);
    if (!stockCheck.ok) {
        return { success: false, error: stockCheck.error || "المخزون غير كافٍ" };
    }

    // 3.5 Get dynamic settings
    const settings = await getSiteSettings();
    const config = settings.shipping;

    // 4. Calculate totals
    const subtotal = serverPayload.subtotal;
    const discount = serverPayload.discount;
    const taxableAmount = Math.max(0, subtotal - discount);

    // Shipping logic with strict flag check
    const isShippingEnabled = config.shipping_enabled === true;
    const shipping_cost = (() => {
        if (!isShippingEnabled) return 0;
        if (taxableAmount >= (config.free_above ?? 500)) return 0;
        return config.flat_rate ?? 30;
    })();

    // Tax logic with strict flag check
    const isTaxEnabled = config.tax_enabled === true;
    const tax = isTaxEnabled
        ? roundMoney(taxableAmount * ((config.tax_rate ?? 15) / 100))
        : 0;

    const total = roundMoney(taxableAmount + shipping_cost + tax);

    const isCod = paymentMethod === "cod";
    const isPos = paymentMethod === "pos_cash" || paymentMethod === "pos_card";
    const initialStatus = (isCod || isPos) ? "confirmed" : "pending";
    const initialPaymentStatus = isPos ? "paid" : "pending";
    const orderNotes = isPos ? (paymentMethod === "pos_cash" ? "الدفع: نقطة بيع (كاش)" : "الدفع: نقطة بيع (شبكة)") : null;
    const paymentLabel = isCod
        ? "عند الاستلام"
        : paymentMethod === "pos_cash"
            ? "نقطة بيع (كاش)"
            : paymentMethod === "pos_card"
                ? "نقطة بيع (شبكة)"
                : paymentMethod === "stripe"
                    ? "Stripe (بانتظار الدفع)"
                    : paymentMethod === "paylink"
                        ? "Paylink (بانتظار الدفع)"
                        : "إلكتروني (بانتظار الدفع)";

    // 4. Create order
    // COD: مؤكد — الدفع عند الاستلام
    // POS: مؤكد — الدفع فوري (مدفوع)
    // Paylink/Stripe: معلق — ينتظر تأكيد الدفع عبر Webhook أو Callback
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
            buyer_id: buyerId,
            subtotal,
            shipping_cost,
            tax,
            total,
            currency: "SAR",
            shipping_address: shippingAddress,
            status: initialStatus,
            payment_status: initialPaymentStatus,
            coupon_id: serverPayload.couponId,
            discount_amount: discount,
            notes: orderNotes,
        })
        .select("id, order_number")
        .single();

    if (orderError || !order) {
        console.error("Order creation error:", orderError);
        return { success: false, error: "فشل في إنشاء الطلب" };
    }

    // 5. Create order items (منتجات عادية أو تصاميم مخصصة)
    const orderItems = verifiedItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id ?? null,
        quantity: item.quantity,
        size: item.size,
        color_code: item.color_code ?? null,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        ...(item.product_id == null && {
            custom_design_url: item.custom_design_url ?? null,
            custom_garment: item.custom_garment ?? null,
            custom_title: item.custom_title ?? null,
            custom_position: item.custom_position ?? null,
            custom_design_order_id: item.custom_design_order_id ?? null,
        }),
    }));

    let { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError && isMissingColumnError(itemsError, "custom_position")) {
        console.warn("[createOrder] custom_position column is unavailable; retrying order_items insert without it.", itemsError);
        const retry = await supabase
            .from("order_items")
            .insert(orderItems.map(omitCustomPosition));
        itemsError = retry.error;
    }

    if (itemsError) {
        console.error("Order items error:", itemsError);
        await supabase.from("orders").delete().eq("id", order.id);
        return {
            success: false,
            error: "فشل في تسجيل عناصر الطلب. لم يتم تثبيت الطلب، حاول مرة أخرى.",
        };
    }

    // الكوبون: يُحتسب فوراً عند طرق الدفع المؤكدة مباشرة.
    // Stripe/Paylink: يُحتسب في confirmOrderPayment عند اكتمال الدفع.
    if ((isCod || isPos) && serverPayload.couponId) {
        await supabase.rpc("increment_coupon_uses_by_id" as never, { p_coupon_id: serverPayload.couponId } as never);
    }

    // المخزون: يُنقص عند COD أو POS
    // Stripe: يُنقص في confirmOrderPayment عند اكتمال الدفع
    if (isCod || isPos) {
        await decrementStockForOrder(order.id);
    }


    await dispatchOrderCreatedSideEffects({
        orderId: order.id,
        orderNumber: order.order_number,
        total,
        buyerId,
        isCod,
        paymentLabel,
        customerEmail: user.emailAddresses?.[0]?.emailAddress,
        customerName: shippingAddress.name || user.firstName || "عميل",
        emailItems: buildOrderEmailItems(verifiedItems),
        breakdown: {
            subtotal,
            shipping: shipping_cost,
            tax,
            discount,
        },
    });

    if (isPos) {
        await dispatchOrderPaymentSideEffects({
            orderId: order.id,
            orderNumber: order.order_number,
            total,
            buyerId,
            customerEmail: user.emailAddresses?.[0]?.emailAddress,
            customerName: shippingAddress.name || user.firstName || "عميل",
            paymentProvider: paymentMethod,
            breakdown: {
                subtotal,
                shipping: shipping_cost,
                tax,
                discount,
            },
        });
    }

    return {
        success: true,
        order_number: order.order_number,
        order_id: order.id,
        total,
    };
}

// ─── Confirm Order Payment (Stripe webhook) ──────────────────

export async function confirmOrderPayment(
    orderId: string,
    options?: {
        customerEmail?: string;
        webhookEventId?: string;
        paidAmount?: number | null;
        paymentProvider?: string;
    }
) {
    try {
        const supabase = getSupabaseAdminClient();

        const { data: order } = await supabase
            .from("orders")
            .select("order_number, total, shipping_address, payment_status, buyer_id, coupon_id, status, subtotal, discount_amount, shipping_cost, tax")
            .eq("id", orderId)
            .single();

        if (!order) {
            console.error("[confirmOrderPayment] Order not found:", orderId);
            return { success: false };
        }

        if (
            typeof options?.paidAmount === "number" &&
            Number.isFinite(options.paidAmount) &&
            Math.abs(Number(order.total) - options.paidAmount) > 0.01
        ) {
            console.error("[confirmOrderPayment] Payment amount mismatch:", {
                orderId,
                orderNumber: order.order_number,
                expected: order.total,
                paid: options.paidAmount,
                provider: options.paymentProvider || "unknown",
            });
            return { success: false, error: "مبلغ الدفع لا يطابق إجمالي الطلب" };
        }

        await finalizeOrderPaymentState(
            orderId,
            buildOrderDispatchMetadata(
                orderId,
                order.order_number,
                order.total,
                {
                    ...(options?.webhookEventId ? { webhook_event_id: options.webhookEventId } : {}),
                    ...(options?.paymentProvider ? { payment_provider: options.paymentProvider } : {}),
                    ...(typeof options?.paidAmount === "number" ? { paid_amount: options.paidAmount } : {}),
                }
            )
        );

        await dispatchOrderPaymentSideEffects({
            orderId,
            orderNumber: order.order_number,
            total: order.total,
            buyerId: order.buyer_id,
            customerEmail: options?.customerEmail || null,
            customerName: getShippingContactName(order.shipping_address),
            webhookEventId: options?.webhookEventId,
            paymentProvider: options?.paymentProvider,
            breakdown: {
                total: order.total,
                subtotal: order.subtotal || 0,
                discount: order.discount_amount || 0,
                shipping: order.shipping_cost || 0,
                tax: order.tax || 0,
            } as any
        });

        return { success: true };
    } catch (error) {
        console.error("[confirmOrderPayment] Error:", error);
        return { success: false };
    }
}

// ─── Get User Orders ────────────────────────────────────────

export async function getUserOrders() {
    const user = await currentUser();
    if (!user) return { data: [], count: 0 };

    const supabase = getSupabaseAdminClient();

    // Get profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    if (!profile) return { data: [], count: 0 };

    // Fetch orders (منتجات عادية + تصاميم مخصصة)
    const { data, error, count } = await supabase
        .from("orders")
        .select(`
            *,
            items:order_items(
                *,
                product:products(id, title, image_url, type)
            ),
            coupon:discount_coupons(code)
        `, { count: "exact" })
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching user orders:", error);
        return { data: [], count: 0 };
    }

    return { data: data || [], count: count || 0 };
}
