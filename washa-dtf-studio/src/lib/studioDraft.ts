import {
  CUSTOM_PALETTE_ID,
  type DesignState,
  type DtfStudioConfig,
} from '../types';
import { findSupportedPrintOption, getPrintPlacementCopy, resolvePrintPlacementFromOption } from './placement';

const STUDIO_DRAFT_KEY = 'washa-ai-studio-draft-v1';
const STUDIO_DRAFT_VERSION = 1;
const STUDIO_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STUDIO_DRAFT_CLOCK_SKEW_MS = 5 * 60 * 1000;

const STEP_SLUGS = ['garment', 'idea', 'placement', 'style', 'palette', 'result'] as const;

export type StudioStep = 1 | 2 | 3 | 4 | 5 | 6;

export type StudioDraft = {
  version: typeof STUDIO_DRAFT_VERSION;
  savedAt: number;
  step: StudioStep;
  state: DesignState;
  referenceImageOmitted: boolean;
};

function clampStudioStep(value: number): StudioStep {
  return Math.min(6, Math.max(1, Math.trunc(value))) as StudioStep;
}

export function parseStudioStep(value: string | null | undefined): StudioStep | null {
  if (!value) return null;
  const index = STEP_SLUGS.indexOf(value as (typeof STEP_SLUGS)[number]);
  return index < 0 ? null : ((index + 1) as StudioStep);
}

export function studioStepToSlug(step: number) {
  return STEP_SLUGS[clampStudioStep(step) - 1];
}

function compactState(state: DesignState): DesignState {
  return {
    ...state,
    prompt: state.prompt.slice(0, 3000),
    calligraphyText: state.calligraphyText.slice(0, 400),
    customPalette: state.customPalette?.slice(0, 280) ?? '',
    ideaEntryMode: state.ideaEntryMode ?? (state.prompt ? 'free' : 'guided'),
    ideaBrief: state.ideaBrief
      ? {
          subject: state.ideaBrief.subject.slice(0, 180),
          mood: state.ideaBrief.mood.slice(0, 120),
          meaning: state.ideaBrief.meaning.slice(0, 240),
          wording: state.ideaBrief.wording.slice(0, 180),
          avoid: state.ideaBrief.avoid.slice(0, 240),
        }
      : undefined,
    ideaBriefPromptSource: state.ideaBriefPromptSource?.slice(0, 420),
    referenceImage: null,
    referenceImageMimeType: null,
  };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStoredDesignState(value: unknown): value is DesignState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<Record<keyof DesignState, unknown>>;
  const stringFields: Array<keyof DesignState> = [
    'garmentType',
    'garmentColor',
    'garmentColorHex',
    'garmentSize',
    'designPosition',
    'prompt',
    'calligraphyText',
    'style',
    'technique',
    'palette',
  ];
  const nullableStringFields: Array<keyof DesignState> = [
    'garmentId',
    'garmentColorId',
    'garmentSizeId',
    'printOptionId',
    'printPositionLabel',
    'referenceImage',
    'referenceImageMimeType',
    'styleId',
    'techniqueId',
    'paletteId',
  ];

  const ideaBrief = state.ideaBrief as Partial<Record<'subject' | 'mood' | 'meaning' | 'wording' | 'avoid', unknown>> | undefined;
  const validIdeaBrief = ideaBrief === undefined || (
    ideaBrief !== null &&
    typeof ideaBrief === 'object' &&
    ['subject', 'mood', 'meaning', 'wording', 'avoid'].every((field) => typeof ideaBrief[field as keyof typeof ideaBrief] === 'string')
  );

  return stringFields.every((field) => typeof state[field] === 'string') &&
    nullableStringFields.every((field) => isNullableString(state[field])) &&
    ['text', 'image', 'calligraphy'].includes(String(state.designMethod)) &&
    (state.printPosition === null || ['chest', 'back', 'shoulder_right', 'shoulder_left'].includes(String(state.printPosition))) &&
    (state.printSize === null || state.printSize === 'large' || state.printSize === 'small') &&
    typeof state.removeBackground === 'boolean' &&
    typeof state.avoidHardEdges === 'boolean' &&
    (state.customPalette === undefined || typeof state.customPalette === 'string') &&
    (state.ideaEntryMode === undefined || state.ideaEntryMode === 'guided' || state.ideaEntryMode === 'free') &&
    (state.ideaBriefPromptSource === undefined || typeof state.ideaBriefPromptSource === 'string') &&
    (state.printScale === undefined || (typeof state.printScale === 'number' && state.printScale >= 55 && state.printScale <= 120)) &&
    (state.printOffsetX === undefined || (typeof state.printOffsetX === 'number' && state.printOffsetX >= -30 && state.printOffsetX <= 30)) &&
    (state.printOffsetY === undefined || (typeof state.printOffsetY === 'number' && state.printOffsetY >= -25 && state.printOffsetY <= 25)) &&
    validIdeaBrief;
}

export function createStudioDraft(
  state: DesignState,
  step: number,
  savedAt = Date.now(),
  preserveReferenceImageOmitted = false,
): StudioDraft {
  return {
    version: STUDIO_DRAFT_VERSION,
    savedAt,
    step: clampStudioStep(step),
    state: compactState(state),
    referenceImageOmitted: Boolean(state.referenceImage) || (preserveReferenceImageOmitted && state.designMethod === 'image'),
  };
}

