import { NextResponse } from 'next/server'
import runSwarm from '@/lib/agents/swarm'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid file' }, { status: 400 })
    }

    const report = await runSwarm(file)
    return NextResponse.json(report)
  } catch (err) {
    console.error('[API /validate]', err)
    const message = err instanceof Error ? err.message : 'Validation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
