#!/usr/bin/env node
const { execSync } = require('node:child_process');

function has(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

const hasBun = has('bun');
let hasEliza = false;
if (hasBun) {
  try {
    const out = execSync('bun x elizaos --version', { stdio: 'pipe' }).toString();
    hasEliza = /\d+\.\d+\.\d+/.test(out);
  } catch (_) {
    hasEliza = false;
  }
}

if (!hasBun) {
  console.warn('\n[elizaos-starter] Bun is required to run the ElizaOS CLI.');
  console.warn('Install: brew install oven-sh/bun/bun');
}

if (!hasEliza) {
  console.warn('\n[elizaos-starter] Global @elizaos/cli not found.');
  console.warn('Install: bun i -g @elizaos/cli@latest');
}

if (!hasBun || !hasEliza) {
  console.warn('\nCLI not available; dev will fall back to panel-only UI.');
}