export function parseStudioDraft(raw: string, now = Date.now()): StudioDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StudioDraft>;
    if (
      parsed.version !== STUDIO_DRAFT_VERSION ||
      typeof parsed.savedAt !== 'number' ||
      !isStoredDesignState(parsed.state) ||
      now - parsed.savedAt > STUDIO_DRAFT_MAX_AGE_MS ||
      parsed.savedAt - now > STUDIO_DRAFT_CLOCK_SKEW_MS
    ) {
      return null;
    }

    return {
      version: STUDIO_DRAFT_VERSION,
      savedAt: parsed.savedAt,
      step: clampStudioStep(typeof parsed.step === 'number' ? parsed.step : 1),
      state: compactState(parsed.state as DesignState),
      referenceImageOmitted: parsed.referenceImageOmitted === true,
    };
  } catch {
    return null;
  }
}

export function saveStudioDraft(state: DesignState, step: number, preserveReferenceImageOmitted = false) {
  try {
    localStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify(createStudioDraft(state, step, Date.now(), preserveReferenceImageOmitted)));
    return true;
  } catch {
    return false;
  }
}

export function loadStudioDraft() {
  try {
    const raw = localStorage.getItem(STUDIO_DRAFT_KEY);
    if (!raw) return null;
    const draft = parseStudioDraft(raw);
    if (!draft) localStorage.removeItem(STUDIO_DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}

export function clearStudioDraft() {
  try {
    localStorage.removeItem(STUDIO_DRAFT_KEY);
  } catch {
    // Storage is optional; reset must continue even when it is unavailable.
  }
}

export function readStudioStepFromUrl() {
  if (typeof window === 'undefined') return null;
  return parseStudioStep(new URL(window.location.href).searchParams.get('step'));
}

export function syncStudioStepInUrl(step: number) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('step', studioStepToSlug(step));
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function isStudioAppPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '/design/washa-ai/app';
}

export function getHighestReachableStep(state: DesignState): StudioStep {
  if (!state.garmentId || !state.garmentColorId || !state.garmentSizeId) return 1;

  const hasIdea = state.designMethod === 'calligraphy'
    ? Boolean(state.calligraphyText.trim())
    : state.designMethod === 'image'
      ? Boolean(state.referenceImage)
      : Boolean(state.prompt.trim());
  if (!hasIdea) return 2;
  if (!state.printOptionId) return 3;
  if (!state.styleId && !state.techniqueId) return 4;
  return 5;
}

export function hasMeaningfulStudioDraft(state: DesignState, step: number) {
  return step > 1 || Boolean(
    state.garmentId ||
    state.prompt.trim() ||
    state.calligraphyText.trim() ||
    state.customPalette?.trim(),
  );
}

export function resolveStudioRestoreStep(requestedStep: number, savedStep: number, highestReachableStep: number): StudioStep {
  return clampStudioStep(Math.min(requestedStep, savedStep, highestReachableStep));
}

export function reconcileStudioDraftState(
  saved: DesignState,
  config: DtfStudioConfig,
  fallback: DesignState,
): DesignState {
  const restored: DesignState = {
    ...fallback,
    ...compactState(saved),
  };

  const garment = config.garments.find((item) => item.id === saved.garmentId) ?? null;
  if (!garment) {
    restored.garmentId = null;
    restored.garmentType = '';
    restored.garmentColorId = null;
    restored.garmentColor = '';
    restored.garmentSizeId = null;
    restored.garmentSize = '';
  } else {
    const color = garment.colors.find((item) => item.id === saved.garmentColorId) ?? null;
    restored.garmentId = garment.id;
    restored.garmentType = garment.name;
    restored.garmentColorId = color?.id ?? null;
    restored.garmentColor = color?.name ?? '';
    restored.garmentColorHex = color?.hexCode ?? fallback.garmentColorHex;

    const size = color
      ? garment.sizes.find(
          (item) => item.id === saved.garmentSizeId && item.stockStatus !== 'out' && (item.colorId === null || item.colorId === color.id),
        ) ?? null
      : null;
    restored.garmentSizeId = size?.id ?? null;
    restored.garmentSize = size?.name ?? '';
  }

  const style = config.styles.find((item) => item.id === saved.styleId) ?? null;
  restored.styleId = style?.id ?? fallback.styleId;
  restored.style = style?.name ?? fallback.style;

  const technique = config.techniques.find((item) => item.id === saved.techniqueId) ?? null;
  restored.techniqueId = technique?.id ?? fallback.techniqueId;
  restored.technique = technique?.name ?? fallback.technique;

  const palette = config.palettes.find((item) => item.id === saved.paletteId) ?? null;
  if (saved.paletteId === CUSTOM_PALETTE_ID) {
    restored.paletteId = CUSTOM_PALETTE_ID;
    restored.palette = saved.palette;
  } else {
    restored.paletteId = palette?.id ?? fallback.paletteId;
    restored.palette = palette?.name ?? fallback.palette;
  }

  const position = findSupportedPrintOption(config.positions, saved.printOptionId);
  if (position) {
    const placement = resolvePrintPlacementFromOption(position);
    const placementCopy = getPrintPlacementCopy(placement.printPosition, placement.printSize);
    restored.designPosition = placement.designPosition;
    restored.printOptionId = position.id;
    restored.printPosition = placement.printPosition;
    restored.printSize = placement.printSize;
    restored.printPositionLabel = placementCopy.title;
  } else {
    restored.designPosition = fallback.designPosition;
    restored.printOptionId = fallback.printOptionId;
    restored.printPosition = fallback.printPosition;
    restored.printSize = fallback.printSize;
    restored.printPositionLabel = fallback.printPositionLabel;
  }

  return restored;
}

export function reconcileAuthDraftState(
  saved: DesignState,
  config: DtfStudioConfig,
  fallback: DesignState,
  referenceImageOmitted: boolean,
) {
  const restored = reconcileStudioDraftState(saved, config, fallback);
  if (referenceImageOmitted) return restored;

  return {
    ...restored,
    referenceImage: saved.referenceImage,
    referenceImageMimeType: saved.referenceImageMimeType,
  };
}
