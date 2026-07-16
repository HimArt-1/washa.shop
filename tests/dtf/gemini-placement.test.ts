import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMockup } from '../../washa-dtf-studio/src/services/geminiService';

const generationResponse = {
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
    printWidthCm: 10, printHeightCm: 10, anchorX: 0.5, anchorY: 0.5,
    referenceMockupId: null, printAreaId: 'front_default', transformVersion: 1,
  },
  transparencyVerificationStatus: 'verified',
  productionReadinessStatus: 'ready',
};

describe('WASHA AI generation placement instructions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['shoulder_right', 'logo_right'],
    ['shoulder_left', 'logo_left'],
  ] as const)('sends placement as deterministic data instead of asking the image model to place it: %s', async (printPosition, designPosition) => {
    let body: { prompt: string; generationContext: { printPosition: string; printSize: string } } | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(generationResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));

    await generateMockup('تيشيرت', 'أسود', 'صقر هندسي', 'DTF', 'هندسي', 'ذهبي', undefined, undefined, undefined, {
      designPosition,
      printPosition,
      printSize: 'small',
      sessionToken: 'session-token',
    });

    expect(body?.generationContext).toMatchObject({
      printPosition,
      printSize: 'small',
    });
    expect(body?.prompt).not.toContain('upper chest');
    expect(body?.prompt).not.toContain('Studio mockup');
  });

  it('sends the Clerk session token once for an authenticated generation', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      ...generationResponse,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateMockup(
      'تيشيرت',
      'أسود',
      'صقر هندسي',
      'DTF',
      'هندسي',
      'ذهبي',
      undefined,
      undefined,
      undefined,
      { sessionToken: 'session-token' },
    )).resolves.toMatchObject({
      masterAssetId: '22222222-2222-4222-8222-222222222222',
      previewUrl: 'https://cdn.example/mockup.webp',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer session-token');
    expect(new Headers(init?.headers).has('x-washa-auth-state')).toBe(false);
    expect(init?.credentials).toBe('omit');
  });

  it('does not automatically repeat an authentication failure', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      code: 'AUTH_TEMPORARILY_UNAVAILABLE',
      message: 'تعذّر التحقق من جلسة الدخول مؤقتاً.',
    }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateMockup(
      'تيشيرت',
      'أسود',
      'صقر هندسي',
      'DTF',
      'هندسي',
      'ذهبي',
      undefined,
      undefined,
      undefined,
      { sessionToken: 'session-token' },
    )).rejects.toThrow('تعذّر التحقق من جلسة الدخول مؤقتاً.');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
