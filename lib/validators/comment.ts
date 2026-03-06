import { z } from 'zod'

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(3, 'Comment must be at least 3 characters')
    .max(1000, 'Comment must be 1000 characters or fewer'),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
