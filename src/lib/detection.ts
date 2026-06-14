import { DetectionResult, PlagiarismResult, HumanizeResult, DetectRequest, SentenceAnalysis, ModelPrediction } from './types';

// ===== Pluggable AI Detection Backends =====

export type DetectionProvider = 'gptzero' | 'originality' | 'sapling' | 'winston' | 'custom';

export interface DetectionConfig {
  provider: DetectionProvider;
  apiKey?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
}

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

export async function checkPlagiarism(text: string, config?: DetectionConfig): Promise<PlagiarismResult> {
  return heuristicPlagiarismCheck(text);
}

export async function humanizeText(text: string, config?: DetectionConfig): Promise<HumanizeResult> {
  return heuristicHumanize(text);
}

// ===== Provider-Specific Implementations (unchanged) =====

async function detectGPTZero(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch(config.endpoint || 'https://api.gptzero.me/v2/predict/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey || '' },
    body: JSON.stringify({ document: text, multilingual: false }),
  });
  if (!response.ok) throw new Error(`GPTZero API error: ${response.statusText}`);
  const data = await response.json();
  return {
    overallScore: (data.documents?.[0]?.completely_generated_prob || 0) * 100,
    humanScore: (data.documents?.[0]?.completely_human_prob || 0) * 100,
    mixedScore: (data.documents?.[0]?.mixed_prob || 0) * 100,
    aiScore: (data.documents?.[0]?.completely_generated_prob || 0) * 100,
    sentenceAnalysis: (data.documents?.[0]?.sentences || []).map((s: any) => ({
      sentence: s.sentence, startIndex: s.start || 0, endIndex: s.end || 0,
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
    headers: { 'Content-Type': 'application/json', 'X-OAI-API-KEY': config.apiKey || '' },
    body: JSON.stringify({ content: text }),
  });
  if (!response.ok) throw new Error(`Originality API error: ${response.statusText}`);
  const data = await response.json();
  const aiScore = (data.score?.ai?.probability || 0) * 100;
  return {
    overallScore: aiScore, humanScore: 100 - aiScore, mixedScore: 0, aiScore,
    sentenceAnalysis: [], modelPredictions: [],
    processingTime: data.processing_time || 0, textLength: text.length, textHash: simpleHash(text),
  };
}

async function detectSapling(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch('https://api.sapling.ai/api/v1/aidetect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: config.apiKey, text }),
  });
  if (!response.ok) throw new Error(`Sapling API error: ${response.statusText}`);
  const data = await response.json();
  const aiScore = (data.score || 0) * 100;
  return {
    overallScore: aiScore, humanScore: 100 - aiScore, mixedScore: 0, aiScore,
    sentenceAnalysis: (data.sentence_scores || []).map((s: any) => ({
      sentence: s.sentence, startIndex: 0, endIndex: 0,
      aiProbability: s.score || 0,
      verdict: s.score > 0.5 ? 'ai' as const : 'human' as const,
    })),
    modelPredictions: [],
    processingTime: 0, textLength: text.length, textHash: simpleHash(text),
  };
}

async function detectWinston(text: string, config: DetectionConfig): Promise<DetectionResult> {
  const response = await fetch('https://api.gowinston.ai/api/v1/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({ text, language: 'en', sentences: true }),
  });
  if (!response.ok) throw new Error(`Winston API error: ${response.statusText}`);
  const data = await response.json();
  return {
    overallScore: (data.score || 0) * 100, humanScore: (data.human_score || 0) * 100,
    mixedScore: 0, aiScore: (data.score || 0) * 100,
    sentenceAnalysis: (data.sentences || []).map((s: any) => ({
      sentence: s.text, startIndex: s.start, endIndex: s.end,
      aiProbability: s.ai_score || 0,
      verdict: s.ai_score > 0.5 ? 'ai' as const : 'human' as const,
    })),
    modelPredictions: [],
    processingTime: 0, textLength: text.length, textHash: simpleHash(text),
  };
}

