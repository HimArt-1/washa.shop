import {
  isBoardPreviewResult,
  type GeneratedArtworkResult,
} from '../services/geminiService';

export const BOARD_PREVIEW_DISCLOSURE =
  '⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب.';

export interface GenerationPresentation {
  isBoardPreview: boolean;
  resultLabel: 'معاينة مبدئية' | 'النتيجة النهائية';
  canRecompose: boolean;
  canExtract: boolean;
  canSubmitOrder: boolean;
  canDownloadPrintFile: boolean;
  previewDownloadName: 'washa-board-preview.webp' | 'washa-mockup.png';
}

export function resolveGenerationPresentation(
  result: GeneratedArtworkResult | null | undefined,
): GenerationPresentation {
  if (isBoardPreviewResult(result)) {
    return {
      isBoardPreview: true,
      resultLabel: 'معاينة مبدئية',
      canRecompose: false,
      canExtract: false,
      canSubmitOrder: false,
      canDownloadPrintFile: false,
      previewDownloadName: 'washa-board-preview.webp',
    };
  }

  return {
    isBoardPreview: false,
    resultLabel: 'النتيجة النهائية',
    canRecompose: true,
    canExtract: true,
    canSubmitOrder: true,
    canDownloadPrintFile: true,
    previewDownloadName: 'washa-mockup.png',
  };
}
