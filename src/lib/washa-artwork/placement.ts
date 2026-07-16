import type {
    ArtworkSide,
    NormalizedPrintArea,
    PlacementTransform,
} from "@/lib/washa-artwork/types";

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function getDefaultPrintDimensions(
    printPosition: "chest" | "back" | "shoulder_right" | "shoulder_left",
    printSize: "large" | "small"
) {
    if (printPosition === "shoulder_right" || printPosition === "shoulder_left") {
        return { printWidthCm: 10, printHeightCm: 10 };
    }
    if (printSize === "small") return { printWidthCm: 18, printHeightCm: 18 };
    return { printWidthCm: 30, printHeightCm: 40 };
}

export function getDefaultPrintArea(
    printPosition: "chest" | "back" | "shoulder_right" | "shoulder_left"
): NormalizedPrintArea {
    if (printPosition === "back") {
        return { x: 0.29, y: 0.20, width: 0.42, height: 0.50 };
    }
    if (printPosition === "shoulder_right") {
        return { x: 0.23, y: 0.24, width: 0.17, height: 0.18 };
    }
    if (printPosition === "shoulder_left") {
        return { x: 0.60, y: 0.24, width: 0.17, height: 0.18 };
    }
    return { x: 0.30, y: 0.22, width: 0.40, height: 0.46 };
}

export function normalizePrintArea(
    value: Partial<NormalizedPrintArea> | null | undefined,
    fallback: NormalizedPrintArea
): NormalizedPrintArea {
    const x = clamp(Number(value?.x ?? fallback.x), 0, 1);
    const y = clamp(Number(value?.y ?? fallback.y), 0, 1);
    const width = clamp(Number(value?.width ?? fallback.width), 0.01, 1 - x);
    const height = clamp(Number(value?.height ?? fallback.height), 0.01, 1 - y);
    return { x, y, width, height };
}

export function buildPlacementTransform(input: {
    side: ArtworkSide;
    printPosition: "chest" | "back" | "shoulder_right" | "shoulder_left";
    printSize: "large" | "small";
    scalePercent?: number | null;
    offsetXPercent?: number | null;
    offsetYPercent?: number | null;
    rotation?: number | null;
    printWidthCm?: number | null;
    printHeightCm?: number | null;
    anchorX?: number | null;
    anchorY?: number | null;
    referenceMockupId?: string | null;
    printAreaId?: string | null;
}): PlacementTransform {
    const dimensions = getDefaultPrintDimensions(input.printPosition, input.printSize);
    const scale = clamp(Number(input.scalePercent ?? 100) / 100, 0.35, 1);
    const offsetX = clamp(Number(input.offsetXPercent ?? 0) / 100, -0.45, 0.45);
    const offsetY = clamp(Number(input.offsetYPercent ?? 0) / 100, -0.45, 0.45);

    return {
        side: input.side,
        x: clamp(0.5 + offsetX, 0, 1),
        y: clamp(0.5 + offsetY, 0, 1),
        scale,
        rotation: clamp(Number(input.rotation ?? 0), -180, 180),
        printWidthCm: Math.max(
            1,
            Number(input.printWidthCm ?? dimensions.printWidthCm * scale)
        ),
        printHeightCm: Math.max(
            1,
            Number(input.printHeightCm ?? dimensions.printHeightCm * scale)
        ),
        anchorX: clamp(Number(input.anchorX ?? 0.5), 0, 1),
        anchorY: clamp(Number(input.anchorY ?? 0.5), 0, 1),
        referenceMockupId: input.referenceMockupId ?? null,
        printAreaId: input.printAreaId?.trim() || `${input.side}_default`,
        transformVersion: 1,
    };
}

export function placementFitsPrintArea(
    placement: PlacementTransform,
    artworkAspectRatio: number
) {
    const safeAspect = Number.isFinite(artworkAspectRatio) && artworkAspectRatio > 0
        ? artworkAspectRatio
        : 1;
    let normalizedWidth = placement.scale;
    let normalizedHeight = placement.scale;
    if (safeAspect > 1) normalizedHeight /= safeAspect;
    else normalizedWidth *= safeAspect;

    const left = placement.x - normalizedWidth * placement.anchorX;
    const right = left + normalizedWidth;
    const top = placement.y - normalizedHeight * placement.anchorY;
    const bottom = top + normalizedHeight;
    return left >= 0 && top >= 0 && right <= 1 && bottom <= 1;
}
