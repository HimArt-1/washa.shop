import type { DesignState } from '../types';

export type GenerationStage = {
  key: 'prepare' | 'artwork' | 'placement' | 'review';
  label: string;
  description: string;
  progress: number;
};

export function getGenerationStage(elapsedMs: number): GenerationStage {
  const seconds = Math.max(0, elapsedMs) / 1000;

  if (seconds < 5) {
    return { key: 'prepare', label: 'تجهيز مواصفات التصميم', description: 'نراجع القطعة والموضع والأسلوب وتفضيلات الإخراج.', progress: 14 };
  }
  if (seconds < 16) {
    return { key: 'artwork', label: 'إنشاء العمل الفني', description: 'نحوّل فكرتك إلى تصميم واضح ومناسب للطباعة.', progress: 38 };
  }
  if (seconds < 34) {
    return { key: 'placement', label: 'تركيب التصميم على القطعة', description: 'نطبّق الحجم والجهة واللون المختار بدقة.', progress: 68 };
  }
  return { key: 'review', label: 'مراجعة النتيجة النهائية', description: 'نتحقق من اكتمال الصورة قبل عرضها.', progress: Math.min(94, 82 + Math.floor((seconds - 34) / 8) * 3) };
}

export function isUsableGeneratedImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const url = value.trim();
  return /^data:image\/png;base64,iVBORw0KGgo[a-z0-9+/=]+$/i.test(url) ||
    /^data:image\/jpe?g;base64,\/9j\/[a-z0-9+/=]+$/i.test(url) ||
    /^data:image\/webp;base64,UklGR[a-z0-9+/=]+$/i.test(url);
}

type ImageDimensions = { width: number; height: number };
type DecodeImage = (source: string) => Promise<ImageDimensions>;

const decodeBrowserImage: DecodeImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  const timeout = window.setTimeout(() => reject(new Error('image-decode-timeout')), 12_000);
  image.onload = () => {
    window.clearTimeout(timeout);
    resolve({ width: image.naturalWidth, height: image.naturalHeight });
  };
  image.onerror = () => {
    window.clearTimeout(timeout);
    reject(new Error('image-decode-failed'));
  };
  image.src = source;
});

export async function validateGeneratedImage(
  value: unknown,
  decodeImage: DecodeImage = decodeBrowserImage,
  minimumDimension = 512,
) {
  if (!isUsableGeneratedImageUrl(value)) return { valid: false as const, reason: 'unsupported-source' as const };
  try {
    const dimensions = await decodeImage(value);
    if (dimensions.width < minimumDimension || dimensions.height < minimumDimension) {
      return { valid: false as const, reason: 'dimensions-too-small' as const, ...dimensions };
    }
    return { valid: true as const, ...dimensions };
  } catch {
    return { valid: false as const, reason: 'decode-failed' as const };
  }
}

const FINGERPRINT_FIELDS: Array<keyof DesignState> = [
  'garmentId', 'garmentType', 'garmentColorId', 'garmentColor', 'garmentColorHex', 'garmentSizeId', 'garmentSize',
  'designMethod', 'designPosition', 'printOptionId', 'printPosition', 'printSize', 'prompt', 'calligraphyText', 'referenceImageMode',
  'styleId', 'style', 'techniqueId', 'technique', 'paletteId', 'palette', 'customPalette', 'removeBackground', 'avoidHardEdges',
];

export function createGenerationFingerprint(state: DesignState) {
  const reference = state.referenceImage || '';
  const referenceSignature = reference
    ? `${reference.length}:${reference.slice(0, 24)}:${reference.slice(-24)}:${state.referenceImageMimeType || ''}`
    : '';
  return JSON.stringify([
    ...FINGERPRINT_FIELDS.map((field) => state[field] ?? null),
    referenceSignature,
  ]);
}
