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
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      prompt = JSON.parse(String(init?.body)).prompt;
      return new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,AAAA' }), {
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

    expect(prompt).toContain('REFERENCE MODE — PRESERVE SUBJECT');
    expect(prompt).toContain('the main subject in the supplied reference image');
    expect(prompt).toContain('Do not paste, crop, photocopy');
    expect(prompt).not.toContain('Mandatory customer artwork concept: .');
  });
});
