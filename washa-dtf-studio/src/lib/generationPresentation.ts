import {
  isBoardPreviewResult,
  type GeneratedArtworkResult,
} from '../services/geminiService';

export const BOARD_PREVIEW_DISCLOSURE =
  '⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب.';

export interface GenerationPresentation {
  isBoardPreview: boolean;
  isPendingPrepress: boolean;
  resultLabel: 'معاينة مبدئية' | 'النتيجة النهائية' | 'التصميم محفوظ';
  canRecompose: boolean;
  canExtract: boolean;
  canSubmitOrder: boolean;
  canDownloadPrintFile: boolean;
  previewDownloadName: 'washa-board-preview.webp' | 'washa-mockup.png' | 'washa-source-preview.png';
}

export function resolveGenerationPresentation(
  result: GeneratedArtworkResult | null | undefined,
): GenerationPresentation {
  if (isBoardPreviewResult(result)) {
    return {
      isBoardPreview: true,
      isPendingPrepress: false,
      resultLabel: 'معاينة مبدئية',
      canRecompose: false,
      canExtract: false,
      canSubmitOrder: false,
      canDownloadPrintFile: false,
      previewDownloadName: 'washa-board-preview.webp',
    };
  }

  if (result?.productionReadinessStatus === 'pending_prepress') {
    return {
      isBoardPreview: false,
      isPendingPrepress: true,
      resultLabel: 'التصميم محفوظ',
      canRecompose: false,
      canExtract: false,
      canSubmitOrder: true,
      canDownloadPrintFile: false,
      previewDownloadName: 'washa-source-preview.png',
    };
  }

  return {
    isBoardPreview: false,
    isPendingPrepress: false,
    resultLabel: 'النتيجة النهائية',
    canRecompose: true,
    canExtract: true,
    canSubmitOrder: true,
    canDownloadPrintFile: true,
    previewDownloadName: 'washa-mockup.png',
  };
}