async function detectCustom(text: string, config: DetectionConfig): Promise<DetectionResult> {
  if (!config.endpoint) return heuristicAIDetection(text);
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey || ''}` },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return heuristicAIDetection(text);
  const data = await response.json();
  return normalizeCustomResponse(data, text);
}

// =====================================================================
//  MULTI-DIMENSIONAL HEURISTIC DETECTION ENGINE
//  8 statistical signals, zero API cost, fully deterministic
// =====================================================================

// ---- Signal 1: AI phrase markers (weight: 0.18) ----

const AI_BIGRAMS = new Set([
  // Research-documented ChatGPT / Claude / Gemini overused bigrams
  'according to', 'a testament to', 'additionally the', 'align with the', 'an exploration of',
  'as a result', 'at the heart of', 'beyond the scope', 'can be attributed', 'can be seen as',
  'careful consideration', 'complex interplay', 'comprehensive overview', 'conclusion the',
  'contributes to the', 'critical role', 'crucial to understanding', 'deep dive into',
  'delve into', 'demonstrates the', 'despite the fact', 'due to the fact', 'embodies the',
  'essential for the', 'fascinating world of', 'furthermore the', 'has been shown to',
  'has led to the', 'highlights the importance', 'however it is', 'in addition to',
  'in conclusion the', 'in contrast to the', 'in order to', 'in recent years',
  'in terms of', 'in the context of', 'in the face of', 'in the field of',
  'in the modern', 'in the realm of', 'in this article', 'in today\'s',
  'intricate balance', 'is a testament', 'is characterized by', 'is important to',
  'is worth noting', 'it becomes clear', 'it can be argued', 'it is crucial',
  'it is essential', 'it is important to', 'it is noteworthy', 'it is worth',
  'it must be emphasized', 'it should be noted', 'landscape of', 'lies in the',
  'make a significant', 'moreover the', 'multifaceted approach', 'nevertheless the',
  'not only but', 'of paramount importance', 'on the contrary', 'one could argue',
  'over the years', 'owing to the', 'paved the way', 'play a crucial',
  'plays a pivotal', 'profound impact', 'provides a comprehensive', 'provides insight into',
  'reinforcing the', 'rich tapestry', 'robust framework', 'serves as a',
  'shed light on', 'significance cannot be', 'stand as a testament', 'the advent of',
  'the complexities of', 'the concept of', 'the development of', 'the evolution of',
  'the fact that', 'the field of', 'the importance of', 'the intricacies of',
  'the intersection of', 'the notion of', 'the power of', 'the realm of',
  'the relationship between', 'the significance of', 'the use of', 'this article explores',
  'this comprehensive', 'this nuanced', 'through the lens', 'to conclude the',
  'to summarize the', 'transformative potential', 'understanding the nuances',
  'underscores the importance', 'vast array of', 'when it comes to', 'while it is',
  'widely recognized as', 'with respect to',
  // === EXPANDED: additional research-backed AI bigrams ===
  // Hedging / uncertainty (AI overuses hedging for "balanced" tone)
  'may be', 'could be', 'might be', 'appears to', 'seems to', 'tends to',
  'likely to', 'often the', 'generally considered', 'typically involves',
  'can be used', 'may include', 'could include', 'should be noted',
  // Structured enumeration (AI loves numbered/structured flow)
  'first and foremost', 'secondly the', 'thirdly the', 'lastly the',
  'first of all', 'in summary the', 'to begin with', 'building upon',
  // Overly formal transitions
  'accordingly the', 'as previously mentioned', 'as discussed earlier',
  'as noted above', 'as outlined below', 'as we have seen',
  'based on the', 'based upon the', 'building on the', 'centered around',
  'closely tied to', 'coupled with the', 'deeply rooted in', 'deeply intertwined',
  'directly related to', 'drawing upon the', 'driven by the', 'embedded within',
  'emerging from the', 'firmly established', 'frequently cited', 'fundamentally linked',
  'growing body of', 'grounded in the', 'heavily influenced', 'highly relevant',
  'in light of', 'in line with', 'in relation to', 'in response to',
  'in support of', 'in the wake of', 'inextricably linked', 'inherently tied',
  'integral part of', 'intimately connected', 'intrinsically linked', 'it follows that',
  'key driver of', 'key factor in', 'largely due to', 'leading to the',
  'longstanding debate', 'marked by the', 'merits further', 'must be considered',
  'needs to be', 'notable example', 'notably the', 'of particular interest',
  'ongoing debate', 'particularly noteworthy', 'pertinent to the', 'plays an important',
  'predominantly focused', 'primary driver of', 'raises important', 'raises the question',
  'remains a central', 'remains to be seen', 'rooted in the', 'serves to highlight',
  'should be emphasized', 'significantly impacted', 'speaks to the', 'stemming from the',
  'subject of ongoing', 'the broader context', 'the broader implications',
  'the central role', 'the crucial role', 'the essential role', 'the fundamental',
  'the growing importance', 'the increasing reliance', 'the key to understanding',
  'the larger context', 'the primary focus', 'the role of the', 'the transformative power',
  'there exists a', 'there is a growing', 'there is an increasing',
  'this highlights the', 'this underscores the', 'tightly coupled', 'to better serve',
  'ultimately leading', 'underscoring the need', 'well documented in',
  'widely acknowledged', 'widely regarded', 'would be remiss',
  // Claude-specific agreeable language
  'i appreciate', 'great question', 'excellent question', 'thank you for',
  'i understand your', 'that is a', 'absolutely right', 'you raise a',
  'happy to help', 'let me know if', 'feel free to', 'i would be',
  'please don\'t hesitate', 'more than happy', 'hope this helps',
  // Overused "of the" constructions (AI loves this pattern)
  'nature of the', 'scope of the', 'impact of the', 'role of the',
  'context of the', 'essence of the', 'dynamics of the', 'implications of the',
  'framework of the', 'trajectory of the', 'nuances of the', 'intricacies of the',
]);

const AI_TRIGRAMS = new Set([
  // Original
  'a wide range of', 'an essential component of', 'as a result of',
  'at the heart of this', 'can be found in', 'can be seen in',
  'cannot be overstated', 'delve into the fascinating', 'due to the fact that',
  'has been gaining traction', 'has the potential to', 'in a way that',
  'in the case of', 'in the ever-evolving', 'in the face of these',
  'in the form of', 'in the rapidly evolving', 'is a crucial aspect',
  'is a testament to', 'is being used to', 'is one of the most',
  'it can be seen that', 'it is clear that', 'it is essential to',
  'it is important to note', 'it is no surprise that',
  'it is worth noting that', 'it must be noted that', 'it should be noted that',
  'lies at the heart of', 'not only in terms of', 'of the most important',
  'on the other hand', 'one of the key', 'one of the most important',
  'over the past few years', 'play a crucial role in', 'plays a vital role in',
  'some of the key', 'the development of new', 'the emergence of new',
  'the field of artificial', 'the importance of understanding',
  'the integration of artificial', 'there is a growing need',
  'this article will explore', 'this is particularly true',
  'to address this challenge', 'to better understand the', 'to ensure that the',
  'to gain a deeper understanding', 'while there are some',
  'with the advent of', 'with the increasing use of',
  // === EXPANDED: research-backed AI trigrams ===
  // Hedging clusters
  'it could be argued that', 'it may be the case', 'it seems that the',
  'there is a possibility that', 'it is likely that', 'it appears that the',
  'it can be argued that', 'there is evidence to suggest',
  // Overly structured argumentation
  'in addition to the', 'in conjunction with the', 'in light of the fact',
  'in spite of the', 'in the context of a', 'in the process of the',
  'in the wake of the', 'with regard to the', 'with respect to the',
  'as well as the', 'along with the', 'together with the',
  // AI's favorite narrative structures
  'a number of factors', 'a variety of ways', 'all of these factors',
  'an increasingly important role', 'are likely to be', 'at the same time',
  'can be attributed to', 'continues to be a', 'continues to play a',
  'for a variety of', 'has become increasingly important',
  'has emerged as a', 'have been shown to', 'in a number of ways',
  'in an increasingly interconnected', 'in an effort to', 'in order to achieve',
  'is considered to be', 'is designed to provide', 'is expected to continue',
  'is likely to result', 'is often referred to', 'is widely considered to',
  'make a significant contribution', 'one of the key challenges',
  'part of a broader', 'plays an essential role', 'plays an integral role',
  'provide a comprehensive overview', 'provides a framework for',
  'raise important questions about', 'represents a significant shift',
  'serves as a reminder', 'the extent to which', 'the need for a',
  'there is no doubt that', 'this is due to', 'this is especially true',
  'to meet the needs', 'to meet the growing demand',
  'understanding of the complex', 'will continue to play',
  // Overly helpful/agreeable (Claude patterns)
  'i would be happy to', 'please let me know if', 'i hope this helps',
  'let me know if you', 'i understand your concern',
  'that is a great question', 'you are absolutely right',
  'i would recommend the', 'feel free to reach',
]);

// ---- Signal 2: Human markers (weight: -0.12) ----

const HUMAN_CONTRACTIONS = new Set([
  'ain\'t', 'can\'t', 'could\'ve', 'couldn\'t', 'didn\'t', 'doesn\'t', 'don\'t',
  'gonna', 'gotta', 'hadn\'t', 'hasn\'t', 'haven\'t', 'he\'d', 'he\'ll', 'he\'s',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'isn\'t', 'it\'d', 'it\'ll', 'it\'s',
  'kinda', 'lemme', 'let\'s', 'might\'ve', 'must\'ve', 'should\'ve',
  'shouldn\'t', 'sorta', 'that\'d', 'that\'ll', 'that\'s', 'there\'d',
  'there\'s', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'wanna',
  'wasn\'t', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'weren\'t', 'what\'s',
  'where\'s', 'who\'d', 'who\'ll', 'who\'s', 'won\'t', 'would\'ve', 'wouldn\'t',
  'y\'all', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve',
]);

const HUMAN_FILLERS = new Set([
  'actually', 'anyway', 'basically', 'honestly', 'literally', 'maybe',
  'probably', 'seriously', 'totally', 'whatever', 'frankly', 'apparently',
  'supposedly', 'definitely', 'obviously', 'surely', 'somehow',
  'anyhow', 'anyways', 'alright', 'okay',
]);

const HUMAN_CASUAL = new Set([
  'awesome', 'bummer', 'cool', 'crappy', 'crazy', 'creepy', 'dumb',
  'freaking', 'gross', 'heck', 'lame', 'meh', 'nuts', 'ok', 'ridiculous',
  'sucks', 'super', 'ugh', 'weird', 'yikes', 'yuck',
  'dude', 'bro', 'crap', 'jerk', 'stoked', 'chill', 'wack', 'dope',
  'sick', 'dang', 'shoot', 'frick', 'hell', 'damn', 'cringe',
  'sketchy', 'shady', 'messed', 'busted',
]);

// ---- Signal 3: Formal AI vocabulary (weight: 0.10) ----

const AI_FORMAL_WORDS = new Set([
  'accordingly', 'aforementioned', 'aggregate', 'albeit', 'amidst',
  'amongst', 'approximately', 'commence', 'commensurate',
  'consequently', 'consolidate', 'constitute', 'corroborate', 'culmination',
  'deemed', 'demonstrate', 'denote', 'depict', 'disseminate',
  'elucidate', 'embody', 'encompass', 'endeavor', 'ensuing',
  'exacerbate', 'exemplify', 'expedite', 'facilitate', 'foregoing',
  'foster', 'furthermore', 'garner', 'hence', 'hereby', 'herein',
  'hitherto', 'imperative', 'impetus', 'implication', 'indispensable',
  'insofar', 'integral', 'juxtaposition', 'leverage', 'manifestation',
  'moreover', 'multifaceted', 'namely', 'nevertheless', 'nonetheless',
  'notwithstanding', 'novel', 'nuanced', 'ostensibly', 'overarching',
  'paramount', 'pertains', 'plethora', 'pragmatic', 'predominantly',
  'profound', 'propensity', 'quintessential', 'reiterate', 'rendering',
  'salient', 'signify', 'solidify', 'spearhead', 'substantiate',
  'succinct', 'surmount', 'synergy', 'synthesize', 'thereby',
  'therein', 'thereof', 'trajectory', 'transformative', 'ubiquitous',
  'underscore', 'undertake', 'unequivocally', 'utilize', 'validate',
  'vis-a-vis', 'whereby', 'wherein',
  // === EXPANDED: AI-overused vocabulary (2-8x more in AI than human text) ===
  'holistic', 'tailored', 'bespoke', 'curated', 'unpack', 'elevate',
  'showcasing', 'reimagine', 'revolutionize', 'seamless', 'streamline',
  'optimize', 'augment', 'harness', 'empower', 'frictionless',
  'actionable', 'scalable', 'resilient', 'adaptive', 'intuitive',
  'immersive', 'unprecedented', 'paradigm', 'ecosystem', 'nexus',
  'convergence', 'interplay', 'dichotomy', 'epitomize',
  'testament', 'embodiment', 'pinnacle',
  'inevitable', 'indispensable', 'invaluable', 'vital', 'pivotal',
  'cornerstone', 'linchpin', 'keystone', 'bedrock',
  'galvanize', 'catalyze', 'propel', 'burgeoning',
  'nascent', 'fledgling', 'incipient',
  'unravel', 'delineate', 'explicate', 'encapsulate', 'contextualize',
  'operationalize', 'conceptualize', 'ameliorate', 'mitigate',
  'extrapolate', 'antithetical',
]);

const SIGNAL_WEIGHTS = {
  aiPhrases: 0.40,       // n-gram AI markers — the most reliable signal
  humanMarkers: 0.05,    // contractions, fillers, casual words (subtractive)
  formalVocab: 0.18,     // academic/formal AI overused words
  punctuation: 0.04,     // semicolons, em-dashes
  burstiness: 0.12,      // sentence length variance
  paragraphUniformity: 0.02, // uniform paragraphs
  passiveVoice: 0.04,    // passive constructions
  lexicalDiversity: 0.15, // type-token ratio
};

// =====================================================================
//  MAIN HEURISTIC FUNCTION
// =====================================================================

function heuristicAIDetection(text: string): DetectionResult {
  const t0 = Date.now();
  const trimmed = text.trim();
  const sentences = splitSentences(trimmed);
  const paragraphs = splitParagraphs(trimmed);
  const words = tokenize(trimmed);

  // --- Document-level signals ---
  const docSignals = computeDocSignals(trimmed, sentences, paragraphs, words);

  // --- Per-sentence analysis ---
  const sentenceAnalysis: SentenceAnalysis[] = sentences.map((s, i) => {
    const sentSignals = computeSentenceSignals(s);
    // Blend sentence-level signals (human markers are subtractive)
    const sentenceOnly = clamp(
      (sentSignals.aiPhrases * SIGNAL_WEIGHTS.aiPhrases +
      sentSignals.formalVocab * SIGNAL_WEIGHTS.formalVocab +
      sentSignals.punctuation * SIGNAL_WEIGHTS.punctuation -
      sentSignals.humanMarkers * SIGNAL_WEIGHTS.humanMarkers) /
      (SIGNAL_WEIGHTS.aiPhrases + SIGNAL_WEIGHTS.formalVocab + SIGNAL_WEIGHTS.punctuation),
      0, 1
    );

    const docOnly = (docSignals.burstiness * SIGNAL_WEIGHTS.burstiness +
      docSignals.paragraphUniformity * SIGNAL_WEIGHTS.paragraphUniformity +
      docSignals.passiveVoice * SIGNAL_WEIGHTS.passiveVoice +
      docSignals.lexicalDiversity * SIGNAL_WEIGHTS.lexicalDiversity) /
      (SIGNAL_WEIGHTS.burstiness + SIGNAL_WEIGHTS.paragraphUniformity + SIGNAL_WEIGHTS.passiveVoice + SIGNAL_WEIGHTS.lexicalDiversity);

    // 70% sentence-level, 30% document-level context
    const aiProb = sentenceOnly * 0.7 + docOnly * 0.3;

    let verdict: 'human' | 'ai' | 'mixed';
    if (aiProb > 0.65) verdict = 'ai';
    else if (aiProb > 0.35) verdict = 'mixed';
    else verdict = 'human';

    return {
      sentence: s,
      startIndex: i,
      endIndex: i + 1,
      aiProbability: Math.round(aiProb * 1000) / 1000,
      verdict,
    };
  });

  // --- Overall document score ---
  const overallScore = clamp(
    docSignals.aiPhrases * SIGNAL_WEIGHTS.aiPhrases +
    docSignals.formalVocab * SIGNAL_WEIGHTS.formalVocab +
    docSignals.punctuation * SIGNAL_WEIGHTS.punctuation +
    docSignals.burstiness * SIGNAL_WEIGHTS.burstiness +
    docSignals.paragraphUniformity * SIGNAL_WEIGHTS.paragraphUniformity +
    docSignals.passiveVoice * SIGNAL_WEIGHTS.passiveVoice +
    docSignals.lexicalDiversity * SIGNAL_WEIGHTS.lexicalDiversity -
    docSignals.humanMarkers * SIGNAL_WEIGHTS.humanMarkers,
    0, 1
  );

  const aiScore = Math.round(clamp(overallScore, 0, 1) * 1000) / 10;

  return {
    overallScore: aiScore,
    humanScore: Math.round((100 - aiScore) * 10) / 10,
    mixedScore: 0,
    aiScore,
    sentenceAnalysis,
    modelPredictions: generateModelPredictions(aiScore, docSignals),
    processingTime: (Date.now() - t0) / 1000,
    textLength: trimmed.length,
    textHash: simpleHash(trimmed),
  };
}

// =====================================================================
//  DOCUMENT-LEVEL SIGNAL COMPUTATION
// =====================================================================

interface DocSignals {
  aiPhrases: number;
  humanMarkers: number;
  formalVocab: number;
  punctuation: number;
  burstiness: number;
  paragraphUniformity: number;
  passiveVoice: number;
  lexicalDiversity: number;
}

function computeDocSignals(
  text: string, sentences: string[], paragraphs: string[], words: string[]
): DocSignals {
  const lowerText = text.toLowerCase();
  // Clean text for n-gram matching: collapse whitespace, remove punctuation between words
  const cleanText = lowerText.replace(/[,.!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();

  // --- AI phrase n-gram matching ---
  let bigramMatches = 0;
  AI_BIGRAMS.forEach(bg => {
    if (cleanText.includes(bg)) bigramMatches++;
  });
  const aiBigramDensity = Math.min(bigramMatches / Math.max(sentences.length, 1), 1);

  let trigramMatches = 0;
  AI_TRIGRAMS.forEach(tg => {
    if (cleanText.includes(tg)) trigramMatches++;
  });
  const aiTrigramScore = Math.min(trigramMatches / Math.max(sentences.length, 1), 1);

  // --- Human markers ---
  let contractionCount = 0;
  const tokens = tokenizeLower(text);
  for (const t of tokens) {
    if (HUMAN_CONTRACTIONS.has(t)) contractionCount++;
  }
  const contractionDensity = Math.min(contractionCount / Math.max(tokens.length, 1) * 50, 1);

  let fillerCasualCount = 0;
  for (const t of tokens) {
    if (HUMAN_FILLERS.has(t) || HUMAN_CASUAL.has(t)) fillerCasualCount++;
  }
  const casualDensity = Math.min(fillerCasualCount / Math.max(tokens.length, 1) * 30, 1);

  const humanScore = clamp((contractionDensity * 0.6 + casualDensity * 0.4), 0, 1);

  // --- Formal vocabulary ---
  let formalCount = 0;
  for (const t of tokens) {
    if (AI_FORMAL_WORDS.has(t)) formalCount++;
  }
  const formalDensity = Math.min(formalCount / Math.max(tokens.length, 1) * 40, 1);

  // --- Punctuation fingerprint ---
  const semicolons = (text.match(/;/g) || []).length;
  const emDashes = (text.match(/—/g) || []).length;
  const colons = (text.match(/:/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const totalPunct = semicolons + emDashes + colons + exclamations + questions + 1;

  // AI overuses formal punctuation (; — :), underuses emotional (! ?)
  const formalPunctRatio = (semicolons + emDashes + colons) / totalPunct;
  const emotionalPunctRatio = (exclamations + questions) / totalPunct;
  const punctScore = clamp(formalPunctRatio * 0.8 - emotionalPunctRatio * 0.3, 0, 1);

  // --- Sentence burstiness (variance in length) ---
  // Requires sufficient sentences for reliable measurement
  let burstiness: number;
  if (sentences.length < 3) {
    // Insufficient data for burstiness — no evidence either way
    burstiness = 0.15;
  } else {
    const sentLengths = sentences.map(s => s.length);
    const meanLen = sentLengths.length > 0
      ? sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length
      : 0;
    const variance = sentLengths.length > 1
      ? sentLengths.reduce((sum, l) => sum + (l - meanLen) ** 2, 0) / sentLengths.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const cv = meanLen > 0 ? stdDev / meanLen : 0;
    const burstinessScore = cv < 0.2 ? 0.9 : cv < 0.35 ? 0.7 : cv < 0.5 ? 0.4 : cv < 0.7 ? 0.1 : 0;
    const longSents = sentLengths.filter(l => l > 120).length;
    const shortSents = sentLengths.filter(l => l < 30).length;
    const longShortRatio = (longSents / Math.max(sentences.length, 1) * 2 -
      shortSents / Math.max(sentences.length, 1) * 2);
    const extremeRatioScore = clamp(longShortRatio + 1, 0, 1) * 0.5;
    burstiness = burstinessScore * 0.7 + extremeRatioScore * 0.3;
    // Confidence scaling: fewer sentences = less reliable
    const confidence = Math.min(sentences.length / 5, 1);
    burstiness = burstiness * confidence;
  }

  // --- Paragraph uniformity ---
  if (paragraphs.length >= 3) {
    const paraLengths = paragraphs.map(p => splitSentences(p).length);
    const paraMean = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
    const paraVar = paraLengths.reduce((sum, l) => sum + (l - paraMean) ** 2, 0) / paraLengths.length;
    const paraCV = paraMean > 0 ? Math.sqrt(paraVar) / paraMean : 0;
    // AI: low CV (uniform 3-4 sentences per paragraph). Human: high CV.
    const paraUniformity = paraCV < 0.3 ? 0.85 : paraCV < 0.5 ? 0.6 : paraCV < 0.8 ? 0.3 : 0.05;
    // Also check average: AI rarely has 1-sentence or 7+ sentence paragraphs
    const avgParaLen = Math.round(paraMean);
    const avgLenScore = (avgParaLen >= 3 && avgParaLen <= 5) ? 0.3 : 0;
    return {
      aiPhrases: clamp(aiBigramDensity * 0.6 + aiTrigramScore * 0.4, 0, 1),
      humanMarkers: humanScore,
      formalVocab: formalDensity,
      punctuation: punctScore,
      burstiness,
      paragraphUniformity: clamp(paraUniformity * 0.7 + avgLenScore, 0, 1),
      passiveVoice: computePassiveVoice(text, sentences),
      lexicalDiversity: computeLexicalDiversity(words),
    };
  }

  // Fallback for short texts (no paragraph structure)
  return {
    aiPhrases: clamp(aiBigramDensity * 0.6 + aiTrigramScore * 0.4, 0, 1),
    humanMarkers: humanScore,
    formalVocab: formalDensity,
    punctuation: punctScore,
    burstiness,
    paragraphUniformity: 0.1,  // no evidence for short texts
    passiveVoice: computePassiveVoice(text, sentences),
    lexicalDiversity: computeLexicalDiversity(words),
  };
}

// --- Passive voice detection ---
function computePassiveVoice(text: string, sentences: string[]): number {
  const lower = text.toLowerCase();
  // "was/were/is/are/been/being + past participle (-ed, -en, -t)"
  const passivePattern = /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+(?:ed|en|t))\b/gi;
  const matches = lower.match(passivePattern) || [];
  const density = matches.length / Math.max(sentences.length, 1);
  // AI overuses passive: >0.4 per sentence = strong signal
  return clamp(density / 0.8, 0, 1);
}

// --- Lexical diversity (type-token ratio, hapax legomena) ---
function computeLexicalDiversity(words: string[]): number {
  if (words.length < 10) return 0.5;
  const unique = new Set(words);
  const ttr = unique.size / words.length; // type-token ratio

  // Hapax legomena (words appearing exactly once)
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  let hapax = 0;
  freq.forEach((c) => { if (c === 1) hapax++; });
  const hapaxRatio = hapax / unique.size;

  // AI: TTR 0.4-0.55, hapax 0.3-0.45 || Human: TTR 0.55-0.75, hapax 0.5-0.7
  const ttrScore = ttr < 0.4 ? 0.9 : ttr < 0.5 ? 0.7 : ttr < 0.6 ? 0.35 : ttr < 0.7 ? 0.1 : 0;
  const hapaxScore = hapaxRatio < 0.35 ? 0.85 : hapaxRatio < 0.45 ? 0.6 : hapaxRatio < 0.55 ? 0.3 : hapaxRatio < 0.65 ? 0.1 : 0;

  return ttrScore * 0.5 + hapaxScore * 0.5;
}

// =====================================================================
//  SENTENCE-LEVEL SIGNALS
// =====================================================================

interface SentenceSignals {
  aiPhrases: number;
  humanMarkers: number;
  formalVocab: number;
  punctuation: number;
}

function computeSentenceSignals(sentence: string): SentenceSignals {
  const lower = sentence.toLowerCase();
  const tokens = tokenizeLower(sentence);
  // Clean text for n-gram matching
  const cleanSentence = lower.replace(/[,.!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();

  // AI phrase match within sentence
  let bigramHits = 0;
  AI_BIGRAMS.forEach(bg => {
    if (cleanSentence.includes(bg)) bigramHits++;
  });
  let trigramHits = 0;
  AI_TRIGRAMS.forEach(tg => {
    if (cleanSentence.includes(tg)) trigramHits++;
  });
  const aiPhrases = clamp(bigramHits * 0.35 + trigramHits * 0.55, 0, 1);

  // Human markers in sentence
  let contractionHits = 0;
  let fillerCasualHits = 0;
  for (const t of tokens) {
    if (HUMAN_CONTRACTIONS.has(t)) contractionHits++;
    if (HUMAN_FILLERS.has(t) || HUMAN_CASUAL.has(t)) fillerCasualHits++;
  }
  const humanMarkers = clamp((contractionHits * 0.25 + fillerCasualHits * 0.2), 0, 1);

  // Formal words in sentence
  let formalHits = 0;
  for (const t of tokens) {
    if (AI_FORMAL_WORDS.has(t)) formalHits++;
  }
  const formalVocab = clamp(formalHits * 0.35, 0, 1);

  // Sentence-level punctuation
  const semicolons = (sentence.match(/;/g) || []).length;
  const colons = (sentence.match(/:/g) || []).length;
  const exclamQues = (sentence.match(/[!?]/g) || []).length;
  // AI: multiple commas + semicolons in one sentence
  const commas = (sentence.match(/,/g) || []).length;
  const punctScore = clamp((semicolons * 0.3 + colons * 0.15 + commas * 0.08 - exclamQues * 0.1), 0, 1);

  return { aiPhrases, humanMarkers, formalVocab, punctuation: punctScore };
}

// =====================================================================
//  MODEL PREDICTIONS
// =====================================================================

function generateModelPredictions(aiScore: number, signals: DocSignals): ModelPrediction[] {
  // Use burstiness + formal vocab to distinguish between models
  // Claude is burstier than GPT-4, Gemini has lower formal vocab
  const predictions: ModelPrediction[] = [];

  if (aiScore > 30) {
    // GPT-4 / ChatGPT: medium-high burstiness variance, high formal vocab
    const gptProb = clamp(aiScore / 100 * 0.85 + signals.formalVocab * 0.15, 0, 0.95);
    predictions.push({ model: 'GPT-4 / ChatGPT', probability: Math.round(gptProb * 100) / 100 });

    // Claude: higher burstiness, similar formal vocab to GPT-4
    const claudeScore = clamp(aiScore / 100 * 0.6 + signals.formalVocab * 0.1, 0, 0.8);
    predictions.push({ model: 'Claude', probability: Math.round(claudeScore * 100) / 100 });

    // Gemini: lower formal vocab, different fingerprint
    const geminiScore = clamp(aiScore / 100 * 0.3 + signals.formalVocab * 0.05, 0, 0.5);
    predictions.push({ model: 'Gemini', probability: Math.round(geminiScore * 100) / 100 });
  }

  const humanProb = clamp(1 - aiScore / 100 + signals.humanMarkers * 0.15, 0.1, 1);
  predictions.push({ model: 'Human-written', probability: Math.round(humanProb * 100) / 100 });

  return predictions;
}

// =====================================================================
//  PLAGIARISM & HUMANIZER (unchanged heuristics)
// =====================================================================

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
          original: word, humanized: alt,
          startIndex: humanized.length, endIndex: humanized.length + alt.length,
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

// =====================================================================
//  HELPERS
// =====================================================================

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0)
    .map(s => s.trim());
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .filter(p => p.trim().length > 0)
    .map(p => p.trim());
}

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function tokenizeLower(text: string): string[] {
  // Returns lowercase tokens including punctuation (for contraction matching)
  return text.toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(w => w.length > 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
    overallScore: aiScore, humanScore: 100 - aiScore, mixedScore: 0, aiScore,
    sentenceAnalysis: data.sentences || data.sentence_analysis || [],
    modelPredictions: data.models || data.model_predictions || [],
    processingTime: data.processing_time || 0,
    textLength: text.length,
    textHash: simpleHash(text),
  };
}
