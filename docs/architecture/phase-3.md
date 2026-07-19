# Phase 3 — Structured public errors and user actions

## Scope and problem

Before Phase 3, DTF Studio could safely scrub a provider message, but the browser
still received an untyped `Error` and inferred recovery from message text or
generic status. That makes Arabic copy changes capable of changing behavior and
does not provide a bounded retry policy.

Phase 3 adds one shared, positive error inventory in
`src/lib/washa-dtf-public-errors.ts`, structured response metadata in the
generate route, a typed browser error, and deterministic UI actions. Existing
scrubbers remain a second security boundary:
`INTERNAL_ERROR_PATTERNS`, `getPublicStudioErrorMessage`, and
`sanitizeWashaDtfProviderMessage` are not removed.

This phase does not change provider routing, quota accounting, idempotency,
asset persistence, OCR, background removal, asynchronous jobs, or the general
Studio design.

## Actual code inventory

The inventory covers response codes, authentication/runtime codes, quota
reasons, generation-readiness states, artwork validation errors, and the
idempotency completion trace code. `ready` is a successful readiness state and
is intentionally not an error-map entry. No new error code was invented.

The final column assumes structured actions are enabled while the separate
quota-safety flag remains at its default
`WASHA_ENABLE_AUTO_RETRY_QUOTA_SAFE=false`.

| Code | Public message | User action | Default retry | Effective (flag off) |
|---|---|---|---:|---|
| `ARTWORK_PLACEMENT_INVALID` | تعذر وضع التصميم داخل مساحة الطباعة الآمنة. استخدم «تعديل الخيارات» لضبط الحجم والموضع. | `none` | — | `none` |
| `ARTWORK_PRINT_VALIDATION_FAILED` | التصميم لا يستوفي متطلبات الطباعة. أعد المحاولة بوصف مختلف قليلاً. | `edit_prompt` | — | `edit_prompt` |
| `ARTWORK_TEXT_POLICY_FAILED` | التصميم يحتوي نصًا غير مطابق. سنعيد التوليد تلقائيًا. | `auto_retry` | 1 s | `wait_and_retry` |
| `ARTWORK_VERIFICATION_UNAVAILABLE` | اكتمل التصميم لكن تعذّر التحقق من النص. سنعيد المحاولة تلقائيًا. | `auto_retry` | 2 s | `wait_and_retry` |
| `AUTH_FORBIDDEN` | لا يملك المستخدم صلاحية إكمال العملية. | `none` | — | `none` |
| `AUTH_REQUIRED` | يلزم تسجيل الدخول لإكمال العملية. | `none` | — | `none` |
| `AUTH_TEMPORARILY_UNAVAILABLE` | تعذّر التحقق من جلسة الدخول مؤقتاً. | `wait_and_retry` | 2 s | `wait_and_retry` |
| `DUPLICATE_REQUEST` | طلبك قيد التنفيذ حاليًا. انتظر ظهور النتيجة. | `none` | — | `none` |
| `IDEMPOTENCY_COMPLETION_FAILED` | اكتمل التصميم لكن تعذر تثبيت حالة الطلب. احتفظ بمعرّف الطلب وتواصل مع الدعم. | `contact_support` | — | `contact_support` |
| `IDEMPOTENCY_UNAVAILABLE` | تعذّر تثبيت طلب التوليد مؤقتاً. | `wait_and_retry` | 5 s | `wait_and_retry` |
| `IDENTITY_CONFLICT` | تعذّر ربط حساب المستخدم تلقائياً. تواصل مع الدعم. | `contact_support` | — | `contact_support` |
| `IMAGE_PROVIDER_UNAVAILABLE` | خدمة التوليد غير متوفرة مؤقتًا. سنعيد المحاولة تلقائيًا. | `auto_retry` | 3 s | `wait_and_retry` |
| `INTERNAL_ERROR` | حدث خطأ داخلي غير متوقع. | `contact_support` | — | `contact_support` |
| `INVALID_REQUEST` | بيانات الطلب غير صالحة. صحّح المدخلات وحاول مرة أخرى. | `none` | — | `none` |
| `LEGACY_EXTRACTION_DISABLED` | تعذّر تجهيز هذا التصميم للطباعة من النسخة الحالية. استخدم التصميم الأصلي المحفوظ أو حاول مرة أخرى. | `none` | — | `none` |
| `PROMPT_NON_MEANINGFUL` | الوصف غير واضح. اكتب جملة تصف التصميم. | `edit_prompt` | — | `edit_prompt` |
| `PROMPT_TOO_SHORT` | الوصف قصير جداً. أضف تفاصيل عن التصميم. | `edit_prompt` | — | `edit_prompt` |
| `QUOTA_STATE_UNCERTAIN` | تعذّر تأكيد حالة رصيدك. تحقق قبل إعادة المحاولة. | `contact_support` | — | `contact_support` |
| `RATE_LIMITED` | تم تجاوز الحد المسموح. انتظر دقيقة قبل المحاولة. | `wait_and_retry` | 60 s | `wait_and_retry` |
| `TRANSPARENT_ARTWORK_PROVIDER_UNAVAILABLE` | خدمة إعداد التصميم غير متاحة حالياً. تواصل مع الدعم. | `contact_support` | — | `contact_support` |
| `USER_SERVICE_UNAVAILABLE` | تعذّر التحقق من بيانات المستخدم مؤقتاً. | `wait_and_retry` | 5 s | `wait_and_retry` |
| `audience_disabled` | توليد وشّى AI غير متاح لحسابك حالياً. | `none` | — | `none` |
| `disabled` | خدمة التوليد متوقفة حالياً. | `none` | — | `none` |
| `provider_not_configured` | خدمة التوليد غير جاهزة حالياً. | `contact_support` | — | `contact_support` |
| `quota_exceeded` | نفدت حصتك من التوليد. يمكنك إضافة رصيد للمتابعة. | `upgrade_plan` | — | `upgrade_plan` |
| `quota_unavailable` | تعذّر التحقق من رصيد WASHA AI حالياً. حاول بعد قليل. | `wait_and_retry` | 5 s | `wait_and_retry` |
| `temporarily_unavailable` | خدمة التوليد غير متاحة مؤقتاً. حاول بعد قليل. | `wait_and_retry` | 5 s | `wait_and_retry` |

