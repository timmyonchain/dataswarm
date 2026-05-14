import { NextResponse } from 'next/server'
import { downloadFromZeroG } from '@/lib/0g/storage'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const hash = searchParams.get('hash')
  const name = searchParams.get('name') ?? 'dataset'

  if (!hash) {
    return NextResponse.json({ error: 'Missing hash parameter' }, { status: 400 })
  }

  try {
    const blob = await downloadFromZeroG(hash)
    const buffer = Buffer.from(await blob.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
        'Content-Length':      buffer.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('[API/download] Failed:', err)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
