import { describe, expect, it } from "vitest";

import { decodeBoardImageDataUrl } from "@/app/api/washa-dtf-studio/services/board-image-provider.adapter";

describe("board image provider payload decoding", () => {
    it("decodes a multi-megabyte provider image without overflowing the JS stack", () => {
        const payload = Buffer.alloc(12 * 1024 * 1024, 0x41);
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(payload, 0);
        const dataUrl = `data:image/png;base64,${payload.toString("base64")}`;

        const decoded = decodeBoardImageDataUrl(dataUrl);

        expect(decoded.contentType).toBe("image/png");
        expect(decoded.buffer.length).toBe(payload.length);
        expect(decoded.buffer.equals(payload)).toBe(true);
    });

    it.each([
        "data:image/png;base64,AAAA=",
        "data:image/png;base64,AAA!",
        "data:image/png;base64,AA=A",
    ])("rejects malformed canonical base64 without decoding it: %s", (dataUrl) => {
        expect(() => decodeBoardImageDataUrl(dataUrl)).toThrow(
            "Board provider returned invalid base64 image data."
        );
    });
});
