import "server-only";

import sharp from "sharp";
import {
    extractGeneratedImageDataUrl,
    getWashaDtfGenAiClient,
} from "@/lib/washa-dtf-studio";
import type {
    NormalizedPrintArea,
    PlacementTransform,
} from "@/lib/washa-artwork/types";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";

const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_TIMEOUT_MS = 100_000;

function configuredModel() {
    return (
        process.env.WASHA_PROMPT_NATIVE_GEMINI_MODEL
        || DEFAULT_MODEL
    ).trim() || DEFAULT_MODEL;
}

function configuredTimeoutMs() {
    const parsed = Number.parseInt(
        process.env.WASHA_PROMPT_NATIVE_GEMINI_TIMEOUT_MS || "",
        10
    );
    return Number.isFinite(parsed)
        ? Math.min(120_000, Math.max(20_000, parsed))
        : DEFAULT_TIMEOUT_MS;
}

function imagePart(buffer: Buffer, mimeType: string) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
}

function outputAspectRatio(width: number, height: number) {
    const ratio = width / Math.max(1, height);
    if (ratio >= 1.15) return "4:3";
    if (ratio <= 0.9) return "4:5";
    return "1:1";
}

export function buildPromptNativeMockupPrompt(params: {
    printArea: NormalizedPrintArea;
    placement: PlacementTransform;
}) {
    return [
        "WASHA AI PROMPT NATIVE — PHOTOREALISTIC MOCKUP COMPOSITING CONTRACT",
        "REFERENCE IMAGE A is the authoritative garment mockup and complete scene.",
        "REFERENCE IMAGE B is the immutable print artwork with native transparency.",
        "Edit REFERENCE IMAGE A only by applying REFERENCE IMAGE B to the garment.",
        "Preserve the exact garment type, color, silhouette, seams, folds, person or mannequin if present, camera, crop, lighting, shadows, and background from REFERENCE IMAGE A.",
        "Preserve every visible pixel-level design decision from REFERENCE IMAGE B: wording, Arabic glyphs, spelling, illustration, colors, proportions, internal negative space, and outline. Do not redraw, reinterpret, translate, simplify, embellish, repair, or add anything.",
        "The artwork may be geometrically warped only as required to follow the garment perspective and fabric folds. Blend it as a premium DTF print with realistic contact, local shading, subtle fabric interaction, and no floating sticker edge.",
        `Normalized printable area: ${JSON.stringify(params.printArea)}.`,
        `Normalized placement transform: ${JSON.stringify(params.placement)}.`,
        "Keep the complete artwork inside the printable safe area. Respect its requested center, scale, rotation, and side.",
        "Do not add captions, labels, guides, frames, watermarks, new logos, extra artwork, or a second garment.",
        "Return exactly one finished photorealistic mockup image. Do not return text.",
    ].join("\n\n");
}

function decodeGeneratedDataUrl(value: string) {
    const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
    if (!match) throw new Error("Gemini returned an invalid mockup image payload.");
    return {
        mimeType: match[1].toLowerCase(),
        buffer: Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
    };
}

export async function composePromptNativeMockup(params: {
    garmentBase: Buffer;
    masterArtwork: Buffer;
    printArea: NormalizedPrintArea;
    placement: PlacementTransform;
    traceId: string;
}) {
    const [garmentMetadata, artworkMetadata] = await Promise.all([
        sharp(params.garmentBase).metadata(),
        sharp(params.masterArtwork).metadata(),
    ]);
    const garmentWidth = garmentMetadata.width ?? 0;
    const garmentHeight = garmentMetadata.height ?? 0;
    if (!garmentWidth || !garmentHeight || !artworkMetadata.width || !artworkMetadata.height) {
        throw new Error("Prompt Native mockup inputs are unreadable.");
    }

    const model = configuredModel();
    const timeoutMs = configuredTimeoutMs();
    const aspectRatio = outputAspectRatio(garmentWidth, garmentHeight);
    const prompt = buildPromptNativeMockupPrompt({
        printArea: params.printArea,
        placement: params.placement,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    logDtfTrace("dtf.prompt_native.mockup", params.traceId, "gemini_mockup_started", {
        provider: "gemini",
        model,
        aspectRatio,
        side: params.placement.side,
        printAreaId: params.placement.printAreaId,
    });

    try {
        const response = await getWashaDtfGenAiClient().models.generateContent({
            model,
            contents: {
                role: "user",
                parts: [
                    { text: "REFERENCE IMAGE A — SELECTED GARMENT MOCKUP" },
                    imagePart(params.garmentBase, `image/${garmentMetadata.format || "png"}`),
                    { text: "REFERENCE IMAGE B — IMMUTABLE TRANSPARENT PRINT ARTWORK" },
                    imagePart(params.masterArtwork, "image/png"),
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                    aspectRatio,
                    imageSize: "2K",
                },
                httpOptions: {
                    timeout: timeoutMs,
                    retryOptions: { attempts: 1 },
                },
                abortSignal: controller.signal,
            } as any,
        });
        const dataUrl = extractGeneratedImageDataUrl(response);
        if (!dataUrl) throw new Error("Gemini returned no composited mockup image.");
        const decoded = decodeGeneratedDataUrl(dataUrl);
        const buffer = await sharp(decoded.buffer, { failOn: "error", animated: false })
            .rotate()
            .webp({ quality: 94, alphaQuality: 100, smartSubsample: true })
            .toBuffer();
        const metadata = await sharp(buffer).metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        if (!width || !height) throw new Error("Gemini mockup output is unreadable.");

        logDtfTrace("dtf.prompt_native.mockup", params.traceId, "gemini_mockup_completed", {
            provider: "gemini",
            model,
            durationMs: Date.now() - startedAt,
            width,
            height,
        });
        return {
            buffer,
            mimeType: "image/webp" as const,
            width,
            height,
            transformationMetadata: {
                pipeline: "prompt_native",
                previewProvider: "gemini",
                previewModel: model,
                artworkMutationAllowed: false,
                printArea: params.printArea,
                placement: params.placement,
                sourceArtworkMimeType: "image/png",
                generatedMimeType: decoded.mimeType,
            },
        };
    } catch (error) {
        logDtfTrace("dtf.prompt_native.mockup", params.traceId, "gemini_mockup_failed", {
            provider: "gemini",
            model,
            durationMs: Date.now() - startedAt,
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

