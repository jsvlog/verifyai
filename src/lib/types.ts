// ===== AI Detection Types =====

export interface DetectionResult {
  overallScore: number;        // 0-100, percentage of AI-generated content
  humanScore: number;          // 0-100
  mixedScore: number;          // 0-100
  aiScore: number;             // 0-100
  sentenceAnalysis: SentenceAnalysis[];
  modelPredictions: ModelPrediction[];
  processingTime: number;      // in seconds
  textLength: number;
  textHash: string;
}

export interface SentenceAnalysis {
  sentence: string;
  startIndex: number;
  endIndex: number;
  aiProbability: number;       // 0-1
  verdict: 'human' | 'ai' | 'mixed';
}

export interface ModelPrediction {
  model: string;               // e.g., "GPT-4", "Claude", "Gemini", "Human"
  probability: number;         // 0-1
}

export interface PlagiarismResult {
  overallScore: number;        // 0-100, plagiarism percentage
  uniqueScore: number;
  sources: PlagiarismSource[];
  matches: PlagiarismMatch[];
  processingTime: number;
}

export interface PlagiarismSource {
  url: string;
  title: string;
  similarity: number;          // 0-100
  matchedText: string;
}

export interface PlagiarismMatch {
  text: string;
  sourceUrl: string;
  startIndex: number;
  endIndex: number;
  similarity: number;
}

export interface HumanizeResult {
  humanizedText: string;
  originalText: string;
  readabilityScore: number;    // 0-100
  humanScore: number;          // 0-100
  changes: TextChange[];
  processingTime: number;
}

export interface TextChange {
  original: string;
  humanized: string;
  startIndex: number;
  endIndex: number;
}

// ===== API Request Types =====

export interface DetectRequest {
  text: string;
  mode?: 'ai-detection' | 'plagiarism' | 'humanize';
  options?: {
    sensitivity?: 'low' | 'medium' | 'high';
    includeModels?: boolean;
    language?: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
}

// ===== UI Types =====

export type ToolType = 'ai-detector' | 'plagiarism-checker' | 'text-humanizer';

export type ProcessingState = 'idle' | 'processing' | 'done' | 'error';

export interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  rating: number;
  date: string;
  text: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}
