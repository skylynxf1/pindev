/* Shared branded loading state for route transitions.
   Uses <img> instead of <Image> since this is a static asset in a loading fallback. */
export default function BrandedLoading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="PinDev"
        width={56}
        height={56}
        className="logo-pulse"
        style={{ borderRadius: 'var(--r-md)' }}
      />
      <div className="spinner" />
    </div>
  )
}
