// Use the integrated Next.js API instead of a separate local proxy server.
const API_BASE_URL = '/api/washa-dtf-studio';

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('الصورة المرجعية كبيرة جدًا. استخدم صورة أخف أو بدقة أقل.');
    }

    throw new Error(text || 'فشل الاتصال بالخادم');
  }

  throw new Error(text || 'استجابة غير متوقعة من الخادم');
}

export async function generateMockup(
  garmentType: string,
  color: string,
  userDescription: string,
  technique: string,
  style: string,
  palette: string,
  referenceImageBase64?: string,
  referenceImageMimeType?: string,
  calligraphyText?: string
): Promise<string | null> {
  const isCalligraphy = Boolean(calligraphyText && calligraphyText.trim());

  const prompt = isCalligraphy
    ? `Professional 8K studio mockup of a ${color} ${garmentType} featuring a single, centered masterful calligraphy print. Render the following text as stunning artistic calligraphy lettering: "${calligraphyText}". Calligraphy style: ${style}. Technique: ${technique}. Palette: ${palette}. The letters must be graceful, artistically stylized, with elegant curves and deliberate strokes. IMPORTANT: Render ONLY the provided phrase as calligraphy — no extra words, no duplications, no double layers, sharp crisp lettering on fabric.`
    : `Professional 8K studio mockup of a ${color} ${garmentType} with a single, bold, centered DTF graphic print. Visual concept: ${userDescription}. CRITICAL: Generate a purely VISUAL graphic artwork — absolutely NO text, NO letters, NO written words, NO typography anywhere in the design. Pure illustration only. Style: ${style}. Technique: ${technique}. Palette: ${palette}. IMPORTANT: No text of any kind. No duplication, no double layers, sharp details on fabric.`;

  try {
    const body: any = { prompt };
    if (referenceImageBase64 && referenceImageMimeType) {
      body.referenceImage = {
        base64: referenceImageBase64,
        mimeType: referenceImageMimeType
      };
    }

    const response = await fetch(`${API_BASE_URL}/generate-mockup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await parseApiResponse(response);
    if (data.error) throw new Error(data.error);
    return data.imageUrl || null;
  } catch (error) {
    console.error("Error generating mockup via proxy:", error);
    throw error;
  }
}

export async function extractDesign(mockupImageBase64: string, mimeType: string): Promise<string | null> {
  const prompt = `Extract the single graphic or calligraphy design from this garment mockup onto a perfectly flat 2D view. Output requirements: pure solid white background (#FFFFFF), no garment silhouette, no fabric texture, no wrinkles, no shadows, no reflections, absolutely NO duplication or double-drawn layers. Preserve all fine detail, color accuracy, and sharpness of the original artwork. Single clean layer, print-ready quality.`;

  try {
    const response = await fetch(`${API_BASE_URL}/extract-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mockupImage: mockupImageBase64,
        mimeType: mimeType
      }),
    });

    const data = await parseApiResponse(response);
    if (data.error) throw new Error(data.error);
    return data.imageUrl || null;
  } catch (error) {
    console.error("Error extracting design via proxy:", error);
    throw error;
  }
}
