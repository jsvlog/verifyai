'use client';

import { useState, useEffect, useCallback } from 'react';
import { testimonials } from '@/lib/testimonials';

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const total = testimonials.length;

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 4000);
    return () => clearInterval(timer);
  }, [total]);

  const t = testimonials[current];

  return (
    <div className="w-full animate-fade-in">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm p-5 min-h-[120px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
            {t.initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{t.name}</div>
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < t.rating ? 'text-amber-400' : 'text-slate-200'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-slate-400">{t.date}</span>
            </div>
          </div>
        </div>

        {/* Quote */}
        <p className="text-sm text-slate-600 leading-relaxed italic">
          &ldquo;{t.text}&rdquo;
        </p>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? 'w-5 bg-gradient-to-r from-teal-500 to-indigo-500'
                  : 'w-1.5 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
