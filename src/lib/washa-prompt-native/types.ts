export type WashaGenerationPipeline = "standard" | "prompt_native";

export function normalizeWashaGenerationPipeline(
    value: unknown
): WashaGenerationPipeline {
    return value === "prompt_native" ? "prompt_native" : "standard";
}
