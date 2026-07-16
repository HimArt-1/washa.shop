const MAX_PROVIDER_IMAGE_BYTES = 25 * 1024 * 1024;

export function dataUrlToBuffer(value: string) {
    const match = value.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) return null;
    const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    return { buffer, mimeType: match[1].toLowerCase() };
}

export async function materializeImageSource(
    source: string,
    options: { timeoutMs?: number; maxBytes?: number } = {}
) {
    const inline = dataUrlToBuffer(source);
    if (inline) {
        if (inline.buffer.byteLength > (options.maxBytes ?? MAX_PROVIDER_IMAGE_BYTES)) {
            throw new Error("Generated image exceeds the maximum supported size.");
        }
        return inline;
    }

    const url = new URL(source);
    if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Generated image source must be a data URL or HTTP(S) URL.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-store",
            headers: { Accept: "image/png,image/webp,image/jpeg" },
        });
        if (!response.ok) {
            throw new Error(`Failed to download generated image (${response.status}).`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) throw new Error("Generated image download was empty.");
        if (buffer.byteLength > (options.maxBytes ?? MAX_PROVIDER_IMAGE_BYTES)) {
            throw new Error("Generated image exceeds the maximum supported size.");
        }
        const mimeType = (response.headers.get("content-type") || "application/octet-stream")
            .split(";")[0]
            .trim()
            .toLowerCase();
        return { buffer, mimeType };
    } finally {
        clearTimeout(timeout);
    }
}
