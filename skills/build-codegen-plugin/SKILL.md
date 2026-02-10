---
name: build-codegen-plugin
description: Build a Figma Dev Mode codegen plugin that generates code from designs. Use this skill when the user wants to build a plugin that runs in Figma's Dev Mode inspect panel and generates code from selected nodes.
---

@knowledge/plugin-codegen.md
@knowledge/figma-api-devmode.md
@knowledge/plugin-best-practices.md
@knowledge/figma-api-plugin.md

## Objective

Help the user build a Figma codegen plugin that runs in Dev Mode's inspect panel and generates code from selected design nodes. Codegen plugins have unique constraints — a strict 3-second timeout, no network calls during generation, a built-in preferences system, and a specific `CodegenResult[]` return format. This skill handles all of these constraints and produces a working codegen plugin with language routing, pre-caching, and timeout-safe generation.

## Input

The user provides their codegen requirements as `$ARGUMENTS`. This may be:

- Target language(s) to generate (React/TSX, Vue, HTML+CSS, Tailwind, Swift, Kotlin, custom DSL)
- A path to an existing codegen plugin to enhance
- A description of the code generation approach (property extraction vs full component generation)
- A specific codegen feature to add

If the input is a path, read the project files before proceeding. If the input is a description, proceed directly to Phase 1.

## Process

### Phase 1 — Assess

Determine the codegen plugin's scope and constraints.

**Language targets:**
- Which languages/frameworks should the plugin generate code for?
- Each language becomes an entry in the manifest's `codegenLanguages` array
- Each language gets a dedicated generator module

**Complexity level:**
- **Property extraction**: reads node properties and outputs simple declarations (e.g., CSS properties, style tokens)
- **Component generation**: produces full component code with structure, styles, and props (more complex, higher timeout risk)

**Plugin type:**
- **Codegen-only** (`editorType: ["dev"]`): runs exclusively in Dev Mode inspect panel. No standard plugin UI.
- **Hybrid** (`editorType: ["figma", "dev"]`): has both a standard plugin UI (for configuration, export) AND a codegen panel in Dev Mode. Use hybrid when the plugin needs operations beyond code inspection (e.g., batch export, settings UI, node manipulation).

**Preferences needed:**
- Unit system: px vs rem vs em
- CSS strategy: Tailwind utilities vs CSS Modules vs inline styles vs vanilla CSS
- Naming convention: camelCase vs kebab-case vs BEM
- Component style: functional vs class-based
- Other framework-specific options

Report the assessment to the user before proceeding.

### Phase 2 — Recommend

Based on the assessment, recommend the architecture.

**Manifest configuration:**
```json
{
  "editorType": ["dev"],
  "capabilities": ["codegen"],
  "codegenLanguages": [
    { "label": "React/TSX", "value": "react-tsx" },
    { "label": "HTML + CSS", "value": "html-css" }
  ]
}
```
- `editorType: ["dev"]` for codegen-only; `["figma", "dev"]` for hybrid
- `capabilities: ["codegen"]` is required
- Each language in `codegenLanguages` appears as a tab in the inspect panel

**3-second timeout strategy:**
- The `generate` callback has a hard 3-second timeout — if exceeded, Figma kills the operation
- **Pre-cache during `preferenceschange`**: load variables, resolve component references, build lookup tables. This event fires when the user opens the plugin or changes preferences — no timeout pressure.
- **Keep `generate` lightweight**: only read the selected node's immediate properties, look up pre-cached data, assemble code string. No `getNodeByIdAsync`, no `exportAsync`, no network calls.
- **Progressive complexity**: handle simple nodes quickly (single properties), only do heavier processing for complex component nodes if time budget allows

**Preference system:**
- Use Figma's built-in codegen preferences panel (NOT a custom iframe UI)
- Preferences are defined in the manifest or via `figma.codegen.on('preferenceschange')`
- Preference values are available in both the `generate` and `preferenceschange` callbacks via `event.preferences`

**Language routing:**
- The `generate` callback receives `event.language` indicating which language tab the user selected
- Route to dedicated generator modules: `generateReact(node)`, `generateHTML(node)`, etc.
- Each generator module is a pure function: node data in → `CodegenResult[]` out

**Dev Resources linking (optional):**
- Link generated code to external resources (GitHub files, Storybook URLs, documentation)
- Use `figma.codegen.on('resultchange')` to update Dev Resources when code changes
- Dev Resources appear in the inspect panel alongside generated code

**Hybrid architecture (if applicable):**
- Standard UI (`src/ui.tsx`) handles configuration, batch operations, settings
- Codegen (`src/codegen.ts`) handles per-node code generation in Dev Mode
- Shared modules for generation logic used by both
- Separate entry points in manifest: `main` for standard, `codegen` for Dev Mode

Present the recommendations to the user and confirm before implementing.

### Phase 3 — Implement

Generate the codegen plugin code.

**1. Manifest / `package.json` `figma-plugin` section:**
```json
{
  "name": "Plugin Name",
  "id": "REPLACE_WITH_PLUGIN_ID",
  "editorType": ["dev"],
  "capabilities": ["codegen"],
  "codegenLanguages": [
    { "label": "React/TSX", "value": "react-tsx" }
  ],
  "codegenPreferences": [
    {
      "itemType": "select",
      "propertyName": "unitSystem",
      "label": "Unit System",
      "options": [
        { "label": "rem", "value": "rem", "isDefault": true },
        { "label": "px", "value": "px" }
      ]
    }
  ]
}
```

