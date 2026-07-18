import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractDesign, generateMockup } from '../../washa-dtf-studio/src/services/geminiService';
import { isCleanOutputEnabled, normalizeOutputPreferences } from '../../washa-dtf-studio/src/lib/outputPreferences';
import { buildIsolatedArtworkPrompt } from '@/lib/washa-artwork/prompt';

async function capturePrompt(removeBackground?: boolean, avoidHardEdges?: boolean, mode: 'text' | 'image' | 'calligraphy' = 'text') {
  let prompt = '';
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    prompt = JSON.parse(String(init?.body)).prompt;
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
        side: 'front',
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        printWidthCm: 30,
        printHeightCm: 40,
        anchorX: 0.5,
        anchorY: 0.5,
        referenceMockupId: null,
        printAreaId: 'front_default',
        transformVersion: 1,
      },
      transparencyVerificationStatus: 'verified',
      productionReadinessStatus: 'ready',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }));

  await generateMockup('تيشيرت', 'أسود', 'صقر هندسي', 'DTF', 'هندسي', 'ذهبي', mode === 'image' ? 'AAAA' : undefined, mode === 'image' ? 'image/png' : undefined, mode === 'calligraphy' ? 'وشّى' : undefined, {
    removeBackground,
    avoidHardEdges,
    printPosition: 'chest',
    printSize: 'large',
    sessionToken: 'session-token',
  });
  return prompt;
}

async function captureExtractPrompt(cleanOutputEnabled: boolean) {
  let prompt = '';
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    prompt = JSON.parse(String(init?.body)).prompt;
    return new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,AAAA' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }));
  await extractDesign('AAAA', 'image/png', cleanOutputEnabled);
  return prompt;
}

describe('WASHA AI output preferences', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('generates the isolated print artwork instead of asking the provider to draw it on a garment', async () => {
    const clientConcept = await capturePrompt(true, true);
    const prompt = buildIsolatedArtworkPrompt(clientConcept, {
      designMethod: 'text',
      style: 'هندسي',
      technique: 'DTF',
      palette: 'ذهبي',
    });

    expect(prompt).toContain('Create only the isolated print design artwork.');
    expect(prompt).toContain('true transparent background with a real alpha channel');
    expect(prompt).not.toContain('Studio mockup of a full');
    expect(prompt).not.toContain('place that artwork on the selected garment');
  });

  it('makes transparent, borderless artwork mandatory when cleanup is enabled', async () => {
    const prompt = buildIsolatedArtworkPrompt(await capturePrompt(true, true), {});

    expect(prompt).toContain('true transparent background with a real alpha channel');
    expect(prompt).toContain('Do not generate a white, black, colored, checkerboard, or simulated transparent background');
    expect(prompt).toContain('fully visible, uncropped, and surrounded by safe transparent padding');
  });

  it('keeps true transparency mandatory even when a legacy cleanup preference is disabled', async () => {
    const prompt = buildIsolatedArtworkPrompt(await capturePrompt(false, false), {});

    expect(prompt).toContain('true transparent background with a real alpha channel');
    expect(prompt).not.toContain('background panels and defined outer edges are allowed');
  });

  it.each(['text', 'image', 'calligraphy'] as const)('keeps clean output mandatory for %s generation', async (mode) => {
    const customerConcept = await capturePrompt(true, true, mode);
    expect(buildIsolatedArtworkPrompt(customerConcept, {
      designMethod: mode,
      calligraphyText: mode === 'calligraphy' ? 'وشّى' : null,
    })).toContain('true transparent background with a real alpha channel');
  });

  it('treats an Arabic visual brief as instructions and forbids rendering it when the text field is empty', () => {
    const prompt = buildIsolatedArtworkPrompt(
      'في قلب غابة ساحرة تظهر بطة براقة ترقص تحت أشعة الشمس',
      {
        designMethod: 'text',
        calligraphyText: '   ',
      },
    );

    expect(prompt).toContain('TEXT_RENDERING_ALLOWED: NO');
    expect(prompt).toContain('Treat the customer artwork idea as visual instructions only');
    expect(prompt).toContain(
      'Do not copy, quote, paraphrase, summarize, translate, transliterate, or render any part of the customer artwork idea',
    );
    expect(prompt).not.toContain('Preserve all Arabic text exactly as supplied');
  });

  it('ignores stale hidden text unless the customer selected the dedicated calligraphy mode', () => {
    const prompt = buildIsolatedArtworkPrompt('بطة هندسية', {
      designMethod: 'text',
      calligraphyText: 'نص قديم مخفي',
    });

    expect(prompt).toContain('TEXT_RENDERING_ALLOWED: NO');
    expect(prompt).not.toContain('نص قديم مخفي');
    expect(prompt).not.toContain('<exact_customer_text>');
  });

  it('defaults to clean output when service preferences are omitted', async () => {
    expect(buildIsolatedArtworkPrompt(await capturePrompt(), {}))
      .toContain('true transparent background with a real alpha channel');
  });

  it('keeps authoritative system instructions server-side instead of duplicating them in the client payload', async () => {
    expect(await capturePrompt()).toBe('صقر هندسي');
  });

  it('normalizes a legacy mixed preference to the enabled combined setting', () => {
    expect(isCleanOutputEnabled({ removeBackground: true, avoidHardEdges: false })).toBe(true);
    expect(normalizeOutputPreferences({ removeBackground: true, avoidHardEdges: false })).toEqual({
      removeBackground: true,
      avoidHardEdges: true,
    });
  });

  it('keeps extraction behavior consistent with the combined preference', async () => {
    expect(await captureExtractPrompt(true)).toContain('transparent PNG with alpha');
    expect(await captureExtractPrompt(false)).toContain('Preserve the complete artwork exactly as designed');
  });
});
