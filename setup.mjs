#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_URL = 'https://api.wyren.ai/mcp';

const args = process.argv.slice(2);
const isGlobal = args.includes('-g') || args.includes('--global');
const scope = isGlobal ? 'user' : 'local';

console.log('\n  Wyren MCP Setup\n');
console.log(`  Scope: ${isGlobal ? 'global (all projects)' : 'local (this project)'}\n`);

// Step 1: Add MCP server to Claude Code
console.log('  [1/2] Adding Wyren MCP server...');
try {
  execFileSync(
    'claude',
    ['mcp', 'add', '--transport', 'http', '--scope', scope, 'wyren', MCP_URL],
    { stdio: 'pipe' },
  );
  console.log('         MCP server added.');
} catch {
  console.log('         MCP server already configured or claude CLI not found.');
  console.log(
    `         Manual: claude mcp add --transport http --scope ${scope} wyren ${MCP_URL}`,
  );
}

// Step 2: Copy skill files
console.log('  [2/2] Installing Wyren skill...');
const skillSrc = join(__dirname, 'skills', 'wyren');
const skillDest = isGlobal
  ? join(homedir(), '.claude', 'skills', 'wyren')
  : join(process.cwd(), '.claude', 'skills', 'wyren');

if (!existsSync(skillSrc)) {
  console.error('         Skill files not found. Skipping skill install.');
} else {
  mkdirSync(skillDest, { recursive: true });
  cpSync(skillSrc, skillDest, { recursive: true });
  console.log(`         Skill installed to ${skillDest}`);
}

console.log('\n  Done! Start Claude Code and the Wyren tools will be available.');
console.log(
  `  Tip: run with ${isGlobal ? '' : '--global (-g) for all projects, or without flag for '}project-only.\n`,
);
