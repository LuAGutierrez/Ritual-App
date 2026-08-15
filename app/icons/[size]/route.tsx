import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return [{ size: '192' }, { size: '512' }]
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const px = size === '512' ? 512 : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F0D0B',
        }}
      >
        <div
          style={{
            width: '42%',
            height: '42%',
            background: '#C9A97A',
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    ),
    { width: px, height: px }
  )
}
