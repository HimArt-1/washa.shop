// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Orders Actions
//  Server Actions لإنشاء وإدارة الطلبات
// ═══════════════════════════════════════════════════════════

"use server";

import { currentUser } from "@clerk/nextjs/server";
import { sendOrderConfirmationEmail, sendAdminOrderNotificationEmail, type OrderEmailItem } from "@/lib/email";
import { sendPushToAdmins } from "@/lib/push";
import { checkStockAvailability, decrementStockForOrder } from "@/lib/inventory";
import { createAdminNotification } from "@/app/actions/notifications";
import { createUserNotification } from "@/app/actions/user-notifications";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";

interface OrderItemInput {
    product_id: string | null;
    quantity: number;
    size: string | null;
    unit_price: number;
    custom_design_url?: string;
    custom_garment?: string;
    custom_title?: string;
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

const SHIPPING_COST = 30;
const TAX_RATE = 0.15;

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
        unit_price: item.unit_price,
    }));
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
    customerEmail?: string | null;
    customerName?: string | null;
    emailItems: OrderEmailItem[];
}) {
    const { orderId, orderNumber, total, buyerId, isCod, customerEmail, customerName, emailItems } = params;
    const metadata = buildOrderDispatchMetadata(orderId, orderNumber, total);

    const sideEffects = [
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:admin_notification:new_order`,
                eventType: "order_created",
                channel: "admin_notification",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                const result = await createAdminNotification({
                    type: "order_new",
                    category: "orders",
                    severity: "info",
                    title: "طلب جديد",
                    message: `طلب #${orderNumber} — ${total.toLocaleString()} ر.س`,
                    link: "/dashboard/orders",
                    metadata,
                });
                assertSuccessfulDispatch(result, "Failed to create admin order notification");
            }
        ),
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
                        emailItems
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
        .select("quantity, size, unit_price, custom_title, product:products(title)")
        .eq("order_id", orderId);

    if (error) {
        throw new Error(error.message);
    }

    return (orderItems || []).map((item: any) => ({
        title: item.product?.title || item.custom_title || "منتج",
        quantity: item.quantity,
        size: item.size,
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
}) {
    const { orderId, orderNumber, total, buyerId, customerEmail, customerName, webhookEventId } = params;
    const metadata = buildOrderDispatchMetadata(orderId, orderNumber, total, webhookEventId ? { webhook_event_id: webhookEventId } : undefined);

    const sideEffects = [
        runIdempotentDispatch(
            {
                dispatchKey: `order:${orderId}:admin_notification:payment_received`,
                eventType: "order_payment_received",
                channel: "admin_notification",
                resourceType: "order",
                resourceId: orderId,
                metadata,
            },
            async () => {
                const result = await createAdminNotification({
                    type: "payment_received",
                    category: "payments",
                    severity: "info",
                    title: "تم استلام الدفع",
                    message: `طلب #${orderNumber} — ${total.toLocaleString()} ر.س`,
                    link: "/dashboard/orders",
                    metadata,
                });
                assertSuccessfulDispatch(result, "Failed to create payment admin notification");
            }
        ),
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
                        emailItems
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
        paymentMethod?: "cod" | "stripe" | "paylink";
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
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    let buyerId: string;

    if (profile) {
        buyerId = profile.id;
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
            .select("id")
            .single();

        if (profileError || !newProfile) {
            return { success: false, error: "فشل في إنشاء الملف الشخصي" };
        }
        buyerId = newProfile.id;
    }

    // 3. Check stock availability
    const stockCheck = await checkStockAvailability(items);
    if (!stockCheck.ok) {
        return { success: false, error: stockCheck.error || "المخزون غير كافٍ" };
    }

    // 4. Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = options?.discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * TAX_RATE;
    const total = taxableAmount + SHIPPING_COST + tax;

    const isCod = options?.paymentMethod !== "stripe" && options?.paymentMethod !== "paylink";

    // 4. Create order
    // COD: مؤكد — الدفع عند الاستلام
    // Paylink/Stripe: معلق — ينتظر تأكيد الدفع عبر Webhook أو Callback
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
            buyer_id: buyerId,
            subtotal,
            shipping_cost: SHIPPING_COST,
            tax,
            total,
            currency: "SAR",
            shipping_address: shippingAddress,
            status: isCod ? "confirmed" : "pending",
            payment_status: isCod ? "pending" : "pending",
            coupon_id: options?.couponId || null,
            discount_amount: options?.discountAmount || 0,
            notes: null,
        })
        .select("id, order_number")
        .single();

    if (orderError || !order) {
        console.error("Order creation error:", orderError);
        return { success: false, error: "فشل في إنشاء الطلب" };
    }

    // 5. Create order items (منتجات عادية أو تصاميم مخصصة)
    const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id ?? null,
        quantity: item.quantity,
        size: item.size,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        ...(item.product_id == null && item.custom_design_url && {
            custom_design_url: item.custom_design_url,
            custom_garment: item.custom_garment ?? null,
            custom_title: item.custom_title ?? null,
        }),
    }));

    const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError) {
        console.error("Order items error:", itemsError);
        return {
            success: true,
            order_number: order.order_number,
            order_id: order.id,
            total,
            warning: "تم إنشاء الطلب لكن بعض العناصر لم تُسجل",
        };
    }

    // الكوبون: يُحتسب فقط عند COD (مؤكد مباشرة)
    // Stripe: يُحتسب في confirmOrderPayment عند اكتمال الدفع
    if (isCod && options?.couponId) {
        await supabase.rpc("increment_coupon_uses_by_id" as never, { p_coupon_id: options.couponId } as never);
    }

    // المخزون: يُنقص فقط عند COD (مؤكد مباشرة)
    // Stripe: يُنقص في confirmOrderPayment عند اكتمال الدفع
    if (isCod) {
        await decrementStockForOrder(order.id);
    }

    await dispatchOrderCreatedSideEffects({
        orderId: order.id,
        orderNumber: order.order_number,
        total,
        buyerId,
        isCod,
        customerEmail: user.emailAddresses?.[0]?.emailAddress,
        customerName: shippingAddress.name || user.firstName || "عميل",
        emailItems: buildOrderEmailItems(items),
    });

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
    options?: { customerEmail?: string; webhookEventId?: string }
) {
    try {
        const supabase = getSupabaseAdminClient();

        const { data: order } = await supabase
            .from("orders")
            .select("order_number, total, shipping_address, payment_status, buyer_id, coupon_id, status")
            .eq("id", orderId)
            .single();

        if (!order) {
            console.error("[confirmOrderPayment] Order not found:", orderId);
            return { success: false };
        }

        await finalizeOrderPaymentState(
            orderId,
            buildOrderDispatchMetadata(
                orderId,
                order.order_number,
                order.total,
                options?.webhookEventId ? { webhook_event_id: options.webhookEventId } : undefined
            )
        );

        await dispatchOrderPaymentSideEffects({
            orderId,
            orderNumber: order.order_number,
            total: order.total,
            buyerId: order.buyer_id,
            customerEmail: options?.customerEmail,
            customerName: getShippingContactName(order.shipping_address),
            webhookEventId: options?.webhookEventId,
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
            )
        `, { count: "exact" })
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching user orders:", error);
        return { data: [], count: 0 };
    }

    return { data: data || [], count: count || 0 };
}
