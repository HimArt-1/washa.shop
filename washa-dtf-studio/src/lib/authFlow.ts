import type { DesignState } from '../types';
import { normalizeOutputPreferences } from './outputPreferences';

const AUTH_DRAFT_KEY = 'washa-ai-auth-draft-v1';
const AUTH_DRAFT_VERSION = 2;
const AUTH_DRAFT_MAX_AGE_MS = 45 * 60 * 1000;
const SESSION_ENDPOINT = '/api/washa-dtf-studio/session';

export type WashaAiAuthIntent = 'generate' | 'submit';

export type WashaAiAuthDraft = {
  version: typeof AUTH_DRAFT_VERSION;
  savedAt: number;
  intent: WashaAiAuthIntent;
  returnPath: string;
  state: DesignState;
  referenceImageOmitted: boolean;
  mockupImage: string | null;
  resultOmitted: boolean;
};

export type WashaAiDraftSaveResult = {
  saved: boolean;
  referenceImageOmitted: boolean;
  resultOmitted: boolean;
};

export type WashaAiSession = {
  authenticated: boolean;
  canGenerate: boolean;
  message?: string;
  signInUrl?: string;
};

function currentReturnPath() {
  if (typeof window === 'undefined') return '/design/washa-ai/app';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function compactDraftState(state: DesignState, includeReferenceImage: boolean): DesignState {
  return {
    ...state,
    ...normalizeOutputPreferences(state),
    prompt: state.prompt.slice(0, 3000),
    calligraphyText: state.calligraphyText.slice(0, 400),
    customPalette: state.customPalette?.slice(0, 280) || '',
    referenceImage: includeReferenceImage ? state.referenceImage : null,
    referenceImageMimeType: includeReferenceImage ? state.referenceImageMimeType : null,
  };
}

function writeDraft(draft: WashaAiAuthDraft) {
  localStorage.setItem(AUTH_DRAFT_KEY, JSON.stringify(draft));
}

export function saveWashaAiAuthDraft(
  state: DesignState,
  intent: WashaAiAuthIntent,
  mockupImage: string | null = null,
): WashaAiDraftSaveResult {
  const baseDraft = {
    version: AUTH_DRAFT_VERSION,
    savedAt: Date.now(),
    intent,
    returnPath: currentReturnPath(),
    state: compactDraftState(state, true),
    referenceImageOmitted: false,
    mockupImage,
    resultOmitted: false,
  } satisfies WashaAiAuthDraft;

  try {
    writeDraft(baseDraft);
    return { saved: true, referenceImageOmitted: false, resultOmitted: false };
  } catch {
    try {
      writeDraft({
        ...baseDraft,
        state: compactDraftState(state, false),
        referenceImageOmitted: Boolean(state.referenceImage),
      });
      return { saved: true, referenceImageOmitted: Boolean(state.referenceImage), resultOmitted: false };
    } catch {
      try {
        writeDraft({
          ...baseDraft,
          state: compactDraftState(state, false),
          referenceImageOmitted: Boolean(state.referenceImage),
          mockupImage: null,
          resultOmitted: Boolean(mockupImage),
        });
        return { saved: true, referenceImageOmitted: Boolean(state.referenceImage), resultOmitted: Boolean(mockupImage) };
      } catch {
        return { saved: false, referenceImageOmitted: Boolean(state.referenceImage), resultOmitted: Boolean(mockupImage) };
      }
    }
  }
}

export function consumeWashaAiAuthDraft(): WashaAiAuthDraft | null {
  try {
    const raw = localStorage.getItem(AUTH_DRAFT_KEY);
    if (!raw) return null;

    localStorage.removeItem(AUTH_DRAFT_KEY);
    const parsed = JSON.parse(raw) as Partial<WashaAiAuthDraft>;
    if (parsed.version !== AUTH_DRAFT_VERSION || !parsed.state || !parsed.savedAt) {
      return null;
    }

    if (Date.now() - parsed.savedAt > AUTH_DRAFT_MAX_AGE_MS) {
      return null;
    }

    return {
      version: AUTH_DRAFT_VERSION,
      savedAt: parsed.savedAt,
      intent: parsed.intent === 'submit' ? 'submit' : 'generate',
      returnPath: parsed.returnPath?.startsWith('/') ? parsed.returnPath : currentReturnPath(),
      state: {
        ...parsed.state,
        referenceImage: parsed.state.referenceImage ?? null,
        referenceImageMimeType: parsed.state.referenceImageMimeType ?? null,
      } as DesignState,
      referenceImageOmitted: parsed.referenceImageOmitted === true,
      mockupImage: typeof parsed.mockupImage === 'string' ? parsed.mockupImage : null,
      resultOmitted: parsed.resultOmitted === true,
    };
  } catch {
    localStorage.removeItem(AUTH_DRAFT_KEY);
    return null;
  }
}

export function buildWashaAiSignInUrl(returnPath = currentReturnPath()) {
  return `/sign-in?redirect_url=${encodeURIComponent(returnPath.startsWith('/') ? returnPath : '/design/washa-ai/app')}`;
}

export function buildWashaAiSignUpUrl(returnPath = currentReturnPath()) {
  return `/sign-up?redirect_url=${encodeURIComponent(returnPath.startsWith('/') ? returnPath : '/design/washa-ai/app')}`;
}

export async function fetchWashaAiSession(sessionToken?: string | null): Promise<WashaAiSession> {
  const returnPath = currentReturnPath();
  const token = sessionToken?.trim();
  const response = await fetch(`${SESSION_ENDPOINT}?returnPath=${encodeURIComponent(returnPath)}`, {
    method: 'GET',
    credentials: token ? 'omit' : 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : {};

  if (!response.ok) {
    const message = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : 'تعذر التحقق من الجلسة حالياً.';
    throw new Error(message);
  }

  return {
    authenticated: payload?.authenticated === true,
    canGenerate: payload?.canGenerate === true,
    message: typeof payload?.message === 'string' ? payload.message : undefined,
    signInUrl: typeof payload?.signInUrl === 'string' ? payload.signInUrl : buildWashaAiSignInUrl(returnPath),
  };
}
