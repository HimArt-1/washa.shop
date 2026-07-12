import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMockup } from '../../washa-dtf-studio/src/services/geminiService';

describe('WASHA AI generation placement instructions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['shoulder_right', "viewer-left upper chest (the wearer's right side)", 'LOGO_ON_IMAGE_LEFT', 'viewer-right upper chest'],
    ['shoulder_left', "viewer-right upper chest over the heart area (the wearer's left side)", 'LOGO_ON_IMAGE_RIGHT', 'viewer-left upper chest'],
  ] as const)('keeps the small chest logo on the selected image side: %s', async (printPosition, expectedSide, code, forbiddenSide) => {
    let body: { prompt: string } | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,AAAA' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));

    await generateMockup('تيشيرت', 'أسود', 'صقر هندسي', 'DTF', 'هندسي', 'ذهبي', undefined, undefined, undefined, {
      designPosition: printPosition === 'shoulder_right' ? 'logo_right' : 'logo_left',
      printPosition,
      printSize: 'small',
    });

    expect(body?.prompt).toContain(code);
    expect(body?.prompt).toContain(expectedSide);
    expect(body?.prompt).toContain(`Do not place the logo on the ${forbiddenSide}`);
    expect(body?.prompt).not.toContain('upper sleeve');
  });
});
