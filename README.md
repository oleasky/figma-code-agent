# Figma Agent

A Claude Code plugin that provides expert-level Figma development knowledge through 19 knowledge modules and 10 invokable skills.

## What It Does

Figma Agent is a **developer expert tool** that helps you build software integrating with Figma. It encodes production-proven patterns for:

- **Plugin development** — Architecture, IPC, data flow, error handling, performance, caching, async patterns, testing
- **Codegen plugins** — Dev Mode integration, 3-second timeout strategy, preference system, language routing
- **Import pipelines** — REST API fetching, node traversal, platform-specific transformation, asset handling
- **Token synchronization** — Variables API, alias resolution, mode classification, multi-format rendering
- **Design-to-code** — Auto Layout to Flexbox, visual properties, typography, assets, semantic HTML
- **CMS integration** — PayloadCMS block mapping, field factories, container nesting, visual builder

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

### Manual (requires clone)

```bash
# Symlink all skills to ~/.claude/skills/
./install.sh
```

## Skills

After installation, invoke skills directly in Claude Code:

### Tier 1: Developer Workflow

| Skill | What It Does |
|-------|-------------|
| `/fca:build-plugin` | Build a Figma plugin from scratch or enhance an existing one |
| `/fca:build-codegen-plugin` | Build a Dev Mode codegen plugin that generates code from designs |
| `/fca:build-importer` | Build a service that fetches Figma designs into a CMS or React app |
| `/fca:build-token-pipeline` | Build a pipeline that syncs Figma design tokens to code |

### Tier 2: Reference / Validation

| Skill | What It Does |
|-------|-------------|
| `/fca:ref-layout` | Interpret Figma Auto Layout and generate CSS Flexbox |
| `/fca:ref-react` | Generate a React/TSX component from Figma node data |
| `/fca:ref-html` | Generate semantic HTML + CSS from Figma node data |
| `/fca:ref-tokens` | Extract design tokens into CSS variables + Tailwind config |
| `/fca:ref-payload-block` | Map a Figma component to a PayloadCMS block |

### Tier 3: Audit

| Skill | What It Does |
|-------|-------------|
| `/fca:audit-plugin` | Audit a Figma plugin against production best practices |

### Example

```
/fca:build-plugin I want to build a plugin that exports frames as React components
```

Tier 1 skills follow a 4-phase process: **Assess** the project → **Recommend** architecture → **Implement** code → **Validate** against best practices. Tier 2 skills follow a structured step-by-step process for direct code generation from Figma data.

## Knowledge Modules

19 modules organized by domain, usable as standalone `@file` references in any project:

| Domain | Modules | Topics |
|--------|---------|--------|
| Figma API | 5 | REST API, Plugin API, Variables, Webhooks, Dev Mode |
| Design-to-Code | 5 | Layout, Visual, Typography, Assets, Semantic HTML |
| CSS & Tokens | 3 | Three-layer CSS, Token extraction, Variables-to-CSS bridge |
| PayloadCMS | 3 | Block system, Figma-to-block mapping, Visual builder |
| Plugin Dev | 3 | Architecture, Codegen plugins, Best practices |

Reference any module directly in your project:

```
@/path/to/figma-code-agent/knowledge/design-to-code-layout.md
```

## Project Structure

```
figma-code-agent/
  bin/
    install.js               # npx installer (copies files to ~/.claude/)
  .claude-plugin/
    plugin.json              # Claude Code plugin manifest
  skills/
    build-plugin/            # Build a Figma plugin
    build-codegen-plugin/    # Build a codegen plugin
    build-importer/          # Build a Figma importer
    build-token-pipeline/    # Build a token sync pipeline
    ref-layout/              # Reference: Auto Layout -> Flexbox
    ref-react/               # Reference: Figma -> React/TSX
    ref-html/                # Reference: Figma -> HTML + CSS
    ref-tokens/              # Reference: Figma -> CSS variables + Tailwind
    ref-payload-block/       # Reference: Figma -> PayloadCMS block
    audit-plugin/            # Plugin quality audit
  knowledge/                 # 19 standalone knowledge modules
  package.json               # npm package for npx installation
```

## CSS Strategy

Generated CSS follows a three-layer architecture:

1. **Tailwind** — Layout structure (flexbox, spacing, sizing)
2. **CSS Custom Properties** — Design tokens (colors, typography, radii, shadows)
3. **CSS Modules** — Visual skin (component-specific styles)

## License

MIT
