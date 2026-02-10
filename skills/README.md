# Figma Agent Skills

Claude Code invokable skills for Figma development workflows.

## Plugin Format

This agent uses the Claude Code plugin format (`.claude-plugin/plugin.json`). Skills live in `skills/{name}/SKILL.md`.

## Available Skills

### Tier 1: Developer Workflow (Assess → Recommend → Implement → Validate)

| Skill | Command | Description | Knowledge Modules |
|-------|---------|-------------|-------------------|
| Build Plugin | `/fca:build-plugin` | Build a Figma plugin from scratch or enhance an existing one | plugin-architecture, plugin-best-practices, figma-api-plugin |
| Build Codegen Plugin | `/fca:build-codegen-plugin` | Build a Dev Mode codegen plugin that generates code from designs | plugin-codegen, figma-api-devmode, plugin-best-practices, figma-api-plugin |
| Build Importer | `/fca:build-importer` | Build a service that fetches Figma designs into a CMS or React app | figma-api-rest, figma-api-variables, all design-to-code, css-strategy, design-tokens, payload-figma-mapping, payload-blocks |
| Build Token Pipeline | `/fca:build-token-pipeline` | Build a pipeline that syncs Figma design tokens to code | figma-api-variables, design-tokens, design-tokens-variables, figma-api-webhooks, css-strategy |

### Tier 2: Reference / Validation (Step-by-step process)

| Skill | Command | Description | Knowledge Modules |
|-------|---------|-------------|-------------------|
| Ref: Layout | `/fca:ref-layout` | Interpret Figma Auto Layout → CSS Flexbox with correct sizing modes | layout |
| Ref: React | `/fca:ref-react` | Generate production-grade React/TSX component from Figma node data | layout, visual, typography, assets, semantic, css-strategy |
| Ref: HTML | `/fca:ref-html` | Generate semantic HTML + layered CSS from Figma node data | layout, visual, typography, assets, semantic, css-strategy, design-tokens |
| Ref: Tokens | `/fca:ref-tokens` | Extract design tokens → CSS custom properties + Tailwind config | design-tokens, design-tokens-variables, figma-api-variables, css-strategy |
| Ref: PayloadCMS Block | `/fca:ref-payload-block` | Map Figma component → PayloadCMS block config + renderer + types | payload-blocks, payload-figma-mapping, payload-visual-builder, css-strategy |

### Tier 3: Audit

| Skill | Command | Description | Knowledge Modules |
|-------|---------|-------------|-------------------|
| Audit Plugin | `/fca:audit-plugin` | Audit Figma plugin code against production best practices | plugin-architecture, plugin-codegen, plugin-best-practices, figma-api-plugin |

## Installation

```bash
# Recommended: install via npx
npx figma-code-agent

# Alternative: load as Claude Code plugin (for development)
claude --plugin-dir /path/to/figma-code-agent

# Manual: symlinks (requires clone)
./install.sh
```

## Skill Structure

Skills use two process patterns:

### Tier 1 Pattern: 4-Phase Process

1. **YAML frontmatter** -- `name` and `description` for Claude Code registration
2. **@references** -- Knowledge modules the skill depends on
3. **Objective** -- What the skill accomplishes
4. **Input** -- What the user provides (requirements, existing project path, description)
5. **Process** -- 4 phases: Assess → Recommend → Implement → Validate
6. **Output** -- What gets generated (project files, modifications, validation report)

### Tier 2/3 Pattern: Step-by-Step Process

1. **YAML frontmatter** -- `name` and `description` for Claude Code registration
2. **@references** -- Knowledge modules the skill depends on
3. **Objective** -- What the skill accomplishes
4. **Input** -- What the user provides (Figma node data, file URL, etc.)
5. **Process** -- Numbered step-by-step instructions for Claude
6. **Output** -- What gets generated (React component, CSS, token config, etc.)

## Invocation Examples

```
# Build a Figma plugin
/fca:build-plugin I want to build a plugin that exports frames as React components

# Build a codegen plugin for Dev Mode
/fca:build-codegen-plugin Generate Tailwind + React code in the inspect panel

# Build a Figma importer
/fca:build-importer Import Figma page designs into PayloadCMS blocks

# Build a token sync pipeline
/fca:build-token-pipeline Sync Figma Variables to CSS and Tailwind on library publish

# Interpret a Figma Auto Layout frame
/fca:ref-layout <paste Figma Auto Layout JSON node data>

# Generate a React component from Figma design
/fca:ref-react <paste Figma node data or describe the component>

# Generate vanilla HTML + CSS from Figma design
/fca:ref-html <paste Figma node data>

# Extract design tokens from Figma Variables
/fca:ref-tokens <paste Figma Variables API response or style data>

# Map a Figma component to a PayloadCMS block
/fca:ref-payload-block <paste Figma component data>

# Audit a Figma plugin codebase
/fca:audit-plugin <path to Figma plugin project>
```
