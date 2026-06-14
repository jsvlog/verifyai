'use client';

export default function TrustBadge() {
  return (
    <div className="flex items-center gap-6 flex-wrap justify-center animate-fade-in-up">
      {/* User count */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-[#f5e6cc] shadow-sm">
        <div className="flex -space-x-2">
          {['#ff6b6b', '#ffa94d', '#ff8787', '#fab005'].map((color, i) => (
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
          <div className="text-lg font-bold text-[#3d3227]">+20k</div>
          <div className="text-xs text-[#b8a88e]">active users</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl border border-[#f5e6cc] shadow-sm">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className="w-4 h-4 text-[#fab005]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#3d3227]">4.8 <span className="text-[#40c057] font-bold">Excellent</span></div>
          <div className="text-xs text-[#b8a88e]">2,373 reviews</div>
        </div>
      </div>

      {/* Security */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl border border-[#f5e6cc] shadow-sm">
        <svg className="w-5 h-5 text-[#40c057]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <div className="text-sm font-semibold text-[#3d3227]">SSL Encrypted</div>
          <div className="text-xs text-[#b8a88e]">256-bit security</div>
        </div>
      </div>
    </div>
  );
}
