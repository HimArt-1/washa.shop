const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');

const keyLine = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const GEMINI_API_KEY = keyLine ? keyLine.split('=')[1].trim() : null;

async function test() {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: { role: "user", parts: [{ text: "A cute banana" }] },
            config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
        });
        console.log("Success!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
