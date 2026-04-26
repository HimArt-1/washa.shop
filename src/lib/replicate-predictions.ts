/**
 * Replicate (Flux) — مشترك بين server actions (ai) و WASHA AI DTF.
 * لا يرتبط بـ "use server" — يستدعى من API routes و server actions.
 */

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
export const REPLICATE_WAIT_SECONDS = 120;

export const FLUX_SCHNELL = "black-forest-labs/flux-schnell";
export const FLUX_IMG2IMG = "bxclib2/flux_img2img";

export function isReplicateTokenConfigured() {
    return Boolean(REPLICATE_API_TOKEN);
}

export type ReplicateHttpErrorHandler = (status: number, body: string) => void | Promise<void>;

/**
 * ينتظر انتهاء التنبؤ (Prefer: wait) ويعيد روابط المخرجات.
 */
export async function runReplicatePredictions(
    params: { version: string; input: Record<string, unknown> },
    options?: { onHttpError?: ReplicateHttpErrorHandler }
): Promise<{ urls?: string[] } | null> {
    if (!REPLICATE_API_TOKEN) return null;

    const res = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${REPLICATE_WAIT_SECONDS}`,
        },
        body: JSON.stringify({
            version: params.version,
            input: params.input,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        await options?.onHttpError?.(res.status, err);
        throw new Error(err || "Replicate request failed");
    }

    const data = (await res.json()) as {
        status?: string;
        output?: string | string[];
        error?: string;
    };

    if (data.status !== "succeeded") {
        throw new Error(data.error || "التوليد لم يكتمل");
    }

    const output = data.output;
    if (Array.isArray(output)) {
        const urls = output.filter((value): value is string => typeof value === "string");
        return { urls };
    }
    if (typeof output === "string") {
        return { urls: [output] };
    }
    return null;
}
