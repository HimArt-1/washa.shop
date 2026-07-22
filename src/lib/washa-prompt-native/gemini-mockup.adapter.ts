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
import {
    ArtworkPlacementError,
    placementFitsPrintArea,
} from "@/lib/washa-artwork/placement";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";

const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_TIMEOUT_MS = 70_000;
const VERIFICATION_TIMEOUT_MS = 20_000;
const DEFAULT_VERIFICATION_MODEL = "gemini-2.5-flash";

type MockupVerification = {
    pass: boolean;
    artworkVisible: boolean;
    artworkIdentityPreserved: boolean;
    textPreserved: boolean;
    garmentIdentityPreserved: boolean;
    placementPlausible: boolean;
    framingPreserved: boolean;
    issues: string[];
};

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
        ? Math.min(80_000, Math.max(20_000, parsed))
        : DEFAULT_TIMEOUT_MS;
}

function configuredVerificationModel() {
    return (
        process.env.WASHA_PROMPT_NATIVE_VERIFICATION_MODEL
        || DEFAULT_VERIFICATION_MODEL
    ).trim() || DEFAULT_VERIFICATION_MODEL;
}

function imagePart(buffer: Buffer, mimeType: string) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
}

function mimeTypeForFormat(format: string | undefined) {
    if (format === "jpg" || format === "jpeg") return "image/jpeg";
    if (format === "heif") return "image/avif";
    return `image/${format || "png"}`;
}

export function resolvePromptNativeAspectRatio(width: number, height: number) {
    const ratio = width / Math.max(1, height);
    const supported = [
        ["1:1", 1],
        ["2:3", 2 / 3],
        ["3:2", 3 / 2],
        ["3:4", 3 / 4],
        ["4:3", 4 / 3],
        ["4:5", 4 / 5],
        ["5:4", 5 / 4],
        ["9:16", 9 / 16],
        ["16:9", 16 / 9],
        ["21:9", 21 / 9],
    ] as const;
    return supported.reduce((nearest, candidate) => (
        Math.abs(Math.log(ratio / candidate[1]))
            < Math.abs(Math.log(ratio / nearest[1]))
            ? candidate
            : nearest
    ), supported[0])[0];
}

export function buildPromptNativeMockupPrompt(params: {
    printArea: NormalizedPrintArea;
    placement: PlacementTransform;
}) {
    return [
        "WASHA AI PROMPT NATIVE — PHOTOREALISTIC MOCKUP COMPOSITING CONTRACT",
        "REFERENCE IMAGE A is the authoritative garment mockup and complete scene.",
        "REFERENCE IMAGE B is the immutable print artwork with native transparency.",
        "REFERENCE IMAGE C is a deterministic placement guide. It is authoritative for artwork location, size, rotation, and framing, but not for final fabric realism.",
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

const MOCKUP_VERIFICATION_SCHEMA = {
    type: "object",
    properties: {
        pass: { type: "boolean" },
        artworkVisible: { type: "boolean" },
        artworkIdentityPreserved: { type: "boolean" },
        textPreserved: { type: "boolean" },
        garmentIdentityPreserved: { type: "boolean" },
        placementPlausible: { type: "boolean" },
        framingPreserved: { type: "boolean" },
        issues: { type: "array", items: { type: "string" } },
    },
    required: [
        "pass",
        "artworkVisible",
        "artworkIdentityPreserved",
        "textPreserved",
        "garmentIdentityPreserved",
        "placementPlausible",
        "framingPreserved",
        "issues",
    ],
    additionalProperties: false,
} as const;

function extractText(response: any) {
    if (typeof response?.text === "string" && response.text.trim()) {
        return response.text.trim();
    }
    return (response?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => typeof part?.text === "string" ? part.text.trim() : "")
        .filter(Boolean)
        .join("")
        .trim();
}

async function withTimeout<T>(
    timeoutMs: number,
    operation: (signal: AbortSignal) => Promise<T>
) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await operation(controller.signal);
    } finally {
        clearTimeout(timeout);
    }
}

