const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');

const keyLine = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const GEMINI_API_KEY = keyLine ? keyLine.split('=')[1].trim() : null;

async function test() {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    try {
        const response = await ai.models.generateImages({
            model: "imagen-3.0-generate-002",
            prompt: "A cute banana",
            config: { numberOfImages: 1, aspectRatio: "1:1" }
        });
        console.log("Success! Image generated.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
