'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DatasetRow } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

interface Dataset {
  id:          number
  name:        string
  category:    Category
  score:       number
  price:       string
  purchases:   number
  contributor: string
  description: string
}

type Category = 'NLP' | 'Computer Vision' | 'Tabular' | 'Audio' | 'Multimodal'
type SortKey  = 'Newest' | 'Highest Score' | 'Lowest Price' | 'Most Popular'

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_DATASETS: Dataset[] = [
  {
    id: 1, name: 'Twitter Sentiment 2024', category: 'NLP',
    score: 94, price: '2.5', purchases: 47,
    contributor: '0x1a2b...3c4d',
    description: '500K tweets labeled positive/negative/neutral with confidence scores and timestamp metadata.',
  },
  {
    id: 2, name: 'Medical X-Ray Classification', category: 'Computer Vision',
    score: 88, price: '8.0', purchases: 23,
    contributor: '0x5e6f...7a8b',
    description: '50K chest X-rays with multi-label disease annotations reviewed by certified radiologists.',
  },
  {
    id: 3, name: 'E-commerce Product Reviews', category: 'NLP',
    score: 76, price: '1.5', purchases: 89,
    contributor: '0x9c0d...1e2f',
    description: '2M product reviews across 50 categories with verified purchase status and star ratings.',
  },
  {
    id: 4, name: 'Autonomous Driving Clips', category: 'Computer Vision',
    score: 91, price: '15.0', purchases: 12,
    contributor: '0x3a4b...5c6d',
    description: '10K labeled video clips captured in urban environments for real-time object detection training.',
  },
  {
    id: 5, name: 'Financial News Corpus', category: 'NLP',
    score: 82, price: '3.0', purchases: 34,
    contributor: '0x7e8f...9a0b',
    description: '1M financial news articles from 2020–2024 with entity tagging and market-impact labels.',
  },
  {
    id: 6, name: 'IoT Sensor Readings', category: 'Tabular',
    score: 71, price: '0.5', purchases: 156,
    contributor: '0x1c2d...3e4f',
    description: '10M IoT sensor readings from industrial equipment with ground-truth anomaly labels.',
  },
]

const CATEGORIES: Category[] = ['NLP', 'Computer Vision', 'Tabular', 'Audio', 'Multimodal']

const SORT_KEYS: SortKey[] = ['Newest', 'Highest Score', 'Lowest Price', 'Most Popular']

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

function rowToDataset(row: DatasetRow): Dataset {
  const cat = CATEGORIES.includes(row.category as Category)
    ? (row.category as Category)
    : 'Tabular'
  const addr = row.contributor_address ?? ''
  return {
    id:          row.id,
    name:        row.name,
    category:    cat,
    score:       row.validation_score ?? 0,
    price:       row.price ?? '0',
    purchases:   0,
    contributor: addr.length > 10
      ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
      : addr || '0x????...????',
    description: row.description || 'No description provided.',
  }
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState<Category | 'All'>('All')
  const [minScore,    setMinScore]    = useState(0)
  const [sortBy,      setSortBy]      = useState<SortKey>('Newest')
  const [liveRows,    setLiveRows]    = useState<Dataset[]>([])
  const [liveLoading, setLiveLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setLiveRows((data as DatasetRow[]).map(rowToDataset))
        }
        setLiveLoading(false)
      })
  }, [])

  const allDatasets = useMemo(() => [...liveRows, ...MOCK_DATASETS], [liveRows])

  const filtered = useMemo(() => {
    let list = [...allDatasets]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
      )
    }

    if (category !== 'All') {
      list = list.filter((d) => d.category === category)
    }

    list = list.filter((d) => d.score >= minScore)

    switch (sortBy) {
      case 'Newest':        list.sort((a, b) => b.id - a.id);                                  break
      case 'Highest Score': list.sort((a, b) => b.score - a.score);                            break
      case 'Lowest Price':  list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));    break
      case 'Most Popular':  list.sort((a, b) => b.purchases - a.purchases);                    break
    }

    return list
  }, [search, category, minScore, sortBy, allDatasets])

  const hasFilters =
    search.trim() !== '' || category !== 'All' || minScore > 0 || sortBy !== 'Newest'

  const resetFilters = () => {
    setSearch('')
    setCategory('All')
    setMinScore(0)
    setSortBy('Newest')
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA]">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">
                Dataset Marketplace
              </h1>
              <p className="mt-1.5 text-sm text-[#6B7280]">
                All datasets verified by autonomous AI agent swarms
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-1.5 sm:self-auto">
              {liveLoading ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                  <span className="text-xs font-semibold text-[#6B7280]">Loading…</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
                  <span className="text-xs font-semibold text-[#6B7280]">
                    {filtered.length} dataset{filtered.length !== 1 ? 's' : ''} available
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 border-b border-[#E5E5E5] bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] pl-9 pr-3 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
              />
            </div>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | 'All')}
              className="h-9 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-3 pr-8 text-sm font-medium text-[#0A0A0A] outline-none transition-colors focus:border-[#4F46E5] appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '2rem' }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Score slider */}
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-semibold text-[#6B7280]">
                Score ≥ <span className="text-[#0A0A0A]">{minScore}</span>
              </span>
              <input
                type="range"
                min="0" max="100" step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-28 cursor-pointer"
                style={{ accentColor: '#4F46E5' }}
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-sm font-medium text-[#0A0A0A] outline-none transition-colors focus:border-[#4F46E5] appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '2rem' }}
            >
              {SORT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>

            {/* Reset */}
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="h-9 rounded-lg px-3 text-xs font-semibold text-[#4F46E5] transition-colors hover:bg-[#EEF2FF]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ds) => (
              <DatasetCard key={`${ds.id}-${ds.name}`} dataset={ds} />
            ))}
          </div>
        )}
      </div>

    </main>
  )
}

