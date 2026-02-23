'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'pindev_intro_seen'

export default function LandingAnimation() {
  const [phase, setPhase] = useState<'fill' | 'text' | 'exit' | 'gone'>('fill')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(LS_KEY)) return
    sessionStorage.setItem(LS_KEY, '1')
    document.body.classList.add('intro-active')
    setMounted(true)

    const t1 = setTimeout(() => setPhase('text'), 600)
    const t2 = setTimeout(() => setPhase('exit'), 1700)
    const t3 = setTimeout(() => {
      document.body.classList.remove('intro-active')
      setPhase('gone')
    }, 2500)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      document.body.classList.remove('intro-active')
    }
  }, [])

  if (!mounted || phase === 'gone') return null

  return (
    <>
      <style>{`
        @keyframes la-rise {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        @keyframes la-type {
          from { width: 0; }
          to   { width: 6ch; }
        }

        @keyframes la-cursor-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }

        @keyframes la-tagline-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 0.75; transform: translateY(0); }
        }

        @keyframes la-squeeze-exit {
          0%   { transform: scaleY(1); opacity: 1; }
          55%  { transform: scaleY(0.03); opacity: 1; }
          80%  { transform: scaleY(0.03); opacity: 0; }
          100% { transform: scaleY(0.03); opacity: 0; }
        }

        .la-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #35C8B4;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .la-overlay.fill {
          animation: la-rise 0.8s cubic-bezier(.22,.6,.4,1) forwards;
        }

        .la-overlay.exit {
          animation: la-squeeze-exit 1.0s cubic-bezier(.4,0,.2,1) forwards;
        }

        .la-wordmark-wrap {
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }

        .la-wordmark {
          font-family: var(--font-sans);
          font-weight: 800;
          font-size: clamp(3.5rem, 10vw, 7rem);
          color: #fff;
          letter-spacing: -0.04em;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          width: 0;
          animation: la-type 0.5s steps(6, end) 0.05s forwards;
        }

        .la-cursor {
          display: inline-block;
          width: 4px;
          height: 0.82em;
          background: rgba(255,255,255,0.9);
          border-radius: 1px;
          flex-shrink: 0;
          animation: la-cursor-blink 0.45s step-end 0.05s 4;
        }

        .la-tagline {
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: clamp(0.875rem, 2.5vw, 1.25rem);
          color: #fff;
          letter-spacing: 0.05em;
          text-transform: lowercase;
          opacity: 0;
          margin-top: 0.75rem;
          animation: la-tagline-in 0.45s ease 0.35s forwards;
        }
      `}</style>

      <div className={`la-overlay ${phase === 'fill' ? 'fill' : phase === 'exit' ? 'exit' : ''}`}>
        {(phase === 'text' || phase === 'exit') && (
          <>
            <div className="la-wordmark-wrap">
              <div className="la-wordmark">pindev</div>
              <div className="la-cursor" aria-hidden="true" />
            </div>
            <div className="la-tagline">playground for creators</div>
          </>
        )}
      </div>
    </>
  )
}
