import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const port = process.env.PORT || 3001;
const proxyToken = process.env.WASHA_DTF_PROXY_TOKEN;

function isLoopback(value?: string | null) {
  if (!value) return false;
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"].includes(value);
}

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return isLoopback(url.hostname);
  } catch {
    return false;
  }
}

function requireLocalOrProxyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.header("x-washa-dtf-proxy-token");
  const remoteAddress = req.socket.remoteAddress;

  if ((proxyToken && token === proxyToken) || isLoopback(remoteAddress)) {
    return next();
  }

  return res.status(403).json({ error: "Forbidden" });
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["POST", "OPTIONS"],
}));
app.use(express.json({ limit: process.env.AI_PROXY_JSON_LIMIT || '8mb' }));
app.use(requireLocalOrProxyToken);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Critical: GEMINI_API_KEY is not defined in .env.local");
}

const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

// Endpoint for generating mockup
app.post('/api/generate-mockup', async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: "AI proxy is not configured" });

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
    res.status(500).json({ error: "Mockup generation failed" });
  }
});

// Endpoint for extracting design
app.post('/api/extract-design', async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: "AI proxy is not configured" });

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
    res.status(500).json({ error: "Design extraction failed" });
  }
});

app.listen(port, () => {
  console.log(`AI Proxy Server listening at http://localhost:${port}`);
});
