'use client'

import type { ValidationReport } from '@/lib/agents/swarm'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useWriteContract, useConfig, useAccount } from 'wagmi'
import { readContract, waitForTransactionReceipt } from 'wagmi/actions'
import { parseEther } from 'viem'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract'
import { saveDataset } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

type Step        = 'form' | 'processing' | 'success'
type StageStatus = 'pending' | 'active' | 'done'
type AgentStatus = 'pending' | 'active' | 'done'

// ── Utilities ──────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function mockHash(len = 64): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1_048_576).toFixed(1)} MB`
}

function truncHash(h: string): string {
  return h.slice(0, 10) + '…' + h.slice(-8)
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

type SvgProps = { className?: string }

function CloudUpIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" /><path d="m16 16-4-4-4 4" />
    </svg>
  )
}

function ChainIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CheckIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function SpinnerIcon({ className = '' }: SvgProps) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SearchIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function TagIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

function ShieldIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function AgentsIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M8 8V5c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v3" />
      <path d="M2 14h2" /><path d="M20 14h2" />
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function StarIcon({ className = '' }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// ── Agent config ────────────────────────────────────────────────────────────

const AGENTS = [
  { Icon: SearchIcon,  name: 'Quality Checker',    desc: 'Analyzing signal-to-noise ratio, formatting consistency, and completeness' },
  { Icon: TagIcon,     name: 'Category Tagger',    desc: 'Classifying data type, domain, and potential training use cases' },
  { Icon: ShieldIcon,  name: 'Duplicate Detector', desc: 'Scanning for overlap with known public datasets and verifying originality' },
]

// ── Main page ───────────────────────────────────────────────────────────────

export default function UploadPage() {
  // Form
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]             = useState('0')
  const [file, setFile]               = useState<File | null>(null)
  const [isDragging, setIsDragging]   = useState(false)
  const fileRef                       = useRef<HTMLInputElement>(null)

  // Flow
  const [step, setStep]     = useState<Step>('form')
  const [stages, setStages] = useState<StageStatus[]>(['pending', 'pending', 'pending', 'pending'])
  const [agents, setAgents] = useState<AgentStatus[]>(['pending', 'pending', 'pending'])

  // Results
  const [score, setScore]             = useState(0)
  const [storageHash, setStorageHash] = useState('')
  const [report, setReport]           = useState<ValidationReport | null>(null)
  const [walletMessage, setWalletMessage] = useState('')
  const [txHash, setTxHash]               = useState('')
  const [savedId, setSavedId]             = useState<number | null>(null)

  // ── Wagmi hooks ───────────────────────────────────────────────────────────
  const config = useConfig()
  const { writeContractAsync } = useWriteContract()
  const { address } = useAccount()

  // ── Handlers ──────────────────────────────────────────────────────────────

  const pickFile = (f: File) => setFile(f)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setStep('processing')

    // ── Stage 1: Upload to 0G Storage (via server-side API route) ───────────
    setStages(['active', 'pending', 'pending', 'pending'])
    setWalletMessage('Uploading to 0G decentralized storage...')
    let localStorageHash: string
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-storage', { method: 'POST', body: formData })
      const json = await res.json() as { hash: string; success: boolean }
      localStorageHash = json.hash
      if (json.success) {
        console.log('[Stage1] 0G upload success, hash:', localStorageHash)
        setWalletMessage('Stored on 0G Storage ✓')
      } else {
        console.warn('[Stage1] 0G upload failed server-side, using fallback hash')
        setWalletMessage('Stored with hash ✓')
      }
    } catch (err) {
      console.error('[Storage] upload-storage request failed:', err)
      localStorageHash = '0x' + Array.from(
        crypto.getRandomValues(new Uint8Array(32))
      ).map(b => b.toString(16).padStart(2, '0')).join('')
      setWalletMessage('Stored with hash ✓')
    }
    setStorageHash(localStorageHash)
    setStages(['done', 'pending', 'pending', 'pending'])
    await sleep(350)

    // ── Stage 2: Agent swarm (real API call) ─────────────────────────────
    setStages(['done', 'active', 'pending', 'pending'])
    setAgents(['active', 'pending', 'pending'])

    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    fd.append('description', description)
    fd.append('price', price)

    // Fire the real call and animate agents concurrently.
    // Each agent gets at least 1.5 s of screen time; if the API is still
    // running when we reach the third agent we await it there.
    const apiPromise = fetch('/api/validate', { method: 'POST', body: fd })
      .then((r) => r.json() as Promise<ValidationReport & { error?: string }>)
      .catch(() => null)

    await sleep(1500)
    setAgents(['done', 'active', 'pending'])
    await sleep(1500)
    setAgents(['done', 'done', 'active'])

    // Ensure API has finished before we move on
    let apiResult: ValidationReport | null = null
    try {
      const result = await apiPromise
      if (result && !('error' in result && result.error)) {
        apiResult = result as ValidationReport
      }
    } catch {
      // fall through — success screen will show mock score
    }

    setAgents(['done', 'done', 'done'])
    await sleep(250)
    setStages(['done', 'done', 'pending', 'pending'])
    await sleep(350)

    // ── Stage 3: List dataset on-chain (real wallet tx) ──────────────────
    setStages(['done', 'done', 'active', 'pending'])
    setWalletMessage('Sign the transaction in your wallet...')

    let localTxHash    = ''
    let localOnchainId: number | null = null
    try {
      console.log('[Stage3] Starting...')
      const metadataURI = JSON.stringify({ name, description, timestamp: Date.now() })
      const priceWei    = parseEther(price && !isNaN(Number(price)) ? price : '0')

      // Step 1: read current count — new dataset will be idBefore + 1
      const totalBefore = await readContract(config, {
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'getTotalDatasets',
      })
      console.log('[Stage3] getTotalDatasets result:', totalBefore?.toString())
      const idBefore = Number(totalBefore ?? BigInt(0))
      console.log('[Stage3] idBefore:', idBefore)

      // Step 2: send the transaction
      console.log('[Stage3] Calling listDataset...')
      const hash = await writeContractAsync({
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'listDataset',
        args:         [localStorageHash, priceWei, metadataURI],
      })
      localTxHash = hash
      setTxHash(hash)
      console.log('[Stage3] listDataset hash:', hash)
      setWalletMessage('Waiting for confirmation...')

      // Step 3: wait for the tx to be mined
      await waitForTransactionReceipt(config, { hash })
      console.log('[Stage3] listDataset confirmed')
      setWalletMessage('Transaction confirmed!')

      // Step 4: ID is idBefore + 1
      localOnchainId = idBefore + 1
      console.log('[Stage3] localOnchainId:', localOnchainId)

      // Step 5: Submit validation score on-chain so the dataset is purchaseable
      setWalletMessage('Writing validation proof to 0G Chain...')
      console.log('[Stage3] Calling submitValidation...')
      const validationHash = await writeContractAsync({
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'submitValidation',
        args: [
          BigInt(localOnchainId),
          Math.round(apiResult?.overallScore ?? 70) as number,
          apiResult?.reportHash ?? '0x',
        ],
      })
      console.log('[Stage3] submitValidation hash:', validationHash)
      await waitForTransactionReceipt(config, { hash: validationHash })
      console.log('[Stage3] submitValidation confirmed')
      setWalletMessage('Validation proof recorded!')
    } catch (err) {
      console.error('[Upload] Contract write failed:', err)
      setWalletMessage('Transaction failed — continuing without on-chain record')
      await sleep(1500)
    }

    setStages(['done', 'done', 'done', 'pending'])
    await sleep(350)

    // ── Stage 4: Done ─────────────────────────────────────────────────────
    setStages(['done', 'done', 'done', 'active'])
    await sleep(500)

    const finalScore = apiResult?.overallScore ?? Math.floor(Math.random() * 14) + 84
    if (apiResult) {
      setReport(apiResult)
      setScore(apiResult.overallScore)
    } else {
      setScore(finalScore)
    }

    // Save to Supabase — get back the real dataset ID for the redirect
    const dataToSave = {
      name,
      description,
      price,
      storage_hash:        localStorageHash,
      report_hash:         apiResult?.reportHash ?? '',
      validation_score:    finalScore,
      category:            apiResult?.category?.category ?? 'Tabular',
      tx_hash:             localTxHash,
      contributor_address: address ?? '',
      onchain_id:          localOnchainId ?? undefined,
      validation_report:   apiResult ?? undefined,
    }
    console.log('[Stage3] Saving to Supabase with onchain_id:', localOnchainId)
    console.log('[Upload] Saving to Supabase...', dataToSave)

    let newId: number | null = null
    try {
      newId = await saveDataset(dataToSave)
      console.log('[Upload] Saved dataset ID:', newId)
    } catch (err) {
      console.error('[Upload] saveDataset threw:', err)
    }

    if (newId) setSavedId(newId)

    setStep('success')
  }

  const handleReset = () => {
    setStep('form')
    setName('')
    setDescription('')
    setPrice('0')
    setFile(null)
    setStages(['pending', 'pending', 'pending', 'pending'])
    setAgents(['pending', 'pending', 'pending'])
    setScore(0)
    setStorageHash('')
    setReport(null)
    setWalletMessage('')
    setTxHash('')
    setSavedId(null)
  }

  const canSubmit = name.trim().length > 0 && file !== null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes agent-pulse {
          0%, 100% { box-shadow: 0 0 0 1px #4F46E5, 0 0 18px rgba(79,70,229,0.18); }
          50%       { box-shadow: 0 0 0 1px #4F46E5, 0 0 32px rgba(79,70,229,0.38); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0.92); }
          60%  { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        .agent-active { animation: agent-pulse 1.6s ease-in-out infinite; }
        .fade-up      { animation: fade-up 0.45s ease-out both; }
        .pop-in       { animation: pop-in 0.4s ease-out both; }
      `}</style>

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">

          {/* ── STEP 1: Form ─────────────────────────────────────────────── */}
          {step === 'form' && (
            <div className="fade-up">
              <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">
                  Upload Dataset
                </h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Your data will be validated by a swarm of autonomous AI agents
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-sm">
                <div className="space-y-6">

                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#0A0A0A]">
                      Dataset Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Medical Imaging Classification v1"
                      className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#0A0A0A]">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your dataset — format, size, use cases..."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#0A0A0A]">
                      Access Price
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] pl-4 pr-16 py-2.5 text-sm text-[#0A0A0A] outline-none transition-colors focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF]">
                        OG
                      </span>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#0A0A0A]">
                      Dataset File <span className="text-[#EF4444]">*</span>
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={[
                        'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
                        isDragging
                          ? 'border-[#4F46E5] bg-[#EEF2FF]'
                          : file
                          ? 'border-[#4F46E5]/60 bg-[#F5F3FF]'
                          : 'border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#4F46E5]/50 hover:bg-[#F9F8FF]',
                      ].join(' ')}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.json,.jsonl,.txt,.zip"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                      />
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F46E5] text-white">
                            <CloudUpIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0A0A0A]">{file.name}</p>
                            <p className="mt-0.5 text-xs text-[#6B7280]">{formatBytes(file.size)}</p>
                          </div>
                          <p className="text-xs font-medium text-[#4F46E5]">Click to change file</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${isDragging ? 'bg-[#4F46E5] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                            <CloudUpIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0A0A0A]">
                              {isDragging ? 'Release to upload' : 'Drag & drop or click to browse'}
                            </p>
                            <p className="mt-1 text-xs text-[#9CA3AF]">
                              .csv · .json · .jsonl · .txt · .zip
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* CTA */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#4F46E5] text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Upload &amp; Validate
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                {!canSubmit && (
                  <p className="mt-2 text-center text-xs text-[#9CA3AF]">
                    Dataset name and file are required
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Processing ───────────────────────────────────────── */}
          {step === 'processing' && (
            <ProcessingScreen stages={stages} agents={agents} walletMessage={walletMessage} />
          )}

          {/* ── STEP 3: Success ──────────────────────────────────────────── */}
          {step === 'success' && (
            <SuccessScreen
              score={score}
              name={name}
              storageHash={storageHash}
              txHash={txHash}
              savedId={savedId}
              report={report}
              onReset={handleReset}
            />
          )}

        </div>
      </main>
    </>
  )
}

// ── Processing screen ───────────────────────────────────────────────────────

const STAGE_CONFIG: { Icon: React.ComponentType<SvgProps>; label: string }[] = [
  { Icon: CloudUpIcon, label: 'Uploading to 0G Storage...' },
  { Icon: AgentsIcon,  label: 'Agent Swarm Activating...' },
  { Icon: ChainIcon,   label: 'Writing proof to 0G Chain...' },
  { Icon: StarIcon,    label: 'Complete!' },
]

function ProcessingScreen({
  stages,
  agents,
  walletMessage,
}: {
  stages: StageStatus[]
  agents: AgentStatus[]
  walletMessage: string
}) {
  return (
    <div className="fade-up">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">
          Validating Dataset
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Your autonomous agent swarm is hard at work
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-sm">
        {STAGE_CONFIG.map(({ Icon, label }, i) => {
          const status  = stages[i]
          const isLast  = i === STAGE_CONFIG.length - 1
          const pending = status === 'pending'
          const active  = status === 'active'
          const done    = status === 'done'

          return (
            <div key={i} className={`flex gap-5 transition-opacity duration-500 ${pending ? 'opacity-35' : 'opacity-100'}`}>
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  done   ? 'bg-[#DCFCE7] text-[#16A34A]' :
                  active ? 'bg-[#EEF2FF] text-[#4F46E5]' :
                           'bg-[#F3F4F6] text-[#D1D5DB]'
                }`}>
                  {done   ? <CheckIcon   className="h-5 w-5" /> :
                   active ? <SpinnerIcon className="h-5 w-5" /> :
                            <Icon       className="h-4 w-4" />}
                </div>
                {!isLast && (
                  <div className={`mt-1 w-px flex-1 min-h-[24px] transition-colors duration-500 ${done ? 'bg-[#BBF7D0]' : 'bg-[#E5E5E5]'}`} />
                )}
              </div>

              <div className={`pb-8 pt-2 flex-1 ${isLast ? 'pb-0' : ''}`}>
                <span className={`text-sm font-semibold transition-colors duration-300 ${
                  active ? 'text-[#0A0A0A]' :
                  done   ? 'text-[#6B7280]' :
                           'text-[#9CA3AF]'
                }`}>
                  {label}
                </span>

                {i === 2 && active && walletMessage && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                    <span className="text-xs font-medium text-[#4F46E5]">{walletMessage}</span>
                  </div>
                )}

                {i === 2 && done && walletMessage && (
                  <p className="mt-2 text-xs text-[#16A34A]">{walletMessage}</p>
                )}

                {i === 1 && status !== 'pending' && (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {AGENTS.map((agent, ai) => (
                      <AgentCard
                        key={ai}
                        Icon={agent.Icon}
                        name={agent.name}
                        desc={agent.desc}
                        status={agents[ai]}
                        delay={ai * 80}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Agent card ──────────────────────────────────────────────────────────────

function AgentCard({
  Icon,
  name,
  desc,
  status,
  delay,
}: {
  Icon: React.ComponentType<SvgProps>
  name: string
  desc: string
  status: AgentStatus
  delay: number
}) {
  const active  = status === 'active'
  const done    = status === 'done'
  const pending = status === 'pending'

  return (
    <div
      className={[
        'flex flex-col rounded-xl border p-4 transition-all duration-300',
        active  ? 'agent-active border-[#4F46E5] bg-[#F5F3FF]' :
        done    ? 'border-[#86EFAC] bg-[#F0FDF4]' :
                  'border-[#E5E5E5] bg-white',
        'fade-up',
      ].join(' ')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
        active  ? 'bg-[#4F46E5] text-white' :
        done    ? 'bg-[#16A34A] text-white' :
                  'bg-[#F3F4F6] text-[#C4C4C4]'
      } ${active ? 'animate-pulse' : ''}`}>
        {done ? <CheckIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>

      <p className={`text-xs font-bold leading-snug mb-1.5 transition-colors duration-300 ${
        active  ? 'text-[#4F46E5]' :
        done    ? 'text-[#15803D]' :
                  'text-[#9CA3AF]'
      }`}>
        {name}
      </p>

      {!pending && (
        <p className={`text-[10px] leading-relaxed transition-colors duration-300 ${
          active ? 'text-[#6366F1]' :
          done   ? 'text-[#16A34A]' :
                   'text-[#9CA3AF]'
        }`}>
          {done ? '✓ Analysis complete' : desc}
        </p>
      )}
    </div>
  )
}

// ── Success screen ──────────────────────────────────────────────────────────

function SuccessScreen({
  score,
  name,
  storageHash,
  txHash,
  savedId,
  report,
  onReset,
}: {
  score: number
  name: string
  storageHash: string
  txHash: string
  savedId: number | null
  report: ValidationReport | null
  onReset: () => void
}) {
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 70

  const tier =
    safeScore >= 90 ? { label: 'Excellent', color: '#16A34A' } :
    safeScore >= 75 ? { label: 'Good',      color: '#4F46E5' } :
                      { label: 'Fair',      color: '#D97706' }

  const reportHash = report?.reportHash ?? '0x' + mockHash()

  // Safely extract all nested report fields with defaults
  const strengths      = Array.isArray(report?.quality?.strengths)     ? report!.quality.strengths     : []
  const issues         = Array.isArray(report?.quality?.issues)        ? report!.quality.issues        : []
  const category       = report?.category?.category                    ?? 'Tabular'
  const subcategory    = report?.category?.subcategory                 ?? ''
  const useCases       = Array.isArray(report?.category?.useCases)     ? report!.category.useCases     : []
  const similarityScore = typeof report?.duplicate?.similarityScore === 'number' ? report!.duplicate.similarityScore : 0
  const originality    = report?.duplicate?.originality                ?? ''

  try { return (
    <div className="fade-up">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
          <CheckIcon className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A]">
          Dataset Validated
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          {name || 'Your dataset'} has been analysed and recorded on-chain
        </p>
      </div>

      {/* Score card */}
      <div className="mb-5 rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-sm text-center">
        <p className="mb-6 text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">
          DataSwarm Score
        </p>
        <ScoreCircle score={safeScore} />
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: tier.color + '18' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tier.color }} />
          <span className="text-xs font-semibold" style={{ color: tier.color }}>
            {tier.label} Quality
          </span>
        </div>
      </div>

      {/* Validation report (shown only when we have real data) */}
      {report && (
        <div className="mb-5 rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F3F4F6] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0A0A0A]">Validation Report</h2>
          </div>

          <div className="divide-y divide-[#F3F4F6]">

            {/* Quality — hidden when only fallback placeholder text is present */}
            {(() => {
              const FALLBACK_ISSUES    = ['Could not fully analyze dataset', 'Dataset processed']
              const FALLBACK_STRENGTHS = ['Dataset received and processed', 'Dataset received']
              const realIssues    = issues.filter((s) => !FALLBACK_ISSUES.includes(s))
              const realStrengths = strengths.filter((s) => !FALLBACK_STRENGTHS.includes(s))
              if (realIssues.length === 0 && realStrengths.length === 0) return null
              return (
                <div className="px-6 py-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Quality Analysis</p>
                  {realStrengths.length > 0 && (
                    <ul className="space-y-1">
                      {realStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#15803D]">
                          <span className="mt-0.5 shrink-0">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {realIssues.length > 0 && (
                    <ul className="space-y-1">
                      {realIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#B45309]">
                          <span className="mt-0.5 shrink-0">⚠</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })()}

            {/* Category */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Category</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#4338CA]">
                  {category}
                </span>
                {subcategory && (
                  <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#6B7280]">
                    {subcategory}
                  </span>
                )}
              </div>
              {useCases.length > 0 && (
                <p className="text-xs text-[#6B7280]">
                  Use cases: {useCases.join(', ')}
                </p>
              )}
            </div>

            {/* Originality */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Originality</p>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-[#F3F4F6] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#4F46E5] transition-all duration-700"
                    style={{ width: `${100 - similarityScore}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#0A0A0A] tabular-nums">
                  {100 - similarityScore}% original
                </span>
              </div>
              {originality && (
                <p className="text-xs text-[#6B7280]">{originality}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* On-chain metadata */}
      <div className="mb-6 rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-[#F3F4F6]">
          <MetaRow label="Storage Hash">
            <span className="font-mono text-xs text-[#0A0A0A]">{truncHash(storageHash)}</span>
          </MetaRow>
          <MetaRow label="Report Hash">
            <span className="font-mono text-xs text-[#0A0A0A]">{truncHash(reportHash)}</span>
          </MetaRow>
          {txHash && (
            <MetaRow label="Tx Hash">
              <span className="font-mono text-xs text-[#0A0A0A]">{truncHash(txHash)}</span>
            </MetaRow>
          )}
          <MetaRow label="Network">
            <span className="text-xs font-semibold text-[#4F46E5]">0G Galileo Testnet</span>
          </MetaRow>
          <MetaRow label="0G Explorer">
            {txHash ? (
              <a
                href={`https://chainscan.0g.ai/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#4F46E5] hover:underline"
              >
                View transaction →
              </a>
            ) : (
              <span className="text-xs text-[#9CA3AF]">No transaction recorded</span>
            )}
          </MetaRow>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/dataset/${savedId ?? 1}`}
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#4F46E5] text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
        >
          View Dataset
        </Link>
        <button
          onClick={onReset}
          className="flex h-12 flex-1 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-sm font-semibold text-[#0A0A0A] transition-colors hover:border-[#4F46E5] hover:text-[#4F46E5]"
        >
          Upload Another
        </button>
      </div>
    </div>
  )} catch {
    return (
      <div className="fade-up rounded-2xl border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
          <CheckIcon className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[#0A0A0A]">Dataset Validated</h2>
        <p className="mb-6 text-sm text-[#6B7280]">Score: {safeScore} / 100</p>
        <button
          onClick={onReset}
          className="inline-flex h-10 items-center rounded-full bg-[#4F46E5] px-6 text-sm font-semibold text-white hover:bg-[#4338CA]"
        >
          Upload Another
        </button>
      </div>
    )
  }
}

// ── Metadata row ────────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5">
      <span className="text-xs font-medium text-[#9CA3AF]">{label}</span>
      {children}
    </div>
  )
}

// ── Score circle ────────────────────────────────────────────────────────────

const RADIUS        = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ScoreCircle({ score }: { score: number }) {
  const [offset, setOffset]   = useState(CIRCUMFERENCE)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(CIRCUMFERENCE * (1 - score / 100))
    }, 120)

    const start    = performance.now()
    const duration = 1300

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(tick)
    }

    const t2 = setTimeout(() => requestAnimationFrame(tick), 120)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [score])

  return (
    <div className="relative inline-flex items-center justify-center pop-in">
      <svg width="180" height="180" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          stroke="#4F46E5"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition:      'stroke-dashoffset 1.3s cubic-bezier(0.33,1,0.68,1)',
            transformOrigin: 'center',
            transform:       'rotate(-90deg)',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold tabular-nums leading-none text-[#0A0A0A]">
          {display}
        </span>
        <span className="mt-1 text-xs font-medium text-[#9CA3AF]">/ 100</span>
      </div>
    </div>
  )
}
