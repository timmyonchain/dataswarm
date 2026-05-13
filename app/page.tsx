import Link from 'next/link'

// ── Icons ──────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M8 8V5c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v3" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function EarnIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  )
}

// ── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: '01',
    icon: <UploadIcon />,
    title: 'Upload',
    description:
      "Upload your dataset to 0G's decentralized storage. Permanently stored, instantly accessible.",
  },
  {
    number: '02',
    icon: <AgentIcon />,
    title: 'Validate',
    description:
      '3 specialized AI agents analyze quality, category, and originality. Results written on-chain.',
  },
  {
    number: '03',
    icon: <EarnIcon />,
    title: 'Earn',
    description:
      'Get paid automatically every time someone purchases access to your dataset.',
  },
]

const DATASETS = [
  {
    name: 'Medical Imaging Classification v2',
    category: 'Healthcare',
    score: 97,
    price: '142 OG',
    contributor: '0x4a2f…8e91',
    downloads: 1204,
  },
  {
    name: 'Multilingual Code Comments Dataset',
    category: 'Code',
    score: 94,
    price: '88 OG',
    contributor: '0x7b1c…3d44',
    downloads: 892,
  },
  {
    name: 'Financial Sentiment Analysis Corpus',
    category: 'Finance',
    score: 96,
    price: '215 OG',
    contributor: '0x9f3e…c712',
    downloads: 2103,
  },
]

const BADGE: Record<string, string> = {
  Healthcare: 'bg-[#ECFDF5] text-[#065F46]',
  Code:       'bg-[#EEF2FF] text-[#3730A3]',
  Finance:    'bg-[#FFFBEB] text-[#92400E]',
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="bg-[#FAFAFA]">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* Fade-out gradient so the dot grid dissolves at the bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(250,250,250,0) 60%, rgba(250,250,250,1) 100%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-24 text-center">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-1.5 text-xs font-semibold text-[#6B7280] mb-8 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
            Powered by 0G Blockchain
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-[72px] font-bold tracking-tight text-[#0A0A0A] leading-[1.1] mb-6">
            The AI Training Data<br />
            Marketplace Validated<br />
            By{' '}
            <span className="text-[#4F46E5]">Agent Swarms</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload datasets, let autonomous AI agents verify quality on-chain,
            and earn automatically. Powered by 0G blockchain.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link
              href="/marketplace"
              className="inline-flex h-12 items-center rounded-full bg-[#4F46E5] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
            >
              Explore Datasets
            </Link>
            <Link
              href="/upload"
              className="inline-flex h-12 items-center rounded-full border border-[#D1D5DB] bg-white px-8 text-sm font-semibold text-[#0A0A0A] transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
            >
              Upload Dataset
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mx-auto max-w-xl grid grid-cols-3 divide-x divide-[#E5E5E5] rounded-2xl border border-[#E5E5E5] bg-white py-5 shadow-sm">
            <div className="px-6 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A] tabular-nums">2,847</div>
              <div className="mt-0.5 text-[11px] font-medium text-[#6B7280]">Datasets Validated</div>
            </div>
            <div className="px-6 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A] tabular-nums">$124,000</div>
              <div className="mt-0.5 text-[11px] font-medium text-[#6B7280]">Paid to Contributors</div>
            </div>
            <div className="px-6 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A] tabular-nums">99.2%</div>
              <div className="mt-0.5 text-[11px] font-medium text-[#6B7280]">Accuracy Rate</div>
            </div>
          </div>

        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-[#E5E5E5]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">

          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              How DataSwarm Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map(({ number, icon, title, description }) => (
              <div key={number} className="flex flex-col">

                {/* Icon + step label */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                    {icon}
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.12em] text-[#9CA3AF] uppercase">
                    Step {number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0A0A0A] mb-2">{title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{description}</p>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Featured Datasets ────────────────────────────────────────────── */}
      <section className="bg-[#FAFAFA]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">

          <div className="flex items-end justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0A0A0A]">
              Recently Validated<br className="md:hidden" /> Datasets
            </h2>
            <Link
              href="/marketplace"
              className="hidden md:inline-flex text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DATASETS.map((ds) => (
              <div
                key={ds.name}
                className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white p-6 transition-all duration-200 hover:border-[#C7D2FE] hover:shadow-md"
              >
                {/* Card header: badge + score */}
                <div className="flex items-start justify-between mb-5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[ds.category]}`}>
                    {ds.category}
                  </span>
                  <div className="text-right">
                    <div className="text-3xl font-bold leading-none text-[#0A0A0A] tabular-nums">
                      {ds.score}
                      <span className="text-sm font-medium text-[#9CA3AF]">/100</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      Score
                    </div>
                  </div>
                </div>

                {/* Dataset name */}
                <h3 className="flex-1 text-sm font-semibold leading-snug text-[#0A0A0A] mb-5">
                  {ds.name}
                </h3>

                {/* Meta */}
                <div className="space-y-2 mb-5 border-t border-[#F3F4F6] pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Contributor</span>
                    <span className="font-mono text-[#6B7280]">{ds.contributor}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">{ds.downloads.toLocaleString()} downloads</span>
                    <span className="font-semibold text-[#0A0A0A]">{ds.price}</span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/marketplace"
                  className="flex h-9 w-full items-center justify-center rounded-lg bg-[#4F46E5] text-xs font-semibold text-white transition-colors hover:bg-[#4338CA]"
                >
                  View Dataset
                </Link>

              </div>
            ))}
          </div>

          {/* Mobile "View all" link */}
          <div className="mt-8 text-center md:hidden">
            <Link href="/marketplace" className="text-sm font-semibold text-[#4F46E5]">
              View all datasets →
            </Link>
          </div>

        </div>
      </section>

    </main>
  )
}