**2. Main entry point (`src/main.ts`):**

```typescript
// Pre-cached data populated during preferenceschange
let variableCache: Map<string, ResolvedVariable> = new Map();
let componentCache: Map<string, string> = new Map();

figma.codegen.on('preferenceschange', async (event) => {
  // Heavy work happens here — no timeout pressure
  try {
    // Load and cache all local variables
    const variables = await figma.variables.getLocalVariablesAsync();
    variableCache.clear();
    for (const variable of variables) {
      variableCache.set(variable.id, resolveVariable(variable));
    }

    // Cache component names for instance detection
    // ... additional pre-caching
  } catch (error) {
    console.error('[Codegen] Pre-cache failed:', error);
  }
});

figma.codegen.on('generate', (event) => {
  // Lightweight — must complete within 3 seconds
  // No async operations, no network calls
  try {
    const { node, language } = event;

    switch (language) {
      case 'react-tsx':
        return generateReact(node, event.preferences, variableCache);
      case 'html-css':
        return generateHTML(node, event.preferences, variableCache);
      default:
        return [{ title: 'Error', code: `Unknown language: ${language}`, language: 'PLAINTEXT' }];
    }
  } catch (error) {
    return [{ title: 'Error', code: String(error), language: 'PLAINTEXT' }];
  }
});
```

**3. Language-specific generator modules:**

Each generator is a pure function:
```typescript
// src/generators/react.ts
export function generateReact(
  node: SceneNode,
  preferences: Record<string, string>,
  variables: Map<string, ResolvedVariable>
): CodegenResult[] {
  // Read node properties (synchronous — no async API calls)
  // Look up pre-cached variable bindings
  // Assemble React/TSX code string
  // Return CodegenResult array

  return [
    {
      title: 'Component.tsx',
      code: componentCode,
      language: 'TYPESCRIPT',
    },
    {
      title: 'Component.module.css',
      code: cssCode,
      language: 'CSS',
    },
  ];
}
```

**4. Preference handling:**
- Read preferences from `event.preferences` in both callbacks
- Apply preference values to generation (unit conversion, naming convention, CSS strategy)
- Provide sensible defaults for all preferences

**5. Code quality patterns:**
- Try/catch in both `generate` and `preferenceschange` callbacks
- Graceful fallback: if generation fails for a node, return a helpful error message as a `CodegenResult` (not an exception)
- Code validation: verify generated code has balanced brackets, valid syntax structure
- Progressive detail: simple nodes get simple output, complex nodes get full component generation

### Phase 4 — Validate

Verify the codegen plugin meets Figma's constraints.

**Timeout compliance:**
- [ ] No `async` keyword or `await` in the `generate` callback
- [ ] No `getNodeByIdAsync`, `loadFontAsync`, `exportAsync` in `generate`
- [ ] No `fetch()` or network calls in `generate`
- [ ] Heavy data loading happens in `preferenceschange` (pre-caching)
- [ ] Node property reads in `generate` are synchronous and direct

**Manifest correctness:**
- [ ] `editorType` includes `"dev"`
- [ ] `capabilities` includes `"codegen"`
- [ ] `codegenLanguages` array is populated with at least one language
- [ ] Each language has `label` (display name) and `value` (event identifier)
- [ ] Preferences use valid `itemType` values (`select`, `input`, `separator`)

**Output format:**
- [ ] `generate` returns `CodegenResult[]` (array, not single object)
- [ ] Each result has `title` (string), `code` (string), `language` (Figma language constant)
- [ ] Language constants are valid: `CSS`, `HTML`, `JAVASCRIPT`, `TYPESCRIPT`, `JSON`, `PLAINTEXT`, etc.

**Pre-caching:**
- [ ] Variable resolution cached during `preferenceschange`
- [ ] Component name lookups cached
- [ ] Caches are refreshed on preference changes (not stale between sessions)

**Error handling:**
- [ ] Both `generate` and `preferenceschange` have try/catch
- [ ] Generation errors produce a readable error CodegenResult (not a crash)
- [ ] Pre-cache failures are logged but don't prevent generation from working with partial data

## Output

Generate the appropriate files:

### Codegen-Only Plugin Output

- **`package.json`** — with `figma-plugin` section including codegen config
- **`src/main.ts`** — Entry point with `preferenceschange` (pre-caching) and `generate` (routing) handlers
- **`src/generators/{language}.ts`** — One generator module per target language
- **`src/types.ts`** — Shared types, resolved variable interfaces, preference types
- **`tsconfig.json`** — TypeScript configuration

### Hybrid Plugin Output (if applicable)

All of the above, plus:
- **`src/ui.tsx`** — Standard plugin UI for configuration/batch operations
- Separate entry points in manifest for standard and codegen modes

### Output Checklist

Before returning the codegen plugin code, verify:

- [ ] Manifest has `capabilities: ["codegen"]` and correct `editorType`
- [ ] `codegenLanguages` array populated with all target languages
- [ ] 3-second timeout budget respected — `generate` callback is synchronous and lightweight
- [ ] No network calls, no async API calls inside `generate`
- [ ] Heavy data loading pre-cached in `preferenceschange` handler
- [ ] `CodegenResult[]` format correct with valid language constants
- [ ] Preferences use Figma's built-in preference system (not custom UI)
- [ ] Language routing dispatches to dedicated generator modules
- [ ] Error handling produces readable error results (not crashes)
- [ ] Pre-cached data is refreshed on preference changes