async function verifyMockupIdentity(params: {
    garmentBase: Buffer;
    garmentMimeType: string;
    masterArtwork: Buffer;
    placementGuide: Buffer;
    placementGuideMimeType: string;
    generatedMockup: Buffer;
}) {
    const model = configuredVerificationModel();
    const response = await withTimeout(VERIFICATION_TIMEOUT_MS, (signal) => (
        getWashaDtfGenAiClient().models.generateContent({
            model,
            contents: {
                role: "user",
                parts: [
                    { text: "A — original selected garment mockup" },
                    imagePart(params.garmentBase, params.garmentMimeType),
                    { text: "B — immutable transparent print artwork" },
                    imagePart(params.masterArtwork, "image/png"),
                    { text: "C — deterministic placement guide" },
                    imagePart(params.placementGuide, params.placementGuideMimeType),
                    { text: "D — Gemini-generated final mockup to verify" },
                    imagePart(params.generatedMockup, "image/webp"),
                    {
                        text: [
                            "Act as a strict visual production gate. Compare D with A, B, and C.",
                            "Pass only if B is clearly present on the same garment, its wording/glyphs/composition/colors remain faithful, its placement matches C, and A's garment identity, color, scene, crop, and framing remain intact.",
                            "Any missing artwork, redrawn text, altered logo, wrong garment, implausible placement, or changed crop must fail.",
                            "Return JSON only.",
                        ].join(" "),
                    },
                ],
            },
            config: {
                temperature: 0,
                responseModalities: ["TEXT"],
                responseMimeType: "application/json",
                responseJsonSchema: MOCKUP_VERIFICATION_SCHEMA,
                httpOptions: {
                    timeout: VERIFICATION_TIMEOUT_MS,
                    retryOptions: { attempts: 1 },
                },
                abortSignal: signal,
            } as any,
        })
    ));
    const text = extractText(response);
    if (!text) throw new Error("Prompt Native mockup identity verification returned no result.");
    const verification = JSON.parse(text) as MockupVerification;
    const checks = [
        verification.pass,
        verification.artworkVisible,
        verification.artworkIdentityPreserved,
        verification.textPreserved,
        verification.garmentIdentityPreserved,
        verification.placementPlausible,
        verification.framingPreserved,
    ];
    if (!checks.every(Boolean)) {
        const issues = Array.isArray(verification.issues)
            ? verification.issues.filter((issue) => typeof issue === "string").join("; ")
            : "";
        throw new Error(`Prompt Native mockup identity verification failed${issues ? `: ${issues}` : "."}`);
    }
    return { ...verification, model };
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
    placementGuide: Buffer;
    printArea: NormalizedPrintArea;
    placement: PlacementTransform;
    traceId: string;
}) {
    const [garmentMetadata, artworkMetadata, placementGuideMetadata] = await Promise.all([
        sharp(params.garmentBase).metadata(),
        sharp(params.masterArtwork).metadata(),
        sharp(params.placementGuide).metadata(),
    ]);
    const garmentWidth = garmentMetadata.width ?? 0;
    const garmentHeight = garmentMetadata.height ?? 0;
    if (
        !garmentWidth
        || !garmentHeight
        || !artworkMetadata.width
        || !artworkMetadata.height
        || !placementGuideMetadata.width
        || !placementGuideMetadata.height
    ) {
        throw new Error("Prompt Native mockup inputs are unreadable.");
    }
    const garmentMimeType = mimeTypeForFormat(garmentMetadata.format);
    const placementGuideMimeType = mimeTypeForFormat(placementGuideMetadata.format);
    const artworkAspectRatio = artworkMetadata.width / artworkMetadata.height;
    if (!placementFitsPrintArea(params.placement, artworkAspectRatio)) {
        throw new ArtworkPlacementError({
            message: "Artwork placement extends outside the printable safe area.",
            diagnostics: {
                reason: "prompt_native_placement_outside_safe_area",
                artworkAspectRatio,
                placement: params.placement,
            },
        });
    }

    const model = configuredModel();
    const timeoutMs = configuredTimeoutMs();
    const aspectRatio = resolvePromptNativeAspectRatio(garmentWidth, garmentHeight);
    const prompt = buildPromptNativeMockupPrompt({
        printArea: params.printArea,
        placement: params.placement,
    });
    const startedAt = Date.now();
    logDtfTrace("dtf.prompt_native.mockup", params.traceId, "gemini_mockup_started", {
        provider: "gemini",
        model,
        aspectRatio,
        side: params.placement.side,
        printAreaId: params.placement.printAreaId,
    });

    try {
        const response = await withTimeout(timeoutMs, (signal) => getWashaDtfGenAiClient().models.generateContent({
            model,
            contents: {
                role: "user",
                parts: [
                    { text: "REFERENCE IMAGE A — SELECTED GARMENT MOCKUP" },
                    imagePart(params.garmentBase, garmentMimeType),
                    { text: "REFERENCE IMAGE B — IMMUTABLE TRANSPARENT PRINT ARTWORK" },
                    imagePart(params.masterArtwork, "image/png"),
                    { text: "REFERENCE IMAGE C — DETERMINISTIC PLACEMENT GUIDE" },
                    imagePart(params.placementGuide, placementGuideMimeType),
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
                abortSignal: signal,
            } as any,
        }));
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
        const verification = await verifyMockupIdentity({
            garmentBase: params.garmentBase,
            garmentMimeType,
            masterArtwork: params.masterArtwork,
            placementGuide: params.placementGuide,
            placementGuideMimeType,
            generatedMockup: buffer,
        });

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
                placementGuideUsed: true,
                verification,
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
    }
}
