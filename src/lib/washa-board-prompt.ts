import type { GenerationContext } from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";

export type BoardPromptTemplate = string & {
    readonly __boardPromptTemplate: unique symbol;
};

export const REQUIRED_BOARD_PROMPT_PLACEHOLDERS = [
    "{{GARMENT_COLOR}}",
    "{{PLACEMENT}}",
    "{{WIDTH}}",
    "{{HEIGHT}}",
    "{{DESIGN_DESCRIPTION}}",
    "{{STYLE}}",
    "{{TEXT_BLOCK}}",
] as const;

export const DEFAULT_BOARD_PROMPT_TEMPLATE = `Create a premium streetwear apparel presentation board. Single image, square 1:1 composition, high resolution.

═══ LAYOUT — one square image split into two stacked zones ═══

TOP ZONE (upper ~55%):
A realistic premium oversized boxy t-shirt, front view, in color {{GARMENT_COLOR}}.
The custom design is printed on the {{PLACEMENT}} at an approximate size of {{WIDTH}}cm × {{HEIGHT}}cm.
The print must look genuinely integrated into the fabric — following folds, preserving cotton texture, clean DTF edges, NO white box, NO sticker effect, NO floating rectangle.
Studio lighting, soft shadows, neutral background.

BOTTOM ZONE (lower ~45%):
The SAME design shown flat and complete, isolated on a neutral background, centered, uncropped, no garment, no folds, no perspective.
This must be visually identical to the print in the top zone.

Below the flat design, show simple indicative measurement guides:
- horizontal line labeled with the width
- vertical line labeled with the height
Keep measurement text minimal and in Latin numerals only (e.g. "40 cm", "27 cm").
These measurements are INDICATIVE ONLY.

═══ THE DESIGN ═══

{{DESIGN_DESCRIPTION}}

Art style: {{STYLE}}
{{TEXT_BLOCK}}

═══ HARD RULES ═══
- The design in both zones must be identical.
- Do NOT invent extra graphics, logos, badges, or frames.
- Do NOT generate any text other than what is explicitly requested and the measurement labels.
- Do NOT write Arabic text as image content unless it is part of the requested design.
- Keep the whole board clean, minimal, editorial, premium.` as BoardPromptTemplate;

const PLACEMENT_LABELS: Record<GenerationContext["printPosition"], string> = {
    chest: "front chest",
    back: "back",
    shoulder_right: "right shoulder",
    shoulder_left: "left shoulder",
};

// نسخة يدوية من أبعاد الطباعة، منفصلة عمدًا عن
// getDefaultPrintDimensions() في المسار الأساسي للحفاظ على
// العزل. لو تغيّرت الأبعاد الأساسية، حدّث هنا يدويًا.
// القياسات هنا تقريبية للعرض فقط؛ الموظف يؤكد النهائي.
const SHOULDER_DIMENSIONS_CM = { width: 10, height: 10 } as const;
const CHEST_BACK_DIMENSIONS_CM = {
    small: { width: 18, height: 18 },
    large: { width: 30, height: 40 },
} as const;

const BOARD_PLACEHOLDER_PATTERN = /\{\{(?:GARMENT_COLOR|PLACEMENT|WIDTH|HEIGHT|DESIGN_DESCRIPTION|STYLE|TEXT_BLOCK)\}\}/g;
const UNSUPPORTED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function sanitizeBoardText(value: string) {
    return value
        .replace(/\r\n?/g, "\n")
        .replace(UNSUPPORTED_CONTROL_CHARACTERS, "")
        .trim();
}

function formatDimension(value: number) {
    return Number(value.toFixed(1)).toString();
}

function resolveBoardDimensions(generationContext: GenerationContext) {
    const base = generationContext.printPosition === "shoulder_left"
        || generationContext.printPosition === "shoulder_right"
        ? SHOULDER_DIMENSIONS_CM
        : CHEST_BACK_DIMENSIONS_CM[generationContext.printSize];
    const requestedScale = generationContext.printScale ?? 100;
    const scale = Math.min(Math.max(requestedScale, 35), 100) / 100;
    return {
        width: formatDimension(base.width * scale),
        height: formatDimension(base.height * scale),
    };
}

export function getMissingBoardPromptPlaceholders(value: unknown) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return [...REQUIRED_BOARD_PROMPT_PLACEHOLDERS];
    }
    return REQUIRED_BOARD_PROMPT_PLACEHOLDERS.filter(
        (placeholder) => !value.includes(placeholder)
    );
}

export function normalizeBoardPromptTemplate(value: unknown): BoardPromptTemplate {
    if (
        typeof value !== "string"
        || getMissingBoardPromptPlaceholders(value).length > 0
    ) {
        return DEFAULT_BOARD_PROMPT_TEMPLATE;
    }
    return value as BoardPromptTemplate;
}

export function renderBoardPrompt(input: {
    template: BoardPromptTemplate | string;
    prompt: string;
    generationContext: GenerationContext;
}) {
    const template = normalizeBoardPromptTemplate(input.template);
    const dimensions = resolveBoardDimensions(input.generationContext);
    const calligraphyText = sanitizeBoardText(input.generationContext.calligraphyText ?? "");
    const technique = sanitizeBoardText(input.generationContext.technique ?? "");
    const replacements: Record<(typeof REQUIRED_BOARD_PROMPT_PLACEHOLDERS)[number], string> = {
        "{{GARMENT_COLOR}}": sanitizeBoardText(input.generationContext.garmentColor),
        "{{PLACEMENT}}": PLACEMENT_LABELS[input.generationContext.printPosition],
        "{{WIDTH}}": dimensions.width,
        "{{HEIGHT}}": dimensions.height,
        "{{DESIGN_DESCRIPTION}}": sanitizeBoardText(input.prompt),
        "{{STYLE}}": technique || input.generationContext.designMethod || "modern",
        "{{TEXT_BLOCK}}": calligraphyText
            ? `Include this exact text in the design: ${JSON.stringify(calligraphyText)}.`
            : "No text in the design.",
    };

    return template.replace(
        BOARD_PLACEHOLDER_PATTERN,
        (placeholder) => replacements[placeholder as keyof typeof replacements]
    );
}
