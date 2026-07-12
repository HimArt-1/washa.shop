import { isCleanOutputEnabled } from '../lib/outputPreferences';

// Use the integrated Next.js API instead of a separate local proxy server.
import {
  getPublicStudioErrorMessage,
  PUBLIC_EXTRACTION_ERROR,
  PUBLIC_GENERATION_ERROR,
  type PublicStudioErrorScope,
} from '../lib/publicErrors';

const API_BASE_URL = '/api/washa-dtf-studio';

interface GenerationPreferences {
  removeBackground?: boolean;
  avoidHardEdges?: boolean;
  designPosition?: string;
  printPosition?: 'chest' | 'back' | 'shoulder_right' | 'shoulder_left' | null;
  printSize?: 'large' | 'small' | null;
  printPositionLabel?: string | null;
  garmentColorHex?: string | null;
  garmentReferenceImageBase64?: string;
  garmentReferenceImageMimeType?: string;
  garmentReferenceSide?: 'front' | 'back';
}

// أحداث تحدّث واجهة الرصيد بعد كل توليد أو عند نفاد الحصة.
export const QUOTA_CHANGED_EVENT = 'washa:quota-changed';
export const QUOTA_EXCEEDED_EVENT = 'washa:quota-exceeded';

function dispatchQuotaChanged(data: { freeRemaining?: unknown; paidBalance?: unknown }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(QUOTA_CHANGED_EVENT, {
      detail: {
        freeRemaining: typeof data?.freeRemaining === 'number' ? data.freeRemaining : null,
        paidBalance: typeof data?.paidBalance === 'number' ? data.paidBalance : null,
      },
    })
  );
}

function dispatchQuotaExceeded(info: {
  code?: unknown;
  canPurchase?: unknown;
  freeRemaining?: unknown;
  paidBalance?: unknown;
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(QUOTA_EXCEEDED_EVENT, {
      detail: {
        reason: info?.code === 'audience_disabled' ? 'blocked' : 'exhausted',
        canPurchase: info?.canPurchase === true,
        freeRemaining: typeof info?.freeRemaining === 'number' ? info.freeRemaining : 0,
        paidBalance: typeof info?.paidBalance === 'number' ? info.paidBalance : 0,
      },
    })
  );
}

