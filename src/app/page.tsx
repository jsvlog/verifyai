'use client';

import { useState, useCallback } from 'react';
import HeroInput from '@/components/HeroInput';
import ProgressModal from '@/components/ProgressModal';
import ResultsDisplay from '@/components/ResultsDisplay';
import { DetectionResult, ProcessingState } from '@/lib/types';

export default function HomePage() {
  const [state, setState] = useState<ProcessingState>('idle');
  const [text, setText] = useState('');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = useCallback(async (inputText: string) => {
    setText(inputText); setState('processing'); setResult(null); setError('');
    try {
      const res = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: inputText }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Detection failed');
      await new Promise((r) => setTimeout(r, 500));
      setResult(data.data); setState('done');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); setState('error'); }
  }, []);

  const handleReset = () => { setState('idle'); setText(''); setResult(null); setError(''); };

  return (
    <>
      <ProgressModal isOpen={state === 'processing'} text={text} state={state} />
      <div className="gradient-hero min-h-[calc(100vh-4rem)] relative overflow-hidden">
        {/* Floating orbs */}
        <div className="orb orb-coral" style={{ top: '-10%', right: '-5%' }} />
        <div className="orb orb-amber" style={{ bottom: '10%', left: '-8%' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-12 md:py-24">
          {state !== 'done' ? (
            <div className="max-w-[740px] mx-auto text-center">
              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10 animate-fade-in-up">
                <div className="badge">
                  <div className="flex -space-x-2">
                    {['#ff6b6b', '#ffa94d', '#ff8787', '#fab005'].map((c, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: c }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="font-semibold text-[#3d3227]">+20k</span>
                  <span className="text-[#b8a88e]">active users</span>
                </div>
                <div className="badge">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-3.5 h-3.5 text-[#fab005]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold text-[#3d3227]">4.8</span>
                  <span className="text-[#40c057] font-bold">Excellent</span>
                </div>
              </div>

              {/* Hero */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#3d3227] tracking-tight leading-none mb-5 mx-auto text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Detect AI with{' '}
                <span className="text-gradient-warm">confidence</span>
              </h1>
              <p className="text-lg md:text-xl text-[#8c7a64] max-w-xl mx-auto leading-relaxed text-center animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                VerifyAI helps writers, educators, and publishers identify AI-generated content with precision and ease.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2.5 mt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {[
                  { icon: '🔍', label: 'AI Detection' },
                  { icon: '📋', label: 'Plagiarism Check' },
                  { icon: '✨', label: 'Text Humanizer' },
                  { icon: '⚡', label: 'Fast Results' },
                  { icon: '🔒', label: 'Private & Secure' },
                ].map((f) => (
                  <span key={f.label} className="badge !gap-1.5">
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>

              {/* Input */}
              <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                <HeroInput onAnalyze={handleAnalyze} isProcessing={state === 'processing'} />
              </div>

              {error && state === 'error' && (
                <div className="mt-6 p-4 bg-[#fff5f5] border border-[#ffc9c9] rounded-2xl animate-scale-in">
                  <p className="text-sm text-[#f03e3e]">{error}</p>
                  <button onClick={handleReset} className="mt-2 text-xs font-semibold text-[#f03e3e] underline">Try again</button>
                </div>
              )}
            </div>
          ) : (
            <ResultsDisplay result={result!} toolType="ai-detector" onReset={handleReset} />
          )}
        </div>
      </div>
    </>
  );
}
