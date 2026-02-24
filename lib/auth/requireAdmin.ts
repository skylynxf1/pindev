import { createClient } from '@/lib/supabase/server'

/**
 * Verifies the request is from an admin via ONE of two paths:
 *
 *   1. PIN_AGENT_SECRET bearer token — for cron jobs / programmatic access.
 *      The secret lives only on the server; it is never sent to the browser.
 *
 *   2. Supabase session (cookie) — for the admin UI.
 *      The browser sends its session cookie automatically on same-origin requests.
 *      We verify the logged-in user's profile has username === 'pindev'.
 *
 * Returns true when the request is authorised, false otherwise.
 */
export async function requireAdmin(request: Request): Promise<boolean> {
  // ── Path 1: server-to-server bearer token ─────────────────────────────────
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const secret = process.env.PIN_AGENT_SECRET ?? ''

  if (secret && token === secret) return true

  // ── Path 2: browser session (Supabase cookie) ─────────────────────────────
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    return profile?.username === 'pindev'
  } catch {
    return false
  }
}
