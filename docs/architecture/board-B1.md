# Phase B1 — Board generation module

## Status and approval gate

This document is the design checkpoint for Phase B1. It is written on
`washa/board-B1-generation`, branched from the approved
`washa/board-B0-infrastructure` head rather than from `main`.

No B1 runtime code, provider call, storage object, database row, route branch,
quota mutation, Telegram message, deployment, or fallback activation is part
of this checkpoint. Implementation starts only after explicit approval of this
document and stops again when B1 is complete. B0 is not merged independently;
B0–B3 remain queued for one system-level review before any merge.

## Scope

B1 adds one deep board-generation module behind one caller-facing function. It
owns the complete operation required to turn an already validated customer
description and `generationContext` into one preliminary board preview:

- read the approved board prompt template without cache;
- render all seven placeholders deterministically;
- resolve the configured image provider through the existing configuration
  resolver;
- generate exactly one square board through a board-only provider adapter;
- upload the preview through the generic storage helper;
- persist one isolated `washa_board_requests` row and its final state;
- return a small result that B2 can map into an HTTP response.

B1 does **not** add the route branch or customer disclosure UI (B2), Telegram
or the staff queue (B3), and does not reserve, charge, refund, or inspect quota.
There is still no runtime caller until B2.

## Verified repository facts

- B0 created `public.washa_board_requests` with a unique
  `generation_request_id`, nullable `profile_id ON DELETE SET NULL`, complete
  `generation_context`, provider/model fields, `processing | ready | failed`
  status, and owner-read-only RLS.
- The approved prompt currently lives inside `settings.ts`; moving its pure
  constant/normalizer to a server-safe prompt module is necessary so B1 and the
  aggregate settings reader cannot drift.
- `getSiteSettings()` is cached for 120 seconds. B1 cannot use it for the
  operational prompt read. The uncached service-role reader already exists in
  `washa-generation-mode.ts` and can be extended for the prompt key without
  creating a second client implementation.
- `generationContextSchema` has garment color, placement, print size and scale,
  but no explicit centimeter fields. Current selection semantics are 30×40 cm
  for a large chest/back print, 18×18 cm for a small chest/back print, and
  10×10 cm for either shoulder, scaled by `printScale`.
- The primary artwork path calls `DesignAssetService.generate()`, which calls
  `generateIsolatedArtwork()` and then normalization, text policy, Master,
  Derivative and Checksum operations. None of those are suitable for a board.
- `washDtfRoutedGenerateMockup()` is also unsuitable: its GenAI adapter injects
  an authoritative “final DTF product mockup” instruction and its fallback
  chain can change providers without returning the actual provider/model to the
  caller. That would make the board row's metadata untrustworthy.
- The existing public `smart-store` bucket supports public preview URLs and
  service-role writes. Its browser writes are restricted by current storage
  policies. A dedicated `board-previews/` prefix satisfies the specification's
  tagged-path option without adding another storage migration.
- The historical clean-reset defect in `001_site_settings.sql` is documented
  separately in `docs/architecture/tech-debt.md` and is not repaired by B1.

## Module and interface

New caller-facing module:

`src/app/api/washa-dtf-studio/services/board-generation.service.ts`

```typescript
import type { GenerationContext } from
    "@/app/api/washa-dtf-studio/validators/ai-studio.schema";

export interface BoardGenerationInput {
    profileId: string;
    generationRequestId: string;
    prompt: string; // validated, sanitized customer description
    generationContext: GenerationContext;
}

export type BoardGenerationCode =
    | "INVALID_BOARD_INPUT"
    | "BOARD_GENERATION_IN_PROGRESS"
    | "IMAGE_PROVIDER_UNAVAILABLE"
    | "BOARD_STORAGE_UNAVAILABLE"
    | "BOARD_PERSISTENCE_FAILED";

export interface BoardGenerationResult {
    ok: boolean;
    boardImageUrl?: string;
    boardRequestId?: string;
    code?: BoardGenerationCode;
}

export async function generateBoard(
    input: BoardGenerationInput
): Promise<BoardGenerationResult>;
```

