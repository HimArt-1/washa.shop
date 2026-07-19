import type {
  StructuredPublicErrorPayload,
  UserAction,
} from './publicErrors';
import { mapPublicError } from './publicErrors';

export const MAX_AUTO_RETRY_ATTEMPTS = 2;

export interface StructuredErrorDirective {
  action: UserAction;
  autoRetryDelayMs: number | null;
  countdownMs: number | null;
  focusPrompt: boolean;
  showAuthentication: boolean;
  requestId: string;
}

export interface GenerationRetryIdentity {
  fingerprint: string;
  requestId: string;
}

export interface StructuredRecoveryState {
  code: string;
  userAction: UserAction;
  requestId: string | null;
  retryRemainingMs: number;
}

export interface StructuredRecoveryRetry {
  automaticRetryAttempt: number;
  retryIdentity: GenerationRetryIdentity;
  promptOverride?: string;
}

interface StructuredRecoveryHost {
  getCurrentIdentity: () => GenerationRetryIdentity | null;
  isGenerationInFlight: () => boolean;
  clearRetryIdentity: () => void;
  onPromptFocus: () => void;
  onRetry: (retry: StructuredRecoveryRetry) => void;
  onStateChange: (state: StructuredRecoveryState | null) => void;
}

export function isStructuredRetryBlocked(
  error: Pick<StructuredErrorDirective, 'action'> & {
    retryRemainingMs: number;
  } | null,
) {
  return Boolean(
    error
    && error.retryRemainingMs > 0
    && (error.action === 'auto_retry' || error.action === 'wait_and_retry')
  );
}

export function focusStudioPromptInput(
  findInput: () => {
    focus: () => void;
    select: () => void;
  } | null,
) {
  const input = findInput();
  if (!input) return false;
  input.focus();
  input.select();
  return true;
}

export function canBypassDisabledReadiness(input: {
  isAutomaticRetry: boolean;
  currentError: {
    code: string;
    retryRemainingMs: number;
  } | null;
}) {
  return input.isAutomaticRetry || Boolean(
    input.currentError?.code === 'temporarily_unavailable'
    && input.currentError.retryRemainingMs === 0
  );
}

export function resolveReadinessErrorDirective(input: {
  code: string;
  message: string;
  retryAfterSeconds?: number;
}) {
  const retryable = input.code === 'temporarily_unavailable';
  const retryAfterMs =
    typeof input.retryAfterSeconds === 'number'
    && Number.isFinite(input.retryAfterSeconds)
    && input.retryAfterSeconds > 0
      ? Math.ceil(input.retryAfterSeconds * 1_000)
      : undefined;
  const mapping = mapPublicError(input.code, {
    fallbackMessage: input.message,
    scope: 'generation',
    retryable,
    retryAfterMs,
  });

  return {
    code: input.code,
    message: mapping.userMessage,
    userAction: mapping.userAction,
    retryAfterMs: mapping.retryAfterMs,
  };
}

export function resolveStructuredErrorDirective(
  payload: StructuredPublicErrorPayload,
  automaticRetryAttempt: number,
  autoRetryQuotaSafe = false,
): StructuredErrorDirective {
  const normalizedAttempt = Math.max(0, Math.floor(automaticRetryAttempt));
  const effectiveAction =
    payload.userAction === 'auto_retry' && !autoRetryQuotaSafe
      ? 'wait_and_retry'
      : payload.userAction;
  const canAutoRetry =
    effectiveAction === 'auto_retry'
    && payload.retryable
    && normalizedAttempt < MAX_AUTO_RETRY_ATTEMPTS;
  const progressiveDelayMs =
    Math.max(payload.retryAfterMs ?? 0, 1_000) * (2 ** normalizedAttempt);

  return {
    action: effectiveAction,
    autoRetryDelayMs: canAutoRetry
      ? progressiveDelayMs
      : null,
    countdownMs: effectiveAction === 'wait_and_retry'
      ? payload.retryAfterMs
      : null,
    focusPrompt: effectiveAction === 'edit_prompt',
    showAuthentication: payload.code === 'AUTH_REQUIRED',
    requestId: payload.requestId,
  };
}

