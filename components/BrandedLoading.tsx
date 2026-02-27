/* Branded loading screen for route transitions.
   Logo is inlined as base64 (~500 bytes) so it renders instantly with
   zero network requests. No spinner, no text. */

// 80×80 PNG scaled up via CSS — keeps the bundle tiny while looking sharp
const LOGO_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAIVBMVEU1yLQBBQQzxLE30r0ol4gurZwbaV4SRD0KJyMignU85c6/TDhWAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAA+UlEQVR42u2VS3LEMAhExR98/wMH0FTKy2jGs0nxFpJg0dUgZK81DMMwDMMw/F8QHxYkuonLA+phvyIkYB8VW+WiQxB23bgEvHuww2O3lOXSCsU6pBylQ8fKdRvuvfibQRYJJhFh4RDCCAYn0RDmdFnLiRwxFOpgtTt7b1ELQFx62M8WVC0RAxdrzZaOSnr2lgkPBe26vAXLT7mSNululkmj85KZt0NtQZP2JqJYeaG3emj+ErTdw25CUObO9HbJYbHyblXybtOYcgRxbmtlfDo0Jbhnbk9dH+7xO4L7VbyeSZ/u8Tof7C9+Z575Es7PYBiGYRiGYXiAHwLBBUYz4FAkAAAAAElFTkSuQmCC'

export default function BrandedLoading() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      {/* Logo wrapper — positions the ring relative to the logo */}
      <div
        className="logo-pulse"
        style={{ position: 'relative', width: 160, height: 160 }}
      >
        {/* Animated tracing ring */}
        <div className="branded-loader-ring" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_DATA_URI}
          alt="PinDev"
          width={160}
          height={160}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: 'var(--r-xl)',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}
