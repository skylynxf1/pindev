import { z } from 'zod'

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(60, 'Display name must be 60 characters or fewer')
    .optional()
    .default(''),

  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be 30 characters or fewer')
    .regex(
      /^[a-z0-9_]+$/,
      'Username may only contain lowercase letters, numbers, and underscores'
    ),

  bio: z
    .string()
    .trim()
    .max(300, 'Bio must be 300 characters or fewer')
    .optional()
    .default(''),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// Reserved slugs that must never be claimable as usernames
export const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'api', 'auth', 'callback',
  'create', 'explore', 'feed', 'help', 'home', 'login',
  'logout', 'me', 'pin', 'pindev', 'profile', 'search',
  'settings', 'signup', 'static', 'support', 'upload',
  'www', '_next', 'favicon',
])

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase())
}