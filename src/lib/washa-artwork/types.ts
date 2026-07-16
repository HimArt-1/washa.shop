export type ArtworkSide = "front" | "back";
export type MockupSourceType = "reference" | "generated_blank_garment";

export type NormalizedPrintArea = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type PlacementTransform = {
    side: ArtworkSide;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    printWidthCm: number;
    printHeightCm: number;
    anchorX: number;
    anchorY: number;
    referenceMockupId: string | null;
    printAreaId: string;
    transformVersion: number;
};

export type ArtworkGenerationContext = {
    designMethod?: "text" | "image" | "calligraphy";
    style?: string | null;
    technique?: string | null;
    palette?: string | null;
    calligraphyText?: string | null;
    referenceImageMode?: "reinterpret" | "preserve_subject" | "style_inspiration" | null;
};

export type ArtworkValidationReport = {
    valid: boolean;
    errors: string[];
    warnings: string[];
    width: number;
    height: number;
    mimeType: "image/png";
    hasAlphaChannel: boolean;
    transparentPixelRatio: number;
    opaquePixelRatio: number;
    edgeOpaquePixelRatio: number;
    safePaddingRatio: number;
    flattenedBackgroundSuspected: boolean;
    contentBounds: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | null;
};

export type MasterAssetDescriptor = {
    id: string;
    permanentStoragePath: string;
    permanentUrl: string;
    checksum: string;
    width: number;
    height: number;
    mimeType: "image/png";
    alphaChannelStatus: "verified" | "fallback_processed";
    transparentPixelRatio: number;
    provider: string;
    model: string;
    prompt: string;
    generationParameters: Record<string, unknown>;
    createdAt: string;
};

export type GeneratedArtworkResponse = {
    imageUrl: string;
    previewUrl: string;
    frontPreviewUrl: string | null;
    backPreviewUrl: string | null;
    designRequestId: string;
    masterAssetId: string;
    masterAssetUrl: string;
    masterChecksum: string;
    mockupSourceType: MockupSourceType;
    placement: PlacementTransform;
    transparencyVerificationStatus: "verified" | "fallback_processed";
    productionReadinessStatus: "ready";
};
