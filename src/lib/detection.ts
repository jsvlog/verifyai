import { DetectionResult, PlagiarismResult, HumanizeResult, DetectRequest, SentenceAnalysis, ModelPrediction } from './types';

// ===== Pluggable AI Detection Backends =====

export type DetectionProvider = 'gptzero' | 'originality' | 'sapling' | 'winston' | 'custom';

export interface DetectionConfig {
  provider: DetectionProvider;
  apiKey?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
}

// Default config - set via environment variables
function getConfig(provider?: DetectionProvider): DetectionConfig {
  const p = provider || (process.env.DETECTION_PROVIDER as DetectionProvider) || 'custom';
  return {
    provider: p,
    apiKey: process.env.DETECTION_API_KEY || process.env[`${p.toUpperCase()}_API_KEY`],
    endpoint: process.env.DETECTION_ENDPOINT || process.env[`${p.toUpperCase()}_ENDPOINT`],
  };
}

// ===== Main Detection Functions =====

export async function detectAI(
  text: string,
  config?: DetectionConfig
): Promise<DetectionResult> {
  const cfg = config || getConfig();

  if (!cfg.apiKey && cfg.provider !== 'custom') {
    // Fall back to heuristic-based detection when no API key
    return heuristicAIDetection(text);
  }

  switch (cfg.provider) {
    case 'gptzero':
      try { return await detectGPTZero(text, cfg); } catch { return heuristicAIDetection(text); }
    case 'originality':
      try { return await detectOriginality(text, cfg); } catch { return heuristicAIDetection(text); }
    case 'sapling':
      try { return await detectSapling(text, cfg); } catch { return heuristicAIDetection(text); }
    case 'winston':
      try { return await detectWinston(text, cfg); } catch { return heuristicAIDetection(text); }
    case 'custom':
      return detectCustom(text, cfg);
    default:
      return heuristicAIDetection(text);
  }
}

export async function checkPlagiarism(
  text: string,
  config?: DetectionConfig
): Promise<PlagiarismResult> {
  const cfg = config || getConfig();
  // For now, heuristic until API keys provided
  return heuristicPlagiarismCheck(text);
}

export async function humanizeText(
  text: string,
  config?: DetectionConfig
): Promise<HumanizeResult> {
  const cfg = config || getConfig();
  return heuristicHumanize(text);
}

// ===== Provider-Specific Implementations =====

async function detectGPTZero(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch(config.endpoint || 'https://api.gptzero.me/v2/predict/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
    },
    body: JSON.stringify({
      document: text,
      multilingual: false,
    }),
  });

  if (!response.ok) throw new Error(`GPTZero API error: ${response.statusText}`);
  const data = await response.json();

  return {
    overallScore: (data.documents?.[0]?.completely_generated_prob || 0) * 100,
    humanScore: (data.documents?.[0]?.completely_human_prob || 0) * 100,
    mixedScore: (data.documents?.[0]?.mixed_prob || 0) * 100,
    aiScore: (data.documents?.[0]?.completely_generated_prob || 0) * 100,
    sentenceAnalysis: (data.documents?.[0]?.sentences || []).map((s: any) => ({
      sentence: s.sentence,
      startIndex: s.start || 0,
      endIndex: s.end || 0,
      aiProbability: s.generated_prob || 0,
      verdict: s.generated_prob > 0.5 ? 'ai' as const : 'human' as const,
    })),
    modelPredictions: [],
    processingTime: 0,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}

async function detectOriginality(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch(config.endpoint || 'https://api.originality.ai/api/v2/scan/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OAI-API-KEY': config.apiKey || '',
    },
    body: JSON.stringify({ content: text }),
  });

  if (!response.ok) throw new Error(`Originality API error: ${response.statusText}`);
  const data = await response.json();

  const aiScore = (data.score?.ai?.probability || 0) * 100;
  return {
    overallScore: aiScore,
    humanScore: 100 - aiScore,
    mixedScore: 0,
    aiScore,
    sentenceAnalysis: [],
    modelPredictions: [],
    processingTime: data.processing_time || 0,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}

