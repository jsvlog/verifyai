'use client';

import { useState, useEffect } from 'react';
import { ProcessingState } from '@/lib/types';

interface ProgressModalProps {
  isOpen: boolean;
  text: string;
  state: ProcessingState;
}

const steps = [
  'Scanning for AI patterns',
  'Analyzing sentence structure',
  'Cross-referencing models',
  'Building your report',
];

export default function ProgressModal({ isOpen, text, state }: ProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (state === 'processing') {
      setProgress(0);
      setCurrentStep(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95;
          const next = prev + Math.random() * 10 + 3;
          const newStep = Math.min(Math.floor(next / 25), 3);
          setCurrentStep(newStep);
          return Math.min(next, 95);
        });
      }, 400);
      return () => clearInterval(interval);
    }
    if (state === 'done') { setProgress(100); setCurrentStep(3); }
    if (state === 'idle') { setProgress(0); setCurrentStep(0); }
  }, [state]);

  if (!isOpen) return null;

  const preview = text.length > 50 ? text.substring(0, 47) + '...' : text;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#3d3227]/30 backdrop-blur-sm animate-fade-in" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-[#3d3227]/15 p-8 animate-scale-in overflow-hidden">
        {/* Top glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff6b6b] via-[#ffa94d] to-[#ffd93d] animate-shimmer" />

        {state === 'processing' && (
          <div className="text-center">
            {/* Animated icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#ff6b6b]/10 to-[#ffa94d]/10 flex items-center justify-center animate-pulse-glow">
              <svg className="w-8 h-8 text-[#ff6b6b] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-[#3d3227] mb-1">Analyzing your text</h3>
            <p className="text-sm text-[#b8a88e] mb-6 truncate">&ldquo;{preview}&rdquo;</p>

            {/* Steps */}
            <div className="space-y-2.5 mb-6 text-left">
              {steps.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                      done ? 'bg-[#40c057]' : active ? 'bg-[#ff6b6b]' : 'bg-[#f5e6cc]'
                    }`}>
                      {done ? (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : active ? (
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      ) : null}
                    </div>
                    <span className={`text-[13px] font-medium transition-colors ${
                      done ? 'text-[#b8a88e]' : active ? 'text-[#3d3227]' : 'text-[#e0cfb0]'
                    }`}>{step}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-[#fef0d7] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-[#b8a88e] tabular-nums">{Math.round(progress)}%</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#fff5f5] flex items-center justify-center">
              <svg className="w-7 h-7 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#3d3227] mb-1">Something went wrong</p>
            <p className="text-sm text-[#8c7a64]">Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
