'use client';

export default function TrustBadge() {
  return (
    <div className="flex items-center gap-6 flex-wrap justify-center animate-fade-in-up">
      {/* User count */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-2xl border border-teal-100 shadow-sm shadow-teal-100/30">
        <div className="flex -space-x-2">
          {['#0d9488', '#6366f1', '#14b8a6', '#818cf8'].map((color, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
        <div>
          <div className="text-lg font-bold text-slate-800">+20k</div>
          <div className="text-xs text-slate-500">active users</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-teal-100 shadow-sm shadow-teal-100/30">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">4.8 <span className="text-emerald-500 font-bold">Excellent</span></div>
          <div className="text-xs text-slate-400">2,373 reviews</div>
        </div>
      </div>
    </div>
  );
}
