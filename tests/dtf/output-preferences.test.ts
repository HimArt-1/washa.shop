import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractDesign, generateMockup } from '../../washa-dtf-studio/src/services/geminiService';
import { isCleanOutputEnabled, normalizeOutputPreferences } from '../../washa-dtf-studio/src/lib/outputPreferences';

async function capturePrompt(removeBackground?: boolean, avoidHardEdges?: boolean, mode: 'text' | 'image' | 'calligraphy' = 'text') {
  let prompt = '';
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    prompt = JSON.parse(String(init?.body)).prompt;
    return new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,AAAA' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }));

  await generateMockup('تيشيرت', 'أسود', 'صقر هندسي', 'DTF', 'هندسي', 'ذهبي', mode === 'image' ? 'AAAA' : undefined, mode === 'image' ? 'image/png' : undefined, mode === 'calligraphy' ? 'وشّى' : undefined, {
    removeBackground,
    avoidHardEdges,
    printPosition: 'chest',
    printSize: 'large',
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

  it('makes transparent, borderless artwork mandatory when cleanup is enabled', async () => {
    const prompt = await capturePrompt(true, true);

    expect(prompt).toContain('MANDATORY CLEAN ARTWORK OUTPUT');
    expect(prompt).toContain('transparent cutout boundary');
    expect(prompt).toContain('no frame, border, crop edge');
    expect(prompt).toContain('invalid if the artwork contains a background panel or hard outer edge');
  });

  it('explicitly allows backgrounds and defined edges when cleanup is disabled', async () => {
    const prompt = await capturePrompt(false, false);

    expect(prompt).toContain('OUTPUT CLEANUP DISABLED');
    expect(prompt).toContain('background panels and defined outer edges are allowed');
    expect(prompt).not.toContain('MANDATORY CLEAN ARTWORK OUTPUT');
  });

  it.each(['text', 'image', 'calligraphy'] as const)('keeps clean output mandatory for %s generation', async (mode) => {
    expect(await capturePrompt(true, true, mode)).toContain('MANDATORY CLEAN ARTWORK OUTPUT');
  });

  it('defaults to clean output when service preferences are omitted', async () => {
    expect(await capturePrompt()).toContain('MANDATORY CLEAN ARTWORK OUTPUT');
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