The interface includes the following invariants, not just the TypeScript shape:

- `profileId` is the authorized profile selected by the route, never a
  client-supplied owner override.
- `generationRequestId` is the route trace/request ID and is stable for one
  generation attempt.
- `prompt` and `generationContext` have passed the existing Zod request schema.
- `ok: true` always includes both `boardImageUrl` and `boardRequestId` and means
  the row is `ready`.
- `ok: false` always includes `code`; it includes `boardRequestId` whenever the
  processing row was created.
- Expected provider, storage and persistence failures are returned, not leaked
  as raw third-party exceptions.

This is the only interface B2 will learn. Prompt rendering, provider switching,
output normalization, storage naming, persistence order and cleanup remain
inside the module.

### Internal seams and adapters

The external image providers are true external dependencies. B1 therefore adds
one internal production adapter:

`src/app/api/washa-dtf-studio/services/board-image-provider.adapter.ts`

Its internal port is:

```typescript
type BoardProviderImage = {
    dataUrl: string;
    provider: string;
    model: string;
};

async function generateBoardProviderImage(input: {
    prompt: string;
    configuration: WashaDtfProviderConfiguration;
    traceId: string;
}): Promise<BoardProviderImage>;
```

The adapter is replaceable by a mock in tests. It is not part of the route's
interface. Supabase persistence and storage are likewise replaced at their
existing client/helper seams; no repository methods are exposed to B2.

## Implementation files after approval

- Add `board-generation.service.ts` — orchestration and the public interface.
- Add `board-image-provider.adapter.ts` — exact resolved-provider execution and
  normalization to one data URL.
- Add `src/lib/washa-board-prompt.ts` — approved template, strict normalizer,
  one-pass renderer, placement labels and board-only dimension derivation.
- Export `GenerationContext = z.infer<typeof generationContextSchema>` from the
  existing validator.
- Extend the existing uncached reader in `washa-generation-mode.ts` with
  `getBoardPromptTemplate()`; it uses the same no-store timeout and fail-safe
  template normalizer as the mode/quota getters.
- Refactor `settings.ts` to import the prompt constant and normalizer from
  `washa-board-prompt.ts`. This is a locality-only move with no setting behavior
  change.
- Add B1 unit and source-contract tests. No route file changes in B1.

## End-to-end flow

`generateBoard(input)` executes in this order:

1. Validate the interface invariants that cannot be expressed by the type:
   non-empty IDs, bounded prompt, and JSON-safe context. Invalid input returns
   `INVALID_BOARD_INPUT` before any database or provider call.
2. Read `board_prompt_template` through `getBoardPromptTemplate()` using the B0
   uncached client. Missing, invalid, timed-out or errored reads use the full
   approved template.
3. Render the template in one pass using the exact seven-token map below. The
   returned string must contain none of the seven known placeholders.
4. Call `resolveWashaDtfProviderConfiguration()` **directly in the board
   service**. Reject `unsupported` or missing credentials as
   `IMAGE_PROVIDER_UNAVAILABLE` after a failed row exists.
5. Generate `boardRequestId = crypto.randomUUID()` and insert one row with that
   ID and `status = processing` before the provider call. Creating this row
   early is required to satisfy the acceptance rule that provider failure
   leaves a `failed` row.
6. Call the board-only provider adapter exactly once with the rendered prompt
   and resolved configuration. It returns one normalized image plus the actual
   provider/model.
7. Upload that image to the tagged public preview path described below. No
   Master, print file or derivative is produced.
8. Update the same row with `board_image_url`, actual provider/model and
   `status = ready`.
9. Return `{ ok: true, boardImageUrl, boardRequestId }`.

The database row is the operation's state machine. Provider generation never
starts if the processing row cannot be created, and `ready` is never returned
until both storage and the final database update succeed.