## Shared contract and mapping

`UserAction` is the closed union `edit_prompt | auto_retry | wait_and_retry |
contact_support | upgrade_plan | none`. `ERROR_MAP` is checked with
`satisfies Record<PublicErrorCode, PublicErrorMapping>`, while an exhaustive
snapshot prevents accidental deletion or remapping.

An unknown code never gets a recovery action from its HTTP status or message.
Its message passes through the existing sanitizers, its action is
`contact_support`, and it has no retry delay. A complete structured payload must
pass `isStructuredPublicErrorPayload`; partial or malformed bodies continue
through the legacy display-only path.

When enabled, an error response preserves `ok`, `code`, `message`, `retryable`,
`requestId`, and `X-Washa-Error-Code`, and adds `userAction`, `retryAfterMs`,
and `X-Washa-User-Action`. `Retry-After` is emitted only for HTTP 429 and 503
responses with a real delay and uses HTTP seconds. Other 4xx responses keep
their timing metadata in `retryAfterMs` only. The client treats the response
header as the timing source of truth when both header and body are present.

## Feature flag

`WASHA_STRUCTURED_USER_ACTIONS_ENABLED=false` is server-owned and defaults to
legacy behavior. The existing config API exposes only the boolean
`features.structuredUserActionsEnabled` to the Vite client; browser code does
not read server environment variables.

