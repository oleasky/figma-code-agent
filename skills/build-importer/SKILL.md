---
name: build-importer
description: Build a service that fetches Figma designs and renders them in a CMS or React application. Use this skill when the user needs an API route or service that reads Figma data via the REST API and transforms it into components or blocks for a target platform.
---

@knowledge/figma-api-rest.md
@knowledge/figma-api-variables.md
@knowledge/design-to-code-layout.md
@knowledge/design-to-code-visual.md
@knowledge/design-to-code-typography.md
@knowledge/design-to-code-assets.md
@knowledge/design-to-code-semantic.md
@knowledge/css-strategy.md
@knowledge/design-tokens.md
@knowledge/payload-figma-mapping.md
@knowledge/payload-blocks.md

## Objective

Help the user build a service or API route that fetches Figma designs via the REST API and transforms them into components or blocks for a target platform (PayloadCMS, WordPress, custom React app, or other). The skill covers the full import pipeline: authentication, API endpoint selection, node traversal, property extraction, platform-specific transformation, asset handling, and token extraction.

## Input

The user provides their importer requirements as `$ARGUMENTS`. This may be:

- A description of what they want to import (e.g., "import Figma page designs into PayloadCMS blocks")
- A path to an existing importer to enhance
- Target platform details and specific transformation needs
- A Figma file URL to build an importer for

If the input is a path, read the project files before proceeding. If the input is a description, proceed directly to Phase 1.

## Process

### Phase 1 — Assess

Determine the importer's scope, target platform, and constraints.

**Target platform:**
- **PayloadCMS** — Deep knowledge available. Container-first block architecture, 18-type block catalog, field factories, confidence scoring. Consult `knowledge/payload-figma-mapping.md` and `knowledge/payload-blocks.md`.
- **WordPress** — Map to Gutenberg blocks. Less prescriptive — assess the user's theme/plugin structure.
- **Custom React app** — Map to React component props. User defines the component library.
- **Other** — Assess the target's data model and map accordingly.

**Authentication:**
- **Personal Access Token (PAT)** — Simple, single-user. Token passed as `X-Figma-Token` header. Suitable for internal tools, CLI commands, CI/CD jobs.
- **OAuth2** — Multi-user, requires app registration. Use when building a SaaS product or multi-tenant tool. Requires token refresh handling.
- Required scopes: `file_content` (read files), `file_variables:read` (Variables API, Enterprise only)

**Import scope:**
- **Full page import**: traverse entire page, map all top-level frames to blocks/components
- **Single component import**: fetch a specific node by ID, map to one block/component
- **Selective import**: user picks which frames/components to import
- **One-time vs automated sync**: manual trigger vs webhook-driven continuous sync

**Asset handling:**
- **Download locally**: fetch image exports via `/images/:key` endpoint, store in project's media directory or CMS media library
- **Proxy from Figma CDN**: use Figma's image URLs directly (temporary — URLs expire after 14 days)
- **Hybrid**: download and store, with Figma CDN as fallback during import

Report the assessment to the user before proceeding.

### Phase 2 — Recommend

Based on the assessment, recommend the import pipeline architecture.

**API endpoints to use:**

| Endpoint | Purpose | When to Use |
|----------|---------|-------------|
| `GET /v1/files/:key` | Full file metadata | Initial file structure discovery |
| `GET /v1/files/:key/nodes?ids=X,Y` | Targeted node fetch | Importing specific frames (preferred for performance) |
| `GET /v1/images/:key?ids=X&scale=2&format=png` | Image export | Asset extraction at 2x for retina |
| `GET /v1/files/:key/variables/local` | Variables API | Design token extraction (Enterprise only) |
| `GET /v1/files/:key/styles` | Published styles | Token extraction fallback for non-Enterprise |

- **Always prefer `/files/:key/nodes`** over `/files/:key` for targeted imports — fetching the full file is expensive and often unnecessary
- **Export images at 2x scale** minimum for retina displays
- **Use `format=png` for raster, `format=svg` for vectors** in image export

**Node traversal strategy:**
- Recursive depth-first traversal with a **depth limit of 30** to prevent stack overflow on deeply nested designs
- Filter out invisible nodes (`visible: false`) early — skip their entire subtree
- Skip `SLICE` nodes (selection helpers, not visual content)
- Track traversal depth and warn if approaching the limit

**Transform pipeline — 4 independent stages:**

