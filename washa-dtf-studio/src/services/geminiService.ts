import type { ReferenceImageMode } from '../types';
import {
  getWashaAiDevGenerationHeadersFromDocument,
  getWashaAiGenerateMockupEndpointFromDocument,
} from '../lib/devGenerationSurface';

// Use the integrated Next.js API instead of a separate local proxy server.
import {
  getPublicStudioErrorMessage,
  isStructuredPublicErrorPayload,
  parseRetryAfterValueMs,
  PUBLIC_EXTRACTION_ERROR,
  PUBLIC_GENERATION_ERROR,
  type PublicStudioErrorScope,
  type StructuredPublicErrorPayload,
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
  pipeline?: 'standard' | 'prompt_native';
}

export type PrimaryGeneratedArtworkResult = {
  imageUrl: string;
  previewUrl: string;
  frontPreviewUrl: string | null;
  backPreviewUrl: string | null;
  designRequestId: string;
  sourceAssetId: string;
  sourceAssetUrl: string;
  sourceChecksum: string;
  masterAssetId: string | null;
  masterAssetUrl: string | null;
  masterChecksum: string | null;
  mockupSourceType: 'reference' | 'generated_blank_garment' | 'source_preview';
  previewKind: 'mockup' | 'source';
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
  transparencyVerificationStatus: 'pending' | 'verified' | 'fallback_processed';
  productionReadinessStatus: 'ready' | 'pending_prepress';
  pipeline?: 'standard' | 'prompt_native';
  previewProvider?: 'sharp' | 'gemini' | 'source';
};

export type BoardPreviewResult = {
  mode: 'fallback';
  boardImageUrl: string;
  boardRequestId: string;
  disclaimer: 'preview_only';
  quotaCharged: boolean;
};

export type GeneratedArtworkResult = PrimaryGeneratedArtworkResult | BoardPreviewResult;

export function isBoardPreviewResult(
  result: GeneratedArtworkResult | null | undefined,
): result is BoardPreviewResult {
  if (!result) return false;
  return ('mode' in result && result.mode === 'fallback')
    || ('disclaimer' in result && result.disclaimer === 'preview_only');
}

export function getGeneratedPreviewUrl(result: GeneratedArtworkResult): string {
  return isBoardPreviewResult(result) ? result.boardImageUrl : result.previewUrl;
}

type GenerationApiResponse = Partial<PrimaryGeneratedArtworkResult> & {
  ok?: boolean;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
  freeRemaining?: unknown;
  paidBalance?: unknown;
  guest?: unknown;
  mode?: unknown;
  boardImageUrl?: unknown;
  boardRequestId?: unknown;
  disclaimer?: unknown;
  quotaCharged?: unknown;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown, key: string) {
  if (!isRecord(value)) return null;
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : null;
}

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

export class StudioApiError extends Error {
  readonly data: unknown;
  readonly status: number | null;
  readonly structured: StructuredPublicErrorPayload | null;

  constructor(input: {
    message: string;
    data?: unknown;
    status?: number | null;
    structured?: StructuredPublicErrorPayload | null;
  }) {
    super(input.message);
    this.name = 'StudioApiError';
    this.data = input.data;
    this.status = input.status ?? null;
    this.structured = input.structured ?? null;
  }
}

export function getStructuredStudioError(
  error: unknown,
): StructuredPublicErrorPayload | null {
  return error instanceof StudioApiError ? error.structured : null;
}

function parseRetryAfterMs(response?: Response) {
  if (!response) return null;
  return parseRetryAfterValueMs(response.headers.get('Retry-After'));
}

function createPublicApiError(
  message: string | null | undefined,
  scope: PublicStudioErrorScope,
  response?: Response,
  data?: unknown
) {
  const publicMessage = getPublicStudioErrorMessage(message, scope);
  const retryAfterMs = parseRetryAfterMs(response);
  const structured = isStructuredPublicErrorPayload(data)
    ? {
        ...data,
        message: publicMessage,
        retryAfterMs: retryAfterMs ?? data.retryAfterMs,
      }
    : null;

  return new StudioApiError({
    message: publicMessage,
    data,
    status: response?.status ?? null,
    structured,
  });
}

