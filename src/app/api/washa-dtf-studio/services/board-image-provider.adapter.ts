import "server-only";

import { runNanoBananaDataUrl } from "@/lib/gemini-rest-image";
import { runOpenAIGenerateDataUrl } from "@/lib/openai-image";
import {
    FLUX_SCHNELL,
    runReplicatePredictions,
} from "@/lib/replicate-predictions";
import { readPositiveIntegerEnv, withTimeout } from "@/lib/async-timeout";
import {
    extractGeneratedImageDataUrl,
    getWashaDtfGenAiClient,
} from "@/lib/washa-dtf-studio";
import type {
    WashaDtfProvider,
    WashaDtfProviderConfiguration,
} from "@/lib/washa-dtf-provider-config";

type SuccessfulBoardProvider = Exclude<WashaDtfProvider, "unsupported">;

export type BoardProviderImage = {
    dataUrl: string;
    provider: SuccessfulBoardProvider;
    model: string;
};

const BOARD_PROVIDER_TIMEOUT_MS = readPositiveIntegerEnv(
    "WASHA_BOARD_PROVIDER_TIMEOUT_MS",
    120_000,
    15_000,
    180_000
);
const BOARD_REMOTE_IMAGE_TIMEOUT_MS = Math.min(BOARD_PROVIDER_TIMEOUT_MS, 30_000);
const MAX_BOARD_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_BOARD_IMAGE_BASE64_LENGTH = Math.ceil(MAX_BOARD_IMAGE_BYTES / 3) * 4;
const BOARD_IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\s]+)$/i;
const CANONICAL_BASE64_PATTERN = /^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i;

function hasExpectedImageSignature(buffer: Buffer, contentType: string) {
    if (contentType === "image/png") {
        return buffer.length >= 8
            && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    if (contentType === "image/jpeg") {
        return buffer.length >= 3
            && buffer[0] === 0xff
            && buffer[1] === 0xd8
            && buffer[2] === 0xff;
    }
    if (contentType === "image/webp") {
        return buffer.length >= 12
            && buffer.subarray(0, 4).toString("ascii") === "RIFF"
            && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    }
    return false;
}

export function decodeBoardImageDataUrl(value: string) {
    const match = value.match(BOARD_IMAGE_DATA_URL_PATTERN);
    if (!match) throw new Error("Board provider returned an unsupported image payload.");

    const contentType = match[1].toLowerCase();
    const encoded = match[2].replace(/\s+/g, "");
    if (
        encoded.length === 0
        || encoded.length > MAX_BOARD_IMAGE_BASE64_LENGTH
        || !CANONICAL_BASE64_PATTERN.test(encoded)
    ) {
        throw new Error("Board provider returned invalid base64 image data.");
    }
    const buffer = Buffer.from(encoded, "base64");
    if (
        buffer.length === 0
        || buffer.length > MAX_BOARD_IMAGE_BYTES
        || !hasExpectedImageSignature(buffer, contentType)
    ) {
        throw new Error("Board provider returned an invalid image size.");
    }

    return {
        buffer,
        contentType,
        dataUrl: `data:${contentType};base64,${encoded}`,
    };
}

async function materializeBoardImageDataUrl(value: string) {
    if (value.startsWith("data:")) {
        return decodeBoardImageDataUrl(value).dataUrl;
    }

    let imageUrl: URL;
    try {
        imageUrl = new URL(value);
    } catch {
        throw new Error("Board provider returned an invalid image URL.");
    }
    if (imageUrl.protocol !== "https:") {
        throw new Error("Board provider returned a non-HTTPS image URL.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BOARD_REMOTE_IMAGE_TIMEOUT_MS);
    try {
        const response = await fetch(imageUrl, {
            cache: "no-store",
            redirect: "error",
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`Board image download failed with status ${response.status}.`);
        }

        const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
        if (!contentType || !/^image\/(?:png|jpeg|webp)$/.test(contentType)) {
            throw new Error("Board provider URL did not return a supported image.");
        }
        const declaredLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BOARD_IMAGE_BYTES) {
            throw new Error("Board provider URL exceeded the image size limit.");
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0 || buffer.length > MAX_BOARD_IMAGE_BYTES) {
            throw new Error("Board provider URL returned an invalid image size.");
        }
        return decodeBoardImageDataUrl(
            `data:${contentType};base64,${buffer.toString("base64")}`
        ).dataUrl;
    } finally {
        clearTimeout(timeout);
    }
}

async function generateWithResolvedProvider(input: {
    prompt: string;
    configuration: WashaDtfProviderConfiguration;
}) {
    const { configuration } = input;
    if (configuration.provider === "genai") {
        const response = await getWashaDtfGenAiClient().models.generateContent({
            model: configuration.model,
            contents: input.prompt,
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
            },
        });
        return extractGeneratedImageDataUrl(response);
    }
    if (configuration.provider === "openai") {
        return runOpenAIGenerateDataUrl(input.prompt, {
            throwOnError: true,
            background: "opaque",
            outputFormat: "png",
            quality: "high",
            size: "1024x1024",
        });
    }
    if (configuration.provider === "nanobanana") {
        return runNanoBananaDataUrl(input.prompt, null, { throwOnError: true });
    }
    if (configuration.provider === "replicate") {
        const prediction = await runReplicatePredictions({
            version: FLUX_SCHNELL,
            input: {
                prompt: input.prompt,
                output_format: "png",
                aspect_ratio: "1:1",
                num_outputs: 1,
            },
        });
        return prediction?.urls?.[0] ?? null;
    }
    throw new Error(`Unsupported board image provider: ${configuration.configuredProvider}`);
}

export async function generateBoardProviderImage(input: {
    prompt: string;
    configuration: WashaDtfProviderConfiguration;
    traceId: string;
}): Promise<BoardProviderImage> {
    const provider = input.configuration.provider;
    if (
        provider === "unsupported"
        || !input.configuration.credentialConfigured
    ) {
        throw new Error("Board image provider is not configured.");
    }

    const imageValue = await withTimeout(
        generateWithResolvedProvider(input),
        BOARD_PROVIDER_TIMEOUT_MS,
        `board image provider ${input.traceId}`
    );
    if (!imageValue) throw new Error("Board image provider returned no image.");

    return {
        dataUrl: await materializeBoardImageDataUrl(imageValue),
        provider,
        model: input.configuration.model,
    };
}
