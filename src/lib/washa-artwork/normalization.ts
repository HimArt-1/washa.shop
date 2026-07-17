import sharp from "sharp";
import type { ArtworkValidationReport } from "@/lib/washa-artwork/types";
import { validateArtworkPng } from "@/lib/washa-artwork/validation";

const DEFAULT_SAFE_PADDING_RATIO = 0.1;
const MIN_SAFE_PADDING_RATIO = 0.08;
const MAX_SAFE_PADDING_RATIO = 0.12;
const ALPHA_VISIBLE_THRESHOLD = 8;
const ALPHA_TRANSPARENT_THRESHOLD = 0;

export type GeneratedArtworkImageDiagnostics = {
    declaredMimeType: string | null;
    magicBytesFormat: string;
    detectedFormat: string;
    format: string;
    width: number;
    height: number;
    hasAlphaChannel: boolean;
    transparentPixelRatio: number;
};

export type ArtworkNormalizationDiagnostics = {
    backgroundRemovalApplied: boolean;
    backgroundColor: { r: number; g: number; b: number } | null;
    borderBackgroundCoherence: number | null;
    borderSeedRatio: number | null;
    removedPixelRatio: number;
    foregroundPixelRatio: number;
    haloSuppressionApplied: boolean;
    contentBounds: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    paddingRatio: number;
    paddingPixels: { x: number; y: number };
    outputScaleFactor: number;
};

export type NormalizedGeneratedArtwork = {
    buffer: Buffer;
    input: GeneratedArtworkImageDiagnostics;
    output: GeneratedArtworkImageDiagnostics;
    normalization: ArtworkNormalizationDiagnostics;
    validation: ArtworkValidationReport;
};

export class ArtworkPrintValidationError extends Error {
    readonly code = "ARTWORK_PRINT_VALIDATION_FAILED";
    readonly stage: "decode" | "normalization" | "validation";
    readonly diagnostics: Record<string, unknown>;
    readonly validationErrors: string[];

    constructor(params: {
        message: string;
        stage: "decode" | "normalization" | "validation";
        diagnostics?: Record<string, unknown>;
        validationErrors?: string[];
        cause?: unknown;
    }) {
        super(params.message);
        this.name = "ArtworkPrintValidationError";
        this.stage = params.stage;
        this.diagnostics = params.diagnostics ?? {};
        this.validationErrors = params.validationErrors ?? [];
        this.cause = params.cause;
    }
}

export function isArtworkPrintValidationError(
    error: unknown
): error is ArtworkPrintValidationError {
    return error instanceof ArtworkPrintValidationError
        || (
            error instanceof Error
            && "code" in error
            && error.code === "ARTWORK_PRINT_VALIDATION_FAILED"
        );
}

export function isRecoverableArtworkBackgroundError(error: unknown) {
    if (!isArtworkPrintValidationError(error) || error.stage !== "normalization") {
        return false;
    }
    const reason = error.diagnostics.reason;
    return reason === "edge_background_not_uniform"
        || reason === "background_separation_confidence_low";
}

function detectMagicBytesFormat(buffer: Buffer) {
    if (
        buffer.length >= 8
        && buffer[0] === 0x89
        && buffer.subarray(1, 4).toString("ascii") === "PNG"
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a
    ) {
        return "png";
    }
    if (
        buffer.length >= 3
        && buffer[0] === 0xff
        && buffer[1] === 0xd8
        && buffer[2] === 0xff
    ) {
        return "jpeg";
    }
    if (
        buffer.length >= 12
        && buffer.subarray(0, 4).toString("ascii") === "RIFF"
        && buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
        return "webp";
    }
    if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString("ascii"))) {
        return "gif";
    }
    return "unknown";
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function quantile(values: number[], percentile: number) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.floor((sorted.length - 1) * percentile))
    );
    return sorted[index];
}

function median(values: number[]) {
    return quantile(values, 0.5);
}

