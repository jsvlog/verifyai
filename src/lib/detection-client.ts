// Browser-side AI detection — heuristic + RoBERTa ONNX model
// Model: onnx-community/roberta-base-openai-detector-ONNX (int8, ~121MB)
// After first download, cached by browser permanently.
// Tokenizer patch: scripts/patch-transformers.js (postinstall) handles BPE merges format

let modelPipeline: any = null;
let modelLoading = false;
let modelProgress = 0;

export function getModelProgress(): number { return modelProgress; }
export function isModelAvailable(): boolean { return modelPipeline !== null; }

export async function preloadModel(): Promise<void> {
  if (modelPipeline || modelLoading) return;
  modelLoading = true;
  try {
    const { pipeline } = await import('@xenova/transformers');
    modelPipeline = await pipeline(
      'text-classification',
      'onnx-community/roberta-base-openai-detector-ONNX',
      { progress_callback: (p: any) => { modelProgress = p?.progress || 0; } }
    );
    modelProgress = 100;
    console.log('[VerifyAI] RoBERTa model ready');
  } catch (e) {
    console.warn('[VerifyAI] Model unavailable, using heuristic:', e);
    modelLoading = false;
  }
}

export interface DetectionInput { text: string; }
export interface DetectionOutput {
  score: number; humanScore: number; backend: 'model' | 'heuristic';
  sentences: { text: string; aiProbability: number; verdict: 'human'|'ai'|'mixed' }[];
  timeMs: number;
}

export async function detectAI(input: DetectionInput): Promise<DetectionOutput> {
  const t0 = performance.now();
  if (modelPipeline) {
    try {
      const results = await modelPipeline(input.text.slice(0, 512));
      const top = results[0];
      // Model labels: "Fake"/"Real" (OpenAI detector). Also handle generic LABEL_0/LABEL_1.
      const label = (top.label || '').toLowerCase();
      const isAI = label === 'fake' || label === 'label_0' || label === 'ai';
      const score = Math.round((isAI ? top.score : 1 - top.score) * 1000) / 10;
      return { score, humanScore: Math.round((100 - score) * 10) / 10, backend: 'model', sentences: [], timeMs: Math.round(performance.now() - t0) };
    } catch {}
  }
  // Heuristic fallback
  const h = heuristicDetect(input.text);
  return { ...h, backend: 'heuristic', timeMs: Math.round(performance.now() - t0) };
}

// ================================================================
//  HEURISTIC ENGINE (compact — full version in detection.ts)
// ================================================================

const AI_BIGRAMS = new Set([
  'according to','a testament to','as a result','at the heart of','can be attributed','careful consideration',
  'complex interplay','comprehensive overview','critical role','crucial to understanding','delve into',
  'demonstrates the','despite the fact','due to the fact','essential for the','furthermore the',
  'has been shown to','highlights the importance','in addition to','in conclusion','in order to',
  'in recent years','in terms of','in the context of','in the realm of','in the modern',
  'intricate balance','is a testament','is important to','is worth noting','it becomes clear',
  'it is crucial','it is essential','it is important to','it should be noted','landscape of',
  'lies in the','make a significant','moreover the','multifaceted approach','nevertheless the',
  'not only but','of paramount importance','one could argue','over the years','play a crucial',
  'plays a pivotal','profound impact','provides a comprehensive','robust framework','serves as a',
  'shed light on','the advent of','the complexities of','the importance of','the intersection of',
  'the realm of','the relationship between','transformative potential','vast array of',
  'when it comes to','widely recognized as','may be','could be','appears to','seems to','tends to',
  'based on the','deeply rooted in','growing body of','in light of','in relation to',
  'inextricably linked','integral part of','key driver of','plays an important','seemed to',
  'as if he','as if she','eyes widened','looked up at','would remember','wasn\'t just',
  'was more than','in that moment','more than enough','his whole world','appeared to be',
  'beloved wife','passed away','cherish the','treasured part','continued to live',
  'sense of peace','allowed him to','he realized that','she realized that','memories are not',
  'not meant to be','love never truly','kindness between','profound beauty','very essence',
  'delicate interplay','breathtaking tapestry','profound realization','truly mattered',
  'mindful awareness','beacons of hope','vast expanse','renewed sense','quiet joy',
  'deep sense','sense of gratitude','heart swelling','extraordinary ability',
  'overwhelming connection','gentle breeze','simple quiet','quiet moments','modern life',
  'relentless demands','daily existence','precious gift','golden glow','natural world',
  'carried with her','tranquil meadow',
]);
const AI_FORMAL = new Set([
  'accordingly','albeit','amidst','approximately','commence','consequently','consolidate',
  'constitute','culmination','deemed','demonstrate','denote','depict','disseminate','elucidate',
  'embody','encompass','endeavor','ensuing','exacerbate','exemplify','expedite','facilitate',
  'foster','furthermore','garner','hence','hereby','imperative','indispensable','integral',
  'juxtaposition','leverage','manifestation','moreover','multifaceted','namely','nevertheless',
  'nonetheless','notwithstanding','novel','nuanced','ostensibly','overarching','paramount',
  'plethora','pragmatic','predominantly','profound','quintessential','reiterate','salient',
  'solidify','spearhead','substantiate','succinct','synergy','synthesize','thereby','trajectory',
  'transformative','ubiquitous','underscore','unequivocally','utilize','validate','whereby',
  'holistic','tailored','bespoke','curated','elevate','unpack','reimagine','revolutionize',
  'seamless','streamline','optimize','augment','harness','empower','actionable','scalable',
  'resilient','adaptive','intuitive','immersive','unprecedented','paradigm','ecosystem','nexus',
  'convergence','interplay','dichotomy','epitomize','testament','embodiment','pivotal',
  'cornerstone','keystone','galvanize','catalyze','propel','burgeoning','nascent','fledgling',
  'explicate','encapsulate','contextualize','ameliorate','mitigate','extrapolate',
  'essence','tranquil','serenity','delicate','breathtaking','extraordinary','overwhelming',
  'relentless','generously','mindful','cherish','precious','gratitude','enveloped','renewal',
  'solace','melancholy','wistful','radiant','luminous','ethereal','unwavering','boundless',
  'limitless','infinite','eternal','timeless','whisper','murmur','shimmer','glimmer',
  'cascade','ripple','meander','wander','linger','fleeting','ephemeral','enduring',
  'abundant','reverence','awe','enchantment','utterly','thoroughly','completely',
  'absolutely','remarkably','exceptionally','immensely','vastly',
]);
const HUMAN_CONTRACTIONS = new Set([
  'ain\'t','can\'t','could\'ve','couldn\'t','didn\'t','doesn\'t','don\'t','gonna','gotta',
  'he\'d','he\'ll','he\'s','i\'d','i\'ll','i\'m','i\'ve','isn\'t','it\'ll','it\'s',
  'kinda','let\'s','might\'ve','should\'ve','shouldn\'t','that\'s','they\'d','they\'ll',
  'they\'re','they\'ve','wanna','wasn\'t','we\'d','we\'ll','we\'re','we\'ve','weren\'t',
  'what\'s','won\'t','would\'ve','wouldn\'t','you\'d','you\'ll','you\'re','you\'ve',
]);
const HUMAN_CASUAL = new Set([
  'actually','anyway','basically','honestly','literally','maybe','probably','seriously',
  'totally','whatever','frankly','apparently','supposedly','definitely','obviously',
  'awesome','cool','crazy','dumb','freaking','gross','heck','lame','meh','nuts',
  'ridiculous','sucks','super','ugh','weird','yikes','dude','bro','crap','stoked',
  'chill','dope','sick','dang','shoot','frick','hell','damn','cringe','sketchy',
]);

