import { createHash, randomUUID } from "node:crypto";

const baseUrl = process.env.WASHA_E2E_BASE_URL?.replace(/\/+$/, "");
const token = process.env.WASHA_E2E_BEARER_TOKEN;
const garmentId = process.env.WASHA_E2E_GARMENT_ID;
const colorId = process.env.WASHA_E2E_COLOR_ID;
const sizeId = process.env.WASHA_E2E_SIZE_ID || null;

if (!baseUrl || !token || !garmentId || !colorId) {
    console.error(
        "Set WASHA_E2E_BASE_URL, WASHA_E2E_BEARER_TOKEN, WASHA_E2E_GARMENT_ID and WASHA_E2E_COLOR_ID."
    );
    process.exit(2);
}

const generationContext = {
    garmentId,
    colorId,
    sizeId,
    garmentType: process.env.WASHA_E2E_GARMENT_NAME || "تيشيرت",
    garmentColor: process.env.WASHA_E2E_COLOR_NAME || "أسود",
    colorHex: process.env.WASHA_E2E_COLOR_HEX || "#111111",
    designMethod: "text",
    style: "هندسي",
    technique: "رقمي",
    palette: "ذهبي وأسود",
    printPosition: "chest",
    printSize: "large",
    printScale: 70,
    printOffsetX: 0,
    printOffsetY: 0,
};

async function post(path, body, requestId) {
    const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(requestId ? { "X-Request-Id": requestId } : {}),
        },
        body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(`${path} failed (${response.status}): ${JSON.stringify(payload)}`);
    }
    return payload;
}

const requestId = randomUUID();
const generated = await post("/api/washa-dtf-studio/generate-mockup", {
    prompt: `WASHA E2E ${requestId}: geometric falcon without text`,
    referenceImage: null,
    garmentReferenceImage: null,
    generationContext,
}, requestId);

for (const field of [
    "designRequestId",
    "masterAssetId",
    "masterAssetUrl",
    "masterChecksum",
    "previewUrl",
]) {
    if (!generated[field]) throw new Error(`Generation response is missing ${field}.`);
}

const masterResponse = await fetch(generated.masterAssetUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
});
if (!masterResponse.ok) {
    throw new Error(`Private master fetch failed (${masterResponse.status}).`);
}
if (!String(masterResponse.headers.get("content-type")).includes("image/png")) {
    throw new Error("Private master is not PNG.");
}
const masterBytes = Buffer.from(await masterResponse.arrayBuffer());
const checksum = createHash("sha256").update(masterBytes).digest("hex");
if (checksum !== generated.masterChecksum) {
    throw new Error("Live master checksum mismatch.");
}

const recomposed = await post("/api/washa-dtf-studio/recompose-preview", {
    designRequestId: generated.designRequestId,
    masterAssetId: generated.masterAssetId,
    generationContext: {
        ...generationContext,
        printScale: 60,
        printOffsetX: 5,
    },
});
if (
    recomposed.masterAssetId !== generated.masterAssetId
    || recomposed.masterChecksum !== generated.masterChecksum
) {
    throw new Error("Recomposition changed the live master identity.");
}
if (recomposed.previewUrl === generated.previewUrl) {
    throw new Error("Recomposition did not produce a new preview derivative.");
}

console.log(JSON.stringify({
    ok: true,
    requestId,
    designRequestId: generated.designRequestId,
    masterAssetId: generated.masterAssetId,
    masterChecksum: generated.masterChecksum,
    source: generated.mockupSourceType,
    recomposedPreviewChanged: true,
}, null, 2));
