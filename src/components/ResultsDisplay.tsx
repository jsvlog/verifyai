'use client';

import type { DetectionResult, PlagiarismResult, HumanizeResult, ToolType } from '@/lib/types';
import { useState } from 'react';
import Link from 'next/link';

interface ResultsDisplayProps {
  result: DetectionResult | PlagiarismResult | HumanizeResult;
  toolType: ToolType;
  originalText?: string;
  onReset?: () => void;
  /** Text that was scanned — used for "Humanize this" CTA */
  scannedText?: string;
}

export default function ResultsDisplay({ result, toolType, originalText, onReset, scannedText }: ResultsDisplayProps) {
  if (toolType === 'text-humanizer') return <HumanizerResult result={result as HumanizeResult} originalText={originalText} onReset={onReset} />;
  if (toolType === 'plagiarism-checker') return <PlagiarismResult result={result as PlagiarismResult} onReset={onReset} />;
  return <AIDetectorResult result={result as DetectionResult} onReset={onReset} scannedText={scannedText} />;
}

// ===== AI Detector Results =====

function AIDetectorResult({ result, onReset, scannedText }: { result: DetectionResult; onReset?: () => void; scannedText?: string }) {
  const [view, setView] = useState<'overview' | 'sentences'>('overview');

  const getVerdict = () => {
    if (result.overallScore > 40) return { label: 'Likely AI-generated', color: '#ff6b6b', bg: '#fff5f5', bar: '#ff6b6b' };
    if (result.overallScore > 15) return { label: 'Possibly mixed', color: '#ffa94d', bg: '#fff9f0', bar: '#ffa94d' };
    return { label: 'Likely human-written', color: '#40c057', bg: '#ebfbee', bar: '#40c057' };
  };

  const v = getVerdict();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-1">Detection Results</p>
          <h2 className="text-2xl font-bold text-[#3d3227] tracking-tight">Analysis complete</h2>
        </div>
        {onReset && (
          <button onClick={onReset} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            New scan
          </button>
        )}
      </div>

      {/* Main score card */}
      <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-xl shadow-[#3d3227]/6 overflow-hidden mb-6">
        <div className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
            {/* Big number with ring */}
            <div className="flex-shrink-0 relative">
              <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
                <circle cx="80" cy="80" r="68" fill="none" stroke="#fef0d7" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="68" fill="none"
                  stroke={v.bar} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 68}`}
                  strokeDashoffset={`${2 * Math.PI * 68 * (1 - result.overallScore / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[#3d3227] tracking-tighter">{Math.round(result.overallScore)}</span>
                <span className="text-xs text-[#b8a88e]">AI Score</span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                  <span className="text-lg font-semibold text-[#3d3227]">{v.label}</span>
                </div>
                <p className="text-sm text-[#8c7a64] leading-relaxed">
                  {result.overallScore > 40
                    ? 'This text shows strong patterns consistent with AI generation. Review the sentence breakdown for details.'
                    : result.overallScore > 15
                    ? 'This text contains both human-written and AI-generated elements.'
                    : 'This text appears to be naturally written by a human.'}
                </p>
              </div>

              {/* Bars */}
              <div className="space-y-3">
                <ScoreBar label="AI-Generated" value={result.aiScore} color="#ff6b6b" bg="#fff5f5" />
                <ScoreBar label="Human-Written" value={result.humanScore} color="#40c057" bg="#ebfbee" />
              </div>

              {/* Meta */}
              <div className="flex items-center gap-6 pt-4 border-t border-[#f5e6cc]">
                <MetaItem label="Characters" value={result.textLength.toLocaleString()} />
                <MetaItem label="Sentences" value={result.sentenceAnalysis.length.toString()} />
                <MetaItem label="Time" value={`${result.processingTime.toFixed(1)}s`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail tabs */}
      {result.sentenceAnalysis.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg shadow-[#3d3227]/4 overflow-hidden">
          <div className="flex border-b border-[#f5e6cc]">
            {(['overview', 'sentences'] as const).map((tab) => (
              <button key={tab} onClick={() => setView(tab)} className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${view === tab ? 'text-[#3d3227]' : 'text-[#b8a88e] hover:text-[#8c7a64]'}`}>
                {tab === 'overview' ? 'Overview' : 'Sentence Analysis'}
                {view === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] rounded-full" />}
              </button>
            ))}
          </div>

          <div className="p-6">
            {view === 'overview' && (
              <div className="grid grid-cols-3 gap-4">
                <MiniCard icon="🤖" label="AI Content" value={`${Math.round(result.aiScore)}%`} color="#ff6b6b" bg="#fff5f5" />
                <MiniCard icon="👤" label="Human Content" value={`${Math.round(result.humanScore)}%`} color="#40c057" bg="#ebfbee" />
                <MiniCard icon="📊" label="Sentences" value={result.sentenceAnalysis.length.toString()} color="#ffa94d" bg="#fff9f0" />
              </div>
            )}
            {view === 'sentences' && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {result.sentenceAnalysis.map((s, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border transition-colors"
                    style={{
                      borderColor: s.verdict === 'ai' ? '#ffc9c9' : s.verdict === 'mixed' ? '#ffe3bf' : '#b2f2bb',
                      backgroundColor: s.verdict === 'ai' ? '#fff5f5' : s.verdict === 'mixed' ? '#fff9f0' : '#ebfbee',
                    }}
                  >
                    <p className="text-sm text-[#3d3227] leading-relaxed mb-2.5">{s.sentence}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: s.verdict === 'ai' ? '#ffe3e3' : s.verdict === 'mixed' ? '#fff0db' : '#d3f9d8', color: s.verdict === 'ai' ? '#f03e3e' : s.verdict === 'mixed' ? '#f08c00' : '#2b8a3e' }}
                      >
                        {s.verdict === 'ai' ? 'AI' : s.verdict === 'mixed' ? 'Mixed' : 'Human'}
                      </span>
                      <span className="text-xs text-[#b8a88e]">{Math.round(s.aiProbability * 100)}% AI probability</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Humanize CTA — shown after any AI detection result */}
      {scannedText && scannedText.trim().length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-[#fff5f5] to-[#fff9f0] rounded-3xl border border-[#f5e6cc] shadow-lg p-6 sm:p-8 animate-scale-in">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="text-4xl">✨</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#3d3227] mb-1">Make it sound human</h3>
              <p className="text-sm text-[#8c7a64]">
                Transform this AI-generated text into natural, undetectable writing with our Text Humanizer. Premium feature.
              </p>
            </div>
            <Link
              href={`/text-humanizer?text=${encodeURIComponent(scannedText.slice(0, 500))}`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] text-white font-semibold rounded-2xl shadow-lg shadow-[#ff6b6b]/25 hover:shadow-xl transition-all whitespace-nowrap"
            >
              Humanize this text
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Plagiarism =====

function PlagiarismResult({ result, onReset }: { result: PlagiarismResult; onReset?: () => void }) {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-1">Plagiarism Check</p>
          <h2 className="text-2xl font-bold text-[#3d3227] tracking-tight">Results</h2>
        </div>
        {onReset && <button onClick={onReset} className="btn-secondary"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>New scan</button>}
      </div>

      <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-xl shadow-[#3d3227]/6 p-8">
        <div className="flex items-start gap-8 mb-8">
          <div>
            <div className="text-5xl font-bold text-[#3d3227] tracking-tighter">{Math.round(result.overallScore)}<span className="text-2xl text-[#b8a88e] font-medium">%</span></div>
            <p className="text-xs text-[#b8a88e] mt-1">Similarity</p>
          </div>
          <div className="flex-1 space-y-4">
            <ScoreBar label="Plagiarized" value={result.overallScore} color="#ff6b6b" bg="#fff5f5" />
            <ScoreBar label="Unique content" value={result.uniqueScore} color="#40c057" bg="#ebfbee" />
          </div>
        </div>

        {result.sources.length > 0 && (
          <>
            <div className="border-t border-[#f5e6cc] pt-6">
              <h4 className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-4">Matched sources</h4>
              <div className="space-y-3">
                {result.sources.map((src, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-[#fffdf7] rounded-2xl border border-[#f5e6cc]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[#ffa94d] flex items-center justify-center text-white text-xs font-bold shadow-md">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <a href={src.url} target="_blank" rel="noopener" className="text-sm font-medium text-[#3d3227] hover:text-[#ff6b6b] transition-colors truncate block">{src.title}</a>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-[#fef0d7] rounded-full"><div className="h-full bg-[#ff6b6b] rounded-full" style={{ width: `${src.similarity}%` }} /></div>
                        <span className="text-xs font-semibold text-[#8c7a64]">{Math.round(src.similarity)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Humanizer =====

function HumanizerResult({ result, originalText, onReset }: { result: HumanizeResult; originalText?: string; onReset?: () => void }) {
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-1">Text Humanizer</p>
          <h2 className="text-2xl font-bold text-[#3d3227] tracking-tight">Humanized result</h2>
        </div>
        {onReset && <button onClick={onReset} className="btn-secondary"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>New text</button>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MiniCard icon="📖" label="Readability" value={`${Math.round(result.readabilityScore)}%`} color="#40c057" bg="#ebfbee" />
        <MiniCard icon="👤" label="Human Score" value={`${Math.round(result.humanScore)}%`} color="#ffa94d" bg="#fff9f0" />
        <MiniCard icon="✏️" label="Changes" value={result.changes.length.toString()} color="#ff6b6b" bg="#fff5f5" />
      </div>

      <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg shadow-[#3d3227]/4 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f5e6cc] bg-[#fffdf7]">
          <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest">{showOriginal ? 'Original' : 'Humanized'}</p>
          <button onClick={() => setShowOriginal(!showOriginal)} className="text-sm font-semibold text-[#ff6b6b] hover:text-[#fa5252] transition-colors">
            {showOriginal ? 'Show humanized' : 'Show original'}
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-[#3d3227] leading-relaxed whitespace-pre-wrap">{showOriginal ? originalText || result.originalText : result.humanizedText}</p>
        </div>
      </div>

      {result.changes.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg shadow-[#3d3227]/4 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f5e6cc] bg-[#fffdf7]">
            <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest">Key changes</p>
          </div>
          <div className="p-6 space-y-2">
            {result.changes.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-4 bg-[#fffdf7] rounded-2xl border border-[#f5e6cc] text-sm">
                <span className="text-[#f03e3e] line-through font-medium">{c.original}</span>
                <span className="text-[#b8a88e]">&rarr;</span>
                <span className="text-[#40c057] font-semibold">{c.humanized}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Shared components =====

function ScoreBar({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1.5">
        <span className="text-[#8c7a64]">{label}</span>
        <span className="text-[#3d3227] tabular-nums">{Math.round(value)}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ backgroundColor: bg }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[#b8a88e]">{label}</span>
      <span className="text-sm font-semibold text-[#3d3227] tabular-nums">{value}</span>
    </div>
  );
}

function MiniCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="p-5 rounded-2xl border" style={{ backgroundColor: bg, borderColor: bg === '#fff5f5' ? '#ffc9c9' : bg === '#fff9f0' ? '#ffe3bf' : '#b2f2bb' }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xl font-bold text-[#3d3227]" style={{ color }}>{value}</div>
      <p className="text-xs text-[#8c7a64] mt-1">{label}</p>
    </div>
  );
}
