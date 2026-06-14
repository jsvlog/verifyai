import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Pricing — VerifyAI' }

const plans = [
  {
    name: '2-Week Plan',
    price: '$9.99',
    originalPrice: '$19.99',
    period: '2 weeks',
    popular: false,
    features: [
      'Elite AI Humanizer',
      'Precision Tone & Style Tuning',
      'Pro Grammar & Polish Engine',
      'Smart AI Detection',
      'Deep Sentence-Level Insights',
      'Full Project History Log',
      'On-Demand Data Erasure',
      'Deep Plagiarism Scan',
      'Priority Beta Access',
      '2-week Full Performance Pass',
    ],
  },
  {
    name: '4-Week Plan',
    price: '$14.99',
    originalPrice: '$29.99',
    period: '4 weeks',
    popular: true,
    features: [
      'Elite AI Humanizer',
      'Precision Tone & Style Tuning',
      'Pro Grammar & Polish Engine',
      'Smart AI Detection',
      'Deep Sentence-Level Insights',
      'Full Project History Log',
      'On-Demand Data Erasure',
      'Deep Plagiarism Scan',
      'Priority Beta Access',
      '4-week Full Performance Pass',
    ],
  },
  {
    name: '12-Week Plan',
    price: '$29.99',
    originalPrice: '$59.99',
    period: '12 weeks',
    popular: false,
    badge: 'Best Value',
    features: [
      'Elite AI Humanizer',
      'Precision Tone & Style Tuning',
      'Pro Grammar & Polish Engine',
      'Smart AI Detection',
      'Deep Sentence-Level Insights',
      'Full Project History Log',
      'On-Demand Data Erasure',
      'Deep Plagiarism Scan',
      'Priority Beta Access',
      '12-week Full Performance Pass',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="orb orb-coral" style={{ top: '-5%', right: '-10%' }} />
      <div className="orb orb-gold" style={{ bottom: '10%', left: '5%' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-5 lg:px-8 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-14 animate-fade-in-up">
          <span className="badge mb-4">💎 Pricing</span>
          <h1 className="text-3xl md:text-5xl font-bold text-[#3d3227] tracking-tight mt-3 mb-3">
            Choose your <span className="text-gradient-warm">plan</span>
          </h1>
          <p className="text-[#8c7a64] max-w-md mx-auto">
            Time-based plans with full access to all features. No subscriptions, no auto-renewals — pay once, use fully.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-3xl border-2 p-8 flex flex-col ${
                plan.popular
                  ? 'border-[#ffa94d] shadow-xl shadow-[#ffa94d]/10 scale-[1.02]'
                  : 'border-[#f5e6cc] shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                  Most popular
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#ffa94d] to-[#ffd93d] text-[#3d3227] text-xs font-bold px-4 py-1 rounded-full shadow-md">
                  {plan.badge}
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-[#3d3227] mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-[#3d3227] tracking-tight">{plan.price}</span>
                  <span className="text-sm text-[#b8a88e]">/ {plan.period}</span>
                </div>
                <p className="text-sm text-[#b8a88e] line-through mt-1">{plan.originalPrice}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <svg className="w-4 h-4 text-[#40c057] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[#8c7a64]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/api/checkout?plan=${encodeURIComponent(plan.name)}`}
                className={`w-full text-center py-3 text-sm font-semibold rounded-xl transition-all ${
                  plan.popular
                    ? 'btn-primary'
                    : 'text-[#ff6b6b] border-2 border-[#ff6b6b] hover:bg-[#fff5f5]'
                }`}
              >
                Get {plan.name}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust */}
        <div className="text-center mt-12">
          <p className="text-xs text-[#b8a88e]">
            🔒 Secure payment via Lemon Squeezy &bull; No auto-renewal &bull; Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
