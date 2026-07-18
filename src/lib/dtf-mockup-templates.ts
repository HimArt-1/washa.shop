import type { PrintPosition, PrintSize } from "@/lib/design-intelligence";

export type DtfMockupSide = "front" | "back";

export type DtfMockupPrintArea = {
    print_position: PrintPosition;
    print_size: PrintSize;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    physical_width_cm: number | null;
    physical_height_cm: number | null;
};

export type DtfMockupTemplate = {
    id: string;
    garment_id: string;
    color_id: string | null;
    side: DtfMockupSide;
    base_image_url: string;
    base_image_path: string | null;
    mask_image_url: string | null;
    mask_image_path: string | null;
    overlay_image_url: string | null;
    overlay_image_path: string | null;
    print_areas: DtfMockupPrintArea[];
    version: number;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type ResolvedDtfMockupTemplate = {
    template: DtfMockupTemplate;
    area: DtfMockupPrintArea;
};

type ResolveDtfMockupTemplateInput = {
    garmentId: string;
    colorId: string | null;
    printPosition: PrintPosition;
    printSize: PrintSize;
};

const NORMALIZED_MIN = 0;
const NORMALIZED_MAX = 1;

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
    return typeof value === "number"
        && Number.isFinite(value)
        && value >= min
        && value <= max;
}

function isDtfMockupPrintArea(value: unknown): value is DtfMockupPrintArea {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const area = value as Partial<DtfMockupPrintArea>;
    const validPosition = area.print_position === "chest"
        || area.print_position === "back"
        || area.print_position === "shoulder_right"
        || area.print_position === "shoulder_left";
    const validSize = area.print_size === "large" || area.print_size === "small";

    return validPosition
        && validSize
        && isFiniteInRange(area.x, NORMALIZED_MIN, NORMALIZED_MAX)
        && isFiniteInRange(area.y, NORMALIZED_MIN, NORMALIZED_MAX)
        && isFiniteInRange(area.width, 0.01, NORMALIZED_MAX)
        && isFiniteInRange(area.height, 0.01, NORMALIZED_MAX)
        && area.x + area.width <= NORMALIZED_MAX
        && area.y + area.height <= NORMALIZED_MAX
        && isFiniteInRange(area.rotation, -180, 180)
        && (area.physical_width_cm === null || isFiniteInRange(area.physical_width_cm, 1, 200))
        && (area.physical_height_cm === null || isFiniteInRange(area.physical_height_cm, 1, 200));
}

export function normalizeDtfMockupPrintAreas(value: unknown): DtfMockupPrintArea[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isDtfMockupPrintArea);
}

export function getDtfMockupSide(printPosition: PrintPosition): DtfMockupSide {
    return printPosition === "back" ? "back" : "front";
}

export function resolveDtfMockupTemplate(
    templates: DtfMockupTemplate[],
    input: ResolveDtfMockupTemplateInput
): ResolvedDtfMockupTemplate | null {
    const side = getDtfMockupSide(input.printPosition);
    const candidates = templates
        .filter((template) => (
            template.is_active
            && template.garment_id === input.garmentId
            && template.side === side
            && (template.color_id === input.colorId || template.color_id === null)
        ))
        .map((template) => {
            const area = normalizeDtfMockupPrintAreas(template.print_areas).find((candidate) => (
                candidate.print_position === input.printPosition
                && candidate.print_size === input.printSize
            ));
            return area ? { template, area } : null;
        })
        .filter((candidate): candidate is ResolvedDtfMockupTemplate => candidate !== null)
        .sort((left, right) => {
            const leftColorRank = left.template.color_id === input.colorId ? 0 : 1;
            const rightColorRank = right.template.color_id === input.colorId ? 0 : 1;
            if (leftColorRank !== rightColorRank) return leftColorRank - rightColorRank;
            if (left.template.sort_order !== right.template.sort_order) {
                return left.template.sort_order - right.template.sort_order;
            }
            return right.template.version - left.template.version;
        });

    return candidates[0] ?? null;
}
