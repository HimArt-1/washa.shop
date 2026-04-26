const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');
const keyLine = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const GEMINI_API_KEY = keyLine ? keyLine.split('=')[1].trim() : null;

async function test() {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    try {
        const models = [];
        for await (const m of ai.models.list()) {
            models.push(m.name);
        }
        console.log(models.filter(m => m.includes('image') || m.includes('gen')));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
