import { escapeAdminNotificationHtml } from "@/lib/notifications";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    getTelegramAppUrl,
    sendTelegramMessage,
    type TelegramBotCommand,
    type TelegramReplyMarkup,
} from "@/lib/telegram-bot";

export type TelegramUser = {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
};

export type TelegramChat = {
    id: number | string;
    type?: "private" | "group" | "supergroup" | "channel" | string;
    title?: string;
    username?: string;
};

export type TelegramMessage = {
    message_id: number;
    date?: number;
    chat: TelegramChat;
    from?: TelegramUser;
    text?: string;
};

export type TelegramUpdate = {
    update_id?: number;
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
    callback_query?: {
        id: string;
        from: TelegramUser;
        message?: TelegramMessage;
        data?: string;
    };
};

type TelegramEnvelope = {
    chatId: string | null;
    chatType: string | null;
    fromId: string | null;
    fromName: string | null;
    text: string | null;
    messageId: number | null;
};

type TelegramCommandContext = {
    update: TelegramUpdate;
    envelope: TelegramEnvelope;
    command: string;
    args: string[];
    appUrl: string;
    supabase: any;
};

type TelegramCommandResponse = {
    text: string;
    replyMarkup?: TelegramReplyMarkup;
};

type CountResult = {
    count: number;
    error?: string;
};

type QueryResult<T> = {
    data: T[];
    error?: string;
};

export const TELEGRAM_BOT_COMMANDS: TelegramBotCommand[] = [
    { command: "start", description: "تشغيل بوت وشّى وعرض الاختصارات" },
    { command: "help", description: "عرض جميع أوامر البوت" },
    { command: "status", description: "حالة تشغيل مختصرة للمنصة" },
    { command: "today", description: "ملخص اليوم: الطلبات، الدفع، الدعم، التصميم" },
    { command: "orders", description: "آخر الطلبات وحالات التنفيذ" },
    { command: "order", description: "تفاصيل طلب برقم الطلب أو المعرّف" },
    { command: "payments", description: "حالة المدفوعات والتحصيل" },
    { command: "cod", description: "الطلبات المسلمة غير المدفوعة" },
    { command: "shipping", description: "حالة الشحن والتتبع" },
    { command: "support", description: "تذاكر الدعم المفتوحة والعاجلة" },
    { command: "designs", description: "طلبات التصميم وWASHA AI" },
    { command: "stock", description: "المخزون المنخفض والنافد" },
    { command: "low_stock", description: "اختصار للمنتجات منخفضة المخزون" },
    { command: "notifications", description: "تنبيهات الأدمن غير المقروءة" },
    { command: "errors", description: "أخطاء النظام المسجلة حديثًا" },
    { command: "test", description: "اختبار استجابة البوت" },
];

const COMMAND_NAMES = new Set(TELEGRAM_BOT_COMMANDS.map((item) => item.command));
const STATUS_LABELS: Record<string, string> = {
    pending: "معلّق",
    confirmed: "مؤكد",
    processing: "قيد التنفيذ",
    shipped: "مشحون",
    delivered: "مسلم",
    cancelled: "ملغي",
    refunded: "مسترد",
    paid: "مدفوع",
    failed: "فشل",
    open: "مفتوحة",
    in_progress: "قيد المعالجة",
    resolved: "محلولة",
    closed: "مغلقة",
    new: "جديد",
    awaiting_review: "بانتظار المراجعة",
    completed: "مكتمل",
    modification_requested: "طلب تعديل",
};

function label(value: unknown) {
    const raw = String(value ?? "—");
    return STATUS_LABELS[raw] ?? raw;
}

function h(value: unknown) {
    return escapeAdminNotificationHtml(value);
}

function money(value: unknown) {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatDate(value?: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
        timeZone: "Asia/Riyadh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
    }).format(new Date(value));
}

