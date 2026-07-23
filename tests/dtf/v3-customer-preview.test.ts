import { describe, expect, it } from 'vitest';
import {
  type PrimaryGeneratedArtworkResult,
} from '../../washa-dtf-studio/src/services/geminiService';
import { resolveCustomerFacingPreviewUrl } from '../../washa-dtf-studio/src/lib/generationPresentation';

const SOURCE_PREVIEW: PrimaryGeneratedArtworkResult = {
  imageUrl: 'https://cdn.example/internal-artwork.png',
  previewUrl: 'https://cdn.example/internal-artwork.png',
  frontPreviewUrl: 'https://cdn.example/internal-artwork.png',
  backPreviewUrl: null,
  designRequestId: '11111111-1111-4111-8111-111111111111',
  sourceAssetId: '22222222-2222-4222-8222-222222222222',
  sourceAssetUrl: 'https://cdn.example/internal-artwork.png',
  sourceChecksum: 'a'.repeat(64),
  masterAssetId: null,
  masterAssetUrl: null,
  masterChecksum: null,
  mockupSourceType: 'source_preview',
  previewKind: 'source',
  placement: {
    side: 'front',
    x: 0.5,
    y: 0.5,
    scale: 0.8,
    rotation: 0,
    printWidthCm: 30,
    printHeightCm: 40,
    anchorX: 0.5,
    anchorY: 0.5,
    referenceMockupId: null,
    printAreaId: 'front_default',
    transformVersion: 1,
  },
  transparencyVerificationStatus: 'pending',
  productionReadinessStatus: 'pending_prepress',
  pipeline: 'prompt_native',
  previewProvider: 'source',
};

describe('WASHA AI V3 customer-facing preview', () => {
  it('keeps a source-only artwork private when the V3 mockup is not ready', () => {
    expect(
      resolveCustomerFacingPreviewUrl(SOURCE_PREVIEW, 'prompt_native')
    ).toBeNull();
  });

  it('returns only a completed mockup to the V3 result interface', () => {
    const mockup = {
      ...SOURCE_PREVIEW,
      imageUrl: 'https://cdn.example/garment-mockup.webp',
      previewUrl: 'https://cdn.example/garment-mockup.webp',
      frontPreviewUrl: 'https://cdn.example/garment-mockup.webp',
      mockupSourceType: 'reference' as const,
      previewKind: 'mockup' as const,
      productionReadinessStatus: 'ready' as const,
      previewProvider: 'gemini' as const,
    };

    expect(
      resolveCustomerFacingPreviewUrl(mockup, 'prompt_native')
    ).toBe('https://cdn.example/garment-mockup.webp');
  });
});
