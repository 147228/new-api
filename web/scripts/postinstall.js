/**
 * Postinstall patch for @douyinfe/vite-plugin-semi
 *
 * Fixes Windows compatibility issue when project path contains spaces.
 * The original regex \S* doesn't match spaces in file paths,
 * causing SCSS compilation to fail on paths like "F:/kaifa/new api/".
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const target =
  'node_modules/@douyinfe/vite-plugin-semi/lib/vite-plugin-semi.js';

if (!existsSync(target)) {
  console.log('[postinstall] vite-plugin-semi not found, skipping patch');
  process.exit(0);
}

let content = readFileSync(target, 'utf-8');
const needle = String.raw`scssFilePath.match(/^(\S*\/node_modules\/)/)`;
const replacement = String.raw`scssFilePath.match(/^(.*\/node_modules\/)/)`;

if (content.includes(needle)) {
  content = content.replace(needle, replacement);
  writeFileSync(target, content, 'utf-8');
  console.log('[postinstall] Patched vite-plugin-semi: \\S* → .* (space-in-path fix)');
} else if (content.includes(replacement)) {
  console.log('[postinstall] vite-plugin-semi already patched');
} else {
  console.log('[postinstall] vite-plugin-semi: pattern not found, may need manual update');
}
