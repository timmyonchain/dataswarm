import { NextResponse } from 'next/server'
import { uploadToZeroG } from '@/lib/0g/storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid file' }, { status: 400 })
    }

    const hash = await uploadToZeroG(file)
    return NextResponse.json({ hash, success: true })
  } catch (err) {
    console.error('[API /upload-storage]', err)
    const fallbackHash = '0x' + Array.from(
      crypto.getRandomValues(new Uint8Array(32))
    ).map(b => b.toString(16).padStart(2, '0')).join('')
    return NextResponse.json({ hash: fallbackHash, success: false })
  }
}
