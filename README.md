# DataSwarm

> **OpenSea for AI training data — where agent swarms validate every dataset on 0G.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-dataswarm.vercel.app-4F46E5?style=for-the-badge)](https://dataswarm.vercel.app)
[![Contract](https://img.shields.io/badge/Contract-0x4beD5...D2e9-0ea5e9?style=for-the-badge)](https://chainscan-galileo.0g.ai/address/0x4beD50c7AA534629331f7254171Feade83e4D2e9)
[![Track](https://img.shields.io/badge/Track%203-Agentic%20Economy-8b5cf6?style=for-the-badge)](#)

---

## The Problem

The AI training data market is worth **$2.5 billion** and growing — but it is fundamentally broken.

- **No provenance.** Anyone can sell a CSV scraped from Kaggle as "proprietary data."
- **No trust.** Buyers have no way to verify quality before paying. Sellers have no protection against disputes.
- **No permanence.** Data lives on centralized servers that can vanish overnight. Google Drive links rot.
- **No transparency.** Validation, if it exists at all, is a black box run by the marketplace itself.

The result: AI teams waste weeks evaluating garbage datasets, contributors get underpaid for genuine work, and the ecosystem moves slower than it should.

---

## The Solution

DataSwarm is a **trustless AI training data marketplace** built on the 0G blockchain. Every dataset is:

1. **Stored permanently** on 0G's decentralized storage layer — immutable, content-addressed, always available.
2. **Validated by an agent swarm** — three independent AI agents run in parallel, producing a cryptographic proof of quality.
3. **Listed on-chain** — the validation score, report hash, price, and contributor address are written to a smart contract on 0G Chain.
4. **Purchased trustlessly** — payment flows directly to the contributor's wallet. No intermediary. No escrow theater.

The agent swarm is the key insight: **validation is not a human judgment call — it is a deterministic, reproducible, on-chain fact.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTRIBUTOR FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐    ┌─────────────┐    ┌──────────────────────────┐
  │  Upload  │───▶│  0G Storage │───▶│    Agent Swarm (Groq)    │
  │  UI      │    │             │    │                          │
  └──────────┘    │  Stores raw │    │  ┌────────────────────┐  │
                  │  file bytes │    │  │ Agent 1: Quality   │  │
                  │             │    │  │ Checker            │  │
                  │  Returns    │    │  └────────────────────┘  │
                  │  content    │    │  ┌────────────────────┐  │
                  │  hash       │    │  │ Agent 2: Category  │  │
                  └──────┬──────┘    │  │ Tagger             │  │
                         │           │  └────────────────────┘  │
                         │           │  ┌────────────────────┐  │
                         │           │  │ Agent 3: Duplicate │  │
                         │           │  │ Detector           │  │
                         │           │  └────────────────────┘  │
                         │           │                          │
                         │           │  → SHA-256 report hash   │
                         │           └──────────────┬───────────┘
                         │                          │
                         ▼                          ▼
                  ┌─────────────────────────────────────┐
                  │           0G Chain (EVM)             │
                  │                                     │
                  │  listDataset(hash, price, meta)      │
                  │  submitValidation(id, score, proof)  │
                  │                                     │
                  │  Dataset ID minted on-chain          │
                  │  Validation proof anchored forever   │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │           Marketplace                │
                  │                                     │
                  │  Browse → purchaseDataset(id)        │
                  │  Payment → contributor wallet        │
                  │  hasAccess(id, buyer) gates download │
                  └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         BUYER FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

  Browse Marketplace ──▶ View dataset + on-chain validation score
         │
         ▼
  Connect wallet ──▶ purchaseDataset(id) [exact wei, payable tx]
         │
         ▼
  hasAccess(id, wallet) == true ──▶ Download via 0G Storage
```

---

## How 0G Powers DataSwarm

### 0G Storage — Permanent, Decentralized Dataset Hosting

Every uploaded file is pushed to 0G's distributed storage network via the `@0glabs/0g-ts-sdk`. The SDK returns a **content hash** — a deterministic fingerprint of the file bytes. This hash is the source of truth: the same file always produces the same hash, making data provenance mathematically verifiable.

On purchase, the download API fetches the file directly from 0G Storage by hash. The marketplace never touches the bytes — it only knows the hash.

### 0G Chain — On-Chain Registry and Payment Rail

All marketplace state lives in a Solidity contract deployed to the **0G Galileo Testnet** (chainId 16602):

- `listDataset` writes the storage hash, price (in wei), and metadata URI to chain — creating a permanent listing.
- `submitValidation` anchors the agent swarm's report hash and quality score on-chain, making the validation tamper-proof.
- `purchaseDataset` is payable and enforces `msg.value == ds.price` exactly — payment is atomic with access grant.
- `hasAccess` is the on-chain gate checked before any download is served.

The result: **the contract is the marketplace**. There is no admin. There is no database that can be taken down.

### 0G Compute — Agent Swarm Execution

The three validation agents are stateless functions powered by **Groq's LPU inference** (Llama-3.3-70B-Versatile). Each agent runs independently in parallel (`Promise.all`) against the first 2,000 characters of the dataset sample. The combined output is SHA-256 hashed into a `reportHash` that is written on-chain — tying the AI's judgment irrevocably to the blockchain record.

---

## The Agent Swarm

Three specialized agents run in parallel on every upload. Total latency: **~2–4 seconds**.

### Agent 1 — Quality Checker

Analyzes a dataset sample for structural integrity, completeness, and ML-readiness. Returns a `score` (0–100), a list of `issues` (e.g. "missing values in 30% of rows"), and `strengths` (e.g. "well-balanced class distribution"). Contributes **50%** of the overall score.

### Agent 2 — Category Tagger

Classifies the dataset into one of five canonical AI categories: `NLP`, `Computer Vision`, `Tabular`, `Audio`, or `Multimodal`. Also returns a subcategory and a list of suggested use cases. This metadata is stored in the listing and surfaced to buyers in the marketplace browse view.

### Agent 3 — Duplicate Detector

Assesses whether the sample resembles publicly known datasets. Returns a `similarityScore` (0 = fully original, 100 = exact copy), an `originality` description, and a `warning` flag if the data appears to be recycled. Contributes **30%** of the overall score via `(100 − similarityScore)`.

### Scoring Formula

```
overallScore = (qualityScore × 0.50)
             + ((100 − similarityScore) × 0.30)
             + (50 × 0.20)
```

The weighted score and SHA-256 report hash are both written to 0G Chain via `submitValidation`, creating an immutable, auditable record of every dataset's provenance.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.6 (App Router), React 19, Tailwind CSS v4 |
| Wallet | RainbowKit v2, wagmi v2, viem |
| Agent Swarm | Groq SDK, Llama-3.3-70B-Versatile, parallel `Promise.all` |
| Blockchain | 0G Galileo Testnet, Solidity ^0.8.20, Hardhat |
| Decentralized Storage | `@0glabs/0g-ts-sdk` v0.3.3 |
| Metadata Index | Supabase (Postgres + Row Level Security) |
| Deployment | Vercel (serverless functions handle agent API + download proxy) |

---

## Smart Contract

**Address:** `0x4beD50c7AA534629331f7254171Feade83e4D2e9`  
**Network:** 0G Galileo Testnet (chainId 16602)  
**Explorer:** [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai/address/0x4beD50c7AA534629331f7254171Feade83e4D2e9)

```solidity
// List a new dataset — returns the new dataset ID
function listDataset(
    string calldata storageHash,  // 0G Storage content hash
    uint256 price,                // price in wei
    string calldata metadataURI   // JSON: { name, description, timestamp }
) external returns (uint256 id);

// Anchor AI validation proof on-chain
function submitValidation(
    uint256 datasetId,
    uint8   score,               // 0–100 weighted agent swarm score
    string calldata reportHash   // SHA-256 of full validation report JSON
) external;

// Purchase access — requires exact payment
function purchaseDataset(uint256 datasetId) external payable;

// Access control gate — checked before every download
function hasAccess(uint256 datasetId, address user) external view returns (bool);

// Read a full dataset struct
function getDataset(uint256 datasetId) external view returns (Dataset memory);

// Total number of datasets listed
function getTotalDatasets() external view returns (uint256);
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- A wallet with 0G testnet tokens — [faucet.0g.ai](https://faucet.0g.ai)
- A [Groq API key](https://console.groq.com) (free tier is sufficient)
- A [Supabase](https://supabase.com) project

### 1. Clone and Install

```bash
git clone https://github.com/timmyonchain/dataswarm.git
cd dataswarm
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# 0G Chain
NEXT_PUBLIC_CONTRACT_ADDRESS=0x4beD50c7AA534629331f7254171Feade83e4D2e9

# 0G Storage
NEXT_PUBLIC_0G_STORAGE_RPC=https://evmrpc-testnet.0g.ai
NEXT_PUBLIC_0G_INDEXER_RPC=https://indexer-storage-testnet-standard.0g.ai

# WalletConnect (get one free at cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Groq — server-side only, never exposed to the browser
GROQ_API_KEY=gsk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Supabase Schema

Run this in the Supabase SQL editor:

```sql
CREATE TABLE datasets (
    id                  BIGSERIAL PRIMARY KEY,
    name                TEXT NOT NULL,
    description         TEXT,
    price               TEXT,
    storage_hash        TEXT,
    report_hash         TEXT,
    validation_score    INTEGER,
    category            TEXT,
    tx_hash             TEXT,
    contributor_address TEXT,
    validation_report   JSONB,
    onchain_id          INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read"   ON datasets FOR SELECT USING (true);
CREATE POLICY "public insert" ON datasets FOR INSERT WITH CHECK (true);
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Deploy Your Own Contract

```bash
npm run compile
npm run deploy:testnet
```

Update `NEXT_PUBLIC_CONTRACT_ADDRESS` with your new address.

---

## Project Structure

```
dataswarm/
├── app/
│   ├── page.tsx              # Homepage — live "recently validated" feed
│   ├── marketplace/          # Browse all datasets
│   ├── upload/               # 4-stage upload + validation UI
│   ├── dataset/[id]/         # Dataset detail, purchase, and download
│   ├── dashboard/            # Contributor earnings view
│   └── api/
│       ├── validate/         # POST — runs the 3-agent swarm
│       └── download/         # GET  — proxies 0G Storage download
├── lib/
│   ├── agents/
│   │   └── swarm.ts          # Three agents + parallel runner + scoring
│   ├── contract.ts           # ABI + contract address constant
│   └── supabase.ts           # DB client, types, save/fetch helpers
├── contracts/
│   └── DataSwarm.sol         # Solidity smart contract
└── public/
    └── favicon.svg           # DataSwarm logo
```

---

## Upload Flow — 4 Stages

```
Stage 1 — 0G Storage
  File bytes ──▶ 0G Storage SDK ──▶ content hash returned

Stage 2 — Agent Swarm Validation  (~2–4 s)
  File sample ──▶ POST /api/validate
    ├── Agent 1: Quality Checker   ──┐
    ├── Agent 2: Category Tagger   ──┼── Promise.all (parallel)
    └── Agent 3: Duplicate Detector ─┘
  Combined output ──▶ SHA-256 reportHash

Stage 3 — On-Chain Registration
  getTotalDatasets() ──▶ listDataset(hash, price, meta) ──▶ receipt
  newId = totalBefore + 1
  submitValidation(newId, score, reportHash) ──▶ receipt

Stage 4 — Metadata Index
  name, description, storage_hash, validation_report,
  onchain_id, tx_hash, contributor_address ──▶ Supabase
```

---

## Roadmap

| Milestone | Description |
|---|---|
| **Gated download delivery** | Decrypt and stream files only after on-chain `hasAccess` is confirmed for the buyer |
| **Agent expansion** | Add a Bias Auditor (demographic representation) and a License Checker (detect restricted or copyrighted content) |
| **Reputation system** | Aggregate contributor scores across all their datasets, stored on-chain |
| **0G Mainnet** | Migrate contract and storage to 0G mainnet at launch |
| **Dataset versioning** | Contributors can push updates while preserving all prior version hashes |
| **Bulk purchase API** | Let AI training pipelines purchase and stream datasets programmatically via API key |
| **Decentralized validation** | Replace the owner key on `submitValidation` with a multi-sig or on-chain validator set |

---

## Links

- **Live demo:** https://dataswarm.vercel.app
- **GitHub:** https://github.com/timmyonchain/dataswarm
- **Contract explorer:** https://chainscan-galileo.0g.ai/address/0x4beD50c7AA534629331f7254171Feade83e4D2e9
- **0G Testnet faucet:** https://faucet.0g.ai

---

*Built for the 0G Hackathon — Track 3: Agentic Economy*