async function parseApiResponse(
  response: Response,
  scope: PublicStudioErrorScope,
): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data: unknown = await response.json();
    if (!response.ok) {
      const msg =
        readString(data, 'error')
          ?? readString(data, 'message')
          ?? `HTTP ${response.status}`;
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
    const body: {
      prompt: string;
      referenceImage?: {
        base64: string;
        mimeType: string;
      };
      generationContext?: ReturnType<typeof buildGenerationContext>;
      pipeline?: 'standard' | 'prompt_native';
    } = { prompt };
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
    body.pipeline = preferences.pipeline || 'standard';

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
      ...getWashaAiDevGenerationHeadersFromDocument(),
    };
    if (preferences.requestId) {
      headers['X-Request-Id'] = preferences.requestId;
    }

    const response = await fetch(getWashaAiGenerateMockupEndpointFromDocument(), {
      method: 'POST',
      headers,
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify(body),
    });
    const parsed = await parseApiResponse(response, 'generation');
    if (!isRecord(parsed)) {
      throw createPublicApiError(null, 'generation', response, parsed);
    }
    const data: GenerationApiResponse = parsed;

    if (data.error) throw createPublicApiError(data.error, 'generation', undefined, data);
    dispatchQuotaChanged(data);
    if (data.mode === 'fallback' || data.disclaimer === 'preview_only') {
      if (
        typeof data.boardImageUrl !== 'string'
        || !data.boardImageUrl.trim()
        || typeof data.boardRequestId !== 'string'
        || !data.boardRequestId.trim()
      ) {
        throw createPublicApiError('تعذر تثبيت معاينة اللوحة.', 'generation', response, data);
      }
      return {
        mode: 'fallback',
        boardImageUrl: data.boardImageUrl,
        boardRequestId: data.boardRequestId,
        disclaimer: 'preview_only',
        quotaCharged: data.quotaCharged === true,
      };
    }
    const sourceAssetId = typeof data.sourceAssetId === 'string'
      ? data.sourceAssetId
      : (typeof data.masterAssetId === 'string' ? data.masterAssetId : null);
    const sourceAssetUrl = typeof data.sourceAssetUrl === 'string'
      ? data.sourceAssetUrl
      : (typeof data.masterAssetUrl === 'string' ? data.masterAssetUrl : null);
    const sourceChecksum = typeof data.sourceChecksum === 'string'
      ? data.sourceChecksum
      : (typeof data.masterChecksum === 'string' ? data.masterChecksum : null);
    if (
      typeof data.imageUrl !== 'string' ||
      typeof data.previewUrl !== 'string' ||
      typeof data.designRequestId !== 'string' ||
      !sourceAssetId ||
      !sourceAssetUrl ||
      !sourceChecksum ||
      !data.placement
    ) {
      throw createPublicApiError('تعذر تثبيت أصل التصميم الدائم.', 'generation', response, data);
    }
    const masterAssetId = typeof data.masterAssetId === 'string' ? data.masterAssetId : null;
    const masterAssetUrl = typeof data.masterAssetUrl === 'string' ? data.masterAssetUrl : null;
    const masterChecksum = typeof data.masterChecksum === 'string' ? data.masterChecksum : null;
    const productionReadinessStatus = data.productionReadinessStatus === 'pending_prepress'
      ? 'pending_prepress'
      : 'ready';
    return {
      ...data,
      sourceAssetId,
      sourceAssetUrl,
      sourceChecksum,
      masterAssetId,
      masterAssetUrl,
      masterChecksum,
      previewKind: data.previewKind === 'source' ? 'source' : 'mockup',
      mockupSourceType: data.mockupSourceType === 'source_preview'
        ? 'source_preview'
        : (data.mockupSourceType === 'generated_blank_garment' ? 'generated_blank_garment' : 'reference'),
      transparencyVerificationStatus: data.transparencyVerificationStatus === 'pending'
        ? 'pending'
        : (data.transparencyVerificationStatus === 'fallback_processed' ? 'fallback_processed' : 'verified'),
      productionReadinessStatus,
      previewProvider: data.previewProvider === 'source'
        ? 'source'
        : (data.previewProvider === 'gemini' ? 'gemini' : 'sharp'),
    } as PrimaryGeneratedArtworkResult;
  } catch (error) {
    const info = error instanceof StudioApiError && isRecord(error.data)
      ? error.data
      : null;
    if (info && (info.code === 'quota_exceeded' || info.code === 'audience_disabled')) {
      dispatchQuotaExceeded(info);
    }
    console.error("Error generating mockup via proxy:", error);
    if (error instanceof Error) throw error;
    throw new Error(PUBLIC_GENERATION_ERROR);
  }
}

export async function recomposeMockup(
  existing: Pick<PrimaryGeneratedArtworkResult, 'designRequestId'> & { masterAssetId: string },
  garmentType: string,
  color: string,
  technique: string,
  style: string,
  palette: string,
  calligraphyText: string | undefined,
  preferences: GenerationPreferences,
): Promise<PrimaryGeneratedArtworkResult> {
  const sessionToken = preferences.sessionToken?.trim();
  if (!sessionToken) {
    throw createPublicApiError('يلزم تسجيل الدخول لإكمال العملية.', 'generation');
  }
  const response = await fetch(`${API_BASE_URL}/recompose-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      ...getWashaAiDevGenerationHeadersFromDocument(),
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
      pipeline: preferences.pipeline || 'standard',
    }),
  });
  const parsed = await parseApiResponse(response, 'generation');
  if (!isRecord(parsed)) {
    throw createPublicApiError(null, 'generation', response, parsed);
  }
  const data: GenerationApiResponse = parsed;
  if (
    typeof data.previewUrl !== 'string'
    || typeof data.masterAssetId !== 'string'
    || typeof data.designRequestId !== 'string'
    || !data.placement
  ) {
    throw createPublicApiError('تعذر تحديث المعاينة من أصل التصميم.', 'generation', response, data);
  }
  return data as PrimaryGeneratedArtworkResult;
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
    if (!isRecord(data)) {
      throw createPublicApiError(null, 'extraction', response, data);
    }
    const extractionError = readString(data, 'error');
    if (extractionError) {
      throw createPublicApiError(extractionError, 'extraction', response, data);
    }
    return readString(data, 'imageUrl');
  } catch (error) {
    console.error("Error extracting design via proxy:", error);
    if (error instanceof Error) throw error;
    throw new Error(PUBLIC_EXTRACTION_ERROR);
  }
}
