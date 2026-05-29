// Use the integrated Next.js API instead of a separate local proxy server.
const API_BASE_URL = '/api/washa-dtf-studio';

interface GenerationPreferences {
  removeBackground?: boolean;
  avoidHardEdges?: boolean;
  designPosition?: string;
  printPosition?: 'chest' | 'back' | 'shoulder_right' | 'shoulder_left' | null;
  printSize?: 'large' | 'small' | null;
  printPositionLabel?: string | null;
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
      ? 'The print artwork must have a transparent cutout boundary: no backdrop block, colored panel, boxed field, white rectangle, or square image area behind it.'
      : null,
    preferences.avoidHardEdges
      ? 'No forced frame, border, crop edge, enclosing rectangle, or hard outer edge unless the concept truly needs it.'
      : null,
    referenceImageBase64 && (preferences.removeBackground || preferences.avoidHardEdges)
      ? 'If a reference image has transparency, use only the visible foreground artwork; treat transparent pixels as absent and never render them as white, black, gray, or any background patch.'
      : null,
    referenceImageBase64 && (preferences.removeBackground || preferences.avoidHardEdges)
      ? 'Do not preserve the reference image background, frame, crop, or edges.'
      : null,
  ];

  const effectivePrintPosition =
    preferences.printPosition ||
    (preferences.designPosition?.startsWith('back') ? 'back' :
      preferences.designPosition === 'logo_right' ? 'shoulder_right' :
        preferences.designPosition === 'logo_left' ? 'shoulder_left' :
          'chest');
  const effectivePrintSize =
    preferences.printSize ||
    (preferences.designPosition?.includes('small') || preferences.designPosition?.startsWith('logo_') ? 'small' : 'large');

  let sceneDirectives = '';
  if (effectivePrintPosition === 'shoulder_right' || effectivePrintPosition === 'shoulder_left') {
    const imageSide = effectivePrintPosition === 'shoulder_right'
      ? 'RIGHT side of the image / viewer-right upper chest'
      : 'LEFT side of the image / viewer-left upper chest';
    const forbiddenSide = effectivePrintPosition === 'shoulder_right'
      ? 'left side'
      : 'right side';
    const placementCode = effectivePrintPosition === 'shoulder_right'
      ? 'LOGO_ON_IMAGE_RIGHT'
      : 'LOGO_ON_IMAGE_LEFT';

    sceneDirectives = compactPrompt([
      `Front-facing medium close-up photography of the upper torso showing a ${color} ${garmentType}.`,
      `Placement code: ${placementCode}.`,
      `A single ${effectivePrintSize === 'large' ? 'medium-large' : 'small pocket-sized'} DTF logo print is placed strictly on the ${imageSide} of the ${color} ${garmentType}.`,
      `Use screen/image coordinates only: image right means the viewer's right side, image left means the viewer's left side.`,
      `Camera framing: upper body visible, showing the collar, shoulders, and chest clearly so the garment type and the ${color} color are obvious.`,
      `Keep the center chest blank. Do not place the logo on the ${forbiddenSide}, do not center it on the chest, and do not move it to the back.`,
      preferences.printPositionLabel ? `Selected placement label: ${preferences.printPositionLabel}.` : null,
      `Clean studio lighting, soft fabric texture visible, professional garment mockup quality.`,
    ]);
  } else {
    const side = effectivePrintPosition === 'back' ? 'back panel / rear side' : 'chest/front';
    const scale = effectivePrintSize === 'large'
      ? 'large and centered, filling roughly 60-70% of the printable area'
      : 'small and neatly placed, filling roughly 20-30% of the printable area';
    const backInstruction = effectivePrintPosition === 'back'
      ? 'Rear-view mockup only: show the back side of the garment clearly, as if the garment/person is facing away from the camera. Do not show or use the chest/front side.'
      : 'Front-view mockup only: show the chest/front side of the garment clearly; do not place the artwork on the back.';

    sceneDirectives = compactPrompt([
      `Studio mockup of a full ${color} ${garmentType} with one DTF print placed on the ${side}.`,
      `Placement: ${scale}.`,
      backInstruction,
      effectivePrintPosition === 'back'
        ? 'The artwork must be on the rear back panel, not on the front chest. The front of the garment must not be visible as the printed side.'
        : 'The artwork must be on the front chest panel, not on the rear back panel.',
      preferences.printPositionLabel ? `Selected placement label: ${preferences.printPositionLabel}.` : null,
      `Full garment visible, clean studio background.`,
    ]);
  }
  const prompt = isCalligraphy
    ? compactPrompt([
        sceneDirectives,
        isArabicText
          ? `قم بتصميم المخطوطة الفنية التالية بالخط العربي الاحترافي وبدقة عالية وبدون أي نصوص لاتينية: "${calligraphyText}".`
          : `Render ONLY this phrase as artistic calligraphy: "${calligraphyText}".`,
        `Calligraphy style: ${style}.`,
        `Technique: ${technique}.`,
        `Palette: ${palette}.`,
        isArabicText
          ? 'خط عربي سليم، تداخل انسيابي للكلمات، تفاصيل عالية الوضوح على القماش، وبدون أي طبقات مكررة أو كلمات إضافية.'
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
  const prompt = `Extract the single graphic or calligraphy design from this garment mockup onto a perfectly flat 2D view. Output requirements: transparent background with alpha channel, only the artwork pixels, no simulated transparency, no checkerboard pattern, no white background, no colored canvas, no garment silhouette, no fabric texture, no wrinkles, no shadows, no reflections, absolutely NO duplication or double-drawn layers. Preserve all fine detail, color accuracy, and sharpness of the original artwork. Single clean transparent layer, print-ready DTF quality.`;

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
