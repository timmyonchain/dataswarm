'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// ── Types ──────────────────────────────────────────────────────────────────

type Category = 'NLP' | 'Computer Vision' | 'Tabular' | 'Audio' | 'Multimodal'
type Tab = 'uploads' | 'purchases'

interface Upload {
  id: number
  name: string
  category: Category
  score: number
  earnings: string
}

interface Purchase {
  id: number
  name: string
  category: Category
  purchaseDate: string
  price: string
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MY_UPLOADS: Upload[] = [
  {
    id: 1,
    name: 'Twitter Sentiment 2024',
    category: 'NLP',
    score: 94,
    earnings: '2.5',
  },
  {
    id: 2,
    name: 'IoT Sensor Readings',
    category: 'Tabular',
    score: 71,
    earnings: '1.0',
  },
]

const MY_PURCHASES: Purchase[] = [
  {
    id: 3,
    name: 'Medical X-Ray Classification',
    category: 'Computer Vision',
    purchaseDate: 'May 10, 2026',
    price: '8.0',
  },
  {
    id: 4,
    name: 'Financial News Corpus',
    category: 'NLP',
    purchaseDate: 'May 12, 2026',
    price: '3.0',
  },
]

// ── Design tokens ──────────────────────────────────────────────────────────

const BADGE: Record<Category, string> = {
  'NLP':             'bg-[#EEF2FF] text-[#4338CA]',
  'Computer Vision': 'bg-[#F0FDF4] text-[#15803D]',
  'Tabular':         'bg-[#FFFBEB] text-[#B45309]',
  'Audio':           'bg-[#FAF5FF] text-[#7C3AED]',
  'Multimodal':      'bg-[#FFF1F2] text-[#BE185D]',
}

function scoreColor(s: number): string {
  if (s >= 80) return '#16A34A'
  if (s >= 60) return '#D97706'
  return '#DC2626'
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isConnected } = useAccount()
  const [tab, setTab] = useState<Tab>('uploads')

  if (!isConnected) {
    return <NotConnected />
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA]">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-[#6B7280]">
            Manage your datasets and track your earnings
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Earned" value="3.5 OG" accent />
          <StatCard label="Total Spent"  value="11.0 OG" />
          <StatCard label="Datasets Uploaded"  value="2" />
          <StatCard label="Datasets Purchased" value="2" />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="border-b border-[#E5E5E5]">
          <div className="flex gap-0">
            <TabButton active={tab === 'uploads'} onClick={() => setTab('uploads')}>
              My Uploads
            </TabButton>
            <TabButton active={tab === 'purchases'} onClick={() => setTab('purchases')}>
              My Purchases
            </TabButton>
          </div>
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}
        {tab === 'uploads' ? (
          <UploadsTab />
        ) : (
          <PurchasesTab />
        )}

      </div>
    </main>
  )
}

// ── Uploads tab ─────────────────────────────────────────────────────────────

function UploadsTab() {
  return (
    <div className="space-y-4">
      {MY_UPLOADS.map((ds) => (
        <div
          key={ds.id}
          className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Left: name + badges */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[#0A0A0A] truncate">
                  {ds.name}
                </h3>
                <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[ds.category]}`}>
                  {ds.category}
                </span>
                <span
                  className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color: scoreColor(ds.score), backgroundColor: `${scoreColor(ds.score)}18` }}
                >
                  Score {ds.score}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <svg className="h-3.5 w-3.5 text-[#16A34A]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-[#16A34A] font-medium">Validated</span>
              </div>
            </div>
          </div>

          {/* Right: earnings + button */}
          <div className="flex items-center gap-4 sm:shrink-0">
            <div className="text-right">
              <p className="text-xs text-[#9CA3AF]">Earnings</p>
              <p className="text-base font-bold text-[#0A0A0A]">
                {ds.earnings} <span className="text-xs font-semibold text-[#9CA3AF]">OG</span>
              </p>
            </div>
            <button className="h-9 rounded-lg border border-[#4F46E5] px-4 text-xs font-semibold text-[#4F46E5] transition-colors hover:bg-[#EEF2FF] whitespace-nowrap">
              Withdraw Earnings
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Purchases tab ────────────────────────────────────────────────────────────

function PurchasesTab() {
  return (
    <div className="space-y-4">
      {MY_PURCHASES.map((ds) => (
        <div
          key={ds.id}
          className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Left: name + badges */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[#0A0A0A] truncate">
                {ds.name}
              </h3>
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[ds.category]}`}>
                {ds.category}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Purchased {ds.purchaseDate} · {ds.price} OG
            </p>
          </div>

          {/* Right: download button */}
          <button className="h-9 shrink-0 rounded-lg bg-[#4F46E5] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4338CA] whitespace-nowrap">
            Download Dataset
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
      <p className="text-xs font-medium text-[#9CA3AF]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-[#4F46E5]' : 'text-[#0A0A0A]'}`}>
        {value}
      </p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
        active
          ? 'border-[#4F46E5] text-[#4F46E5]'
          : 'border-transparent text-[#6B7280] hover:text-[#0A0A0A]'
      }`}
    >
      {children}
    </button>
  )
}

function NotConnected() {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">Dashboard</h1>
          <p className="mt-1.5 text-sm text-[#6B7280]">
            Manage your datasets and track your earnings
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF2FF]">
          <svg className="h-7 w-7 text-[#4F46E5]" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[#0A0A0A]">
          Connect your wallet
        </h2>
        <p className="mb-7 text-sm text-[#6B7280]">
          Connect wallet to view your dashboard
        </p>
        <ConnectButton />
      </div>
    </main>
  )
}
