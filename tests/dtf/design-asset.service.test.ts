import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const {
    mockGetSupabaseAdminClient,
    mockGenerateIsolatedArtwork,
    mockGenerateBlankGarment,
    mockUploadImmutableBuffer,
    mockDownloadStoredBuffer,
    mockLogDtfTrace,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockGenerateIsolatedArtwork: vi.fn(),
    mockGenerateBlankGarment: vi.fn(),
    mockUploadImmutableBuffer: vi.fn(),
    mockDownloadStoredBuffer: vi.fn(),
    mockLogDtfTrace: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/lib/washa-artwork/provider", () => ({
    generateIsolatedArtwork: mockGenerateIsolatedArtwork,
    generateBlankGarment: mockGenerateBlankGarment,
}));

vi.mock("@/lib/washa-artwork/arabic-text-verification", () => ({
    verifyExactArabicText: vi.fn(async ({ expectedText }: { expectedText?: string | null }) => ({
        required: Boolean(expectedText),
        verified: true,
        observedText: expectedText || null,
        model: expectedText ? "gpt-4o-mini" : null,
    })),
}));

vi.mock("@/lib/washa-artwork/garment-semantic-verification", () => ({
    verifyBlankGarmentSemantics: vi.fn(async () => ({
        verified: true,
        model: "gpt-4o-mini",
        isBlank: true,
        matchesGarmentType: true,
        matchesColor: true,
        matchesSide: true,
        printAreaClear: true,
        printArea: { x: 0.3, y: 0.22, width: 0.4, height: 0.46 },
    })),
}));

vi.mock("@/app/api/washa-dtf-studio/services/storage.service", () => ({
    StorageService: {
        uploadImmutableBuffer: mockUploadImmutableBuffer,
        downloadStoredBuffer: mockDownloadStoredBuffer,
        getPrivateAssetUrl: vi.fn((kind: string, id: string) => `https://washa.shop/assets/${kind}/${id}`),
    },
}));

vi.mock("@/app/api/washa-dtf-studio/utils/trace", () => ({
    logDtfTrace: mockLogDtfTrace,
}));

import { DesignAssetService } from "@/app/api/washa-dtf-studio/services/design-asset.service";
import { sha256Hex, validateArtworkPng } from "@/lib/washa-artwork/validation";

type QueryMode = "front-reference" | "back-fallback";

function queryChain(
    table: string,
    mode: QueryMode,
    rows: Record<string, unknown[]>,
    frontReferenceUrl: string
) {
    const filters: Record<string, unknown> = {};
    return {
        select() { return this; },
        eq(column: string, value: unknown) {
            filters[column] = value;
            return this;
        },
        is(column: string, value: unknown) {
            filters[column] = value;
            return this;
        },
        order() { return this; },
        limit() { return this; },
        async maybeSingle() {
            if (table === "washa_design_requests") {
                const request = rows[table]?.find((candidate: any) =>
                    (!filters.profile_id || candidate.profile_id === filters.profile_id)
                    && (!filters.generation_request_id
                        || candidate.generation_request_id === filters.generation_request_id)
                ) ?? null;
                return { data: request, error: null };
            }
            if (table === "washa_design_master_assets") {
                const master = rows[table]?.find((candidate: any) =>
                    (!filters.id || candidate.id === filters.id)
                    && (!filters.sha256_checksum
                        || candidate.sha256_checksum === filters.sha256_checksum)
                ) ?? null;
                return { data: master, error: null };
            }
            if (table === "custom_design_garments") {
                return {
                    data: {
                        id: "44444444-4444-4444-8444-444444444444",
                        name: "تيشيرت",
                    },
                    error: null,
                };
            }
            if (table === "custom_design_colors") {
                return {
                    data: {
                        id: "55555555-5555-4555-8555-555555555555",
                        garment_id: "44444444-4444-4444-8444-444444444444",
                        name: "أسود",
                        hex_code: "#111111",
                    },
                    error: null,
                };
            }
            if (table === "washa_garment_mockup_assets") {
                const isFrontReference =
                    filters.side === "front"
                    && filters.source_type === "reference";
                if (isFrontReference) {
                    return {
                        data: {
                            id: "33333333-3333-4333-8333-333333333333",
                            source_type: "reference",
                            image_url: frontReferenceUrl,
                            print_area_id: "front_default",
                            print_area: { x: 0.3, y: 0.22, width: 0.4, height: 0.46 },
                            garment_mask_url: null,
                            shading_map_url: null,
                            displacement_map_url: null,
                        },
                        error: null,
                    };
                }
                return { data: null, error: null };
            }
            return { data: null, error: null };
        },
        async single() {
            if (table === "washa_design_requests") {
                return { data: rows[table]?.at(-1) ?? null, error: null };
            }
            if (table === "washa_design_master_assets") {
                return { data: rows[table]?.at(-1) ?? null, error: null };
            }
            return { data: null, error: null };
        },
        async insert(payload: unknown) {
            rows[table] ||= [];
            rows[table].push(payload);
            return { error: null };
        },
        update(payload: Record<string, unknown>) {
            rows[table] ||= [];
            const latest = rows[table].at(-1);
            if (latest && typeof latest === "object") Object.assign(latest, payload);
            return this;
        },
    };
}