### Duplicate request ID

The unique `generation_request_id` is treated as an idempotency boundary:

- an existing `ready` row returns its stored URL and ID without another
  provider call;
- an existing `processing` row returns `BOARD_GENERATION_IN_PROGRESS`;
- an existing `failed` row remains the record of that attempt. The original
  call receives its precise provider/storage failure code, but B0 deliberately
  has no persisted `failure_code` column, so a later replay returns the terminal
  generic `BOARD_PERSISTENCE_FAILED`; a genuinely new user attempt must carry a
  new request ID. B1 does not corrupt provider/model or append private metadata
  to `generation_context` merely to reconstruct that code.

Before any replay, the stored `profile_id` must equal `input.profileId`. A
mismatch is treated as `BOARD_PERSISTENCE_FAILED`, emits a security diagnostic,
and never returns the other row's URL. No upsert may overwrite a ready board or
transfer it to another profile.

## Prompt template rendering

### Pure prompt module

`washa-board-prompt.ts` owns:

- the exact approved default template from the original specification;
- the seven required placeholders and validation;
- `normalizeBoardPromptTemplate(value)`;
- `renderBoardPrompt({ template, prompt, generationContext })`;
- board-only placement labels and dimension constants.

The settings action, operational getter and B1 service share this module. There
is one template source of truth.

### One-pass replacement

The renderer uses one regular expression over the original template and a
closed token map. It does not call seven sequential `replaceAll` operations.
Consequently, a customer description containing text such as `{{STYLE}}`
cannot cause a later replacement pass to reinterpret user content as a control
token.

Input text is trimmed, line endings are normalized, NUL/unsupported control
characters are removed, and the existing 12,000-character schema limit remains
authoritative. The renderer does not HTML-escape or translate creative text.

### Seven-token map

| Token | Source and exact rule |
|---|---|
| `{{GARMENT_COLOR}}` | Trimmed `generationContext.garmentColor`. |
| `{{PLACEMENT}}` | `chest → front chest`, `back → back`, `shoulder_right → right shoulder`, `shoulder_left → left shoulder`. |
| `{{WIDTH}}` | Board-only base width multiplied by normalized `printScale / 100`, rounded to at most one decimal. |
| `{{HEIGHT}}` | Board-only base height multiplied by normalized `printScale / 100`, rounded to at most one decimal. |
| `{{DESIGN_DESCRIPTION}}` | Sanitized customer `prompt`, without creative rewriting. |
| `{{STYLE}}` | First non-empty `generationContext.technique`, then `generationContext.designMethod`, otherwise `modern`, matching the approved rule. |
| `{{TEXT_BLOCK}}` | If `calligraphyText` is non-empty: `Include this exact text in the design: <JSON-quoted text>.` Otherwise: `No text in the design.` |

The board-local base dimensions are:

```text
shoulder_right / shoulder_left  -> 10 × 10 cm
chest/back + small             -> 18 × 18 cm
chest/back + large             -> 30 × 40 cm
```

`printScale` defaults to 100 and is clamped to the already accepted 35–100
range defensively. For example, a large chest placement at 80 produces
24 × 32 cm. These are indicative preview measurements. B1 deliberately does
not import `getDefaultPrintDimensions()` or `buildPlacementTransform()` from
the primary artwork path.

The `prompt` column stores the fully rendered provider prompt—the exact input
that produced the image—for audit and reproduction. The complete original
structured `generationContext` is stored unchanged; the raw description is
preserved inside the rendered `DESIGN_DESCRIPTION` block.

## Provider execution

### Direct resolver call

The board service imports and invokes:

```typescript
resolveWashaDtfProviderConfiguration()
```

It does not call the resolver through `generateIsolatedArtwork`,
`DesignAssetService`, or `washDtfRoutedGenerateMockup`.

The production adapter switches only on the resolved configuration:

