import { describe, expect, it } from 'vitest';
import type { DesignState } from '../../washa-dtf-studio/src/types';
import { createGenerationFingerprint, getGenerationStage, isUsableGeneratedImageUrl, validateGeneratedImage } from '../../washa-dtf-studio/src/lib/generationExperience';

const validPngSource = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

describe('WASHA AI generation experience', () => {
  it('advances through stable user-facing generation stages', () => {
    expect(getGenerationStage(0).key).toBe('prepare');
    expect(getGenerationStage(6_000).key).toBe('artwork');
    expect(getGenerationStage(20_000).key).toBe('placement');
    expect(getGenerationStage(40_000).key).toBe('review');
    expect(getGenerationStage(180_000).progress).toBeLessThanOrEqual(94);
  });

  it('accepts supported generated image URLs and rejects malformed output', () => {
    expect(isUsableGeneratedImageUrl(validPngSource)).toBe(true);
    expect(isUsableGeneratedImageUrl('https://cdn.example.com/mockup.webp')).toBe(true);
    expect(isUsableGeneratedImageUrl('https://replicate.delivery/output.png')).toBe(false);
    expect(isUsableGeneratedImageUrl('data:image/png;base64,AAAA')).toBe(false);
    expect(isUsableGeneratedImageUrl('data:text/plain;base64,AAAA')).toBe(false);
    expect(isUsableGeneratedImageUrl('')).toBe(false);
    expect(isUsableGeneratedImageUrl(null)).toBe(false);
  });

  it('decodes the image and enforces production-sized dimensions before accepting it', async () => {
    expect(await validateGeneratedImage(validPngSource, async () => ({ width: 1024, height: 1024 }))).toMatchObject({ valid: true });
    expect(await validateGeneratedImage(validPngSource, async () => ({ width: 320, height: 1024 }))).toMatchObject({ valid: false, reason: 'dimensions-too-small' });
    expect(await validateGeneratedImage(validPngSource, async () => { throw new Error('decode'); })).toMatchObject({ valid: false, reason: 'decode-failed' });
  });

  it('changes the result fingerprint when generation settings change', () => {
    const state = {
      garmentId: 'shirt', garmentType: 'تيشيرت', garmentColorId: 'black', garmentColor: 'أسود', garmentColorHex: '#111111',
      garmentSizeId: 'large', garmentSize: 'L', designMethod: 'text', designPosition: 'front_large', printOptionId: 'front',
      printPosition: 'chest', printSize: 'large', printPositionLabel: 'تصميم أمامي كبير', prompt: 'صقر هندسي', calligraphyText: '',
      printScale: 100, printOffsetX: 0, printOffsetY: 0,
      referenceImage: null, referenceImageMimeType: null, styleId: 'geometric', style: 'هندسي', techniqueId: 'digital', technique: 'رقمي',
      paletteId: 'auto', palette: 'تلقائي', customPalette: '', removeBackground: true, avoidHardEdges: true,
    } as DesignState;

    expect(createGenerationFingerprint(state)).not.toBe(createGenerationFingerprint({ ...state, prompt: 'نخلة هندسية' }));
    expect(createGenerationFingerprint(state)).not.toBe(createGenerationFingerprint({ ...state, printOffsetX: 10 }));
  });
});
