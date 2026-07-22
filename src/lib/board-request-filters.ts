export type BoardRequestStatusFilter = "ready" | "failed";
export type BoardManualPrintFilter =
    | "all"
    | "pending"
    | "in_progress"
    | "completed";

export function normalizeBoardRequestStatus(
    value: unknown
): BoardRequestStatusFilter {
    return value === "failed" ? "failed" : "ready";
}

export function normalizeBoardManualPrintFilter(
    value: unknown
): BoardManualPrintFilter {
    return value === "all"
        || value === "in_progress"
        || value === "completed"
        ? value
        : "pending";
}
