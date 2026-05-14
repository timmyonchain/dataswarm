import Groq from 'groq-sdk'

// Initialised once at module load; used only in server context (API routes / Server Actions).
// GROQ_API_KEY is a non-public env var — this module is never bundled for the browser.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODEL = 'llama-3.3-70b-versatile'

// ── Types ──────────────────────────────────────────────────────────────────

export interface QualityReport {
  score: number
  issues: string[]
  strengths: string[]
}

export interface CategoryReport {
  category: 'NLP' | 'Computer Vision' | 'Tabular' | 'Audio' | 'Multimodal'
  subcategory: string
  useCases: string[]
}

export interface DuplicateReport {
  isDuplicate: boolean
  similarityScore: number
  originality: string
  warning: string
}

export interface ValidationReport {
  quality: QualityReport
  category: CategoryReport
  duplicate: DuplicateReport
  overallScore: number
  reportHash: string
  timestamp: number
}

// ── Fallbacks (returned when the model response cannot be parsed) ──────────

const QUALITY_FALLBACK: QualityReport = {
  score: 70,
  issues: ['Could not fully analyze dataset'],
  strengths: ['Dataset received and processed'],
}

const CATEGORY_FALLBACK: CategoryReport = {
  category: 'Tabular',
  subcategory: 'General',
  useCases: ['Machine learning training', 'Data analysis'],
}

const DUPLICATE_FALLBACK: DuplicateReport = {
  isDuplicate: false,
  similarityScore: 10,
  originality: 'Dataset appears to be original',
  warning: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parses a JSON string into T. If the top-level parse fails, tries to extract
 * the first {...} block (guards against accidental markdown leaking through).
 */
function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch {
        /* fall through */
      }
    }
    console.warn('[Swarm] JSON parse failed, using fallback. Raw response:', text.slice(0, 200))
    return fallback
  }
}

/** Returns a lowercase hex SHA-256 of the input string. */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Agent 1: Quality Checker ───────────────────────────────────────────────

export async function qualityChecker(sample: string): Promise<QualityReport> {
  try {
    console.log('[Swarm] qualityChecker running...')

    const response = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. You only respond with valid JSON objects, never text or markdown.',
        },
        {
          role: 'user',
          content:
            'Analyze this dataset sample and return JSON with keys: ' +
            'score (0-100 integer), issues (array of strings), strengths (array of strings). ' +
            'Sample: ' + sample.slice(0, 500),
        },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    console.log('[Swarm] qualityChecker raw response:', text)

    let parsed: QualityReport
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      try {
        parsed = match ? JSON.parse(match[0]) : QUALITY_FALLBACK
      } catch {
        console.warn('[Swarm] qualityChecker parse failed, using fallback')
        return QUALITY_FALLBACK
      }
    }

    const report: QualityReport = {
      score:     typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 75,
      issues:    Array.isArray(parsed.issues)    ? parsed.issues    : ['Dataset processed'],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Dataset received'],
    }
    console.log('[Swarm] qualityChecker score:', report.score)
    return report
  } catch (err) {
    console.error('[Swarm] qualityChecker error:', err)
    return QUALITY_FALLBACK
  }
}

// ── Agent 2: Category Tagger ───────────────────────────────────────────────