`WASHA_ENABLE_AUTO_RETRY_QUOTA_SAFE=false` is a separate server-owned safety
gate. The config API exposes only
`features.autoRetryQuotaSafeEnabled`. It defaults to `false`; automatic retry
must not run until the separate Phase 3b quota-reuse design and migration are
reviewed and approved.

With the flag off, response shapes and visible Studio behavior remain as
before: no new automatic retry, countdown, focus transition, or support-ID
display. With it on, only typed `code`, `userAction`, `retryAfterMs`, and
`retryable` drive recovery.

## Client action policy

- `edit_prompt` displays the safe message, returns to the idea step, focuses and
  highlights the active description field, and sends no request.
- `ARTWORK_PLACEMENT_INVALID` uses `none`: it stays on the result/options flow
  so the existing “تعديل الخيارات” control can adjust size and position.
- `auto_retry` is disabled until Phase 3b is approved. While
  `WASHA_ENABLE_AUTO_RETRY_QUOTA_SAFE=false`, both server and client degrade it
  to `wait_and_retry`: a countdown is shown and no request is submitted
  automatically.
- If Phase 3b is approved later, `auto_retry` still requires `retryable: true`,
  uses at most two automatic attempts, and delays by
  `max(retryAfterMs, 1 s) × 2^attempt`. Timers are cancelled on unmount, reset,
  input change, or a new manual request.
- `wait_and_retry` shows a countdown and disables manual retry until it reaches
  zero. It never submits automatically.
- `contact_support` is final and displays a copyable request ID.
- `upgrade_plan` reuses the existing quota-exceeded event and CTA.
- `AUTH_REQUIRED` preserves the `none` action (no retry) and opens the existing
  authentication gate with the current draft-preservation flow.
- `none` displays the message without additional recovery.

## Idempotency, quota, and asset safety

Phase 3 does not alter `claimDtfGenerationRequest`,
`completeDtfGenerationRequest`, `failDtfGenerationRequest`, quota
reservation/release, or the Master/Derivative/Checksum services.

Automatic attempts retain the original `generationRetryRef` fingerprint and
request ID. A scheduled retry runs only when that exact identity is still
current and no generation is in flight. Editing state invalidates the identity.
Success clears it, so a late timer cannot generate again. On the server, the
same request ID is passed to the idempotent quota reservation, duplicate
requests are rejected before quota/provider work, and a persisted late result
is returned before claiming, charging, or creating another master.

## Risks

- An incorrect server mapping can produce the wrong deterministic UI action;
  the exhaustive map snapshot and route tests are the primary guard.
- Enabling automatic retry without an approved quota-reuse mechanism can charge
  more than once. The separate safety flag therefore remains false in Phase 3.
- Config and generate responses must come from the same deployment. A mixed
  deployment can show legacy behavior, but cannot opt the client into actions
  without a complete typed payload.
- `IDEMPOTENCY_COMPLETION_FAILED` currently exists as a trace code rather than
  a normal public response. It remains mapped so a future public surface cannot
  fall through to an unsafe default.

## Rollback

Set `WASHA_STRUCTURED_USER_ACTIONS_ENABLED=false`. This removes the additional
response metadata and all new browser actions without reverting code. Phase 3
contains no migration, cron, or quota/idempotency change that survives this
rollback. Do not change the Phase 0 flags as part of this rollback.

## Later staging plan (not executed)

After merge approval and a baseline are available, deploy this code to staging
with the flag still false and record error-code distribution, retry count per
request ID, quota reservations/releases, duplicate-request rate, master assets
per request, and p95 generation latency. Then enable the flag only in staging
and exercise every non-automatic action, including provider-failure countdown,
rate-limit countdown, authentication expiry, quota upgrade, support-ID copy,
page unmount, and input edits during a timer. Automatic retries remain disabled
until Phase 3b is approved separately.

The staging gate is zero duplicate charges, zero duplicate master assets, zero
retry after a recovered success, no internal/provider message leakage, and no
material latency or error-rate regression. Production remains out of scope
until those results are reviewed explicitly.