function colorDistance(
    r: number,
    g: number,
    b: number,
    color: { r: number; g: number; b: number }
) {
    const dr = r - color.r;
    const dg = g - color.g;
    const db = b - color.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function readPixel(
    rgba: Uint8Array,
    pixelIndex: number
): { r: number; g: number; b: number; a: number } {
    const offset = pixelIndex * 4;
    return {
        r: rgba[offset],
        g: rgba[offset + 1],
        b: rgba[offset + 2],
        a: rgba[offset + 3],
    };
}

function countTransparentPixels(rgba: Uint8Array) {
    let transparentPixels = 0;
    for (let offset = 3; offset < rgba.length; offset += 4) {
        if (rgba[offset] === ALPHA_TRANSPARENT_THRESHOLD) transparentPixels += 1;
    }
    return transparentPixels;
}

async function decodeToRgba(buffer: Buffer) {
    const image = sharp(buffer, { failOn: "error", animated: false }).rotate();
    const metadata = await image.metadata();
    const raw = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return {
        rgba: new Uint8Array(raw.data),
        width: raw.info.width,
        height: raw.info.height,
        metadata,
    };
}

export async function inspectGeneratedArtworkBytes(
    buffer: Buffer,
    declaredMimeType?: string | null
): Promise<GeneratedArtworkImageDiagnostics> {
    const decoded = await decodeToRgba(buffer);
    const pixelCount = Math.max(1, decoded.width * decoded.height);
    const transparentPixelRatio = countTransparentPixels(decoded.rgba) / pixelCount;
    const detectedFormat = decoded.metadata.format || "unknown";
    return {
        declaredMimeType: declaredMimeType?.trim().toLowerCase() || null,
        magicBytesFormat: detectMagicBytesFormat(buffer),
        detectedFormat,
        format: detectedFormat,
        width: decoded.width,
        height: decoded.height,
        hasAlphaChannel:
            decoded.metadata.hasAlpha === true
            || decoded.metadata.channels === 4,
        transparentPixelRatio,
    };
}

function collectBorderPixelIndexes(width: number, height: number) {
    const indexes: number[] = [];
    for (let x = 0; x < width; x += 1) {
        indexes.push(x);
        if (height > 1) indexes.push((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
        indexes.push(y * width);
        if (width > 1) indexes.push(y * width + width - 1);
    }
    return indexes;
}

function estimateEdgeBackground(
    rgba: Uint8Array,
    width: number,
    height: number
) {
    const borderIndexes = collectBorderPixelIndexes(width, height);
    const borderPixels = borderIndexes.map((index) => readPixel(rgba, index));
    const backgroundColor = {
        r: Math.round(median(borderPixels.map((pixel) => pixel.r))),
        g: Math.round(median(borderPixels.map((pixel) => pixel.g))),
        b: Math.round(median(borderPixels.map((pixel) => pixel.b))),
    };
    const distances = borderPixels.map((pixel) =>
        colorDistance(pixel.r, pixel.g, pixel.b, backgroundColor)
    );
    const seedTolerance = clamp(quantile(distances, 0.7) + 10, 14, 38);
    const growTolerance = clamp(quantile(distances, 0.8) + 24, 28, 72);
    const borderBackgroundCoherence =
        distances.filter((distance) => distance <= growTolerance).length
        / Math.max(1, distances.length);
    const seedIndexes = borderIndexes.filter((index) => {
        const pixel = readPixel(rgba, index);
        return colorDistance(pixel.r, pixel.g, pixel.b, backgroundColor)
            <= seedTolerance;
    });

    return {
        backgroundColor,
        borderIndexes,
        seedIndexes,
        seedTolerance,
        growTolerance,
        borderBackgroundCoherence,
    };
}

function floodFillEdgeBackground(params: {
    rgba: Uint8Array;
    width: number;
    height: number;
    backgroundColor: { r: number; g: number; b: number };
    seedIndexes: number[];
    growTolerance: number;
}) {
    const pixelCount = params.width * params.height;
    const backgroundMask = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let queueStart = 0;
    let queueEnd = 0;

    for (const index of params.seedIndexes) {
        if (backgroundMask[index]) continue;
        backgroundMask[index] = 1;
        queue[queueEnd] = index;
        queueEnd += 1;
    }

    const tryAdd = (index: number) => {
        if (backgroundMask[index]) return;
        const pixel = readPixel(params.rgba, index);
        if (
            colorDistance(
                pixel.r,
                pixel.g,
                pixel.b,
                params.backgroundColor
            ) > params.growTolerance
        ) {
            return;
        }
        backgroundMask[index] = 1;
        queue[queueEnd] = index;
        queueEnd += 1;
    };

    while (queueStart < queueEnd) {
        const index = queue[queueStart];
        queueStart += 1;
        const x = index % params.width;
        const y = Math.floor(index / params.width);
        if (x > 0) tryAdd(index - 1);
        if (x + 1 < params.width) tryAdd(index + 1);
        if (y > 0) tryAdd(index - params.width);
        if (y + 1 < params.height) tryAdd(index + params.width);
    }

    return backgroundMask;
}

function hasBackgroundNeighbor(
    backgroundMask: Uint8Array,
    width: number,
    height: number,
    x: number,
    y: number,
    radius: number
) {
    for (let dy = -radius; dy <= radius; dy += 1) {
        const neighborY = y + dy;
        if (neighborY < 0 || neighborY >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
            const neighborX = x + dx;
            if (neighborX < 0 || neighborX >= width) continue;
            if (backgroundMask[neighborY * width + neighborX]) return true;
        }
    }
    return false;
}

function findNearestForegroundColor(params: {
    rgba: Uint8Array;
    backgroundMask: Uint8Array;
    width: number;
    height: number;
    x: number;
    y: number;
    backgroundColor: { r: number; g: number; b: number };
    minimumColorDistance: number;
}) {
    let best:
        | { r: number; g: number; b: number; spatialDistance: number; colorDistance: number }
        | null = null;
    const radius = 6;
    for (let dy = -radius; dy <= radius; dy += 1) {
        const candidateY = params.y + dy;
        if (candidateY < 0 || candidateY >= params.height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
            const candidateX = params.x + dx;
            if (candidateX < 0 || candidateX >= params.width) continue;
            const index = candidateY * params.width + candidateX;
            if (params.backgroundMask[index]) continue;
            const pixel = readPixel(params.rgba, index);
            const candidateColorDistance = colorDistance(
                pixel.r,
                pixel.g,
                pixel.b,
                params.backgroundColor
            );
            if (candidateColorDistance < params.minimumColorDistance) continue;
            const spatialDistance = dx * dx + dy * dy;
            if (
                !best
                || spatialDistance < best.spatialDistance
                || (
                    spatialDistance === best.spatialDistance
                    && candidateColorDistance > best.colorDistance
                )
            ) {
                best = {
                    r: pixel.r,
                    g: pixel.g,
                    b: pixel.b,
                    spatialDistance,
                    colorDistance: candidateColorDistance,
                };
            }
        }
    }
    return best;
}

function suppressMatteHalos(params: {
    rgba: Uint8Array;
    width: number;
    height: number;
    backgroundMask: Uint8Array;
    backgroundColor: { r: number; g: number; b: number };
    growTolerance: number;
}) {
    const output = new Uint8Array(params.rgba);
    const alphaLow = params.growTolerance * 0.7;
    const alphaHigh = Math.max(alphaLow + 16, params.growTolerance * 2.25);

    for (let y = 0; y < params.height; y += 1) {
        for (let x = 0; x < params.width; x += 1) {
            const pixelIndex = y * params.width + x;
            const offset = pixelIndex * 4;
            if (params.backgroundMask[pixelIndex]) {
                output[offset] = 0;
                output[offset + 1] = 0;
                output[offset + 2] = 0;
                output[offset + 3] = 0;
                continue;
            }

            if (
                !hasBackgroundNeighbor(
                    params.backgroundMask,
                    params.width,
                    params.height,
                    x,
                    y,
                    2
                )
            ) {
                continue;
            }

            const distance = colorDistance(
                output[offset],
                output[offset + 1],
                output[offset + 2],
                params.backgroundColor
            );
            const normalizedAlpha = clamp(
                (distance - alphaLow) / (alphaHigh - alphaLow),
                0,
                1
            );
            const alpha = Math.round(255 * normalizedAlpha);
            if (alpha <= ALPHA_VISIBLE_THRESHOLD) {
                output[offset] = 0;
                output[offset + 1] = 0;
                output[offset + 2] = 0;
                output[offset + 3] = 0;
                continue;
            }

            output[offset + 3] = Math.min(output[offset + 3], alpha);
            const effectiveAlpha = output[offset + 3] / 255;
            for (let channel = 0; channel < 3; channel += 1) {
                const matte = channel === 0
                    ? params.backgroundColor.r
                    : channel === 1
                        ? params.backgroundColor.g
                        : params.backgroundColor.b;
                output[offset + channel] = Math.round(clamp(
                    (
                        output[offset + channel]
                        - matte * (1 - effectiveAlpha)
                    ) / effectiveAlpha,
                    0,
                    255
                ));
            }
            if (output[offset + 3] < 250) {
                const foreground = findNearestForegroundColor({
                    rgba: params.rgba,
                    backgroundMask: params.backgroundMask,
                    width: params.width,
                    height: params.height,
                    x,
                    y,
                    backgroundColor: params.backgroundColor,
                    minimumColorDistance: alphaHigh,
                });
                if (foreground) {
                    output[offset] = foreground.r;
                    output[offset + 1] = foreground.g;
                    output[offset + 2] = foreground.b;
                }
            }
        }
    }

    return output;
}

function findVisibleBounds(rgba: Uint8Array, width: number, height: number) {
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    let visiblePixels = 0;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const alpha = rgba[(y * width + x) * 4 + 3];
            if (alpha <= ALPHA_VISIBLE_THRESHOLD) continue;
            visiblePixels += 1;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
        }
    }
    if (!visiblePixels || right < left || bottom < top) return null;
    return { left, top, right, bottom, visiblePixels };
}

function normalizePaddingRatio(value: number | undefined) {
    if (!Number.isFinite(value)) return DEFAULT_SAFE_PADDING_RATIO;
    return clamp(
        value as number,
        MIN_SAFE_PADDING_RATIO,
        MAX_SAFE_PADDING_RATIO
    );
}

function readDimensionLimit(
    explicitValue: number | undefined,
    envName: string,
    fallback: number
) {
    if (Number.isFinite(explicitValue) && (explicitValue as number) > 0) {
        return Math.floor(explicitValue as number);
    }
    const configured = Number.parseInt(process.env[envName]?.trim() || "", 10);
    return Number.isFinite(configured) && configured > 0
        ? configured
        : fallback;
}

export async function normalizeGeneratedArtworkForPrint(params: {
    buffer: Buffer;
    declaredMimeType?: string | null;
    safePaddingRatio?: number;
    validationOptions?: {
        minDimension?: number;
        maxDimension?: number;
        minTransparentPixelRatio?: number;
        minSafePaddingRatio?: number;
    };
}): Promise<NormalizedGeneratedArtwork> {
    let decoded: Awaited<ReturnType<typeof decodeToRgba>>;
    let input: GeneratedArtworkImageDiagnostics;
    try {
        decoded = await decodeToRgba(params.buffer);
        const pixelCount = Math.max(1, decoded.width * decoded.height);
        const detectedFormat = decoded.metadata.format || "unknown";
        input = {
            declaredMimeType: params.declaredMimeType?.trim().toLowerCase() || null,
            magicBytesFormat: detectMagicBytesFormat(params.buffer),
            detectedFormat,
            format: detectedFormat,
            width: decoded.width,
            height: decoded.height,
            hasAlphaChannel:
                decoded.metadata.hasAlpha === true
                || decoded.metadata.channels === 4,
            transparentPixelRatio:
                countTransparentPixels(decoded.rgba) / pixelCount,
        };
    } catch (error) {
        throw new ArtworkPrintValidationError({
            message: "Generated artwork bytes could not be decoded safely.",
            stage: "decode",
            diagnostics: {
                declaredMimeType: params.declaredMimeType?.trim().toLowerCase() || null,
                magicBytesFormat: detectMagicBytesFormat(params.buffer),
                byteLength: params.buffer.byteLength,
            },
            cause: error,
        });
    }

    const pixelCount = decoded.width * decoded.height;
    let normalizedRgba = new Uint8Array(decoded.rgba);
    let backgroundRemovalApplied = false;
    let backgroundColor: { r: number; g: number; b: number } | null = null;
    let borderBackgroundCoherence: number | null = null;
    let borderSeedRatio: number | null = null;
    let removedPixelRatio = input.transparentPixelRatio;
    let haloSuppressionApplied = false;

    if (input.transparentPixelRatio < 0.001) {
        const edge = estimateEdgeBackground(
            decoded.rgba,
            decoded.width,
            decoded.height
        );
        backgroundColor = edge.backgroundColor;
        borderBackgroundCoherence = edge.borderBackgroundCoherence;
        borderSeedRatio =
            edge.seedIndexes.length / Math.max(1, edge.borderIndexes.length);
        if (
            edge.borderBackgroundCoherence < 0.6
            || borderSeedRatio < 0.35
        ) {
            throw new ArtworkPrintValidationError({
                message: "Generated artwork edge background is not uniform enough to remove safely.",
                stage: "normalization",
                diagnostics: {
                    reason: "edge_background_not_uniform",
                    ...input,
                    borderBackgroundCoherence,
                    borderSeedRatio,
                },
            });
        }

        const backgroundMask = floodFillEdgeBackground({
            rgba: decoded.rgba,
            width: decoded.width,
            height: decoded.height,
            backgroundColor: edge.backgroundColor,
            seedIndexes: edge.seedIndexes,
            growTolerance: edge.growTolerance,
        });
        let removedPixels = 0;
        for (const value of backgroundMask) removedPixels += value;
        removedPixelRatio = removedPixels / Math.max(1, pixelCount);
        const foregroundPixelRatio = 1 - removedPixelRatio;
        if (
            removedPixelRatio < 0.05
            || foregroundPixelRatio < 0.002
        ) {
            throw new ArtworkPrintValidationError({
                message: "Generated artwork background separation confidence is too low.",
                stage: "normalization",
                diagnostics: {
                    reason: "background_separation_confidence_low",
                    ...input,
                    borderBackgroundCoherence,
                    borderSeedRatio,
                    removedPixelRatio,
                    foregroundPixelRatio,
                },
            });
        }
        normalizedRgba = suppressMatteHalos({
            rgba: decoded.rgba,
            width: decoded.width,
            height: decoded.height,
            backgroundMask,
            backgroundColor: edge.backgroundColor,
            growTolerance: edge.growTolerance,
        });
        backgroundRemovalApplied = true;
        haloSuppressionApplied = true;
    }

    const bounds = findVisibleBounds(
        normalizedRgba,
        decoded.width,
        decoded.height
    );
    if (!bounds) {
        throw new ArtworkPrintValidationError({
            message: "Generated artwork normalization removed all visible content.",
            stage: "normalization",
            diagnostics: {
                ...input,
                backgroundRemovalApplied,
                removedPixelRatio,
            },
        });
    }

    const contentWidth = bounds.right - bounds.left + 1;
    const contentHeight = bounds.bottom - bounds.top + 1;
    const paddingRatio = normalizePaddingRatio(params.safePaddingRatio);
    const paddingX = Math.max(
        1,
        Math.ceil(contentWidth * paddingRatio / (1 - 2 * paddingRatio))
    );
    const paddingY = Math.max(
        1,
        Math.ceil(contentHeight * paddingRatio / (1 - 2 * paddingRatio))
    );
    const paddedWidth = contentWidth + paddingX * 2;
    const paddedHeight = contentHeight + paddingY * 2;
    const minDimension = readDimensionLimit(
        params.validationOptions?.minDimension,
        "WASHA_DTF_MIN_ARTWORK_DIMENSION",
        1024
    );
    const maxDimension = readDimensionLimit(
        params.validationOptions?.maxDimension,
        "WASHA_DTF_MAX_ARTWORK_DIMENSION",
        8192
    );
    const outputScaleFactor = Math.max(
        1,
        minDimension / paddedWidth,
        minDimension / paddedHeight
    );
    const outputWidth = Math.ceil(paddedWidth * outputScaleFactor);
    const outputHeight = Math.ceil(paddedHeight * outputScaleFactor);
    if (outputWidth > maxDimension || outputHeight > maxDimension) {
        throw new ArtworkPrintValidationError({
            message: "Normalized artwork dimensions cannot satisfy print limits safely.",
            stage: "normalization",
            diagnostics: {
                ...input,
                contentWidth,
                contentHeight,
                paddedWidth,
                paddedHeight,
                outputWidth,
                outputHeight,
                minDimension,
                maxDimension,
            },
        });
    }

    const padded = await sharp(Buffer.from(normalizedRgba), {
        raw: {
            width: decoded.width,
            height: decoded.height,
            channels: 4,
        },
    })
        .extract({
            left: bounds.left,
            top: bounds.top,
            width: contentWidth,
            height: contentHeight,
        })
        .extend({
            left: paddingX,
            right: paddingX,
            top: paddingY,
            bottom: paddingY,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
    let outputPipeline = sharp(padded.data, {
        raw: {
            width: padded.info.width,
            height: padded.info.height,
            channels: 4,
        },
    });
    if (outputScaleFactor > 1) {
        outputPipeline = outputPipeline.resize(outputWidth, outputHeight, {
            fit: "fill",
            kernel: sharp.kernel.lanczos3,
        });
    }
    const outputBuffer = await outputPipeline
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();

    const output = await inspectGeneratedArtworkBytes(outputBuffer, "image/png");
    const normalization: ArtworkNormalizationDiagnostics = {
        backgroundRemovalApplied,
        backgroundColor,
        borderBackgroundCoherence,
        borderSeedRatio,
        removedPixelRatio,
        foregroundPixelRatio: bounds.visiblePixels / Math.max(1, pixelCount),
        haloSuppressionApplied,
        contentBounds: {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
        },
        paddingRatio,
        paddingPixels: {
            x: Math.round(paddingX * outputScaleFactor),
            y: Math.round(paddingY * outputScaleFactor),
        },
        outputScaleFactor,
    };
    const validation = await validateArtworkPng(
        outputBuffer,
        params.validationOptions
    );
    if (!validation.valid) {
        throw new ArtworkPrintValidationError({
            message: `Normalized artwork failed print validation: ${validation.errors.join(" ")}`,
            stage: "validation",
            diagnostics: {
                input,
                output,
                normalization,
            },
            validationErrors: validation.errors,
        });
    }

    return {
        buffer: outputBuffer,
        input,
        output,
        normalization,
        validation,
    };
}
