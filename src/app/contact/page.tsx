import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact — VerifyAI' };

export default function ContactPage() {
  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="orb orb-gold" style={{ top: '10%', right: '-5%', width: 250, height: 250 }} />
      <div className="relative z-10 max-w-[720px] mx-auto px-5 lg:px-8 py-16 md:py-24">
        <span className="badge mb-4">📧 Contact</span>
        <h1 className="text-3xl md:text-5xl font-bold text-[#3d3227] tracking-tight mt-3 mb-3">
          Get in <span className="text-gradient-warm">touch</span>
        </h1>
        <p className="text-[#8c7a64] leading-relaxed mb-12 max-w-md">Questions or feedback? We&apos;ll get back within 24 hours.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[{ l: 'Email', v: 'support@verifyai.com' }, { l: 'Chat', v: '9am–6pm EST' }, { l: 'Office', v: 'San Francisco, CA' }].map((i) => (
            <div key={i.l} className="bg-white rounded-2xl border border-[#f5e6cc] p-5 shadow-sm">
              <p className="text-xs font-semibold text-[#b8a88e] uppercase tracking-widest mb-1">{i.l}</p>
              <p className="text-sm font-semibold text-[#3d3227]">{i.v}</p>
            </div>
          ))}
        </div>

        <form className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Name</label>
              <input type="text" className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Email</label>
              <input type="email" className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8c7a64] mb-1.5">Message</label>
            <textarea rows={5} className="w-full px-4 py-3 text-sm border border-[#f5e6cc] focus:border-[#ffa94d] focus:ring-2 focus:ring-[#ffa94d]/20 outline-none rounded-xl transition-all resize-none" placeholder="Tell us more..." />
          </div>
          <button type="submit" className="btn-primary">Send message</button>
        </form>
      </div>
    </div>
  );
}
