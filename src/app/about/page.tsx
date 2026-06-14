import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About — VerifyAI' }

const stats = [
  { value: '20K+', label: 'Active users' },
  { value: '1M+', label: 'Texts analyzed' },
  { value: '99.2%', label: 'Detection accuracy' },
  { value: '150+', label: 'Countries' },
]

const values = [
  {
    icon: '🎯',
    title: 'Accuracy First',
    desc: 'We use state-of-the-art machine learning models trained on millions of human and AI-generated texts to deliver the most accurate detection available.',
  },
  {
    icon: '🔒',
    title: 'Privacy by Design',
    desc: 'Your text is never stored or used for training. All processing happens in real-time and data is encrypted both in transit and at rest.',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'Get results in under 5 seconds. Our optimized detection pipeline analyzes thousands of linguistic features concurrently for instant feedback.',
  },
  {
    icon: '🌍',
    title: 'Accessible to All',
    desc: 'Whether you\'re a student, educator, publisher, or content creator — VerifyAI gives you professional-grade AI detection at an affordable price.',
  },
]

export default function AboutPage() {
  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="orb orb-coral" style={{ top: '-5%', right: '-8%' }} />
      <div className="orb orb-amber" style={{ bottom: '10%', left: '-5%' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-5 lg:px-8 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in-up">
          <span className="badge mb-4">About us</span>
          <h1 className="text-3xl md:text-5xl font-bold text-[#3d3227] tracking-tight mt-3 mb-4">
            Making AI detection <span className="text-gradient-warm">trustworthy</span>
          </h1>
          <p className="text-lg text-[#8c7a64] max-w-2xl mx-auto leading-relaxed">
            VerifyAI was built to bridge the gap between AI-generated and human-written content. 
            We believe in giving everyone the tools to verify authenticity — not with fear, but with confidence.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-[#f5e6cc] shadow-sm p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#3d3227] tracking-tight">{stat.value}</div>
              <p className="text-xs text-[#b8a88e] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[#3d3227] text-center mb-4">Our values</h2>
          <p className="text-sm text-[#b8a88e] text-center mb-10 max-w-md mx-auto">
            What drives everything we build
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-3xl border border-[#f5e6cc] shadow-lg p-6 md:p-8 hover:shadow-xl hover:border-[#ffe3bf] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fff5f5] to-[#fff9f0] flex items-center justify-center text-2xl mb-4 shadow-sm">
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold text-[#3d3227] mb-2">{v.title}</h3>
                <p className="text-sm text-[#8c7a64] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pb-8 animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-[#ffe3bf] shadow-xl shadow-[#ffa94d]/10 p-10 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ffa94d] flex items-center justify-center shadow-lg shadow-[#ff6b6b]/25 mb-6 mx-auto">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#3d3227] mb-3">Ready to detect AI content?</h2>
            <p className="text-sm text-[#8c7a64] mb-6 max-w-sm mx-auto">
              Join thousands of writers, educators, and publishers who trust VerifyAI every day.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/" className="btn-primary">
                Try it free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link href="/pricing" className="btn-secondary">
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
