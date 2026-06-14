import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy — VerifyAI' };

const sections = [
  { t: 'Information we collect', b: 'We collect text you submit for analysis along with basic usage data. Text is processed in memory and not stored after analysis.' },
  { t: 'How we use data', b: 'Your text is used solely to provide detection, plagiarism checking, and humanization. We never sell or share your data.' },
  { t: 'Security', b: 'All data is encrypted in transit (TLS 1.3). Text submissions are processed ephemerally. Account data is stored securely.' },
  { t: 'Cookies', b: 'We use essential cookies for authentication. Analytics cookies help us improve the product. You can disable non-essential cookies.' },
  { t: 'Your rights', b: 'You can access, correct, or delete your data at any time. We comply with GDPR and CCPA.' },
];

export default function PrivacyPage() {
  return (
    <div className="gradient-hero min-h-[calc(100vh-4rem)]">
      <div className="max-w-[720px] mx-auto px-5 lg:px-8 py-16 md:py-24">
        <span className="badge mb-4">Legal</span>
        <h1 className="text-3xl md:text-5xl font-bold text-[#3d3227] tracking-tight mt-3 mb-2">Privacy <span className="text-gradient-warm">policy</span></h1>
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
