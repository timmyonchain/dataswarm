'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useWriteContract, useReadContract, useConfig, useAccount } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { parseEther } from 'viem'
import { supabase } from '@/lib/supabase'
import type { DatasetRow } from '@/lib/supabase'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract'

// ── Types ──────────────────────────────────────────────────────────────────

type Category = 'NLP' | 'Computer Vision' | 'Tabular' | 'Audio' | 'Multimodal'
type PurchaseState = 'idle' | 'wallet' | 'confirming' | 'done' | 'error'
type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

interface DatasetDetail {
  id:          number
  name:        string
  category:    Category
  score:       number
  price:       string
  purchases:   number
  contributor: string
  description: string
  listedAt:    string
  storageHash: string
  reportHash:  string
  txHash?:     string
  onchainId?:  number
  isLive?:     boolean
  validation: {
    quality:   { score: number; issues: string[]; strengths: string[] }
    category:  { subcategory: string; useCases: string[] }
    duplicate: { similarityScore: number; originality: string; warning: string }
  }
}

// ── Mock dataset details ────────────────────────────────────────────────────

const DATASETS: DatasetDetail[] = [
  {
    id: 1, name: 'Twitter Sentiment 2024', category: 'NLP',
    score: 94, price: '2.5', purchases: 47,
    contributor: '0x1a2b...3c4d',
    description:
      'A large-scale collection of 500,000 tweets gathered throughout 2024, each labeled positive, negative, or neutral using a consensus of three independent human annotators. Tweets span topics including politics, sports, technology, and entertainment, with each entry carrying a confidence score, timestamp, geo-region tag, and original language code. The dataset is balanced across sentiment classes and was filtered for duplicate and bot-generated content before release.',
    listedAt: 'May 2, 2026',
    storageHash: '0x3f8a1c92e74b5d06f2190a3c8e74b5d0' + '6f2190a3c8e74b5d06f2190a3c',
    reportHash:  '0xa1c92e74b3f85d06f219' + '0a3c8e74b5d06f2190a3c8e74b5d06f2190a3',
    validation: {
      quality: {
        score: 96,
        issues:    ['Minor encoding artifacts present in 0.3% of samples'],
        strengths: ['500K+ scale with consistent labeling methodology', 'Well-balanced class distribution', 'Temporal diversity across full calendar year', 'Confidence scores included per annotation'],
      },
      category: {
        subcategory: 'Sentiment Analysis',
        useCases:    ['Social media monitoring', 'Brand reputation analysis', 'Political sentiment tracking', 'Customer feedback classification', 'Trend detection'],
      },
      duplicate: {
        similarityScore: 6,
        originality: 'Highly original dataset. No significant overlap detected with any known public sentiment corpus. The 2024 temporal window and multi-topic scope provide unique coverage.',
        warning: '',
      },
    },
  },
  {
    id: 2, name: 'Medical X-Ray Classification', category: 'Computer Vision',
    score: 88, price: '8.0', purchases: 23,
    contributor: '0x5e6f...7a8b',
    description:
      '50,000 chest X-ray images annotated with multi-label disease classifications across 14 conditions including pneumonia, cardiomegaly, and pleural effusion. All annotations were reviewed by board-certified radiologists and cross-validated against clinical discharge records. Images are 1024×1024px, anonymized in compliance with HIPAA regulations, and include patient age bracket, sex, and imaging equipment metadata. Class weighting information is provided to account for natural disease prevalence imbalance.',
    listedAt: 'Apr 28, 2026',
    storageHash: '0x7b2c4d5e8f1a93b6c7d4' + 'e5f1a93b6c7d4e5f1a93b6c7d4e5f1a93b6c',
    reportHash:  '0xd4e5f1a93b6c7' + 'd4e5f1a93b6c7d4e5f1a93b6c7d4e5f1a93b6c7d4e',
    validation: {
      quality: {
        score: 89,
        issues:    ['Uneven class distribution for rare diseases (< 0.5% prevalence)', '12 samples with ambiguous multi-label annotations flagged for review'],
        strengths: ['Clinical-grade annotations reviewed by certified radiologists', '1024×1024 high-resolution imaging', '14-condition multi-label coverage', 'Full HIPAA-compliant anonymization'],
      },
      category: {
        subcategory: 'Medical Imaging Classification',
        useCases:    ['Automated disease screening', 'Radiology AI model training', 'Clinical decision support systems', 'Telemedicine triage tooling'],
      },
      duplicate: {
        similarityScore: 12,
        originality: 'Original clinical dataset. No meaningful overlap found with major public medical imaging repositories including CheXpert or NIH Chest X-ray.',
        warning: '',
      },
    },
  },
  {
    id: 3, name: 'E-commerce Product Reviews', category: 'NLP',
    score: 76, price: '1.5', purchases: 89,
    contributor: '0x9c0d...1e2f',
    description:
      'Two million product reviews collected from 50 merchandise categories including electronics, clothing, household goods, and beauty. Each review includes star rating, verified-purchase flag, review text, review title, upvote count, and a timestamp. Data spans a 36-month collection window and covers 120,000 unique products. Language detection and basic deduplication was performed, though a minority of near-duplicate and non-English entries remain. Suitable for large-scale opinion mining and recommendation model training.',
    listedAt: 'Apr 15, 2026',
    storageHash: '0x9e1f2a3b4c5d6e7f8a9b' + '0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
    reportHash:  '0xc3d4e5f6a7b8' + 'c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9',
    validation: {
      quality: {
        score: 76,
        issues:    ['4% non-English content without language tags', '1.2% suspected near-duplicate reviews across product variants', 'Inconsistent date formatting across data sources'],
        strengths: ['2M+ scale across 50 diverse categories', 'Verified purchase labels included', 'Star rating to text sentiment correlation validated'],
      },
      category: {
        subcategory: 'Opinion Mining & Review Analysis',
        useCases:    ['Recommendation engine training', 'Aspect-based sentiment analysis', 'Product ranking algorithms', 'Fake review detection models'],
      },
      duplicate: {
        similarityScore: 24,
        originality: 'Partially overlaps with known public review corpora. Novel category filtering and verified-purchase labeling provide differentiating value.',
        warning: 'Estimated 24% overlap with publicly available e-commerce review datasets. Review the data card before training deduplication-sensitive models.',
      },
    },
  },
  {
    id: 4, name: 'Autonomous Driving Clips', category: 'Computer Vision',
    score: 91, price: '15.0', purchases: 12,
    contributor: '0x3a4b...5c6d',
    description:
      '10,000 short video clips (3–8 seconds each) captured from front-facing and side cameras mounted on a vehicle driven through 6 major cities. Each frame is annotated with bounding boxes for pedestrians, vehicles, cyclists, traffic signs, and lane markings. Annotations were produced using a semi-automated pipeline with human verification at 10fps keyframe intervals. LiDAR point-cloud data is provided for 40% of clips. HD map integration metadata is included for all sequences.',
    listedAt: 'May 8, 2026',
    storageHash: '0xb5c6d7e8f9a0b1c2d3e4' + 'f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
    reportHash:  '0xe4f5a6b7c8d9' + 'e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
    validation: {
      quality: {
        score: 93,
        issues:    ['Night-scene coverage limited to 8% of total clips'],
        strengths: ['Frame-accurate bounding box annotations at 10fps', 'Multi-sensor data fusion (camera + LiDAR)', 'High urban environment diversity across 6 cities', 'HD map integration for ego-trajectory context'],
      },
      category: {
        subcategory: 'Video Object Detection for Autonomous Systems',
        useCases:    ['Autonomous vehicle perception stacks', 'Pedestrian safety detection', 'Traffic sign and light recognition', 'Lane-change prediction models'],
      },
      duplicate: {
        similarityScore: 9,
        originality: 'Proprietary capture routes with novel urban coverage. No meaningful intersection with NuScenes, KITTI, or Waymo Open Dataset.',
        warning: '',
      },
    },
  },
  {
    id: 5, name: 'Financial News Corpus', category: 'NLP',
    score: 82, price: '3.0', purchases: 34,
    contributor: '0x7e8f...9a0b',
    description:
      'One million financial news articles sourced from 47 publishers covering global equity, commodity, crypto, and macroeconomic events from January 2020 through December 2024. Each article is tagged with named entities (companies, people, instruments), an event type label, and a market-impact score derived from same-day price movement of mentioned tickers. Content from paywalled sources was legally licensed. The dataset is partitioned by year and asset class to facilitate temporal backtesting.',
    listedAt: 'Apr 22, 2026',
    storageHash: '0xf1a2b3c4d5e6f7a8b9c0' + 'd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8',
    reportHash:  '0xa8b9c0d1e2f3' + 'a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
    validation: {
      quality: {
        score: 83,
        issues:    ['6% of articles contain paraphrased paywalled content', 'Entity tagging inconsistency observed across two source publications'],
        strengths: ['47-source coverage spanning global financial press', '5-year temporal span for robust backtesting', 'Market-impact correlation annotations', 'Event-type labels across 12 financial event categories'],
      },
      category: {
        subcategory: 'Financial News Analysis',
        useCases:    ['Market sentiment signal generation', 'Algorithmic trading model training', 'Financial risk and event detection', 'NER fine-tuning for the finance domain'],
      },
      duplicate: {
        similarityScore: 17,
        originality: 'Compiled from licensed proprietary sources with a unique market-impact labeling methodology not present in public financial NLP datasets.',
        warning: '',
      },
    },
  },
  {
    id: 6, name: 'IoT Sensor Readings', category: 'Tabular',
    score: 71, price: '0.5', purchases: 156,
    contributor: '0x1c2d...3e4f',
    description:
      '10 million sensor readings captured at 1 Hz from 240 industrial IoT devices across a manufacturing facility over an 18-month period. Sensors measure temperature, vibration, pressure, current draw, and humidity. Each anomaly event has been manually verified by a maintenance engineer and labeled with fault type (bearing wear, overheating, pressure leak, electrical fault). The dataset includes pre-fault windows of 60 seconds to support predictive failure modeling. Three months of readings contain intermittent humidity channel data loss.',
    listedAt: 'Mar 30, 2026',
    storageHash: '0xd3e4f5a6b7c8d9e0f1a2' + 'b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
    reportHash:  '0xb7c8d9e0f1a2' + 'b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
    validation: {
      quality: {
        score: 72,
        issues:    ['Sensor drift artifacts in 8% of vibration channel readings', '3% missing timestamp records across November 2023', 'Humidity channel data absent for a 90-day window'],
        strengths: ['1 Hz high-frequency continuous sampling', '18-month uninterrupted observation window', 'Ground-truth anomaly labels verified by maintenance engineers', 'Pre-fault sequence windows included for each event'],
      },
      category: {
        subcategory: 'Industrial Time-Series Anomaly Detection',
        useCases:    ['Predictive maintenance systems', 'Industrial IoT monitoring dashboards', 'Anomaly detection model benchmarking', 'Equipment failure signature analysis'],
      },
      duplicate: {
        similarityScore: 26,
        originality: 'Industrial sensor data with proprietary equipment profiles and manually verified fault labels not replicated in academic IoT benchmarks.',
        warning: 'Similar sensor datasets exist in academic IoT repositories. This dataset provides higher temporal resolution and engineer-verified labels.',
      },
    },
  },
]

