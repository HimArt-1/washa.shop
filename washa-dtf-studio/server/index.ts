import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Critical: GEMINI_API_KEY is not defined in .env.local");
}

const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

// Endpoint for generating mockup
app.post('/api/generate-mockup', async (req, res) => {
  try {
    const { prompt, referenceImage } = req.body;
    
    const parts: any[] = [{ text: prompt }];
    if (referenceImage) {
      parts.unshift({
        inlineData: {
          data: referenceImage.base64,
          mimeType: referenceImage.mimeType,
        },
      });
    }

    const response = await genAI.models.generateContent({ 
      model: "gemini-3.1-flash-image-preview",
      contents: { role: 'user', parts },
      // @ts-ignore
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K"
        }
      }
    });
    
    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({ 
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` 
        });
      }
    }
    
    res.status(500).json({ error: "No image generated in response" });
  } catch (error: any) {
    console.error("Mockup Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for extracting design
app.post('/api/extract-design', async (req, res) => {
  try {
    const { prompt, mockupImage, mimeType } = req.body;
    
    const response = await genAI.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: mockupImage,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      // @ts-ignore
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K"
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({ 
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` 
        });
      }
    }
    
    res.status(500).json({ error: "No image extracted in response" });
  } catch (error: any) {
    console.error("Extraction Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`AI Proxy Server listening at http://localhost:${port}`);
});
