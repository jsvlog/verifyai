#!/usr/bin/env node
// Postinstall: patch @xenova/transformers to handle array-format BPE merges
// The onnx-community model uses ["Ġ","t"] format but the library expects "Ġ t"
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', '@xenova', 'transformers', 'src', 'tokenizers.js');

if (!fs.existsSync(file)) {
  console.log('[postinstall] @xenova/transformers not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(file, 'utf8');

const oldBpe = `this.bpe_ranks = new Map(config.merges.map((x, i) => [x, i]));
        this.merges = config.merges.map(x => x.split(this.BPE_SPLIT_TOKEN));`;

const newBpe = `this.bpe_ranks = new Map(config.merges.map((x, i) => [Array.isArray(x) ? x.join(this.BPE_SPLIT_TOKEN) : x, i]));
        this.merges = config.merges.map(x => Array.isArray(x) ? x : x.split(this.BPE_SPLIT_TOKEN));`;

if (content.includes(oldBpe)) {
  content = content.replace(oldBpe, newBpe);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[postinstall] Patched @xenova/transformers BPE tokenizer (array merges support)');
} else if (content.includes('Array.isArray(x)')) {
  console.log('[postinstall] @xenova/transformers already patched, skipping');
} else {
  console.log('[postinstall] @xenova/transformers source changed — patch may need updating');
}
