const MAX_TELEMETRY_URL_LENGTH = 4096;

type NormalizedTelemetryImageUrl = {
    url: string | null;
    metadata: Record<string, unknown>;
};

export function normalizeDtfTelemetryImageUrlForLog(
    value: string | null | undefined,
    field: "reference_image" | "result_image"
): NormalizedTelemetryImageUrl {
    if (!value) {
        return { url: null, metadata: {} };
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return { url: null, metadata: {} };
    }

    const dataUrlHeaderEnd = trimmed.indexOf(",");
    const dataUrlHeader = dataUrlHeaderEnd > 0 ? trimmed.slice(0, dataUrlHeaderEnd) : "";
    const dataUrlMatch = dataUrlHeader.match(/^data:(image\/[a-z0-9.+-]+);base64$/i);

    if (dataUrlMatch) {
        return {
            url: null,
            metadata: {
                [`${field}_omitted`]: true,
                [`${field}_omitted_reason`]: "data_url",
                [`${field}_mime_type`]: dataUrlMatch[1],
                [`${field}_approx_bytes`]: Math.round(Math.max(0, trimmed.length - dataUrlHeaderEnd - 1) * 0.75),
            },
        };
    }

    if (trimmed.length > MAX_TELEMETRY_URL_LENGTH) {
        return {
            url: null,
            metadata: {
                [`${field}_omitted`]: true,
                [`${field}_omitted_reason`]: "url_too_long",
                [`${field}_original_length`]: trimmed.length,
            },
        };
    }

    return { url: trimmed, metadata: {} };
}
