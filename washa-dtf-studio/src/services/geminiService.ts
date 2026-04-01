// Use the integrated Next.js API instead of a separate local proxy server.
const API_BASE_URL = '/api/washa-dtf-studio';

interface GenerationPreferences {
  removeBackground?: boolean;
  avoidHardEdges?: boolean;
}

function compactPrompt(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const traceId = response.headers.get('x-trace-id') || response.headers.get('X-Trace-Id');
  const withTrace = (message: string) => (traceId ? `${message} (trace: ${traceId})` : message);

  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const msg =
        (typeof data?.error === 'string' && data.error.trim())
          ? data.error
          : (typeof data?.message === 'string' && data.message.trim())
            ? data.message
            : `HTTP ${response.status}`;
      throw new Error(withTrace(msg));
    }
    return data;
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(withTrace('الصورة المرجعية كبيرة جدًا. استخدم صورة أخف أو بدقة أقل.'));
    }

    throw new Error(withTrace(text || 'فشل الاتصال بالخادم'));
  }

  throw new Error(withTrace(text || 'استجابة غير متوقعة من الخادم'));
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
  calligraphyText?: string,
  preferences: GenerationPreferences = {}
): Promise<string | null> {
  const isCalligraphy = Boolean(calligraphyText && calligraphyText.trim());
  const isArabicText = isCalligraphy && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(calligraphyText!);
  const printDirectives = [
    'Premium DTF print integrated directly into the garment.',
    preferences.removeBackground
      ? 'No backdrop block, colored panel, boxed field, or square image area behind the artwork.'
      : null,
    preferences.avoidHardEdges
      ? 'No forced frame, border, crop edge, enclosing rectangle, or hard outer edge unless the concept truly needs it.'
      : null,
    referenceImageBase64 && (preferences.removeBackground || preferences.avoidHardEdges)
      ? 'If a reference image is used, reinterpret only its subject for print and do not preserve its background, frame, crop, or edges.'
      : null,
  ];

  const sceneDirectives = `Studio mockup of a ${color} ${garmentType} with one centered DTF print.`;
  const prompt = isCalligraphy
    ? compactPrompt([
        sceneDirectives,
        isArabicText
          ? `Render ONLY this Arabic phrase as artistic calligraphy, written right-to-left with fully accurate Arabic letterforms and correct connections between letters: "${calligraphyText}". Do not transliterate, do not romanize, do not substitute Latin characters. Reproduce every Arabic letter exactly as written.`
          : `Render ONLY this phrase as artistic calligraphy: "${calligraphyText}".`,
        `Calligraphy style: ${style}.`,
        `Technique: ${technique}.`,
        `Palette: ${palette}.`,
        isArabicText
          ? 'Graceful Arabic strokes, authentic calligraphy proportions, right-to-left flow, sharp letterforms on fabric, and no duplicated layers or extra words.'
          : 'Graceful curves, elegant strokes, sharp lettering on fabric, and no duplicated layers or extra words.',
        ...printDirectives,
      ])
    : compactPrompt([
        sceneDirectives,
        `Visual concept: ${userDescription}.`,
        'Pure illustration only. No text, letters, words, or typography.',
        `Style: ${style}.`,
        `Technique: ${technique}.`,
        `Palette: ${palette}.`,
        'Single clean design with sharp details on fabric and no duplicated layers.',
        ...printDirectives,
      ]);

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
    if (data?.error) throw new Error(data.error);
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
    if (data?.error) throw new Error(data.error);
    return data.imageUrl || null;
  } catch (error) {
    console.error("Error extracting design via proxy:", error);
    throw error;
  }
}
