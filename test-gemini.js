const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function test() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:predict`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instances: [{ prompt: "A cute banana" }],
            parameters: { sampleCount: 1, aspectRatio: "1:1", outputMimeType: "image/png" },
        }),
    });
    console.log(res.status, await res.text());
}
test();