function getRiyadhTodayStartIso() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
    return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+03:00`).toISOString();
}

function getRiyadhYesterdayStartIso() {
    return new Date(new Date(getRiyadhTodayStartIso()).getTime() - 24 * 60 * 60 * 1000).toISOString();
}

function appLink(appUrl: string, path: string) {
    return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function keyboard(appUrl: string, rows: Array<Array<{ text: string; path?: string; url?: string }>>): TelegramReplyMarkup {
    return {
        inline_keyboard: rows.map((row) =>
            row.map((button) => ({
                text: button.text,
                url: button.url ?? appLink(appUrl, button.path ?? "/dashboard"),
            }))
        ),
    };
}

function extractUserName(user?: TelegramUser) {
    if (!user) return null;
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    return fullName || user.username || String(user.id);
}

export function getTelegramUpdateEnvelope(update: TelegramUpdate): TelegramEnvelope {
    const message = update.message ?? update.edited_message ?? update.callback_query?.message ?? null;
    const from = update.message?.from ?? update.edited_message?.from ?? update.callback_query?.from ?? null;

    return {
        chatId: message?.chat?.id != null ? String(message.chat.id) : null,
        chatType: message?.chat?.type ?? null,
        fromId: from?.id != null ? String(from.id) : null,
        fromName: extractUserName(from ?? undefined),
        text: update.message?.text ?? update.edited_message?.text ?? update.callback_query?.data ?? null,
        messageId: message?.message_id ?? null,
    };
}

function parseCommand(text: string | null) {
    const trimmed = text?.trim() ?? "";
    if (!trimmed.startsWith("/")) return null;

    const [rawCommand = "", ...args] = trimmed.slice(1).split(/\s+/);
    const command = rawCommand.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") ?? "";
    if (!command) return null;

    return { command, args };
}

async function count(query: PromiseLike<{ count: number | null; error: any }>): Promise<CountResult> {
    const result = await query;
    if (result.error) {
        return { count: 0, error: String(result.error.message || result.error) };
    }
    return { count: result.count ?? 0 };
}

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: any }>): Promise<QueryResult<T>> {
    const result = await query;
    if (result.error) {
        return { data: [], error: String(result.error.message || result.error) };
    }
    return { data: result.data ?? [] };
}

function sumRows(items: Array<Record<string, unknown>>, field: string) {
    return items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
}

function topLines<T>(
    items: T[],
    render: (item: T, index: number) => string,
    emptyText = "لا توجد نتائج."
) {
    if (items.length === 0) return emptyText;
    return items.map(render).join("\n");
}

async function logCommand(ctx: TelegramCommandContext, status: "handled" | "ignored" | "failed", error?: string) {
    try {
        await ctx.supabase.from("system_logs").insert({
            type: status === "failed" ? "warning" : "info",
            source: "telegram.command_center",
            message: `Telegram command ${ctx.command} ${status}`,
            stack: null,
            user_id: null,
            metadata: {
                command: ctx.command,
                args: ctx.args,
                status,
                error: error ?? null,
                chat_id: ctx.envelope.chatId,
                chat_type: ctx.envelope.chatType,
                from_id: ctx.envelope.fromId,
                from_name: ctx.envelope.fromName,
                update_id: ctx.update.update_id ?? null,
            },
        });
    } catch {
        // Logging must never block Telegram replies.
    }
}

function helpText() {
    const commands = TELEGRAM_BOT_COMMANDS
        .map((item) => `/${item.command} — ${h(item.description)}`)
        .join("\n");

    return [
        "<b>أوامر بوت وشّى التشغيلية</b>",
        "استخدم الأوامر التالية لمراقبة المنصة من تيليجرام:",
        "",
        commands,
        "",
        "ملاحظة: هذه الجولة قراءة وتشخيص فقط، ولا تغيّر بيانات الطلبات أو المدفوعات.",
    ].join("\n");
}

async function handleStart(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    return {
        text: [
            "<b>بوت وشّى التشغيلي جاهز.</b>",
            "يعرض لك الطلبات، الدفع، الشحن، الدعم، المخزون، والأخطاء مباشرة من الداشبورد.",
            "",
            "ابدأ بـ /status أو /today أو /help.",
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "فتح الداشبورد", path: "/dashboard" }, { text: "التكاملات", path: "/dashboard/integrations" }],
            [{ text: "الطلبات", path: "/dashboard/orders/command-center" }, { text: "التنبيهات", path: "/dashboard/notifications" }],
        ]),
    };
}

async function handleHelp(): Promise<TelegramCommandResponse> {
    return { text: helpText() };
}

async function handleTest(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    return {
        text: [
            "<b>اختبار بوت وشّى</b>",
            "الاستجابة تعمل.",
            `المحادثة: <code>${h(ctx.envelope.chatId)}</code>`,
            `المستخدم: <code>${h(ctx.envelope.fromId)}</code>`,
            `الوقت: ${h(formatDate(new Date().toISOString()))}`,
        ].join("\n"),
    };
}

async function handleStatus(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const todayStart = getRiyadhTodayStartIso();
    const yesterdayStart = getRiyadhYesterdayStartIso();
    const [ordersActive, paymentsPending, supportActive, criticalUnread, errorsToday, designNew, ordersToday] = await Promise.all([
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "processing"])),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded")),
        count(ctx.supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"])),
        count(ctx.supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false).eq("severity", "critical")),
        count(ctx.supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("type", "error").gte("created_at", yesterdayStart)),
        count(ctx.supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).in("status", ["new", "awaiting_review", "modification_requested"])),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
    ]);

    return {
        text: [
            "<b>حالة وشّى الآن</b>",
            `طلبات اليوم: <b>${ordersToday.count}</b>`,
            `طلبات نشطة: <b>${ordersActive.count}</b>`,
            `مدفوعات معلّقة: <b>${paymentsPending.count}</b>`,
            `تذاكر دعم مفتوحة: <b>${supportActive.count}</b>`,
            `طلبات تصميم تحتاج متابعة: <b>${designNew.count}</b>`,
            `تنبيهات حرجة غير مقروءة: <b>${criticalUnread.count}</b>`,
            `أخطاء آخر 24 ساعة: <b>${errorsToday.count}</b>`,
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "مركز الطلبات", path: "/dashboard/orders/command-center" }, { text: "التنبيهات", path: "/dashboard/notifications" }],
        ]),
    };
}

async function handleToday(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const todayStart = getRiyadhTodayStartIso();
    const [ordersToday, paidOrdersToday, supportToday, designToday, paidRows] = await Promise.all([
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "paid").gte("created_at", todayStart)),
        count(ctx.supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
        count(ctx.supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
        rows<Record<string, unknown>>(ctx.supabase.from("orders").select("total").eq("payment_status", "paid").gte("created_at", todayStart)),
    ]);

    return {
        text: [
            "<b>ملخص اليوم في وشّى</b>",
            `الطلبات: <b>${ordersToday.count}</b>`,
            `طلبات مدفوعة: <b>${paidOrdersToday.count}</b>`,
            `إيراد مدفوع: <b>${h(money(sumRows(paidRows.data, "total")))}</b>`,
            `تذاكر دعم جديدة: <b>${supportToday.count}</b>`,
            `طلبات تصميم جديدة: <b>${designToday.count}</b>`,
            "",
            `بداية اليوم محسوبة بتوقيت الرياض من <code>${h(todayStart)}</code>.`,
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "التحليلات", path: "/dashboard/analytics" }, { text: "الدعم", path: "/dashboard/support" }],
        ]),
    };
}

async function handleOrders(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [pending, processing, shipped, latest] = await Promise.all([
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"])),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing")),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "shipped")),
        rows<Record<string, unknown>>(ctx.supabase
            .from("orders")
            .select("id, order_number, total, status, payment_status, created_at")
            .order("created_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>الطلبات</b>",
            `بانتظار التأكيد: <b>${pending.count}</b>`,
            `قيد التنفيذ: <b>${processing.count}</b>`,
            `مشحونة: <b>${shipped.count}</b>`,
            "",
            "<b>آخر 5 طلبات</b>",
            topLines(latest.data, (order, index) => {
                const number = order.order_number ?? order.id;
                return `${index + 1}. <code>${h(number)}</code> · ${h(label(order.status))} · ${h(label(order.payment_status))} · ${h(money(order.total))}`;
            }),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "مركز الطلبات", path: "/dashboard/orders/command-center" }, { text: "قائمة الطلبات", path: "/dashboard/orders" }],
        ]),
    };
}

async function handleOrder(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const key = ctx.args.join(" ").trim();
    if (!key) {
        return {
            text: [
                "<b>تفاصيل طلب</b>",
                "اكتب رقم الطلب بعد الأمر.",
                "مثال: <code>/order W-1234</code>",
            ].join("\n"),
        };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const query = ctx.supabase
        .from("orders")
        .select("id, order_number, status, payment_status, total, shipping_cost, tracking_number, courier_name, created_at, shipping_address")
        .limit(1);
    const result = isUuid ? await query.eq("id", key).maybeSingle() : await query.eq("order_number", key).maybeSingle();

    if (result.error) {
        return { text: `تعذر قراءة الطلب: ${h(result.error.message || result.error)}` };
    }

    const order = result.data as Record<string, any> | null;
    if (!order) {
        return { text: `لم أجد طلباً مطابقاً لـ <code>${h(key)}</code>.` };
    }

    const customer = order.shipping_address?.name || "—";
    const phone = order.shipping_address?.phone || "—";

    return {
        text: [
            `<b>طلب ${h(order.order_number ?? order.id)}</b>`,
            `الحالة: <b>${h(label(order.status))}</b>`,
            `الدفع: <b>${h(label(order.payment_status))}</b>`,
            `الإجمالي: <b>${h(money(order.total))}</b>`,
            `الشحن: ${h(money(order.shipping_cost))}`,
            `العميل: ${h(customer)}`,
            `الجوال: <code>${h(phone)}</code>`,
            `شركة الشحن: ${h(order.courier_name ?? "—")}`,
            `رقم التتبع: <code>${h(order.tracking_number ?? "—")}</code>`,
            `تاريخ الإنشاء: ${h(formatDate(order.created_at))}`,
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "فتح الطلب", path: `/dashboard/orders/${order.id}` }],
            [{ text: "مركز الطلبات", path: "/dashboard/orders/command-center" }],
        ]),
    };
}

async function handlePayments(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [pending, failed, paidToday, pendingRows, failedRows] = await Promise.all([
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded")),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed").neq("status", "cancelled").neq("status", "refunded")),
        rows<Record<string, unknown>>(ctx.supabase.from("orders").select("total").eq("payment_status", "paid").gte("created_at", getRiyadhTodayStartIso())),
        rows<Record<string, unknown>>(ctx.supabase.from("orders").select("id, order_number, total, status, created_at").eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded").order("created_at", { ascending: false }).limit(5)),
        rows<Record<string, unknown>>(ctx.supabase.from("orders").select("id, order_number, total, status, created_at").eq("payment_status", "failed").neq("status", "cancelled").neq("status", "refunded").order("created_at", { ascending: false }).limit(5)),
    ]);

    const pendingTotal = sumRows(pendingRows.data, "total");
    const failedTotal = sumRows(failedRows.data, "total");

    return {
        text: [
            "<b>المدفوعات والتحصيل</b>",
            `مدفوعات معلقة: <b>${pending.count}</b> · ${h(money(pendingTotal))}`,
            `مدفوعات فاشلة: <b>${failed.count}</b> · ${h(money(failedTotal))}`,
            `إيراد مدفوع اليوم: <b>${h(money(sumRows(paidToday.data, "total")))}</b>`,
            "",
            "<b>أحدث المدفوعات المعلقة</b>",
            topLines(pendingRows.data, (order, index) => `${index + 1}. <code>${h(order.order_number ?? order.id)}</code> · ${h(money(order.total))} · ${h(label(order.status))}`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "مركز الطلبات", path: "/dashboard/orders/command-center" }, { text: "التنبيهات", path: "/dashboard/notifications" }],
        ]),
    };
}

async function handleCod(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [deliveredUnpaid, rowsResult] = await Promise.all([
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered").neq("payment_status", "paid")),
        rows<Record<string, unknown>>(ctx.supabase
            .from("orders")
            .select("id, order_number, total, payment_status, created_at")
            .eq("status", "delivered")
            .neq("payment_status", "paid")
            .order("created_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>تعثر التحصيل / COD</b>",
            `طلبات مسلّمة وغير مدفوعة: <b>${deliveredUnpaid.count}</b>`,
            "",
            topLines(rowsResult.data, (order, index) => `${index + 1}. <code>${h(order.order_number ?? order.id)}</code> · ${h(label(order.payment_status))} · ${h(money(order.total))}`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "مركز الطلبات", path: "/dashboard/orders/command-center" }],
        ]),
    };
}

async function handleShipping(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [processing, shipped, delivered, missingTracking, latest] = await Promise.all([
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing")),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "shipped")),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered")),
        count(ctx.supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["processing", "shipped"]).is("tracking_number", null)),
        rows<Record<string, unknown>>(ctx.supabase
            .from("orders")
            .select("id, order_number, status, courier_name, tracking_number, torod_last_status, created_at")
            .in("status", ["processing", "shipped", "delivered"])
            .order("updated_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>الشحن</b>",
            `قيد التجهيز: <b>${processing.count}</b>`,
            `مشحونة: <b>${shipped.count}</b>`,
            `مسلّمة: <b>${delivered.count}</b>`,
            `بدون رقم تتبع: <b>${missingTracking.count}</b>`,
            "",
            "<b>آخر حركة شحن</b>",
            topLines(latest.data, (order, index) => `${index + 1}. <code>${h(order.order_number ?? order.id)}</code> · ${h(label(order.status))} · ${h(order.courier_name ?? "—")} · <code>${h(order.tracking_number ?? "—")}</code>`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "الشحن", path: "/dashboard/shipping" }, { text: "مركز الطلبات", path: "/dashboard/orders/command-center" }],
        ]),
    };
}

async function handleSupport(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [open, inProgress, high, stale, latest] = await Promise.all([
        count(ctx.supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open")),
        count(ctx.supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "in_progress")),
        count(ctx.supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("priority", "high").in("status", ["open", "in_progress"])),
        count(ctx.supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]).lte("created_at", staleThreshold)),
        rows<Record<string, unknown>>(ctx.supabase
            .from("support_tickets")
            .select("id, subject, status, priority, name, email, created_at")
            .in("status", ["open", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>الدعم الفني</b>",
            `مفتوحة: <b>${open.count}</b>`,
            `قيد المعالجة: <b>${inProgress.count}</b>`,
            `عاجلة: <b>${high.count}</b>`,
            `أقدم من 24 ساعة: <b>${stale.count}</b>`,
            "",
            "<b>آخر التذاكر المفتوحة</b>",
            topLines(latest.data, (ticket, index) => `${index + 1}. ${h(ticket.subject)} · ${h(label(ticket.priority))} · ${h(label(ticket.status))}`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "مركز الدعم", path: "/dashboard/support" }],
        ]),
    };
}

async function handleDesigns(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [newOrders, inProgress, review, modifications, latest] = await Promise.all([
        count(ctx.supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "new")),
        count(ctx.supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "in_progress")),
        count(ctx.supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "awaiting_review")),
        count(ctx.supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "modification_requested")),
        rows<Record<string, unknown>>(ctx.supabase
            .from("custom_design_orders")
            .select("id, order_number, customer_name, garment_name, status, created_at")
            .in("status", ["new", "in_progress", "awaiting_review", "modification_requested"])
            .order("created_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>طلبات التصميم وWASHA AI</b>",
            `جديدة: <b>${newOrders.count}</b>`,
            `قيد التنفيذ: <b>${inProgress.count}</b>`,
            `بانتظار المراجعة: <b>${review.count}</b>`,
            `طلبات تعديل: <b>${modifications.count}</b>`,
            "",
            "<b>آخر الطلبات</b>",
            topLines(latest.data, (order, index) => `${index + 1}. <code>${h(order.order_number ?? order.id)}</code> · ${h(order.garment_name ?? "تصميم")} · ${h(label(order.status))}`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "طلبات التصميم", path: "/dashboard/design-orders" }, { text: "DTF Monitor", path: "/dashboard/design-orders/dtf-monitor" }],
        ]),
    };
}

async function handleStock(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [productRows, erpRows] = await Promise.all([
        rows<Record<string, unknown>>(ctx.supabase
            .from("products")
            .select("id, title, stock_quantity, in_stock")
            .or("in_stock.eq.false,stock_quantity.lte.5")
            .order("stock_quantity", { ascending: true, nullsFirst: false })
            .limit(5)),
        rows<Record<string, unknown>>(ctx.supabase
            .from("inventory_levels")
            .select("sku_id, quantity")
            .lte("quantity", 5)
            .order("quantity", { ascending: true })
            .limit(8)),
    ]);

    const skuIds = erpRows.data.map((item) => String(item.sku_id)).filter(Boolean);
    const skuRows = skuIds.length
        ? await rows<Record<string, unknown>>(ctx.supabase.from("product_skus").select("id, sku, size, color_code").in("id", skuIds))
        : { data: [] };
    const skuById = new Map(skuRows.data.map((item) => [String(item.id), item]));

    return {
        text: [
            "<b>المخزون المنخفض والنافد</b>",
            "",
            "<b>منتجات المتجر</b>",
            topLines(productRows.data, (product, index) => {
                const quantity = product.stock_quantity ?? (product.in_stock === false ? "نافد" : "—");
                return `${index + 1}. ${h(product.title)} · الكمية: <b>${h(quantity)}</b>`;
            }),
            "",
            "<b>ERP / SKU</b>",
            topLines(erpRows.data, (level, index) => {
                const sku = skuById.get(String(level.sku_id));
                return `${index + 1}. <code>${h(sku?.sku ?? level.sku_id)}</code> · الكمية: <b>${h(level.quantity)}</b>`;
            }),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "مخزون المنتجات", path: "/dashboard/products-inventory" }, { text: "ERP", path: "/dashboard/inventory" }],
        ]),
    };
}

async function handleNotifications(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const [unread, critical, latest] = await Promise.all([
        count(ctx.supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false)),
        count(ctx.supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false).eq("severity", "critical")),
        rows<Record<string, unknown>>(ctx.supabase
            .from("admin_notifications")
            .select("id, title, category, severity, created_at, link")
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>تنبيهات الأدمن</b>",
            `غير مقروءة: <b>${unread.count}</b>`,
            `حرجة: <b>${critical.count}</b>`,
            "",
            topLines(latest.data, (item, index) => `${index + 1}. ${h(item.title)} · ${h(label(item.category))} · ${h(label(item.severity))}`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "فتح التنبيهات", path: "/dashboard/notifications" }],
        ]),
    };
}

async function handleErrors(ctx: TelegramCommandContext): Promise<TelegramCommandResponse> {
    const since = getRiyadhYesterdayStartIso();
    const [errorsCount, latest] = await Promise.all([
        count(ctx.supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("type", "error").gte("created_at", since)),
        rows<Record<string, unknown>>(ctx.supabase
            .from("system_logs")
            .select("id, source, message, created_at")
            .eq("type", "error")
            .order("created_at", { ascending: false })
            .limit(5)),
    ]);

    return {
        text: [
            "<b>أخطاء النظام</b>",
            `آخر 24 ساعة: <b>${errorsCount.count}</b>`,
            "",
            topLines(latest.data, (item, index) => `${index + 1}. ${h(item.source ?? "system")} · ${h(String(item.message ?? "خطأ").slice(0, 90))} · ${h(formatDate(String(item.created_at)))}`),
        ].join("\n"),
        replyMarkup: keyboard(ctx.appUrl, [
            [{ text: "سجل النشاط", path: "/dashboard/activity-log" }, { text: "التنبيهات", path: "/dashboard/notifications" }],
        ]),
    };
}

const handlers: Record<string, (ctx: TelegramCommandContext) => Promise<TelegramCommandResponse>> = {
    start: handleStart,
    help: handleHelp,
    status: handleStatus,
    today: handleToday,
    orders: handleOrders,
    order: handleOrder,
    payments: handlePayments,
    cod: handleCod,
    shipping: handleShipping,
    support: handleSupport,
    designs: handleDesigns,
    stock: handleStock,
    low_stock: handleStock,
    notifications: handleNotifications,
    errors: handleErrors,
    test: handleTest,
};

export function getTelegramCommandList() {
    return TELEGRAM_BOT_COMMANDS;
}

export async function processTelegramUpdate(update: TelegramUpdate) {
    const envelope = getTelegramUpdateEnvelope(update);
    const parsed = parseCommand(envelope.text);

    if (!parsed) {
        return { handled: false, reason: "not_command" };
    }

    const supabase = getSupabaseAdminClient() as any;
    const ctx: TelegramCommandContext = {
        update,
        envelope,
        command: parsed.command,
        args: parsed.args,
        appUrl: getTelegramAppUrl(),
        supabase,
    };

    const handler = handlers[parsed.command];
    const response = handler
        ? await handler(ctx)
        : {
            text: [
                `الأمر <code>/${h(parsed.command)}</code> غير معروف.`,
                "",
                helpText(),
            ].join("\n"),
        };

    try {
        const sendResult = await sendTelegramMessage({
            chatId: envelope.chatId ?? undefined,
            text: response.text,
            replyMarkup: response.replyMarkup,
            disableWebPagePreview: true,
        });
        if (!sendResult.ok) {
            throw new Error(sendResult.error || sendResult.description || "Telegram reply failed");
        }
        await logCommand(ctx, COMMAND_NAMES.has(parsed.command) ? "handled" : "ignored");
        return { handled: true, command: parsed.command };
    } catch (error) {
        await logCommand(ctx, "failed", error instanceof Error ? error.message : String(error));
        throw error;
    }
}