- `genai` — use the generic GenAI client with `responseModalities: ["IMAGE"]`
  and `imageConfig: { aspectRatio: "1:1", imageSize: "1K" }`;
- `openai` — use text-to-image generation with one opaque square PNG and no
  edit/reference image;
- `nanobanana` — use the text-only predict call, `sampleCount: 1`, 1:1 PNG;
- `replicate` — request one Flux Schnell 1:1 PNG and use only the first output;
- `unsupported` or uncredentialed — fail without an external request.

No adapter adds “isolated artwork,” transparent-matte, background-removal,
print-production or final-product instructions. The rendered board template is
the authoritative prompt.

### No hidden cross-provider fallback in B1

B1 calls exactly the provider resolved for the operation. It does not silently
chain to a second provider even when the shared configuration's
`fallbackEnabled` flag is true. This preserves truthful provider/model metadata
and makes the required provider-failure behavior deterministic. A future
multi-provider board adapter would need to return attempt metadata and the
actual successful provider; it is not smuggled into B1.

The provider timeout is bounded by `WASHA_BOARD_PROVIDER_TIMEOUT_MS` with a
safe default. A timeout, thrown provider error, unsupported configuration,
missing credential, empty output, malformed data URL, non-image remote URL or
oversized remote response all become `IMAGE_PROVIDER_UNAVAILABLE`. Raw provider
messages are sanitized for server diagnostics and never returned to the client
or persisted in the board row.

### Output normalization

Provider output is normalized to a validated image data URL before storage:

- embedded base64 output is checked for supported image MIME and non-empty
  decoded bytes;
- a provider URL is fetched server-side with timeout, redirect limit, MIME
  validation and a maximum byte count, then converted to a data URL;
- only one image proceeds to storage even if an external response contains
  multiple candidates.

The validated data URL is decoded once to a bounded `Buffer`, and its parsed
MIME type is passed explicitly to the generic image uploader. A data-URL string
is never handed to `uploadOptimizedImage()`, whose image input contract is
binary/blob-based.

This is transport normalization only. It is **not** artwork normalization,
alpha processing, text verification or print validation.

## Storage design

### Bucket

B1 uses the existing public `smart-store` bucket and the dedicated
`board-previews/` prefix. This is the specification's tagged-path option and
avoids adding a bucket migration while the clean-reset debt remains open.

Writes use the service-role client only. No browser upload/update/delete policy
is added. The URL is intentionally a customer-display preview URL, not a print
asset. Because the bucket is public, the object path contains no profile ID,
Clerk ID, customer name, prompt or order metadata; possession of the high-
entropy URL is required to fetch it.

### Path and naming

Before upload, the service already owns the random `boardRequestId`. It passes:

```text
bucket: smart-store
folder: board-previews/YYYY/MM/<boardRequestId>
originalFileName: board-<boardRequestId>.png
profile: mockup
createThumbnail: false
uploadOriginal: false
```

The existing immutable upload helper enforces `upsert: false` internally and
therefore creates an object shaped like:

```text
board-previews/2026/07/<boardRequestId>/
  <epoch>-<objectUuid>-board-<boardRequestId>.webp
```

`board-<boardRequestId>.png` is only the semantic input filename supplied to
the optimizer because provider bytes enter as PNG in the normal case. The
`mockup` optimization profile intentionally encodes the stored preview as
**WebP**, so the public URL and `board_image_url` point to a `.webp` object.
That WebP is the customer-display format, and the B2 interface must render it
directly as an ordinary web image; B1 does not promise or retain a PNG object.
Because the generic optimizer can fall back to original bytes, the service also
verifies `extension`, MIME type and object suffix after upload. Any non-WebP
object is removed immediately and the row becomes `failed` with
`BOARD_STORAGE_UNAVAILABLE`; a successful B1 result is therefore always WebP.

