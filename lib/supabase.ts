/*
  Run this SQL in the Supabase SQL editor to create the datasets table:

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
    created_at          TIMESTAMPTZ DEFAULT NOW()
  );

  -- Allow anonymous reads (marketplace / dataset pages)
  ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public read" ON datasets FOR SELECT USING (true);
  CREATE POLICY "public insert" ON datasets FOR INSERT WITH CHECK (true);
*/

import { createClient } from '@supabase/supabase-js'
import type { ValidationReport } from '@/lib/agents/swarm'

console.log('[Supabase] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface DatasetInsert {
  name:                string
  description:         string
  price:               string
  storage_hash:        string
  report_hash:         string
  validation_score:    number
  category:            string
  tx_hash:             string
  contributor_address: string
  validation_report?:  ValidationReport
}

export interface DatasetRow extends DatasetInsert {
  id:         number
  created_at: string
}

// ── Save ───────────────────────────────────────────────────────────────────

export async function saveDataset(data: DatasetInsert): Promise<number | null> {
  // Ensure name is never empty — it's NOT NULL in the table
  const payload: DatasetInsert = {
    ...data,
    name: data.name?.trim() || 'Untitled Dataset',
  }

  console.log('[Supabase] saveDataset payload:', JSON.stringify(payload, null, 2))

  try {
    const { data: testData, error: testError } = await supabase
      .from('datasets')
      .select('count')
    console.log('[Supabase] Connection test:', testData, testError)

    const { data: row, error } = await supabase
      .from('datasets')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('[Supabase] Full error:', JSON.stringify(error))
      return null
    }

    const id = (row as { id: number }).id
    console.log('[Supabase] Saved dataset ID:', id)
    return id
  } catch (err) {
    console.error('[Supabase] saveDataset exception:', err)
    return null
  }
}

// ── Fetch ──────────────────────────────────────────────────────────────────

export async function fetchDataset(id: number): Promise<DatasetRow | null> {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data as DatasetRow
  } catch {
    return null
  }
}
