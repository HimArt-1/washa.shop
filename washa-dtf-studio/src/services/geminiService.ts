import type { ReferenceImageMode } from '../types';

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
  referenceImageMode?: ReferenceImageMode;
  /** Fresh Clerk session token minted immediately before this request. */
  sessionToken?: string;
  /** Stable identifier for this single user-triggered generation attempt. */
  requestId?: string;
  garmentId?: string | null;
  colorId?: string | null;
  sizeId?: string | null;
  printScale?: number | null;
  printOffsetX?: number | null;
  printOffsetY?: number | null;
}

export type GeneratedArtworkResult = {
  imageUrl: string;
  previewUrl: string;
  frontPreviewUrl: string | null;
  backPreviewUrl: string | null;
  designRequestId: string;
  masterAssetId: string;
  masterAssetUrl: string;
  masterChecksum: string;
  mockupSourceType: 'reference' | 'generated_blank_garment';
  placement: {
    side: 'front' | 'back';
    x: number;
    y: number;
    scale: number;
    rotation: number;
    printWidthCm: number;
    printHeightCm: number;
    anchorX: number;
    anchorY: number;
    referenceMockupId: string | null;
    printAreaId: string;
    transformVersion: number;
  };
  transparencyVerificationStatus: 'verified' | 'fallback_processed';
  productionReadinessStatus: 'ready';
};

type GenerationApiResponse = Partial<GeneratedArtworkResult> & {
  ok?: boolean;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
  freeRemaining?: unknown;
  paidBalance?: unknown;
  guest?: unknown;
};

// أحداث تحدّث واجهة الرصيد بعد كل توليد أو عند نفاد الحصة.
export const QUOTA_CHANGED_EVENT = 'washa:quota-changed';
export const QUOTA_EXCEEDED_EVENT = 'washa:quota-exceeded';

function dispatchQuotaChanged(data: { freeRemaining?: unknown; paidBalance?: unknown; guest?: unknown }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(QUOTA_CHANGED_EVENT, {
      detail: {
        freeRemaining: typeof data?.freeRemaining === 'number' ? data.freeRemaining : null,
        paidBalance: typeof data?.paidBalance === 'number' ? data.paidBalance : null,
        guest: data?.guest === true,
      },
    })
  );
}

