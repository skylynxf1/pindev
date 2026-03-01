'use client'

import { useState, useEffect } from 'react'

export default function BrandedLoading() {
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowVideo(true), 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        zIndex: 9999,
      }}
    >
      {showVideo ? (
        <video
          src="/loading.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ width: 2000, height: 2000, objectFit: 'contain' }}
        />
      ) : (
        <span
          style={{
            color: 'var(--menthe)',
            fontSize: '10.5rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
          }}
        >
          pindev
        </span>
      )}
    </div>
  )
}
