#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// --- Constants ---

const PLUGIN_NAME = 'fca';

const SKILL_NAMES = [
  // Tier 1: Developer workflow skills
  'build-plugin',
  'build-codegen-plugin',
  'build-importer',
  'build-token-pipeline',
  // Tier 2: Reference/validation skills
  'ref-layout',
  'ref-react',
  'ref-html',
  'ref-tokens',
  'ref-payload-block',
  // Tier 3: Audit
  'audit-plugin',
];

const SKILL_DESCRIPTIONS = {
  'build-plugin':         'Build a Figma plugin from scratch or enhance one',
  'build-codegen-plugin': 'Build a Dev Mode codegen plugin',
  'build-importer':       'Build a Figma-to-CMS/React importer service',
  'build-token-pipeline': 'Build a Figma token sync pipeline',
  'ref-layout':           'Reference: Interpret Auto Layout -> CSS Flexbox',
  'ref-react':            'Reference: Generate React/TSX from Figma node',
  'ref-html':             'Reference: Generate HTML + layered CSS',
  'ref-tokens':           'Reference: Extract design tokens -> CSS vars + Tailwind',
  'ref-payload-block':    'Reference: Map Figma component -> PayloadCMS block',
  'audit-plugin':         'Audit plugin against best practices',
};

// --- Version ---

const PKG_ROOT = path.resolve(__dirname, '..');
const PKG_VERSION = require(path.join(PKG_ROOT, 'package.json')).version;

function getVersionFile(base) {
  return path.join(base, PLUGIN_NAME, '.version');
}

function getInstalledVersion(base) {
  const versionFile = getVersionFile(base);
  try {
    return fs.readFileSync(versionFile, 'utf-8').trim();
  } catch {
    return null;
  }
}

function writeVersion(base, version) {
  const versionFile = getVersionFile(base);
  ensureDir(path.dirname(versionFile));
  fs.writeFileSync(versionFile, version, 'utf-8');
}

function removeVersion(base) {
  const versionFile = getVersionFile(base);
  try {
    fs.unlinkSync(versionFile);
  } catch {
    // Ignore — file may not exist
  }
}

// --- Paths ---

function getGlobalBase() {
  return path.join(os.homedir(), '.claude');
}

function getLocalBase() {
  return path.join(process.cwd(), '.claude');
}

function getTargets(base) {
  return {
    commands: path.join(base, 'commands', PLUGIN_NAME),
    knowledge: path.join(base, PLUGIN_NAME, 'knowledge'),
  };
}

function getKnowledgeRefPath(base) {
  // For global: @~/.claude/fca/knowledge/filename.md
  // For local: @.claude/fca/knowledge/filename.md
  const home = os.homedir();
  if (base.startsWith(home)) {
    return `~/.claude/${PLUGIN_NAME}/knowledge`;
  }
  return `.claude/${PLUGIN_NAME}/knowledge`;
}

// --- File operations ---

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getKnowledgeFiles() {
  const knowledgeDir = path.join(PKG_ROOT, 'knowledge');
  return fs.readdirSync(knowledgeDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort();
}

function copyWithPathReplacement(src, dest, replacements) {
  let content = fs.readFileSync(src, 'utf-8');
  for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
  }
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf-8');
}

// --- Install ---

function install(base) {
  const targets = getTargets(base);
  const knowledgeRefPath = getKnowledgeRefPath(base);
  const replacements = [
    ['@knowledge/', `@${knowledgeRefPath}/`],
  ];

  // Version check
  const installedVersion = getInstalledVersion(base);
  if (installedVersion) {
    if (installedVersion === PKG_VERSION) {
      console.log(`Figma Agent v${PKG_VERSION} is already up to date.`);
      console.log('');
      console.log('Reinstalling to ensure all files are current...');
      console.log('');
    } else {
      console.log(`Updating Figma Agent: v${installedVersion} -> v${PKG_VERSION}`);
      console.log('');
    }
  } else {
    console.log(`Installing Figma Agent v${PKG_VERSION}`);
    console.log('');
  }

  // Validate source files
  console.log('Validating source files...');
  let missing = 0;

  for (const name of SKILL_NAMES) {
    const src = path.join(PKG_ROOT, 'skills', name, 'SKILL.md');
    if (!fs.existsSync(src)) {
      console.log(`  ERROR: Missing skill: skills/${name}/SKILL.md`);
      missing++;
    }
  }

  const knowledgeFiles = getKnowledgeFiles();
  for (const file of knowledgeFiles) {
    const src = path.join(PKG_ROOT, 'knowledge', file);
    if (!fs.existsSync(src)) {
      console.log(`  ERROR: Missing knowledge file: knowledge/${file}`);
      missing++;
    }
  }

  if (missing > 0) {
    console.log(`\nAborting: ${missing} source file(s) missing.`);
    process.exit(1);
  }
  console.log(`  ${SKILL_NAMES.length} skills + ${knowledgeFiles.length} knowledge files found.`);
  console.log('');

  // Copy skills as commands
  console.log('Installing skills...');
  let skillCount = 0;
  for (const name of SKILL_NAMES) {
    const src = path.join(PKG_ROOT, 'skills', name, 'SKILL.md');
    const dest = path.join(targets.commands, `${name}.md`);
    copyWithPathReplacement(src, dest, replacements);
    console.log(`  ${name}.md`);
    skillCount++;
  }
  console.log('');

  // Copy knowledge files
  console.log('Installing knowledge modules...');
  let knowledgeCount = 0;
  for (const file of knowledgeFiles) {
    const src = path.join(PKG_ROOT, 'knowledge', file);
    const dest = path.join(targets.knowledge, file);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log(`  ${file}`);
    knowledgeCount++;
  }
  console.log('');

  // Write version file
  writeVersion(base, PKG_VERSION);

  // Summary
  const location = base === getGlobalBase() ? 'global (~/.claude/)' : `local (${path.relative(process.cwd(), base) || '.claude/'})`;
  console.log(`Installed ${skillCount} skills + ${knowledgeCount} knowledge modules — v${PKG_VERSION} (${location})`);
  console.log('');
  console.log('Invoke skills in Claude Code:');
  for (const name of SKILL_NAMES) {
    const desc = SKILL_DESCRIPTIONS[name] || '';
    console.log(`  /fca:${name.padEnd(22)} ${desc}`);
  }
  console.log('');
  console.log('Tip: Use /clear before invoking a skill for a fresh context window.');
}

