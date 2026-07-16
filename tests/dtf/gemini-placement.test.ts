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
      sessionToken: 'session-token',
    });

    expect(body?.prompt).toContain(code);
    expect(body?.prompt).toContain(expectedSide);
    expect(body?.prompt).toContain(`Do not place the logo on the ${forbiddenSide}`);
    expect(body?.prompt).not.toContain('upper sleeve');
  });

  it('sends the Clerk session token once for an authenticated generation', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      imageUrl: 'data:image/png;base64,AAAA',
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
    )).resolves.toBe('data:image/png;base64,AAAA');

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
