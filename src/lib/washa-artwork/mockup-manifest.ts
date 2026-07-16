import type { ArtworkSide } from "@/lib/washa-artwork/types";

export function selectSideSpecificCatalogReference(input: {
    side: ArtworkSide;
    sizeFrontUrl?: string | null;
    sizeBackUrl?: string | null;
    colorFrontUrl?: string | null;
}) {
    if (input.side === "back") {
        return input.sizeBackUrl?.trim() || null;
    }
    return input.sizeFrontUrl?.trim() || input.colorFrontUrl?.trim() || null;
}