function heuristicDetect(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const clean = text.toLowerCase().replace(/[,.!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/);
  const tokens = text.toLowerCase().split(/[^a-z0-9']+/).filter(w => w.length > 0);
  
  let bigramHits = 0; AI_BIGRAMS.forEach(bg => { if (clean.includes(bg)) bigramHits++; });
  let formalCount = 0; tokens.forEach(t => { if (AI_FORMAL.has(t)) formalCount++; });
  let adverbCount = 0; words.forEach(w => { if (w.endsWith('ly') && w.length > 4 && !['early','daily','only','really','probably','actually'].includes(w)) adverbCount++; });
  let contractionCount = 0; let casualCount = 0;
  tokens.forEach(t => { if (HUMAN_CONTRACTIONS.has(t)) contractionCount++; if (HUMAN_CASUAL.has(t)) casualCount++; });

  const phraseDensity = Math.min(bigramHits / Math.max(sentences.length, 1), 1);
  const formalDensity = Math.min((formalCount + adverbCount * 0.25) / Math.max(tokens.length, 1) * 40, 1);
  const humanDensity = Math.min((contractionCount * 0.25 + casualCount * 0.2) / Math.max(tokens.length, 1) * 30, 1);
  let burstiness = 0.15;
  if (sentences.length >= 3) {
    const lens = sentences.map(s => s.length);
    const mean = lens.reduce((a,b)=>a+b,0)/lens.length;
    const vari = lens.reduce((s,l)=>s+(l-mean)**2,0)/lens.length;
    const cv = mean>0 ? Math.sqrt(vari)/mean : 0;
    burstiness = (cv<0.2?0.9:cv<0.35?0.7:cv<0.5?0.4:cv<0.7?0.1:0) * Math.min(sentences.length/5,1);
  }
  const docScore = phraseDensity * 0.42 + formalDensity * 0.16 + burstiness * 0.14 - humanDensity * 0.04;
  const overallScore = Math.max(0, Math.min(100, docScore * 100));
  
  const outSentences = sentences.map(s => {
    const sc = s.toLowerCase().replace(/[,.!?;:'"()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
    let hits=0; AI_BIGRAMS.forEach(bg => { if (sc.includes(bg)) hits++; });
    let sf=0; s.toLowerCase().split(/[^a-z0-9']+/).filter(w=>w.length>0).forEach(t=>{ if(AI_FORMAL.has(t)) sf++; });
    const ss = Math.min(hits*0.50 + sf*0.35, 1);
    return { text: s, aiProbability: Math.round(ss*1000)/1000, verdict: (ss>0.55?'ai':ss>0.30?'mixed':'human') as 'ai'|'mixed'|'human' };
  });
  return { score: Math.round(overallScore*10)/10, humanScore: Math.round((100-overallScore)*10)/10, sentences: outSentences };
}
