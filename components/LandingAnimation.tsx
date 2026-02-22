'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'pindev_intro_seen'

export default function LandingAnimation() {
  const [phase, setPhase] = useState<'fill' | 'text' | 'exit' | 'gone'>('fill')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(LS_KEY)) return
    sessionStorage.setItem(LS_KEY, '1')
    setMounted(true)

    const t1 = setTimeout(() => setPhase('text'), 800)
    const t2 = setTimeout(() => setPhase('exit'), 2000)
    const t3 = setTimeout(() => {
      // Stagger-animate pin item wrappers on reveal
      const items = document.querySelectorAll<HTMLElement>('[data-pin-item]')
      items.forEach((el, i) => {
        el.classList.add('pin-fall-in')
        el.style.animationDelay = `${i * 55}ms`
      })
      setPhase('gone')
    }, 3000)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  if (!mounted || phase === 'gone') return null

  return (
    <>
      <style>{`
        @keyframes la-water-rise {
          0%   { clip-path: polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%); }
          18%  { clip-path: polygon(0% 68%, 12% 64%, 25% 70%, 38% 63%, 50% 68%, 62% 63%, 75% 69%, 88% 64%, 100% 68%, 100% 100%, 0% 100%); }
          36%  { clip-path: polygon(0% 34%, 10% 30%, 22% 37%, 35% 29%, 50% 35%, 65% 29%, 78% 36%, 90% 30%, 100% 34%, 100% 100%, 0% 100%); }
          54%  { clip-path: polygon(0% 8%, 12% 5%, 25% 10%, 38% 4%, 52% 9%, 66% 4%, 78% 9%, 90% 5%, 100% 8%, 100% 100%, 0% 100%); }
          68%  { clip-path: polygon(0% 2%, 15% -1%, 30% 3%, 50% -2%, 70% 3%, 85% -1%, 100% 2%, 100% 100%, 0% 100%); }
          82%  { clip-path: polygon(0% 0.5%, 25% -0.5%, 50% 1%, 75% -0.5%, 100% 0.5%, 100% 100%, 0% 100%); }
          100% { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
        }

        @keyframes la-type {
          from { width: 0; }
          to   { width: 6.2ch; }
        }

        @keyframes la-cursor-blink {
          0%, 100% { border-color: rgba(255,255,255,0.9); }
          50%      { border-color: transparent; }
        }

        @keyframes la-tagline-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 0.75; transform: translateY(0); }
        }

        @keyframes la-squeeze-exit {
          0%   { clip-path: inset(0 0 0 0); opacity: 1; }
          55%  { clip-path: inset(48.5% 0 48.5% 0); opacity: 1; }
          80%  { clip-path: inset(48.5% 0 48.5% 0); opacity: 0; }
          100% { clip-path: inset(48.5% 0 48.5% 0); opacity: 0; }
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
        }

        .la-overlay.fill {
          animation: la-water-rise 0.85s cubic-bezier(.22,.6,.4,1) forwards;
        }

        .la-overlay.exit {
          animation: la-squeeze-exit 1.0s cubic-bezier(.4,0,.2,1) forwards;
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
          border-right: 4px solid rgba(255,255,255,0.9);
          animation:
            la-type 0.5s steps(6, end) 0.05s forwards,
            la-cursor-blink 0.45s step-end 0.05s 4;
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
            <div className="la-wordmark">pindev</div>
            <div className="la-tagline">playground for creators</div>
          </>
        )}
      </div>
    </>
  )
}