The mockup optimization profile caps display dimensions, emits a web-friendly
preview, and returns both storage path and public URL. The public URL is stored
in `board_image_url`. The path remains available during the operation so a
failed final database update can remove the orphaned object.

## Database persistence

The initial service-role insert is:

```text
id                   = boardRequestId
profile_id           = input.profileId
generation_request_id= input.generationRequestId
prompt               = fully rendered provider prompt
generation_context   = input.generationContext, unchanged
board_image_url       = null
provider              = resolved provider
generation_model     = resolved model
status                = processing
manual_print_status   = pending
```

The success update changes only `board_image_url`, actual `provider`, actual
`generation_model`, and `status = ready`. B0's trigger updates `updated_at`.

On provider or storage failure, the same row is updated to `status = failed`
with a null URL. `manual_print_status` remains `pending`; B3's staff queue must
filter `status = ready` in addition to manual status. No raw exception or
credential is written into `generation_context`.

The service role is the only writer. Owner RLS remains read-only, and deleting
a profile later sets `profile_id` to null without deleting the staff record.

## Failure behavior and quota ownership

| Failure | Row outcome | Result code | Provider/storage side effect |
|---|---|---|---|
| Invalid interface input | No row | `INVALID_BOARD_INPUT` | None |
| Prompt setting missing/invalid/read error | Continue with approved default | — | Normal flow |
| Initial row insert fails | No usable row | `BOARD_PERSISTENCE_FAILED` | Provider is not called |
| Unsupported/missing provider credential | `failed` | `IMAGE_PROVIDER_UNAVAILABLE` | No provider call |
| Provider throws/times out/returns no valid image | `failed` | `IMAGE_PROVIDER_UNAVAILABLE` | No storage call |
| Storage upload fails | `failed` | `BOARD_STORAGE_UNAVAILABLE` | Partial object cleanup is attempted |
| Final `ready` update fails | Best-effort `failed` | `BOARD_PERSISTENCE_FAILED` | Uploaded object is removed by exact path |
| Existing ready request ID | Existing row unchanged | Success with stored URL | No new provider/storage call |
| Existing processing request ID | Existing row unchanged | `BOARD_GENERATION_IN_PROGRESS` | No new provider/storage call |

B1 does not call `shouldChargeQuota`, reserve a generation slot, decrement a
balance, or refund anything. Therefore **B1 never returns quota itself**, even
when provider generation fails. B2 owns the branch and quota transaction; it
will decide whether a reservation existed and release it based on the B1
result. This keeps quota mutations out of the generation module and prevents a
double refund when no charge was taken.

## Observability

B1 emits structured trace events under `dtf.board.generate`, keyed by the
existing `generationRequestId`:

```text
board_request_created
board_provider_started
board_provider_completed | board_provider_failed
board_storage_completed | board_storage_failed
board_request_ready | board_request_failed
```

Events may include board request ID, resolved/actual provider, model, duration,
status code and sanitized error category. They never include the rendered
prompt, customer text, base64 image, service-role configuration or raw provider
error.

## Test plan

### Unit seam

New test: `tests/dtf/board-generation.service.test.ts`.

Tests call only `generateBoard()` and replace the true external/internal
adapters with mocks: prompt setting read, board provider adapter, service-role
Supabase client and generic storage uploader. Observable database operations,
result values and adapter calls are asserted through the module interface.

Required cases:

1. **Successful generation:** one processing insert, exactly one provider call,
   one tagged storage upload, one ready update, full context preserved, rendered
   prompt persisted, URL/ID returned.
2. **All seven replacements:** no known placeholder remains; placement labels,
   large/small/shoulder dimensions and scaled dimensions are exact.
3. **Text block matrix:** exact JSON-quoted calligraphy text versus
   `No text in the design.`.
4. **Template fail-safe and freshness:** absent, invalid, errored and timed-out
   setting reads use the approved template; separate calls perform separate
   reads.