```
Fetch → Extract → Transform → Render
```

1. **Fetch**: API client calls Figma REST API, handles auth, rate limits, retries
2. **Extract**: Node walker traverses the response, builds an intermediate data structure with all relevant properties extracted per the design-to-code knowledge modules
3. **Transform**: Platform-specific mapper converts intermediate data to target format (PayloadCMS blocks, React props, WordPress blocks)
4. **Render**: Assembles final output (JSON for CMS import, component files for React, CSS for tokens)

Each stage is independently testable — Fetch returns raw API data, Extract returns a serializable intermediate, Transform returns platform-specific data, Render returns files/strings.

**CMS field mapping (platform-specific):**

For **PayloadCMS**:
- Use confidence scoring from `knowledge/payload-figma-mapping.md` to match Figma components to the 18-type block catalog
- Map component properties to fields using the property-to-field table
- Container nesting limited to 2 levels
- Use field factories (`imageFields`, `linkGroup`, `layoutMeta`)

For **WordPress**:
- Map to Gutenberg block format (`<!-- wp:block-name {"attr":"value"} --><html><!-- /wp:block-name -->`)
- Map Figma properties to block attributes
- Handle inner blocks for nested content

For **Custom React**:
- Map to component props based on user-defined component library
- Generate TypeScript interfaces for prop types
- Map Figma variants to component prop enums

**Token bridging:**
- Extract design tokens during import (colors, spacing, typography, effects)
- Generate CSS Custom Properties following the three-layer architecture
- Link imported components/blocks to token references (`var(--token-name)`) rather than hardcoded values
- If Variables API is available (Enterprise), extract structured tokens; otherwise use threshold-based promotion from file traversal

**Error handling:**
- Rate limit compliance: respect `429` responses with `Retry-After` header, implement exponential backoff
- Partial success: if some nodes fail to import, continue with remaining nodes and report failures
- Structured error reporting: collect all warnings/errors during import and return a summary

Present the recommendations and confirm before implementing.

### Phase 3 — Implement

Generate the importer code based on the agreed recommendations.

**1. API client module:**

```typescript
// src/figma/client.ts
class FigmaClient {
  constructor(private token: string) {}

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FileNodesResponse> {
    // GET /v1/files/:key/nodes?ids=...
    // Handles auth headers, rate limiting, retries
  }

  async getImages(fileKey: string, nodeIds: string[], options?: ImageOptions): Promise<ImageResponse> {
    // GET /v1/images/:key?ids=...&scale=2&format=png
    // Returns map of node ID -> image URL
  }

  async getVariables(fileKey: string): Promise<VariablesResponse> {
    // GET /v1/files/:key/variables/local
    // Enterprise only — caller should handle 403
  }
}
```

- Type-safe request/response interfaces matching the Figma REST API
- Automatic retry with exponential backoff on 429 (rate limit) and 5xx responses
- Request timeout handling
- Auth via `X-Figma-Token` header (PAT) or `Authorization: Bearer` (OAuth2)

**2. Extraction module:**

```typescript
// src/figma/extractor.ts
interface ExtractedNode {
  id: string;
  name: string;
  type: string;
  layout: LayoutProperties;     // From design-to-code-layout
  visual: VisualProperties;     // From design-to-code-visual
  typography?: TypographyProperties; // From design-to-code-typography
  assets: AssetReference[];     // From design-to-code-assets
  children: ExtractedNode[];
  boundVariables: VariableBinding[];
}

function extractNode(node: FigmaNode, depth: number, maxDepth: number): ExtractedNode {
  // Recursive DFS with depth limit
  // Filter invisible nodes
  // Extract properties per design-to-code knowledge modules
}
```

- Recursive node walker with configurable depth limit (default: 30)
- Property extraction following all 5 design-to-code knowledge modules:
  - **Layout**: `layoutMode`, sizing modes, gap, padding, wrap, constraints, absolute positioning
  - **Visual**: fills, strokes (INSIDE → box-shadow), effects, corners, opacity, gradients
  - **Typography**: font mapping, line height (unitless ratio), letter spacing, styled segments
  - **Assets**: vector container detection, image hash deduplication, export format decision
  - **Semantic**: layer name → HTML element heuristics, ARIA requirements
- All output is JSON-serializable (no Figma API object references)

**3. Transform module (platform-specific):**

