import type { GenerationContext } from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";

export type BoardPromptTemplate = string & {
    readonly __boardPromptTemplate: unique symbol;
};

export const REQUIRED_BOARD_PROMPT_PLACEHOLDERS = [
    "{{GARMENT_COLOR}}",
    "{{GARMENT_VIEW}}",
    "{{PLACEMENT}}",
    "{{WIDTH}}",
    "{{HEIGHT}}",
    "{{DESIGN_DESCRIPTION}}",
    "{{STYLE}}",
    "{{TEXT_BLOCK}}",
] as const;

export const DEFAULT_BOARD_PROMPT_TEMPLATE = `Create one premium streetwear custom-design presentation board as a single vertical image.

OUTPUT FORMAT:
- Vertical 4:5 aspect ratio
- Minimum 4K quality
- Premium editorial fashion presentation
- Clean, precise panel layout
- The board must contain exactly 4 sections

PRESENTATION LAYOUT:
1. HERO — the largest section, occupying approximately 60–65% of the upper presentation area. Place a realistic premium oversized box-fit t-shirt on the left side, {{GARMENT_VIEW}} view, in color {{GARMENT_COLOR}}. Show the complete garment and the complete printed design without cropping.
2. DETAIL 01 — a smaller close-up panel at the upper right. Select one meaningful artwork detail such as the main subject, typography, fine linework, or print edge.
3. DETAIL 02 — a second smaller close-up panel below DETAIL 01. Select a visibly different portion of the same artwork. Never repeat the first crop.
4. FULL DESIGN — one large lower production-specification section labeled exactly:
   FULL DESIGN
   التصميم كامل

THE DESIGN:
{{DESIGN_DESCRIPTION}}

Art style: {{STYLE}}
{{TEXT_BLOCK}}
Do not create additional wording, fake text, logos, symbols, or decorative elements.

GARMENT SPECIFICATION:
- Premium oversized box-fit t-shirt
- Short, wide streetwear proportions; dropped shoulders; structured sleeves
- Premium ribbed collar; realistic heavyweight construction
- 100% heavyweight cotton, 280–300 GSM
- Matte finish, natural cotton texture, realistic fabric weave
- Keep the silhouette wide and boxy, never excessively long

PRINT PLACEMENT:
The custom design is printed on the {{PLACEMENT}} at an approximate size of {{WIDTH}}cm × {{HEIGHT}}cm.
Keep the correct proportional scale. Do not stretch, distort, crop, or enlarge the artwork beyond realistic production limits.

PRINT INTEGRATION:
Make the artwork look genuinely printed into the fabric. It must follow natural folds, preserve the cotton texture beneath the ink, remain sharp, and have clean DTF-quality edges. No rectangular background, white box, floating effect, sticker effect, artificial gloss, or inflated effect.

FULL DESIGN SPECIFICATION:
The isolated artwork in the lower section must be fully visible, centered, uncropped, flat, and visually identical to the print and both detail panels. No garment folds, perspective distortion, mockup shadow, decorative frame, extra graphics, or artificial background behind it.

MEASUREMENT GUIDE:
Align measurement arrows precisely with the visible artwork boundaries only, never transparent space.
- Horizontal label: العرض: {{WIDTH}} سم / WIDTH: {{WIDTH}} CM
- Vertical label: الارتفاع: {{HEIGHT}} سم / HEIGHT: {{HEIGHT}} CM

COLOR PALETTE:
Show a small row of up to five clean color swatches derived only from the artwork. Maintain exact color consistency between the shirt print, DETAIL 01, DETAIL 02, isolated artwork, and swatches.

LIGHTING AND BACKGROUND:
Use soft professional studio light from the upper left with controlled shadows. Reveal the heavyweight cotton, folds, print integration, sharpness, and boxy silhouette. Use a clean neutral Ice Vanilla, Light Beige, Soft Concrete, or Muted Charcoal editorial background. No props or decorative objects.

CAMERA AND STYLE:
Use a realistic 50mm-lens appearance, slight natural perspective, and accurate proportions. No fisheye or extreme wide-angle distortion. The board must feel premium, modern, calm, refined, collectible, fashion-forward, and appropriate for a luxury Saudi streetwear brand.

MANDATORY RULES:
- Use exactly 4 presentation sections.
- The hero t-shirt section must be the largest.
- Stack and align the two smaller detail panels beside it.
- Make the lower FULL DESIGN section large and readable.
- Use the exact same artwork in every section.
- Display width and height clearly in centimeters.
- Do not constrain the design inside circles, frames, or badges.
- Do not invent generic Saudi imagery or any unrequested element.
- Do not generate any text other than explicitly requested wording, panel labels, and measurement labels.
- The final output must look like a professional luxury streetwear production-approval board.` as BoardPromptTemplate;

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

const BOARD_PLACEHOLDER_PATTERN = /\{\{(?:GARMENT_COLOR|GARMENT_VIEW|PLACEMENT|WIDTH|HEIGHT|DESIGN_DESCRIPTION|STYLE|TEXT_BLOCK)\}\}/g;
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
        "{{GARMENT_VIEW}}": input.generationContext.printPosition === "back" ? "back" : "front",
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
