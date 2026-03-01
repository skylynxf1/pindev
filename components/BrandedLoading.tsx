export default function BrandedLoading() {
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
      <video
        src="/loading.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ width: 2000, height: 2000, objectFit: 'contain' }}
      />
    </div>
  )
}
