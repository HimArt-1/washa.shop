import sharp from "sharp";
import type { NormalizedPrintArea } from "@/lib/washa-artwork/types";

function parseHexColor(value: string | null | undefined) {
    const match = value?.trim().match(/^#?([a-f0-9]{6})$/i);
    if (!match) return null;
    return {
        r: Number.parseInt(match[1].slice(0, 2), 16),
        g: Number.parseInt(match[1].slice(2, 4), 16),
        b: Number.parseInt(match[1].slice(4, 6), 16),
    };
}

export async function validateGeneratedBlankGarment(params: {
    buffer: Buffer;
    colorHex?: string | null;
    printArea: NormalizedPrintArea;
    minDimension: number;
}) {
    const image = sharp(params.buffer, { failOn: "error", animated: false }).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const errors: string[] = [];
    if (!width || !height) errors.push("Generated blank garment is unreadable.");
    if (width < params.minDimension || height < params.minDimension) {
        errors.push("Generated blank garment resolution is too small.");
    }
    if (errors.length) return { valid: false, errors, width, height };

    const left = Math.max(0, Math.round(params.printArea.x * width));
    const top = Math.max(0, Math.round(params.printArea.y * height));
    const cropWidth = Math.max(
        1,
        Math.min(width - left, Math.round(params.printArea.width * width))
    );
    const cropHeight = Math.max(
        1,
        Math.min(height - top, Math.round(params.printArea.height * height))
    );
    const crop = image.clone().extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
    });
    const stats = await crop.stats();
    const entropy = stats.entropy ?? 0;
    const minEntropy = Number.parseFloat(
        process.env.WASHA_DTF_MIN_GARMENT_PRINT_AREA_ENTROPY || "0.15"
    );
    if (entropy < minEntropy) {
        errors.push("Generated blank garment print area is empty or visually invalid.");
    }

    const requestedColor = parseHexColor(params.colorHex);
    if (requestedColor && stats.channels.length >= 3) {
        const average = {
            r: stats.channels[0].mean,
            g: stats.channels[1].mean,
            b: stats.channels[2].mean,
        };
        const colorDistance = Math.hypot(
            average.r - requestedColor.r,
            average.g - requestedColor.g,
            average.b - requestedColor.b
        );
        const maxColorDistance = Number.parseInt(
            process.env.WASHA_DTF_MAX_GARMENT_COLOR_DISTANCE || "170",
            10
        );
        if (colorDistance > maxColorDistance) {
            errors.push("Generated blank garment does not match the selected color closely enough.");
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        width,
        height,
        printAreaEntropy: entropy,
    };
}
