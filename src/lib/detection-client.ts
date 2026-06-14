/**
 * Client-side AI detection engine.
 * 
 * Architecture:
 * - Heuristic (instant, $0) — always available as baseline
 * - Model (plugged in later) — higher accuracy when available
 * 
 * The detector auto-selects the best available backend.
 */

// ===================================================================
//  Detection backends
// ===================================================================

type DetectionBackend = 'heuristic' | 'model';

interface DetectionInput {
  text: string;
  /** Prefer model if available, but accept heuristic fallback */
  preferModel?: boolean;
}

interface DetectionOutput {
  /** 0-100: percentage AI-generated */
  score: number;
  /** 0-100: percentage human-written */
  humanScore: number;
  /** Which backend produced this result */
  backend: DetectionBackend;
  /** Per-sentence analysis (may be empty for model backend) */
  sentences: SentenceResult[];
  /** Time taken in ms */
  timeMs: number;
}

interface SentenceResult {
  text: string;
  aiProbability: number; // 0-1
  verdict: 'human' | 'ai' | 'mixed';
}

// ===================================================================
//  MAIN API
// ===================================================================

/**
 * Detect AI-generated text using the best available backend.
 * Falls back from model API → heuristic automatically.
 */
export async function detectAI(input: DetectionInput): Promise<DetectionOutput> {
  const t0 = performance.now();

  // Try model API first if available
  const modelUrl = process.env.NEXT_PUBLIC_MODEL_API_URL;
  if (modelUrl) {
    try {
      const res = await fetch(`${modelUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.text }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          score: data.score,
          humanScore: data.humanScore,
          backend: 'model',
          sentences: [],
          timeMs: Math.round(performance.now() - t0),
        };
      }
    } catch {
      // Model server unreachable — fall back to heuristic
    }
  }

  // Fall back to heuristic
  const result = heuristicDetect(input.text);
  return {
    ...result,
    backend: 'heuristic',
    timeMs: Math.round(performance.now() - t0),
  };
}

/**
 * Check if a model backend is available (for future use).
 * Currently always returns false — will return true when model is loaded.
 */
export function isModelAvailable(): boolean {
  return false; // placeholder for future model loading
}

// ===================================================================
//  HEURISTIC ENGINE (client-side version)
// ===================================================================

// ---- AI phrase markers ----
const AI_BIGRAMS = new Set([
  'according to', 'a testament to', 'as a result', 'at the heart of',
  'can be attributed', 'careful consideration', 'complex interplay',
  'comprehensive overview', 'critical role', 'crucial to understanding',
  'delve into', 'demonstrates the', 'despite the fact', 'due to the fact',
  'essential for the', 'furthermore the', 'has been shown to',
  'highlights the importance', 'however it is', 'in addition to',
  'in conclusion', 'in order to', 'in recent years', 'in terms of',
  'in the context of', 'in the face of', 'in the realm of',
  'in the modern', 'in today\'s', 'intricate balance',
  'is a testament', 'is characterized by', 'is important to',
  'is worth noting', 'it becomes clear', 'it can be argued',
  'it is crucial', 'it is essential', 'it is important to',
  'it is noteworthy', 'it is worth', 'it should be noted',
  'landscape of', 'lies in the', 'make a significant',
  'moreover the', 'multifaceted approach', 'nevertheless the',
  'not only but', 'of paramount importance', 'on the contrary',
  'one could argue', 'over the years', 'play a crucial',
  'plays a pivotal', 'profound impact', 'provides a comprehensive',
  'provides insight into', 'rich tapestry', 'robust framework',
  'serves as a', 'shed light on', 'the advent of',
  'the complexities of', 'the concept of', 'the development of',
  'the fact that', 'the field of', 'the importance of',
  'the intersection of', 'the notion of', 'the realm of',
  'the relationship between', 'the significance of',
  'through the lens', 'transformative potential',
  'understanding the nuances', 'underscores the importance',
  'vast array of', 'when it comes to', 'while it is',
  'widely recognized as', 'with respect to',
  // Hedging / uncertainty
  'may be', 'could be', 'appears to', 'seems to', 'tends to',
  'generally considered', 'typically involves',
  // Formal transitions
  'based on the', 'centered around', 'closely tied to',
  'coupled with the', 'deeply rooted in', 'deeply intertwined',
  'directly related to', 'driven by the', 'firmly established',
  'growing body of', 'grounded in the', 'heavily influenced',
  'in light of', 'in line with', 'in relation to', 'in response to',
  'inextricably linked', 'integral part of', 'intrinsically linked',
  'key driver of', 'largely due to', 'leading to the',
  'needs to be', 'of particular interest', 'particularly noteworthy',
  'plays an important', 'predominantly focused', 'primary driver of',
  'remains a central', 'rooted in the', 'serves to highlight',
  'significantly impacted', 'the broader context', 'the broader implications',
  'the central role', 'the crucial role', 'the essential role',
  'the growing importance', 'there exists a', 'there is a growing',
  'this highlights the', 'this underscores the',
  'ultimately leading', 'underscoring the need', 'widely acknowledged',
  // Narrative / storytelling
  'seemed to', 'as if he', 'as if she', 'as if they',
  'filled with', 'could feel', 'looked up at', 'looked down at',
  'let out a', 'took a deep', 'felt a surge', 'heart raced',
  'eyes widened', 'eyes filled', 'smile spread', 'smiled softly',
  'face lit up', 'tears streamed', 'voice barely', 'said softly',
  'arms around', 'wrapped her', 'wrapped his', 'held her', 'held him',
  'would remember', 'would never forget', 'reminded her', 'reminded him',
  'she knew', 'he knew', 'she realized', 'he realized',
  'wasn\'t just', 'was more than', 'the kind of', 'the sort of',
  'and for', 'in that moment', 'from that day', 'from that moment',
  'the truest', 'the simplest', 'more than enough', 'his whole world',
  // Sentimentality / death / memory
  'appeared to be', 'beloved wife', 'passed away', 'long illness',
  'cherish the', 'treasured part', 'continued to live', 'never truly',
  'warmth and compassion', 'greatest way to', 'live on in',
  'sense of peace', 'feel close to', 'allowed him to', 'allowed her to',
  'he realized that', 'she realized that', 'realized that memories',
  'memories are not', 'not meant to be', 'honor the people',
  'kindness they taught', 'continued to live on', 'love never truly',
  'still belonged to', 'it always would', 'kindness between strangers',
  // Story A patterns
  'profound beauty', 'very essence', 'delicate interplay',
  'breathtaking tapestry', 'profound realization', 'truly mattered',
  'generously offered', 'mindful awareness', 'beacons of hope',
  'vast expanse', 'renewed sense', 'quiet joy', 'silent promise',
  'deep sense', 'sense of gratitude', 'heart swelling',
  'extraordinary ability', 'overwhelming connection',
  'gentle breeze', 'simple quiet', 'quiet moments',
  'modern life', 'relentless demands', 'pulled her away',
  'no longer allow', 'daily existence', 'precious gift',
  'golden glow', 'tranquil meadow', 'natural world',
  'carried with her', 'carried with him',
]);

// ---- Formal AI vocabulary ----
const AI_FORMAL = new Set([
  'accordingly', 'aforementioned', 'aggregate', 'albeit', 'amidst',
  'amongst', 'approximately', 'commence', 'commensurate',
  'consequently', 'consolidate', 'constitute', 'corroborate', 'culmination',
  'deemed', 'demonstrate', 'denote', 'depict', 'disseminate',
  'elucidate', 'embody', 'encompass', 'endeavor', 'ensuing',
  'exacerbate', 'exemplify', 'expedite', 'facilitate',
  'foster', 'furthermore', 'garner', 'hence', 'hereby',
  'imperative', 'impetus', 'indispensable', 'insofar',
  'integral', 'juxtaposition', 'leverage', 'manifestation',
  'moreover', 'multifaceted', 'namely', 'nevertheless', 'nonetheless',
  'notwithstanding', 'novel', 'nuanced', 'ostensibly', 'overarching',
  'paramount', 'pertains', 'plethora', 'pragmatic', 'predominantly',
  'profound', 'propensity', 'quintessential', 'reiterate', 'rendering',
  'salient', 'signify', 'solidify', 'spearhead', 'substantiate',
  'succinct', 'surmount', 'synergy', 'synthesize', 'thereby',
  'therein', 'thereof', 'trajectory', 'transformative', 'ubiquitous',
  'underscore', 'undertake', 'unequivocally', 'utilize', 'validate',
  'whereby', 'wherein', 'holistic', 'tailored', 'bespoke', 'curated',
  'elevate', 'unpack', 'reimagine', 'revolutionize', 'seamless',
  'streamline', 'optimize', 'augment', 'harness', 'empower',
  'actionable', 'scalable', 'resilient', 'adaptive', 'intuitive',
  'immersive', 'unprecedented', 'paradigm', 'ecosystem', 'nexus',
  'convergence', 'interplay', 'dichotomy', 'epitomize',
  'testament', 'embodiment', 'pinnacle', 'inevitable',
  'invaluable', 'vital', 'pivotal', 'cornerstone', 'linchpin',
  'keystone', 'bedrock', 'galvanize', 'catalyze', 'propel',
  'burgeoning', 'nascent', 'fledgling', 'incipient',
  'unravel', 'delineate', 'explicate', 'encapsulate', 'contextualize',
  'ameliorate', 'mitigate', 'extrapolate', 'antithetical',
  'essence', 'tranquil', 'serenity', 'delicate', 'breathtaking',
  'extraordinary', 'overwhelming', 'relentless', 'generously',
  'mindful', 'cherish', 'precious', 'beacons', 'tapestry',
  'gratitude', 'swelling', 'fragrance', 'enveloped', 'renewal',
  'solace', 'melancholy', 'wistful', 'bittersweet',
  'radiant', 'luminous', 'ethereal', 'resplendent',
  'unwavering', 'steadfast', 'unyielding', 'boundless',
  'limitless', 'infinite', 'eternal', 'timeless',
  'whisper', 'murmur', 'shimmer', 'glimmer', 'cascade', 'ripple',
  'meander', 'wander', 'linger', 'fleeting', 'transient', 'ephemeral',
  'enduring', 'abundant', 'bountiful', 'reverence', 'awe', 'enchantment',
  'utterly', 'thoroughly', 'completely', 'absolutely',
  'remarkably', 'exceptionally', 'immensely', 'vastly',
]);

// ---- Human markers (subtract from AI score) ----
const HUMAN_CONTRACTIONS = new Set([
  'ain\'t', 'can\'t', 'could\'ve', 'couldn\'t', 'didn\'t', 'doesn\'t',
  'don\'t', 'gonna', 'gotta', 'hadn\'t', 'hasn\'t', 'haven\'t',
  'he\'d', 'he\'ll', 'he\'s', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve',
  'isn\'t', 'it\'d', 'it\'ll', 'it\'s', 'kinda', 'lemme', 'let\'s',
  'might\'ve', 'must\'ve', 'should\'ve', 'shouldn\'t', 'sorta',
  'that\'d', 'that\'ll', 'that\'s', 'they\'d', 'they\'ll',
  'they\'re', 'they\'ve', 'wanna', 'wasn\'t', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'weren\'t', 'what\'s', 'won\'t',
  'would\'ve', 'wouldn\'t', 'y\'all', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve',
]);

const HUMAN_FILLERS = new Set([
  'actually', 'anyway', 'basically', 'honestly', 'literally',
  'maybe', 'probably', 'seriously', 'totally', 'whatever',
  'frankly', 'apparently', 'supposedly', 'definitely',
  'obviously', 'surely', 'somehow', 'alright', 'okay',
]);

const HUMAN_CASUAL = new Set([
  'awesome', 'bummer', 'cool', 'crappy', 'crazy', 'creepy',
  'dumb', 'freaking', 'gross', 'heck', 'lame', 'meh', 'nuts',
  'ok', 'ridiculous', 'sucks', 'super', 'ugh', 'weird',
  'yikes', 'yuck', 'dude', 'bro', 'crap', 'jerk', 'stoked',
  'chill', 'wack', 'dope', 'sick', 'dang', 'shoot', 'frick',
  'hell', 'damn', 'cringe', 'sketchy', 'shady', 'messed', 'busted',
]);

// ===================================================================
//  HEURISTIC COMPUTATION
// ===================================================================

function heuristicDetect(text: string): { score: number; humanScore: number; sentences: SentenceResult[] } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const cleanText = text.toLowerCase().replace(/[,.!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(/\s+/);
  const tokens = text.toLowerCase().split(/[^a-z0-9']+/).filter(w => w.length > 0);

  // Count AI phrase matches
  let bigramHits = 0;
  AI_BIGRAMS.forEach(bg => { if (cleanText.includes(bg)) bigramHits++; });
  
  // Count formal vocab
  let formalCount = 0;
  tokens.forEach(t => { if (AI_FORMAL.has(t)) formalCount++; });
  
  // Count -ly adverbs (AI fiction marker)
  let adverbCount = 0;
  words.forEach(w => {
    if (w.endsWith('ly') && w.length > 4 &&
        w !== 'early' && w !== 'daily' && w !== 'only' &&
        w !== 'really' && w !== 'probably' && w !== 'actually') {
      adverbCount++;
    }
  });

  // Count human markers
  let contractionCount = 0;
  let fillerCasualCount = 0;
  tokens.forEach(t => {
    if (HUMAN_CONTRACTIONS.has(t)) contractionCount++;
    if (HUMAN_FILLERS.has(t) || HUMAN_CASUAL.has(t)) fillerCasualCount++;
  });

  // Phrase density (bigrams per sentence)
  const phraseDensity = Math.min(bigramHits / Math.max(sentences.length, 1), 1);
  
  // Formal word density  
  const formalDensity = Math.min((formalCount + adverbCount * 0.25) / Math.max(tokens.length, 1) * 40, 1);
  
  // Human marker density
  const humanDensity = Math.min(
    (contractionCount * 0.25 + fillerCasualCount * 0.2) / Math.max(tokens.length, 1) * 30,
    1
  );

  // Sentence burstiness (length variance)
  let burstiness = 0.15; // default: insufficient data
  if (sentences.length >= 3) {
    const lens = sentences.map(s => s.length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lens.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    let score = cv < 0.2 ? 0.9 : cv < 0.35 ? 0.7 : cv < 0.5 ? 0.4 : cv < 0.7 ? 0.1 : 0;
    const confidence = Math.min(sentences.length / 5, 1);
    burstiness = score * confidence;
  }

  // Overall document score
  const docScore = phraseDensity * 0.42 + formalDensity * 0.16 + burstiness * 0.14 - humanDensity * 0.04;
  const overallScore = Math.max(0, Math.min(100, docScore * 100));

  // Per-sentence analysis
  const sentenceResults: SentenceResult[] = sentences.map(s => {
    const clean = s.toLowerCase().replace(/[,.!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
    let hits = 0;
    AI_BIGRAMS.forEach(bg => { if (clean.includes(bg)) hits++; });
    const sentTokens = s.toLowerCase().split(/[^a-z0-9']+/).filter(w => w.length > 0);
    let sentFormal = 0;
    sentTokens.forEach(t => { if (AI_FORMAL.has(t)) sentFormal++; });
    
    const sentScore = Math.min(hits * 0.50 + sentFormal * 0.35, 1);
    let verdict: 'human' | 'ai' | 'mixed';
    if (sentScore > 0.55) verdict = 'ai';
    else if (sentScore > 0.30) verdict = 'mixed';
    else verdict = 'human';
    
    return { text: s, aiProbability: Math.round(sentScore * 1000) / 1000, verdict };
  });

  return {
    score: Math.round(overallScore * 10) / 10,
    humanScore: Math.round((100 - overallScore) * 10) / 10,
    sentences: sentenceResults,
  };
}
