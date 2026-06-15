// Real Plagiarism Checker using DuckDuckGo search
// Cost: $0 — DuckDuckGo has no API key, no rate limits, no quotas
// Architecture: split text into key phrases → search each on DDG → parse results

import { PlagiarismResult, PlagiarismSource, PlagiarismMatch } from './types';

const DDG_URL = 'https://html.duckduckgo.com/html/';
const MAX_PHRASES = 5; // limit to avoid rate limiting
const MIN_PHRASE_LENGTH = 40; // minimum chars per search phrase
const PHRASE_TIMEOUT = 5000; // 5s per phrase fetch

export async function checkPlagiarismViaDDG(text: string): Promise<PlagiarismResult> {
  const t0 = Date.now();
  const trimmed = text.trim();

  if (trimmed.length < 50) {
    return {
      overallScore: 0,
      uniqueScore: 100,
      sources: [],
      matches: [],
      processingTime: (Date.now() - t0) / 1000,
    };
  }

  // Extract key phrases to search
  const phrases = extractKeyPhrases(trimmed);

  // Search each phrase on DuckDuckGo
  const allMatches: PlagiarismMatch[] = [];
  const sourceMap = new Map<string, PlagiarismSource>();

  for (const phrase of phrases) {
    try {
      const results = await searchDDG(phrase, PHRASE_TIMEOUT);

      for (const r of results) {
        // Calculate similarity between our phrase and the result snippet
        const similarity = calcSimilarity(phrase, r.snippet);

        if (similarity > 30) {
          // Only include meaningful matches
          const match: PlagiarismMatch = {
            text: phrase.substring(0, 150),
            sourceUrl: r.url,
            startIndex: trimmed.indexOf(phrase),
            endIndex: trimmed.indexOf(phrase) + phrase.length,
            similarity: Math.round(similarity * 10) / 10,
          };
          allMatches.push(match);

          // Deduplicate sources by URL
          if (!sourceMap.has(r.url)) {
            sourceMap.set(r.url, {
              url: r.url,
              title: r.title,
              similarity: Math.round(similarity * 10) / 10,
              matchedText: phrase.substring(0, 100),
            });
          }
        }
      }
    } catch {
      // DDG query failed — skip this phrase
    }
  }

  // Calculate overall score
  const overallScore = allMatches.length > 0
    ? Math.min(100, allMatches.reduce((s, m) => s + m.similarity, 0) / allMatches.length)
    : 0;

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    uniqueScore: Math.round((100 - overallScore) * 10) / 10,
    sources: Array.from(sourceMap.values()).slice(0, 5),
    matches: allMatches.slice(0, 10),
    processingTime: (Date.now() - t0) / 1000,
  };
}

// ================================================================
//  PHRASE EXTRACTION
// ================================================================

function extractKeyPhrases(text: string): string[] {
  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length >= MIN_PHRASE_LENGTH);

  // If not enough long sentences, use n-gram chunks
  if (sentences.length < MAX_PHRASES) {
    const words = text.split(/\s+/);
    const chunkSize = Math.ceil(words.length / MAX_PHRASES);
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.length >= MIN_PHRASE_LENGTH) {
        sentences.push(chunk);
      }
    }
  }

  // Pick diverse phrases: first, middle, last + random
  const selected: string[] = [];
  const indices = [0];
  if (sentences.length > 2) indices.push(Math.floor(sentences.length / 2));
  if (sentences.length > 1) indices.push(sentences.length - 1);

  for (const i of indices) {
    if (i < sentences.length && !selected.includes(sentences[i])) {
      selected.push(sentences[i]);
    }
  }

  // If we need more, add random ones
  const remaining = MAX_PHRASES - selected.length;
  if (remaining > 0 && sentences.length > selected.length) {
    const pool = sentences.filter(s => !selected.includes(s));
    for (let i = 0; i < Math.min(remaining, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.push(pool[idx]);
      pool.splice(idx, 1);
    }
  }

  return selected.slice(0, MAX_PHRASES);
}

// ================================================================
//  DUCKDUCKGO SEARCH
// ================================================================

interface DDGResult {
  url: string;
  title: string;
  snippet: string;
}

async function searchDDG(query: string, timeout: number): Promise<DDGResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    // Quote the query for exact phrase matching
    const searchQuery = query.length > 100
      ? query.substring(0, 100) // DDG has query length limits
      : query;

    const url = `${DDG_URL}?q=${encodeURIComponent(`"${searchQuery}"`)}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    return parseDDGResults(html);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseDDGResults(html: string): DDGResult[] {
  const results: DDGResult[] = [];

  // Parse DDG HTML results
  // Each result is in a div with class "result"
  const resultRegex = /<div class="result"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  const matches = html.match(resultRegex);

  if (!matches) return results;

  for (const block of matches.slice(0, 5)) {
    // Extract URL
    const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"/i);
    const url = urlMatch?.[1] || '';

    // Extract title
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';

    // Extract snippet
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    let snippet = snippetMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';

    // Highlight removal: strip <b> tags
    snippet = snippet.replace(/<\/?b[^>]*>/g, '');

    if (url && title) {
      results.push({ url, title, snippet });
    }
  }

  return results;
}

// ================================================================
//  SIMILARITY CALCULATION
// ================================================================

function calcSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const bLower = b.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  if (!aLower || !bLower) return 0;

  const aWords = new Set(aLower.split(/\s+/).filter(w => w.length > 3));
  const bWords = new Set(bLower.split(/\s+/).filter(w => w.length > 3));

  if (aWords.size === 0) return 0;

  let matches = 0;
  aWords.forEach(w => { if (bWords.has(w)) matches++; });

  return (matches / aWords.size) * 100;
}
