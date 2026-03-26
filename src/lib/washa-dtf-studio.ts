import { GoogleGenAI } from "@google/genai";

export const WASHA_DTF_MODEL = "gemini-3.1-flash-image-preview";

export function getWashaDtfGenAiClient() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    return new GoogleGenAI({ apiKey });
}

export function extractGeneratedImageDataUrl(response: any) {
    for (const part of response?.candidates?.[0]?.content?.parts || []) {
        if (part?.inlineData?.data && part?.inlineData?.mimeType) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    return null;
}