export function canRunScheduledRetry(input: {
  scheduled: GenerationRetryIdentity;
  current: GenerationRetryIdentity | null;
  generationInFlight: boolean;
}) {
  return (
    !input.generationInFlight
    && input.current?.fingerprint === input.scheduled.fingerprint
    && input.current.requestId === input.scheduled.requestId
  );
}

export class StructuredActionTimers {
  private autoRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  scheduleAutoRetry(delayMs: number, callback: () => void) {
    this.cancelAutoRetry();
    this.autoRetryTimer = setTimeout(() => {
      this.autoRetryTimer = null;
      callback();
    }, Math.max(0, delayMs));
  }

  startCountdown(durationMs: number, onTick: (remainingMs: number) => void) {
    this.cancelCountdown();
    const expiresAt = Date.now() + Math.max(0, durationMs);
    onTick(Math.max(0, durationMs));
    if (durationMs <= 0) return;

    this.countdownTimer = setInterval(() => {
      const remainingMs = Math.max(0, expiresAt - Date.now());
      onTick(remainingMs);
      if (remainingMs === 0) {
        this.cancelCountdown();
      }
    }, 1_000);
  }

  cancelAll() {
    this.cancelAutoRetry();
    this.cancelCountdown();
  }

  dispose() {
    this.cancelAll();
  }

  private cancelAutoRetry() {
    if (this.autoRetryTimer === null) return;
    clearTimeout(this.autoRetryTimer);
    this.autoRetryTimer = null;
  }

  private cancelCountdown() {
    if (this.countdownTimer === null) return;
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }
}

export class StructuredRecoveryCoordinator {
  private readonly timers = new StructuredActionTimers();
  private state: StructuredRecoveryState | null = null;

  constructor(private readonly host: StructuredRecoveryHost) {}

  apply(input: {
    payload: StructuredPublicErrorPayload;
    automaticRetryAttempt: number;
    retryIdentity: GenerationRetryIdentity;
    promptOverride?: string;
    autoRetryQuotaSafe?: boolean;
  }) {
    const directive = resolveStructuredErrorDirective(
      input.payload,
      input.automaticRetryAttempt,
      input.autoRetryQuotaSafe === true,
    );
    const retryRemainingMs =
      directive.autoRetryDelayMs ?? directive.countdownMs ?? 0;

    this.publishState({
      code: input.payload.code,
      userAction: directive.action,
      requestId: directive.requestId,
      retryRemainingMs,
    });

    if (directive.focusPrompt) {
      this.host.onPromptFocus();
      return directive;
    }

    if (directive.countdownMs !== null && directive.countdownMs > 0) {
      this.startCountdown(directive.countdownMs);
    }

    if (directive.autoRetryDelayMs !== null) {
      this.startCountdown(directive.autoRetryDelayMs);
      this.timers.scheduleAutoRetry(
        directive.autoRetryDelayMs,
        () => {
          if (!canRunScheduledRetry({
            scheduled: input.retryIdentity,
            current: this.host.getCurrentIdentity(),
            generationInFlight: this.host.isGenerationInFlight(),
          })) {
            return;
          }
          this.host.onRetry({
            automaticRetryAttempt: input.automaticRetryAttempt + 1,
            retryIdentity: input.retryIdentity,
            ...(input.promptOverride
              ? { promptOverride: input.promptOverride }
              : {}),
          });
        },
      );
    }

    return directive;
  }

  showState(state: StructuredRecoveryState) {
    this.publishState(state);
    if (state.retryRemainingMs > 0) {
      this.startCountdown(state.retryRemainingMs);
    }
  }

  isManualRetryBlocked() {
    return isStructuredRetryBlocked(
      this.state
        ? {
            action: this.state.userAction,
            retryRemainingMs: this.state.retryRemainingMs,
          }
        : null,
    );
  }

  cancel() {
    this.timers.cancelAll();
    this.publishState(null);
  }

  invalidate() {
    this.cancel();
    this.host.clearRetryIdentity();
  }

  complete() {
    this.invalidate();
  }

  dispose() {
    this.timers.dispose();
  }

  private startCountdown(durationMs: number) {
    this.timers.startCountdown(durationMs, (retryRemainingMs) => {
      if (!this.state) return;
      this.publishState({
        ...this.state,
        retryRemainingMs,
      });
    });
  }

  private publishState(state: StructuredRecoveryState | null) {
    this.state = state;
    this.host.onStateChange(state);
  }
}
