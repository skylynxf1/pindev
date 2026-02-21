'use client'

import { useRef } from 'react'

export default function AboutPage() {
  const contactRef = useRef<HTMLDivElement>(null)

  function scrollToContact() {
    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Decorative floating icons ── */}
      <span
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 36,
          top: '22%',
          fontSize: '2rem',
          color: 'var(--border)',
          fontWeight: 700,
          fontFamily: 'monospace',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {'</>'}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 52,
          top: '42%',
          userSelect: 'none',
          pointerEvents: 'none',
          color: 'var(--border)',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'fixed',
          right: 40,
          top: '18%',
          userSelect: 'none',
          pointerEvents: 'none',
          color: 'var(--border)',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'fixed',
          right: 28,
          bottom: '28%',
          fontSize: '1.5rem',
          color: 'var(--border)',
          fontWeight: 700,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        ?
      </span>

      {/* ── Main content ── */}
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '80px 24px 120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Mission badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--menthe-light, #e6faf7)',
            border: '1px solid var(--menthe)',
            borderRadius: 9999,
            padding: '4px 14px',
            marginBottom: 28,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--menthe)', textTransform: 'uppercase' }}>
            Our Mission
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 6vw, 3.6rem)',
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.08,
            color: 'var(--text)',
            margin: '0 0 6px',
            letterSpacing: '-0.03em',
          }}
        >
          Build, vibe, and
        </h1>
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 6vw, 3.6rem)',
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.08,
            color: 'var(--menthe)',
            margin: '0 0 32px',
            letterSpacing: '-0.03em',
          }}
        >
          stay inspired.
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.7,
            textAlign: 'center',
            color: 'var(--muted)',
            maxWidth: 520,
            margin: '0 0 72px',
          }}
        >
          In the ever-evolving creator landscape, new tools and fresh ideas emerge every single day. pindev is your home to inspire others, get inspired by the best, discover your unique style, and never stop learning. :)
        </p>


        {/* Claim card */}
        <div
          style={{
            width: '100%',
            background: '#161b22',
            borderRadius: 20,
            padding: '52px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 80,
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
              fontWeight: 900,
              color: '#fff',
              textAlign: 'center',
              lineHeight: 1.2,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Want to claim a pin<br />pindev posted?
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#8b949e',
              textAlign: 'center',
              maxWidth: 380,
              lineHeight: 1.65,
              marginBottom: 32,
            }}
          >
            If we&apos;ve featured your work and you&apos;d like to link it to your profile or manage the pin yourself, we&apos;d love to help.
          </p>
          <button
            onClick={scrollToContact}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--menthe)',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              padding: '12px 28px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Contact Us
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* ── Contact / footer ── */}
        <div
          ref={contactRef}
          id="contact"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="pindev" style={{ height: 36, width: 36, borderRadius: 8, objectFit: 'cover' }} />
          </div>

          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Get in touch
          </p>

          <a
            href="mailto:pindev.app@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
              fontWeight: 900,
              color: 'var(--text)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--menthe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            pindev.app@gmail.com
          </a>

          <a
            href="https://paa.ge/pindev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 8,
              padding: '8px 18px',
              borderRadius: 9999,
              background: 'var(--menthe-light, #e6faf7)',
              border: '1.5px solid var(--menthe)',
              color: 'var(--menthe)',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--menthe)'
              ;(e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--menthe-light, #e6faf7)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--menthe)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            linktree
          </a>

        </div>
      </div>
    </div>
  )
}
