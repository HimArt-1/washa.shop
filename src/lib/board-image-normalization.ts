import "server-only";

import sharp from "sharp";

export const BOARD_IMAGE_WIDTH = 3200;
export const BOARD_IMAGE_HEIGHT = 4000;
const MAX_BOARD_IMAGE_BYTES = 25 * 1024 * 1024;

export async function normalizeBoardImageBuffer(buffer: Buffer) {
    const normalized = await sharp(buffer, { failOn: "error" })
        .rotate()
        .resize({
            width: BOARD_IMAGE_WIDTH,
            height: BOARD_IMAGE_HEIGHT,
            fit: "contain",
            background: { r: 244, g: 240, b: 230, alpha: 1 },
            withoutEnlargement: false,
        })
        .webp({ quality: 94, effort: 5, smartSubsample: true })
        .toBuffer();

    if (normalized.length === 0 || normalized.length > MAX_BOARD_IMAGE_BYTES) {
        throw new Error("Normalized board image exceeded the image size limit.");
    }
    return `data:image/webp;base64,${normalized.toString("base64")}`;
}
