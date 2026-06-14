'use client';

import { useState, useCallback } from 'react';
import HeroInput from '@/components/HeroInput';
import ProgressModal from '@/components/ProgressModal';
import ResultsDisplay from '@/components/ResultsDisplay';
import { PlagiarismResult, ProcessingState } from '@/lib/types';

export default function PlagiarismCheckerPage() {
  const [state, setState] = useState<ProcessingState>('idle');
  const [text, setText] = useState('');
  const [result, setResult] = useState<PlagiarismResult | null>(null);

  const handleAnalyze = useCallback(async (inputText: string) => {
    setText(inputText); setState('processing'); setResult(null);
    try {
      const res = await fetch('/api/plagiarism', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: inputText }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      await new Promise((r) => setTimeout(r, 500));
      setResult(data.data); setState('done');
    } catch { setState('error'); }
  }, []);

  const handleReset = () => { setState('idle'); setText(''); setResult(null); };

  return (
    <>
      <ProgressModal isOpen={state === 'processing'} text={text} state={state} />
      <div className="gradient-hero min-h-[calc(100vh-4rem)] relative overflow-hidden">
        <div className="orb orb-coral" style={{ top: '-5%', right: '-10%' }} />
        <div className="orb orb-amber" style={{ bottom: '5%', left: '-5%' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-12 md:py-24">
          {state !== 'done' ? (
            <div className="max-w-[740px] mx-auto text-center">
              <div className="mb-10 animate-fade-in-up">
                <span className="badge mb-4">📋 Plagiarism Checker</span>
                <h1 className="text-4xl md:text-6xl font-bold text-[#3d3227] tracking-tight leading-none mt-4 mb-4 mx-auto text-center">
                  Verify <span className="text-gradient-warm">originality</span>
                </h1>
                <p className="text-lg text-[#8c7a64] max-w-xl mx-auto text-center">Scan your text against billions of sources to ensure it&apos;s 100% original and properly cited.</p>
                <div className="flex flex-wrap justify-center gap-2.5 mt-6">
                  {['🌐 Web sources', '📚 Academic database', '🔗 Source matching'].map((f) => (
                    <span key={f} className="badge !gap-1.5">{f}</span>
                  ))}
                </div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <HeroInput onAnalyze={handleAnalyze} isProcessing={state === 'processing'} buttonText="Check Plagiarism" placeholder="Paste text to check for plagiarism..." />
              </div>
            </div>
          ) : (
            <ResultsDisplay result={result!} toolType="plagiarism-checker" onReset={handleReset} />
          )}
        </div>
      </div>
    </>
  );
}