5. **Provider failure:** result is `IMAGE_PROVIDER_UNAVAILABLE`, the existing
   row becomes failed, storage is not called, and no raw error is returned.
6. **Unsupported/uncredentialed provider:** no external provider call and the
   same failed result contract.
7. **Storage failure:** failed row, `BOARD_STORAGE_UNAVAILABLE`, no ready update.
8. **Final persistence failure:** exact uploaded path is removed and the row is
   marked failed best-effort.
9. **Initial persistence failure:** provider and storage call counts stay zero.
10. **Idempotency:** existing ready is replayed; existing processing does not
    produce a second image.
11. **Provider metadata:** stored provider/model are the adapter's actual values,
    never guessed from an invisible fallback.
12. **Quota non-ownership:** no quota/reservation adapter is called or imported.

### Prompt unit tests

`tests/dtf/washa-board-prompt.test.ts` directly tests the pure prompt module's
normalization, one-pass injection resistance, all placement/dimension mappings,
rounding, control-character removal and full default-template identity.

### Isolation contract

`tests/dtf/board-generation-isolation.test.ts` reads the B1 source files and
fails if they import or reference any of:

```text
DesignAssetService
generateIsolatedArtwork
washDtfRoutedGenerateMockup
persistMasterAsset
normalizeGeneratedArtworkForPrint
verifyArtworkTextPolicy
buildPlacementTransform
washa_design_requests
washa_design_master_assets
washa_design_asset_derivatives
Master / Derivative / Checksum operations
```

It also asserts that `resolveWashaDtfProviderConfiguration` is imported by the
board service itself and that the provider mock receives the rendered board
prompt exactly once.

### Verification after approval

1. focused B1 Vitest files during red/green implementation;
2. `npm run test:unit`;
3. `npm run lint`;
4. `npm run build`.

No B1 implementation is accepted with a broken existing test, TypeScript error,
new `any`, `@ts-ignore`, primary-path reference, route change or quota call.

## Isolation proof by construction

The board service and adapter may import only:

- `resolveWashaDtfProviderConfiguration` and its configuration/error types;
- generic low-level provider clients/functions;
- the board prompt module;
- the B0 uncached settings reader;
- the generic service-role Supabase client and generic storage upload helper;
- structured trace/sanitization utilities.

They may not import anything from `src/lib/washa-artwork/`,
`design-asset.service.ts`, revision/compositor/validation modules, or primary
asset table repositories. They create no Master, Derivative, Checksum,
placement transform, transparent image, extracted design or print-production
file. Deleting the B1 files moves this complexity nowhere into the primary path.

## Decisions presented for approval

1. Use the existing public `smart-store` bucket under an isolated, non-PII,
   high-entropy `board-previews/` prefix rather than add a B1 bucket migration.
2. Call the exactly resolved provider once; do not perform an invisible
   cross-provider fallback in B1.
3. Store the fully rendered provider prompt in `washa_board_requests.prompt`
   and the original structured context unchanged in `generation_context`.
4. Create the processing row before provider execution so every provider
   failure has a durable `failed` row.
5. Keep every quota reservation/refund decision in B2; B1 never changes quota.

## Exit plan

To remove B1 before B2:

1. confirm that no route imports `generateBoard`;
2. remove `board-generation.service.ts` and
   `board-image-provider.adapter.ts`;
3. remove `washa-board-prompt.ts`, restore the prompt constant/normalizer to
   their B0 location, and remove `getBoardPromptTemplate()` from the uncached
   reader;
4. remove the B1 unit/prompt/isolation tests and the exported validator type;
5. delete only objects under `smart-store/board-previews/` through the storage
   API if test objects exist; do not touch other `smart-store` assets;
6. keep the B0 table and its rows unless the already-reviewed B0 down procedure
   is intentionally executed.

No primary route, provider pipeline, asset record, print file, quota ledger,
bucket definition or storage policy needs restoration. After approval and
implementation, B1 stops again before B2, merge, deployment and activation.
