import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
    BOARD_IMAGE_HEIGHT,
    BOARD_IMAGE_WIDTH,
    normalizeBoardImageBuffer,
} from "@/lib/board-image-normalization";

describe("board image normalization", () => {
    it("produces an exact 4:5 4K-class WebP board", async () => {
        const source = await sharp({
            create: {
                width: 80,
                height: 120,
                channels: 3,
                background: "#343432",
            },
        }).png().toBuffer();

        const dataUrl = await normalizeBoardImageBuffer(source);
        const output = Buffer.from(dataUrl.split(",")[1], "base64");
        const metadata = await sharp(output).metadata();

        expect(dataUrl).toMatch(/^data:image\/webp;base64,/);
        expect(BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT).toBe(4 / 5);
        expect(metadata).toMatchObject({
            format: "webp",
            width: 3200,
            height: 4000,
        });
    });
});
