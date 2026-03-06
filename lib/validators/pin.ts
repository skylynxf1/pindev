import { z } from 'zod'

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as const

export const ALLOWED_THUMBNAIL_TYPES = ALLOWED_IMAGE_TYPES

export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number]

// ── URL helpers ─────────────────────────────────────────────────────────────

function socialUrlSchema(allowedHosts: string[], exampleMsg: string) {
  return z.preprocess(
    (v) => (v == null || v === '' ? null : String(v).trim()),
    z.string().nullable().refine(
      (v) => {
        if (v === null) return true
        try {
          const { protocol, hostname } = new URL(v)
          if (protocol !== 'https:' && protocol !== 'http:') return false
          return allowedHosts.some((h) => hostname === h || hostname === `www.${h}`)
        } catch {
          return false
        }
      },
      { message: exampleMsg }
    )
  )
}

export const linkedinUrlSchema = socialUrlSchema(
  ['linkedin.com'],
  'Must be a valid LinkedIn URL (e.g. https://linkedin.com/in/yourname)'
)
export const tiktokUrlSchema = socialUrlSchema(
  ['tiktok.com'],
  'Must be a valid TikTok URL (e.g. https://tiktok.com/@yourhandle)'
)
export const instagramUrlSchema = socialUrlSchema(
  ['instagram.com'],
  'Must be a valid Instagram URL (e.g. https://instagram.com/yourusername)'
)

const urlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .max(2048, 'URL is too long')
  .refine(
    (val) => val.startsWith('https://') || val.startsWith('http://'),
    'URL must start with http:// or https://'
  )

// ── Pin creation schema (used server-side from FormData fields) ──────────────

export const createPinSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or fewer'),

  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .default(''),

  live_url: urlSchema,

  repo_url: z
    .union([urlSchema, z.literal(''), z.null()])
    .optional()
    .transform((val) => (val === '' || val == null ? null : val)),

  tags: z
    .string()
    .trim()
    .max(200, 'Tags string is too long')
    .optional()
    .transform((val) => {
      if (!val) return []
      return val
        .split(',')
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
        .filter((t) => t.length > 0 && t.length <= 40)
        .slice(0, 10) // max 10 tags
    }),

  linkedin_url: linkedinUrlSchema,
  tiktok_url: tiktokUrlSchema,
  instagram_url: instagramUrlSchema,

  agreed_to_rules: z
    .string()
    .refine((val) => val === 'true', 'You must agree to the content rules'),
})

export type CreatePinInput = z.infer<typeof createPinSchema>

// ── File validation (client + server) ────────────────────────────────────────

export function validateMediaFile(file: File): string | null {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type as AllowedMediaType)) {
    return `File type "${file.type}" is not allowed. Use JPG, PNG, WebP, MP4, or WebM.`
  }
  const isVid = ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])
  const maxSize = isVid ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES
  if (file.size > maxSize) {
    const maxMB = maxSize / 1024 / 1024
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${maxMB} MB for ${isVid ? 'video' : 'image'} files.`
  }
  return null
}

export function validateThumbnailFile(file: File): string | null {
  if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type as (typeof ALLOWED_THUMBNAIL_TYPES)[number])) {
    return `Thumbnail must be a JPG, PNG, or WebP image.`
  }
  if (file.size > 5 * 1024 * 1024) {
    return `Thumbnail is too large. Maximum is 5 MB.`
  }
  return null
}

export function isVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType as (typeof ALLOWED_VIDEO_TYPES)[number])
}

export function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])
}