'use client';

import { useState, useRef, useCallback } from 'react';

interface HeroInputProps {
  placeholder?: string;
  onAnalyze: (text: string) => void;
  buttonText?: string;
  isProcessing?: boolean;
}

export default function HeroInput({
  placeholder = 'Paste or type your text here...',
  onAnalyze,
  buttonText = 'Analyze Text',
  isProcessing = false,
}: HeroInputProps) {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charCount = text.length;

  const handlePaste = async () => {
    try { const t = await navigator.clipboard.readText(); setText(t); } catch {}
  };

  const handleFile = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => setText((prev) => (prev ? prev + '\n' : '') + (e.target?.result as string));
    r.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = () => { if (text.trim().length > 0) onAnalyze(text); };

  return (
    <div
      className={`w-full bg-white rounded-2xl border transition-all duration-200 ${
        isDragOver ? 'border-[#ff6b6b] bg-[#fff5f5] shadow-lg shadow-[#ff6b6b]/10' : 'border-[#f5e6cc] shadow-lg shadow-[#3d3227]/6'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={7}
        className="w-full px-6 pt-6 pb-2 text-[15px] leading-relaxed text-[#3d3227] placeholder-[#b8a88e] resize-none outline-none bg-transparent"
        disabled={isProcessing}
        style={{ fontFamily: 'inherit' }}
      />

      <div className="flex items-center justify-between px-5 pb-5 pt-1 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={handlePaste} disabled={isProcessing} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Paste
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload file
          </button>
          <input ref={fileInputRef} type="file" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept=".txt,.doc,.docx,.pdf" className="hidden" />
          {charCount > 0 && <span className="text-xs text-[#b8a88e] ml-1 tabular-nums">{charCount.toLocaleString()} / 25,000</span>}
        </div>

        <button onClick={handleSubmit} disabled={isProcessing || text.trim().length === 0} className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:transform-none">
          {isProcessing ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              {buttonText}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
