import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms — VerifyAI' };

const sections = [
  { t: 'Acceptance', b: 'By using VerifyAI, you agree to these terms. If you disagree, please do not use the service.' },
  { t: 'Service', b: 'VerifyAI provides AI content detection, plagiarism checking, and text humanization. We may modify features at any time.' },
  { t: 'Your responsibilities', b: 'You are responsible for content you submit. Do not use the service for unlawful purposes. You must be 13 or older.' },
  { t: 'Intellectual property', b: 'The VerifyAI platform is our property. Content you submit remains yours — we claim no ownership.' },
  { t: 'Limitation of liability', b: 'The service is provided "as is." AI detection results are estimates. We are not liable for damages.' },
  { t: 'Changes', b: 'We may update these terms. Continued use after changes constitutes acceptance.' },
];

export default function TermsPage() {
  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)]">
      <div className="max-w-[720px] mx-auto px-5 lg:px-8 py-16 md:py-24">
        <span className="badge mb-4">Legal</span>
        <h1 className="text-3xl md:text-5xl font-bold text-[#3d3227] tracking-tight mt-3 mb-2">Terms of <span className="text-gradient-warm">service</span></h1>
        <p className="text-sm text-[#b8a88e] mb-12">Last updated: June 2026</p>
        <div className="space-y-10">
          {sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-lg font-bold text-[#3d3227] mb-2">{s.t}</h2>
              <p className="text-[#8c7a64] leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
