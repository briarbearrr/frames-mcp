#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_URL = 'https://frames-backend-ugzz.onrender.com/mcp';

const args = process.argv.slice(2);
const isGlobal = args.includes('-g') || args.includes('--global');
const scope = isGlobal ? 'user' : 'local';

console.log('\n  Frames MCP Setup\n');
console.log(`  Scope: ${isGlobal ? 'global (all projects)' : 'local (this project)'}\n`);

// Step 1: Add MCP server to Claude Code
console.log('  [1/2] Adding Frames MCP server...');
try {
  execFileSync(
    'claude',
    ['mcp', 'add', '--transport', 'http', '--scope', scope, 'frames', MCP_URL],
    { stdio: 'pipe' },
  );
  console.log('         MCP server added.');
} catch {
  console.log('         MCP server already configured or claude CLI not found.');
  console.log(`         Manual: claude mcp add --transport http --scope ${scope} frames ${MCP_URL}`);
}

// Step 2: Copy skill files
console.log('  [2/2] Installing Frames skill...');
const skillSrc = join(__dirname, 'skills', 'frames');
const skillDest = isGlobal
  ? join(homedir(), '.claude', 'skills', 'frames')
  : join(process.cwd(), '.claude', 'skills', 'frames');

if (!existsSync(skillSrc)) {
  console.error('         Skill files not found. Skipping skill install.');
} else {
  mkdirSync(skillDest, { recursive: true });
  cpSync(skillSrc, skillDest, { recursive: true });
  console.log(`         Skill installed to ${skillDest}`);
}

console.log('\n  Done! Start Claude Code and the Frames tools will be available.');
console.log(`  Tip: run with ${isGlobal ? '' : '--global (-g) for all projects, or without flag for '}project-only.\n`);
