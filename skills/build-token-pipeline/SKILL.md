---
name: build-token-pipeline
description: Build a pipeline that syncs Figma design tokens to code. Use this skill when the user needs automated or on-demand synchronization of Figma Variables into CSS Custom Properties, Tailwind config, SCSS variables, or other token formats.
---

@knowledge/figma-api-variables.md
@knowledge/design-tokens.md
@knowledge/design-tokens-variables.md
@knowledge/figma-api-webhooks.md
@knowledge/css-strategy.md

## Objective

Help the user build a token synchronization pipeline that reads Figma Variables (or extracts tokens from file data) and outputs production-ready CSS Custom Properties, Tailwind config, SCSS variables, or other formats. The skill covers the full pipeline: trigger mechanism (webhook, CLI, CI/CD), API access, variable resolution, alias chain following, mode classification, naming, multi-format rendering, and drift detection.

## Input

The user provides their token pipeline requirements as `$ARGUMENTS`. This may be:

- A description of the desired sync workflow (e.g., "sync Figma Variables to CSS and Tailwind on every library publish")
- A path to an existing token pipeline to enhance
- Specific requirements (output formats, mode handling, naming conventions)
- Questions about Variables API access or Enterprise requirements

If the input is a path, read the project files before proceeding. If the input is a description, proceed directly to Phase 1.

## Process

### Phase 1 — Assess

Determine the pipeline's scope, trigger mechanism, and constraints.

**Sync trigger:**
- **Webhook-driven**: automatic sync on Figma library publish events. Requires a server endpoint to receive `LIBRARY_PUBLISH` webhooks. Best for continuous sync.
- **CLI command**: manual `npm run sync-tokens` or similar. Best for controlled releases.
- **CI/CD job**: runs in GitHub Actions, GitLab CI, etc. Triggered on schedule or manual dispatch. Best for teams that want PR-based token review.
- **Combination**: webhook triggers a CI job, or CLI triggers a CI job

**Output formats (can select multiple):**
- **CSS Custom Properties** — `:root` block with mode-aware overrides. The primary format.
- **Tailwind config** — `theme.extend` referencing CSS variables via `var()`. For Tailwind projects.
- **SCSS variables** — `$variable` declarations referencing CSS Custom Properties. For SCSS projects.
- **JSON** — Flat or nested token structure. For tools like Style Dictionary, Tokens Studio, or custom consumers.
- **TypeScript** — Type-safe token constants. For programmatic token access.

**Variable scope:**
- All collections and variables (full sync)
- Filtered by collection name (e.g., only "Primitives" and "Semantic")
- Filtered by variable scope (e.g., only `ALL_SCOPES` or specific scopes like `FRAME_FILL`, `TEXT_CONTENT`)

**API access:**
- **Variables API** (Enterprise plan required): `GET /v1/files/:key/variables/local` with `file_variables:read` scope. Provides structured variable collections, modes, alias chains, scopes.
- **Fallback** (any plan): file traversal + threshold-based promotion. Reads node properties, detects repeated values, promotes to tokens. Less structured but works without Enterprise.
- Assess which access level the user has and plan accordingly. Both paths should produce equivalent CSS output.

**Mode strategy:**
- How many modes does each collection have?
- What do the modes represent?
  - **Theme modes** (Light/Dark, Brand A/Brand B) → `@media (prefers-color-scheme)` + `[data-theme]` selectors
  - **Breakpoint modes** (Mobile/Tablet/Desktop) → `@media (min-width)` with mobile-first ascending order
  - **Density modes** (Compact/Default/Comfortable) → `[data-density]` attribute selector
- Which mode is the default (base `:root`)?

Report the assessment to the user before proceeding.

### Phase 2 — Recommend

Based on the assessment, recommend the pipeline architecture.

**Mode rendering strategy:**

For **theme modes**:
```css
/* Base (Light mode — default) */
:root { --color-primary: hsl(220, 90%, 56%); }

/* System preference */
@media (prefers-color-scheme: dark) {
  :root { --color-primary: hsl(220, 90%, 65%); }
}

/* Class-based override (progressive enhancement) */
[data-theme="dark"] { --color-primary: hsl(220, 90%, 65%); }
```
- Render BOTH `@media (prefers-color-scheme)` AND `[data-theme]` for each non-default theme mode
- Only emit tokens whose values differ from the base mode in overrides

For **breakpoint modes**:
```css
/* Base (Mobile — smallest, default) */
:root { --spacing-section: 1.5rem; }

@media (min-width: 768px) {
  :root { --spacing-section: 2rem; }
}

@media (min-width: 1024px) {
  :root { --spacing-section: 3rem; }
}
```
- Mobile-first: smallest breakpoint is base, larger breakpoints add overrides
- Ascending `min-width` order
- Only emit changed tokens in each breakpoint

