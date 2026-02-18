/**
 * URL utilities — safe for both server and client.
 */

/**
 * Ensures a URL string is safe to redirect or link to.
 * Rejects javascript:, data:, and other non-http(s) schemes.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Returns href only if it is a safe absolute URL, otherwise returns '#'.
 * Use wherever you render user-supplied URLs in <a href>.
 */
export function safeLinkHref(url: string | null | undefined): string {
  if (!url) return '#'
  return isSafeUrl(url) ? url : '#'
}

/**
 * Strips trailing slashes and normalises protocol to lowercase.
 * Useful for display (not for navigation).
 */
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    return host + (parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : '')
  } catch {
    return url
  }
}

/**
 * Returns only the relative path portion of a Supabase Storage public URL.
 * Useful for building signed URLs or constructing paths for deletion.
 */
export function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const parsed = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = parsed.pathname.indexOf(marker)
    if (idx === -1) return null
    return parsed.pathname.slice(idx + marker.length)
  } catch {
    return null
  }
}