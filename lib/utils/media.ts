// ── Video duration check ──────────────────────────────────────────────────────

const MAX_VIDEO_DURATION_SECONDS = 120 // 2 minutes

/**
 * Best-effort check of a video file's duration using a temporary <video>
 * element. Returns a warning string if the video is too long, or null if the
 * duration is acceptable (or could not be determined).
 *
 * Must run in a browser context (uses DOM APIs).
 */
export function checkVideoDuration(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadedmetadata = () => {
      const duration = video.duration
      cleanup()
      if (!isFinite(duration)) {
        resolve(null) // can't determine — skip warning
        return
      }
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        const mins = Math.floor(duration / 60)
        const secs = Math.round(duration % 60)
        resolve(
          `Video is ${mins}m ${secs}s — consider keeping it under 2 minutes for best playback.`
        )
      } else {
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null) // non-fatal — just skip the warning
    }

    video.src = url
  })
}

// ── Video thumbnail capture ───────────────────────────────────────────────────

/**
 * Seeks to the first frame of a video and captures it as a JPEG blob using an
 * offscreen <canvas>. Returns null if capture fails for any reason.
 *
 * Must run in a browser context (uses DOM APIs).
 */
export function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadeddata = () => {
      video.currentTime = 0
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            cleanup()
            resolve(blob)
          },
          'image/jpeg',
          0.85
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    video.src = url
  })
}

// ── Format bytes ──────────────────────────────────────────────────────────────

/**
 * Converts a byte count to a human-readable string, e.g. "4.2 MB".
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
