---
name: build-plugin
description: Build a Figma plugin from scratch or enhance an existing one. Use this skill when the user is developing a Figma plugin and needs architecture guidance, scaffolding, implementation help, or best-practice validation.
---

@knowledge/plugin-architecture.md
@knowledge/plugin-best-practices.md
@knowledge/figma-api-plugin.md

## Objective

Help the user build or enhance a Figma plugin by assessing their needs, recommending architecture and tooling, implementing the plugin code, and validating it against production best practices. This skill covers the full lifecycle: project scaffolding, manifest configuration, main thread + UI code, IPC event system, data flow pipeline, and build setup.

## Input

The user provides their plugin requirements as `$ARGUMENTS`. This may be:

- A description of what the plugin should do (e.g., "export frames as React components")
- A path to an existing plugin project to enhance
- A specific feature to add to an existing plugin
- A technical question about plugin architecture

If the input is a path, read the project files (manifest, main.ts, ui.tsx, package.json) before proceeding. If the input is a description, proceed directly to Phase 1.

## Process

### Phase 1 — Assess

Determine the scope and constraints of the plugin project.

**New project assessment:**
- What does the plugin do? Classify the target functionality:
  - **Extraction**: reads design data and exports it (HTML, CSS, JSON, tokens)
  - **Generation**: creates or modifies Figma nodes programmatically
  - **Manipulation**: transforms existing nodes (resize, restyle, reorganize)
  - **Utility**: selection helpers, linting, naming conventions, search
  - **Import/Export**: bridges Figma with external systems (CMS, code repos, APIs)
- Plugin type: standard (`editorType: ["figma"]`) or hybrid (standard + codegen)
  - If the user wants a **codegen-only** plugin (runs exclusively in Dev Mode inspect panel), redirect them to `/fca:build-codegen-plugin` instead
- UI requirements: headless (no UI), modal dialog, or full sidebar panel
- Scope: single atomic operation vs multi-step pipeline with progress reporting

**Existing project assessment:**
- Read manifest/package.json to determine current plugin type and capabilities
- Read main thread and UI entry points to understand current architecture
- Identify gaps: missing error handling, performance issues, missing features
- Determine if the request is an enhancement, refactor, or bug fix

Report the assessment to the user before proceeding.

### Phase 2 — Recommend

Based on the assessment, recommend the architecture and tooling.

**Toolchain:**
- **Recommended**: `@create-figma-plugin` — provides TypeScript, Preact UI, build tooling, IPC utilities, and optimized bundling out of the box
- **Alternative**: manual setup with esbuild/webpack — only when the user has specific reasons to avoid the framework

**UI framework:**
- Plugins with UI should use Preact + `@create-figma-plugin/ui` (NOT React — Preact is significantly smaller and is the standard for Figma plugins)
- Headless plugins skip UI entirely (`figma.showUI` not called)

**IPC (Inter-Process Communication):**
- Type-safe event system with centralized event name constants (never string literals scattered through code)
- Request/response correlation for async operations
- Structured error events emitted from main thread to UI
- Use `emit`/`on` from `@create-figma-plugin/utilities` or equivalent typed wrapper

**Data flow pipeline:**
- For extraction plugins: 3-stage pipeline — Extract (Figma API) → Generate (transform data) → Export (assemble output)
- For generation plugins: 2-stage pipeline — Parse (input data) → Create (Figma API calls)
- For utility plugins: single-pass processing
- Each stage should be independently testable with plain data input/output

**Manifest configuration:**
- `editorType: ["figma"]` for standard plugins
- `documentAccess: "dynamic-page"` for plugins that read document data
- Minimum required permissions — most plugins need zero `networkAccess` or `codegenPermissions`
- `relaunchButtons` if the plugin supports re-launch from specific nodes

**Async strategy:**
- All Figma API calls use async variants (`getNodeByIdAsync`, `loadFontAsync`, `exportAsync`)
- Font loading before any text modification with `figma.mixed` handling
- Timeout handling for long operations
- Cancellation support via `figma.on('close')` listener