// ── Dataset card ────────────────────────────────────────────────────────────

function DatasetCard({ dataset: ds }: { dataset: Dataset }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-[#E5E5E5] bg-white p-6 transition-all duration-200 hover:border-[#C7D2FE] hover:shadow-md">

      {/* Row 1: badge + score ring */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[ds.category]}`}>
          {ds.category}
        </span>
        <ScoreRing score={ds.score} />
      </div>

      {/* Dataset name */}
      <h3 className="mb-2 text-sm font-bold leading-snug text-[#0A0A0A] group-hover:text-[#4F46E5] transition-colors">
        {ds.name}
      </h3>

      {/* Description — 2-line clamp */}
      <p className="mb-5 text-xs leading-relaxed text-[#6B7280] line-clamp-2 flex-1">
        {ds.description}
      </p>

      {/* Divider */}
      <div className="mb-4 border-t border-[#F3F4F6]" />

      {/* Price + purchases */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#0A0A0A]">{ds.price}</span>
          <span className="text-xs font-semibold text-[#9CA3AF]">OG</span>
        </div>
        <span className="text-xs text-[#9CA3AF]">
          {ds.purchases.toLocaleString()} purchase{ds.purchases !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Contributor */}
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="text-[#9CA3AF]">Contributor</span>
        <span className="font-mono text-[#6B7280]">{ds.contributor}</span>
      </div>

      {/* CTA */}
      <Link
        href={`/dataset/${ds.id}`}
        className="flex h-9 w-full items-center justify-center rounded-lg bg-[#4F46E5] text-xs font-semibold text-white transition-colors hover:bg-[#4338CA]"
      >
        View Dataset
      </Link>

    </div>
  )
}

// ── Score ring ──────────────────────────────────────────────────────────────

const RING_R    = 16
const RING_CIRC = 2 * Math.PI * RING_R // ≈ 100.53

function ScoreRing({ score }: { score: number }) {
  const color  = scoreColor(score)
  const offset = RING_CIRC * (1 - score / 100)

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <svg width="44" height="44" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={RING_R} fill="none" stroke="#F3F4F6" strokeWidth="4" />
        <circle
          cx="20" cy="20" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span
        className="absolute text-[11px] font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6]">
        <svg className="h-7 w-7 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          <path d="M8 11h6M11 8v6" />
        </svg>
      </div>
      <h3 className="mb-1 text-base font-semibold text-[#0A0A0A]">
        No datasets match your filters
      </h3>
      <p className="mb-6 text-sm text-[#6B7280]">
        Try adjusting your search or filter criteria
      </p>
      <button
        onClick={onReset}
        className="inline-flex h-9 items-center rounded-full bg-[#4F46E5] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#4338CA]"
      >
        Reset Filters
      </button>
    </div>
  )
}
