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
  referenceImageMimeType?: string
): Promise<string | null> {
  const prompt = `Professional 8k studio mockup of a ${color} ${garmentType} with a single, bold, centered DTF print of: ${userDescription}. Style: ${style}, Technique: ${technique}, Palette: ${palette}. IMPORTANT: No text, no duplication, no double layers, sharp details on fabric.`;

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
  const prompt = `Isolate and extract the single 2D graphic design from the garment onto a flat 2D view. Background must be pure solid white (#FFFFFF). STRICT: No garment traces, no fabric texture, no shadows, and absolutely NO duplication or double-drawn layers. Single-layer high-definition graphic only.`;

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
