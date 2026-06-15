'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HeroInput from '@/components/HeroInput';
import ProgressModal from '@/components/ProgressModal';
import ResultsDisplay from '@/components/ResultsDisplay';
import Link from 'next/link';
import { HumanizeResult, ProcessingState } from '@/lib/types';

function HumanizerContent() {
  const searchParams = useSearchParams();
  const prefillText = searchParams.get('text') || '';
  const [state, setState] = useState<ProcessingState>('idle');
  const [text, setText] = useState(prefillText);
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [gateError, setGateError] = useState<'auth' | 'premium' | null>(null);

  const handleAnalyze = useCallback(async (inputText: string) => {
    setText(inputText); setState('processing'); setResult(null); setGateError(null);
    try {
      const res = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'AUTH_REQUIRED') { setGateError('auth'); setState('idle'); return; }
        if (data.code === 'PREMIUM_REQUIRED') { setGateError('premium'); setState('idle'); return; }
        throw new Error(data.error || 'Failed');
      }
      await new Promise((r) => setTimeout(r, 500));
      setResult(data.data); setState('done');
    } catch { setState('error'); }
  }, []);

  const handleReset = () => { setState('idle'); setText(''); setResult(null); setGateError(null); };

  return (
    <>
      <ProgressModal isOpen={state === 'processing'} text={text} state={state} />
      <div className="gradient-hero min-h-[calc(100vh-4rem)] relative overflow-hidden">
        <div className="orb orb-gold" style={{ top: '10%', left: '60%' }} />
        <div className="orb orb-coral" style={{ bottom: '10%', left: '-8%' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-12 md:py-24">
          {state !== 'done' ? (
            <div className="max-w-[740px] mx-auto text-center">
              <div className="mb-10 animate-fade-in-up">
                <span className="badge mb-4">✨ Premium Feature</span>
                <h1 className="text-4xl md:text-6xl font-bold text-[#3d3227] tracking-tight leading-none mt-4 mb-4 mx-auto text-center">
                  Make it sound <span className="text-gradient-warm">human</span>
                </h1>
                <p className="text-lg text-[#8c7a64] max-w-xl mx-auto text-center">Transform AI-generated text into natural, human-like writing that preserves meaning.</p>
                <div className="flex flex-wrap justify-center gap-2.5 mt-6">
                  {['✨ Natural tone', '🎯 Preserves meaning', '🚫 Bypasses detection'].map((f) => (
                    <span key={f} className="badge !gap-1.5">{f}</span>
                  ))}
                </div>
              </div>

              {/* Gate: auth required */}
              {gateError === 'auth' && (
                <div className="animate-scale-in p-8 bg-white rounded-3xl border border-[#f5e6cc] shadow-xl shadow-[#3d3227]/6 mb-6">
                  <div className="text-5xl mb-4">👤</div>
                  <h3 className="text-xl font-bold text-[#3d3227] mb-2">Account required</h3>
                  <p className="text-sm text-[#8c7a64] mb-6">Create a free account to access premium features.</p>
                  <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] text-white font-semibold rounded-2xl shadow-lg shadow-[#ff6b6b]/25">
                    Sign up free
                  </Link>
                </div>
              )}

              {/* Gate: premium required */}
              {gateError === 'premium' && (
                <div className="animate-scale-in p-8 bg-white rounded-3xl border border-[#ffa94d] shadow-xl shadow-[#3d3227]/6 mb-6">
                  <div className="text-5xl mb-4">💎</div>
                  <h3 className="text-xl font-bold text-[#3d3227] mb-2">Premium feature</h3>
                  <p className="text-sm text-[#8c7a64] mb-6">Text Humanizer is available on all paid plans. Upgrade to unlock unlimited humanization.</p>
                  <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] text-white font-semibold rounded-2xl shadow-lg shadow-[#ff6b6b]/25">
                    View plans
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              )}

              {/* Input */}
              {!gateError && (
                <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <HeroInput
                    onAnalyze={handleAnalyze}
                    isProcessing={state === 'processing'}
                    buttonText="Humanize Text"
                    placeholder="Paste AI-generated text to humanize..."
                    initialText={prefillText}
                  />
                </div>
              )}
            </div>
          ) : (
            <ResultsDisplay result={result!} toolType="text-humanizer" originalText={text} onReset={handleReset} />
          )}
        </div>
      </div>
    </>
  );
}

export default function TextHumanizerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-[#b8a88e]">Loading...</div></div>}>
      <HumanizerContent />
    </Suspense>
  );
}
