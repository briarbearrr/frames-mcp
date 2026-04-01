#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_URL = 'https://frames-backend-ugzz.onrender.com/mcp';

console.log('\n  Frames MCP Setup\n');

// Step 1: Add MCP server to Claude Code
console.log('  [1/2] Adding Frames MCP server...');
try {
  execFileSync(
    'claude',
    ['mcp', 'add', 'frames', '--transport', 'streamable-http', MCP_URL],
    { stdio: 'pipe' },
  );
  console.log('         MCP server added.');
} catch {
  console.log('         MCP server already configured or claude CLI not found.');
  console.log(`         Manual: claude mcp add frames --transport streamable-http ${MCP_URL}`);
}

// Step 2: Copy skill files
console.log('  [2/2] Installing Frames skill...');
const skillSrc = join(__dirname, 'skills', 'frames');
const skillDest = join(process.cwd(), '.claude', 'skills', 'frames');

if (!existsSync(skillSrc)) {
  console.error('         Skill files not found. Skipping skill install.');
} else {
  mkdirSync(skillDest, { recursive: true });
  cpSync(skillSrc, skillDest, { recursive: true });
  console.log(`         Skill installed to ${skillDest}`);
}

console.log('\n  Done! Start Claude Code and the Frames tools will be available.\n');