async function transparentArtwork() {
    return sharp(Buffer.from(`
        <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="48" r="24" fill="#d2233c"/>
        </svg>
    `)).png().toBuffer();
}

async function garmentBase(color: { r: number; g: number; b: number }) {
    return sharp({
        create: {
            width: 240,
            height: 300,
            channels: 4,
            background: { ...color, alpha: 1 },
        },
    }).png().toBuffer();
}

describe("DesignAssetService", () => {
    let master: Buffer;
    let frontGarment: Buffer;
    let backGarment: Buffer;
    let mode: QueryMode;
    let rows: Record<string, unknown[]>;
    let storedBuffers: Map<string, Buffer>;

    beforeEach(async () => {
        vi.stubEnv("WASHA_DTF_MIN_ARTWORK_DIMENSION", "64");
        vi.stubEnv("WASHA_DTF_MIN_EFFECTIVE_DPI", "1");
        vi.stubEnv("WASHA_DTF_MIN_MOCKUP_DIMENSION", "200");
        vi.stubEnv("WASHA_DTF_MIN_GARMENT_PRINT_AREA_ENTROPY", "0");
        master = await transparentArtwork();
        frontGarment = await garmentBase({ r: 30, g: 32, b: 34 });
        backGarment = await garmentBase({ r: 35, g: 37, b: 39 });
        mode = "front-reference";
        rows = {};
        storedBuffers = new Map();
        mockGetSupabaseAdminClient.mockReset();
        mockGenerateIsolatedArtwork.mockReset();
        mockGenerateBlankGarment.mockReset();
        mockUploadImmutableBuffer.mockReset();
        mockDownloadStoredBuffer.mockReset();
        mockLogDtfTrace.mockReset();

        mockGenerateIsolatedArtwork.mockResolvedValue({
            imageUrl: `data:image/png;base64,${master.toString("base64")}`,
            provider: "openai",
            model: "gpt-image-1",
            parameters: {
                output_format: "png",
                background: "transparent",
                quality: "high",
            },
        });
        mockGenerateBlankGarment.mockResolvedValue({
            imageUrl: `data:image/png;base64,${backGarment.toString("base64")}`,
            provider: "genai",
            model: "gemini-3.1-flash-image",
            parameters: { imageSize: "2K" },
        });
        mockUploadImmutableBuffer.mockImplementation(async (
            buffer: Buffer,
            path: string,
            options: { mimeType: string; accessUrl: string }
        ) => {
            storedBuffers.set(path, Buffer.from(buffer));
            return {
                bucket: "washa-design-assets",
                path,
                url: options.accessUrl,
                size: buffer.byteLength,
                mimeType: options.mimeType,
            };
        });
        mockDownloadStoredBuffer.mockImplementation(async (path: string) =>
            path.includes("garment-mockups")
                ? backGarment
                : storedBuffers.get(path) ?? master
        );
        mockGetSupabaseAdminClient.mockImplementation(() => ({
            from(table: string) {
                return queryChain(
                    table,
                    mode,
                    rows,
                    `data:image/png;base64,${frontGarment.toString("base64")}`
                );
            },
            __rows: rows,
        }));
    });

    it("stores the generated artwork once, prefers an exact reference, and derives the preview from that master", async () => {
        const result = await DesignAssetService.generate({
            profileId: "profile_1",
            generationRequestId: "generation_1",
            userIdea: "صقر هندسي",
            referenceImage: null,
            context: {
                designMethod: "text",
                style: "هندسي",
                technique: "رقمي",
                palette: "ذهبي",
            },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                colorHex: "#111111",
                printPosition: "chest",
                printSize: "large",
                printScale: 80,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        });

        expect(mockGenerateBlankGarment).not.toHaveBeenCalled();
        const masterUploads = mockUploadImmutableBuffer.mock.calls.filter(([, path]) =>
            String(path).endsWith("/design-master.png")
        );
        expect(masterUploads).toHaveLength(1);
        expect(result.masterAssetUrl).toContain("/assets/master/");
        expect(result).toMatchObject({
            provider: "openai",
            model: "gpt-image-1",
        });
        expect(mockGenerateIsolatedArtwork).toHaveBeenCalledWith(
            expect.objectContaining({ traceId: "generation_1" })
        );
        expect(result.previewUrl).toContain("/assets/derivative/");
        expect(result.previewUrl).not.toBe(mockGenerateIsolatedArtwork.mock.results[0]?.value?.imageUrl);
        expect(result.mockupSourceType).toBe("reference");
        expect(rows.washa_design_master_assets).toHaveLength(1);
        expect(rows.washa_design_asset_derivatives[0]).toMatchObject({
            source_master_asset_id: result.masterAssetId,
            source_checksum: result.masterChecksum,
            derivative_type: "mockup_front",
        });
        expect(rows.washa_design_requests[0]).toMatchObject({
            master_asset_id: result.masterAssetId,
            mockup_source_type: "reference",
            production_readiness_status: "ready",
        });
    });

    it("normalizes a Gemini JPEG once and uses the resulting PNG as the only master for previews and print lineage", async () => {
        const jpeg = await sharp(Buffer.from(`
            <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
                <rect width="192" height="192" fill="#fafafa"/>
                <circle cx="96" cy="96" r="45" fill="#d2233c"/>
            </svg>
        `))
            .removeAlpha()
            .jpeg({ quality: 94 })
            .toBuffer();
        mockGenerateIsolatedArtwork.mockResolvedValueOnce({
            imageUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
            provider: "genai",
            model: "gemini-3-pro-image",
            parameters: { responseModalities: ["IMAGE"] },
        });

        const result = await DesignAssetService.generate({
            profileId: "profile_1",
            generationRequestId: "generation_gemini_jpeg",
            userIdea: "شارة دائرية حمراء",
            referenceImage: null,
            context: {
                designMethod: "text",
                style: "هندسي",
                technique: "رقمي",
                palette: "أحمر",
            },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                colorHex: "#111111",
                printPosition: "chest",
                printSize: "large",
                printScale: 80,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        });

        const masterUploads = mockUploadImmutableBuffer.mock.calls.filter(([, path]) =>
            String(path).endsWith("/design-master.png")
        );
        expect(masterUploads).toHaveLength(1);
        const normalizedMaster = masterUploads[0][0] as Buffer;
        const metadata = await sharp(normalizedMaster).metadata();
        const validation = await validateArtworkPng(normalizedMaster, {
            minDimension: 64,
            minSafePaddingRatio: 0.08,
        });

        expect(mockGenerateIsolatedArtwork).toHaveBeenCalledTimes(1);
        expect(metadata.format).toBe("png");
        expect(metadata.hasAlpha).toBe(true);
        expect(validation.valid).toBe(true);
        expect(sha256Hex(normalizedMaster)).toBe(result.masterChecksum);
        expect(rows.washa_design_master_assets[0]).toMatchObject({
            id: result.masterAssetId,
            sha256_checksum: result.masterChecksum,
            mime_type: "image/png",
            alpha_channel_status: "fallback_processed",
            generation_parameters: expect.objectContaining({
                sourceEquivalentWidth: expect.any(Number),
                sourceEquivalentHeight: expect.any(Number),
            }),
        });
        const storedMaster = rows.washa_design_master_assets[0] as {
            width: number;
            height: number;
            generation_parameters: {
                sourceEquivalentWidth: number;
                sourceEquivalentHeight: number;
            };
        };
        expect(
            storedMaster.generation_parameters.sourceEquivalentWidth
        ).toBeLessThanOrEqual(storedMaster.width);
        expect(
            storedMaster.generation_parameters.sourceEquivalentHeight
        ).toBeLessThanOrEqual(storedMaster.height);
        expect(rows.washa_design_asset_derivatives[0]).toMatchObject({
            source_master_asset_id: result.masterAssetId,
            source_checksum: result.masterChecksum,
            derivative_type: "mockup_front",
        });
        expect(rows.washa_design_requests[0]).toMatchObject({
            master_asset_id: result.masterAssetId,
            transparency_verification_status: "fallback_processed",
            production_readiness_status: "ready",
        });

        const completedLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "artwork_normalization_completed"
        );
        expect(completedLog?.[3]).toMatchObject({
            attemptedProvider: "genai",
            attemptedModel: "gemini-3-pro-image",
            input: {
                declaredMimeType: "image/jpeg",
                magicBytesFormat: "jpeg",
                detectedFormat: "jpeg",
                hasAlphaChannel: false,
            },
            output: {
                detectedFormat: "png",
                hasAlphaChannel: true,
            },
        });
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain("base64");
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain("data:image");
    });

    it.each([
        { provider: "genai", model: "gemini-3-pro-image" },
        { provider: "openai", model: "gpt-image-2" },
    ])(
        "recovers one untrusted $provider background without changing the accepted master lineage",
        async ({ provider, model }) => {
        const generationRequestId = `generation_${provider}_background_recovery`;
        const ambiguousJpeg = await sharp(Buffer.from(`
            <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="96" height="96" fill="#ff0000"/>
                <rect x="96" y="0" width="96" height="96" fill="#00ff00"/>
                <rect x="0" y="96" width="96" height="96" fill="#0000ff"/>
                <rect x="96" y="96" width="96" height="96" fill="#ffff00"/>
                <circle cx="96" cy="96" r="34" fill="#111111"/>
            </svg>
        `))
            .removeAlpha()
            .jpeg({ quality: 94 })
            .toBuffer();
        const recoveredJpeg = await sharp(Buffer.from(`
            <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
                <rect width="192" height="192" fill="#f2f2f2"/>
                <circle cx="96" cy="96" r="34" fill="#111111"/>
                <circle cx="96" cy="96" r="10" fill="#ffffff"/>
            </svg>
        `))
            .removeAlpha()
            .jpeg({ quality: 94 })
            .toBuffer();
        mockGenerateIsolatedArtwork
            .mockResolvedValueOnce({
                imageUrl: `data:image/jpeg;base64,${ambiguousJpeg.toString("base64")}`,
                provider,
                model,
                parameters: { responseModalities: ["IMAGE"] },
            })
            .mockResolvedValueOnce({
                imageUrl: `data:image/jpeg;base64,${recoveredJpeg.toString("base64")}`,
                provider,
                model,
                parameters: { responseModalities: ["IMAGE"] },
            });

        const result = await DesignAssetService.generate({
            profileId: "profile_1",
            generationRequestId,
            userIdea: "شارة دائرية سوداء بعنصر أبيض داخلي",
            referenceImage: null,
            context: {
                designMethod: "text",
                style: "هندسي",
                technique: "رقمي",
                palette: "أسود وأبيض",
            },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                colorHex: "#111111",
                printPosition: "chest",
                printSize: "large",
                printScale: 80,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        });

        expect(mockGenerateIsolatedArtwork).toHaveBeenCalledTimes(2);
        expect(mockGenerateIsolatedArtwork.mock.calls[1][0]).toMatchObject({
            prompt: expect.stringMatching(
                /do not create a new design[\s\S]*perfectly uniform solid/i
            ),
            referenceImageDataUrl: expect.stringMatching(/^data:image\/jpeg;base64,/),
            traceId: generationRequestId,
            requiredProvider: provider,
            requiredModel: model,
            attemptPurpose: "background_recovery",
        });
        const masterUploads = mockUploadImmutableBuffer.mock.calls.filter(([, path]) =>
            String(path).endsWith("/design-master.png")
        );
        expect(masterUploads).toHaveLength(1);
        const recoveredMaster = masterUploads[0][0] as Buffer;
        expect(sha256Hex(recoveredMaster)).toBe(result.masterChecksum);
        const recoveredRaw = await sharp(recoveredMaster)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const centerOffset = (
            Math.floor(recoveredRaw.info.height / 2) * recoveredRaw.info.width
            + Math.floor(recoveredRaw.info.width / 2)
        ) * 4;
        expect(recoveredRaw.data[centerOffset]).toBeGreaterThan(240);
        expect(recoveredRaw.data[centerOffset + 1]).toBeGreaterThan(240);
        expect(recoveredRaw.data[centerOffset + 2]).toBeGreaterThan(240);
        expect(recoveredRaw.data[centerOffset + 3]).toBeGreaterThan(245);
        expect(rows.washa_design_asset_derivatives[0]).toMatchObject({
            source_master_asset_id: result.masterAssetId,
            source_checksum: result.masterChecksum,
        });
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "dtf.artwork.normalization",
            generationRequestId,
            "artwork_background_recovery_started",
            expect.objectContaining({
                attemptedProvider: provider,
                attemptedModel: model,
                normalizationAttempt: 1,
            })
        );
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain("base64");
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain("data:image");
    });

    it("fails safely after one background recovery when the second Gemini image is still untrusted", async () => {
        const ambiguousJpeg = await sharp(Buffer.from(`
            <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="96" height="96" fill="#ff0000"/>
                <rect x="96" y="0" width="96" height="96" fill="#00ff00"/>
                <rect x="0" y="96" width="96" height="96" fill="#0000ff"/>
                <rect x="96" y="96" width="96" height="96" fill="#ffff00"/>
                <circle cx="96" cy="96" r="34" fill="#111111"/>
            </svg>
        `))
            .removeAlpha()
            .jpeg({ quality: 94 })
            .toBuffer();
        mockGenerateIsolatedArtwork.mockResolvedValue({
            imageUrl: `data:image/jpeg;base64,${ambiguousJpeg.toString("base64")}`,
            provider: "genai",
            model: "gemini-3-pro-image",
            parameters: { responseModalities: ["IMAGE"] },
        });

        await expect(DesignAssetService.generate({
            profileId: "profile_1",
            generationRequestId: "generation_gemini_background_recovery_failed",
            userIdea: "شارة دائرية",
            referenceImage: null,
            context: { designMethod: "text" },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                colorHex: "#111111",
                printPosition: "chest",
                printSize: "large",
                printScale: 80,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        })).rejects.toMatchObject({
            code: "ARTWORK_PRINT_VALIDATION_FAILED",
            stage: "normalization",
        });

        expect(mockGenerateIsolatedArtwork).toHaveBeenCalledTimes(2);
        expect(mockUploadImmutableBuffer).not.toHaveBeenCalled();
        const events = mockLogDtfTrace.mock.calls.map((call) => call[2]);
        expect(events).toContain("artwork_background_recovery_started");
        expect(events).toContain("artwork_print_validation_failed");
        expect(events).not.toContain("provider_failed");
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain("base64");
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain("data:image");
    });

    it("does not substitute a front reference for a requested back view and generates only a blank garment fallback", async () => {
        mode = "back-fallback";
        const result = await DesignAssetService.generate({
            profileId: "profile_1",
            generationRequestId: "generation_2",
            userIdea: "وشّى",
            referenceImage: null,
            context: {
                designMethod: "calligraphy",
                calligraphyText: "وشّى",
                style: "ديواني",
                technique: "حبر",
                palette: "ذهبي",
            },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                colorHex: "#111111",
                printPosition: "back",
                printSize: "large",
                printScale: 75,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        });

        expect(result.mockupSourceType).toBe("generated_blank_garment");
        expect(mockGenerateBlankGarment).toHaveBeenCalledOnce();
        const blankPrompt = String(mockGenerateBlankGarment.mock.calls[0][0]);
        expect(blankPrompt).toContain("clean blank apparel mockup only");
        expect(blankPrompt).toContain("no artwork, no print, no logo");
        expect(blankPrompt).not.toContain("وشّى");
        expect(rows.washa_garment_mockup_assets[0]).toMatchObject({
            side: "back",
            source_type: "generated_blank_garment",
        });
    });

    it("re-composites placement changes without regenerating or replacing the master artwork", async () => {
        const initial = await DesignAssetService.generate({
            profileId: "profile_1",
            generationRequestId: "generation_recompose",
            userIdea: "صقر هندسي",
            context: { designMethod: "text", style: "هندسي", technique: "رقمي", palette: "ذهبي" },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "tampered garment label",
                garmentColor: "tampered color label",
                colorHex: "#ff0000",
                printPosition: "chest",
                printSize: "large",
                printScale: 80,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        });

        const recomposed = await DesignAssetService.recompose({
            profileId: "profile_1",
            designRequestId: initial.designRequestId,
            masterAssetId: initial.masterAssetId,
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "still ignored",
                garmentColor: "still ignored",
                colorHex: "#ffffff",
                printPosition: "chest",
                printSize: "large",
                printScale: 50,
                printOffsetX: 5,
                printOffsetY: 0,
            },
        });

        expect(mockGenerateIsolatedArtwork).toHaveBeenCalledOnce();
        expect(recomposed.masterAssetId).toBe(initial.masterAssetId);
        expect(recomposed.masterChecksum).toBe(initial.masterChecksum);
        expect(recomposed.placement.printWidthCm).toBeLessThan(initial.placement.printWidthCm);
        expect(rows.washa_design_requests[0]).toMatchObject({
            selected_color_hex: "#111111",
            generation_status: "ready",
        });
        const masterUploads = mockUploadImmutableBuffer.mock.calls.filter(([, path]) =>
            String(path).endsWith("/design-master.png")
        );
        expect(masterUploads).toHaveLength(1);
    });

    it("resumes preview creation from the persisted master after a derivative failure", async () => {
        let failPreviewOnce = true;
        mockUploadImmutableBuffer.mockImplementation(async (
            buffer: Buffer,
            path: string,
            options: { mimeType: string; accessUrl: string }
        ) => {
            if (path.includes("/mockup_front/") && failPreviewOnce) {
                failPreviewOnce = false;
                return { error: "preview unavailable", status: 503 };
            }
            storedBuffers.set(path, Buffer.from(buffer));
            return {
                bucket: "washa-design-assets",
                path,
                url: options.accessUrl,
                size: buffer.byteLength,
                mimeType: options.mimeType,
            };
        });
        const input = {
            profileId: "profile_1",
            generationRequestId: "generation_resume",
            userIdea: "صقر هندسي",
            context: { designMethod: "text" as const, style: "هندسي", technique: "رقمي", palette: "ذهبي" },
            selection: {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                sizeId: null,
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                colorHex: "#111111",
                printPosition: "chest" as const,
                printSize: "large" as const,
                printScale: 80,
                printOffsetX: 0,
                printOffsetY: 0,
            },
        };

        await expect(DesignAssetService.generate(input)).rejects.toThrow("preview unavailable");
        const resumed = await DesignAssetService.generate(input);

        expect(resumed.productionReadinessStatus).toBe("ready");
        expect(mockGenerateIsolatedArtwork).toHaveBeenCalledOnce();
        expect(rows.washa_design_master_assets).toHaveLength(1);
        expect(rows.washa_design_requests).toHaveLength(1);
    });
});
