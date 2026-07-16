import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getReferenceFallbackConcept,
  getReferenceGenerationDirectives,
  normalizeReferenceImageMode,
} from '../../washa-dtf-studio/src/lib/referenceImage';
import { generateMockup } from '../../washa-dtf-studio/src/services/geminiService';

describe('WASHA AI reference image guidance', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults unknown and missing modes to creative reinterpretation', () => {
    expect(normalizeReferenceImageMode(undefined)).toBe('reinterpret');
    expect(normalizeReferenceImageMode('unknown')).toBe('reinterpret');
  });

  it('gives every mode print-safe guidance instead of pasting the raw image', () => {
    for (const mode of ['reinterpret', 'preserve_subject', 'style_inspiration'] as const) {
      const guidance = getReferenceGenerationDirectives(mode).join(' ');
      expect(guidance).toContain('print-ready');
      expect(guidance).toContain('Do not paste');
      expect(guidance).toContain('Remove irrelevant background');
      expect(getReferenceFallbackConcept(mode).length).toBeGreaterThan(40);
    }
  });

  it('distinguishes preserving the subject from borrowing only the style', () => {
    expect(getReferenceGenerationDirectives('preserve_subject').join(' ')).toContain('preserve the identity');
    expect(getReferenceGenerationDirectives('style_inspiration').join(' ')).toContain('Do not copy the exact subject');
  });

  it('injects the chosen mode and a useful fallback concept into the real generation prompt', async () => {
    let prompt = '';
    let referenceImage: unknown;
    let generationContext: { referenceImageMode?: string } | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      prompt = body.prompt;
      referenceImage = body.referenceImage;
      generationContext = body.generationContext;
      return new Response(JSON.stringify({
        imageUrl: 'https://cdn.example/mockup.webp',
        previewUrl: 'https://cdn.example/mockup.webp',
        frontPreviewUrl: 'https://cdn.example/mockup.webp',
        backPreviewUrl: null,
        designRequestId: '11111111-1111-4111-8111-111111111111',
        masterAssetId: '22222222-2222-4222-8222-222222222222',
        masterAssetUrl: 'https://cdn.example/design-master.png',
        masterChecksum: 'a'.repeat(64),
        mockupSourceType: 'reference',
        placement: {
          side: 'front', x: 0.5, y: 0.5, scale: 1, rotation: 0,
          printWidthCm: 30, printHeightCm: 40, anchorX: 0.5, anchorY: 0.5,
          referenceMockupId: null, printAreaId: 'front_default', transformVersion: 1,
        },
        transparencyVerificationStatus: 'verified',
        productionReadinessStatus: 'ready',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));

    await generateMockup(
      'تيشيرت',
      'سكري',
      '',
      'DTF',
      'هندسي',
      'ذهبي',
      'AAAA',
      'image/webp',
      undefined,
      {
        referenceImageMode: 'preserve_subject',
        sessionToken: 'session-token',
      },
    );

    expect(referenceImage).toEqual({ base64: 'AAAA', mimeType: 'image/webp' });
    expect(generationContext?.referenceImageMode).toBe('preserve_subject');
    expect(prompt).toBe('Artwork inspired by the uploaded customer reference image.');
    expect(prompt).not.toContain('Studio mockup');
  });
});