function dispatchQuotaExceeded(info: {
  code?: unknown;
  canPurchase?: unknown;
  freeRemaining?: unknown;
  paidBalance?: unknown;
  guest?: unknown;
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(QUOTA_EXCEEDED_EVENT, {
      detail: {
        reason: info?.code === 'audience_disabled' ? 'blocked' : 'exhausted',
        canPurchase: info?.canPurchase === true,
        freeRemaining: typeof info?.freeRemaining === 'number' ? info.freeRemaining : 0,
        paidBalance: typeof info?.paidBalance === 'number' ? info.paidBalance : 0,
        guest: info?.guest === true,
      },
    })
  );
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

function buildGenerationContext(params: {
  garmentType: string;
  color: string;
  technique: string;
  style: string;
  palette: string;
  calligraphyText?: string;
  hasReferenceImage?: boolean;
  preferences: GenerationPreferences;
}) {
  const printPosition =
    params.preferences.printPosition ||
    (params.preferences.designPosition?.startsWith('back') ? 'back' :
      params.preferences.designPosition === 'logo_right' ? 'shoulder_right' :
        params.preferences.designPosition === 'logo_left' ? 'shoulder_left' :
          'chest');
  const printSize =
    params.preferences.printSize ||
    (params.preferences.designPosition?.includes('small') || params.preferences.designPosition?.startsWith('logo_')
      ? 'small'
      : 'large');
  return {
    garmentId: params.preferences.garmentId || null,
    colorId: params.preferences.colorId || null,
    sizeId: params.preferences.sizeId || null,
    garmentType: params.garmentType,
    garmentColor: params.color,
    colorHex: params.preferences.garmentColorHex || null,
    designMethod: params.calligraphyText?.trim()
      ? 'calligraphy'
      : (params.hasReferenceImage ? 'image' : 'text'),
    style: params.style,
    technique: params.technique,
    palette: params.palette,
    calligraphyText: params.calligraphyText?.trim() || null,
    referenceImageMode: params.preferences.referenceImageMode || 'reinterpret',
    printPosition,
    printSize,
    printScale: params.preferences.printScale ?? 100,
    printOffsetX: params.preferences.printOffsetX ?? 0,
    printOffsetY: params.preferences.printOffsetY ?? 0,
  };
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
): Promise<GeneratedArtworkResult | null> {
  const prompt =
    calligraphyText?.trim()
    || userDescription.trim()
    || 'Artwork inspired by the uploaded customer reference image.';

  try {
    const body: any = { prompt };
    if (referenceImageBase64 && referenceImageMimeType) {
      body.referenceImage = {
        base64: referenceImageBase64,
        mimeType: referenceImageMimeType
      };
    }
    body.generationContext = buildGenerationContext({
      garmentType,
      color,
      technique,
      style,
      palette,
      calligraphyText,
      hasReferenceImage: Boolean(referenceImageBase64),
      preferences,
    });

    const sessionToken = preferences.sessionToken?.trim();
    if (!sessionToken) {
      throw createPublicApiError(
        'يلزم تسجيل الدخول لإكمال العملية.',
        'generation',
        undefined,
        { ok: false, code: 'AUTH_REQUIRED' },
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    };
    if (preferences.requestId) {
      headers['X-Request-Id'] = preferences.requestId;
    }

    const response = await fetch(`${API_BASE_URL}/generate-mockup`, {
      method: 'POST',
      headers,
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify(body),
    });
    const data = await parseApiResponse(response, 'generation') as GenerationApiResponse;

    if (data.error) throw createPublicApiError(data.error, 'generation', undefined, data);
    dispatchQuotaChanged(data);
    if (
      typeof data?.imageUrl !== 'string' ||
      typeof data?.previewUrl !== 'string' ||
      typeof data?.designRequestId !== 'string' ||
      typeof data?.masterAssetId !== 'string' ||
      typeof data?.masterAssetUrl !== 'string' ||
      typeof data?.masterChecksum !== 'string' ||
      !data?.placement
    ) {
      throw createPublicApiError('تعذر تثبيت أصل التصميم الدائم.', 'generation', response, data);
    }
    return data as GeneratedArtworkResult;
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

export async function recomposeMockup(
  existing: Pick<GeneratedArtworkResult, 'designRequestId' | 'masterAssetId'>,
  garmentType: string,
  color: string,
  technique: string,
  style: string,
  palette: string,
  calligraphyText: string | undefined,
  preferences: GenerationPreferences,
): Promise<GeneratedArtworkResult> {
  const sessionToken = preferences.sessionToken?.trim();
  if (!sessionToken) {
    throw createPublicApiError('يلزم تسجيل الدخول لإكمال العملية.', 'generation');
  }
  const response = await fetch(`${API_BASE_URL}/recompose-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    credentials: 'omit',
    cache: 'no-store',
    body: JSON.stringify({
      designRequestId: existing.designRequestId,
      masterAssetId: existing.masterAssetId,
      generationContext: buildGenerationContext({
        garmentType,
        color,
        technique,
        style,
        palette,
        calligraphyText,
        preferences,
      }),
    }),
  });
  const data = await parseApiResponse(response, 'generation') as GenerationApiResponse;
  if (
    typeof data.previewUrl !== 'string'
    || typeof data.masterAssetId !== 'string'
    || typeof data.designRequestId !== 'string'
    || !data.placement
  ) {
    throw createPublicApiError('تعذر تحديث المعاينة من أصل التصميم.', 'generation', response, data);
  }
  return data as GeneratedArtworkResult;
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