function compactPrompt(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createPublicApiError(
  message: string | null | undefined,
  scope: PublicStudioErrorScope,
  response?: Response,
  data?: unknown
) {
  const publicMessage = getPublicStudioErrorMessage(message, scope);
  const error = new Error(publicMessage);
  (error as Error & { data?: unknown; status?: number }).data = data;
  if (response) {
    (error as Error & { data?: unknown; status?: number }).status = response.status;
  }
  return error;
}

async function parseApiResponse(response: Response, scope: PublicStudioErrorScope) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const msg =
        (typeof data?.error === 'string' && data.error.trim())
          ? data.error
          : (typeof data?.message === 'string' && data.message.trim())
            ? data.message
            : `HTTP ${response.status}`;
      throw createPublicApiError(msg, scope, response, data);
    }
    return data;
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 413) {
      throw createPublicApiError('الصورة المرجعية كبيرة جدًا. استخدم صورة أخف أو بدقة أقل.', scope, response);
    }

    throw createPublicApiError(text || null, scope, response);
  }

  throw createPublicApiError(text || null, scope, response);
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
  const selectedColorDirective = compactPrompt([
    color ? `selected color name: ${color}` : null,
    preferences.garmentColorHex ? `selected color hex: ${preferences.garmentColorHex}` : null,
  ]);
  const hasGarmentReference = Boolean(preferences.garmentReferenceImageBase64 && preferences.garmentReferenceImageMimeType);
  const cleanOutputEnabled = isCleanOutputEnabled(preferences);
  const garmentReferenceDirectives = [
    hasGarmentReference
      ? 'Use the hidden operational garment reference image only as the base product reference for the final mockup: preserve garment cut, collar, sleeves, seams, fit, fabric folds, proportions, camera angle, and studio lighting.'
      : 'No hidden garment reference is supplied. Treat the selected garment type, color, side, and print placement as authoritative product specifications. Generate a photorealistic premium studio product mockup with the correct garment silhouette, collar/hood/sleeves/fit, fabric behavior, and camera framing; not line art, sketch, vector preview, drawing, or flat catalog icon.',
    hasGarmentReference && preferences.garmentReferenceSide
      ? `The garment reference side is ${preferences.garmentReferenceSide}; generate the same side unless the selected print placement explicitly requires otherwise.`
      : null,
    `Recolor only the garment fabric to the customer's selected color (${selectedColorDirective || color}); keep realistic texture, wrinkles, shadows, and highlights. Do not leave the garment white unless white is the selected color.`,
    hasGarmentReference
      ? 'The garment reference is operational only. Never treat the blank garment or recolored garment as the finished result; it must receive the new customer artwork described in the text prompt.'
      : null,
    'The final mockup must show the selected garment type clearly and realistically with the print integrated on fabric.',
  ];
  const printDirectives = [
    'Premium DTF print integrated directly into the garment.',
    cleanOutputEnabled
      ? 'MANDATORY CLEAN ARTWORK OUTPUT: the print artwork must have a transparent cutout boundary with no background of any kind; no frame, border, crop edge, enclosing rectangle, boxed field, white square, colored panel, or hard outer edge. The result is invalid if the artwork contains a background panel or hard outer edge.'
      : 'OUTPUT CLEANUP DISABLED: background panels and defined outer edges are allowed. Preserve an intentional background, frame, crop boundary, or hard edge when it supports the requested concept; do not automatically convert the artwork into a transparent cutout.',
    referenceImageBase64 && cleanOutputEnabled
      ? 'If a reference image has transparency, use only the visible foreground artwork; treat transparent pixels as absent and never render them as white, black, gray, or any background patch.'
      : null,
    referenceImageBase64 && cleanOutputEnabled
      ? 'Do not preserve the reference image background, frame, crop, or edges.'
      : null,
    ...garmentReferenceDirectives,
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
      ? "LEFT side of the image / viewer-left upper chest (the wearer's right side)"
      : "RIGHT side of the image / viewer-right upper chest over the heart area (the wearer's left side)";
    const forbiddenSide = effectivePrintPosition === 'shoulder_right'
      ? 'viewer-right upper chest'
      : 'viewer-left upper chest';
    const placementCode = effectivePrintPosition === 'shoulder_right'
      ? 'LOGO_ON_IMAGE_LEFT'
      : 'LOGO_ON_IMAGE_RIGHT';

    sceneDirectives = compactPrompt([
      `Front-facing medium close-up photography of the upper torso showing a ${color} ${garmentType}.`,
      `Placement code: ${placementCode}.`,
      `A single ${effectivePrintSize === 'large' ? 'medium-large' : 'small pocket-sized'} DTF logo is placed strictly on the ${imageSide} of the ${color} ${garmentType}.`,
      `Use screen/image coordinates only: image right means the viewer's right side, image left means the viewer's left side.`,
      `Camera framing: upper body visible, showing the collar, shoulders, and chest clearly so the garment type and the ${color} color are obvious.`,
      `Keep the center chest blank. Do not place the logo on the ${forbiddenSide}, do not center it on the chest, do not place it on a sleeve or shoulder, and do not move it to the back.`,
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
        `Mandatory customer artwork concept: ${userDescription}.`,
        'Create a new visible print artwork from the customer concept first, then place that artwork on the selected garment as a DTF print.',
        'The result is invalid if the garment is blank, if only the garment color changes, or if the customer concept is missing from the print.',
        'The print artwork may be graphic or illustrative, while the garment mockup must remain photorealistic. No text, letters, words, or typography unless the customer explicitly requested them.',
        `Style: ${style}.`,
        `Technique: ${technique}.`,
        `Palette: ${palette}.`,
        `The printed artwork must be instantly recognizable as: ${userDescription}.`,
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
    if (preferences.garmentReferenceImageBase64 && preferences.garmentReferenceImageMimeType) {
      body.garmentReferenceImage = {
        base64: preferences.garmentReferenceImageBase64,
        mimeType: preferences.garmentReferenceImageMimeType,
      };
    }

    const response = await fetch(`${API_BASE_URL}/generate-mockup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await parseApiResponse(response, 'generation');
    if (data?.error) throw createPublicApiError(data.error, 'generation', response, data);
    dispatchQuotaChanged(data);
    return data.imageUrl || null;
  } catch (error) {
    const info = (error as { data?: Record<string, unknown> })?.data;
    if (info && (info.code === 'quota_exceeded' || info.code === 'audience_disabled')) {
      dispatchQuotaExceeded(info);
    }
    console.error("Error generating mockup via proxy:", error);
    if (error instanceof Error) throw error;
    throw new Error(PUBLIC_GENERATION_ERROR);
  }
}

export async function extractDesign(mockupImageBase64: string, mimeType: string, cleanOutputEnabled = true): Promise<string | null> {
  const outputDirective = cleanOutputEnabled
    ? 'Return a transparent PNG with alpha: only the artwork pixels, no background, panel, canvas, frame, border, crop edge, or hard outer boundary.'
    : 'Preserve the complete artwork exactly as designed, including any intentional background panel, canvas, frame, border, crop boundary, or defined outer edge. Do not remove or make those elements transparent.';
  const prompt = `Extract the single graphic or calligraphy design from this garment mockup onto a perfectly flat 2D view. ${outputDirective} Never include the garment silhouette, fabric texture, wrinkles, shadows, reflections, or duplicated layers. Preserve all artwork detail, color accuracy, and sharpness. Print-ready DTF quality.`;

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

    const data = await parseApiResponse(response, 'extraction');
    if (data?.error) throw createPublicApiError(data.error, 'extraction', response, data);
    return data.imageUrl || null;
  } catch (error) {
    console.error("Error extracting design via proxy:", error);
    if (error instanceof Error) throw error;
    throw new Error(PUBLIC_EXTRACTION_ERROR);
  }
}