// --- Uninstall ---

function uninstall(base) {
  const targets = getTargets(base);
  let removed = 0;

  console.log('Uninstalling Figma Agent...');
  console.log('');

  // Remove command files
  if (fs.existsSync(targets.commands)) {
    const files = fs.readdirSync(targets.commands);
    for (const file of files) {
      fs.unlinkSync(path.join(targets.commands, file));
      console.log(`  Removed command: ${file}`);
      removed++;
    }
    fs.rmSync(targets.commands, { recursive: true, force: true });
  }

  // Remove version file
  removeVersion(base);

  // Remove knowledge files
  if (fs.existsSync(targets.knowledge)) {
    const files = fs.readdirSync(targets.knowledge);
    for (const file of files) {
      fs.unlinkSync(path.join(targets.knowledge, file));
      console.log(`  Removed knowledge: ${file}`);
      removed++;
    }
    fs.rmSync(targets.knowledge, { recursive: true, force: true });

    // Remove parent fca directory if empty
    const parentDir = path.dirname(targets.knowledge);
    try {
      const remaining = fs.readdirSync(parentDir);
      if (remaining.length === 0) {
        fs.rmdirSync(parentDir);
      }
    } catch {
      // Ignore — parent may not exist or may not be empty
    }
  }

  console.log('');
  if (removed === 0) {
    console.log('Nothing to remove — Figma Agent is not installed at this location.');
  } else {
    console.log(`Done. Removed ${removed} file(s).`);
  }
}

// --- Interactive prompt ---

function prompt(question, choices) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(question);
    console.log('');
    choices.forEach((choice, i) => {
      console.log(`  ${i + 1}) ${choice.label}`);
    });
    console.log('');

    rl.question('Choose [1-' + choices.length + ']: ', (answer) => {
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < choices.length) {
        resolve(choices[idx].value);
      } else {
        console.log('Invalid choice. Defaulting to global install.');
        resolve('global');
      }
    });
  });
}

// --- CLI ---

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let mode = null;
  let isUninstall = false;
  let showHelp = false;
  let showVersion = false;

  for (const arg of args) {
    switch (arg) {
      case '--global':
      case '-g':
        mode = 'global';
        break;
      case '--local':
      case '-l':
        mode = 'local';
        break;
      case '--uninstall':
      case '-u':
        isUninstall = true;
        break;
      case '--version':
      case '-v':
        showVersion = true;
        break;
      case '--help':
      case '-h':
        showHelp = true;
        break;
      default:
        console.log(`Unknown option: ${arg}`);
        showHelp = true;
        break;
    }
  }

  if (showVersion) {
    const globalInstalled = getInstalledVersion(getGlobalBase());
    const localInstalled = getInstalledVersion(getLocalBase());
    console.log(`figma-code-agent v${PKG_VERSION} (package)`);
    if (globalInstalled) {
      console.log(`  Global install: v${globalInstalled}${globalInstalled === PKG_VERSION ? ' (up to date)' : ' (update available)'}`);
    } else {
      console.log('  Global install: not installed');
    }
    if (localInstalled) {
      console.log(`  Local install:  v${localInstalled}${localInstalled === PKG_VERSION ? ' (up to date)' : ' (update available)'}`);
    } else {
      console.log('  Local install:  not installed');
    }
    process.exit(0);
  }

  if (showHelp) {
    console.log(`
Figma Agent — npx installer (v${PKG_VERSION})

Usage: npx figma-code-agent [OPTIONS]

Options:
  --global, -g     Install to ~/.claude/ (available in all projects)
  --local, -l      Install to .claude/ in current project
  --uninstall, -u  Remove installed files
  --version, -v    Show installed and available versions
  --help, -h       Show this help message

Examples:
  npx figma-code-agent              Interactive mode (choose global or local)
  npx figma-code-agent --global     Install globally to ~/.claude/
  npx figma-code-agent --local      Install to current project's .claude/
  npx figma-code-agent --uninstall  Remove from ~/.claude/ (default)
  npx figma-code-agent --uninstall --local  Remove from .claude/
  npx figma-code-agent --version    Check installed version
`);
    process.exit(0);
  }

  // Handle uninstall
  if (isUninstall) {
    const base = mode === 'local' ? getLocalBase() : getGlobalBase();
    uninstall(base);
    return;
  }

  // If no mode specified, prompt interactively
  if (!mode) {
    mode = await prompt('Where should Figma Agent be installed?', [
      { label: 'Global — ~/.claude/ (available in all projects)', value: 'global' },
      { label: 'Local — .claude/ (current project only)', value: 'local' },
    ]);
    console.log('');
  }

  const base = mode === 'local' ? getLocalBase() : getGlobalBase();
  install(base);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
