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

  it('preserves authenticated intent and retries one transient session downgrade', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (fetchMock.mock.calls.length === 1) {
        return new Response(JSON.stringify({
          error: 'تعذّر تثبيت جلسة الدخول مؤقتاً.',
          code: 'session_unavailable',
          retryable: true,
        }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,AAAA' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
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
      { authenticatedSession: true },
    )).resolves.toBe('data:image/png;base64,AAAA');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get('x-washa-auth-state')).toBe('authenticated');
      expect(init?.credentials).toBe('same-origin');
    }
  });

  it('retries server-detected Clerk cookie evidence even when the session preflight missed twice', async () => {
    const fetchMock = vi.fn(async () => fetchMock.mock.calls.length === 1
      ? new Response(JSON.stringify({ code: 'session_unavailable', retryable: true }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        })
      : new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,AAAA' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateMockup(
      'تيشيرت', 'أسود', 'صقر هندسي', 'DTF', 'هندسي', 'ذهبي'
    )).resolves.toBe('data:image/png;base64,AAAA');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
