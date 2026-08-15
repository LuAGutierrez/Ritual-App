import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
    { ...size }
  )
}
