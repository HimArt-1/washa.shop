import type { CustomDesignOrder, DesignPricingSnapshotDtf } from "@/types/database";

export type WashaAiOrderVersion = "v3" | null;

type WashaAiOrderVersionSource = Pick<CustomDesignOrder, "design_method" | "pricing_snapshot">;

export function getWashaAiOrderVersion(order: WashaAiOrderVersionSource): WashaAiOrderVersion {
    if (order.design_method !== "studio") return null;

    const snapshot = order.pricing_snapshot;
    if (!snapshot || !("dtf" in snapshot) || snapshot.dtf !== true) return null;

    return (snapshot as DesignPricingSnapshotDtf).washa_ai_version === "v3" ? "v3" : null;
}

export function getWashaAiOrderBadgeLabel(order: WashaAiOrderVersionSource) {
    return getWashaAiOrderVersion(order) === "v3" ? "WASHA AI V3" : "WASHA AI";
}