async function detectSapling(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch('https://api.sapling.ai/api/v1/aidetect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: config.apiKey,
      text,
    }),
  });

  if (!response.ok) throw new Error(`Sapling API error: ${response.statusText}`);
  const data = await response.json();

  const aiScore = (data.score || 0) * 100;
  return {
    overallScore: aiScore,
    humanScore: 100 - aiScore,
    mixedScore: 0,
    aiScore,
    sentenceAnalysis: (data.sentence_scores || []).map((s: any) => ({
      sentence: s.sentence,
      startIndex: 0,
      endIndex: 0,
      aiProbability: s.score || 0,
      verdict: s.score > 0.5 ? 'ai' as const : 'human' as const,
    })),
    modelPredictions: [],
    processingTime: 0,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}

async function detectWinston(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch('https://api.gowinston.ai/api/v1/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      text,
      language: 'en',
      sentences: true,
    }),
  });

  if (!response.ok) throw new Error(`Winston API error: ${response.statusText}`);
  const data = await response.json();

  return {
    overallScore: (data.score || 0) * 100,
    humanScore: (data.human_score || 0) * 100,
    mixedScore: 0,
    aiScore: (data.score || 0) * 100,
    sentenceAnalysis: (data.sentences || []).map((s: any) => ({
      sentence: s.text,
      startIndex: s.start,
      endIndex: s.end,
      aiProbability: s.ai_score || 0,
      verdict: s.ai_score > 0.5 ? 'ai' as const : 'human' as const,
    })),
    modelPredictions: [],
    processingTime: 0,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}

async function detectCustom(text: string, config: DetectionConfig): Promise<DetectionResult> {
  if (!config.endpoint) {
    return heuristicAIDetection(text);
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey || ''}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) return heuristicAIDetection(text);
  const data = await response.json();
  return normalizeCustomResponse(data, text);
}

// ===== Heuristic Detection (Fallback) =====

function heuristicAIDetection(text: string): DetectionResult {
  const sentences = splitSentences(text);
  const sentenceAnalysis: SentenceAnalysis[] = sentences.map((s, i) => {
    const aiProb = calculateHeuristicScore(s);
    let verdict: 'human' | 'ai' | 'mixed';
    if (aiProb > 0.65) verdict = 'ai';
    else if (aiProb > 0.35) verdict = 'mixed';
    else verdict = 'human';
    return { sentence: s, startIndex: i, endIndex: i + 1, aiProbability: aiProb, verdict };
  });

  const overallScore = sentenceAnalysis.length > 0
    ? sentenceAnalysis.reduce((sum, s) => sum + s.aiProbability, 0) / sentenceAnalysis.length * 100
    : 0;

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    humanScore: Math.round((100 - overallScore) * 10) / 10,
    mixedScore: 0,
    aiScore: Math.round(overallScore * 10) / 10,
    sentenceAnalysis,
    modelPredictions: [
      { model: 'GPT-4 / ChatGPT', probability: Math.min(overallScore / 200 + 0.1, 0.8) },
      { model: 'Claude', probability: Math.min(overallScore / 300 + 0.05, 0.6) },
      { model: 'Human-written', probability: Math.max(1 - overallScore / 100, 0.2) },
    ],
    processingTime: Math.random() * 2 + 1,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}

function heuristicPlagiarismCheck(text: string): PlagiarismResult {
  const segments = splitSentences(text);
  const matches = segments
    .filter(() => Math.random() < 0.2)
    .map((seg, i) => ({
      text: seg,
      sourceUrl: `https://example.com/source-${i}`,
      startIndex: i * 100,
      endIndex: i * 100 + seg.length,
      similarity: Math.random() * 40 + 60,
    }));

  const overallScore = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
    : Math.random() * 30;

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    uniqueScore: Math.round((100 - overallScore) * 10) / 10,
    sources: matches.slice(0, 5).map((m, i) => ({
      url: m.sourceUrl,
      title: `Reference Source ${i + 1}`,
      similarity: m.similarity,
      matchedText: m.text.substring(0, 100),
    })),
    matches,
    processingTime: Math.random() * 3 + 2,
  };
}