For PayloadCMS:
```typescript
// src/transforms/payload.ts
function transformToPayloadBlock(node: ExtractedNode): PayloadBlockData {
  // Apply confidence scoring to determine block type
  // Map properties to PayloadCMS fields
  // Handle container nesting (max 2 levels)
  // Generate field configuration
}
```

For custom React:
```typescript
// src/transforms/react.ts
function transformToComponentProps(node: ExtractedNode): ComponentData {
  // Map node properties to component props
  // Generate TypeScript interface
  // Map variants to prop enums
}
```

**4. API route / service entry point:**

```typescript
// src/api/import.ts (or pages/api/import.ts for Next.js)
export async function importFromFigma(request: ImportRequest): Promise<ImportResult> {
  // 1. Parse Figma URL to extract file key and node IDs
  // 2. Fetch nodes via FigmaClient
  // 3. Extract properties via extractor
  // 4. Transform to target platform format
  // 5. Download and store assets (images at 2x)
  // 6. Extract design tokens
  // 7. Return structured result with success/failure per node
}
```

**5. Token extraction during import:**

```typescript
// src/figma/tokens.ts
function extractTokens(nodes: ExtractedNode[], variables?: VariablesResponse): TokenOutput {
  // If Variables API data available: structured token extraction
  // Otherwise: threshold-based promotion from node property values
  // Generate CSS Custom Properties following three-layer architecture
  // Generate Tailwind config extension snippet
}
```

**6. CSS output:**
- Token definitions in CSS Custom Properties (`:root` block)
- Three-layer architecture: Tailwind for layout, tokens for design values, component CSS for visual skin
- Mode-aware overrides if variable modes are detected

### Phase 4 — Validate

Verify the importer meets quality standards.

**API correctness:**
- [ ] Correct REST API endpoints used (`/files/:key/nodes` not `/files/:key` for targeted fetch)
- [ ] Auth header format correct (`X-Figma-Token` for PAT, `Authorization: Bearer` for OAuth2)
- [ ] Rate limit handling with exponential backoff on 429 responses
- [ ] Image exports at 2x scale minimum

**Traversal safety:**
- [ ] Depth limit enforced on recursive traversal (default: 30)
- [ ] Invisible nodes filtered out early
- [ ] `SLICE` nodes skipped
- [ ] Traversal produces JSON-serializable intermediate data

**Data integrity:**
- [ ] All intermediate data structures are JSON-serializable
- [ ] Image hashes deduplicated (same `imageHash` → one export)
- [ ] Variable bindings preserved in extracted data
- [ ] Partial success handling: individual node failures don't abort the entire import

**Platform-specific validation:**

For PayloadCMS:
- [ ] Container nesting does not exceed 2 levels
- [ ] Block type confidence scores reported
- [ ] Field factories used for reusable patterns
- [ ] Settings fields use Tailwind utility class strings

For all platforms:
- [ ] CSS follows three-layer architecture
- [ ] Token values use `var()` references (no hardcoded colors/spacing in component CSS)
- [ ] Pipeline stages are independently testable

## Output

Generate the importer module files:

### Core Files

- **`src/figma/client.ts`** — API client with auth, retry, rate limit handling
- **`src/figma/extractor.ts`** — Node walker with depth-limited extraction
- **`src/figma/tokens.ts`** — Token extraction and CSS generation
- **`src/figma/types.ts`** — Figma API response types, intermediate data structures

### Platform-Specific Files

- **`src/transforms/{platform}.ts`** — Platform-specific mapper (PayloadCMS, React, WordPress)
- **`src/api/import.ts`** — API route or service entry point

### Supporting Files

- **`tokens.css`** — Extracted design tokens as CSS Custom Properties
- **`tailwind.config.ts`** — Token-referencing Tailwind extension (if applicable)

### Output Checklist

Before returning the importer code, verify:

- [ ] Auth correctly configured (PAT or OAuth2 with proper headers)
- [ ] Node traversal is depth-limited (default: 30)
- [ ] All intermediate data is JSON-serializable
- [ ] Images exported at 2x for retina displays
- [ ] Rate limits respected with retry logic
- [ ] Pipeline stages are independently testable (Fetch → Extract → Transform → Render)
- [ ] CSS uses token variable references (three-layer architecture)
- [ ] Partial success handling: failures collected and reported, not thrown
- [ ] PayloadCMS: container nesting ≤ 2 levels, field factories used
- [ ] Token extraction works with both Variables API and file traversal fallback
