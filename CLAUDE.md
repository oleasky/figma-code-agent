# Figma Agent — Developer Expert Tool

The definitive developer tool for building software that integrates with Figma — plugins, codegen plugins, importers, token pipelines, and design-to-code workflows. Delivered as 19 knowledge modules and 10 invokable Claude Code skills.

## What This Agent Does

This agent is a **developer expert tool** that helps you build software integrating with Figma. It encodes:

- **Plugin development patterns** from a production Figma plugin (architecture, IPC, data flow, best practices)
- **Import/export pipelines** for fetching Figma designs and rendering them in CMS or React apps
- **Token synchronization** patterns for syncing Figma Variables to CSS, Tailwind, and SCSS
- **Design-to-code knowledge** for accurate Auto Layout, visual properties, typography, and asset handling
- **CMS integration patterns** from a PayloadCMS + Next.js project with visual builder
- **Verified API knowledge** from Figma developer documentation (2025/2026)

Use this agent when building Figma plugins, codegen plugins, design importers, token pipelines, or any software that reads from or writes to Figma.

## Knowledge Modules

| Module | Domain | When to @reference |
|--------|--------|--------------------|
| `knowledge/figma-api-rest.md` | Figma API | REST API calls, file/node fetching, image export |
| `knowledge/figma-api-plugin.md` | Figma API | Plugin development, sandbox model, SceneNode types |
| `knowledge/figma-api-variables.md` | Figma API | Variables API, design token resolution, modes |
| `knowledge/figma-api-webhooks.md` | Figma API | Webhook setup, event handling, verification |
| `knowledge/figma-api-devmode.md` | Figma API | Dev Mode, codegen plugins, Dev Resources |
| `knowledge/design-to-code-layout.md` | Design-to-Code | Auto Layout → Flexbox mapping, sizing modes, alignment, spacing, wrap, constraints, responsive |
| `knowledge/design-to-code-visual.md` | Design-to-Code | Fills, strokes, effects, gradients, corners, opacity, blend modes, variable bindings |
| `knowledge/design-to-code-typography.md` | Design-to-Code | Font mapping, text styles, line height, letter spacing, auto-resize, styled segments |
| `knowledge/design-to-code-assets.md` | Design-to-Code | Vector containers, image dedup, SVG export, CSS vs SVG decision tree |
| `knowledge/design-to-code-semantic.md` | Design-to-Code | Semantic HTML, ARIA, BEM naming, layered CSS integration, responsive |
| `knowledge/css-strategy.md` | CSS & Tokens | Three-layer CSS architecture (Tailwind + Custom Properties + CSS Modules), property placement, specificity, responsive, themes |
| `knowledge/design-tokens.md` | CSS & Tokens | Token extraction pipeline, threshold promotion, HSL color naming, spacing scales, CSS/SCSS/Tailwind rendering |
| `knowledge/design-tokens-variables.md` | CSS & Tokens | Figma Variables → token → CSS bridge, mode detection, variable resolution, mode-aware rendering, fallbacks |
| `knowledge/payload-blocks.md` | PayloadCMS | Block system, field types, reusable factories, container nesting, Lexical config, token consumption |
| `knowledge/payload-figma-mapping.md` | PayloadCMS | Figma component → PayloadCMS block mapping, property-to-field rules, token bridge, container nesting |
| `knowledge/payload-visual-builder.md` | PayloadCMS | Visual builder plugin, inline editing, dnd, history, save strategy, CSS architecture |
| `knowledge/plugin-architecture.md` | Plugin Dev | Project setup, IPC event system, data flow pipeline, UI architecture with @create-figma-plugin |
| `knowledge/plugin-codegen.md` | Plugin Dev | Codegen plugins, Dev Mode integration, preferences, responsive code generation |
| `knowledge/plugin-best-practices.md` | Plugin Dev | Error handling, performance, memory, caching, async patterns, testing, distribution |

## Skills

### Tier 1: Developer Workflow (Assess → Recommend → Implement → Validate)

| Command | Description | Knowledge Modules |
|---------|-------------|-------------------|
| `/fca:build-plugin` | Build a Figma plugin from scratch or enhance one | plugin-architecture, plugin-best-practices, figma-api-plugin |
| `/fca:build-codegen-plugin` | Build a Dev Mode codegen plugin | plugin-codegen, figma-api-devmode, plugin-best-practices, figma-api-plugin |
| `/fca:build-importer` | Build a Figma-to-CMS/React importer service | figma-api-rest, figma-api-variables, all design-to-code, css-strategy, design-tokens, payload-figma-mapping, payload-blocks |
| `/fca:build-token-pipeline` | Build a Figma token sync pipeline | figma-api-variables, design-tokens, design-tokens-variables, figma-api-webhooks, css-strategy |