// ── Supabase → DatasetDetail ────────────────────────────────────────────────

const VALID_CATEGORIES: Category[] = ['NLP', 'Computer Vision', 'Tabular', 'Audio', 'Multimodal']

function rowToDetail(row: DatasetRow): DatasetDetail {
  const vr = row.validation_report as {
    quality?:   { score?: number; issues?: string[]; strengths?: string[] }
    category?:  { subcategory?: string; useCases?: string[] }
    duplicate?: { similarityScore?: number; originality?: string; warning?: string }
  } | null

  const cat = VALID_CATEGORIES.includes(row.category as Category)
    ? (row.category as Category)
    : 'Tabular'

  return {
    id:          row.id,
    name:        row.name,
    category:    cat,
    score:       row.validation_score ?? 0,
    price:       row.price ?? '0',
    purchases:   0,
    contributor: row.contributor_address ?? 'Unknown',
    description: row.description ?? '',
    listedAt:    new Date(row.created_at).toLocaleDateString('en-US', {
                   month: 'short', day: 'numeric', year: 'numeric',
                 }),
    storageHash: row.storage_hash ?? '',
    reportHash:  row.report_hash ?? '',
    txHash:      row.tx_hash || undefined,
    onchainId:   row.onchain_id ?? undefined,
    isLive:      true,
    validation: {
      quality: {
        score:     vr?.quality?.score     ?? row.validation_score ?? 0,
        issues:    Array.isArray(vr?.quality?.issues)    ? vr!.quality!.issues!    : [],
        strengths: Array.isArray(vr?.quality?.strengths) ? vr!.quality!.strengths! : [],
      },
      category: {
        subcategory: vr?.category?.subcategory ?? '',
        useCases:    Array.isArray(vr?.category?.useCases) ? vr!.category!.useCases! : [],
      },
      duplicate: {
        similarityScore: vr?.duplicate?.similarityScore ?? 0,
        originality:     vr?.duplicate?.originality     ?? '',
        warning:         vr?.duplicate?.warning         ?? '',
      },
    },
  }
}