**Naming convention:**
- Preserve Figma variable path as the name basis: `color/primary/500` → `--color-primary-500`
- Slash-separated paths become hyphen-separated CSS property names
- Category prefixes maintained: `--color-*`, `--spacing-*`, `--font-*`, `--radius-*`, `--shadow-*`
- For file traversal fallback: use HSL classification for colors, base-unit detection for spacing (see `knowledge/design-tokens.md`)

**Alias chain resolution:**
- Variables can alias other variables (`VariableAlias` type)
- Chains can be multi-level: `semantic/primary` → `brand/blue-500` → `primitive/blue-500`
- Resolve to terminal value for each mode
- In CSS output, decide whether to preserve alias relationships as `var()` references or flatten to resolved values:
  - **Preserve aliases** (recommended): `--color-primary: var(--color-blue-500);` — maintains semantic relationships, enables override
  - **Flatten**: `--color-primary: hsl(220, 90%, 56%);` — simpler but loses relationship

**Drift detection:**
- Compare code tokens (parsed from existing CSS/JSON) against Figma source
- Report: added tokens (in Figma but not code), removed tokens (in code but not Figma), changed values
- Output as a structured diff report or GitHub PR comment

**Webhook setup** (if webhook trigger):
- Listen for `LIBRARY_PUBLISH` event type
- Verify passcode from webhook payload (`passcode` field must match configured secret)
- Debounce: if multiple publishes arrive within 30 seconds, process only the latest
- Retry handling: Figma retries failed webhook deliveries, so handlers must be idempotent

**Fallback strategy** (when Variables API unavailable):
- Traverse file nodes via REST API
- Collect repeated values across 5 domains (colors, spacing, typography, effects, breakpoints)
- Promote values used 2+ times to tokens (threshold-based promotion)
- Apply HSL color classification and spacing base-unit detection for naming
- Document the difference in output quality between Variables API and fallback paths

Present the recommendations and confirm before implementing.

### Phase 3 — Implement

Generate the token pipeline code.

**1. Sync script (main entry point):**

```typescript
// scripts/sync-tokens.ts (or src/tokens/sync.ts)
async function syncTokens(options: SyncOptions): Promise<SyncResult> {
  // 1. Fetch variables from Figma (or fallback to file traversal)
  // 2. Classify collection modes (theme vs breakpoint)
  // 3. Resolve alias chains to terminal values
  // 4. Assign semantic names (preserve Figma paths or apply HSL/scale naming)
  // 5. Render to output formats (CSS, Tailwind, SCSS, JSON)
  // 6. Run drift detection against existing token files
  // 7. Write output files
  // 8. Return sync report (added/changed/removed tokens)
}
```

**2. Variable resolution module:**

```typescript
// src/tokens/resolver.ts
function resolveVariables(
  variables: Variable[],
  collections: VariableCollection[]
): ResolvedTokenMap {
  // For each variable:
  //   - Classify the parent collection's modes
  //   - For each mode:
  //     - Follow alias chains to terminal value
  //     - Convert COLOR values to HSL
  //     - Convert FLOAT values to rem (divide by 16)
  //   - Determine which modes differ from the default
}
```

- Follow alias chains: if value is `{ type: 'VARIABLE_ALIAS', id: '...' }`, look up the referenced variable and recurse
- Handle circular alias detection (guard against infinite loops)
- Classify modes using name heuristics from `knowledge/design-tokens-variables.md`

**3. Output renderers:**

**CSS renderer:**
```typescript
// src/tokens/renderers/css.ts
function renderCSS(tokens: ResolvedTokenMap): string {
  // :root block with default mode values
  // Theme mode overrides: @media (prefers-color-scheme) + [data-theme]
  // Breakpoint mode overrides: @media (min-width) ascending
  // Only tokens that differ from base mode in overrides
  // HSL format for colors, rem for spacing/typography
  // Comments with original Figma variable paths
}
```

**Tailwind renderer:**
```typescript
// src/tokens/renderers/tailwind.ts
function renderTailwind(tokens: ResolvedTokenMap): string {
  // theme.extend configuration
  // All values reference var() — never hardcoded
  // Colors → theme.extend.colors
  // Spacing → theme.extend.spacing
  // Typography → theme.extend.fontFamily, fontSize
  // Effects → theme.extend.borderRadius, boxShadow
}
```

**SCSS renderer:**
```typescript
// src/tokens/renderers/scss.ts
function renderSCSS(tokens: ResolvedTokenMap): string {
  // $variable declarations referencing var() CSS Custom Properties
  // Organized by category with section comments
}
```

**JSON renderer:**
```typescript
// src/tokens/renderers/json.ts
function renderJSON(tokens: ResolvedTokenMap): object {
  // Nested structure preserving collection/group hierarchy
  // Each token: { value, type, description, modes }
  // Compatible with Style Dictionary or Tokens Studio input
}
```

**4. Webhook handler (if webhook trigger):**

