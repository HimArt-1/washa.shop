import "server-only";

type PromptNativeReadinessOptions = {
    requireArtworkProvider?: boolean;
};

export const PROMPT_NATIVE_MODELS = {
    artwork: "gpt-image-1.5",
    mockup: "gemini-3.1-flash-image",
    verification: "gemini-2.5-flash",
} as const;

export function getConfiguredPromptNativeModels() {
    return {
        artwork: process.env.WASHA_PROMPT_NATIVE_OPENAI_MODEL?.trim()
            || PROMPT_NATIVE_MODELS.artwork,
        mockup: process.env.WASHA_PROMPT_NATIVE_GEMINI_MODEL?.trim()
            || PROMPT_NATIVE_MODELS.mockup,
        verification: process.env.WASHA_PROMPT_NATIVE_VERIFICATION_MODEL?.trim()
            || PROMPT_NATIVE_MODELS.verification,
    };
}

function getIncompatibleModels(requireArtworkProvider: boolean) {
    const configuredModels = getConfiguredPromptNativeModels();
    return (Object.keys(PROMPT_NATIVE_MODELS) as Array<keyof typeof PROMPT_NATIVE_MODELS>)
        .filter((stage) => requireArtworkProvider || stage !== "artwork")
        .filter((stage) => configuredModels[stage] !== PROMPT_NATIVE_MODELS[stage])
        .map((stage) => ({
            stage,
            configured: configuredModels[stage],
            required: PROMPT_NATIVE_MODELS[stage],
        }));
}

export function assertPromptNativeModelCompatibility(
    stages: Array<keyof typeof PROMPT_NATIVE_MODELS>
) {
    const configuredModels = getConfiguredPromptNativeModels();
    const incompatible = stages
        .filter((stage) => configuredModels[stage] !== PROMPT_NATIVE_MODELS[stage])
        .map((stage) => `${stage}:${configuredModels[stage]}`);
    if (incompatible.length > 0) {
        throw new Error(`Incompatible Prompt Native model configuration: ${incompatible.join(", ")}`);
    }
}

function configured(value: string | undefined) {
    return Boolean(value?.trim());
}

export function getPromptNativeReadiness(
    options: PromptNativeReadinessOptions = {}
) {
    const requireArtworkProvider = options.requireArtworkProvider !== false;
    const missing: string[] = [];
    const incompatibleModels = getIncompatibleModels(requireArtworkProvider);
    const enabledFlag = process.env.WASHA_DTF_GENERATION_ENABLED?.trim().toLowerCase();
    const disabled = enabledFlag === "false"
        || (process.env.NODE_ENV === "production" && enabledFlag !== "true");

    if (requireArtworkProvider && !configured(process.env.OPENAI_API_KEY)) {
        missing.push("OPENAI_API_KEY");
    }
    if (!configured(process.env.GEMINI_API_KEY)
        && !configured(process.env.GOOGLE_GENERATIVE_AI_API_KEY)) {
        missing.push("GEMINI_API_KEY");
    }

    if (disabled) {
        return {
            ready: false as const,
            code: "disabled" as const,
            missing,
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
        };
    }
    if (missing.length > 0) {
        return {
            ready: false as const,
            code: "provider_not_configured" as const,
            missing,
            message: "خط Prompt Native غير مهيأ بمفاتيح OpenAI وGemini المطلوبة.",
        };
    }
    if (incompatibleModels.length > 0) {
        return {
            ready: false as const,
            code: "model_not_supported" as const,
            missing,
            incompatibleModels,
            message: "إعداد نماذج Prompt Native لا يطابق النماذج المعتمدة للشفافية والتركيب.",
        };
    }

    return {
        ready: true as const,
        code: "ready" as const,
        missing,
        incompatibleModels,
        message: "خط Prompt Native جاهز.",
        artworkProvider: requireArtworkProvider ? "openai" as const : null,
        mockupProvider: "gemini" as const,
    };
}