// ── Design tokens ──────────────────────────────────────────────────────────

const BADGE: Record<Category, string> = {
  'NLP':             'bg-[#EEF2FF] text-[#4338CA]',
  'Computer Vision': 'bg-[#F0FDF4] text-[#15803D]',
  'Tabular':         'bg-[#FFFBEB] text-[#B45309]',
  'Audio':           'bg-[#FAF5FF] text-[#7C3AED]',
  'Multimodal':      'bg-[#FFF1F2] text-[#BE185D]',
}

function scoreColor(s: number) {
  if (s >= 80) return '#16A34A'
  if (s >= 60) return '#D97706'
  return '#DC2626'
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const

// ── Page ───────────────────────────────────────────────────────────────────

export default function DatasetPage() {
  const params = useParams()
  const id     = Number(params.id)

  const [dataset, setDataset] = useState<DatasetDetail | null>(
    DATASETS.find((d) => d.id === id) ?? null,
  )
  const [loading,       setLoading]       = useState(true)
  // Mock datasets path
  const [purchaseDone,  setPurchaseDone]  = useState(false)
  // Live datasets path
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle')
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')

  // Wagmi hooks — called unconditionally
  const { address }            = useAccount()
  const config                 = useConfig()
  const { writeContractAsync } = useWriteContract()

  const isLive        = dataset?.isLive ?? false
  // Use the on-chain contract ID (captured during upload) — not the Supabase row ID
  const datasetIdBig  = BigInt(dataset?.onchainId ?? dataset?.id ?? 0)
  const userAddr      = address ?? ZERO_ADDR

  const { data: canAccess } = useReadContract({
    address:      CONTRACT_ADDRESS,
    abi:          CONTRACT_ABI,
    functionName: 'hasAccess',
    args:         [datasetIdBig, userAddr],
    query:        { enabled: isLive && !!address },
  })

  const hasFullAccess = purchaseState === 'done' || !!canAccess

  useEffect(() => {
    let cancelled = false
    supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (data && !error) setDataset(rowToDetail(data as DatasetRow))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handlePurchase() {
    if (!dataset) return

    // Mock path
    if (!dataset.isLive) {
      setPurchaseDone(true)
      return
    }

    setPurchaseState('wallet')
    try {
      const hash = await writeContractAsync({
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'purchaseDataset',
        args:         [datasetIdBig],
        value:        parseEther(dataset.price),
      })
      setPurchaseState('confirming')
      await waitForTransactionReceipt(config, { hash })
      setPurchaseState('done')
    } catch (err) {
      console.error('[Purchase] Failed:', err)
      setPurchaseState('error')
    }
  }

  async function handleDownload() {
    if (!dataset?.storageHash) return
    setDownloadState('downloading')
    try {
      const params = new URLSearchParams({ hash: dataset.storageHash, name: dataset.name })
      const res = await fetch(`/api/download?${params}`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = dataset.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloadState('done')
    } catch (err) {
      console.error('[Download] Failed:', err)
      setDownloadState('error')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading && !dataset) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3 text-[#9CA3AF]">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Loading dataset...</span>
        </div>
      </main>
    )
  }

  if (!dataset) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <p className="mb-4 text-lg font-semibold text-[#0A0A0A]">Dataset not found</p>
          <Link href="/marketplace" className="text-sm font-semibold text-[#4F46E5] hover:underline">
            ← Back to Marketplace
          </Link>
        </div>
      </main>
    )
  }

  const { validation: v } = dataset
  const color = scoreColor(dataset.score)

  // Derived purchase/download button states
  const showPurchased = dataset.isLive ? hasFullAccess : purchaseDone

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Back link ───────────────────────────────────────────── */}
        <Link
          href="/marketplace"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] transition-colors hover:text-[#4F46E5]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Marketplace
        </Link>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-10 rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[dataset.category]}`}>
              {dataset.category}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: color + '18', color }}
            >
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
              Score {dataset.score}
            </span>
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-[#0A0A0A]">
            {dataset.name}
          </h1>

          <div className="flex flex-wrap gap-6 text-xs text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Contributor</span>
              <span className="font-mono text-[#0A0A0A]">{dataset.contributor}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Listed</span>
              <span className="text-[#0A0A0A]">{dataset.listedAt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Purchases</span>
              <span className="text-[#0A0A0A]">{dataset.purchases}</span>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">

          {/* ── LEFT ──────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Description */}
            <Card title="About this Dataset">
              <p className="text-sm leading-7 text-[#374151]">{dataset.description}</p>
            </Card>

            {/* Validation Report */}
            <Card title="Validation Report">
              <div className="space-y-8">

                {/* Quality Analysis */}
                <div>
                  <SectionLabel>Quality Analysis</SectionLabel>
                  <div className="mb-5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#6B7280]">Quality Score</span>
                      <span className="text-xs font-bold" style={{ color: scoreColor(v.quality.score) }}>
                        {v.quality.score} / 100
                      </span>
                    </div>
                    <ScoreBar value={v.quality.score} color={scoreColor(v.quality.score)} />
                  </div>

                  {v.quality.issues.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Issues</p>
                      <ul className="space-y-1.5">
                        {v.quality.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center text-[9px] font-bold">!</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Strengths</p>
                    <ul className="space-y-1.5">
                      {v.quality.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-[#F3F4F6]" />

                {/* Category & Use Cases */}
                <div>
                  <SectionLabel>Category &amp; Use Cases</SectionLabel>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${BADGE[dataset.category]}`}>
                      {dataset.category}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#374151]">
                      {v.category.subcategory}
                    </span>
                  </div>
                  <p className="mb-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Recommended Use Cases</p>
                  <div className="flex flex-wrap gap-2">
                    {v.category.useCases.map((uc, i) => (
                      <span key={i} className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs font-medium text-[#6B7280]">
                        {uc}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#F3F4F6]" />

                {/* Originality */}
                <div>
                  <SectionLabel>Originality Check</SectionLabel>
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#6B7280]">Similarity to Known Datasets</span>
                      <span className={`text-xs font-bold ${v.duplicate.similarityScore <= 15 ? 'text-[#16A34A]' : v.duplicate.similarityScore <= 30 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                        {v.duplicate.similarityScore}%
                      </span>
                    </div>
                    <ScoreBar
                      value={v.duplicate.similarityScore}
                      color={v.duplicate.similarityScore <= 15 ? '#16A34A' : v.duplicate.similarityScore <= 30 ? '#D97706' : '#DC2626'}
                    />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-[#374151]">
                    {v.duplicate.originality}
                  </p>
                  {v.duplicate.warning && (
                    <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E] leading-relaxed">
                      <span className="font-semibold">⚠ Note: </span>{v.duplicate.warning}
                    </div>
                  )}
                </div>

              </div>
            </Card>

          </div>

          {/* ── RIGHT — Purchase card ──────────────────────────────── */}
          <div>
            <div className="sticky top-24 rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">

              {/* Price */}
              <div className="px-6 pt-6 pb-4">
                <p className="mb-1 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Access Price</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-[#0A0A0A]">{dataset.price}</span>
                  <span className="text-base font-bold text-[#9CA3AF]">OG</span>
                </div>
              </div>

              {/* ── CTAs ────────────────────────────────────────────── */}
              <div className="px-6 pb-5 space-y-2.5">

                {/* Purchase button */}
                {showPurchased ? (
                  <div className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#DCFCE7] text-sm font-semibold text-[#15803D]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Access Granted!
                  </div>
                ) : purchaseState === 'wallet' ? (
                  <button disabled className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#4F46E5]/60 text-sm font-semibold text-white">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Confirm in wallet...
                  </button>
                ) : purchaseState === 'confirming' ? (
                  <button disabled className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#4F46E5]/60 text-sm font-semibold text-white">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Waiting for confirmation...
                  </button>
                ) : purchaseState === 'error' ? (
                  <button
                    onClick={handlePurchase}
                    className="flex h-11 w-full items-center justify-center rounded-full bg-[#FEF2F2] text-sm font-semibold text-[#DC2626] transition-colors hover:bg-[#FEE2E2]"
                  >
                    Purchase Failed — Retry
                  </button>
                ) : (
                  <button
                    onClick={handlePurchase}
                    className="flex h-11 w-full items-center justify-center rounded-full bg-[#4F46E5] text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
                  >
                    Purchase Access · {dataset.price} OG
                  </button>
                )}

                {/* Download button */}
                {dataset.isLive ? (
                  hasFullAccess ? (
                    <button
                      onClick={handleDownload}
                      disabled={downloadState === 'downloading'}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#4F46E5] text-sm font-medium text-[#4F46E5] transition-colors hover:bg-[#EEF2FF] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadState === 'downloading' ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Downloading...
                        </>
                      ) : downloadState === 'done' ? (
                        'Downloaded ✓'
                      ) : downloadState === 'error' ? (
                        'Download Failed — Retry'
                      ) : (
                        'Download Dataset'
                      )}
                    </button>
                  ) : (
                    <div className="flex h-11 w-full items-center justify-center rounded-full border border-[#E5E5E5] text-sm font-medium text-[#9CA3AF]">
                      {!address ? 'Connect wallet to purchase' : 'Purchase required to download'}
                    </div>
                  )
                ) : (
                  // Mock dataset path
                  <button
                    className="flex h-11 w-full items-center justify-center rounded-full border border-[#E5E5E5] text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
                  >
                    {purchaseDone ? 'Download Dataset' : 'Already purchased? Download'}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[#F3F4F6]" />

              {/* On-chain proof */}
              <div className="bg-[#FAFAFA] px-6 py-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">
                  On-Chain Proof
                </p>

                <HashRow label="Storage Hash" value={dataset.storageHash} />
                <HashRow label="Report Hash"  value={dataset.reportHash} />
                {dataset.txHash && (
                  <HashRow label="Tx Hash" value={dataset.txHash} />
                )}

                <a
                  href={
                    dataset.txHash
                      ? `https://chainscan-newton.0g.ai/tx/${dataset.txHash}`
                      : `https://chainscan-newton.0g.ai/address/${CONTRACT_ADDRESS}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-[#4F46E5] transition-colors hover:text-[#4338CA]"
                >
                  View on 0G Explorer
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 7h10v10M7 17 17 7" />
                  </svg>
                </a>
              </div>

              {/* Divider */}
              <div className="border-t border-[#F3F4F6]" />

              {/* Stats */}
              <div className="grid grid-cols-2 divide-x divide-[#F3F4F6] px-0">
                <StatCell label="Total Purchases" value={dataset.purchases.toString()} />
                <StatCell label="Listed"          value={dataset.listedAt} />
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Reusable sub-components ────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
      <div className="border-b border-[#F3F4F6] px-6 py-4">
        <h2 className="text-sm font-bold text-[#0A0A0A]">{title}</h2>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#6B7280]">
      <span className="h-px flex-1 bg-[#F3F4F6]" />
      {children}
      <span className="h-px flex-1 bg-[#F3F4F6]" />
    </p>
  )
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  )
}

function HashRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const display = value.length > 18 ? value.slice(0, 10) + '…' + value.slice(-8) : value

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold text-[#9CA3AF]">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-[#6B7280]">{display}</span>
        <button
          onClick={copy}
          className={`flex h-6 items-center gap-1 rounded px-2 text-[10px] font-semibold transition-all ${
            copied
              ? 'bg-[#DCFCE7] text-[#15803D]'
              : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#EEF2FF] hover:text-[#4F46E5]'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4 text-center">
      <p className="text-base font-bold text-[#0A0A0A]">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-[#9CA3AF]">{label}</p>
    </div>
  )
}
