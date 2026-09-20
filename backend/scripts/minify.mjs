/**
 * Minification Script for Backend Build
 *
 * Minifies all JavaScript files in the dist folder using Terser
 * Run after TypeScript compilation: node scripts/minify.mjs
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { minify } = require('terser');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Terser options for aggressive minification with deterministic output
const TERSER_OPTIONS = {
  compress: {
    dead_code: true,
    drop_debugger: true,
    conditionals: true,
    evaluate: true,
    booleans: true,
    loops: true,
    unused: true,
    hoist_funs: true,
    keep_fargs: false,
    hoist_vars: false,
    if_return: true,
    join_vars: true,
    side_effects: true,
    warnings: false,
    // Deterministic options
    passes: 1,        // Single pass for consistency
    sequences: false, // Disable sequence optimization (can cause non-determinism)
  },
  mangle: {
    toplevel: false,
    keep_classnames: true,
    keep_fnames: false,
  },
  output: {
    comments: false,
    beautify: false,
    semicolons: true,
  },
  sourceMap: false,
};

// Files/directories to skip (already obfuscated or should not be minified)
const SKIP_PATTERNS = [
  /node_modules/,
  /\.map$/,
  /\.d\.ts$/,
  /manifest\.sig\.json$/,
  /integrity-hashes\.js$/,
];

// Check if file should be skipped
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

// Get all JS files recursively
async function getJsFiles(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldSkip(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await getJsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Check if file is already minified/obfuscated
function isAlreadyProcessed(code) {
  // Check for obfuscation patterns
  if (/var\s+_0x[a-f0-9]{4,}=/.test(code)) return true;
  if (/function\s+_0x[a-f0-9]{4,}\(/.test(code)) return true;

  // Check if already heavily minified (very long lines, no newlines)
  const lines = code.split('\n');
  if (lines.length < 5 && code.length > 1000) return true;

  return false;
}

// Minify a single file
async function minifyFile(filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf-8');

    // Skip if already processed (obfuscated or heavily minified)
    if (isAlreadyProcessed(code)) {
      return { skipped: true, reason: 'already processed' };
    }

    // Skip very small files
    if (code.length < 100) {
      return { skipped: true, reason: 'too small' };
    }

    const result = await minify(code, TERSER_OPTIONS);

    if (result.code) {
      // Only write if content actually changed
      // This prevents Git from seeing unchanged files as modified
      if (result.code === code) {
        return { skipped: true, reason: 'no change' };
      }

      await fs.writeFile(filePath, result.code);
      const savings = ((code.length - result.code.length) / code.length * 100).toFixed(1);
      return {
        success: true,
        originalSize: code.length,
        minifiedSize: result.code.length,
        savings: `${savings}%`
      };
    }

    return { skipped: true, reason: 'no output' };
  } catch (error) {
    return { error: true, message: error.message };
  }
}

async function main() {
  console.log('📦 Minifying dist files...\n');

  if (!existsSync(DIST_DIR)) {
    console.log('❌ dist folder not found. Run build first.');
    process.exit(1);
  }

  const files = await getJsFiles(DIST_DIR);
  console.log(`Found ${files.length} JavaScript files\n`);

  let minified = 0;
  let skipped = 0;
  let errors = 0;
  let totalOriginal = 0;
  let totalMinified = 0;

  for (const file of files) {
    const relativePath = path.relative(DIST_DIR, file);
    const result = await minifyFile(file);

    if (result.success) {
      minified++;
      totalOriginal += result.originalSize;
      totalMinified += result.minifiedSize;
      // Only log significant files
      if (result.originalSize > 5000) {
        console.log(`  ✓ ${relativePath} (${result.savings} smaller)`);
      }
    } else if (result.skipped) {
      skipped++;
    } else if (result.error) {
      errors++;
      console.log(`  ✗ ${relativePath}: ${result.message}`);
    }
  }

  console.log('\n====================================');
  console.log('✅ Minification complete!\n');
  console.log(`  Minified: ${minified} files`);
  console.log(`  Skipped: ${skipped} files (already processed or too small)`);
  if (errors > 0) {
    console.log(`  Errors: ${errors} files`);
  }

  if (totalOriginal > 0) {
    const totalSavings = ((totalOriginal - totalMinified) / totalOriginal * 100).toFixed(1);
    const savedKB = ((totalOriginal - totalMinified) / 1024).toFixed(1);
    console.log(`\n  Total size reduction: ${savedKB}KB (${totalSavings}%)`);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
