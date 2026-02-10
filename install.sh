#!/usr/bin/env bash
set -euo pipefail

# Figma Agent — Manual Skill Installer
#
# Preferred: claude --plugin-dir /path/to/figma-code-agent
#
# This script manually symlinks skills to ~/.claude/skills/ as an alternative
# to loading the plugin with --plugin-dir.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${HOME}/.claude/skills"
PLUGIN_NAME="fca"

# Skill names (directory names under skills/)
SKILL_NAMES=(
  # Tier 1: Developer workflow skills
  "build-plugin"
  "build-codegen-plugin"
  "build-importer"
  "build-token-pipeline"
  # Tier 2: Reference/validation skills
  "ref-layout"
  "ref-react"
  "ref-html"
  "ref-tokens"
  "ref-payload-block"
  # Tier 3: Audit
  "audit-plugin"
)

# Defaults
FORCE=false
UNINSTALL=false
DRY_RUN=false

usage() {
  cat <<EOF
Figma Agent — Manual Skill Installer (Fallback)

Preferred: claude --plugin-dir /path/to/figma-code-agent

Usage: ./install.sh [OPTIONS]

Options:
  --force       Overwrite existing symlinks without prompting
  --uninstall   Remove all installed skill symlinks and empty directories
  --dry-run     Show what would be done without making changes
  --help        Show this help message

Skills installed:
  build-plugin          Build a Figma plugin from scratch or enhance one
  build-codegen-plugin  Build a Dev Mode codegen plugin
  build-importer        Build a Figma-to-CMS/React importer service
  build-token-pipeline  Build a Figma token sync pipeline
  ref-layout            Reference: Interpret Auto Layout -> CSS Flexbox
  ref-react             Reference: Generate React/TSX from Figma node
  ref-html              Reference: Generate HTML + layered CSS
  ref-tokens            Reference: Extract design tokens -> CSS vars + Tailwind
  ref-payload-block     Reference: Map Figma component -> PayloadCMS block
  audit-plugin          Audit plugin against best practices

Install location: ~/.claude/skills/${PLUGIN_NAME}--{name}/SKILL.md
Invocation:       /fca:{skill-name}
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=true
      shift
      ;;
    --uninstall)
      UNINSTALL=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# --- Uninstall mode ---
if [[ "$UNINSTALL" == true ]]; then
  echo "Uninstalling Figma Agent skills..."
  echo ""

  removed=0
  for name in "${SKILL_NAMES[@]}"; do
    target_dir="${SKILLS_DIR}/${PLUGIN_NAME}--${name}"
    target_link="${target_dir}/SKILL.md"

    if [[ -L "$target_link" ]]; then
      if [[ "$DRY_RUN" == true ]]; then
        echo "  [dry-run] Would remove: ${target_link}"
        echo "  [dry-run] Would remove directory: ${target_dir}"
      else
        rm "$target_link"
        rmdir "$target_dir" 2>/dev/null || true
        echo "  Removed: ${name}"
      fi
      removed=$((removed + 1))
    elif [[ -d "$target_dir" ]]; then
      if [[ "$DRY_RUN" == true ]]; then
        echo "  [dry-run] Would remove directory: ${target_dir} (no symlink found)"
      else
        rmdir "$target_dir" 2>/dev/null || echo "  Warning: ${target_dir} is not empty, skipping"
      fi
    else
      echo "  Skipped: ${name} (not installed)"
    fi
  done

  echo ""
  if [[ "$DRY_RUN" == true ]]; then
    echo "Dry run complete. ${removed} skill(s) would be removed."
  else
    echo "Done. ${removed} skill(s) removed."
  fi
  exit 0
fi

# --- Install mode ---

# Validate all source files exist before starting (fail fast)
echo "Validating source files..."
missing=0
for name in "${SKILL_NAMES[@]}"; do
  source_file="${SCRIPT_DIR}/skills/${name}/SKILL.md"
  if [[ ! -f "$source_file" ]]; then
    echo "  ERROR: Missing source file: skills/${name}/SKILL.md"
    missing=$((missing + 1))
  fi
done

if [[ $missing -gt 0 ]]; then
  echo ""
  echo "Aborting: ${missing} source file(s) missing. Run from the figma-code-agent root directory (fca)."
  exit 1
fi
echo "  All ${#SKILL_NAMES[@]} source files found."
echo ""

# Install skills
echo "Installing Figma Agent skills..."
echo ""

installed=0
skipped=0
for name in "${SKILL_NAMES[@]}"; do
  source_file="${SCRIPT_DIR}/skills/${name}/SKILL.md"
  target_dir="${SKILLS_DIR}/${PLUGIN_NAME}--${name}"
  target_link="${target_dir}/SKILL.md"

  # Check if symlink already exists
  if [[ -L "$target_link" ]]; then
    current_target="$(readlink "$target_link")"
    if [[ "$current_target" == "$source_file" ]]; then
      echo "  Skipped: ${name} (already installed, symlink correct)"
      skipped=$((skipped + 1))
      continue
    else
      if [[ "$FORCE" == true ]]; then
        if [[ "$DRY_RUN" == true ]]; then
          echo "  [dry-run] Would overwrite: ${name} (currently -> ${current_target})"
        else
          rm "$target_link"
          echo "  Overwritten: ${name} (was -> ${current_target})"
        fi
      else
        echo "  WARNING: ${name} exists but points to: ${current_target}"
        echo "           Expected: ${source_file}"
        echo "           Use --force to overwrite."
        skipped=$((skipped + 1))
        continue
      fi
    fi
  elif [[ -f "$target_link" ]]; then
    if [[ "$FORCE" == true ]]; then
      if [[ "$DRY_RUN" == true ]]; then
        echo "  [dry-run] Would overwrite file: ${target_link}"
      else
        rm "$target_link"
      fi
    else
      echo "  WARNING: ${target_link} exists as a regular file (not a symlink)."
      echo "           Use --force to overwrite."
      skipped=$((skipped + 1))
      continue
    fi
  fi

  # Create directory and symlink
  if [[ "$DRY_RUN" == true ]]; then
    echo "  [dry-run] Would create: ${target_dir}/"
    echo "  [dry-run] Would symlink: ${target_link} -> ${source_file}"
  else
    mkdir -p "$target_dir"
    ln -s "$source_file" "$target_link"
    echo "  Installed: ${name}"
  fi
  installed=$((installed + 1))
done

echo ""

# Summary
if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. ${installed} skill(s) would be installed, ${skipped} skipped."
else
  echo "Done. ${installed} skill(s) installed, ${skipped} skipped."
fi

echo ""
echo "Invoke skills in Claude Code:"
echo "  /fca:build-plugin          Build a Figma plugin from scratch or enhance one"
echo "  /fca:build-codegen-plugin  Build a Dev Mode codegen plugin"
echo "  /fca:build-importer        Build a Figma-to-CMS/React importer service"
echo "  /fca:build-token-pipeline  Build a Figma token sync pipeline"
echo "  /fca:ref-layout            Reference: Interpret Auto Layout -> CSS Flexbox"
echo "  /fca:ref-react             Reference: Generate React/TSX from Figma node"
echo "  /fca:ref-html              Reference: Generate HTML + layered CSS"
echo "  /fca:ref-tokens            Reference: Extract design tokens -> CSS vars + Tailwind"
echo "  /fca:ref-payload-block     Reference: Map Figma component -> PayloadCMS block"
echo "  /fca:audit-plugin          Audit plugin against best practices"
echo ""
echo "Tip: Use /clear before invoking a skill for a fresh context window."