```typescript
// src/api/webhook.ts (or pages/api/figma-webhook.ts)
export async function handleWebhook(request: Request): Promise<Response> {
  // 1. Verify passcode matches configured secret
  // 2. Check event_type === 'LIBRARY_PUBLISH'
  // 3. Debounce (skip if another sync started within 30 seconds)
  // 4. Extract file_key from payload
  // 5. Call syncTokens({ fileKey, ... })
  // 6. Return 200 (Figma expects quick response)
}
```

- Passcode verification: compare `request.body.passcode` against environment variable
- Idempotent: safe to process the same event multiple times
- Quick response: return 200 immediately, process sync asynchronously if needed

**5. Drift detection module:**

```typescript
// src/tokens/drift.ts
function detectDrift(
  currentTokens: ResolvedTokenMap,
  existingFile: string
): DriftReport {
  // Parse existing token file (CSS, JSON, or SCSS)
  // Compare against current Figma tokens
  // Categorize differences: added, removed, changed (with old + new values)
  // Return structured report
}
```

**6. CI/CD integration (if CI/CD trigger):**

```yaml
# .github/workflows/sync-tokens.yml
name: Sync Design Tokens
on:
  workflow_dispatch:
  schedule:
    - cron: '0 9 * * 1'  # Weekly Monday 9am

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run sync-tokens
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          FIGMA_FILE_KEY: ${{ vars.FIGMA_FILE_KEY }}
      - uses: peter-evans/create-pull-request@v6
        with:
          title: 'Update design tokens from Figma'
          body: 'Automated token sync from Figma Variables'
          branch: tokens/auto-sync
```

### Phase 4 — Validate

Verify the token pipeline produces correct output.

**Variable resolution:**
- [ ] Alias chains fully resolved to terminal values (no unresolved aliases)
- [ ] Circular alias detection prevents infinite loops
- [ ] All modes for each collection are processed
- [ ] Mode classification correct (theme vs breakpoint vs unknown)
- [ ] Default mode identified correctly (Light for themes, Mobile for breakpoints)

**CSS output:**
- [ ] Theme overrides use BOTH `@media (prefers-color-scheme)` AND `[data-theme]` selectors
- [ ] Breakpoint overrides use `@media (min-width)` in ascending mobile-first order
- [ ] Only tokens with differing values appear in mode overrides
- [ ] Colors in HSL format
- [ ] Spacing and font sizes in rem units (with px comments)
- [ ] Comments show original Figma variable paths

**Tailwind output:**
- [ ] All values reference `var()` — no hardcoded values
- [ ] Token categories map to correct Tailwind theme keys
- [ ] Config is a valid `theme.extend` snippet (not a full config replacement)

**Pipeline integrity:**
- [ ] Auth scope includes `file_variables:read` (for Variables API path)
- [ ] Fallback path works when Variables API returns 403 (non-Enterprise)
- [ ] Webhook passcode verification implemented (if webhook trigger)
- [ ] Drift detection correctly identifies added/removed/changed tokens
- [ ] Output files are deterministic (same input produces same output)

## Output

Generate the token pipeline files:

### Core Files

- **`scripts/sync-tokens.ts`** (or `src/tokens/sync.ts`) — Main sync entry point
- **`src/tokens/resolver.ts`** — Variable resolution with alias chain following
- **`src/tokens/classifier.ts`** — Mode classification (theme vs breakpoint)
- **`src/tokens/types.ts`** — Token types, resolved token map, sync options

### Renderer Files

- **`src/tokens/renderers/css.ts`** — CSS Custom Properties with mode overrides
- **`src/tokens/renderers/tailwind.ts`** — Tailwind theme.extend config
- **`src/tokens/renderers/scss.ts`** — SCSS variables (if requested)
- **`src/tokens/renderers/json.ts`** — JSON token structure (if requested)

### Trigger Files (based on selected trigger)

- **`src/api/webhook.ts`** — Webhook handler (if webhook trigger)
- **`.github/workflows/sync-tokens.yml`** — GitHub Actions workflow (if CI/CD trigger)
- **`scripts/sync-tokens.ts`** — CLI script with argument parsing (if CLI trigger)

### Supporting Files

- **`src/tokens/drift.ts`** — Drift detection module
- **Generated `tokens.css`** — Example output showing expected format

### Output Checklist

Before returning the pipeline code, verify:

- [ ] Correct auth scope for Variables API (`file_variables:read`)
- [ ] Alias chains fully resolved with circular reference protection
- [ ] Modes classified correctly (theme vs breakpoint)
- [ ] HSL format for colors, rem units for spacing
- [ ] Theme overrides render both `@media (prefers-color-scheme)` and `[data-theme]`
- [ ] Breakpoint overrides render mobile-first ascending `@media (min-width)`
- [ ] Tailwind config uses `var()` references (no hardcoded values)
- [ ] Webhook handler verifies passcode (if webhook trigger)
- [ ] Fallback path documented and functional for non-Enterprise users
- [ ] Drift detection identifies added/removed/changed tokens
- [ ] Pipeline output is deterministic (same input → same output)
