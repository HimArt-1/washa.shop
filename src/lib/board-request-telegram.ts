import "server-only";

import { OperationTimeoutError, withTimeout } from "@/lib/async-timeout";
import { escapeAdminNotificationHtml } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import type { GenerationContext } from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";

const BOARD_TELEGRAM_TIMEOUT_MS = 2_500;
const MAX_CUSTOMER_DESCRIPTION_HTML_LENGTH = 1_200;
const MAX_BOARD_URL_HTML_LENGTH = 1_000;

const PRINT_POSITION_LABELS: Record<GenerationContext["printPosition"], string> = {
    chest: "الصدر الأمامي",
    back: "الظهر",
    shoulder_right: "الكتف الأيمن",
    shoulder_left: "الكتف الأيسر",
};

const PRINT_SIZE_LABELS: Record<GenerationContext["printSize"], string> = {
    large: "كبير",
    small: "صغير",
};

export interface BoardRequestTelegramInput {
    boardRequestId: string;
    boardImageUrl: string;
    customerDescription: string;
    generationContext: GenerationContext;
}

export type BoardRequestTelegramResult =
    | { ok: true }
    | {
        ok: false;
        reason: "not_configured" | "delivery_failed" | "timed_out";
    };

function escapeBoundedHtml(value: unknown, maxLength: number) {
    const source = String(value ?? "").trim();
    if (!source) return "—";

    let escaped = "";
    for (const character of source) {
        const next = escapeAdminNotificationHtml(character);
        if (escaped.length + next.length > maxLength) {
            return `${escaped}…`;
        }
        escaped += next;
    }
    return escaped;
}

function buildBoardRequestMessage(input: BoardRequestTelegramInput) {
    const context = input.generationContext;
    const scale = context.printScale ?? 100;

    return [
        "⚠️ طلب احتياطي يحتاج تركيب طباعة يدوي",
        "",
        `معرّف اللوحة: ${escapeAdminNotificationHtml(input.boardRequestId)}`,
        `القطعة: ${escapeAdminNotificationHtml(context.garmentType)}`,
        `اللون: ${escapeAdminNotificationHtml(context.garmentColor)}`,
        `الموضع: ${escapeAdminNotificationHtml(PRINT_POSITION_LABELS[context.printPosition])}`,
        `الأبعاد المطلوبة: ${escapeAdminNotificationHtml(PRINT_SIZE_LABELS[context.printSize])} — المقياس ${escapeAdminNotificationHtml(scale)}%`,
        `رابط اللوحة: ${escapeBoundedHtml(input.boardImageUrl, MAX_BOARD_URL_HTML_LENGTH)}`,
        `وصف العميل: ${escapeBoundedHtml(input.customerDescription, MAX_CUSTOMER_DESCRIPTION_HTML_LENGTH)}`,
    ].join("\n");
}

function isMissingConfiguration(error: unknown) {
    return typeof error === "string" && /not configured/i.test(error);
}

export async function notifyBoardRequestReady(
    input: BoardRequestTelegramInput
): Promise<BoardRequestTelegramResult> {
    try {
        const result = await withTimeout(
            sendTelegramMessage({
                text: buildBoardRequestMessage(input),
                parseMode: "HTML",
                disableWebPagePreview: true,
            }),
            BOARD_TELEGRAM_TIMEOUT_MS,
            "notifyBoardRequestReady"
        );

        if (result.ok) return { ok: true };
        return {
            ok: false,
            reason: isMissingConfiguration(result.error)
                ? "not_configured"
                : "delivery_failed",
        };
    } catch (error) {
        return {
            ok: false,
            reason: error instanceof OperationTimeoutError
                ? "timed_out"
                : "delivery_failed",
        };
    }
}
