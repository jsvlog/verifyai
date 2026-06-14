#!/usr/bin/env node
// Postinstall: patch @xenova/transformers for browser compatibility
// 1. BPE tokenizer: handle array-format merges (model uses ["Ġ","t"] but lib expects "Ġ t")
// 2. env.js: isEmpty() crashes when fs/path are null (Turbopack resolves them as empty)
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'node_modules', '@xenova', 'transformers', 'src');

if (!fs.existsSync(base)) {
  console.log('[postinstall] @xenova/transformers not found, skipping');
  process.exit(0);
}

let patched = 0;

// --- Patch 1: BPE tokenizer (tokenizers.js) ---
const tokFile = path.join(base, 'tokenizers.js');
let tokContent = fs.readFileSync(tokFile, 'utf8');

const oldBpe = `this.bpe_ranks = new Map(config.merges.map((x, i) => [x, i]));
        this.merges = config.merges.map(x => x.split(this.BPE_SPLIT_TOKEN));`;

const newBpe = `this.bpe_ranks = new Map(config.merges.map((x, i) => [Array.isArray(x) ? x.join(this.BPE_SPLIT_TOKEN) : x, i]));
        this.merges = config.merges.map(x => Array.isArray(x) ? x : x.split(this.BPE_SPLIT_TOKEN));`;

if (tokContent.includes(oldBpe)) {
  tokContent = tokContent.replace(oldBpe, newBpe);
  fs.writeFileSync(tokFile, tokContent, 'utf8');
  console.log('[postinstall] Patched tokenizer BPE (array merges)');
  patched++;
} else if (tokContent.includes('Array.isArray(x)')) {
  console.log('[postinstall] Tokenizer already patched');
} else {
  console.log('[postinstall] WARNING: tokenizer source changed — patch may need update');
}

// --- Patch 2: isEmpty null-safety (env.js) ---
const envFile = path.join(base, 'env.js');
let envContent = fs.readFileSync(envFile, 'utf8');

const oldIsEmpty = `function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}`;

const newIsEmpty = `function isEmpty(obj) {
    return !obj || Object.keys(obj).length === 0;
}`;

if (envContent.includes(oldIsEmpty)) {
  envContent = envContent.replace(oldIsEmpty, newIsEmpty);
  fs.writeFileSync(envFile, envContent, 'utf8');
  console.log('[postinstall] Patched env.js isEmpty (null-safe)');
  patched++;
} else if (envContent.includes('!obj || Object.keys')) {
  console.log('[postinstall] env.js already patched');
} else {
  console.log('[postinstall] WARNING: env.js source changed — patch may need update');
}

if (patched > 0) {
  console.log(`[postinstall] Applied ${patched} patch(es) to @xenova/transformers`);
}