export async function categoryTagger(sample: string): Promise<CategoryReport> {
  try {
    console.log('[Swarm] categoryTagger running...')

    const response = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. You only respond with valid JSON objects, never text or markdown.',
        },
        {
          role: 'user',
          content:
            'Analyze this dataset sample and return JSON with keys: ' +
            'category (one of: "NLP", "Computer Vision", "Tabular", "Audio", "Multimodal"), ' +
            'subcategory (string), useCases (array of strings). ' +
            'Sample: ' + sample.slice(0, 500),
        },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    console.log('[Swarm] categoryTagger raw response:', text)

    let parsed: CategoryReport
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      try {
        parsed = match ? JSON.parse(match[0]) : CATEGORY_FALLBACK
      } catch {
        console.warn('[Swarm] categoryTagger parse failed, using fallback')
        return CATEGORY_FALLBACK
      }
    }

    const VALID_CATEGORIES = ['NLP', 'Computer Vision', 'Tabular', 'Audio', 'Multimodal'] as const
    const report: CategoryReport = {
      category:    VALID_CATEGORIES.includes(parsed.category as typeof VALID_CATEGORIES[number]) ? parsed.category : 'Tabular',
      subcategory: typeof parsed.subcategory === 'string' ? parsed.subcategory : 'General',
      useCases:    Array.isArray(parsed.useCases) ? parsed.useCases : ['Machine learning training'],
    }
    console.log('[Swarm] categoryTagger category:', report.category)
    return report
  } catch (err) {
    console.error('[Swarm] categoryTagger error:', err)
    return CATEGORY_FALLBACK
  }
}

// ── Agent 3: Duplicate Detector ────────────────────────────────────────────

export async function duplicateDetector(sample: string): Promise<DuplicateReport> {
  try {
    console.log('[Swarm] duplicateDetector running...')

    const response = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. You only respond with valid JSON objects, never text or markdown.',
        },
        {
          role: 'user',
          content:
            'Analyze this dataset sample and return JSON with keys: ' +
            'isDuplicate (boolean), similarityScore (0-100 integer, lower means more original), ' +
            'originality (string description), warning (string, empty if no issues). ' +
            'Sample: ' + sample.slice(0, 500),
        },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    console.log('[Swarm] duplicateDetector raw response:', text)

    let parsed: DuplicateReport
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      try {
        parsed = match ? JSON.parse(match[0]) : DUPLICATE_FALLBACK
      } catch {
        console.warn('[Swarm] duplicateDetector parse failed, using fallback')
        return DUPLICATE_FALLBACK
      }
    }

    const report: DuplicateReport = {
      isDuplicate:     typeof parsed.isDuplicate === 'boolean' ? parsed.isDuplicate : false,
      similarityScore: typeof parsed.similarityScore === 'number' ? Math.max(0, Math.min(100, parsed.similarityScore)) : 10,
      originality:     typeof parsed.originality === 'string' ? parsed.originality : 'Dataset appears to be original',
      warning:         typeof parsed.warning === 'string'     ? parsed.warning     : '',
    }
    console.log('[Swarm] duplicateDetector similarityScore:', report.similarityScore)
    return report
  } catch (err) {
    console.error('[Swarm] duplicateDetector error:', err)
    return DUPLICATE_FALLBACK
  }
}

// ── Main Swarm Runner ──────────────────────────────────────────────────────

/**
 * Runs all three validation agents in parallel against the first 2000 chars
 * of the file, then computes a weighted overall score and a SHA-256 report hash.
 */
export default async function runSwarm(file: File): Promise<ValidationReport> {
  console.log('[Swarm] Starting validation swarm for:', file.name)

  const sample = (await file.text()).slice(0, 2000)

  console.log('[Swarm] Running 3 agents in parallel...')
  const [quality, category, duplicate] = await Promise.all([
    qualityChecker(sample),
    categoryTagger(sample),
    duplicateDetector(sample),
  ])

  // Weighted score: 50 % quality · 30 % originality · 20 % base
  const overallScore = Math.round(
    quality.score * 0.5 +
    (100 - duplicate.similarityScore) * 0.3 +
    50 * 0.2,
  )

  const timestamp = Date.now()

  const reportHash = await sha256(
    JSON.stringify({ quality, category, duplicate, overallScore, timestamp }),
  )

  console.log(
    `[Swarm] Complete — score: ${overallScore} | hash: ${reportHash.slice(0, 16)}...`,
  )

  return { quality, category, duplicate, overallScore, reportHash, timestamp }
}