**Project structure (recommended):**
```
src/
  main.ts              # Main thread entry
  ui.tsx               # UI entry (if applicable)
  types.ts             # Shared types and event names
  extraction/          # Figma API reading (extract stage)
  generation/          # Data transformation (generate stage)
  export/              # Output assembly (export stage)
  utils/               # Shared utilities
```

Present the recommendations to the user and confirm before implementing.

### Phase 3 — Implement

Generate the plugin code based on the agreed recommendations.

**For new projects, scaffold:**

1. **Manifest / package.json `figma-plugin` section:**
   - Plugin name, id (placeholder), `editorType`, `documentAccess`
   - Main and UI entry points
   - Build scripts with `--typecheck` and `--minify`

2. **`src/types.ts`** — Shared type definitions:
   - IPC event name constants as a const object
   - Event payload interfaces for each event
   - Intermediate data structures (e.g., `ExtractedNode` for extraction plugins)

3. **`src/main.ts`** — Main thread entry:
   - IPC event handlers with top-level try/catch per handler
   - Centralized error emission helper
   - Async-first API usage throughout
   - Progress reporting for operations over 100 nodes
   - Cache initialization and cleanup

4. **`src/ui.tsx`** — UI entry (if applicable):
   - Preact functional components
   - IPC event listeners for data and error events
   - Loading states and error display with recovery hints
   - `figma.notify()` integration for quick feedback

5. **Build configuration:**
   - TypeScript with strict mode
   - esbuild or `@create-figma-plugin` build with minification
   - `--typecheck` in build scripts

**For existing projects:**
- Identify specific gaps from the assessment
- Generate targeted modifications — new files, function additions, or refactored code
- Preserve existing patterns and naming conventions
- Add missing error handling, caching, or async patterns as needed

**All generated code includes:**
- Structured error handling with try/catch and error codes
- Async-first API patterns
- JSON-serializable intermediate data structures (never pass SceneNode across IPC)
- Comments explaining non-obvious Figma API behaviors
- Type-safe IPC with centralized event names

### Phase 4 — Validate

Perform a lightweight validation pass on the generated code.

**Quick checks (always run):**
- [ ] All IPC handlers wrapped in try/catch
- [ ] Async APIs used (`getNodeByIdAsync` not `getNodeById`)
- [ ] No SceneNode objects passed across IPC (only serializable data)
- [ ] Manifest `editorType` and `documentAccess` correct
- [ ] Event names centralized as constants
- [ ] Permissions minimized in manifest

**Architecture checks:**
- [ ] Data flow follows staged pipeline pattern (extract → generate → export)
- [ ] Generation/transform logic is separable from Figma API calls (testable)
- [ ] IPC events have typed payloads

**Suggest deep audit:**
If the plugin is substantial (>500 lines or multi-file), suggest running `/fca:audit-plugin` for a comprehensive 9-category audit covering performance, memory, caching, testing, and distribution readiness.

## Output

Generate the appropriate files based on new vs existing project:

### New Project Output

- **`package.json`** or manifest with `figma-plugin` configuration
- **`src/types.ts`** — Event names, payload types, intermediate data structures
- **`src/main.ts`** — Main thread with handlers, error emission, async patterns
- **`src/ui.tsx`** — UI components (if applicable)
- **`tsconfig.json`** — TypeScript configuration
- **Build scripts** — With `--typecheck` and `--minify` flags

### Existing Project Output

- Modified/new files addressing the identified gaps
- Explanation of what changed and why

### Output Checklist

Before returning the plugin code, verify:

- [ ] Plugin type is correct for the use case (standard vs codegen vs hybrid)
- [ ] Manifest `editorType` and `documentAccess` are set correctly
- [ ] IPC event system is type-safe with centralized event name constants
- [ ] All IPC handlers have top-level try/catch with structured error emission
- [ ] Async APIs used throughout (`getNodeByIdAsync`, `loadFontAsync`, `exportAsync`)
- [ ] Permissions are minimized (no unnecessary `networkAccess`)
- [ ] Intermediate data structures are JSON-serializable (no SceneNode references)
- [ ] UI uses Preact (not React) if `@create-figma-plugin` toolchain is used
- [ ] Data flow follows staged pipeline pattern where applicable
- [ ] Build scripts include `--typecheck` and `--minify`
