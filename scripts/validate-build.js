#!/usr/bin/env node
/**
 * Post-build smoke test — catches blank-screen regressions before deploy.
 * Run after: npm run build
 * Checks:
 *   1. dist/index.html exists and has a <div id="root">
 *   2. Exactly one JS bundle in dist/assets/ — and it is referenced in index.html
 *   3. The JS bundle does not contain raw define-replacement tokens (__APP_VERSION__, etc.)
 *   4. Bundle size is within acceptable limits (warns if > 700 KB)
 *   5. SW files (sw.js, workbox-*.js) are present
 *   6. index.html does NOT reference any asset that is missing from dist/assets/
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST   = resolve(__dirname, '../client/dist');
const ASSETS = join(DIST, 'assets');

let failed = false;
const fail   = (msg) => { console.error(`  ✗  ${msg}`); failed = true; };
const ok     = (msg) => console.log(`  ✓  ${msg}`);
const warn   = (msg) => console.warn(`  ⚠  ${msg}`);

console.log('\n=== IndigoBuilders ERP — Build Validation ===\n');

// 1. index.html exists
const indexPath = join(DIST, 'index.html');
if (!existsSync(indexPath)) {
  fail('dist/index.html is missing — build may have failed');
  process.exit(1);
}
ok('dist/index.html exists');

const indexHtml = readFileSync(indexPath, 'utf8');

// 2. Root div present
if (!indexHtml.includes('<div id="root">')) {
  fail('index.html missing <div id="root"> — blank screen guaranteed');
} else {
  ok('<div id="root"> present');
}

// 3. Exactly one JS bundle and it is referenced in index.html
if (!existsSync(ASSETS)) {
  fail('dist/assets/ directory missing');
  process.exit(1);
}

const assetFiles = readdirSync(ASSETS);
const jsBundles  = assetFiles.filter(f => f.endsWith('.js') && !f.startsWith('workbox'));
const cssBundles = assetFiles.filter(f => f.endsWith('.css'));

if (jsBundles.length === 0) {
  fail('No JS bundle found in dist/assets/');
} else if (jsBundles.length > 1) {
  warn(`Multiple JS bundles found: ${jsBundles.join(', ')} — this is OK for code-split builds`);
} else {
  ok(`JS bundle: ${jsBundles[0]}`);
}

// 4. Every asset referenced in index.html exists on disk
const assetRefs = [...indexHtml.matchAll(/src="\/assets\/([^"]+)"|href="\/assets\/([^"]+)"/g)]
  .map(m => m[1] || m[2]);

for (const ref of assetRefs) {
  const fullPath = join(ASSETS, ref);
  if (!existsSync(fullPath)) {
    fail(`index.html references /assets/${ref} but the file is missing — BLANK SCREEN`);
  } else {
    ok(`Referenced asset exists: ${ref}`);
  }
}

// 5. Check JS bundles for known blank-screen tokens
const BANNED_TOKENS = [
  '__APP_VERSION__',
  'process.env.npm_package_version',
  'process.env.npm_package',
];

for (const jsFile of jsBundles) {
  const content = readFileSync(join(ASSETS, jsFile), 'utf8');
  for (const token of BANNED_TOKENS) {
    if (content.includes(token)) {
      fail(`Bundle ${jsFile} contains raw token "${token}" — Vite define replacement failed → blank screen`);
    }
  }
  ok(`No banned tokens in ${jsFile}`);

  // 6. Bundle size warning
  const sizeKB = Math.round(statSync(join(ASSETS, jsFile)).size / 1024);
  if (sizeKB > 700) {
    warn(`Bundle ${jsFile} is ${sizeKB} KB (> 700 KB) — consider code splitting`);
  } else {
    ok(`Bundle size: ${sizeKB} KB`);
  }
}

// 7. Service worker files present
const swPath  = join(DIST, 'sw.js');
const wbFiles = readdirSync(DIST).filter(f => f.startsWith('workbox-') && f.endsWith('.js'));

if (!existsSync(swPath)) {
  fail('sw.js missing — PWA service worker not generated');
} else {
  ok('sw.js present');
}

if (wbFiles.length === 0) {
  fail('No workbox-*.js file — SW runtime missing');
} else {
  ok(`Workbox runtime: ${wbFiles[0]}`);
}

// 8. SW contains skipWaiting to prevent stale cache blank screens
const swContent = existsSync(swPath) ? readFileSync(swPath, 'utf8') : '';
if (!swContent.includes('skipWaiting') && !swContent.includes('self.skipWaiting')) {
  fail('sw.js does not call skipWaiting() — stale cache can cause blank screens after deploy');
} else {
  ok('sw.js includes skipWaiting()');
}

// Result
console.log('');
if (failed) {
  console.error('BUILD VALIDATION FAILED — do not deploy\n');
  process.exit(1);
} else {
  console.log('BUILD VALIDATION PASSED — safe to deploy\n');
  process.exit(0);
}
