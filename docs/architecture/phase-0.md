# Phase 0 — Arabic normalization and prompt guard

## Scope

Phase 0 changes only text-policy comparison and early prompt validation; it does not alter the API contract, provider routing, storage/integrity, idempotency, quota, or normalization pipeline.

New production files: `src/lib/washa-artwork/arabic-normalize.ts` for Arabic comparison normalization, Levenshtein distance, and tolerant matching; and `src/lib/washa-artwork/prompt-guard.ts` for deterministic prompt-quality validation. No dependency is added.

Modified production files: `src/lib/washa-artwork/arabic-text-verification.ts` will apply the tolerant comparison consistently to both Gemini and OpenAI exact-text branches and the short-noise exception to forbidden-text verification; `src/app/api/washa-dtf-studio/generate-mockup/route.ts` will reject an enabled guard failure immediately after extracting `prompt`, using the existing `structuredErrorResponse` contract and a non-sensitive trace event; `.env.example` will document both flags.

New unit-test files: `tests/dtf/arabic-normalize.test.ts` and `tests/dtf/prompt-guard.test.ts`. Existing `tests/dtf/arabic-text-verification.test.ts` and `tests/dtf/generate-mockup.route.test.ts` will be extended for flag compatibility and the affected integration paths.

## Feature flags

- `WASHA_ENABLE_TOLERANT_TEXT_MATCH=false`: preserves the current exact/forbidden checks by default; `true` enables normalized Levenshtein matching and accepts normalized forbidden-text noise shorter than three characters.
- `WASHA_PROMPT_GUARD_ENABLED=false`: preserves current request handling by default; `true` enables `PROMPT_TOO_SHORT` and `PROMPT_NON_MEANINGFUL` responses before authentication, quota reservation, or provider work.

The positive first flag is intentional: using the brief's `WASHA_TEXT_MATCH_STRICT=false` would enable new behavior by default and conflict with the required legacy-default guardrail.

## Planned tests

- Arabic normalization: diacritics/kashida removal; alef, alef-maqsura, taa-marbuta, waw/yaa-hamza folding; whitespace collapse; and mixed transformations.
- Levenshtein/matching: exact text, diacritic-only variance, one-character variance accepted, whole-word variance rejected, and reported distance/tolerance.
- Prompt guard: valid Arabic prompts at and above the 6-character boundary, fewer than 6 trimmed characters, symbols-only input, and whitespace-only input with the exact public code/message.
- Flag regressions: both flags unset/`false` retain the current behavior; tolerant mode covers both Gemini and OpenAI branches plus the under-three-character forbidden-text exception.
- Route integration: each prompt error returns HTTP 400 with `ok`, `code`, `message`, `retryable: false`, `requestId`, and `X-Washa-Error-Code`, and performs no auth/quota/provider call.
- Calligraphy integration: generation text-policy verification for `الحمد لله` accepts a mocked observed rendering containing Arabic diacritics while tolerant matching is enabled.

Verification after approval: focused Vitest runs while developing, then the full `npm run test:unit` and `npm run lint`; no Phase 1 work or product-code commit is included in this checkpoint.

## Staging rollout

Production keeps both flags `false`. After this branch is pushed to staging, collect a legacy baseline with both flags off, then enable `WASHA_ENABLE_TOLERANT_TEXT_MATCH` alone. Enable `WASHA_PROMPT_GUARD_ENABLED` only after the text-policy sample passes review, so each behavioral change has an isolated comparison and rollback.

Do not start Phase 1 or Phase 3 until the staging record contains at least 100 text-policy verification attempts, including at least 30 calligraphy requests, plus a prompt matrix containing valid 6-character Arabic prompts, shorter prompts, whitespace, and symbol-only inputs.

## Measurement record

All baseline and enabled values are `TBD` until staging deployment. Record them in this document before a production decision.

| Metric | Trace source | Baseline | Enabled | Staging gate |
|---|---|---:|---:|---|
| Calligraphy text-policy pass rate | `artwork_text_policy_verification_succeeded` / (`succeeded` + `failed`), filtered by `textRenderingAllowed=true` | TBD | TBD | Must improve or remain stable; manually review at least 30 calligraphy outputs |
| Forbidden-text failure rate | Same events, filtered by `textRenderingAllowed=false` | TBD | TBD | No unexplained increase; manually inspect accepted short-noise cases |
| Verification-stage failure rate | `artwork_text_policy_verification_failed` / (`succeeded` + `failed`) across all verification modes | TBD | TBD | Must decrease or remain stable |
| Average AI calls per request | Count `provider_attempt_started`, `provider_fallback_started`, and `artwork_text_policy_verification_started` per trace ID | TBD | TBD | No increase from Phase 0 |
| Prompt-guard rejection rate | `prompt_guard_evaluated`, grouped by `accepted` and `errorCode` | N/A while off | TBD | All curated valid prompts of length ≥6 pass; all shorter or non-meaningful cases reject |
| User-facing error rate | Route outcomes grouped by HTTP status and `X-Washa-Error-Code` | TBD | TBD | No increase greater than 2 percentage points outside the two intended prompt codes |
| p95 total generation latency | `success_logged.totalDurationMs` | TBD | TBD | No regression greater than 5% |

## Risks and rollback

- The minimum Levenshtein tolerance of one character can accept a meaningful one-character substitution in a short phrase; manually review short calligraphy samples.
- Folding `ة/ه`, `ى/ي`, `ؤ/و`, and `ئ/ي` intentionally removes distinctions that can be semantically meaningful outside visual comparison.
- The forbidden-text exception accepts one or two normalized characters even when the verifier reports visible text; manually inspect logos, initials, and signatures in this bucket.
- A six-character prompt threshold is still a character-count heuristic, not a semantic Arabic-language score; monitor valid-prompt false rejections.

Rollback requires no code revert: set the flag responsible for a failed gate to `false`. Roll back tolerant matching immediately for a confirmed unexpected-text acceptance or a text-policy regression; roll back the prompt guard for any confirmed valid-prompt rejection at or above the six-character boundary.