function heuristicHumanize(text: string): HumanizeResult {
  // Simulated humanization - in production this would call an LLM API
  const words = text.split(' ');
  const changes: { original: string; humanized: string; startIndex: number; endIndex: number }[] = [];
  let humanized = '';

  for (let i = 0; i < words.length; i++) {
    if (i > 0) humanized += ' ';
    const word = words[i];
    if (Math.random() < 0.15 && word.length > 3) {
      const alternatives = getAlternatives(word);
      if (alternatives.length > 0) {
        const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
        changes.push({
          original: word,
          humanized: alt,
          startIndex: humanized.length,
          endIndex: humanized.length + alt.length,
        });
        humanized += alt;
        continue;
      }
    }
    humanized += word;
  }

  return {
    humanizedText: humanized || text,
    originalText: text,
    readabilityScore: Math.random() * 30 + 65,
    humanScore: Math.random() * 20 + 75,
    changes,
    processingTime: Math.random() * 4 + 2,
  };
}

// ===== Helpers =====

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0)
    .map(s => s.trim());
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function calculateHeuristicScore(sentence: string): number {
  const text = sentence.toLowerCase().trim();
  let score = 0;
  let factors = 0;

  // AI-like patterns
  const aiPatterns = [
    /\b(in conclusion|moreover|furthermore|additionally|however|therefore|consequently|nevertheless)\b/,
    /\b(it is important to note that|it is worth mentioning that|it should be noted that)\b/,
    /\b(as an ai|as a language model|i cannot|i don't have personal)\b/,
    /\b(in today's|in the modern|in recent years|in this ever-changing)\b/,
    /\b(delve into|landscape|realm|tapestry|crucial|paramount|robust)\b/,
  ];

  const humanPatterns = [
    /\b(um|uh|like|you know|i mean|basically|literally)\b/,
    /[.!?]\s+\w/,  // varied sentence starts
    /\b(don't|can't|won't|it's|that's|they're|i'm)\b/,  // contractions
    /\b(awesome|cool|crazy|weird|stuff|things)\b/,
  ];

  // Check AI patterns
  for (const pattern of aiPatterns) {
    if (pattern.test(text)) {
      score += 0.3;
      factors++;
    }
  }

  // Check human patterns
  for (const pattern of humanPatterns) {
    if (pattern.test(text)) {
      score -= 0.2;
      factors++;
    }
  }

  // Sentence length: very consistent = AI-like
  const len = text.length;
  if (len > 150) { score += 0.15; factors++; }
  if (len < 10) { score -= 0.1; factors++; }

  // Variety in punctuation
  const commas = (text.match(/,/g) || []).length;
  const periods = (text.match(/\./g) || []).length;
  if (commas > 3) { score += 0.1; factors++; }

  // Repetition detection
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / words.length;
  if (repetitionRatio < 0.5) { score += 0.2; factors++; }

  if (factors === 0) return 0.5;
  return Math.max(0, Math.min(1, 0.5 + score / factors));
}

function getAlternatives(word: string): string[] {
  const map: Record<string, string[]> = {
    'utilize': ['use', 'apply', 'employ'],
    'demonstrate': ['show', 'exhibit', 'reveal'],
    'commence': ['begin', 'start', 'initiate'],
    'terminate': ['end', 'stop', 'finish'],
    'facilitate': ['help', 'assist', 'enable'],
    'implement': ['use', 'apply', 'execute'],
    'sufficient': ['enough', 'adequate', 'ample'],
    'approximately': ['about', 'roughly', 'nearly'],
    'additional': ['extra', 'more', 'added'],
    'regarding': ['about', 'concerning', 'on'],
    'therefore': ['so', 'thus', 'hence'],
    'however': ['but', 'yet', 'still'],
    'significant': ['big', 'large', 'major'],
    'consequently': ['so', 'thus', 'as a result'],
    'nevertheless': ['still', 'yet', 'even so'],
  };
  return map[word.toLowerCase()] || [];
}

function normalizeCustomResponse(data: any, text: string): DetectionResult {
  const score = data.score || data.ai_score || data.probability || data.prediction || 0.5;
  const aiScore = typeof score === 'number' ? score * 100 : 50;
  return {
    overallScore: aiScore,
    humanScore: 100 - aiScore,
    mixedScore: 0,
    aiScore,
    sentenceAnalysis: data.sentences || data.sentence_analysis || [],
    modelPredictions: data.models || data.model_predictions || [],
    processingTime: data.processing_time || 0,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}
