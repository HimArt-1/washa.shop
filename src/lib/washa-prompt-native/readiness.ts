import "server-only";

type PromptNativeReadinessOptions = {
    requireArtworkProvider?: boolean;
};

function configured(value: string | undefined) {
    return Boolean(value?.trim());
}

export function getPromptNativeReadiness(
    options: PromptNativeReadinessOptions = {}
) {
    const requireArtworkProvider = options.requireArtworkProvider !== false;
    const missing: string[] = [];
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

    return {
        ready: true as const,
        code: "ready" as const,
        missing,
        message: "خط Prompt Native جاهز.",
        artworkProvider: requireArtworkProvider ? "openai" as const : null,
        mockupProvider: "gemini" as const,
    };
}