### Tier 2: Reference / Validation

| Command | Description | Knowledge Modules |
|---------|-------------|-------------------|
| `/fca:ref-layout` | Reference: Interpret Auto Layout → CSS Flexbox | layout |
| `/fca:ref-react` | Reference: Generate React/TSX from Figma node | layout, visual, typography, assets, semantic, css-strategy |
| `/fca:ref-html` | Reference: Generate HTML + layered CSS | layout, visual, typography, assets, semantic, css-strategy, design-tokens |
| `/fca:ref-tokens` | Reference: Extract design tokens → CSS vars + Tailwind | design-tokens, design-tokens-variables, figma-api-variables, css-strategy |
| `/fca:ref-payload-block` | Reference: Map Figma component → PayloadCMS block | payload-blocks, payload-figma-mapping, payload-visual-builder, css-strategy |

### Tier 3: Audit

| Command | Description | Knowledge Modules |
|---------|-------------|-------------------|
| `/fca:audit-plugin` | Audit plugin against best practices | plugin-architecture, plugin-codegen, plugin-best-practices, figma-api-plugin |

## Installation

### npx (recommended)

```bash
# Install globally — available in all projects
npx figma-code-agent

# Install to current project only
npx figma-code-agent --local

# Remove installed files
npx figma-code-agent --uninstall
```

### Plugin mode (for development)

```bash
# Load directly when starting Claude Code
claude --plugin-dir /path/to/figma-code-agent
```

### Manual installation (requires clone)

```bash
# Symlink all skills
./install.sh

# Preview what would be installed
./install.sh --dry-run

# Overwrite existing symlinks
./install.sh --force

# Remove all installed skills
./install.sh --uninstall
```

## Usage

### Invoke skills

After installation, invoke skills in Claude Code:

```
# Tier 1: Developer workflow skills
/fca:build-plugin I want to build a plugin that exports frames as React components
/fca:build-codegen-plugin Generate Tailwind + React code in Dev Mode inspect panel
/fca:build-importer Import Figma page designs into PayloadCMS blocks
/fca:build-token-pipeline Sync Figma Variables to CSS and Tailwind on library publish

# Tier 2: Reference/validation skills
/fca:ref-layout <paste Figma Auto Layout JSON>
/fca:ref-react <paste Figma node data or describe component>
/fca:ref-html <paste Figma node data>
/fca:ref-tokens <paste Figma Variables API response>
/fca:ref-payload-block <paste Figma component data>

# Tier 3: Audit
/fca:audit-plugin <path to plugin codebase>
```

### Reference knowledge in other projects

Add to your project's `CLAUDE.md` or use inline @references:

```
@/path/to/figma-code-agent/knowledge/figma-api-rest.md
@/path/to/figma-code-agent/knowledge/design-to-code-layout.md
```

### Reference in project CLAUDE.md

```markdown
## Figma Expertise
This project uses the Figma Agent for design-to-code knowledge.
See: /path/to/figma-code-agent/CLAUDE.md
```

## CSS Strategy

**Layered approach** for generated CSS:

1. **Tailwind CSS** — Structural layout bones (flexbox, spacing, sizing) at zero specificity
2. **CSS Custom Properties** — Design tokens bridge (colors, typography, spacing, radii, shadows)
3. **CSS Modules** — Visual design skin (Figma-specific styles, overridable by frontend devs)

This serves both token extraction and CSS Modules isolation use cases. See `knowledge/css-strategy.md` for full details.

## Source Codebases

Knowledge in this agent is extracted from:

- **Production Figma Plugin** — Extract → interpret → export HTML/CSS. Hard-won patterns for Auto Layout mapping, vector container detection, design token promotion, and semantic HTML generation.
- **PayloadCMS + Next.js Project** — PayloadCMS 3.x with visual builder plugin. Container-first block architecture, CSS Modules + tokens.css design system, Figma importer patterns.
- **Figma Developer Documentation** — REST API, Plugin API, Variables API, Webhooks v2, Dev Mode/Codegen (2025/2026 verified).
